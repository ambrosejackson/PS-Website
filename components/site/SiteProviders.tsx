"use client";

import { AgeGate, useAgeVerified } from "@/components/site/AgeGate";
import { Analytics } from "@/components/site/Analytics";
import { ConsentProvider } from "@/components/site/ConsentProvider";
import { NewsletterPopup } from "@/components/site/NewsletterPopup";

/** Client shell for all public pages: age gate → consent banner → popup → analytics. */
export function SiteProviders({ children }: { children: React.ReactNode }) {
  const ageAnswered = useAgeVerified();
  return (
    <ConsentProvider ageGateAnswered={ageAnswered}>
      {children}
      <AgeGate />
      <NewsletterPopup />
      <Analytics />
    </ConsentProvider>
  );
}
