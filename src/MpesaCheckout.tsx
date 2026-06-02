import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "summary" | "phone" | "waiting" | "success" | "cancelled" | "wrong_pin" | "timeout" | "insufficient" | "error";

interface ReceiptData {
  receipt:  string;
  amount:   string;
  phone:    string;
  ref:      string;
  date:     string;
}

export interface MpesaCheckoutProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  /** Amount in KES the provider quoted — platform fee added on top */
  amount:        number;
  /** The accepted quote's work_thread_id */
  workThreadId:  string;
  /** Shown in the order summary */
  providerName:  string;
  serviceName:   string;
  /** Called after payment confirmed in DB */
  onSuccess:     (paymentId: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_FEE_PERCENT = 0.05;

const STK_FAILURE_STEPS: Record<string, Step> = {
  failed_cancelled:  "cancelled",
  failed_timeout:    "timeout",
  failed_wrong_pin:  "wrong_pin",
  failed_duplicate:  "cancelled",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {[1, 2, 3].map((n, i) => (
        <div key={n} className="flex items-center flex-1 last:flex-none">
          <div className={cn(
            "h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-semibold transition-colors",
            n < current  ? "bg-primary border-primary text-primary-foreground"  :
            n === current ? "border-primary text-primary bg-background"           :
                            "border-muted-foreground/30 text-muted-foreground/30 bg-background"
          )}>
            {n < current ? "✓" : n}
          </div>
          {i < 2 && (
            <div className={cn("flex-1 h-px mx-2 transition-colors", n < current ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}

function OrderSummary({ amount, providerName, serviceName }: { amount: number; providerName: string; serviceName: string }) {
  const fee   = Math.round(amount * PLATFORM_FEE_PERCENT);
  const total = amount + fee;

  return (
    <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Service</span>
        <span className="font-medium">{serviceName}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Provider</span>
        <span className="font-medium">{providerName}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Quote amount</span>
        <span>KES {amount.toLocaleString("en-KE")}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Platform fee (5%)</span>
        <span>KES {fee.toLocaleString("en-KE")}</span>
      </div>
      <div className="border-t border-border pt-2 flex justify-between font-bold">
        <span>Total</span>
        <span className="text-primary">KES {total.toLocaleString("en-KE")}</span>
      </div>
    </div>
  );
}

function ProgressItem({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors",
        done   ? "bg-primary text-primary-foreground" :
        active ? "bg-primary/20 text-primary border border-primary animate-pulse" :
                 "bg-muted text-muted-foreground"
      )}>
        {done ? "✓" : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
      </div>
      <span className={cn("text-sm", done || active ? "text-foreground font-medium" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MpesaCheckout({
  open, onOpenChange, amount, workThreadId, providerName, serviceName, onSuccess,
}: MpesaCheckoutProps) {
  const { user }  = useAuth();
  const { toast } = useToast();

  const [step,       setStep]       = useState<Step>("summary");
  const [phone,      setPhone]      = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [sending,    setSending]    = useState(false);
  const [paymentId,  setPaymentId]  = useState<string | null>(null);
  const [receipt,    setReceipt]    = useState<ReceiptData | null>(null);

  // Progress animation state for the "waiting" screen
  const [progStep, setProgStep] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fee   = Math.round(amount * PLATFORM_FEE_PERCENT);
  const total = amount + fee;

  // Pre-fill phone from profile
  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.phone) {
          // Strip leading +254 or 0 to get 9-digit local format
          const normalized = data.phone.replace(/^\+?254/, "").replace(/^0/, "");
          setPhone(normalized);
        }
      });
  }, [open, user]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("summary");
      setPhoneError("");
      setSending(false);
      setPaymentId(null);
      setReceipt(null);
      setProgStep(0);
      clearTimeout(timeoutRef.current ?? undefined);
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    }
  }, [open]);

  // Advance progress animation while waiting
  useEffect(() => {
    if (step !== "waiting") return;
    if (progStep >= 2) return;
    const t = setTimeout(() => setProgStep((p) => p + 1), 1800 + progStep * 600);
    return () => clearTimeout(t);
  }, [step, progStep]);

  // ── Subscribe to payment realtime updates ──────────────────────────────────
  function subscribeToPayment(pid: string) {
    const channel = supabase
      .channel(`payment-${pid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments", filter: `id=eq.${pid}` },
        (payload) => {
          const updated = payload.new as any;
          const status: string = updated.status;

          if (status === "paid" || status === "released") {
            setProgStep(3);
            clearTimeout(timeoutRef.current ?? undefined);
            setReceipt({
              receipt: updated.mpesa_receipt_number ?? "—",
              amount:  `KES ${total.toLocaleString("en-KE")}`,
              phone:   `+254${phone}`,
              ref:     workThreadId.slice(0, 12),
              date:    new Date().toLocaleString("en-KE"),
            });
            setTimeout(() => setStep("success"), 800);

          } else if (status.startsWith("failed_")) {
            clearTimeout(timeoutRef.current ?? undefined);
            setStep(STK_FAILURE_STEPS[status] ?? "error");
          }
        }
      )
      .subscribe();

    realtimeRef.current = channel;

    // Show timeout warning after 60 seconds
    timeoutRef.current = setTimeout(() => {
      if (step === "waiting") setStep("timeout");
    }, 60_000);
  }

  // ── Fire STK push ─────────────────────────────────────────────────────────
  async function handleSendSTK() {
    if (!user) return;

    const raw = phone.trim();
    if (!/^[71]\d{8}$/.test(raw)) {
      setPhoneError("Enter 9 digits starting with 7 or 1 — e.g. 712 345 678");
      return;
    }
    setPhoneError("");
    setSending(true);

    const fullPhone = `254${raw}`;

    try {
      // 1. Create payment row in "pending" state
      const { data: paymentRow, error: insertErr } = await supabase
        .from("payments")
        .insert({
          client_id:      user.id,
          work_thread_id: workThreadId,
          amount_kes:     total,
          status:         "pending",
        })
        .select("id")
        .single();

      if (insertErr || !paymentRow) throw new Error(insertErr?.message ?? "Failed to create payment record");

      const pid = paymentRow.id;
      setPaymentId(pid);

      // 2. Fire STK push via Edge Function
      const { data: stkData, error: stkErr } = await supabase.functions.invoke("mpesa-stk", {
        body: {
          action: "stk_push",
          phone:  fullPhone,
          amount: total,
          ref:    workThreadId.slice(0, 12),
          desc:   `WorkPin ${serviceName.slice(0, 13)}`,
        },
      });

      if (stkErr) throw new Error(stkErr.message);

      const result = stkData as any;

      if (!result?.success) {
        throw new Error(result?.error ?? "STK push failed");
      }

      // 3. Store CheckoutRequestID on the payment row
      await supabase
        .from("payments")
        .update({ mpesa_checkout_request_id: result.CheckoutRequestID })
        .eq("id", pid);

      // 4. Advance to waiting screen + subscribe for callback
      setProgStep(1);
      setStep("waiting");
      subscribeToPayment(pid);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Payment error", description: message, variant: "destructive" });
      // Clean up payment row if STK failed
      if (paymentId) {
        await supabase.from("payments").update({ status: "failed_error" }).eq("id", paymentId);
      }
    } finally {
      setSending(false);
    }
  }

  // ── Cancel from waiting screen ─────────────────────────────────────────────
  async function handleCancel() {
    clearTimeout(timeoutRef.current ?? undefined);
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }
    if (paymentId) {
      await supabase.from("payments").update({ status: "failed_cancelled" }).eq("id", paymentId);
    }
    setStep("cancelled");
  }

  // ── Complete — notify parent ───────────────────────────────────────────────
  function handleDone() {
    if (paymentId) onSuccess(paymentId);
    onOpenChange(false);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && step !== "waiting") onOpenChange(false); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">

        {/* Header */}
        <div className="bg-primary px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-sm">
            WP
          </div>
          <div>
            <p className="text-white font-semibold text-sm">WorkPin Pay</p>
            <p className="text-white/70 text-xs">Secured by M-Pesa</p>
          </div>
        </div>

        <div className="p-6">

          {/* ── STEP 1: Summary ─────────────────────────────────────────── */}
          {step === "summary" && (
            <div>
              <StepDots current={1} />
              <h3 className="font-bold text-lg mb-1">Review your booking</h3>
              <p className="text-muted-foreground text-sm mb-5">Confirm the details before paying.</p>
              <OrderSummary amount={amount} providerName={providerName} serviceName={serviceName} />
              <Button className="w-full mt-5" onClick={() => setStep("phone")}>
                Continue to payment
              </Button>
            </div>
          )}

          {/* ── STEP 2: Phone entry ──────────────────────────────────────── */}
          {step === "phone" && (
            <div>
              <StepDots current={2} />
              <h3 className="font-bold text-lg mb-1">Enter your number</h3>
              <p className="text-muted-foreground text-sm mb-5">
                We'll send a payment prompt to your M-Pesa phone.
              </p>

              <div className="rounded-xl bg-muted/50 p-3 mb-5 flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Amount due</span>
                <span className="font-bold text-primary">KES {total.toLocaleString("en-KE")}</span>
              </div>

              <div className="space-y-1.5 mb-5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  M-Pesa phone number
                </label>
                <div className="flex">
                  <span className="flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted text-sm text-muted-foreground">
                    +254
                  </span>
                  <Input
                    type="tel"
                    placeholder="712 345 678"
                    maxLength={9}
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setPhoneError(""); }}
                    className={cn("rounded-l-none", phoneError && "border-destructive")}
                  />
                </div>
                {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
              </div>

              <Button className="w-full" disabled={sending} onClick={handleSendSTK}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {sending ? "Sending…" : `Pay KES ${total.toLocaleString("en-KE")}`}
              </Button>
              <Button variant="ghost" className="w-full mt-2" onClick={() => setStep("summary")}>
                ← Back
              </Button>
            </div>
          )}

          {/* ── STEP 3: Waiting ──────────────────────────────────────────── */}
          {step === "waiting" && (
            <div>
              <StepDots current={3} />
              <h3 className="font-bold text-lg mb-1">Check your phone</h3>
              <p className="text-muted-foreground text-sm mb-5">
                A prompt was sent to <strong>+254{phone}</strong>. Enter your M-Pesa PIN to confirm.
              </p>

              {/* Phone graphic */}
              <div className="flex justify-center mb-5">
                <div className="w-24 h-36 bg-gray-900 rounded-2xl border-2 border-gray-700 flex flex-col items-center justify-center gap-1 p-2">
                  <div className="text-green-400 font-bold text-xs">M-PESA</div>
                  <div className="text-green-300 font-bold text-sm">KES {total.toLocaleString("en-KE")}</div>
                  <div className="text-gray-400 text-[9px] text-center leading-tight">
                    Pay to WorkPin<br />Enter PIN
                  </div>
                  <div className="flex gap-1 mt-1">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={cn(
                        "w-2 h-2 rounded-full border border-gray-500 transition-colors",
                        progStep > i + 1 ? "bg-green-400 border-green-400" : "bg-transparent"
                      )} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress steps */}
              <div className="space-y-3 mb-5">
                <ProgressItem done={progStep >= 1} active={progStep === 0} label="STK push sent to your phone" />
                <ProgressItem done={progStep >= 2} active={progStep === 1} label="Waiting for PIN entry" />
                <ProgressItem done={progStep >= 3} active={progStep === 2} label="Confirming with Safaricom" />
                <ProgressItem done={progStep >= 4} active={progStep === 3} label="Payment complete" />
              </div>

              <Button variant="outline" className="w-full text-muted-foreground" onClick={handleCancel}>
                Cancel payment
              </Button>
            </div>
          )}

          {/* ── SUCCESS ──────────────────────────────────────────────────── */}
          {step === "success" && receipt && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-bold text-xl mb-1">Payment successful!</h3>
              <p className="text-muted-foreground text-sm mb-5">
                {providerName} has been notified and will be in touch shortly.
              </p>

              <div className="rounded-xl border border-border p-4 text-sm text-left space-y-2 mb-5">
                <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  M-Pesa receipt
                </p>
                {[
                  ["Receipt no.", receipt.receipt],
                  ["Amount paid", receipt.amount],
                  ["Phone",       receipt.phone],
                  ["Booking ref", receipt.ref],
                  ["Date & time", receipt.date],
                  ["Status",      "Confirmed ✓"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className={cn("font-medium", k === "Status" && "text-green-600")}>{v}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full" onClick={handleDone}>
                Back to dashboard
              </Button>
            </div>
          )}

          {/* ── FAILURE STATES ───────────────────────────────────────────── */}
          {(step === "cancelled" || step === "wrong_pin" || step === "timeout" || step === "insufficient" || step === "error") && (
            <div className="text-center">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                step === "timeout" ? "bg-amber-100" : "bg-red-100"
              )}>
                {step === "timeout"
                  ? <Clock className="h-8 w-8 text-amber-600" />
                  : <XCircle className="h-8 w-8 text-red-600" />
                }
              </div>

              <h3 className="font-bold text-xl mb-2">
                {step === "cancelled"    && "Payment cancelled"}
                {step === "wrong_pin"    && "Incorrect PIN"}
                {step === "timeout"      && "Request timed out"}
                {step === "insufficient" && "Insufficient funds"}
                {step === "error"        && "Something went wrong"}
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                {step === "cancelled"    && "You cancelled the M-Pesa prompt. No money was deducted."}
                {step === "wrong_pin"    && "The PIN entered was incorrect. No money was deducted."}
                {step === "timeout"      && "You didn't respond in time. No money was deducted."}
                {step === "insufficient" && "Your M-Pesa balance is too low. Please top up and try again."}
                {step === "error"        && "An error occurred processing your payment. Please try again."}
              </p>

              <Button className="w-full mb-2" onClick={() => { setStep("phone"); setProgStep(0); }}>
                Try again
              </Button>
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
