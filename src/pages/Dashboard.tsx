import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useClientJobRequests, useClientQuotes } from "@/hooks/useNewSchemaQueries";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, MessageCircle, Settings, Plus, Briefcase,
  Search, Send, Wallet,
} from "lucide-react";
import MpesaCheckout from "@/components/payments/MpesaCheckout";
import MessageDrawer from "@/components/messaging/MessageDrawer";
import ConversationList from "@/components/messaging/ConversationList";
import { Badge } from "@/components/ui/badge";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import UnifiedSettings from "@/components/dashboard/UnifiedSettings";
import BusinessesPanel from "@/components/dashboard/BusinessesPanel";
import ProviderJobFeed from "@/components/dashboard/ProviderJobFeed";
import ProviderQuotesPanel from "@/components/dashboard/ProviderQuotesPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import MobileNav from "@/components/layout/MobileNav";
import StatsGrid from "@/components/dashboard/StatsGrid";
import RequestsTab from "@/components/dashboard/RequestsTab";
import EditRequestDialog from "@/components/dashboard/EditRequestDialog";
import FeedbackDialog from "@/components/dashboard/FeedbackDialog";
import WalletTab from "@/components/dashboard/WalletTab";
import DisputeDialog from "@/components/dashboard/DisputeDialog";
import type { JobRequest, Quote } from "@/components/dashboard/dashboardTypes";

const sideLinks = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "My Requests", icon: FileText, href: "/dashboard/requests" },
  { label: "Job Feed", icon: Search, href: "/dashboard/jobs", providerOnly: true },
  { label: "My Quotes", icon: Send, href: "/dashboard/quotes", providerOnly: true },
  { label: "Wallet", icon: Wallet, href: "/dashboard/wallet", providerOnly: true },
  { label: "My Businesses", icon: Briefcase, href: "/dashboard/businesses" },
  { label: "Messages", icon: MessageCircle, href: "/dashboard/messages" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const isMessagesTab = location.pathname.includes("/dashboard/messages");
  const isSettingsTab = location.pathname.includes("/dashboard/settings");
  const isBusinessesTab = location.pathname.includes("/dashboard/businesses");
  const isJobFeedTab = location.pathname.includes("/dashboard/jobs");
  const isMyQuotesTab = location.pathname.includes("/dashboard/quotes");
  const isWalletTab = location.pathname.includes("/dashboard/wallet");
  const { unreadCount, resetCount } = useUnreadMessageCount();

  const [hasBusinesses, setHasBusinesses] = useState(false);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingJobId, setStartingJobId] = useState<string | null>(null);
  const [decliningQuoteId, setDecliningQuoteId] = useState<string | null>(null);
  const [confirmingJobId, setConfirmingJobId] = useState<string | null>(null);
  const [feedbackRequestId, setFeedbackRequestId] = useState<string | null>(null);
  const [feedbackProviderId, setFeedbackProviderId] = useState<string | null>(null);
  const [chatWorkThreadId, setChatWorkThreadId] = useState<string | null>(null);
  const [chatRecipientName, setChatRecipientName] = useState("");
  const [editingRequest, setEditingRequest] = useState<JobRequest | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [workThreadMap, setWorkThreadMap] = useState<Record<string, string>>({});
  const [disputeTarget, setDisputeTarget] = useState<{ workThreadId: string; jobRequestId: string } | null>(null);

  const [payContext, setPayContext] = useState<{
    requestId: string; quoteId: string; amount: number;
    providerName: string; serviceName: string; workThreadId: string;
  } | null>(null);

  const handleStartJob = async (jobRequestId: string, selectedQuoteId: string) => {
    setStartingJobId(jobRequestId);
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
    const otherQuoteIds = quotes
      .filter(q => q.request_id === jobRequestId && q.id !== selectedQuoteId && q.status === "pending")
      .map(q => q.id);
    if (otherQuoteIds.length > 0) {
      await supabase.from("quotes").update({ status: "declined" }).in("id", otherQuoteIds);
    }

    let threadId = acceptedQuote?.work_thread_id;
    if (threadId) {
      await supabase.from("work_threads").update({ status: "active" }).eq("id", threadId);
    } else {
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
      if (threadErr) console.error("Failed to create work thread:", threadErr);
      threadId = threadData?.id ?? null;
    }

    if (threadId) {
      if (!acceptedQuote?.work_thread_id) {
        await supabase.from("quotes").update({ work_thread_id: threadId }).eq("id", selectedQuoteId);
      }
      setWorkThreadMap(prev => ({ ...prev, [jobRequestId]: threadId! }));
    }
    const { error } = await supabase
      .from("job_requests")
      .update({ status: "pending" })
      .eq("id", jobRequestId);
    setStartingJobId(null);
    if (error) {
      toast({ title: "Error", description: "Could not start job.", variant: "destructive" });
      return;
    }
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
    setFeedbackRequestId(jobRequestId);
    setFeedbackProviderId(providerId);
  };

  const handleDeclineCompletion = async (jobRequestId: string) => {
    let threadId = workThreadMap[jobRequestId];
    if (!threadId && user) {
      const { data: wt } = await supabase
        .from("work_threads")
        .select("id")
        .eq("job_request_id", jobRequestId)
        .eq("client_id", user.id)
        .maybeSingle();
      if (wt?.id) {
        threadId = wt.id;
        setWorkThreadMap((prev) => ({ ...prev, [jobRequestId]: wt.id }));
      }
    }
    if (!threadId) {
      toast({ title: "Error", description: "Could not locate conversation.", variant: "destructive" });
      return;
    }
    setDisputeTarget({ workThreadId: threadId, jobRequestId });
  };

  const handleDeleteRequest = async (requestId: string) => {
    setDeletingRequestId(requestId);
    const { error } = await supabase
      .from("job_requests")
      .delete()
      .eq("id", requestId);
    setDeletingRequestId(null);
    if (error) {
      toast({ title: "Error", description: "Could not delete request.", variant: "destructive" });
      return;
    }
    setRequests(prev => prev.filter(r => r.id !== requestId));
    setQuotes(prev => prev.filter(q => q.request_id !== requestId));
    toast({ title: "Request deleted" });
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .then(({ data }) => setHasBusinesses((data || []).length > 0));

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
                  business_ratings: providerRatings?.find(p => p.id === q.provider_id) ?? null,
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
            const enriched = { ...(data as unknown as Quote), business_ratings: ratings ?? null };
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
  }, [user, requests, toast]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-4 lg:block">
          <nav className="space-y-1">
            {sideLinks
              .filter((link) => !('providerOnly' in link && link.providerOnly) || hasBusinesses)
              .map((link) => {
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
                );
              })}
          </nav>
        </aside>

        <main className="flex-1 bg-background p-6 pb-16 lg:p-8 lg:pb-0">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">
                {isMessagesTab ? "Messages" : isSettingsTab ? "Account Settings" : isBusinessesTab ? "My Businesses" : isJobFeedTab ? "Job Feed" : isMyQuotesTab ? "My Quotes" : isWalletTab ? "Wallet" : "Dashboard"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isMessagesTab
                  ? "Chat directly with your service pros."
                  : isSettingsTab
                    ? "Manage your account and payment settings."
                    : isBusinessesTab
                      ? "Manage your businesses and services."
                      : isJobFeedTab
                        ? "Browse open requests and submit quotes."
                        : isMyQuotesTab
                          ? "Track quotes you've sent to clients."
                          : isWalletTab
                            ? "Track your earnings and request payouts."
                            : "Welcome back! Here's your activity overview."}
              </p>
            </div>
            {!isMessagesTab && !isSettingsTab && !isBusinessesTab && !isJobFeedTab && !isMyQuotesTab && !isWalletTab && (
              <Button asChild>
                <Link to="/request">
                  <Plus className="h-4 w-4" />New Request
                </Link>
              </Button>
            )}
          </div>

          {isMessagesTab ? (
            <ErrorBoundary label="messages">
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <ConversationList />
              </div>
            </ErrorBoundary>
          ) : isSettingsTab ? (
            <ErrorBoundary label="settings">
              <UnifiedSettings />
            </ErrorBoundary>
          ) : isBusinessesTab ? (
            <ErrorBoundary label="businesses panel">
              <BusinessesPanel />
            </ErrorBoundary>
          ) : isJobFeedTab ? (
            <ErrorBoundary label="job feed">
              <div className="rounded-2xl border border-border bg-card p-6">
                <ProviderJobFeed />
              </div>
            </ErrorBoundary>
          ) : isMyQuotesTab ? (
            <ErrorBoundary label="my quotes">
              <div className="rounded-2xl border border-border bg-card p-6">
                <ProviderQuotesPanel
                  onMessage={(threadId, name) => {
                    setChatWorkThreadId(threadId);
                    setChatRecipientName(name);
                  }}
                />
              </div>
            </ErrorBoundary>
          ) : isWalletTab ? (
            <ErrorBoundary label="wallet">
              <WalletTab />
            </ErrorBoundary>
          ) : (
            <ErrorBoundary label="dashboard">
              <>
                <StatsGrid requests={requests} quotes={quotes} />
                <RequestsTab
                  requests={requests}
                  quotes={quotes}
                  loading={loading}
                  workThreadMap={workThreadMap}
                  startingJobId={startingJobId}
                  decliningQuoteId={decliningQuoteId}
                  confirmingJobId={confirmingJobId}
                  deletingRequestId={deletingRequestId}
                  onHire={handleStartJob}
                  onDecline={handleDeclineQuote}
                  onConfirmComplete={handleConfirmCompletion}
                  onDeclineComplete={handleDeclineCompletion}
                  onEdit={(req) => setEditingRequest(req)}
                  onDelete={handleDeleteRequest}
                  onMessage={(threadId, name) => {
                    setChatWorkThreadId(threadId);
                    setChatRecipientName(name);
                  }}
                  onCacheThread={(reqId, threadId) =>
                    setWorkThreadMap((prev) => ({ ...prev, [reqId]: threadId }))
                  }
                  onPayAndHire={(requestId, quoteId, amount, providerName, workThreadId) => {
                    const r = requests.find((x) => x.id === requestId);
                    setPayContext({
                      requestId, quoteId, amount, providerName,
                      serviceName: r?.services?.name ?? "Service",
                      workThreadId,
                    });
                  }}
                />
              </>
            </ErrorBoundary>
          )}
        </main>
      </div>

      <EditRequestDialog
        request={editingRequest}
        onClose={() => setEditingRequest(null)}
        onSaved={(updates) => {
          if (!editingRequest) return;
          setRequests((prev) =>
            prev.map((r) => (r.id === editingRequest.id ? { ...r, ...updates } : r))
          );
        }}
      />

      <FeedbackDialog
        open={!!feedbackRequestId}
        requestId={feedbackRequestId}
        providerId={feedbackProviderId}
        workThreadMap={workThreadMap}
        onClose={() => setFeedbackRequestId(null)}
      />

      <MpesaCheckout
        open={!!payContext}
        onOpenChange={(o) => { if (!o) setPayContext(null); }}
        amount={payContext?.amount ?? 0}
        workThreadId={payContext?.workThreadId ?? ""}
        providerName={payContext?.providerName ?? ""}
        serviceName={payContext?.serviceName ?? ""}
        onSuccess={async () => {
          if (payContext) {
            await handleStartJob(payContext.requestId, payContext.quoteId);
            setPayContext(null);
          }
        }}
      />

      <MessageDrawer
        workThreadId={chatWorkThreadId}
        recipientName={chatRecipientName}
        open={!!chatWorkThreadId}
        onOpenChange={(open) => { if (!open) setChatWorkThreadId(null); }}
        onRead={resetCount}
      />

      <DisputeDialog
        open={!!disputeTarget}
        onOpenChange={(o) => { if (!o) setDisputeTarget(null); }}
        workThreadId={disputeTarget?.workThreadId ?? ""}
        jobRequestId={disputeTarget?.jobRequestId ?? ""}
        onDisputeFiled={() => {
          if (disputeTarget) {
            setRequests((prev) =>
              prev.map((r) =>
                r.id === disputeTarget.jobRequestId ? { ...r, status: "pending" } : r
              )
            );
            toast({ title: "Dispute filed", description: "We'll review within 24 hours." });
          }
        }}
      />
      <MobileNav />
    </div>
  );
};

export default Dashboard;
