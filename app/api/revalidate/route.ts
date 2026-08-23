import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAllowedRevalidatePath, pathsFor, type RevalidateTarget } from "@/lib/revalidate";

/**
 * ISR revalidation hook for OUT-OF-PROCESS callers (the PSM publish job, ops).
 * In-process admin mutations call lib/revalidate.revalidateFor() directly.
 *
 * Auth: `Authorization: Bearer <REVALIDATE_TOKEN>` (constant-time compare).
 * Body (JSON, optional):
 *   { "targets": [{ "kind": "products", "brand": "TerpKings", "slug": "…" }, …] }
 *   and/or { "paths": ["/", "/products"] } — paths must match the allowlist in
 *   lib/revalidate.ts; anything else is rejected (400), never silently dropped.
 * No body → the default set.
 */

const DEFAULT_PATHS = ["/", "/products", "/store-locator", "/news"];
const MAX_PATHS = 50;
const KINDS = new Set(["products", "apparel", "heroes", "banners", "blog", "messages"]);

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  const token = process.env.REVALIDATE_TOKEN;
  const header = request.headers.get("authorization") ?? "";
  if (!token || !timingSafeEqual(header, `Bearer ${token}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { paths?: unknown; targets?: unknown } | null = null;
  const raw = await request.text();
  if (raw.trim()) {
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
    }
  }

  const paths = new Set<string>();

  if (body && Array.isArray(body.targets)) {
    for (const t of body.targets) {
      if (!t || typeof t !== "object" || !KINDS.has((t as { kind?: string }).kind ?? "")) {
        return NextResponse.json({ error: "Invalid target." }, { status: 400 });
      }
      for (const p of pathsFor(t as RevalidateTarget)) paths.add(p);
    }
  }
  if (body && Array.isArray(body.paths)) {
    for (const p of body.paths) {
      if (typeof p !== "string" || !isAllowedRevalidatePath(p)) {
        return NextResponse.json({ error: `Path not allowed: ${String(p)}` }, { status: 400 });
      }
      paths.add(p);
    }
  }
  if (body && !Array.isArray(body.targets) && !Array.isArray(body.paths)) {
    return NextResponse.json({ error: "Provide targets[] and/or paths[]." }, { status: 400 });
  }
  if (!body) DEFAULT_PATHS.forEach((p) => paths.add(p));

  if (paths.size === 0) return NextResponse.json({ revalidated: [] });
  if (paths.size > MAX_PATHS) {
    return NextResponse.json({ error: `Too many paths (max ${MAX_PATHS}).` }, { status: 400 });
  }

  const list = [...paths];
  for (const path of list) revalidatePath(path);
  return NextResponse.json({ revalidated: list });
}
