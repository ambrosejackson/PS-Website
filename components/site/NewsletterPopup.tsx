"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { useAgeVerified } from "@/components/site/AgeGate";
import { brandBySlug } from "@/lib/brands";
import { X } from "lucide-react";

/**
 * 15% merch code popup. Once per session, never over an unanswered age gate,
 * never again after a successful signup. Brand pages get the brand's name in
 * the headline (persona derives server-side from the submit path).
 */

const SHOW_DELAY_MS = 8000;
const SESSION_KEY = "ps_nl_popup_shown";
const SUBSCRIBED_KEY = "ps_subscribed";

export function NewsletterPopup() {
  const ageVerified = useAgeVerified();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const brand = brandBySlug(pathname.split("/").filter(Boolean)[0] ?? "");

  useEffect(() => {
    if (!ageVerified) return;
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    if (localStorage.getItem(SUBSCRIBED_KEY) === "1") return;
    const t = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      setOpen(true);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [ageVerified]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-md rounded-sm bg-neutral-950 p-8 text-center text-white shadow-2xl">
        <button
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 p-1 opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="font-serif text-2xl tracking-[0.15em]">
          TAKE 15% OFF MERCH
        </p>
        <p className="mt-3 text-sm text-white/60">
          Join the {brand ? brand.name : "Private Stock"} list and get a
          one-time 15% code for merch &amp; apparel. One use per customer, not
          combinable with other promotions.
        </p>
        <div className="mt-6">
          <NewsletterForm
            compact
            onSuccess={() => localStorage.setItem(SUBSCRIBED_KEY, "1")}
          />
        </div>
      </div>
    </div>
  );
}
