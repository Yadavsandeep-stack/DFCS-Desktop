/**
 * Notification hooks for the access-request lifecycle.
 *
 * Uses Brevo's SMTP API for transactional emails. If the API key or sender is
 * not configured, it falls back to logging the message so local development keeps working.
 */

const BREVO_API_KEY = process.env["BREVO_API_KEY"];
const BREVO_FROM_EMAIL = process.env["BREVO_FROM_EMAIL"] ?? "noreply@example.com";
const BREVO_FROM_NAME = process.env["BREVO_FROM_NAME"] ?? "DFCS Desktop";
const PUBLIC_SITE_URL =
  process.env["PUBLIC_SITE_URL"] ??
  "https://the-dev-sandeep-astro-gate-hub.sandeepyadavatcm.workers.dev";
const ADMIN_PORTAL_KEY = process.env["ADMIN_PORTAL_KEY"] ?? "secret123";

function emailShell({ title, accent, body, ctaLabel, ctaUrl }: {
  title: string;
  accent: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}) {
  return `
    <html>
      <body style="margin:0;background:#070b16;font-family:Segoe UI,Arial,sans-serif;color:#edf2ff;">
        <div style="background:radial-gradient(circle at top left,#1b2448 0%,#0b1020 38%,#070b16 100%);padding:28px 18px;">
          <div style="max-width:640px;margin:0 auto;background:rgba(13,20,36,0.86);border:1px solid rgba(148,163,184,0.18);border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(79,70,229,0.18);">
            <div style="padding:24px 28px 18px;background:linear-gradient(135deg, rgba(129,140,248,0.16), rgba(45,212,191,0.08), rgba(236,72,153,0.08));border-bottom:1px solid rgba(148,163,184,0.12);">
              <div style="display:flex;align-items:center;gap:12px;">
                <img src="${PUBLIC_SITE_URL}/icons/icon.png" alt="DFCS" width="48" height="48" style="display:block;border-radius:12px;" />
                <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(99,102,241,0.12);border:1px solid rgba(167,139,250,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#dfe7ff;font-weight:700;">
                  DFCS Desktop
                </div>
              </div>
              <h1 style="margin:16px 0 0;font-size:32px;line-height:1.15;font-weight:800;letter-spacing:-0.04em;color:#f8fafc;">${title}</h1>
            </div>
            <div style="padding:28px 28px 22px;">
              <div style="background:linear-gradient(135deg, rgba(167,139,250,0.12), rgba(45,212,191,0.08));border:1px solid rgba(148,163,184,0.16);border-radius:18px;padding:18px 20px;line-height:1.7;color:#dfe7ff;font-size:16px;">
                ${body}
              </div>
              <div style="margin-top:24px;text-align:center;">
                <a href="${ctaUrl}" style="display:inline-block;padding:16px 26px;background:linear-gradient(90deg,#8b5cf6,#3b82f6,#22d3ee);border-radius:14px;color:#fff;text-decoration:none;font-size:15px;font-weight:700;box-shadow:0 16px 28px rgba(96,165,250,0.35);">
                  ${ctaLabel}
                </a>
              </div>
              <div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(148,163,184,0.12);font-size:12px;color:#94a3b8;line-height:1.7;">
                <div style="font-weight:700;color:#cbd5e1;">Why this matters</div>
                <div>Access is managed through the DFCS Desktop release portal for secure, signed software delivery.</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function send(subject: string, to: string, body: string, html?: string) {
  if (!BREVO_API_KEY) {
    console.log(`[portal-email] to=${to} subject="${subject}"\n${body}`);
    return { sent: false as const, reason: "missing_brevo_api_key" as const };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name: BREVO_FROM_NAME,
        email: BREVO_FROM_EMAIL,
      },
      to: [{ email: to }],
      subject,
      textContent: body,
      htmlContent: html ?? `<html><body><p>${body.replace(/\n/g, "<br />")}</p></body></html>`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[portal-email] Brevo email failed for ${to}: ${response.status} ${text}`);
    return { sent: false as const, reason: "brevo_error" as const };
  }

  return { sent: true as const, reason: "brevo_sent" as const };
}

export async function notifyAdminOfRequest(fullName: string, email: string) {
  const adminEmail = process.env["ADMIN_NOTIFY_EMAIL"] ?? "admin@example.com";
  const adminUrl = `${PUBLIC_SITE_URL}/admin?admin_key=${encodeURIComponent(ADMIN_PORTAL_KEY)}`;

  const body = `
    <strong>${fullName}</strong> has requested access to the DFCS Desktop portal.<br /><br />
    <strong>Email:</strong> ${email}<br />
    <strong>Status:</strong> Pending admin review<br /><br />
    Review the request in the admin dashboard and approve access in one click.<br /><br />
    <a href="${adminUrl}" style="color:#2563eb;font-weight:700;text-decoration:underline;">Open Admin Dashboard</a>
  `;

  return send(
    "New access request pending approval",
    adminEmail,
    `${fullName} (${email}) requested access to the desktop app.\n\nApprove them here: ${adminUrl}\n\nRequested by: ${fullName}\nEmail: ${email}`,
    emailShell({
      title: "New access request",
      accent: "#8b5cf6",
      body,
      ctaLabel: "Review request",
      ctaUrl: adminUrl,
    }),
  );
}

export async function notifyUserApproved(fullName: string, email: string) {
  const body = `
    <strong>Hi ${fullName},</strong><br /><br />
    Your access request has been approved and your DFCS Desktop portal is ready.<br /><br />
    <strong>Portal:</strong> <a href="${PUBLIC_SITE_URL}" style="color:#8b5cf6;">${PUBLIC_SITE_URL}</a><br />
    <strong>Sign in with:</strong> ${email}
  `;

  return send(
    "Your access has been granted!",
    email,
    `Hi ${fullName}, your access request is approved.\n\nOpen the portal here: ${PUBLIC_SITE_URL}\n\nSign in with ${email} to download the desktop app.`,
    emailShell({
      title: "Access granted",
      accent: "#22c55e",
      body,
      ctaLabel: "Open portal",
      ctaUrl: PUBLIC_SITE_URL,
    }),
  );
}
