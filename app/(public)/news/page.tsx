import type { Metadata } from "next";
import Link from "next/link";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
import { getHeroesForPage, getPublishedPosts } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "In the News",
  description:
    "News, stories, and updates from Private Stock Cannabis Co. and its brands.",
};

export default async function NewsIndexPage() {
  const [heroes, posts] = await Promise.all([
    getHeroesForPage("/news"),
    getPublishedPosts(),
  ]);

  return (
    <main>
      <HeroSwitcher heroes={heroes} heightClassName="h-[45svh]" />
      <section className="mx-auto max-w-screen-2xl px-6 py-14 md:px-12 md:py-20">
        <h1 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">
          IN THE NEWS
        </h1>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {posts.map((post) => (
            <article key={post.id} className="group">
              <Link href={`/news/${post.slug}`}>
                <div className="aspect-[8/5] overflow-hidden rounded-sm bg-neutral-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.hero_image ?? "/placeholders/blog-1.svg"}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h2 className="mt-4 font-condensed text-lg font-semibold uppercase tracking-tight text-ink">
                  {post.title}
                </h2>
              </Link>
              {post.excerpt && (
                <p className="mt-2 line-clamp-3 text-sm text-neutral-500">
                  {post.excerpt}
                </p>
              )}
              {post.published_at && (
                <p className="mt-2 text-xs uppercase tracking-widest text-neutral-400">
                  {new Date(post.published_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </article>
          ))}
          {posts.length === 0 && (
            <p className="text-neutral-500">No posts yet — check back soon.</p>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
