"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

/** GET IN TOUCH form per the Outfitters reference — posts to /api/messages (shared inbox, inquiry_type consumer). */

const inputClasses =
  "w-full border border-neutral-700 bg-[#191613] px-4 py-3 text-sm text-[#f5f2ea] outline-none placeholder:text-neutral-500 focus:border-[#b8860b]";

export function OutfittersContactForm() {
  const pathname = usePathname();
  const [fields, setFields] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [state, setState] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const set =
    (key: keyof typeof fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError(null);
    try {
      // Lands in the shared /admin/messages inbox (D-043) as a consumer inquiry,
      // with the honeypot / rate limit / staff notification of /api/messages.
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryType: "consumer",
          name: fields.name,
          email: fields.email,
          company: "",
          body: `${fields.subject.trim() ? `[${fields.subject.trim()}] ` : ""}${fields.message}\n\n— sent from ${pathname} (Outfitters GET IN TOUCH)`,
          website: "",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Something went wrong — please try again.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setError("Network error — please try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="border border-[#b8860b]/30 bg-[#151310] p-10 text-center">
        <p className="font-condensed text-xl uppercase tracking-[0.2em] text-[#f5f2ea]">
          Message received
        </p>
        <p className="mt-3 text-sm text-neutral-400">
          Thank you for reaching out — we&apos;ll be in touch.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[#b8860b]/20 bg-[#151310] p-6 md:p-10"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="font-condensed text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f5f2ea]">
            Name
          </span>
          <input
            required
            value={fields.name}
            onChange={set("name")}
            placeholder="Your name"
            className={`mt-2 ${inputClasses}`}
          />
        </label>
        <label className="block">
          <span className="font-condensed text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f5f2ea]">
            Email
          </span>
          <input
            required
            type="email"
            value={fields.email}
            onChange={set("email")}
            placeholder="your@email.com"
            className={`mt-2 ${inputClasses}`}
          />
        </label>
      </div>
      <label className="mt-5 block">
        <span className="font-condensed text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f5f2ea]">
          Subject
        </span>
        <input
          value={fields.subject}
          onChange={set("subject")}
          placeholder="How can we help?"
          className={`mt-2 ${inputClasses}`}
        />
      </label>
      <label className="mt-5 block">
        <span className="font-condensed text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f5f2ea]">
          Message
        </span>
        <textarea
          required
          rows={5}
          value={fields.message}
          onChange={set("message")}
          placeholder="Tell us more..."
          className={`mt-2 resize-y ${inputClasses}`}
        />
      </label>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={state === "loading"}
        className="mt-6 w-full bg-[#b8860b] py-4 font-condensed text-sm font-semibold uppercase tracking-[0.25em] text-neutral-950 transition-colors hover:bg-[#d09c17] disabled:opacity-60"
      >
        {state === "loading" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
