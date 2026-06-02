import { serve }       from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Supabase client (service role — writes to DB from Safaricom callbacks) ──

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// STK result codes from workpin_mpesa README
const STK_CODES: Record<number, string> = {
  0:    "success",
  1032: "cancelled",
  1037: "timeout",
  2001: "wrong_pin",
  1019: "duplicate",
};

// ─── Route handlers ───────────────────────────────────────────────────────────

// POST /callbacks/stk  — Safaricom → server after user responds to STK prompt
async function handleStkCallback(body: Record<string, unknown>) {
  const cb = (body as any)?.Body?.stkCallback;
  if (!cb) return { ResultCode: 0, ResultDesc: "Accepted" };

  const checkoutId = cb.CheckoutRequestID as string;
  const code       = cb.ResultCode as number;

  console.log(`[stk-callback] code=${code} (${STK_CODES[code] ?? cb.ResultDesc}) checkout=${checkoutId}`);

  if (code === 0) {
    // Payment succeeded — extract metadata
    const get = (name: string) =>
      (cb.CallbackMetadata?.Item as any[])?.find((i: any) => i.Name === name)?.Value;

    const receipt = get("MpesaReceiptNumber") as string;
    const amount  = get("Amount")            as number;
    const phone   = get("PhoneNumber")       as string;

    console.log(`[stk-callback] ✓ PAID receipt=${receipt} KES=${amount} phone=${phone}`);

    // Update payments row: status="paid", store receipt + phone
    const { error } = await supabase
      .from("payments")
      .update({
        status:               "paid",
        mpesa_receipt_number: receipt,
      })
      .eq("mpesa_checkout_request_id", checkoutId);

    if (error) {
      console.error("[stk-callback] DB update failed:", error.message);
    }

  } else {
    const reason = STK_CODES[code] ?? cb.ResultDesc;
    console.log(`[stk-callback] ✗ FAILED reason=${reason}`);

    // Mark payment as failed so the UI can react via realtime
    await supabase
      .from("payments")
      .update({ status: `failed_${reason}` })
      .eq("mpesa_checkout_request_id", checkoutId);
  }

  // Always respond 200 + success to Safaricom — they retry on non-200
  return { ResultCode: 0, ResultDesc: "Accepted" };
}

// POST /callbacks/c2b/validate  — fires BEFORE money moves (8s timeout)
// Used for C2B Paybill fallback flow
async function handleC2BValidation(body: Record<string, unknown>) {
  const { TransID, TransAmount, BillRefNumber, MSISDN } = body as any;
  console.log(`[c2b-validate] ref=${BillRefNumber} amount=${TransAmount} phone=${MSISDN}`);

  // Validate the BillRefNumber maps to a real open job_request
  const { data: jobRequest } = await supabase
    .from("job_requests")
    .select("id, status")
    .eq("id", BillRefNumber)
    .eq("status", "open")
    .maybeSingle();

  if (!jobRequest) {
    console.log(`[c2b-validate] ✗ REJECTED — no open job_request for ref=${BillRefNumber}`);
    // Rejection codes from workpin_mpesa README:
    // C2B00012 = Invalid account number / booking not found
    return { ResultCode: "C2B00012", ResultDesc: "Unknown booking reference" };
  }

  console.log(`[c2b-validate] ✓ ACCEPTED ref=${BillRefNumber}`);
  return { ResultCode: 0, ResultDesc: "Accepted" };
}

// POST /callbacks/c2b/confirm  — fires AFTER money has moved (source of truth)
async function handleC2BConfirmation(body: Record<string, unknown>) {
  const { TransID, TransTime, TransAmount, BillRefNumber, MSISDN, FirstName, LastName } = body as any;
  console.log(`[c2b-confirm] ✓ CONFIRMED receipt=${TransID} KES=${TransAmount} ref=${BillRefNumber}`);

  // Find the pending payment row for this job request (if client paid via C2B)
  const { data: payment } = await supabase
    .from("payments")
    .select("id")
    .eq("work_thread_id", BillRefNumber)  // BillRefNumber = work_thread_id for C2B
    .eq("status", "pending")
    .maybeSingle();

  if (payment) {
    await supabase
      .from("payments")
      .update({
        status:               "paid",
        mpesa_receipt_number: TransID,
      })
      .eq("id", payment.id);
  } else {
    // No pre-created payment row — insert one (C2B walk-in flow)
    await supabase.from("payments").insert({
      client_id:            MSISDN,   // phone as identifier for C2B
      work_thread_id:       BillRefNumber,
      amount_kes:           Number(TransAmount),
      status:               "paid",
      mpesa_receipt_number: TransID,
      mpesa_checkout_request_id: null,
    });
  }

  return { ResultCode: 0, ResultDesc: "Accepted" };
}

// ─── Router ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  // OPTIONS pre-flight (Supabase edge functions need this)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url  = new URL(req.url);
  const path = url.pathname.replace(/^\/mpesa-callback/, "");  // strip function name prefix
  const body = await req.json().catch(() => ({}));

  console.log(`[mpesa-callback] ${req.method} ${path}`);

  try {
    let result: Record<string, unknown>;

    if (path.includes("/stk")) {
      result = await handleStkCallback(body);
    } else if (path.includes("/c2b/validate") || path.includes("/validate")) {
      result = await handleC2BValidation(body);
    } else if (path.includes("/c2b/confirm") || path.includes("/confirm")) {
      result = await handleC2BConfirmation(body);
    } else {
      // Safaricom sometimes hits the root — try to detect from body shape
      if ((body as any)?.Body?.stkCallback !== undefined) {
        result = await handleStkCallback(body);
      } else if ((body as any)?.BillRefNumber !== undefined && (body as any)?.TransAmount !== undefined) {
        // Has BillRefNumber → confirmation (money already moved)
        result = await handleC2BConfirmation(body);
      } else {
        result = { ResultCode: 0, ResultDesc: "Accepted" };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[mpesa-callback] error:", message);
    // Always return 200 to Safaricom — they interpret anything else as a retry trigger
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
