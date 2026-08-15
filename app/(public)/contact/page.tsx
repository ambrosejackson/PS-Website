import type { Metadata } from "next";
import { SimplePage } from "@/components/site/SimplePage";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Private Stock Cannabis Co.",
};

export default function ContactPage() {
  // TODO(Ambrose): confirm contact channels + retailer inquiry form spec
  // (open item #1; retailer form routes into the PSM pipeline in a later phase).
  return (
    <SimplePage page="/contact" title="CONTACT">
      <p>
        Retail partner or press inquiry? The contact and retailer inquiry forms
        are being finalized — for now, reach us through your Private Stock
        sales contact.
      </p>
      <p className="text-sm text-neutral-400">
        Full Contact page content is being finalized.
      </p>
    </SimplePage>
  );
}
