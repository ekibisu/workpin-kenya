import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, MessageCircle, Settings,
  Clock, MapPin, Banknote, Loader2, Image as ImageIcon, CheckCircle, XCircle,
} from "lucide-react";

import MessageDrawer from "@/components/messaging/MessageDrawer";
import ConversationList from "@/components/messaging/ConversationList";
import { Badge } from "@/components/ui/badge";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface OpenRequest {
  id: string;
  description: string;
  budget_min_kes: number | null;
  location_name: string | null;
  status: string;
  created_at: string;
  image_urls: string[] | null;
  services: { name: string } | null;
}

const sideLinks = [
  { label: "Open Jobs", icon: LayoutDashboard, href: "/provider-dashboard" },
  { label: "My Quotes", icon: FileText, href: "/provider-dashboard/quotes" },
  { label: "Messages", icon: MessageCircle, href: "/provider-dashboard/messages" },
  { label: "Settings", icon: Settings, href: "/provider-dashboard/settings" },
];

const ProviderDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const isMessagesTab = location.pathname.includes("/provider-dashboard/messages");
  const { unreadCount, resetCount } = useUnreadMessageCount();
  const [requests, setRequests] = useState<OpenRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<OpenRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotedRequestIds, setQuotedRequestIds] = useState<Set<string>>(new Set());
  const [rejectedRequestIds, setRejectedRequestIds] = useState<Set<string>>(new Set());
  const [hiddenRequestIds, setHiddenRequestIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("hidden_requests");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [quoteDialogRequestId, setQuoteDialogRequestId] = useState<string | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [chatWorkThreadId, setChatWorkThreadId] = useState<string | null>(null);
  const [chatRecipientName, setChatRecipientName] = useState("");
  const [customerNames, setCustomerNames] = useState<Record<string, string>>();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // 1. Fetch provider's categories to filter open requests
      const { data: providerProfile } = await supabase
        .from("provider_profiles")
        .select("categories")
        .eq("user_id", user.id)
        .maybeSingle();

      const providerCategories: string[] = providerProfile?.categories || [];

      // 2. Fetch matching service IDs for the provider's categories (which store service names)
      let matchingServiceIds: string[] = [];
      if (providerCategories.length > 0) {
        const { data: matchingServices } = await supabase
          .from("services")
          .select("id")
          .in("name", providerCategories);
        matchingServiceIds = (matchingServices || []).map((s) => s.id);
      }

      // 3. Fetch open requests filtered by matching services, pending jobs, and provider's quotes
      const openReqQuery = supabase
        .from("job_requests")
        .select("id, description, budget_min_kes, location_name, status, created_at, image_urls, services(name)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      // Only filter by service if provider has categories set
      if (matchingServiceIds.length > 0) {
        openReqQuery.in("service_id", matchingServiceIds);
      }

      const [reqRes, pendingRes, quoteRes] = await Promise.all([
        openReqQuery,
        supabase
          .from("job_requests")
          .select("id, description, budget_min_kes, location_name, status, created_at, image_urls, client_id, services(name)")
          .in("status", ["pending", "completion_pending"])
          .order("created_at", { ascending: false }),
        supabase
          .from("quotes")
          .select("request_id, status")
          .eq("provider_id", user.id),
      ]);

      setRequests((reqRes.data as unknown as OpenRequest[]) || []);
      const pending = (pendingRes.data as unknown as OpenRequest[]) || [];
      setPendingRequests(pending);
      const quoteData = quoteRes.data || [];
      const ids = new Set(quoteData.map((q) => q.request_id));
      setQuotedRequestIds(ids);
      const declined = new Set(quoteData.filter((q) => q.status === "declined").map((q) => q.request_id));
      setRejectedRequestIds(declined);
      setLoading(false);

      // Fetch customer names for pending requests
      const customerIds = pending.map((r) => (r as any).client_id).filter(Boolean);
      if (customerIds.length > 0) {
        supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", customerIds)
          .then(({ data: profiles }) => {
            const names: Record<string, string> = {};
            (profiles || []).forEach((p: any) => {
              names[p.id] = p.full_name || "Client";
            });
            setCustomerNames(names);
          });
      }
    };

    fetchData();
  }, [user]);

  const handleSubmitQuote = async () => {
    if (!user || !quoteDialogRequestId || !quotePrice) return;
    setSubmittingQuote(true);
    const { error } = await supabase.from("quotes").insert({
      provider_id: user.id,
      request_id: quoteDialogRequestId,
      price_kes: Number(quotePrice),
      message: quoteMessage || null,
    });
    setSubmittingQuote(false);
    if (error) {
      toast({ title: "Error", description: "Could not send quote. Please try again.", variant: "destructive" });
      return;
    }
    setQuotedRequestIds((prev) => new Set(prev).add(quoteDialogRequestId));
    setQuoteDialogRequestId(null);
    setQuotePrice("");
    setQuoteMessage("");
    toast({ title: "Quote sent!", description: "The customer will be notified." });
  };

  const handleHideRequest = (requestId: string) => {
    const updated = new Set(hiddenRequestIds).add(requestId);
    setHiddenRequestIds(updated);
    localStorage.setItem("hidden_requests", JSON.stringify([...updated]));
    toast({ title: "Request hidden", description: "You won't see this request anymore." });
  };

  const handleCompleteJob = async (requestId: string) => {
    setCompletingJobId(requestId);
    const { error } = await supabase
      .from("job_requests")
      .update({ status: "completion_pending" })
      .eq("id", requestId);
    setCompletingJobId(null);
    if (error) {
      toast({ title: "Error", description: "Could not request completion. Please try again.", variant: "destructive" });
      return;
    }
    setPendingRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: "completion_pending" } : r));
    toast({ title: "Completion requested!", description: "The client will be asked to confirm." });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-4 lg:block">
          <nav className="space-y-1">
            {sideLinks.map((link) => {
              const isActive = location.pathname === link.href || (link.href === "/provider-dashboard" && location.pathname === "/provider-dashboard/");
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                  {link.label === "Messages" && unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 min-w-5 justify-center px-1.5 text-[10px]">
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 bg-background p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-foreground">{isMessagesTab ? "Messages" : "Open Service Requests"}</h1>
            <p className="text-sm text-muted-foreground">{isMessagesTab ? "Chat directly with clients." : "Browse jobs posted by customers and send a quote."}</p>
          </div>

          {isMessagesTab ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <ConversationList />
            </div>
          ) : (
            <>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Clock className="mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No open requests right now. Check back soon!</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {requests.filter((req) => !hiddenRequestIds.has(req.id)).map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {req.services?.name || "Service"}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {req.status}
                        </span>
                      </div>

                      <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
                        {req.description}
                      </p>

                      {/* Image thumbnails */}
                      {req.image_urls && req.image_urls.length > 0 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="mb-3 flex items-center gap-1.5">
                              <div className="flex -space-x-2">
                                {req.image_urls.slice(0, 3).map((url, i) => (
                                  <div
                                    key={i}
                                    className="h-12 w-12 overflow-hidden rounded-lg border-2 border-card"
                                  >
                                    <Image
                                      src={url}
                                      alt={`Job photo ${i + 1}`}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                              <span className="ml-1 flex items-center gap-1 text-xs font-medium text-primary">
                                <ImageIcon className="h-3.5 w-3.5" />
                                {req.image_urls.length} photo{req.image_urls.length > 1 ? "s" : ""}
                              </span>
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Job Photos</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {req.image_urls.map((url, i) => (
                                <div
                                  key={i}
                                  className="overflow-hidden rounded-xl border border-border"
                                >
                                  <Image
                                    src={url}
                                    alt={`Job photo ${i + 1}`}
                                    className="h-48 w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
                        {req.location_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {req.location_name}
                          </span>
                        )}
                        {req.budget_min_kes && (
                          <span className="flex items-center gap-1">
                            <Banknote className="h-3 w-3" />
                            KES {Number(req.budget_min_kes).toLocaleString()}
                          </span>
                        )}
                        <span>{format(new Date(req.created_at), "MMM d")}</span>
                      </div>

                      {quotedRequestIds.has(req.id) ? (
                        rejectedRequestIds.has(req.id) ? (
                          <div className="mt-3 flex w-full items-center justify-center rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
                            Quote Declined
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="mt-3 w-full" disabled>
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Quote Sent
                          </Button>
                        )
                      ) : (
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setQuoteDialogRequestId(req.id);
                              setQuotePrice("");
                              setQuoteMessage("");
                            }}
                          >
                            Send Quote
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleHideRequest(req.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Jobs Pending Section */}
              <div className="mt-10">
                <h2 className="text-xl font-extrabold text-foreground">Jobs Pending</h2>
                <p className="mb-4 text-sm text-muted-foreground">Jobs that have been started by clients and are awaiting completion.</p>

                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-10 text-center">
                    <Clock className="mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No pending jobs yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {req.services?.name || "Service"}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${req.status === "completion_pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" : "bg-accent text-accent-foreground"
                            }`}>
                            {req.status === "completion_pending" ? "awaiting confirmation" : "pending"}
                          </span>
                        </div>
                        <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
                          {req.description}
                        </p>

                        {req.image_urls && req.image_urls.length > 0 && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <button className="mb-3 flex items-center gap-1.5">
                                <div className="flex -space-x-2">
                                  {req.image_urls.slice(0, 3).map((url, i) => (
                                    <div key={i} className="h-12 w-12 overflow-hidden rounded-lg border-2 border-card">
                                      <img src={url} alt="" className="h-full w-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                                <span className="ml-1 flex items-center gap-1 text-xs font-medium text-primary">
                                  <ImageIcon className="h-3.5 w-3.5" />
                                  {req.image_urls.length} photo{req.image_urls.length > 1 ? "s" : ""}
                                </span>
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Job Photos</DialogTitle>
                              </DialogHeader>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {req.image_urls.map((url, i) => (
                                  <div key={i} className="overflow-hidden rounded-xl border border-border">
                                    <img src={url} alt={`Job photo ${i + 1}`} className="h-48 w-full object-cover" />
                                  </div>
                                ))}
                              </div>

                            </DialogContent>
                          </Dialog>
                        )}

                        <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
                          {req.location_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {req.location_name}
                            </span>
                          )}
                          {req.budget_min_kes && (
                            <span className="flex items-center gap-1">
                              <Banknote className="h-3 w-3" />
                              KES {Number(req.budget_min_kes).toLocaleString()}
                            </span>
                          )}
                          <span>{format(new Date(req.created_at), "MMM d")}</span>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={async () => {
                              const clientId = (req as any).client_id;
                              // Look up the work_thread for this job
                              const { data: wt } = await supabase
                                .from("work_threads")
                                .select("id")
                                .eq("job_request_id", req.id)
                                .eq("provider_id", user!.id)
                                .maybeSingle();
                              setChatWorkThreadId(wt?.id || req.id);
                              setChatRecipientName(customerNames?.[clientId] || "Client");
                            }}
                          >
                            <MessageCircle className="mr-1 h-3.5 w-3.5" />
                            Message Client
                          </Button>
                          {req.status === "completion_pending" ? (
                            <Button variant="outline" size="sm" className="flex-1" disabled>
                              <Clock className="mr-1.5 h-3.5 w-3.5" />
                              Awaiting Confirmation
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              disabled={completingJobId === req.id}
                              onClick={() => handleCompleteJob(req.id)}
                            >
                              {completingJobId === req.id ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              {completingJobId === req.id ? "Requesting..." : "Mark Complete"}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
      {/* Quote Dialog */}
      <Dialog open={!!quoteDialogRequestId} onOpenChange={(open) => { if (!open) setQuoteDialogRequestId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send a Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quote-price">Price (KES) *</Label>
              <Input
                id="quote-price"
                type="number"
                min="1"
                placeholder="e.g. 5000"
                value={quotePrice}
                onChange={(e) => setQuotePrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-message">Message (optional)</Label>
              <Textarea
                id="quote-message"
                placeholder="Any details about your quote..."
                value={quoteMessage}
                onChange={(e) => setQuoteMessage(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={!quotePrice || Number(quotePrice) <= 0 || submittingQuote}
              onClick={handleSubmitQuote}
            >
              {submittingQuote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Quote
            </Button>
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
      <Footer />
    </div>
  );
};

export default ProviderDashboard;
