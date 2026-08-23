"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { revalidateFor } from "@/lib/revalidate";
import { slugifyTitle } from "@/lib/blog";
import type { Database, Json } from "@/lib/database.types";

export type PostRow = Database["public"]["Tables"]["blog_posts"]["Row"];
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

export interface PostInput {
  id?: string;
  title: string;
  slug: string;
  excerpt: string | null;
  heroImage: string | null;
  /** TipTap document JSON (stringified) */
  bodyJson: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export async function checkPostSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  let q = createAdminClient().from("blog_posts").select("id").eq("slug", slug).limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return !data || data.length === 0;
}

/** Save draft/published content. Slug is LOCKED once the post has ever been published (published_at set). */
export async function savePost(input: PostInput): Promise<ActionResult<{ id: string; slug: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  const db = createAdminClient();
  const seo = {
    title: input.seoTitle?.trim() || null,
    description: input.seoDescription?.trim() || null,
  } as unknown as Json;
  const base = {
    title,
    excerpt: input.excerpt?.trim() || null,
    hero_image: input.heroImage?.trim() || null,
    body_md: input.bodyJson ?? null,
    seo,
  };

  if (input.id) {
    const { data: existing } = await db.from("blog_posts").select("slug, published_at, is_published").eq("id", input.id).maybeSingle();
    if (!existing) return { ok: false, error: "Post not found." };
    const locked = !!existing.published_at;
    const slug = locked ? existing.slug : slugifyTitle(input.slug || title);
    if (!slug) return { ok: false, error: "Slug is required." };
    if (!locked && slug !== existing.slug && !(await checkPostSlugAvailable(slug, input.id))) {
      return { ok: false, error: `Slug "${slug}" is already in use.` };
    }
    const { error } = await db.from("blog_posts").update({ ...base, slug }).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    if (existing.is_published) revalidateFor({ kind: "blog", slug }, { kind: "blog", slug: existing.slug });
    return { ok: true, data: { id: input.id, slug } };
  }

  const slug = slugifyTitle(input.slug || title);
  if (!slug) return { ok: false, error: "Slug is required." };
  if (!(await checkPostSlugAvailable(slug))) return { ok: false, error: `Slug "${slug}" is already in use.` };
  const { data, error } = await db
    .from("blog_posts")
    .insert({ ...base, slug, is_published: false, published_at: null })
    .select("id, slug")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };
  return { ok: true, data: { id: data.id, slug: data.slug } };
}

/** Publish (sets published_at on first publish, keeps it after) / unpublish. Revalidates /news + the post. */
export async function setPostPublished(id: string, published: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = createAdminClient();
  const { data: row } = await db.from("blog_posts").select("slug, published_at, title, body_md").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Post not found." };
  if (published && !row.title.trim()) return { ok: false, error: "Give the post a title before publishing." };
  const { error } = await db
    .from("blog_posts")
    .update({ is_published: published, published_at: published ? (row.published_at ?? new Date().toISOString()) : row.published_at })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "blog", slug: row.slug });
  return { ok: true, data: undefined };
}

export async function deletePost(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = createAdminClient();
  const { data: row } = await db.from("blog_posts").select("slug, is_published").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Post not found." };
  const { error } = await db.from("blog_posts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "blog", slug: row.slug });
  return { ok: true, data: undefined };
}
