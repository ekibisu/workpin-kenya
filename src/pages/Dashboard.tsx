import { useEffect, useState } from "react";
import Image from "@/components/ui/Image";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, MessageCircle, Settings, Plus,
  TrendingUp, Clock, CheckCircle, DollarSign, MapPin, Loader2, User, Star, Pencil, Trash2,
} from "lucide-react";
import QuotesPanel from "@/components/dashboard/QuotesPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import MessageDrawer from "@/components/messaging/MessageDrawer";
import ConversationList from "@/components/messaging/ConversationList";
import { Badge } from "@/components/ui/badge";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { uploadMediaFile } from "@/hooks/useMediaUpload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import UnifiedSettings from "@/components/dashboard/UnifiedSettings";
import BusinessesPanel from "@/components/dashboard/BusinessesPanel";
import questionsData from "@/data/questions.json";

// Normalize image_urls: filter nulls, empty strings, and obviously broken URLs
function normalizeImageUrls(urls: string[] | null | undefined): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.filter(
    (u) => typeof u === 'string' && u.trim() !== '' && !u.includes('deleted-bucket') && !u.startsWith('blob:')
  );
}

interface JobRequest {
  id: string;
  description: string;
  location_name: string | null;
  status: string;
  created_at: string;
  services: { name: string; archetype: string | null } | null;
  image_urls: string[] | null;
}

const VALID_ARCHETYPES = new Set([
  'home_maintenance', 'lifestyle_wellness', 'events_celebrations',
  'professional_business', 'outdoor_heavy_duty',
]);

function deriveArchetype(archetype: string | null | undefined): string {
  if (archetype && VALID_ARCHETYPES.has(archetype)) return archetype;
  return 'home_maintenance';
}

// Parse stored JSON description; returns the task_description string for display
function parseDescriptionSummary(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return parsed.task_description || raw;
  } catch {
    return raw;
  }
}

interface Quote {
  id: string;
  price_kes: number;
  message: string | null;
  status: string;
  created_at: string;
  request_id: string;
  provider_id: string;
  work_thread_id: string | null;
  profiles: { full_name: string | null } | null;
  provider_profiles?: { avg_rating: number | null; total_reviews: number | null } | null;
  job_requests: { description: string; services: { name: string } | null } | null;
}

const sideLinks = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "My Requests", icon: FileText, href: "/dashboard/requests" },
  { label: "Messages", icon: MessageCircle, href: "/dashboard/messages" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const isMessagesTab = location.pathname.includes("/dashboard/messages");
  const isSettingsTab = location.pathname.includes("/dashboard/settings");
  const { unreadCount, resetCount } = useUnreadMessageCount();
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingJobId, setStartingJobId] = useState<string | null>(null);
  const [decliningQuoteId, setDecliningQuoteId] = useState<string | null>(null);
  const [confirmingJobId, setConfirmingJobId] = useState<string | null>(null);
  const [feedbackRequestId, setFeedbackRequestId] = useState<string | null>(null);
  const [feedbackProviderId, setFeedbackProviderId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [chatWorkThreadId, setChatWorkThreadId] = useState<string | null>(null);
  const [chatRecipientName, setChatRecipientName] = useState("");
  const [editingRequest, setEditingRequest] = useState<JobRequest | null>(null);
  const [editAnswers, setEditAnswers] = useState<Record<string, string>>({});
  const [editLocation, setEditLocation] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editUploading, setEditUploading] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);

  // Map job_request_id → work_thread_id for messaging & reviews
  const [workThreadMap, setWorkThreadMap] = useState<Record<string, string>>({});

  const handleStartJob = async (jobRequestId: string, selectedQuoteId: string) => {
    setStartingJobId(jobRequestId);
    // Accept selected quote
    const acceptedQuote = quotes.find(q => q.id === selectedQuoteId);
    const { error: acceptErr } = await supabase
      .from("quotes")
      .update({ status: "accepted" })
      .eq("id", selectedQuoteId);
    if (acceptErr) {
      setStartingJobId(null);
      toast({ title: "Error", description: "Could not accept quote.", variant: "destructive" });
      return;
    }
    // Decline all other quotes for this job request
    const otherQuoteIds = quotes
      .filter(q => q.request_id === jobRequestId && q.id !== selectedQuoteId && q.status === "pending")
      .map(q => q.id);
    if (otherQuoteIds.length > 0) {
      await supabase.from("quotes").update({ status: "declined" }).in("id", otherQuoteIds);
    }

    // Reuse existing inquiry thread or create a new one
    let threadId = acceptedQuote?.work_thread_id;
    if (threadId) {
      // Upgrade inquiry thread to active
      await supabase
        .from("work_threads")
        .update({ status: "active" })
        .eq("id", threadId);
    } else {
      // Fallback: create work_thread linking client, provider, and job request
      const { data: threadData, error: threadErr } = await supabase
        .from("work_threads")
        .insert({
          client_id: user!.id,
          provider_id: acceptedQuote!.provider_id,
          job_request_id: jobRequestId,
          status: "active",
        })
        .select("id")
        .single();
      if (threadErr) {
        console.error("Failed to create work thread:", threadErr);
      }
      threadId = threadData?.id ?? null;
    }

    // Update accepted quote with work_thread_id if needed
    if (threadId) {
      if (!acceptedQuote?.work_thread_id) {
        await supabase.from("quotes").update({ work_thread_id: threadId }).eq("id", selectedQuoteId);
      }
      setWorkThreadMap(prev => ({ ...prev, [jobRequestId]: threadId! }));
    }
    // Update job request status
    const { error } = await supabase
      .from("job_requests")
      .update({ status: "pending" })
      .eq("id", jobRequestId);
    setStartingJobId(null);
    if (error) {
      toast({ title: "Error", description: "Could not start job.", variant: "destructive" });
      return;
    }
    // Update local state
    setRequests(prev => prev.map(r => r.id === jobRequestId ? { ...r, status: "pending" } : r));
    setQuotes(prev => prev.map(q => {
      if (q.request_id !== jobRequestId) return q;
      if (q.id === selectedQuoteId) return { ...q, status: "accepted", work_thread_id: threadId };
      return { ...q, status: "declined" };
    }));
    toast({ title: "Job started!", description: "The provider has been hired." });
  };

  const handleDeclineQuote = async (quoteId: string) => {
    setDecliningQuoteId(quoteId);
    const { error } = await supabase
      .from("quotes")
      .update({ status: "declined" })
      .eq("id", quoteId);
    setDecliningQuoteId(null);
    if (error) {
      toast({ title: "Error", description: "Could not decline quote.", variant: "destructive" });
      return;
    }
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: "declined" } : q));
    toast({ title: "Quote declined", description: "The provider has been notified." });
  };

  const handleConfirmCompletion = async (jobRequestId: string, providerId: string) => {
    setConfirmingJobId(jobRequestId);
    const { error } = await supabase
      .from("job_requests")
      .update({ status: "completed" })
      .eq("id", jobRequestId);
    setConfirmingJobId(null);
    if (error) {
      toast({ title: "Error", description: "Could not confirm completion.", variant: "destructive" });
      return;
    }
    setRequests(prev => prev.map(r => r.id === jobRequestId ? { ...r, status: "completed" } : r));
    toast({ title: "Job confirmed!", description: "The job has been marked as completed." });
    // Open feedback dialog
    setFeedbackRequestId(jobRequestId);
    setFeedbackProviderId(providerId);
    setFeedbackRating(5);
    setFeedbackComment("");
  };

  const openEditDialog = (req: JobRequest) => {
    setEditingRequest(req);
    try {
      setEditAnswers(JSON.parse(req.description));
    } catch {
      setEditAnswers({ task_description: req.description });
    }
    setEditLocation(req.location_name ?? "");
    setEditImages(Array.isArray(req.image_urls) ? req.image_urls : []);
  };

  const handleSaveEdit = async () => {
    if (!editingRequest) return;
    setSavingEdit(true);
    const updatedDescription = JSON.stringify(editAnswers);
    const { error } = await supabase
      .from("job_requests")
      .update({
        description: updatedDescription,
        location_name: editLocation.trim() || null,
        image_urls: editImages,
      })
      .eq("id", editingRequest.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "Error", description: "Could not save changes.", variant: "destructive" });
      return;
    }
    setRequests((prev) =>
      prev.map((r) =>
        r.id === editingRequest.id
          ? {
              ...r,
              description: updatedDescription,
              location_name: editLocation.trim() || null,
              image_urls: editImages,
            }
          : r
      )
    );
    setEditingRequest(null);
    toast({ title: "Request updated" });
  };
  // Image management for edit dialog
  const handleRemoveEditImage = (idx: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddEditImages = async (files: FileList | null) => {
    if (!files) return;
    setEditUploading(true);
    const uploaded: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await uploadMediaFile({ file: files[i], context: 'request-image' });
        uploaded.push(result.public_url);
      } catch {}
    }
    setEditImages((prev) => [...prev, ...uploaded]);
    setEditUploading(false);
  };

  const handleDeclineCompletion = async (jobRequestId: string) => {
    setConfirmingJobId(jobRequestId);
    const { error } = await supabase
      .from("job_requests")
      .update({ status: "pending" })
      .eq("id", jobRequestId);
    setConfirmingJobId(null);
    if (error) {
      toast({ title: "Error", description: "Could not decline.", variant: "destructive" });
      return;
    }
    setRequests(prev => prev.map(r => r.id === jobRequestId ? { ...r, status: "pending" } : r));
    toast({ title: "Completion declined", description: "The provider has been notified." });
  };

  const handleSubmitFeedback = async () => {
    if (!user || !feedbackRequestId || !feedbackProviderId) return;
    // Look up the work_thread_id for this job request
    let threadId = workThreadMap[feedbackRequestId];
    if (!threadId) {
      // Fetch from DB as fallback
      const { data: wt } = await supabase
        .from("work_threads")
        .select("id")
        .eq("job_request_id", feedbackRequestId)
        .eq("client_id", user.id)
        .maybeSingle();
      threadId = wt?.id;
    }
    if (!threadId) {
      toast({ title: "Error", description: "Could not find work thread for this job.", variant: "destructive" });
      return;
    }
    setSubmittingFeedback(true);
    const { error } = await supabase.from("reviews").insert({
      work_thread_id: threadId,
      client_id: user.id,
      provider_id: feedbackProviderId,
      rating: feedbackRating,
      body: feedbackComment || null,
    });
    setSubmittingFeedback(false);
    if (error) {
      toast({ title: "Error", description: "Could not submit feedback.", variant: "destructive" });
      return;
    }
    setFeedbackRequestId(null);
    toast({ title: "Thank you!", description: "Your feedback has been submitted." });
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("job_requests")
      .select("id, description, location_name, status, created_at, image_urls, services(name, archetype)")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const reqs = (data as unknown as JobRequest[]) || [];
        setRequests(reqs);
        const ids = reqs.map((r) => r.id);
        if (ids.length > 0) {
          supabase
            .from("quotes")
            .select("id, price_kes, message, status, created_at, request_id, provider_id, work_thread_id, profiles!quotes_provider_id_fkey(full_name), job_requests!quotes_request_id_fkey(description, services(name))")
            .in("request_id", ids)
            .order("created_at", { ascending: false })
            .then(async ({ data: qData }) => {
              const quotesData = (qData as unknown as Quote[]) || [];
              if (quotesData.length > 0) {
                const providerIds = [...new Set(quotesData.map(q => q.provider_id))];
                const { data: providerRatings } = await supabase
                  .from("businesses")
                  .select("id, avg_rating, total_reviews")
                  .in("id", providerIds);
                const enriched = quotesData.map(q => ({
                  ...q,
                  provider_profiles: providerRatings?.find(p => p.id === q.provider_id) ?? null,
                }));
                setQuotes(enriched);
              } else {
                setQuotes([]);
              }
              setLoading(false);
            });
        } else {
          setQuotes([]);
          setLoading(false);
        }
      });
  }, [user]);

  // Real-time subscription for new quotes
  useEffect(() => {
    if (!user || requests.length === 0) return;
    const requestIds = requests.map((r) => r.id);
    const channel = supabase
      .channel("quotes-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "quotes" },
        async (payload) => {
          const newQuote = payload.new as any;
          if (!requestIds.includes(newQuote.request_id)) return;
          // Fetch full quote with joins
          const { data } = await supabase
            .from("quotes")
            .select("id, price_kes, message, status, created_at, request_id, provider_id, work_thread_id, profiles!quotes_provider_id_fkey(full_name), job_requests!quotes_request_id_fkey(description, services(name))")
            .eq("id", newQuote.id)
            .single();
          if (data) {
            const { data: ratings } = await supabase
              .from("businesses")
              .select("id, avg_rating, total_reviews")
              .eq("id", (data as any).provider_id)
              .single();
            const enriched = { ...(data as unknown as Quote), provider_profiles: ratings ?? null };
            setQuotes((prev) => {
              if (prev.some((q) => q.id === enriched.id)) return prev;
              return [enriched, ...prev];
            });
            toast({ title: "New quote received", description: "A provider submitted a new quote." });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, requests]);
  const activeCount = requests.filter((r) => r.status === "open").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;

  const stats = [
    { label: "Active Requests", value: String(activeCount), icon: FileText, trend: `${requests.length} total` },
    { label: "Quotes Received", value: String(quotes.length), icon: TrendingUp, trend: "Across all requests" },
    { label: "Jobs Completed", value: String(completedCount), icon: CheckCircle, trend: "This month" },
    { label: "Total Spent", value: "—", icon: DollarSign, trend: "Lifetime" },
  ];

  const statusColor: Record<string, string> = {
    open: "bg-primary/10 text-primary",
    pending: "bg-accent text-accent-foreground",
    completion_pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    matched: "bg-accent text-accent-foreground",
    completed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-4 lg:block">
          <nav className="space-y-1">
            {sideLinks.map((link) => {
              const isActive = location.pathname === link.href || (link.href === "/dashboard" && location.pathname === "/dashboard/");
              return (
                <Link key={link.label} to={link.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                  <link.icon className="h-4 w-4" />{link.label}
                  {link.label === "Messages" && unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 min-w-5 justify-center px-1.5 text-[10px]">
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1 bg-background p-6 lg:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">
                {isMessagesTab ? "Messages" : isSettingsTab ? "Account Settings" : "Dashboard"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isMessagesTab 
                  ? "Chat directly with your service pros." 
                  : isSettingsTab 
                    ? "Manage your account and payment settings." 
                    : "Welcome back! Here's your activity overview."}
              </p>
            </div>
            {!isMessagesTab && !isSettingsTab && (
              <Button asChild>
                <Link to="/request">
                  <Plus className="h-4 w-4" />New Request
                </Link>
              </Button>
            )}
          </div>

          {/* MAIN CONTENT AREA */}
          {isMessagesTab ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <ConversationList />
            </div>
          ) : isSettingsTab ? (
            /* DYNAMIC SETTINGS COMPONENT BASED ON ROLE */
            <div className="rounded-2xl border border-border bg-card p-6">
              {user?.user_metadata?.role === "provider" ? (
                <ProviderAccountSettings />
              ) : (
                <ClientAccountSettings />
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{stat.label}</span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <stat.icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.trend}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-border bg-card p-6">
                <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Your Requests</h2>
                {loading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Clock className="mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No requests yet</p>
                    <Button variant="outline" size="sm" className="mt-4" asChild><Link to="/request">Post your first request</Link></Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((req) => {
                      const reqQuotes = quotes.filter(q => q.request_id === req.id);
                      return (
                      <div key={req.id} className="rounded-xl border border-border p-4 transition-colors hover:bg-accent/30">
                        <div className="grid gap-4 md:grid-cols-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{req.services?.name || "Service"}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[req.status] || "bg-muted text-muted-foreground"}`}>
                              {req.status === "completion_pending" ? "awaiting confirmation" : req.status}
                            </span>
                            {reqQuotes.length > 0 && (
                              <Badge variant="secondary" className="text-[10px] h-5">
                                {reqQuotes.length} quote{reqQuotes.length !== 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{parseDescriptionSummary(req.description)}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            {req.location_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.location_name}</span>}
                            <span>{format(new Date(req.created_at), "MMM d, yyyy")}</span>
                          </div>
                          {(req.status === "pending" || req.status === "completion_pending") && (() => {
                            const acceptedQuote = quotes.find(q => q.request_id === req.id && q.status === "accepted");
                            return acceptedQuote ? (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                                  <User className="h-3 w-3" />
                                  Hired: {acceptedQuote.profiles?.full_name || "Provider"}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={async () => {
                                    // Use cached work_thread_id or fetch from DB
                                    let threadId = workThreadMap[req.id];
                                    if (!threadId) {
                                      const { data: wt } = await supabase
                                        .from("work_threads")
                                        .select("id")
                                        .eq("job_request_id", req.id)
                                        .eq("client_id", user!.id)
                                        .maybeSingle();
                                      threadId = wt?.id || req.id;
                                      if (wt?.id) setWorkThreadMap(prev => ({ ...prev, [req.id]: wt.id }));
                                    }
                                    setChatWorkThreadId(threadId);
                                    setChatRecipientName(acceptedQuote.profiles?.full_name || "Provider");
                                  }}
                                >
                                  <MessageCircle className="mr-1 h-3 w-3" />
                                  Message
                                </Button>
                              </div>
                            ) : null;
                          })()}
                          {(() => {
                            const imgs = normalizeImageUrls(req.image_urls);
                            return imgs.length > 0 ? (
                            <div className="mt-2 flex gap-1.5">
                              {imgs.slice(0, 3).map((url, i) => (
                                <div key={url || i} className="h-10 w-10 overflow-hidden rounded-md border border-border">
                                  <Image src={url} alt={`Job photo ${i + 1}`} className="h-full w-full object-cover" />
                                </div>
                              ))}
                              {imgs.length > 3 && (
                                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-xs font-medium text-muted-foreground">
                                  +{imgs.length - 3}
                                </div>
                              )}
                            </div>
                            ) : null;
                          })()}
                          {req.status === "open" && (
                            <div className="mt-2 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => openEditDialog(req)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit request
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                                    disabled={deletingRequestId === req.id}
                                  >
                                    {deletingRequestId === req.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                    Delete
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this request?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove the request and any associated quotes. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={async () => {
                                        setDeletingRequestId(req.id);
                                        const { error } = await supabase
                                          .from("job_requests")
                                          .delete()
                                          .eq("id", req.id);
                                        setDeletingRequestId(null);
                                        if (error) {
                                          toast({ title: "Error", description: "Could not delete request.", variant: "destructive" });
                                          return;
                                        }
                                        setRequests((prev) => prev.filter((r) => r.id !== req.id));
                                        setQuotes((prev) => prev.filter((q) => q.request_id !== req.id));
                                        toast({ title: "Request deleted" });
                                      }}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                          {req.status === "completion_pending" && (
                            <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                              <p className="mb-2 text-sm font-medium text-foreground">The provider has marked this job as complete. Confirm?</p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={confirmingJobId === req.id}
                                  onClick={() => {
                                    const quote = quotes.find(q => q.request_id === req.id);
                                    handleConfirmCompletion(req.id, quote?.provider_id || "");
                                  }}
                                >
                                  {confirmingJobId === req.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1 h-3.5 w-3.5" />}
                                  Yes, Completed
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={confirmingJobId === req.id}
                                  onClick={() => handleDeclineCompletion(req.id)}
                                >
                                  Not Yet
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Quotes Panel */}
                        <QuotesPanel
                          quotes={reqQuotes}
                          requestStatus={req.status}
                          startingJobId={startingJobId}
                          decliningQuoteId={decliningQuoteId}
                          requestId={req.id}
                          onHire={handleStartJob}
                          onDecline={handleDeclineQuote}
                          onMessage={(threadId, name) => {
                            setChatWorkThreadId(threadId);
                            setChatRecipientName(name);
                          }}
                        />
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Edit Request Dialog */}
      <Dialog open={!!editingRequest} onOpenChange={(open) => { if (!open) setEditingRequest(null); }}>
        <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 p-0">
          {/* Fixed header */}
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-base">
              Edit Request
              {editingRequest?.services?.name && (
                <span className="ml-1 font-normal text-muted-foreground">— {editingRequest.services.name}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Dynamic archetype questions */}
            {(() => {
              const archetype = deriveArchetype(editingRequest?.services?.archetype);
              const questions: any[] = (questionsData as any).archetypes?.[archetype]?.questions ?? [];
              return questions
                .filter((q) => q.type !== "image_upload")
                .map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <Label className="text-sm font-medium">{q.label}</Label>
                    {q.type === "textarea" ? (
                      <Textarea
                        value={editAnswers[q.id] ?? ""}
                        onChange={(e) => setEditAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        rows={3}
                        className="resize-none text-sm"
                        placeholder={q.placeholder}
                      />
                    ) : q.type === "date" ? (
                      <Input
                        type="date"
                        value={editAnswers[q.id] ?? ""}
                        onChange={(e) => setEditAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        className="text-sm"
                      />
                    ) : (
                      <select
                        value={editAnswers[q.id] ?? ""}
                        onChange={(e) => setEditAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select…</option>
                        {q.options?.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ));
            })()}

            {/* Divider */}
            <div className="border-t border-border" />


            {/* Image management */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Photos</Label>
              <div className="flex flex-wrap gap-2">
                {editImages.map((url, idx) => (
                  <div key={url || idx} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
                    <img src={url} alt={`edit-img-${idx}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveEditImage(idx)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 shadow"
                      aria-label="Remove image"
                    >
                      <span style={{fontWeight:'bold',fontSize:'1.1em'}}>&times;</span>
                    </button>
                  </div>
                ))}
                {editImages.length < 3 && (
                  <label className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-gray-400 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      style={{ display: 'none' }}
                      disabled={editUploading}
                      onChange={e => handleAddEditImages(e.target.files)}
                    />
                    <span style={{fontSize:'2em'}}>+</span>
                    <span className="text-[10px]">Add photo</span>
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Up to 3 photos · JPG, PNG, WebP
              </p>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. Kilimani, Nairobi"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

          </div>

          {/* Fixed footer */}
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setEditingRequest(null)}>Cancel</Button>
            <Button
              disabled={savingEdit || !editAnswers.task_description?.trim()}
              onClick={handleSaveEdit}
            >
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={!!feedbackRequestId} onOpenChange={(open) => { if (!open) setFeedbackRequestId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>How was the service?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className="p-0.5"
                  >
                    <Star
                      className={`h-7 w-7 ${star <= feedbackRating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-comment">Comments (optional)</Label>
              <Textarea
                id="feedback-comment"
                placeholder="Share your experience..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                maxLength={1000}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={submittingFeedback}
                onClick={handleSubmitFeedback}
              >
                {submittingFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Feedback
              </Button>
              <Button
                variant="outline"
                onClick={() => setFeedbackRequestId(null)}
              >
                Skip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MessageDrawer
        workThreadId={chatWorkThreadId}
        recipientName={chatRecipientName}
        open={!!chatWorkThreadId}
        onOpenChange={(open) => { if (!open) setChatWorkThreadId(null); }}
        onRead={resetCount}
      />
    </div>
  );
};

export default Dashboard;