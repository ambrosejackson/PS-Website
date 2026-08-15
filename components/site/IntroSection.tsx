/** Company intro — copy is exact from the build spec docx; do not edit without Ambrose. */
export function IntroSection() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-2 md:gap-16 md:py-28">
      <div>
        <h2 className="font-serif text-3xl tracking-[0.18em] text-neutral-900 md:text-4xl">
          A DEDICATION TO THE EXCEPTIONAL
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
        className="aspect-[3/2] w-full rounded-sm object-cover"
      />
    </section>
  );
}
