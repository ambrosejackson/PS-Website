import type { Metadata } from "next";
import { SimplePage } from "@/components/site/SimplePage";
import { ContactForm } from "@/components/site/ContactForm";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Private Stock Cannabis Co. — consumer questions, retailer and dispensary wholesale inquiries, and press.",
};

/** /contact (D-043): one form, inquiry type → messages table; retailer rows feed PSM W3 later. */
export default function ContactPage() {
  return (
    <SimplePage page="/contact" title="CONTACT">
      <p>
        Questions about our brands, carrying Private Stock products at your dispensary, or a press inquiry — send it
        here and the right person will reply.
      </p>
      <div className="mt-8 max-w-2xl">
        <ContactForm />
      </div>
    </SimplePage>
  );
}
