import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MpesaCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  workThreadId: string;
  providerName: string;
  serviceName: string;
  onSuccess: (paymentId: string) => void | Promise<void>;
}

type Stage = "input" | "waiting" | "success" | "failed";

const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 90_000;

export default function MpesaCheckout({
  open, onOpenChange, amount, workThreadId, providerName, serviceName, onSuccess,
}: MpesaCheckoutProps) {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStage("input");
      setCheckoutRequestId(null);
      setErrorMsg(null);
    }
  }, [open]);

  // Poll payments table for status while waiting
  useEffect(() => {
    if (stage !== "waiting" || !checkoutRequestId) return;
    let cancelled = false;
    const start = Date.now();

    const tick = async () => {
      if (cancelled) return;
      const { data } = await supabase
        .from("payments")
        .select("id, status")
        .eq("checkout_request_id", checkoutRequestId)
        .maybeSingle();

      if (cancelled) return;

      if (data?.status === "paid") {
        setStage("success");
        await onSuccess(data.id);
        return;
      }
      if (data?.status === "failed") {
        setStage("failed");
        setErrorMsg("Payment was not completed. Please try again.");
        return;
      }
      if (Date.now() - start > POLL_TIMEOUT_MS) {
        setStage("failed");
        setErrorMsg("Timed out waiting for confirmation. If you completed payment, refresh in a moment.");
        return;
      }
      setTimeout(tick, POLL_MS);
    };

    const t = setTimeout(tick, POLL_MS);
    return () => { cancelled = true; clearTimeout(t); };
  }, [stage, checkoutRequestId, onSuccess]);

  const handlePay = async () => {
    if (!phone.trim()) {
      toast({ title: "Phone required", description: "Enter your M-Pesa number.", variant: "destructive" });
      return;
    }
    if (!workThreadId) {
      toast({ title: "Missing thread", description: "Cannot initiate payment without a job thread.", variant: "destructive" });
      return;
    }
    setStage("waiting");
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("mpesa-stk", {
        body: {
          purpose: "payment",
          amount_kes: Math.round(amount),
          phone: phone.trim(),
          reference: workThreadId,
        },
      });
      if (error) throw error;
      const id = (data as { checkout_request_id?: string })?.checkout_request_id;
      if (!id) throw new Error("No checkout id returned");
      setCheckoutRequestId(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start payment";
      setStage("failed");
      setErrorMsg(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Pay with M-Pesa
          </DialogTitle>
          <DialogDescription>
            {serviceName} · {providerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-2xl font-bold text-primary">KES {Number(amount).toLocaleString()}</p>
          </div>

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

          {stage === "failed" && (
            <p className="text-sm text-destructive text-center">{errorMsg}</p>
          )}
        </div>

        <DialogFooter>
          {stage === "input" && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handlePay}>Pay KES {Number(amount).toLocaleString()}</Button>
            </>
          )}
          {stage === "waiting" && (
            <Button variant="ghost" disabled className="w-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for confirmation…
            </Button>
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
