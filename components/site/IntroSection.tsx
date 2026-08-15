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
      </div>
      {/* Placeholder for cannabis image/video — admin-managed asset later */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/placeholders/intro-media.svg"
        alt="Private Stock cultivation"
        className="aspect-[3/2] w-full object-cover"
      />
    </section>
  );
}
