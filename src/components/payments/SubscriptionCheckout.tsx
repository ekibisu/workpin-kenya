import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Smartphone, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: { id: string; name: string; price_monthly_kes: number; price_annual_kes: number } | null;
  period: "monthly" | "annual";
  businessId: string | null;
  onSuccess: () => void;
}

type Stage = "summary" | "input" | "waiting" | "success" | "failed";

const WAIT_TIMEOUT_MS = 60_000;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.startsWith("7") || digits.startsWith("1")) return "254" + digits;
  return digits;
}

export default function SubscriptionCheckout({
  open, onOpenChange, plan, period, businessId, onSuccess,
}: SubscriptionCheckoutProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("summary");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const amount = plan ? (period === "annual" ? plan.price_annual_kes : plan.price_monthly_kes) : 0;

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setStage("summary");
      setErrorMsg(null);
      setSubmitting(false);
    }
  }, [open]);

  // Prefill phone from profile
  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("profiles")
      .select("mpesa_phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.mpesa_phone) setPhone(data.mpesa_phone);
      });
  }, [open, user]);

  // Wait for subscription to become active via realtime + polling fallback
  useEffect(() => {
    if (stage !== "waiting" || !plan || !businessId) return;
    let cancelled = false;
    const start = Date.now();

    const checkOnce = async () => {
      const { data } = await supabase
        .from("business_subscriptions")
        .select("id, status")
        .eq("business_id", businessId)
        .eq("plan_id", plan.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return false;
      if (data?.status === "active") {
        setStage("success");
        return true;
      }
      return false;
    };

    const poll = async () => {
      if (cancelled) return;
      const found = await checkOnce();
      if (found) return;
      if (Date.now() - start > WAIT_TIMEOUT_MS) {
        if (!cancelled) {
          setStage("failed");
          setErrorMsg("Timed out waiting for confirmation. If you completed payment, refresh in a moment.");
        }
        return;
      }
      setTimeout(poll, 3000);
    };

    const channel = supabase
      .channel(`sub-${businessId}-${plan.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_subscriptions",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { plan_id?: string; status?: string };
          if (row?.plan_id === plan.id && row?.status === "active") {
            if (!cancelled) setStage("success");
          }
        }
      )
      .subscribe();

    // Kick off immediate check + polling fallback
    checkOnce().then((found) => { if (!found) setTimeout(poll, 3000); });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [stage, plan, businessId]);

  // Fire onSuccess once we hit success stage
  useEffect(() => {
    if (stage === "success") {
      const t = setTimeout(() => onSuccess(), 1200);
      return () => clearTimeout(t);
    }
  }, [stage, onSuccess]);

  const handlePay = async () => {
    if (!plan || !businessId) return;
    if (!phone.trim()) {
      toast({ title: "Phone required", description: "Enter your M-Pesa number.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const reference = crypto.randomUUID();
      const { error } = await supabase.functions.invoke("mpesa-stk", {
        body: {
          purpose: "subscription",
          amount_kes: Math.round(amount),
          phone: normalizePhone(phone),
          reference,
          plan_id: plan.id,
          period,
          business_id: businessId,
        },
      });
      if (error) throw error;
      setStage("waiting");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start payment";
      setStage("failed");
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Upgrade to {plan.name}
          </DialogTitle>
          <DialogDescription>
            {period === "annual" ? "Annual plan" : "Monthly plan"} · Pay with M-Pesa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-2xl font-bold text-primary">
              KES {Number(amount).toLocaleString()}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                /{period === "annual" ? "year" : "month"}
              </span>
            </p>
          </div>

          {stage === "summary" && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium">{plan.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Billing</span><span className="font-medium capitalize">{period}</span></div>
              <p className="pt-2 text-xs text-muted-foreground">
                You'll receive an STK push on your phone to authorise the payment.
              </p>
            </div>
          )}

          {stage === "input" && (
            <div className="space-y-2">
              <Label htmlFor="mpesa-phone">M-Pesa phone number</Label>
              <Input
                id="mpesa-phone"
                type="tel"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
              <p className="text-[11px] text-muted-foreground">
                You'll receive an STK push on this number to authorise the payment.
              </p>
            </div>
          )}

          {stage === "waiting" && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-medium">Check your phone</p>
              <p className="text-xs text-muted-foreground">
                Enter your M-Pesa PIN to complete the payment.
              </p>
            </div>
          )}

          {stage === "success" && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <p className="text-sm font-medium">Plan upgraded!</p>
              <p className="text-xs text-muted-foreground">Your {plan.name} plan is now active.</p>
            </div>
          )}

          {stage === "failed" && (
            <p className="text-sm text-destructive text-center">{errorMsg}</p>
          )}
        </div>

        <DialogFooter>
          {stage === "summary" && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setStage("input")}>Continue</Button>
            </>
          )}
          {stage === "input" && (
            <>
              <Button variant="ghost" onClick={() => setStage("summary")} disabled={submitting}>Back</Button>
              <Button onClick={handlePay} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pay KES {Number(amount).toLocaleString()}
              </Button>
            </>
          )}
          {stage === "waiting" && (
            <Button variant="ghost" disabled className="w-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for confirmation…
            </Button>
          )}
          {stage === "success" && (
            <Button onClick={() => onOpenChange(false)} className="w-full">Done</Button>
          )}
          {stage === "failed" && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={() => setStage("input")}>Try again</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
