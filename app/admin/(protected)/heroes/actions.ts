"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";

/**
 * /admin/heroes server actions. Uploads go browser → Supabase Storage directly
 * via a signed upload URL minted here (service role), which keeps 50 MB MP4s
 * out of the Vercel function body limit. Every action re-verifies the staff
 * allowlist (defense in depth — proxy.ts + the admin layout already gate).
 */

import {
  HERO_ALLOWED_MIME,
  HERO_BUCKET,
  HERO_MAX_BYTES,
  type ActionResult,
} from "./hero-config";

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) throw new Error("Unauthorized");
  return user!.email!;
}

function normalizePage(page: string): string {
  const p = page.trim();
  if (!p.startsWith("/")) return `/${p}`;
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

function safeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

/** Step 1 — mint a signed upload URL for the browser to PUT the file to. */
export async function createHeroUploadUrl(input: {
  page: string;
  fileName: string;
  size: number;
  mime: string;
}): Promise<ActionResult<{ path: string; token: string; mediaType: "video" | "image" }>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }
  const mediaType = HERO_ALLOWED_MIME[input.mime];
  if (!mediaType) {
    return { ok: false, error: `Unsupported file type ${input.mime || "(unknown)"}. Use MP4, JPEG, PNG or WebP.` };
  }
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > HERO_MAX_BYTES) {
    return { ok: false, error: "File must be between 1 byte and 50 MB." };
  }
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." };
  }
  const page = normalizePage(input.page);
  const folder = page === "/" ? "landing" : page.slice(1).replace(/\//g, "-");
  const path = `${folder}/${Date.now()}-${safeFileName(input.fileName)}`;
  const { data, error } = await admin.storage
    .from(HERO_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create upload URL." };
  }
  return { ok: true, data: { path: data.path, token: data.token, mediaType } };
}

/** Step 2 — after the browser upload succeeds, write the content_heroes row. */
export async function saveHeroRow(input: {
  page: string;
  path: string;
  mediaType: "video" | "image";
  theme: "light" | "dark";
  isDefault: boolean;
  navTarget: string | null;
}): Promise<ActionResult<{ id: string; mediaUrl: string }>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." };
  }
  const page = normalizePage(input.page);
  const { data: pub } = admin.storage.from(HERO_BUCKET).getPublicUrl(input.path);
  const mediaUrl = pub.publicUrl;

  if (input.isDefault) {
    // One default per page.
    const { error } = await admin
      .from("content_heroes")
      .update({ is_default: false })
      .eq("page", page)
      .eq("is_default", true);
    if (error) return { ok: false, error: error.message };
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
      nav_target: input.navTarget?.trim() ? input.navTarget.trim().toUpperCase() : null,
      media_url: mediaUrl,
      media_type: input.mediaType,
      theme: input.theme,
      is_default: input.isDefault,
      sort_order: (maxRow?.sort_order ?? 0) + 1,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };

  revalidatePath(page);
  revalidatePath("/admin/heroes");
  return { ok: true, data: { id: data.id, mediaUrl } };
}

export async function updateHeroFlags(input: {
  id: string;
  isDefault?: boolean;
  isActive?: boolean;
  theme?: "light" | "dark";
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." };
  }
  const { data: row, error: readErr } = await admin
    .from("content_heroes")
    .select("id, page")
    .eq("id", input.id)
    .maybeSingle();
  if (readErr || !row) return { ok: false, error: "Hero not found." };

  if (input.isDefault === true) {
    const { error } = await admin
      .from("content_heroes")
      .update({ is_default: false })
      .eq("page", row.page)
      .eq("is_default", true);
    if (error) return { ok: false, error: error.message };
  }
  const patch: { is_default?: boolean; is_active?: boolean; theme?: string } = {};
  if (input.isDefault !== undefined) patch.is_default = input.isDefault;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.theme !== undefined) patch.theme = input.theme;
  const { error } = await admin.from("content_heroes").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(row.page);
  revalidatePath("/admin/heroes");
  return { ok: true, data: undefined };
}

export async function deleteHero(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." };
  }
  const { data: row } = await admin
    .from("content_heroes")
    .select("id, page, media_url")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Hero not found." };

  const { error } = await admin.from("content_heroes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Remove the storage object too when it lives in our bucket.
  const marker = `/object/public/${HERO_BUCKET}/`;
  const idx = row.media_url.indexOf(marker);
  if (idx !== -1) {
    const objectPath = decodeURIComponent(row.media_url.slice(idx + marker.length));
    await admin.storage.from(HERO_BUCKET).remove([objectPath]);
  }

  revalidatePath(row.page);
  revalidatePath("/admin/heroes");
  return { ok: true, data: undefined };
}
