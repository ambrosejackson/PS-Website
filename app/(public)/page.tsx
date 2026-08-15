import { Header } from "@/components/site/Header";

export default function LandingPage() {
  return (
    <main>
      <section className="relative h-svh w-full overflow-hidden">
        {/* Static placeholder — replaced by the content_heroes-driven HeroSwitcher */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/placeholders/hero-default.svg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <Header />
      </section>
    </main>
  );
}
