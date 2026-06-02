// Daraja STK callback. Public endpoint — Daraja posts here with no auth.
// Looks up the CheckoutRequestID in `payments` first, then `pending_subscription_payments`,
// and finalises the matching record. Always returns ResultCode 0 so Daraja stops retrying.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ACCEPT = JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const fnBase = `${Deno.env.get("SUPABASE_URL")!}/functions/v1`;

  try {
    const payload = await req.json();
    const cb = payload?.Body?.stkCallback;
    if (!cb?.CheckoutRequestID) {
      console.warn("callback missing CheckoutRequestID", payload);
      return new Response(ACCEPT, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutRequestId: string = cb.CheckoutRequestID;
    const resultCode: number = cb.ResultCode;
    const resultDesc: string = cb.ResultDesc ?? "";

    // Pull metadata items into a map
    const items: Array<{ Name: string; Value?: string | number }> =
      cb?.CallbackMetadata?.Item ?? [];
    const meta = Object.fromEntries(items.map((i) => [i.Name, i.Value])) as Record<
      string,
      string | number | undefined
    >;
    const receipt = meta.MpesaReceiptNumber as string | undefined;

    // ── Try payments table first ──
    const { data: payment } = await admin
      .from("payments")
      .select("id, client_id, work_thread_id")
      .eq("mpesa_checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (payment) {
      if (resultCode === 0) {
        await admin
          .from("payments")
          .update({ status: "paid", mpesa_receipt_number: receipt ?? null })
          .eq("id", payment.id);

        // Notify the client
        fetch(`${fnBase}/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({
            user_id: payment.client_id,
            channels: ["in_app", "email"],
            subject: "Payment received",
            message: `We've received your payment${receipt ? ` (ref ${receipt})` : ""}.`,
            template: "payment_success",
            data: { work_thread_id: payment.work_thread_id, receipt },
          }),
        }).catch((e) => console.error("notify failed", e));
      } else {
        await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
        fetch(`${fnBase}/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({
            user_id: payment.client_id,
            channels: ["in_app"],
            subject: "Payment failed",
            message: resultDesc || "Your M-Pesa payment did not complete.",
            template: "payment_failed",
          }),
        }).catch(() => {});
      }
      return new Response(ACCEPT, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Otherwise try pending subscription payments ──
    const { data: pending } = await admin
      .from("pending_subscription_payments")
      .select("id, business_id, plan_id, period, initiated_by")
      .eq("checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (!pending) {
      console.warn("callback for unknown CheckoutRequestID", checkoutRequestId);
      return new Response(ACCEPT, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resultCode === 0) {
      const expires = new Date();
      if (pending.period === "annual") expires.setFullYear(expires.getFullYear() + 1);
      else expires.setMonth(expires.getMonth() + 1);

      await admin.from("business_subscriptions").insert({
        business_id: pending.business_id,
        plan_id: pending.plan_id,
        period: pending.period,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expires.toISOString(),
        mpesa_receipt: receipt ?? null,
      });

      // Update business subscription_status with the plan name
      const { data: plan } = await admin
        .from("subscription_plans")
        .select("name")
        .eq("id", pending.plan_id)
        .maybeSingle();

      if (plan?.name) {
        await admin
          .from("businesses")
          .update({ subscription_status: plan.name.toLowerCase() })
          .eq("id", pending.business_id);
      }

      await admin
        .from("pending_subscription_payments")
        .delete()
        .eq("id", pending.id);

      fetch(`${fnBase}/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
        },
        body: JSON.stringify({
          user_id: pending.initiated_by,
          channels: ["in_app", "email"],
          subject: "Plan upgraded",
          message: `Your ${plan?.name ?? "plan"} subscription is now active.`,
          template: "payment_success",
          data: { business_id: pending.business_id, receipt },
        }),
      }).catch(() => {});
    } else {
      await admin
        .from("pending_subscription_payments")
        .delete()
        .eq("id", pending.id);

      fetch(`${fnBase}/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
        },
        body: JSON.stringify({
          user_id: pending.initiated_by,
          channels: ["in_app"],
          subject: "Subscription payment failed",
          message: resultDesc || "Your M-Pesa payment did not complete.",
          template: "payment_failed",
        }),
      }).catch(() => {});
    }

    return new Response(ACCEPT, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mpesa-callback error", err);
    // Still ACK so Daraja doesn't keep retrying.
    return new Response(ACCEPT, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
