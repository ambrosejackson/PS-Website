import "server-only";

/**
 * Transactional email transport (D-042: Resend). Templates land in a later
 * session — this is transport + from-address config only.
 *
 * `send()` NO-OPS with a console.warn when RESEND_API_KEY is unset, so order /
 * contact / subscribe flows keep working before the Resend account exists.
 * Uses Resend's HTTP API directly (no SDK dependency yet).
 */

/** Default sender; override with EMAIL_FROM (e.g. Resend's onboarding@resend.dev before the domain is verified). Read lazily so env changes apply without a module reload. */
export const DEFAULT_EMAIL_FROM = "Private Stock <notifications@privatestock.co>";
export const EMAIL_NOTIFY_TO = "ambrose@privatestock.co";
export function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM;
}
export function notifyTo(): string {
  return process.env.EMAIL_NOTIFY_TO?.trim() || EMAIL_NOTIFY_TO;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text alternative; derived from html when omitted. */
  text?: string;
  replyTo?: string;
  from?: string;
  /** Resend idempotency key (e.g. `order-<id>`), prevents duplicate sends on retry. */
  idempotencyKey?: string;
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function send(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = Array.isArray(message.to) ? message.to : [message.to];
  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY unset — skipped "${message.subject}" → ${to.join(", ")}`,
    );
    return { ok: true, skipped: true, reason: "RESEND_API_KEY unset" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (message.idempotencyKey) headers["Idempotency-Key"] = message.idempotencyKey;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: message.from ?? emailFrom(),
        to,
        subject: message.subject,
        html: message.html,
        text: message.text ?? htmlToText(message.html),
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      const error = body.message ?? `Resend HTTP ${res.status}`;
      console.error(`[email] send failed: ${error}`);
      return { ok: false, error };
    }
    return { ok: true, id: body.id ?? "" };
  } catch (e) {
    const error = e instanceof Error ? e.message : "network error";
    console.error(`[email] send failed: ${error}`);
    return { ok: false, error };
  }
}

/** Convenience: internal notification to Ambrose (new order, new message). */
export function notifyStaff(subject: string, html: string, opts: { replyTo?: string; idempotencyKey?: string } = {}) {
  return send({ to: notifyTo(), subject, html, ...opts });
}
