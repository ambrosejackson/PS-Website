"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { deleteUploadedObject } from "@/lib/admin/upload-actions";
import { revalidateFor } from "@/lib/revalidate";
import type { Database } from "@/lib/database.types";

export type BannerRow = Database["public"]["Tables"]["content_banners"]["Row"];
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

export interface BannerInput {
  id?: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  linkUrl: string | null;
  badgeText: string | null;
  startsAt: string | null; // ISO or null
  endsAt: string | null;
  isActive: boolean;
  sortOrder: number | null;
}

function isoOrNull(v: string | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Create / update a banner slide (landing only, D-044). */
export async function saveBanner(input: BannerInput): Promise<ActionResult<{ id: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  if (!/^https?:\/\//.test(input.mediaUrl)) return { ok: false, error: "Upload the banner media first." };
  const link = input.linkUrl?.trim() || null;
  if (link && !/^(https?:\/\/|\/)/.test(link)) return { ok: false, error: "Link must start with / or https://." };
  const startsAt = isoOrNull(input.startsAt);
  const endsAt = isoOrNull(input.endsAt);
  if (startsAt && endsAt && startsAt > endsAt) return { ok: false, error: "Start must be before end." };

  const db = createAdminClient();
  const base = {
    media_url: input.mediaUrl,
    media_type: input.mediaType,
    link_url: link,
    badge_text: input.badgeText?.trim() || null,
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: !!input.isActive,
    sort_order: input.sortOrder,
  };
  let id = input.id;
  if (id) {
    const { error } = await db.from("content_banners").update(base).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: maxRow } = await db
      .from("content_banners")
      .select("sort_order")
      .order("sort_order", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await db
      .from("content_banners")
      .insert({ ...base, sort_order: input.sortOrder ?? (maxRow?.sort_order ?? 0) + 1 })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };
    id = data.id;
  }
  revalidateFor({ kind: "banners" });
  return { ok: true, data: { id: id! } };
}

export async function setBannerActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const { error } = await createAdminClient().from("content_banners").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "banners" });
  return { ok: true, data: undefined };
}

export async function reorderBanners(orderedIds: string[]): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = createAdminClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await db.from("content_banners").update({ sort_order: i + 1 }).eq("id", orderedIds[i]);
    if (error) return { ok: false, error: error.message };
  }
  revalidateFor({ kind: "banners" });
  return { ok: true, data: undefined };
}

export async function deleteBanner(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = createAdminClient();
  const { data: row } = await db.from("content_banners").select("media_url").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Banner not found." };
  const { error } = await db.from("content_banners").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await deleteUploadedObject(row.media_url);
  revalidateFor({ kind: "banners" });
  return { ok: true, data: undefined };
}
