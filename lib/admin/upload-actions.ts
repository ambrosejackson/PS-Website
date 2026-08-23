"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import {
  isAdminBucket,
  mediaKindFor,
  validateForBucket,
  type AdminBucket,
  type MediaKind,
} from "@/lib/admin/buckets";

/**
 * Server side of the admin uploader: after the staff-allowlist check, mint a
 * service-role signed upload URL for ONE object in an admin bucket. The browser
 * then PUTs the bytes straight to Supabase Storage (no Vercel body limit), and
 * the caller stores the returned public URL. Bucket rules are re-validated here
 * so the client can't bypass them.
 */

export type SignedUploadResult =
  | {
      ok: true;
      data: { bucket: AdminBucket; path: string; token: string; publicUrl: string; kind: MediaKind };
    }
  | { ok: false; error: string };

function safeFileName(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");
  return base.slice(-80) || "file";
}

export async function createSignedUpload(input: {
  bucket: string;
  /** Optional sub-folder inside the bucket, e.g. a page slug or product id. */
  folder?: string;
  fileName: string;
  size: number;
  mime: string;
}): Promise<SignedUploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) return { ok: false, error: "Unauthorized." };

  if (!isAdminBucket(input.bucket)) {
    return { ok: false, error: `Unknown bucket "${input.bucket}".` };
  }
  const bucket = input.bucket;
  const problem = validateForBucket(bucket, input.mime, input.size);
  if (problem) return { ok: false, error: problem };
  const kind = mediaKindFor(bucket, input.mime)!;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." };
  }

  const folder = (input.folder ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/^\/+|\/+$/g, "");
  const path = `${folder ? folder + "/" : ""}${Date.now()}-${safeFileName(input.fileName)}`;

  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create upload URL." };
  }
  const { data: pub } = admin.storage.from(bucket).getPublicUrl(data.path);
  return {
    ok: true,
    data: { bucket, path: data.path, token: data.token, publicUrl: pub.publicUrl, kind },
  };
}

/** Remove an object we uploaded earlier, given its public URL (no-op for foreign URLs). */
export async function deleteUploadedObject(publicUrl: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) return { ok: false, error: "Unauthorized." };

  const m = publicUrl.match(/\/object\/public\/([^/]+)\/(.+)$/);
  if (!m || !isAdminBucket(m[1])) return { ok: true };
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." };
  }
  const { error } = await admin.storage.from(m[1]).remove([decodeURIComponent(m[2])]);
  return error ? { ok: false, error: error.message } : { ok: true };
}
