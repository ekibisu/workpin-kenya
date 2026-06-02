// Multi-channel notification dispatcher.
// Channels: in_app (notifications table), email (Resend connector), sms (Africa's Talking).
// Accepts either a logged-in user JWT or the service-role key (so other edge functions
// can call this internally without a user session).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  user_id: z.string().uuid().optional(),
  to_email: z.string().email().optional(),
  to_phone: z.string().min(9).max(15).optional(),
  channels: z.array(z.enum(["email", "sms", "in_app"])).min(1),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(2000),
  template: z
    .enum(["payment_success", "payment_failed", "quote_received", "generic"])
    .optional()
    .default("generic"),
  data: z.record(z.unknown()).optional().default({}),
});

function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^254[17]\d{8}$/.test(digits)) return "+" + digits;
  if (/^0[17]\d{8}$/.test(digits)) return "+254" + digits.slice(1);
  if (/^[17]\d{8}$/.test(digits)) return "+254" + digits;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Allow service-role calls (from other edge functions) OR validate user JWT.
    const isServiceRole = token === serviceKey;
    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getClaims(token);
      if (error || !data?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const body = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve recipient contact details from profiles if user_id is supplied
    let email = body.to_email;
    let phone = body.to_phone;
    if (body.user_id && (!email || !phone)) {
      const { data: profile } = await admin
        .from("profiles")
        .select("email, phone, mpesa_phone")
        .eq("id", body.user_id)
        .maybeSingle();
      email = email ?? profile?.email ?? undefined;
      phone = phone ?? profile?.phone ?? profile?.mpesa_phone ?? undefined;
    }

    const results: Record<string, { ok: boolean; error?: string }> = {};

    // ── In-app ─────────────────────────────────────────────
    if (body.channels.includes("in_app")) {
      if (!body.user_id) {
        results.in_app = { ok: false, error: "user_id required for in_app" };
      } else {
        const { error } = await admin.from("notifications").insert({
          user_id: body.user_id,
          title: body.subject ?? "Notification",
          body: body.message,
          kind: body.template,
          data: body.data,
        });
        results.in_app = error ? { ok: false, error: error.message } : { ok: true };
      }
    }

    // ── Email via Resend connector ─────────────────────────
    if (body.channels.includes("email")) {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!email) {
        results.email = { ok: false, error: "no email address" };
      } else if (!lovableKey || !resendKey) {
        results.email = { ok: false, error: "Resend connector not configured" };
      } else {
        try {
          const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": resendKey,
            },
            body: JSON.stringify({
              from: "Workpin <onboarding@resend.dev>",
              to: [email],
              subject: body.subject ?? "Workpin notification",
              html: `<div style="font-family:sans-serif;line-height:1.5;color:#111"><p>${
                body.message.replace(/</g, "&lt;").replace(/\n/g, "<br/>")
              }</p><hr/><p style="color:#888;font-size:12px">Workpin</p></div>`,
            }),
          });
          if (!r.ok) {
            const t = await r.text();
            results.email = { ok: false, error: `${r.status}: ${t.slice(0, 200)}` };
          } else {
            await r.text();
            results.email = { ok: true };
          }
        } catch (e) {
          results.email = { ok: false, error: (e as Error).message };
        }
      }
    }

    // ── SMS via Africa's Talking ──────────────────────────
    if (body.channels.includes("sms")) {
      const atUser = Deno.env.get("AT_USERNAME");
      const atKey = Deno.env.get("AT_API_KEY");
      const normalised = phone ? normalisePhone(phone) : null;
      if (!normalised) {
        results.sms = { ok: false, error: "no valid phone" };
      } else if (!atUser || !atKey) {
        results.sms = { ok: false, error: "Africa's Talking not configured" };
      } else {
        try {
          const form = new URLSearchParams({
            username: atUser,
            to: normalised,
            message: body.message,
          });
          const r = await fetch("https://api.africastalking.com/version1/messaging", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              apiKey: atKey,
              Accept: "application/json",
            },
            body: form.toString(),
          });
          if (!r.ok) {
            const t = await r.text();
            results.sms = { ok: false, error: `${r.status}: ${t.slice(0, 200)}` };
          } else {
            await r.text();
            results.sms = { ok: true };
          }
        } catch (e) {
          results.sms = { ok: false, error: (e as Error).message };
        }
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-notification error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
