"use client";

import { useState } from "react";

/**
 * /contact — single form: inquiry type (Consumer / Retailer / Press), name,
 * email, company (Retailer only), message. Posts to /api/messages → messages
 * table; NOT a newsletter signup (persona rules untouched). Honeypot field
 * `website` must stay empty.
 */
const TYPES = [
  { value: "consumer", label: "Consumer" },
  { value: "retailer", label: "Retailer / Dispensary" },
  { value: "press", label: "Press" },
] as const;

export function ContactForm() {
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("consumer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<{ s: "idle" | "loading" | "done" } | { s: "error"; message: string }>({ s: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ s: "loading" });
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryType: type, name, email, company: type === "retailer" ? company : "", body, website }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ s: "error", message: json.error ?? "Something went wrong — please try again." });
        return;
      }
      setState({ s: "done" });
    } catch {
      setState({ s: "error", message: "Network error — please try again." });
    }
  }

  if (state.s === "done") {
    return (
      <div className="border border-hairline p-8 text-center">
        <p className="font-condensed text-xl font-semibold uppercase tracking-tight text-ink">Message received</p>
        <p className="mt-2 text-sm text-neutral-500">
          Thanks{name ? `, ${name.split(" ")[0]}` : ""} — {type === "retailer" ? "our wholesale team" : "we"} will be in touch at {email}.
        </p>
      </div>
    );
  }

  const input = "h-11 w-full border border-hairline px-3 text-sm text-ink outline-none focus:border-ink";
  const label = "font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-500";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="c-type" className={label}>
          I&apos;m reaching out as a
        </label>
        <select id="c-type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className={`${input} mt-1 bg-white`}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="c-name" className={label}>
            Name
          </label>
          <input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} className={`${input} mt-1`} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="c-email" className={label}>
            Email
          </label>
          <input id="c-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} mt-1`} autoComplete="email" />
        </div>
      </div>
      {type === "retailer" && (
        <div>
          <label htmlFor="c-company" className={label}>
            Dispensary / company
          </label>
          <input id="c-company" required value={company} onChange={(e) => setCompany(e.target.value)} className={`${input} mt-1`} autoComplete="organization" />
        </div>
      )}
      <div>
        <label htmlFor="c-body" className={label}>
          Message
        </label>
        <textarea id="c-body" required rows={6} value={body} onChange={(e) => setBody(e.target.value)} className={`${input} mt-1 h-auto py-2`} />
      </div>
      {/* Honeypot — hidden from people, filled by bots */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      {state.s === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      <button
        type="submit"
        disabled={state.s === "loading"}
        className="bg-ink px-8 py-3.5 font-condensed text-sm font-semibold uppercase tracking-[0.16em] text-white hover:bg-ink/85 disabled:opacity-50"
      >
        {state.s === "loading" ? "Sending…" : "Send message"}
      </button>
      <p className="text-xs text-neutral-400">Contact messages are not newsletter signups — join the list at the bottom of the page if you want drop alerts.</p>
    </form>
  );
}
