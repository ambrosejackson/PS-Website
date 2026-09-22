import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resend delivery webhook → event_reminder_sends.status and event_rsvps.email_bounced.
 * Resend signs with Svix: headers svix-id / svix-timestamp / svix-signature,
 * secret RESEND_WEBHOOK_SECRET ("whsec_..."). Subscribe to email.delivered,
 * email.bounced, email.complained in the Resend dashboard.
 */
export const dynamic = "force-dynamic";

function verify(raw: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigs = headers.get("svix-signature");
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest();
  return sigs.split(" ").some((part) => {
    const [, sig] = part.split(",");
    if (!sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

const STATUS: Record<string, "delivered" | "bounced" | "complained"> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verify(raw, request.headers)) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  const evt = JSON.parse(raw) as { type?: string; data?: { email_id?: string; to?: string[] } };
  const status = evt.type ? STATUS[evt.type] : undefined;
  const emailId = evt.data?.email_id;
  if (!status || !emailId) return NextResponse.json({ ok: true, ignored: true });

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("event_reminder_sends")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("provider_message_id", emailId)
    .select("rsvp_id");
  if (status !== "delivered") {
    const ids = (rows ?? []).map((r) => r.rsvp_id);
    if (ids.length) await admin.from("event_rsvps").update({ email_bounced: true }).in("id", ids);
    else if (evt.data?.to?.length) {
      // Confirmation emails aren't in the sends table; match on address.
      await admin.from("event_rsvps").update({ email_bounced: true }).in("email", evt.data.to.map((t) => t.toLowerCase()));
    }
  }
  return NextResponse.json({ ok: true });
}
