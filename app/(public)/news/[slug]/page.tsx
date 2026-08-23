import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
import { PostBody } from "@/components/site/PostBody";
import { bodyToText, parseBody } from "@/lib/blog";
import { getHeroesForPage, getPostBySlug, getPublishedPosts } from "@/lib/data";

/**
 * Static blog post page (SEO launch gate, guardrail #9): article metadata +
 * Article structured data; body rendered from TipTap JSON (or legacy text).
 * Revalidated on publish/save via lib/revalidate ("blog" target).
 */
export const revalidate = 300;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://privatestock.co";

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const seo = (post.seo ?? {}) as { title?: string | null; description?: string | null };
  const description = seo.description || post.excerpt || bodyToText(parseBody(post.body_md), 160) || undefined;
  const title = seo.title || post.title;
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/news/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      url: `${SITE}/news/${post.slug}`,
      images: post.hero_image ? [post.hero_image] : undefined,
    },
    twitter: { card: post.hero_image ? "summary_large_image" : "summary", title, description },
  };
}

export default async function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, heroes] = await Promise.all([getPostBySlug(slug), getHeroesForPage("/news")]);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.hero_image ? [post.hero_image] : undefined,
    datePublished: post.published_at ?? undefined,
    mainEntityOfPage: `${SITE}/news/${post.slug}`,
    author: { "@type": "Organization", name: "Private Stock Cannabis Co.", url: SITE },
    publisher: {
      "@type": "Organization",
      name: "Private Stock Cannabis Co.",
      logo: { "@type": "ImageObject", url: `${SITE}/brand-assets/private-stock-black.png` },
    },
  };

  return (
    <main>
      <HeroSwitcher heroes={heroes} heightClassName="h-[40svh]" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto max-w-3xl px-5 py-16 md:py-24">
        <Link href="/news" className="text-xs tracking-[0.2em] text-neutral-400 hover:text-neutral-900">
          ← IN THE NEWS
        </Link>
        <h1 className="mt-4 font-condensed text-4xl font-bold uppercase leading-tight tracking-tight text-ink">{post.title}</h1>
        {post.published_at && (
          <p className="mt-3 text-xs uppercase tracking-widest text-neutral-400">
            {new Date(post.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
        {post.excerpt && <p className="mt-5 text-lg leading-relaxed text-neutral-600">{post.excerpt}</p>}
        {post.hero_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.hero_image} alt="" className="mt-8 aspect-[8/5] w-full rounded-sm object-cover" />
        )}
        <div className="mt-8">
          <PostBody body={post.body_md} />
        </div>
      </article>
      <Footer />
    </main>
  );
}
