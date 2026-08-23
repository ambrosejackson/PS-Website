import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PostEditor } from "../PostEditor";
import type { PostRow } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminBlogEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let post: PostRow | null = null;
  if (id !== "new") {
    const { data } = await createAdminClient().from("blog_posts").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    post = data;
  }
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/blog" className="text-xs text-neutral-500 hover:underline">
          ← Blog
        </Link>
        <h1 className="mt-1 font-condensed text-2xl font-bold uppercase tracking-tight">{post ? post.title : "New post"}</h1>
        {post?.is_published && (
          <Link href={`/news/${post.slug}`} target="_blank" className="text-xs text-neutral-500 underline">
            View live /news/{post.slug}
          </Link>
        )}
      </div>
      <PostEditor post={post} />
    </div>
  );
}
