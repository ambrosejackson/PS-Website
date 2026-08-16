import { CatalogTrigger } from "@/components/site/CatalogTrigger";

/** Company intro — copy is exact from the build spec docx; do not edit without Ambrose. */
export function IntroSection() {
  return (
    <section className="mx-auto grid max-w-screen-2xl items-center gap-10 px-6 py-14 md:grid-cols-2 md:gap-16 md:px-12 md:py-20">
      <div>
        <h2 className="font-condensed text-[28px] font-bold uppercase tracking-tight text-ink md:text-4xl">
          A Dedication to the Exceptional
        </h2>
        <p className="mt-6 leading-relaxed text-neutral-600">
          Private Stock is defined by restraint, precision, and intention. As an
          owner-operator, we control every element to ensure integrity and
          consistency at scale, from cannabis cultivation to retail to
          community.
        </p>
        <p className="mt-4 leading-relaxed text-neutral-600">
          Excellence is not declared – it is demonstrated through uncompromising
          standards and attention to detail.
        </p>
        {/* The landing page's only visual pointer to the catalog (D-021) —
            same modal as the header's CATALOG item. */}
        <CatalogTrigger
          label="View the Brand Book"
          className="mt-8 inline-flex items-center border border-ink px-6 py-3 font-condensed text-xs font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-white"
        />
      </div>
      {/* Placeholder for cannabis image/video — admin-managed asset later */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/placeholders/intro-media.png"
        alt="Private Stock cultivation"
        className="aspect-[3/2] w-full object-cover"
      />
    </section>
  );
}
