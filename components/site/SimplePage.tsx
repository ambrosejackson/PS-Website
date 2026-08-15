import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
import { getHeroesForPage } from "@/lib/data";

/** Shared shell for placeholder/interior pages — same header/hero pattern everywhere. */
export async function SimplePage({
  page,
  title,
  children,
}: {
  page: string;
  title: string;
  children: React.ReactNode;
}) {
  const heroes = await getHeroesForPage(page);
  return (
    <main>
      <HeroSwitcher heroes={heroes} heightClassName="h-[40svh]" />
      <section className="mx-auto max-w-3xl px-5 py-16 md:py-24">
        <h1 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">
          {title}
        </h1>
        <div className="mt-8 space-y-5 leading-relaxed text-neutral-600">
          {children}
        </div>
      </section>
      <Footer />
    </main>
  );
}
