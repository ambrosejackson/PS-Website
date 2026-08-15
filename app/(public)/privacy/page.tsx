import type { Metadata } from "next";
import { SimplePage } from "@/components/site/SimplePage";

export const revalidate = 300;
export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  // TODO(Ambrose): counsel-approved privacy policy before launch.
  return (
    <SimplePage page="/privacy" title="PRIVACY POLICY">
      <p>
        Our full privacy policy is being finalized. In short: we collect only
        what we need (newsletter signups you opt into and first-party analytics
        you consent to), we never sell your data, and nothing is shared with
        third-party ad platforms.
      </p>
    </SimplePage>
  );
}
