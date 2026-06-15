import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  MapPin, Clock, ImageIcon, MessageSquareQuote, Search, Loader2, Inbox, Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import SubmitQuoteForm from "./SubmitQuoteForm";
import { useSubscriptionLimits, isUnlimited } from "@/hooks/useSubscriptionLimits";
import { Link } from "react-router-dom";

interface OpenJob {
  id: string;
  description: string;
  location_name: string | null;
  created_at: string;
  budget_min_kes: number | null;
  budget_max_kes: number | null;
  image_urls: string[] | null;
  timeline: string | null;
  client_id: string;
  services: { name: string; category: string } | null;
}

interface Business {
  id: string;
  business_name: string;
  categories: string[] | null;
  service_country_codes: string[] | null;
}

function parseDescription(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return parsed.task_description || raw;
  } catch {
    return raw;
  }
}

interface ExistingQuote {
  id: string;
  price_kes: number;
  message: string | null;
  timeline: string | null;
  status: string;
}

export default function ProviderJobFeed() {
  const { user } = useAuth();
  const { limits, planName } = useSubscriptionLimits(user?.id);
  const [jobs, setJobs] = useState<OpenJob[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [quotedQuotes, setQuotedQuotes] = useState<Map<string, ExistingQuote>>(new Map());
  const [quotesThisMonth, setQuotesThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [quoteJob, setQuoteJob] = useState<OpenJob | null>(null);
  const [editQuote, setEditQuote] = useState<{ job: OpenJob; quote: ExistingQuote } | null>(null);

  // Load businesses + open jobs + already-quoted IDs
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // 1. Get user's businesses
      const { data: bizData } = await supabase
        .from("businesses")
        .select("id, business_name, categories, service_country_codes")
        .eq("owner_id", user.id)
        .eq("is_active", true);
      const biz = (bizData as Business[]) || [];
      setBusinesses(biz);

      if (biz.length === 0) {
        setLoading(false);
        return;
      }

      // Union of all countries this owner serves
      const countrySet = new Set<string>();
      biz.forEach((b) => (b.service_country_codes || []).forEach((c) => countrySet.add(c)));
      const countries = Array.from(countrySet);

      // 2. Get open job requests (exclude user's own), filtered to served countries
      let jobQuery = supabase
        .from("job_requests")
        .select("id, description, location_name, created_at, budget_min_kes, budget_max_kes, image_urls, timeline, client_id, services(name, category)")
        .eq("status", "open")
        .neq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (countries.length > 0) jobQuery = jobQuery.in("country_code", countries);
      const { data: jobData } = await jobQuery;
      setJobs((jobData as unknown as OpenJob[]) || []);

      // 3. Get IDs already quoted by any of user's businesses
      const bizIds = biz.map((b) => b.id);
      const { data: quotedData } = await supabase
        .from("quotes")
        .select("id, request_id, price_kes, message, timeline, status, created_at")
        .in("provider_id", bizIds);
      const map = new Map<string, ExistingQuote>(
        (quotedData ?? []).map((q: any) => [
          q.request_id,
          {
            id: q.id,
            price_kes: q.price_kes,
            message: q.message,
            timeline: q.timeline,
            status: q.status,
          },
        ])
      );
      setQuotedQuotes(map);

      // Count quotes this calendar month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      setQuotesThisMonth(
        (quotedData || []).filter((q: any) => new Date(q.created_at) >= monthStart).length
      );

      setLoading(false);
    };

    load();
  }, [user]);

  // Unique categories across all jobs
  const categories = useMemo(() => {
    const cats = new Set<string>();
    jobs.forEach((j) => { if (j.services?.category) cats.add(j.services.category); });
    return Array.from(cats).sort();
  }, [jobs]);

  const filtered = useMemo(() => {
    let result = jobs;
    if (categoryFilter !== "all") {
      result = result.filter((j) => j.services?.category === categoryFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (j) =>
          (j.services?.name || "").toLowerCase().includes(term) ||
          parseDescription(j.description).toLowerCase().includes(term) ||
          (j.location_name || "").toLowerCase().includes(term)
      );
    }
    return result;
  }, [jobs, categoryFilter, searchTerm]);

  const handleQuoteSubmitted = async (requestId: string) => {
    const bizIds = businesses.map((b) => b.id);
    const wasEdit = !!editQuote;
    if (bizIds.length > 0) {
      const { data: q } = await supabase
        .from("quotes")
        .select("id, price_kes, message, timeline, status")
        .eq("request_id", requestId)
        .in("provider_id", bizIds)
        .maybeSingle();
      if (q) {
        setQuotedQuotes((prev) => {
          const next = new Map(prev);
          next.set(requestId, {
            id: q.id,
            price_kes: q.price_kes,
            message: q.message,
            timeline: q.timeline,
            status: q.status,
          });
          return next;
        });
      }
    }
    if (!wasEdit) setQuotesThisMonth((n) => n + 1);
    setQuoteJob(null);
    setEditQuote(null);
  };

  const monthlyLimit = limits.max_quotes_per_month;
  const limitReached = !isUnlimited(monthlyLimit) && quotesThisMonth >= monthlyLimit;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">Create a business first</p>
        <p className="mt-1 text-xs text-muted-foreground">
          You need at least one active business to browse and quote on job requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {limitReached && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Monthly quote limit reached ({quotesThisMonth}/{monthlyLimit})
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              You're on the <strong>{planName}</strong> plan. Upgrade to send more quotes this month.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/pricing">Upgrade</Link>
          </Button>
        </div>
      )}
      {!limitReached && !isUnlimited(monthlyLimit) && quotesThisMonth >= Math.max(1, monthlyLimit - 2) && (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {quotesThisMonth} of {monthlyLimit} quotes used this month on the {planName} plan.{" "}
          <Link to="/pricing" className="text-primary hover:underline">Upgrade</Link>
        </div>
      )}
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-auto min-w-[160px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Jobs list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No open requests match your search right now</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const existingQuote = quotedQuotes.get(job.id);
            const imgCount = (job.image_urls || []).filter(Boolean).length;

            return (
              <div
                key={job.id}
                className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">
                        {job.services?.name || "Service"}
                      </span>
                      {job.services?.category && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {job.services.category}
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {parseDescription(job.description)}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {job.location_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{job.location_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </span>
                      {imgCount > 0 && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />{imgCount} photo{imgCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {job.budget_max_kes && (
                        <span className="font-medium text-foreground">
                          Budget: KES {Number(job.budget_max_kes).toLocaleString()}
                        </span>
                      )}
                      {job.timeline && (
                        <span>Timeline: {job.timeline}</span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {existingQuote ? (
                      existingQuote.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditQuote({ job, quote: existingQuote })}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit quote
                        </Button>
                      ) : (
                        <Badge
                          variant={existingQuote.status === "accepted" ? "default" : "secondary"}
                          className="text-xs whitespace-nowrap"
                        >
                          {existingQuote.status === "accepted"
                            ? "Accepted"
                            : existingQuote.status === "declined"
                            ? "Declined"
                            : "Quoted"}
                        </Badge>
                      )
                    ) : (
                      <Button
                        size="sm"
                        disabled={limitReached}
                        title={limitReached ? "Monthly quote limit reached — upgrade to send more" : undefined}
                        onClick={() => setQuoteJob(job)}
                      >
                        <MessageSquareQuote className="mr-1 h-3.5 w-3.5" />
                        Quote
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quote submission dialog */}
      {quoteJob && (
        <SubmitQuoteForm
          job={quoteJob}
          businesses={businesses}
          open={!!quoteJob}
          onOpenChange={(open) => { if (!open) setQuoteJob(null); }}
          onSubmitted={handleQuoteSubmitted}
        />
      )}
    </div>
  );
}
