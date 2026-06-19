import { Link } from "react-router-dom";
import {
  CheckCircle, Clock, Loader2, MapPin, MessageCircle, Pencil, Trash2, User,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "@/components/ui/Image";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import QuotesPanel from "@/components/dashboard/QuotesPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  normalizeImageUrls, parseDescriptionSummary, statusColor,
  type JobRequest, type Quote,
} from "./dashboardTypes";

interface RequestsTabProps {
  requests: JobRequest[];
  quotes: Quote[];
  loading: boolean;
  workThreadMap: Record<string, string>;
  openDisputeRequestIds?: Set<string>;
  startingJobId: string | null;
  decliningQuoteId: string | null;
  confirmingJobId: string | null;
  deletingRequestId: string | null;
  onHire: (requestId: string, quoteId: string) => void | Promise<void>;
  onDecline: (quoteId: string) => void | Promise<void>;
  onConfirmComplete: (requestId: string, providerId: string) => void | Promise<void>;
  onDeclineComplete: (requestId: string) => void | Promise<void>;
  onMessage: (threadId: string, recipientName: string) => void;
  onEdit: (request: JobRequest) => void;
  onDelete: (requestId: string) => void | Promise<void>;
  onRequestHire: (
    requestId: string, quoteId: string, amount: number,
    providerName: string, workThreadId: string
  ) => void;
  onCacheThread?: (requestId: string, threadId: string) => void;
}

export default function RequestsTab({
  requests, quotes, loading, workThreadMap, openDisputeRequestIds,
  startingJobId, decliningQuoteId, confirmingJobId, deletingRequestId,
  onHire, onDecline, onConfirmComplete, onDeclineComplete,
  onMessage, onEdit, onDelete, onRequestHire, onCacheThread,
}: RequestsTabProps) {
  const { user } = useAuth();

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Your Requests</h2>
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Clock className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No requests yet</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link to="/request">Post your first request</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const reqQuotes = quotes.filter((q) => q.request_id === req.id);
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
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {parseDescriptionSummary(req.description)}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {req.location_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{req.location_name}
                        </span>
                      )}
                      <span>{format(new Date(req.created_at), "MMM d, yyyy")}</span>
                    </div>
                    {(req.status === "pending" || req.status === "completion_pending") && (() => {
                      const acceptedQuote = quotes.find((q) => q.request_id === req.id && q.status === "accepted");
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
                              let threadId = workThreadMap[req.id];
                              if (!threadId && user) {
                                const { data: wt } = await supabase
                                  .from("work_threads")
                                  .select("id")
                                  .eq("job_request_id", req.id)
                                  .eq("client_id", user.id)
                                  .maybeSingle();
                                threadId = wt?.id || req.id;
                                if (wt?.id) onCacheThread?.(req.id, wt.id);
                              }
                              onMessage(threadId || req.id, acceptedQuote.profiles?.full_name || "Provider");
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
                          onClick={() => onEdit(req)}
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
                                onClick={() => onDelete(req.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                    {req.status === "completion_pending" && (
                      openDisputeRequestIds?.has(req.id) ? (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                          <p className="text-sm text-foreground">
                            This job has a pending dispute. Our team will follow up once it's resolved.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                          <p className="mb-2 text-sm font-medium text-foreground">
                            The provider has marked this job as complete. Confirm?
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={confirmingJobId === req.id}
                              onClick={() => {
                                const quote = quotes.find((q) => q.request_id === req.id);
                                onConfirmComplete(req.id, quote?.provider_id || "");
                              }}
                            >
                              {confirmingJobId === req.id
                                ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                : <CheckCircle className="mr-1 h-3.5 w-3.5" />}
                              Yes, Completed
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={confirmingJobId === req.id}
                              onClick={() => onDeclineComplete(req.id)}
                            >
                              Not Yet
                            </Button>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <QuotesPanel
                    quotes={reqQuotes}
                    requestStatus={req.status}
                    startingJobId={startingJobId}
                    decliningQuoteId={decliningQuoteId}
                    requestId={req.id}
                    onHire={onHire}
                    onRequestHire={(requestId, quoteId, amount, providerName, workThreadId) =>
                      onRequestHire(requestId, quoteId, amount, providerName, workThreadId)
                    }
                    onDecline={onDecline}
                    onMessage={onMessage}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
