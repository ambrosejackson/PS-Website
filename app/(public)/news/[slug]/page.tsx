import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
import { getHeroesForPage, getPostBySlug, getPublishedPosts } from "@/lib/data";

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const seo = (post.seo ?? {}) as { title?: string; description?: string };
  return {
    title: seo.title ?? post.title,
    description: seo.description ?? post.excerpt ?? undefined,
    openGraph: {
      title: seo.title ?? post.title,
      description: seo.description ?? post.excerpt ?? undefined,
      type: "article",
      images: post.hero_image ? [post.hero_image] : undefined,
    },
  };
}

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, heroes] = await Promise.all([
    getPostBySlug(slug),
    getHeroesForPage("/news"),
  ]);
  if (!post) notFound();

  const paragraphs = (post.body_md ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <main>
      <HeroSwitcher heroes={heroes} heightClassName="h-[40svh]" />
      <article className="mx-auto max-w-3xl px-5 py-16 md:py-24">
        <Link
          href="/news"
          className="text-xs tracking-[0.2em] text-neutral-400 hover:text-neutral-900"
        >
          ← IN THE NEWS
        </Link>
        <h1 className="mt-4 font-condensed text-4xl font-bold uppercase leading-tight tracking-tight text-ink">
          {post.title}
        </h1>
        {post.published_at && (
          <p className="mt-3 text-xs uppercase tracking-widest text-neutral-400">
            {new Date(post.published_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
        {post.hero_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.hero_image}
            alt=""
            className="mt-8 aspect-[8/5] w-full rounded-sm object-cover"
          />
        )}
        <div className="mt-8 space-y-5 leading-relaxed text-neutral-700">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>
      <Footer />
    </main>
  );
}
