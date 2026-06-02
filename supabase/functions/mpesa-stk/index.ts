// M-Pesa Daraja STK Push initiator.
// Validates the caller's JWT, normalises the phone number, gets a Daraja OAuth
// token, fires the STK push, then records a pending row keyed by CheckoutRequestID
// so the callback function can reconcile it later.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  purpose: z.enum(["subscription", "payment"]),
  amount_kes: z.number().int().positive(),
  phone: z.string().min(9).max(15),
  reference: z.string().uuid(),
  plan_id: z.string().uuid().optional(),
  period: z.enum(["monthly", "annual"]).optional(),
});

function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^0[17]\d{8}$/.test(digits)) return "254" + digits.slice(1);
  if (/^[17]\d{8}$/.test(digits)) return "254" + digits;
  return null;
}

function darajaBase(env: string): string {
  return env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const body = parsed.data;

    if (body.purpose === "subscription" && (!body.plan_id || !body.period)) {
      return new Response(
        JSON.stringify({ error: "plan_id and period are required for subscriptions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const phone = normalisePhone(body.phone);
    if (!phone) {
      return new Response(JSON.stringify({ error: "Invalid Kenyan phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const mpesaEnv = Deno.env.get("MPESA_ENV") ?? "sandbox";

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      return new Response(JSON.stringify({ error: "M-Pesa credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base = darajaBase(mpesaEnv);

    // 1. OAuth token
    const basic = btoa(`${consumerKey}:${consumerSecret}`);
    const oauthRes = await fetch(
      `${base}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${basic}` } },
    );
    if (!oauthRes.ok) {
      const t = await oauthRes.text();
      return new Response(JSON.stringify({ error: "Daraja auth failed", details: t }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { access_token } = (await oauthRes.json()) as { access_token: string };

    // 2. STK push
    const ts = timestamp();
    const password = btoa(`${shortcode}${passkey}${ts}`);
    const callbackUrl = `${supabaseUrl}/functions/v1/mpesa-callback`;

    const stkRes = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: body.amount_kes,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: body.reference.slice(0, 12),
        TransactionDesc: body.purpose === "subscription" ? "Plan upgrade" : "Job payment",
      }),
    });

    const stkJson = await stkRes.json();
    if (!stkRes.ok || stkJson.ResponseCode !== "0") {
      return new Response(JSON.stringify({ error: "STK push failed", details: stkJson }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutRequestId = stkJson.CheckoutRequestID as string;
    const merchantRequestId = stkJson.MerchantRequestID as string;

    // 3. Record pending row using service role
    const admin = createClient(supabaseUrl, serviceKey);

    if (body.purpose === "payment") {
      const { error: insErr } = await admin.from("payments").insert({
        client_id: userId,
        work_thread_id: body.reference,
        amount_kes: body.amount_kes,
        status: "pending",
        mpesa_checkout_request_id: checkoutRequestId,
      });
      if (insErr) console.error("payments insert failed", insErr);
    } else {
      const { error: insErr } = await admin
        .from("pending_subscription_payments")
        .insert({
          business_id: body.reference,
          plan_id: body.plan_id!,
          period: body.period!,
          amount_kes: body.amount_kes,
          checkout_request_id: checkoutRequestId,
          initiated_by: userId,
        });
      if (insErr) console.error("pending sub insert failed", insErr);
    }

    return new Response(
      JSON.stringify({
        checkout_request_id: checkoutRequestId,
        merchant_request_id: merchantRequestId,
        customer_message: stkJson.CustomerMessage,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("mpesa-stk error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
