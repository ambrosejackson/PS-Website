import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { personaForPath } from "@/lib/personas";

/** Contact form sink (Outfitters GET IN TOUCH; reusable) → contact_messages. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = { name: 200, email: 320, subject: 300, message: 5000 };

export async function POST(request: Request) {
  let body: {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    sourcePath?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const subject = body.subject?.trim() || null;
  const message = body.message?.trim();
  const sourcePath = typeof body.sourcePath === "string" ? body.sourcePath : "/";

  if (!name || name.length > MAX.name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email) || email.length > MAX.email) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!message || message.length > MAX.message) {
    return NextResponse.json(
      { error: "Please enter a message." },
      { status: 400 },
    );
  }
  if (subject && subject.length > MAX.subject) {
    return NextResponse.json({ error: "Subject is too long." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Messages aren't live yet — please try again soon." },
      { status: 503 },
    );
  }

  const { brandContext } = personaForPath(sourcePath);
  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    subject,
    message,
    brand_context: brandContext,
    source_path: sourcePath,
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not send your message — please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
