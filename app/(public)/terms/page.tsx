import type { Metadata } from "next";
import { SimplePage } from "@/components/site/SimplePage";

export const revalidate = 300;
export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  // TODO(Ambrose): counsel-approved terms before launch.
  return (
    <SimplePage page="/terms" title="TERMS OF USE">
      <p>
        Our full terms of use are being finalized. This site is intended for
        adults 21 and older in states where cannabis is legal.
      </p>
    </SimplePage>
  );
}
