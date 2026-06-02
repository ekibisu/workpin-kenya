import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─── Config ──────────────────────────────────────────────────────────────────

const CONSUMER_KEY    = Deno.env.get("MPESA_CONSUMER_KEY")    ?? "";
const CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET") ?? "";
const SHORTCODE       = Deno.env.get("MPESA_SHORTCODE")       ?? "174379";
const PASSKEY         = Deno.env.get("MPESA_PASSKEY")         ?? "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
const CALLBACK_URL    = Deno.env.get("MPESA_CALLBACK_URL")    ?? "";
const ENV             = Deno.env.get("MPESA_ENV")             ?? "sandbox";

const BASE_URL = ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Token cache ─────────────────────────────────────────────────────────────

let _token  = "";
let _expiry = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _expiry) return _token;

  const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
  const res  = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await res.json();

  if (!res.ok || data.errorCode) {
    throw new Error(`Token error: ${data.errorMessage ?? JSON.stringify(data)}`);
  }

  _token  = data.access_token;
  _expiry = Date.now() + (data.expires_in - 60) * 1000;
  return _token;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timestamp(): string {
  return new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
}

function stkPassword(ts: string): string {
  return btoa(`${SHORTCODE}${PASSKEY}${ts}`);
}

async function mpesaPost(path: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${data.errorMessage ?? JSON.stringify(data)}`);
  return data;
}

// ─── STK Push ────────────────────────────────────────────────────────────────

async function stkPush(phone: string, amount: number, ref = "WP-PAY", desc = "WorkPin Service") {
  const token = await getToken();
  const ts    = timestamp();

  const data = await mpesaPost("/mpesa/stkpush/v1/processrequest", token, {
    BusinessShortCode: SHORTCODE,
    Password:          stkPassword(ts),
    Timestamp:         ts,
    TransactionType:   "CustomerPayBillOnline",
    Amount:            Math.round(amount),
    PartyA:            phone,
    PartyB:            SHORTCODE,
    PhoneNumber:       phone,
    // Safaricom rejects callback URLs containing "mpesa" — use /callbacks/ path
    CallBackURL:       CALLBACK_URL,
    AccountReference:  ref.slice(0, 12),
    TransactionDesc:   desc.slice(0, 20),
  });

  if (data.ResponseCode !== "0") {
    throw new Error(`STK push failed: ${data.errorMessage ?? data.ResponseDescription}`);
  }

  return {
    success:           true,
    MerchantRequestID: data.MerchantRequestID,
    CheckoutRequestID: data.CheckoutRequestID,
    ResponseCode:      data.ResponseCode,
    ResponseDescription: data.ResponseDescription,
  };
}

// ─── STK Status Query ────────────────────────────────────────────────────────

async function queryStkStatus(checkoutRequestId: string) {
  const token = await getToken();
  const ts    = timestamp();

  const data = await mpesaPost("/mpesa/stkpushquery/v1/query", token, {
    BusinessShortCode: SHORTCODE,
    Password:          stkPassword(ts),
    Timestamp:         ts,
    CheckoutRequestID: checkoutRequestId,
  });

  return { success: true, ...data };
}

// ─── C2B URL Registration ─────────────────────────────────────────────────────

async function registerC2BUrls(c2bShortcode: string, validationUrl: string, confirmationUrl: string) {
  const token = await getToken();

  const data = await mpesaPost("/mpesa/c2b/v1/registerurl", token, {
    ShortCode:       c2bShortcode,
    ResponseType:    "Completed",
    ConfirmationURL: confirmationUrl,
    ValidationURL:   validationUrl,
  });

  const ok = data.ResponseCode === "0" || data.ResponseDescription?.toLowerCase().includes("success");
  return { success: ok, ...data };
}

// ─── Request handler ─────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { action, phone, amount, ref, desc, checkoutRequestId, c2bShortcode, validationUrl, confirmationUrl } = await req.json();

    let result;

    switch (action) {
      case "stk_push":
        if (!phone || !amount) throw new Error("phone and amount are required");
        result = await stkPush(phone, amount, ref, desc);
        break;

      case "query_status":
        if (!checkoutRequestId) throw new Error("checkoutRequestId is required");
        result = await queryStkStatus(checkoutRequestId);
        break;

      case "register_c2b":
        if (!c2bShortcode || !validationUrl || !confirmationUrl) {
          throw new Error("c2bShortcode, validationUrl, confirmationUrl are required");
        }
        result = await registerC2BUrls(c2bShortcode, validationUrl, confirmationUrl);
        break;

      default:
        throw new Error(`Unknown action: ${action}. Use stk_push | query_status | register_c2b`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[mpesa-stk]", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status:  400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
