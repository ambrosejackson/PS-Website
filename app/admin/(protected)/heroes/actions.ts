"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { deleteUploadedObject } from "@/lib/admin/upload-actions";
import { revalidateFor } from "@/lib/revalidate";
import { HERO_PAGES, NAV_TARGETS, type ActionResult } from "./hero-config";

/**
 * /admin/heroes server actions (D-044: heroes admin-managed on every public
 * page; hover-swap mapping on landing only). Uploads go through the shared
 * AdminUploader (signed URL → heroes bucket); these actions write/patch rows,
 * enforce exactly one default per page, and revalidate the page.
 */

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

function normalizePage(page: string): string {
  const p = page.trim();
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
}

function normalizeNavTarget(page: string, raw: string | null | undefined): string | null {
  if (page !== "/") return null; // landing only (D-044)
  const v = (raw ?? "").trim().toUpperCase();
  if (!v) return null;
  return NAV_TARGETS.some((t) => t.value === v) ? v : null;
}

export async function saveHeroRow(input: {
  page: string;
  mediaUrl: string;
  mediaType: "video" | "image";
  theme: "light" | "dark";
  isDefault: boolean;
  navTarget: string | null;
  /** First-frame webp for video heroes (captured client-side at upload). */
  posterUrl?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const page = normalizePage(input.page);
  if (!HERO_PAGES.some((p) => p.page === page)) return { ok: false, error: `Unknown page ${page}.` };
  if (!/^https?:\/\//.test(input.mediaUrl)) return { ok: false, error: "Upload the media first." };
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." };
  }
  const navTarget = normalizeNavTarget(page, input.navTarget);

  // A hover-target asset can't also be the default; exactly one default per page.
  const isDefault = navTarget ? false : input.isDefault;
  if (isDefault) {
    const { error } = await admin.from("content_heroes").update({ is_default: false }).eq("page", page).eq("is_default", true);
    if (error) return { ok: false, error: error.message };
  }
  // One asset per nav target on the landing page.
  if (navTarget) {
    await admin.from("content_heroes").update({ nav_target: null }).eq("page", page).eq("nav_target", navTarget);
  }
  const { data: maxRow } = await admin
    .from("content_heroes")
    .select("sort_order")
    .eq("page", page)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await admin
    .from("content_heroes")
    .insert({
      page,
      nav_target: navTarget,
      media_url: input.mediaUrl,
      media_type: input.mediaType,
      poster_url: input.mediaType === "video" ? (input.posterUrl ?? null) : null,
      theme: input.theme,
      is_default: isDefault,
      sort_order: (maxRow?.sort_order ?? 0) + 1,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };
  revalidateFor({ kind: "heroes", page });
  return { ok: true, data: { id: data.id } };
}

export async function updateHero(input: {
  id: string;
  isDefault?: boolean;
  isActive?: boolean;
  theme?: "light" | "dark";
  navTarget?: string | null;
  posterUrl?: string | null;
}): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." };
  }
  const { data: row } = await admin.from("content_heroes").select("id, page, nav_target").eq("id", input.id).maybeSingle();
  if (!row) return { ok: false, error: "Hero not found." };

  const patch: { is_default?: boolean; is_active?: boolean; theme?: string; nav_target?: string | null; poster_url?: string | null } = {};
  if (input.posterUrl !== undefined) patch.poster_url = input.posterUrl;
  if (input.navTarget !== undefined) {
    const nt = normalizeNavTarget(row.page, input.navTarget);
    patch.nav_target = nt;
    if (nt) {
      await admin.from("content_heroes").update({ nav_target: null }).eq("page", row.page).eq("nav_target", nt).neq("id", row.id);
      patch.is_default = false;
    }
  }
  if (input.isDefault === true) {
    const { error } = await admin.from("content_heroes").update({ is_default: false }).eq("page", row.page).eq("is_default", true);
    if (error) return { ok: false, error: error.message };
    patch.is_default = true;
    patch.nav_target = null; // the default is the resting asset, not a hover target
  } else if (input.isDefault === false) patch.is_default = false;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.theme !== undefined) patch.theme = input.theme;

  const { error } = await admin.from("content_heroes").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "heroes", page: row.page });
  return { ok: true, data: undefined };
}

export async function deleteHero(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." };
  }
  const { data: row } = await admin.from("content_heroes").select("id, page, media_url").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Hero not found." };
  const { error } = await admin.from("content_heroes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await deleteUploadedObject(row.media_url); // no-op for non-bucket URLs
  revalidateFor({ kind: "heroes", page: row.page });
  return { ok: true, data: undefined };
}
