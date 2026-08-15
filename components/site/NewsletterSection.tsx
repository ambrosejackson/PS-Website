import { NewsletterForm } from "@/components/site/NewsletterForm";

export function NewsletterSection() {
  return (
    <section className="bg-neutral-950 py-20 text-white md:py-24">
      <div className="mx-auto max-w-2xl px-5 text-center">
        <h2 className="font-serif text-3xl tracking-[0.18em] md:text-4xl">
          JOIN THE LIST
        </h2>
        <p className="mt-4 text-sm text-white/60">
          Sign up for drops, stories, and a one-time 15% code for merch &amp;
          apparel.
        </p>
        <div className="mt-8">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
