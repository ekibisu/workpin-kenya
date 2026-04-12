import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Inbox, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface OutgoingQuote {
  id: string;
  price_kes: number;
  message: string | null;
  status: string;
  created_at: string;
  timeline: string | null;
  request_id: string;
  provider_id: string;
  work_thread_id: string | null;
  job_requests: {
    description: string;
    services: { name: string } | null;
  } | null;
}

function parseDescription(raw: string): string {
  try {
    return JSON.parse(raw).task_description || raw;
  } catch {
    return raw;
  }
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-primary/10 text-primary",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  declined: "bg-muted text-muted-foreground",
};

interface ProviderQuotesPanelProps {
  onMessage: (workThreadId: string, recipientName: string) => void;
}

export default function ProviderQuotesPanel({ onMessage }: ProviderQuotesPanelProps) {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<OutgoingQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Get user's business IDs
      const { data: bizData } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .eq("is_active", true);
      const bizIds = (bizData || []).map((b) => b.id);

      if (bizIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: quotesData } = await supabase
        .from("quotes")
        .select("id, price_kes, message, status, created_at, timeline, request_id, provider_id, work_thread_id, job_requests!quotes_request_id_fkey(description, services(name))")
        .in("provider_id", bizIds)
        .order("created_at", { ascending: false });

      setQuotes((quotesData as unknown as OutgoingQuote[]) || []);
      setLoading(false);
    };

    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">No quotes sent yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Browse the Job Feed to find requests and submit quotes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {quotes.map((quote) => {
        const serviceName = quote.job_requests?.services?.name || "Service";
        const desc = quote.job_requests?.description
          ? parseDescription(quote.job_requests.description)
          : "";

        return (
          <div
            key={quote.id}
            className={cn(
              "rounded-xl border border-border bg-card p-4 transition-colors",
              quote.status === "declined" && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{serviceName}</span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    STATUS_STYLES[quote.status] || "bg-muted text-muted-foreground"
                  )}>
                    {quote.status}
                  </span>
                </div>

                {desc && (
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{desc}</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-bold text-primary">
                    KES {Number(quote.price_kes).toLocaleString()}
                  </span>
                  {quote.timeline && <span>Timeline: {quote.timeline}</span>}
                  <span>
                    {formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {quote.work_thread_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => onMessage(quote.work_thread_id!, serviceName)}
                >
                  <MessageCircle className="mr-1 h-3.5 w-3.5" />
                  Message
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
