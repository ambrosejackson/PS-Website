"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { revalidateFor } from "@/lib/revalidate";
import { isTab } from "@/lib/merchCategories";
import type { Database } from "@/lib/database.types";

export type SettingsRow = Database["public"]["Tables"]["merch_settings"]["Row"];
export type TileRow = Database["public"]["Tables"]["merch_tab_tiles"]["Row"];
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

const admin = () => createAdminClient();

function cleanText(v: string | null | undefined, max = 200): string | null {
  const s = (v ?? "").trim();
  return s ? s.slice(0, max) : null;
}

/** Internal path or absolute http(s) URL; anything else is rejected. */
function cleanUrl(v: string | null | undefined): string | null | false {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return s.slice(0, 300);
  if (/^https?:\/\//i.test(s)) return s.slice(0, 500);
  return false;
}

export interface HomeSettingsInput {
  hero_headline: string;
  hero_subline: string;
  hero_cta_label: string;
  hero_cta_url: string;
  featured_collection_id: string | null;
  featured_cta_label: string;
  new_releases_count: number;
}

/** Upsert the single merch_settings row (D-071). */
export async function saveHomeSettings(input: HomeSettingsInput): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();

  const ctaUrl = cleanUrl(input.hero_cta_url);
  if (ctaUrl === false) return { ok: false, error: "Hero CTA URL must be a site path (/apparel/collections/…) or an https:// link." };
  const count = Math.round(Number(input.new_releases_count));
  if (!Number.isFinite(count) || count < 4 || count > 24) return { ok: false, error: "New Releases count must be between 4 and 24." };

  let featured: string | null = null;
  if (input.featured_collection_id) {
    const { data } = await db.from("merch_collections").select("id, slug").eq("id", input.featured_collection_id).maybeSingle();
    if (!data) return { ok: false, error: "Featured collection not found." };
    if (data.slug === "all") return { ok: false, error: "The reserved 'all' collection cannot be featured." };
    featured = data.id;
  }

  const { error } = await db.from("merch_settings").upsert(
    {
      id: true,
      hero_headline: cleanText(input.hero_headline, 120),
      hero_subline: cleanText(input.hero_subline, 160),
      hero_cta_label: cleanText(input.hero_cta_label, 40) ?? "View more",
      hero_cta_url: ctaUrl,
      featured_collection_id: featured,
      featured_cta_label: cleanText(input.featured_cta_label, 40) ?? "Available now",
      new_releases_count: count,
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "apparel-home" });
  return { ok: true, data: undefined };
}

export interface TileInput {
  tab: string;
  image_url: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

/** Upsert one category tile (one row per TABS slug). */
export async function saveTabTile(input: TileInput): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  if (!isTab(input.tab)) return { ok: false, error: `Unknown tab ${input.tab}.` };
  const image = (input.image_url ?? "").trim();
  if (!/^https?:\/\//.test(image)) return { ok: false, error: "Upload the tile image first." };
  const sort = Math.round(Number(input.sort_order));
  const { error } = await admin()
    .from("merch_tab_tiles")
    .upsert(
      {
        tab: input.tab,
        image_url: image,
        label: cleanText(input.label, 60),
        sort_order: Number.isFinite(sort) ? sort : 0,
        is_active: !!input.is_active,
      },
      { onConflict: "tab" },
    );
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "apparel-home" });
  return { ok: true, data: undefined };
}

export async function setTabTileActive(tab: string, active: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  if (!isTab(tab)) return { ok: false, error: `Unknown tab ${tab}.` };
  const { error } = await admin().from("merch_tab_tiles").update({ is_active: active }).eq("tab", tab);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "apparel-home" });
  return { ok: true, data: undefined };
}

export async function deleteTabTile(tab: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  if (!isTab(tab)) return { ok: false, error: `Unknown tab ${tab}.` };
  const { error } = await admin().from("merch_tab_tiles").delete().eq("tab", tab);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "apparel-home" });
  return { ok: true, data: undefined };
}
