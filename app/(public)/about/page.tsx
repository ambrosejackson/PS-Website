import type { Metadata } from "next";
import { SimplePage } from "@/components/site/SimplePage";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "About",
  description: "About Private Stock Cannabis Co.",
};

export default function AboutPage() {
  // TODO(Ambrose): final ABOUT copy (open item #1 in the build plan).
  return (
    <SimplePage page="/about" title="ABOUT">
      <p>
        Private Stock is defined by restraint, precision, and intention. As an
        owner-operator, we control every element to ensure integrity and
        consistency at scale, from cannabis cultivation to retail to community.
      </p>
      <p className="text-sm text-neutral-400">
        Full About page content is being finalized.
      </p>
    </SimplePage>
  );
}
