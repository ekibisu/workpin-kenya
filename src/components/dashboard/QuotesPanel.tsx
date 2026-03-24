import { useState, useMemo } from "react";
import { format } from "date-fns";
import { MessageCircle, CheckCircle, Loader2, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
}

interface QuotesPanelProps {
  quotes: QuoteData[];
  requestStatus: string;
  startingJobId: string | null;
  decliningQuoteId: string | null;
  requestId: string;
  onHire: (requestId: string, quoteId: string) => void;
  onDecline: (quoteId: string) => void;
  onMessage: (workThreadId: string, recipientName: string) => void;
}

type SortOption = "price_asc" | "price_desc" | "newest";
type FilterStatus = "all" | "pending" | "declined" | "accepted";

export default function QuotesPanel({
  quotes,
  requestStatus,
  startingJobId,
  decliningQuoteId,
  requestId,
  onHire,
  onDecline,
  onMessage,
}: QuotesPanelProps) {
  const [sortBy, setSortBy] = useState<SortOption>("price_asc");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: quotes.length, pending: 0, declined: 0, accepted: 0 };
    quotes.forEach((q) => {
      if (counts[q.status] !== undefined) counts[q.status]++;
    });
    return counts;
  }, [quotes]);

  const processedQuotes = useMemo(() => {
    let filtered = filterStatus === "all" ? quotes : quotes.filter((q) => q.status === filterStatus);
    return [...filtered].sort((a, b) => {
      if (sortBy === "price_asc") return a.price_kes - b.price_kes;
      if (sortBy === "price_desc") return b.price_kes - a.price_kes;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [quotes, sortBy, filterStatus]);

  if (quotes.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quotes</h3>
          <Badge className="h-5 min-w-5 justify-center px-1.5 text-[10px]">{quotes.length}</Badge>
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-7 w-auto gap-1 border-none bg-transparent px-2 text-xs text-muted-foreground shadow-none">
            <span className="text-muted-foreground">Sort:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price_asc">Lowest Price</SelectItem>
            <SelectItem value="price_desc">Highest Price</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filter tabs */}
      {quotes.length > 1 && (
        <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-2.5 h-6">
              All ({statusCounts.all})
            </TabsTrigger>
            {statusCounts.pending > 0 && (
              <TabsTrigger value="pending" className="text-xs px-2.5 h-6">
                Pending ({statusCounts.pending})
              </TabsTrigger>
            )}
            {statusCounts.accepted > 0 && (
              <TabsTrigger value="accepted" className="text-xs px-2.5 h-6">
                Accepted ({statusCounts.accepted})
              </TabsTrigger>
            )}
            {statusCounts.declined > 0 && (
              <TabsTrigger value="declined" className="text-xs px-2.5 h-6">
                Declined ({statusCounts.declined})
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      )}

      {/* Quote cards */}
      <div className="space-y-2">
        {processedQuotes.map((quote) => {
          const isDeclined = quote.status === "declined";
          const isAccepted = quote.status === "accepted";
          const isPending = quote.status === "pending";
          const initials = (quote.profiles?.full_name || "P")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={quote.id}
              className={`rounded-lg border border-border bg-background p-3 transition-opacity ${
                isDeclined ? "opacity-50" : ""
              }`}
            >
              {/* Row 1: Price + actions */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-lg font-bold text-primary">
                  KES {Number(quote.price_kes).toLocaleString()}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isPending && requestStatus === "open" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          if (quote.work_thread_id) {
                            onMessage(quote.work_thread_id, quote.profiles?.full_name || "Provider");
                          }
                        }}
                        disabled={!quote.work_thread_id}
                      >
                        <MessageCircle className="mr-1 h-3 w-3" />
                        Message
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={startingJobId === requestId}
                        onClick={() => onHire(requestId, quote.id)}
                      >
                        {startingJobId === requestId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        Hire
                      </Button>
                    </>
                  )}
                  {isAccepted && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Job Started
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Avatar + provider name */}
              <div className="mt-1.5 flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">
                  {quote.profiles?.full_name || "Provider"}
                </span>
              </div>

              {/* Row 3: Message */}
              {quote.message && (
                <p className="mt-1.5 line-clamp-2 text-xs italic text-muted-foreground">
                  "{quote.message}"
                </p>
              )}

              {/* Row 4: Date + status */}
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Quoted: {format(new Date(quote.created_at), "MMM d, yyyy")}
                </span>
                {isPending && requestStatus === "open" && (
                  <button
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                    disabled={decliningQuoteId === quote.id}
                    onClick={() => onDecline(quote.id)}
                  >
                    {decliningQuoteId === quote.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Decline"
                    )}
                  </button>
                )}
                {isDeclined && (
                  <span className="text-[11px] font-medium text-muted-foreground">Declined</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
