import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import {
  LayoutDashboard, FileText, MessageCircle, Settings, Plus,
  TrendingUp, Clock, CheckCircle, DollarSign, MapPin, Loader2, User, Star,
} from "lucide-react";
import MessageDrawer from "@/components/messaging/MessageDrawer";
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
} from "@/components/ui/dialog";

interface ServiceRequest {
  id: string;
  description: string;
  budget: number | null;
  location_name: string | null;
  status: string;
  created_at: string;
  services: { name: string } | null;
  image_urls: string[] | null;
}

interface Quote {
  id: string;
  price: number;
  message: string | null;
  status: string;
  created_at: string;
  request_id: string;
  provider_id: string;
  profiles: { full_name: string | null } | null;
  service_requests: { description: string; services: { name: string } | null } | null;
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
  const { unreadCount, resetCount } = useUnreadMessageCount();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
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
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [chatRecipientName, setChatRecipientName] = useState("");

  const handleStartJob = async (requestId: string, selectedQuoteId: string) => {
    setStartingJobId(requestId);
    // Accept selected quote
    const { error: acceptErr } = await supabase
      .from("quotes")
      .update({ status: "accepted" })
      .eq("id", selectedQuoteId);
    if (acceptErr) {
      setStartingJobId(null);
      toast({ title: "Error", description: "Could not accept quote.", variant: "destructive" });
      return;
    }
    // Reject all other quotes for this request
    const otherQuoteIds = quotes
      .filter(q => q.request_id === requestId && q.id !== selectedQuoteId && q.status === "pending")
      .map(q => q.id);
    if (otherQuoteIds.length > 0) {
      await supabase.from("quotes").update({ status: "rejected" }).in("id", otherQuoteIds);
    }
    // Update request status
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "pending" })
      .eq("id", requestId);
    setStartingJobId(null);
    if (error) {
      toast({ title: "Error", description: "Could not start job.", variant: "destructive" });
      return;
    }
    // Update local state
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "pending" } : r));
    setQuotes(prev => prev.map(q => {
      if (q.request_id !== requestId) return q;
      if (q.id === selectedQuoteId) return { ...q, status: "accepted" };
      return { ...q, status: "rejected" };
    }));
    toast({ title: "Job started!", description: "The provider has been hired." });
  };

  const handleDeclineQuote = async (quoteId: string) => {
    setDecliningQuoteId(quoteId);
    const { error } = await supabase
      .from("quotes")
      .update({ status: "rejected" })
      .eq("id", quoteId);
    setDecliningQuoteId(null);
    if (error) {
      toast({ title: "Error", description: "Could not decline quote.", variant: "destructive" });
      return;
    }
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: "rejected" } : q));
    toast({ title: "Quote declined", description: "The provider has been notified." });
  };

  const handleConfirmCompletion = async (requestId: string, providerId: string) => {
    setConfirmingJobId(requestId);
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "completed" })
      .eq("id", requestId);
    setConfirmingJobId(null);
    if (error) {
      toast({ title: "Error", description: "Could not confirm completion.", variant: "destructive" });
      return;
    }
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "completed" } : r));
    toast({ title: "Job confirmed!", description: "The job has been marked as completed." });
    // Open feedback dialog
    setFeedbackRequestId(requestId);
    setFeedbackProviderId(providerId);
    setFeedbackRating(5);
    setFeedbackComment("");
  };

  const handleDeclineCompletion = async (requestId: string) => {
    setConfirmingJobId(requestId);
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "pending" })
      .eq("id", requestId);
    setConfirmingJobId(null);
    if (error) {
      toast({ title: "Error", description: "Could not decline.", variant: "destructive" });
      return;
    }
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "pending" } : r));
    toast({ title: "Completion declined", description: "The provider has been notified." });
  };

  const handleSubmitFeedback = async () => {
    if (!user || !feedbackRequestId || !feedbackProviderId) return;
    setSubmittingFeedback(true);
    const { error } = await supabase.from("reviews").insert({
      request_id: feedbackRequestId,
      customer_id: user.id,
      provider_id: feedbackProviderId,
      rating: feedbackRating,
      comment: feedbackComment || null,
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
      .from("service_requests")
      .select("id, description, budget, location_name, status, created_at, image_urls, services(name)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const reqs = (data as unknown as ServiceRequest[]) || [];
        setRequests(reqs);
        const ids = reqs.map((r) => r.id);
        if (ids.length > 0) {
          supabase
            .from("quotes")
            .select("id, price, message, status, created_at, request_id, provider_id, profiles!quotes_provider_id_fkey(full_name), service_requests!quotes_request_id_fkey(description, services(name))")
            .in("request_id", ids)
            .order("created_at", { ascending: false })
            .then(({ data: qData }) => {
              setQuotes((qData as unknown as Quote[]) || []);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
  }, [user]);

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
            {sideLinks.map((link) => (
              <Link key={link.label} to={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                <link.icon className="h-4 w-4" />{link.label}
                {link.label === "Messages" && unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-auto h-5 min-w-5 justify-center px-1.5 text-[10px]">
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 bg-background p-6 lg:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back! Here's your activity overview.</p>
            </div>
            <Button asChild><Link to="/request"><Plus className="h-4 w-4" />New Request</Link></Button>
          </div>

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
                {requests.map((req) => (
                  <div key={req.id} className="flex items-start justify-between rounded-xl border border-border p-4 transition-colors hover:bg-accent/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{req.services?.name || "Service"}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[req.status] || "bg-muted text-muted-foreground"}`}>
                          {req.status === "completion_pending" ? "awaiting confirmation" : req.status}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{req.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        {req.location_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.location_name}</span>}
                        {req.budget && <span>KES {Number(req.budget).toLocaleString()}</span>}
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
                              onClick={() => {
                                setChatRequestId(req.id);
                                setChatRecipientName(acceptedQuote.profiles?.full_name || "Provider");
                              }}
                            >
                              <MessageCircle className="mr-1 h-3 w-3" />
                              Message
                            </Button>
                          </div>
                        ) : null;
                      })()}
                      {req.image_urls && req.image_urls.length > 0 && (
                        <div className="mt-2 flex gap-1.5">
                          {req.image_urls.slice(0, 3).map((url, i) => (
                            <div key={i} className="h-10 w-10 overflow-hidden rounded-md border border-border">
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </div>
                          ))}
                          {req.image_urls.length > 3 && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-xs font-medium text-muted-foreground">
                              +{req.image_urls.length - 3}
                            </div>
                          )}
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quotes Received Section */}
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Quotes Received</h2>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : quotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No quotes received yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Providers will send quotes once you post a request</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <div key={quote.id} className="flex items-start justify-between rounded-xl border border-border p-4 transition-colors hover:bg-accent/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {quote.service_requests?.services?.name || "Service"}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          quote.status === "pending" ? "bg-primary/10 text-primary" :
                          quote.status === "accepted" ? "bg-accent text-accent-foreground" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {quote.status}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {quote.service_requests?.description}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {quote.profiles?.full_name || "Provider"}
                        </span>
                        <span className="font-semibold text-foreground">
                          KES {Number(quote.price).toLocaleString()}
                        </span>
                        <span>{format(new Date(quote.created_at), "MMM d, yyyy")}</span>
                      </div>
                      {quote.message && (
                        <p className="mt-2 line-clamp-2 text-sm italic text-muted-foreground">
                          "{quote.message}"
                        </p>
                      )}
                    </div>
                    {(() => {
                      const linkedRequest = requests.find(r => r.id === quote.request_id);
                      const isOpen = linkedRequest?.status === "open";
                      if (quote.status === "rejected") {
                        return (
                          <span className="ml-4 shrink-0 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                            Rejected
                          </span>
                        );
                      }
                      if (quote.status === "accepted") {
                        return (
                          <span className="ml-4 shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            Accepted
                          </span>
                        );
                      }
                      return isOpen ? (
                        <div className="ml-4 flex shrink-0 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={startingJobId === quote.request_id}
                            onClick={() => handleStartJob(quote.request_id, quote.id)}
                          >
                            {startingJobId === quote.request_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Start Job
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={decliningQuoteId === quote.id}
                            onClick={() => handleDeclineQuote(quote.id)}
                          >
                            {decliningQuoteId === quote.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Decline"
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="ml-4 shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                          Job Started
                        </span>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

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
        requestId={chatRequestId}
        recipientName={chatRecipientName}
        open={!!chatRequestId}
        onOpenChange={(open) => { if (!open) setChatRequestId(null); }}
        onRead={resetCount}
      />
    </div>
  );
};

export default Dashboard;
