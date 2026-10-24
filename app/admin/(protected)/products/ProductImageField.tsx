"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminUploader } from "@/lib/admin/upload";
import {
  PRODUCT_IMAGE_EXTENSIONS,
  PRODUCT_IMAGE_STAGING_PREFIX,
  isProductImageMime,
  productImageIsMissing,
  productImageUrls,
  psmRenditionUrls,
} from "@/lib/catalog/product-image-urls";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Product image field (D-127): the ORIGINAL file goes untouched to
 * products/_staging/{uuid}.{ext} through the shared uploader in raw mode, then
 * POST /api/admin/products/[id]/image processes it server-side and updates the
 * row. "Remove image" calls DELETE on the same route. A new product has no id
 * yet, so the uploader waits until the row is saved.
 */
export interface ProductImageState {
  image_url: string | null;
  image_storage_path: string | null;
  image_missing: boolean;
  image_error: string | null;
}

interface RouteResponse {
  ok?: boolean;
  error?: string;
  code?: string;
  product?: ProductImageState;
  image?: { urls?: Record<number, string> };
}

export function ProductImageField({
  productId,
  image,
  onChange,
  psmImageUrl,
}: {
  productId: string | null;
  image: ProductImageState;
  onChange: (next: ProductImageState) => void;
  /**
   * Defined (string or null) for a PSM-synced product (D-137): the field is
   * read-only and shows PSM's image; the P1 routes refuse writes for these rows.
   */
  psmImageUrl?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"processing" | "removing" | null>(null);
  const [error, setError] = useState<string | null>(image.image_error);
  const [uploaderKey, setUploaderKey] = useState(0);

  if (psmImageUrl !== undefined) {
    return (
      <div className="space-y-3 rounded border bg-white p-4">
        <Label>Main image</Label>
        {psmImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={psmRenditionUrls(psmImageUrl).src} alt="" className="aspect-square w-full rounded bg-neutral-50 object-contain" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded bg-neutral-100 text-xs text-neutral-400">
            no image in PS Management
          </div>
        )}
        <p className="text-[11px] text-neutral-500">
          Managed in PS Management → Resources → Product SKUs. Edit there; the website updates daily or on Publish.
        </p>
      </div>
    );
  }

  const preview = image.image_storage_path
    ? productImageUrls(image.image_storage_path)[400]
    : productImageIsMissing(image)
      ? null
      : image.image_url;

  async function process(sourcePath: string) {
    if (!productId) return;
    setBusy("processing");
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePath }),
      });
      const data = (await res.json().catch(() => ({}))) as RouteResponse;
      if (!res.ok || !data.product) {
        setError(data.error ?? `Upload failed (HTTP ${res.status}).`);
        return;
      }
      onChange({
        image_url: data.product.image_url,
        image_storage_path: data.product.image_storage_path,
        image_missing: data.product.image_missing,
        image_error: data.product.image_error,
      });
      setUploaderKey((k) => k + 1); // reset the dropzone for the next file
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!productId) return;
    setBusy("removing");
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/image`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as RouteResponse;
      if (!res.ok || !data.product) {
        setError(data.error ?? `Remove failed (HTTP ${res.status}).`);
        return;
      }
      onChange({
        image_url: data.product.image_url,
        image_storage_path: data.product.image_storage_path,
        image_missing: data.product.image_missing,
        image_error: data.product.image_error,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded border bg-white p-4">
      <Label>Main image</Label>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="aspect-square w-full rounded bg-neutral-50 object-contain" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded bg-neutral-100 text-xs text-neutral-400">
          no image
        </div>
      )}
      {image.image_storage_path ? (
        <p className="text-[11px] text-neutral-500">
          Processed · 400 / 800 / 1600 WebP · <code className="break-all">{image.image_storage_path}</code>
        </p>
      ) : preview ? (
        <p className="text-[11px] text-amber-700">Legacy link — upload a file to replace it with processed renditions.</p>
      ) : null}

      {busy === "processing" && <p className="text-sm text-neutral-600">Processing on the server…</p>}
      {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {productId ? (
        <>
          <AdminUploader
            key={uploaderKey}
            bucket="products"
            folder={PRODUCT_IMAGE_STAGING_PREFIX}
            raw
            naming="exact"
            fileNameFor={(file) => {
              const ext = isProductImageMime(file.type) ? PRODUCT_IMAGE_EXTENSIONS[file.type] : "jpg";
              return `${crypto.randomUUID()}.${ext}`;
            }}
            disabled={busy !== null}
            label={preview ? "Drop a new image to replace" : "Drop product image"}
            onUploaded={(m) => void process(m.path)}
          />
          {preview && (
            <Button type="button" variant="ghost" size="sm" className="text-red-600" disabled={busy !== null} onClick={() => void remove()}>
              {busy === "removing" ? "Removing…" : "Remove image"}
            </Button>
          )}
        </>
      ) : (
        <p className="rounded border border-dashed p-3 text-xs text-neutral-500">
          Save the product first — the image uploader unlocks once it has an id.
        </p>
      )}
    </div>
  );
}
