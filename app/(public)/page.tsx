import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { getHeroesForPage } from "@/lib/data";

export const revalidate = 300;

export default async function LandingPage() {
  const heroes = await getHeroesForPage("/");

  return (
    <main>
      <HeroSwitcher heroes={heroes} />
      {/* Landing sections (banner, intro, flip-book, brands, merch, news,
          follow, newsletter, footer) land in the next commits. */}
    </main>
  );
}
