import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/events/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";
import { ProductImageError } from "./product-image";

/**
 * Shared plumbing for the /api/admin/products/* image routes: the cookie-
 * session admin check (lib/events/staff.requireAdmin — same gate as /admin
 * server actions), the service-role client, and one error → JSON mapping.
 */

export type ProductRow = Database["public"]["Tables"]["catalog_products"]["Row"];

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export function errorResponse(e: unknown) {
  if (e instanceof ProductImageError) {
    const status =
      e.code === "storage" ? 502 : e.code === "invalid_product_id" ? 400 : e.code === "too_large" ? 413 : 422;
    return json({ error: e.message, code: e.code }, status);
  }
  const message = e instanceof Error ? e.message : "Unexpected error";
  if (message === "Unauthorized") return json({ error: "Unauthorized" }, 401);
  console.error("[admin/products image]", e);
  return json({ error: message }, 500);
}

/** Admin gate + service-role client, or a ready-made 401/500 response. */
export async function adminContext(): Promise<
  { ok: true; email: string; admin: ReturnType<typeof createAdminClient> } | { ok: false; response: NextResponse }
> {
  let email: string;
  try {
    email = await requireAdmin();
  } catch {
    return { ok: false, response: json({ error: "Unauthorized" }, 401) };
  }
  try {
    return { ok: true, email, admin: createAdminClient() };
  } catch (e) {
    return { ok: false, response: errorResponse(e) };
  }
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
