import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_ADDRESS   = "WorkPin <noreply@workpin.co.ke>";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  to_email:  string;
  to_name:   string;
  subject:   string;
  body_html: string;
  type?:     string;
}

// ─── Email templates ──────────────────────────────────────────────────────────

function wrapTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="font-family:Arial,sans-serif;background:#f5f7f6;padding:32px 16px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8e4;">
    <div style="background:#1a56db;padding:20px 28px;">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">WorkPin</span>
    </div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 12px;font-size:20px;color:#111928;">${title}</h2>
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
      <p style="font-size:12px;color:#6b7280;margin:0;">
        You're receiving this because you have an account on WorkPin Kenya.<br/>
        <a href="https://workpin.co.ke/settings" style="color:#1a56db;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

const TEMPLATES: Record<string, (data: Record<string, string>) => { subject: string; html: string }> = {
  new_quote: (d) => ({
    subject: `New quote on your ${d.service_name} request`,
    html: wrapTemplate("You have a new quote!", `
      <p style="color:#374151;line-height:1.6;">
        A provider submitted a quote of <strong>KES ${d.price_kes}</strong>
        for your <strong>${d.service_name}</strong> request.
      </p>
      <a href="https://workpin.co.ke/dashboard"
         style="display:inline-block;background:#1a56db;color:#fff;text-decoration:none;
                padding:12px 24px;border-radius:8px;font-weight:600;margin-top:8px;">
        View quote
      </a>
    `),
  }),

  new_job: (d) => ({
    subject: `New ${d.service_name} job in ${d.location_name}`,
    html: wrapTemplate("A new job matches your services", `
      <p style="color:#374151;line-height:1.6;">
        A client posted a <strong>${d.service_name}</strong> request
        in <strong>${d.location_name}</strong>. Be the first to quote.
      </p>
      <a href="https://workpin.co.ke/dashboard/jobs"
         style="display:inline-block;background:#1a56db;color:#fff;text-decoration:none;
                padding:12px 24px;border-radius:8px;font-weight:600;margin-top:8px;">
        View &amp; quote
      </a>
    `),
  }),

  job_complete_pending: (d) => ({
    subject: "Provider marked your job as complete",
    html: wrapTemplate("Job completion confirmation needed", `
      <p style="color:#374151;line-height:1.6;">
        <strong>${d.provider_name}</strong> has marked your
        <strong>${d.service_name}</strong> job as complete.
        Please confirm or raise a dispute.
      </p>
      <a href="https://workpin.co.ke/dashboard"
         style="display:inline-block;background:#057a55;color:#fff;text-decoration:none;
                padding:12px 24px;border-radius:8px;font-weight:600;margin-top:8px;">
        Confirm completion
      </a>
    `),
  }),

  payment_released: (d) => ({
    subject: `KES ${d.amount_kes} released to your wallet`,
    html: wrapTemplate("Payment released!", `
      <p style="color:#374151;line-height:1.6;">
        <strong>KES ${d.amount_kes}</strong> has been released to your WorkPin wallet
        for the <strong>${d.service_name}</strong> job.
        You can request a payout from your dashboard.
      </p>
      <a href="https://workpin.co.ke/dashboard/wallet"
         style="display:inline-block;background:#1a56db;color:#fff;text-decoration:none;
                padding:12px 24px;border-radius:8px;font-weight:600;margin-top:8px;">
        View wallet
      </a>
    `),
  }),
};

// ─── Send via Resend ──────────────────────────────────────────────────────────

async function sendEmail(payload: NotificationPayload) {
  if (!RESEND_API_KEY) {
    console.warn("[send-notification] RESEND_API_KEY not set — skipping send");
    return { success: true, skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    FROM_ADDRESS,
      to:      [`${payload.to_name} <${payload.to_email}>`],
      subject: payload.subject,
      html:    payload.body_html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Resend error: ${data.message ?? JSON.stringify(data)}`);
  }

  console.log(`[send-notification] sent to=${payload.to_email} id=${data.id}`);
  return { success: true, id: data.id };
}

// ─── Request handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();

    // Direct payload mode: { to_email, to_name, subject, body_html }
    if (body.to_email && body.subject && body.body_html) {
      const result = await sendEmail(body as NotificationPayload);
      return new Response(JSON.stringify(result), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Template mode: { type, to_email, to_name, data: { ... } }
    if (body.type && TEMPLATES[body.type]) {
      const tpl = TEMPLATES[body.type](body.data ?? {});
      const result = await sendEmail({
        to_email:  body.to_email,
        to_name:   body.to_name ?? "",
        subject:   tpl.subject,
        body_html: tpl.html,
        type:      body.type,
      });
      return new Response(JSON.stringify(result), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    throw new Error("Provide either { to_email, subject, body_html } or { type, to_email, data }");

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-notification]", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status:  400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
