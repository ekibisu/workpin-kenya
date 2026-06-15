import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface SubmitQuoteFormProps {
  job: {
    id: string;
    client_id: string;
    services: { name: string; category: string } | null;
    description: string;
  };
  businesses: { id: string; business_name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: (requestId: string) => void;
  editingQuote?: {
    id: string;
    price_kes: number;
    message: string | null;
    timeline: string | null;
  } | null;
}

export default function SubmitQuoteForm({
  job, businesses, open, onOpenChange, onSubmitted, editingQuote,
}: SubmitQuoteFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEdit = !!editingQuote;
  const [selectedBizId, setSelectedBizId] = useState(
    businesses.length === 1 ? businesses[0].id : ""
  );
  const [priceKes, setPriceKes] = useState("");
  const [message, setMessage] = useState("");
  const [timeline, setTimeline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill / reset on open
  useEffect(() => {
    if (open) {
      if (editingQuote) {
        setPriceKes(String(editingQuote.price_kes ?? ""));
        setMessage(editingQuote.message ?? "");
        setTimeline(editingQuote.timeline ?? "");
      } else {
        setPriceKes("");
        setMessage("");
        setTimeline("");
        setSelectedBizId(businesses.length === 1 ? businesses[0].id : "");
      }
    }
  }, [open, editingQuote, businesses]);

  const handleSubmit = async () => {
    if (!user || !priceKes) return;
    if (!isEdit && !selectedBizId) return;
    const price = Number(priceKes);
    if (isNaN(price) || price <= 0) {
      toast({ title: "Invalid price", description: "Enter a valid amount in KES.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      if (isEdit && editingQuote) {
        const { error } = await supabase
          .from("quotes")
          .update({
            price_kes: price,
            message: message.trim() || null,
            timeline: timeline.trim() || null,
          })
          .eq("id", editingQuote.id);
        if (error) throw error;
        toast({ title: "Quote updated." });
        onSubmitted(job.id);
      } else {
        // 1. Create inquiry work_thread
        const { data: thread, error: threadErr } = await supabase
          .from("work_threads")
          .insert({
            client_id: job.client_id,
            provider_id: selectedBizId,
            job_request_id: job.id,
            status: "quoted",
          })
          .select("id")
          .single();

        if (threadErr) throw threadErr;

        // 2. Insert quote
        const { error: quoteErr } = await supabase
          .from("quotes")
          .insert({
            request_id: job.id,
            provider_id: selectedBizId,
            price_kes: price,
            message: message.trim() || null,
            timeline: timeline.trim() || null,
            work_thread_id: thread.id,
          });

        if (quoteErr) throw quoteErr;

        toast({ title: "Quote submitted!", description: "The client will be notified." });
        onSubmitted(job.id);
      }
    } catch (err: any) {
      console.error("Quote submission error:", err);
      toast({
        title: "Error",
        description: err?.message?.includes("duplicate")
          ? "You've already quoted on this request."
          : "Could not submit quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const serviceName = job.services?.name || "Service Request";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEdit ? "Edit Quote" : "Submit Quote"}
            <span className="ml-1 font-normal text-muted-foreground">— {serviceName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Business selector — hidden when editing */}
          {!isEdit && businesses.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-sm">Quote as</Label>
              <Select value={selectedBizId} onValueChange={setSelectedBizId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Price */}
          <div className="space-y-1.5">
            <Label className="text-sm">Price (KES) *</Label>
            <Input
              type="number"
              min="1"
              placeholder="e.g. 5000"
              value={priceKes}
              onChange={(e) => setPriceKes(e.target.value)}
            />
          </div>

          {/* Timeline */}
          <div className="space-y-1.5">
            <Label className="text-sm">Timeline estimate</Label>
            <Input
              placeholder="e.g. 2-3 days"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-sm">Message to client</Label>
            <Textarea
              placeholder="Introduce yourself and explain your approach…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="resize-none"
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={submitting || (!isEdit && !selectedBizId) || !priceKes}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Submit Quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
