import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { BlogPost } from "@/lib/data";

export function InTheNews({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="bg-neutral-50 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-3xl tracking-[0.18em] text-neutral-900 md:text-4xl">
            IN THE NEWS
          </h2>
          <Button render={<Link href="/news">See More</Link>} variant="outline" />
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {posts.slice(0, 3).map((post) => (
            <article key={post.id} className="group">
              <Link href={`/news/${post.slug}`} className="block">
                <div className="aspect-[8/5] overflow-hidden rounded-sm bg-neutral-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.hero_image ?? "/placeholders/blog-1.svg"}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-4 font-serif text-xl text-neutral-900">
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
                className="nav-underline mt-3 inline-block text-xs font-medium tracking-[0.2em] text-neutral-900"
              >
                READ MORE
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
