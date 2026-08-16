import Link from "next/link";
import { SectionHeader } from "@/components/site/SectionHeader";
import type { BlogPost } from "@/lib/data";

export function InTheNews({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-screen-2xl px-6 py-12 md:px-12 md:py-14">
        <SectionHeader title="In the News" seeMoreHref="/news" />
        <div className="mt-10 grid gap-x-6 gap-y-10 md:grid-cols-3">
          {posts.slice(0, 3).map((post) => (
            <article key={post.id} className="group">
              <Link href={`/news/${post.slug}`} className="block">
                <div className="aspect-[8/5] overflow-hidden bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.hero_image ?? "/placeholders/blog-1.png"}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-4 font-condensed text-lg font-semibold uppercase tracking-tight text-ink">
                  {post.title}
                </h3>
              </Link>
              {post.excerpt && (
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-500">
                  {post.excerpt}
                </p>
              )}
              <Link
                href={`/news/${post.slug}`}
                className="nav-underline mt-3 inline-block font-condensed text-xs font-semibold uppercase tracking-wide text-ink"
              >
                Read More
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
