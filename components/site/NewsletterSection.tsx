import { NewsletterForm } from "@/components/site/NewsletterForm";

export function NewsletterSection() {
  return (
    <section className="border-t border-hairline py-14 md:py-20">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-condensed text-[26px] font-bold uppercase tracking-tight text-ink md:text-[32px]">
          Join the List
        </h2>
        <p className="mt-3 text-sm text-neutral-500">
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
