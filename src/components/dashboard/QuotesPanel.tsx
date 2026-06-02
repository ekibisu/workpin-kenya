import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MessageCircle, CheckCircle, Loader2, ChevronDown, Star,
  List, LayoutGrid, MailOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface QuoteData {
  id: string;
  price_kes: number;
  message: string | null;
  status: string;
  created_at: string;
  request_id: string;
  provider_id: string;
  work_thread_id: string | null;
  profiles: { full_name: string | null } | null;
  business_ratings?: {
    avg_rating: number | null;
    total_reviews: number | null;
  } | null;
}

interface QuotesPanelProps {
  quotes: QuoteData[];
  requestStatus: string;
  startingJobId: string | null;
  decliningQuoteId: string | null;
  requestId: string;
  onHire: (requestId: string, quoteId: string) => void;
  onPayAndHire: (requestId: string, quoteId: string, amount: number, providerName: string, workThreadId: string) => void;
  onDecline: (quoteId: string) => void;
  onMessage: (workThreadId: string, recipientName: string) => void;
}

type SortOption = "price_asc" | "price_desc" | "rating" | "newest";
type FilterStatus = "all" | "pending";
type ViewMode = "compact" | "card";

// Deterministic color from provider name
const AVATAR_COLORS = [
  "bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-orange-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string | null) {
  return (name || "P").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function QuotesPanel({
  quotes, requestStatus, startingJobId, decliningQuoteId, requestId,
  onHire, onDecline, onMessage,
}: QuotesPanelProps) {
  const [sortBy, setSortBy] = useState<SortOption>("price_asc");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("compact");

  const processedQuotes = useMemo(() => {
    let filtered = filterStatus === "all" ? quotes : quotes.filter((q) => q.status === filterStatus);
    return [...filtered].sort((a, b) => {
      if (sortBy === "price_asc") return a.price_kes - b.price_kes;
      if (sortBy === "price_desc") return b.price_kes - a.price_kes;
      if (sortBy === "rating") {
        const ra = a.business_ratings?.avg_rating ?? 0;
        const rb = b.business_ratings?.avg_rating ?? 0;
        return rb - ra;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [quotes, sortBy, filterStatus]);

  if (quotes.length === 0) return null;

  const pendingCount = quotes.filter((q) => q.status === "pending").length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quotes</h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {quotes.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* View toggle */}
          <button
            onClick={() => setViewMode("compact")}
            className={cn(
              "rounded p-1 transition-colors",
              viewMode === "compact" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Compact view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("card")}
            className={cn(
              "rounded p-1 transition-colors",
              viewMode === "card" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Card view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-7 w-auto gap-1 border-none bg-transparent px-2 text-xs text-muted-foreground shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price_asc">Lowest Price</SelectItem>
              <SelectItem value="price_desc">Highest Price</SelectItem>
              <SelectItem value="rating">Highest Rating</SelectItem>
              <SelectItem value="newest">Most Recent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter tabs */}
      {quotes.length > 1 && (
        <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-2.5 h-6">All ({quotes.length})</TabsTrigger>
            {pendingCount > 0 && (
              <TabsTrigger value="pending" className="text-xs px-2.5 h-6">Pending ({pendingCount})</TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      )}

      {/* Empty filter state */}
      {processedQuotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <MailOpen className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No quotes match your filter</p>
        </div>
      ) : viewMode === "compact" ? (
        /* ── COMPACT ACCORDION VIEW ── */
        <Accordion type="single" collapsible className="space-y-1">
          {processedQuotes.map((quote) => {
            const isDeclined = quote.status === "declined";
            const isAccepted = quote.status === "accepted";
            const isPending = quote.status === "pending";
            const name = quote.profiles?.full_name || "Provider";
            const initials = getInitials(name);
            const color = getAvatarColor(name);
            const rating = quote.business_ratings?.avg_rating;
            const jobs = quote.business_ratings?.total_reviews ?? 0;

            return (
              <AccordionItem
                key={quote.id}
                value={quote.id}
                className={cn(
                  "rounded-lg border border-border bg-background overflow-hidden",
                  isDeclined && "opacity-50"
                )}
              >
                {/* ── Collapsed row ~56px ── */}
                <AccordionTrigger className="px-3 py-2.5 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <div className="flex w-full items-center justify-between gap-2 pr-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className={cn("text-[10px] text-white", color)}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-medium text-foreground truncate">{name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {rating != null && rating > 0 ? (
                            <><Star className="inline h-3 w-3 fill-amber-400 text-amber-400 mr-0.5 -mt-px" />{Number(rating).toFixed(1)} · {jobs} job{jobs !== 1 ? "s" : ""}</>
                          ) : (
                            <span>New provider</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary whitespace-nowrap">
                      KES {Number(quote.price_kes).toLocaleString()}
                    </span>
                  </div>
                </AccordionTrigger>

                {/* ── Expanded content ── */}
                <AccordionContent className="px-3 pb-3 pt-0">
                  {/* Provider message */}
                  {quote.message && (
                    <div className="mb-3 rounded-md border-l-2 border-primary bg-muted/50 p-2.5">
                      <p className="text-xs italic text-muted-foreground">"{quote.message}"</p>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    Quoted: {formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}
                  </p>

                  {/* Actions */}
                  {isPending && requestStatus === "open" && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-11 sm:h-8 text-xs justify-center"
                          disabled={!quote.work_thread_id}
                          onClick={() => {
                            if (quote.work_thread_id) {
                              onMessage(quote.work_thread_id, name);
                            }
                          }}
                        >
                          <MessageCircle className="mr-1 h-3.5 w-3.5" />
                          Message
                        </Button>
                        <Button
                          size="sm"
                          className="h-11 sm:h-8 text-xs justify-center"
                          disabled={startingJobId === requestId}
                          onClick={() => onHire(requestId, quote.id)}
                        >
                          {startingJobId === requestId ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          )}
                          Hire
                        </Button>
                      </div>
                      <button
                        className="text-[11px] text-muted-foreground hover:text-destructive transition-colors self-end sm:self-auto"
                        disabled={decliningQuoteId === quote.id}
                        onClick={() => onDecline(quote.id)}
                      >
                        {decliningQuoteId === quote.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Decline"
                        )}
                      </button>
                    </div>
                  )}
                  {isAccepted && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Job Started
                    </span>
                  )}
                  {isDeclined && (
                    <span className="text-[11px] font-medium text-muted-foreground">Declined</span>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        /* ── CARD VIEW (original layout) ── */
        <div className="space-y-2">
          {processedQuotes.map((quote) => {
            const isDeclined = quote.status === "declined";
            const isAccepted = quote.status === "accepted";
            const isPending = quote.status === "pending";
            const name = quote.profiles?.full_name || "Provider";
            const initials = getInitials(name);

            return (
              <div
                key={quote.id}
                className={cn(
                  "rounded-lg border border-border bg-background p-3 transition-opacity",
                  isDeclined && "opacity-50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-lg font-bold text-primary">
                    KES {Number(quote.price_kes).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPending && requestStatus === "open" && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 text-xs"
                          disabled={!quote.work_thread_id}
                          onClick={() => {
                            if (quote.work_thread_id) onMessage(quote.work_thread_id, name);
                          }}
                        >
                          <MessageCircle className="mr-1 h-3 w-3" />Message
                        </Button>
                        <Button size="sm" className="h-7 text-xs"
                          disabled={startingJobId === requestId}
                          onClick={() => onHire(requestId, quote.id)}
                        >
                          {startingJobId === requestId ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                          Hire
                        </Button>
                      </>
                    )}
                    {isAccepted && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">Job Started</span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">{name}</span>
                </div>
                {quote.message && (
                  <p className="mt-1.5 line-clamp-2 text-xs italic text-muted-foreground">"{quote.message}"</p>
                )}
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Quoted: {formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}
                  </span>
                  {isPending && requestStatus === "open" && (
                    <button
                      className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                      disabled={decliningQuoteId === quote.id}
                      onClick={() => onDecline(quote.id)}
                    >
                      {decliningQuoteId === quote.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Decline"}
                    </button>
                  )}
                  {isDeclined && <span className="text-[11px] font-medium text-muted-foreground">Declined</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
