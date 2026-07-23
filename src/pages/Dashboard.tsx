import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import ConfirmHireDialog from "@/components/dashboard/ConfirmHireDialog";
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

  const queryClient = useQueryClient();
  const { data: hasBusinesses, isLoading: businessesLoading } = useQuery({
    queryKey: ["dashboard_has_businesses", user?.id ?? ""],
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user!.id)
        .eq("is_active", true)
        .limit(1);
      return (data || []).length > 0;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
  const roleResolved = !!user && !businessesLoading;
  const { data: requestsData = [], isLoading: reqLoading } = useClientJobRequests(user?.id ?? "");
  const requests = requestsData as JobRequest[];
  const { data: quotesData = [], isLoading: quotesLoading } = useClientQuotes(
    requests.map((r) => r.id)
  );
  const quotes = quotesData as Quote[];
  const loading = reqLoading || quotesLoading;
  const invalidateRequests = () =>
    queryClient.invalidateQueries({ queryKey: ["job_requests", "client", user?.id ?? ""] });
  const invalidateQuotes = () =>
    queryClient.invalidateQueries({ queryKey: ["quotes", "client"] });
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

  const threadIds = useMemo(() => Object.values(workThreadMap), [workThreadMap]);
  const { data: openDisputes = [] } = useQuery({
    queryKey: ["open_disputes", user?.id ?? "", threadIds.sort().join(",")],
    queryFn: async () => {
      if (!threadIds.length) return [];
      const { data, error } = await supabase
        .from("disputes")
        .select("id, work_thread_id")
        .in("work_thread_id", threadIds)
        .in("status", ["open", "investigating"]);
      if (error) throw error;
      return data ?? [];
    },
    enabled: threadIds.length > 0,
  });
  const openDisputeRequestIds = useMemo(() => {
    const threadToRequest: Record<string, string> = {};
    for (const [reqId, threadId] of Object.entries(workThreadMap)) {
      threadToRequest[threadId] = reqId;
    }
    return new Set(
      openDisputes
        .map((d) => threadToRequest[d.work_thread_id])
        .filter((x): x is string => !!x)
    );
  }, [openDisputes, workThreadMap]);

  const [payContext, setPayContext] = useState<{
    requestId: string; quoteId: string; amount: number;
    providerName: string; serviceName: string; workThreadId: string;
  } | null>(null);

  const handleStartJob = async (jobRequestId: string, selectedQuoteId: string) => {
    setStartingJobId(jobRequestId);
    const acceptedQuote = quotes.find(q => q.id === selectedQuoteId);

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
    invalidateRequests();
    invalidateQuotes();
    toast({ title: "Job started!", description: "The provider has been hired." });
  };

  const [hireConfirmTarget, setHireConfirmTarget] = useState<{
    requestId: string; quoteId: string; amount: number;
    providerName: string; serviceName: string; workThreadId: string;
  } | null>(null);
  const [confirmingHire, setConfirmingHire] = useState(false);

  const handleConfirmHire = async () => {
    if (!hireConfirmTarget) return;
    setConfirmingHire(true);
    const { requestId, quoteId } = hireConfirmTarget;
    const { error: acceptErr } = await supabase
      .from("quotes").update({ status: "accepted" }).eq("id", quoteId);
    if (acceptErr) {
      setConfirmingHire(false);
      toast({ title: "Error", description: "Could not accept quote.", variant: "destructive" });
      return;
    }
    const otherQuoteIds = quotes
      .filter(q => q.request_id === requestId && q.id !== quoteId && q.status === "pending")
      .map(q => q.id);
    if (otherQuoteIds.length > 0) {
      await supabase.from("quotes").update({ status: "declined" }).in("id", otherQuoteIds);
    }
    invalidateQuotes();
    setConfirmingHire(false);
    const target = hireConfirmTarget;
    setHireConfirmTarget(null);
    setPayContext({ ...target });
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
    invalidateQuotes();
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
    const threadId = workThreadMap[jobRequestId];
    if (threadId) {
      await supabase.from("work_threads")
        .update({ status: "completed" })
        .eq("id", threadId);
    }
    invalidateRequests();
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
    invalidateRequests();
    invalidateQuotes();
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
  }, [user]);

  useEffect(() => {
    if (!user || requests.length === 0) return;
    const requestIds = (requests as JobRequest[]).map((r) => r.id);
    const channel = supabase
      .channel("quotes-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "quotes" },
        (payload) => {
          const newQuote = payload.new as any;
          if (!requestIds.includes(newQuote.request_id)) return;
          invalidateQuotes();
          toast({ title: "New quote received", description: "A provider submitted a new quote." });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quotes" },
        (payload) => {
          const updated = payload.new as any;
          if (!requestIds.includes(updated.request_id)) return;
          invalidateQuotes();
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
                  openDisputeRequestIds={openDisputeRequestIds}
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
                  onRequestHire={(requestId, quoteId, amount, providerName, workThreadId) => {
                    const r = requests.find((x) => x.id === requestId);
                    setHireConfirmTarget({
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
        onSaved={() => {
          invalidateRequests();
        }}
      />

      <FeedbackDialog
        open={!!feedbackRequestId}
        requestId={feedbackRequestId}
        providerId={feedbackProviderId}
        workThreadMap={workThreadMap}
        onClose={() => setFeedbackRequestId(null)}
      />

      <ConfirmHireDialog
        open={!!hireConfirmTarget}
        onOpenChange={(o) => { if (!o) setHireConfirmTarget(null); }}
        providerName={hireConfirmTarget?.providerName ?? ""}
        serviceName={hireConfirmTarget?.serviceName ?? ""}
        priceKes={hireConfirmTarget?.amount ?? 0}
        onConfirm={handleConfirmHire}
        confirming={confirmingHire}
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
            invalidateRequests();
            toast({ title: "Dispute filed", description: "We'll review within 24 hours." });
          }
        }}
      />
      <MobileNav />
    </div>
  );
};

export default Dashboard;
