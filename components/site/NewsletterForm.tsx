"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Newsletter signup. Sends the exact page path — the server derives the
 * persona tag `Website Sign-up – {Brand}` from it (guardrail #7).
 */
export function NewsletterForm({
  compact = false,
  onSuccess,
}: {
  compact?: boolean;
  onSuccess?: (code: string | null) => void;
}) {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<
    { status: "idle" | "loading" } | { status: "done"; code: string | null } | { status: "error"; message: string }
  >({ status: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setState({ status: "error", message: "Please confirm you'd like to receive emails." });
      return;
    }
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sourcePath: pathname, consent: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({
          status: "error",
          message: body.error ?? "Something went wrong — please try again.",
        });
        return;
      }
      setState({ status: "done", code: body.discountCode ?? null });
      onSuccess?.(body.discountCode ?? null);
    } catch {
      setState({ status: "error", message: "Network error — please try again." });
    }
  }

  if (state.status === "done") {
    return (
      <div className="text-center">
        <p className="font-condensed text-xl font-semibold uppercase tracking-tight">You&apos;re on the list.</p>
        {state.code ? (
          <p className="mt-2 text-sm opacity-80">
            Your one-time 15% merch code:{" "}
            <span className="font-mono font-semibold tracking-wider">{state.code}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm opacity-80">
            Your 15% merch code will arrive by email when the shop opens.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md">
      <div className="flex gap-2">
        <Input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={compact ? "" : "h-11"}
          aria-label="Email address"
        />
        <Button
          type="submit"
          disabled={state.status === "loading"}
          className={compact ? "" : "h-11 px-6"}
        >
          {state.status === "loading" ? "…" : "Sign Up"}
        </Button>
      </div>
      <label className="mt-3 flex items-start gap-2 text-left text-xs opacity-70">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I&apos;m 21+ and agree to receive email marketing from Private Stock.
          One-time 15% code valid on merch &amp; apparel only, not combinable
          with other promotions.
        </span>
      </label>
      {state.status === "error" && (
        <p className="mt-2 text-xs text-red-500">{state.message}</p>
      )}
    </form>
  );
}
