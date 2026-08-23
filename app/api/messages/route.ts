import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStaff } from "@/lib/email";

/**
 * Contact form sink (D-043): inserts into `messages` with the service role,
 * honeypot + basic per-IP rate limit, Resend notification to staff with the
 * inquiry type in the subject. Not a newsletter signup.
 */
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPES = new Set(["consumer", "retailer", "press"]);
const MAX = { name: 200, email: 320, company: 200, body: 5000 };
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

// Best-effort per-instance limiter (serverless instances are ephemeral; the
// DB count below backs it up across instances).
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE_MAX;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
  let body: { inquiryType?: string; name?: string; email?: string; company?: string; body?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  // Honeypot: silently accept so bots don't learn.
  if (body.website && body.website.trim()) return NextResponse.json({ ok: true });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  if (limited(ip)) return NextResponse.json({ error: "Too many messages — please try again in a few minutes." }, { status: 429 });

  const inquiryType = (body.inquiryType ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const company = (body.company ?? "").trim() || null;
  const text = (body.body ?? "").trim();
  if (!TYPES.has(inquiryType)) return NextResponse.json({ error: "Choose an inquiry type." }, { status: 400 });
  if (!name || name.length > MAX.name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > MAX.email) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (company && company.length > MAX.company) return NextResponse.json({ error: "Company name is too long." }, { status: 400 });
  if (!text || text.length > MAX.body) return NextResponse.json({ error: "Please enter a message." }, { status: 400 });

  let db;
  try {
    db = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Messages aren't live yet — please try again soon." }, { status: 503 });
  }
  // Cross-instance backstop: same email, > RATE_MAX in the window.
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await db.from("messages").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
  if ((count ?? 0) >= RATE_MAX) return NextResponse.json({ error: "Too many messages — please try again in a few minutes." }, { status: 429 });

  const { data, error } = await db
    .from("messages")
    .insert({ inquiry_type: inquiryType, name, email, company, body: text, status: "new" })
    .select("id")
    .single();
  if (error || !data) return NextResponse.json({ error: "Could not send your message — please try again." }, { status: 500 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://privatestock.co";
  await notifyStaff(
    `[Contact · ${inquiryType.toUpperCase()}] ${name}${company ? ` — ${company}` : ""}`,
    `<p><strong>${esc(inquiryType)}</strong> inquiry from <strong>${esc(name)}</strong> &lt;${esc(email)}&gt;${company ? ` · ${esc(company)}` : ""}</p>
     <pre style="white-space:pre-wrap;font:14px/1.5 Helvetica,Arial,sans-serif">${esc(text)}</pre>
     <p><a href="${site}/admin/messages/${data.id}">Open in /admin/messages</a></p>`,
    { replyTo: email, idempotencyKey: `message-${data.id}` },
  );
  return NextResponse.json({ ok: true });
}
