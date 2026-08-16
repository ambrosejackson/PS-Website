import { NewsletterForm } from "@/components/site/NewsletterForm";

/**
 * Newsletter section per the docx reference: split layout — lifestyle photo
 * left (placeholder until Ambrose uploads the Private Stock tracksuit shot),
 * black panel right with large JOIN OUR NEWSLETTER heading, one line of copy,
 * inline email + Subscribe. Wired to the subscribers/persona/discount flow.
 */
export function NewsletterSection() {
  return (
    <section className="grid md:grid-cols-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/placeholders/newsletter-photo.svg"
        alt="Private Stock apparel"
        className="h-64 w-full object-cover md:h-full md:min-h-[480px]"
      />
      <div className="flex flex-col justify-center bg-neutral-950 px-6 py-14 text-white md:px-14 md:py-20">
        <h2 className="font-condensed text-5xl font-bold uppercase leading-[0.95] tracking-tight md:text-6xl">
          Join Our
          <br />
          Newsletter
        </h2>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-white/70">
          Drops, stories, and a one-time 15% code for merch &amp; apparel — not
          combinable with other promotions.
        </p>
        <div className="mt-8 max-w-md">
          <NewsletterForm variant="dark" />
        </div>
      </div>
    </section>
  );
}
