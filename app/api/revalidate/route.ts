import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * ISR revalidation hook — called by the publish-pull job (Phase 2) after
 * upserting fresh PSM data, and by /admin after content edits.
 * Auth: Authorization: Bearer <REVALIDATE_TOKEN>.
 */

const DEFAULT_PATHS = ["/", "/products", "/store-locator", "/news"];

export async function POST(request: Request) {
  const token = process.env.REVALIDATE_TOKEN;
  const header = request.headers.get("authorization");
  if (!token || header !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let paths = DEFAULT_PATHS;
  try {
    const body = await request.json();
    if (Array.isArray(body?.paths) && body.paths.length > 0) {
      paths = body.paths.filter((p: unknown): p is string => typeof p === "string");
    }
  } catch {
    // no body — revalidate defaults
  }

  for (const path of paths) {
    revalidatePath(path);
  }
  return NextResponse.json({ revalidated: paths });
}
