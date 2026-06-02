import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for imperative M-Pesa STK push calls.
 * Use MpesaCheckout component for the full UI flow.
 * Use this hook when you need to trigger a payment programmatically
 * (e.g. from an admin action or a retry flow).
 */
export function useMpesaPayment() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function initiateStkPush(params: {
    phone:         string;   // full format e.g. "254712345678"
    amount:        number;   // KES, already includes platform fee
    workThreadId:  string;
    clientId:      string;
    description?:  string;
  }) {
    setLoading(true);
    setError(null);

    try {
      // Create payment row
      const { data: payment, error: insertErr } = await supabase
        .from("payments")
        .insert({
          client_id:      params.clientId,
          work_thread_id: params.workThreadId,
          amount_kes:     params.amount,
          status:         "pending",
        })
        .select("id")
        .single();

      if (insertErr || !payment) {
        throw new Error(insertErr?.message ?? "Could not create payment record");
      }

      // Fire STK push
      const { data, error: fnErr } = await supabase.functions.invoke("mpesa-stk", {
        body: {
          action: "stk_push",
          phone:  params.phone,
          amount: params.amount,
          ref:    params.workThreadId.slice(0, 12),
          desc:   (params.description ?? "WorkPin Service").slice(0, 20),
        },
      });

      if (fnErr) throw new Error(fnErr.message);
      if (!data?.success) throw new Error(data?.error ?? "STK push failed");

      // Store checkout request ID
      await supabase
        .from("payments")
        .update({ mpesa_checkout_request_id: data.CheckoutRequestID })
        .eq("id", payment.id);

      return {
        paymentId:         payment.id,
        checkoutRequestId: data.CheckoutRequestID as string,
      };

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function queryStkStatus(checkoutRequestId: string) {
    const { data, error: fnErr } = await supabase.functions.invoke("mpesa-stk", {
      body: { action: "query_status", checkoutRequestId },
    });
    if (fnErr) throw new Error(fnErr.message);
    return data;
  }

  return { initiateStkPush, queryStkStatus, loading, error };
}
