import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import type { PostRow } from "./actions";

export const dynamic = "force-dynamic";

/** /admin/blog — posts list with published/draft filter; editor at /admin/blog/[id]. */
export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f = "all" } = await searchParams;
  let rows: PostRow[] = [];
  let loadError: string | null = null;
  try {
    let q = createAdminClient().from("blog_posts").select("*").order("published_at", { ascending: false, nullsFirst: true });
    if (f === "published") q = q.eq("is_published", true);
    if (f === "draft") q = q.eq("is_published", false);
    const { data, error } = await q;
    if (error) loadError = error.message;
    else rows = data ?? [];
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load posts.";
  }
  const tab = (key: string, label: string) => (
    <Link
      href={`/admin/blog?f=${key}`}
      className={`rounded px-3 py-1.5 text-xs font-semibold ${f === key ? "bg-neutral-900 text-white" : "border bg-white text-neutral-700 hover:bg-neutral-100"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Blog</h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-600">
            News posts — rich text (TipTap), hero image, SEO fields. Publishing revalidates /news and the post page;
            the landing &ldquo;In the News&rdquo; section shows the 3 latest published.
          </p>
        </div>
        <Button render={<Link href="/admin/blog/new">New post</Link>} />
      </div>
      <div className="flex gap-2">
        {tab("all", "All")}
        {tab("published", "Published")}
        {tab("draft", "Drafts")}
      </div>
      {loadError && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
      {!loadError && rows.length === 0 && <p className="rounded border border-dashed p-6 text-sm text-neutral-400">No posts here yet.</p>}
      {rows.length > 0 && (
        <ul className="divide-y rounded border bg-white">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded bg-neutral-100">
                {p.hero_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.hero_image} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/blog/${p.id}`} className="font-medium hover:underline">
                    {p.title}
                  </Link>
                  {p.is_published ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">Published</span>
                  ) : (
                    <span className="rounded bg-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">Draft</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  /news/{p.slug}
                  {p.published_at ? ` · ${new Date(p.published_at).toLocaleDateString()}` : ""}
                  {p.excerpt ? ` · ${p.excerpt.slice(0, 80)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" render={<Link href={`/admin/blog/${p.id}`}>Edit</Link>} />
                {p.is_published && <Button size="sm" variant="ghost" render={<Link href={`/news/${p.slug}`} target="_blank">View</Link>} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
