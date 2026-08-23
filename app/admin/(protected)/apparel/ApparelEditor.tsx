"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BRANDS } from "@/lib/brands";
import { slugify } from "@/lib/sheet-sync/map";
import { AdminUploader } from "@/lib/admin/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkMerchSlugAvailable,
  saveMerch,
  type MerchInput,
  type MerchRow,
  type VariantInput,
  type VariantRow,
} from "./actions";
import {
  FULFILLMENT_LABEL,
  FULFILLMENT_PROVIDERS,
  HOUSE_BRAND,
  suggestSku,
  type FulfillmentProvider,
} from "./apparel-config";

type VariantDraft = VariantInput & { key: string; skuTouched: boolean };

export function ApparelEditor({ product, variants }: { product: MerchRow | null; variants: VariantRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [description, setDescription] = useState(product?.description ?? "");
  const [brand, setBrand] = useState<string>(product?.brand ?? HOUSE_BRAND);
  const [images, setImages] = useState<string[]>(Array.isArray(product?.images) ? (product!.images as string[]) : []);
  const [provider, setProvider] = useState<FulfillmentProvider>(
    (FULFILLMENT_PROVIDERS as readonly string[]).includes(product?.fulfillment_provider ?? "")
      ? (product!.fulfillment_provider as FulfillmentProvider)
      : "self",
  );
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState<string>(product?.sort_order?.toString() ?? "");
  const [rows, setRows] = useState<VariantDraft[]>(
    variants.map((v) => ({
      key: v.id,
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      price: (v.price_cents / 100).toFixed(2),
      is_active: v.is_active,
      skuTouched: true,
    })),
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const brandValue = brand === HOUSE_BRAND ? null : brand;

  // ---- slug (handler-driven debounce; no setState in effects)
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSlugCheck(s: string) {
    if (!s) return;
    if (s === product?.slug) {
      setSlugState("ok");
      return;
    }
    setSlugState("checking");
    if (slugTimer.current) clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(async () => {
      const free = await checkMerchSlugAvailable(s, product?.id);
      setSlugState(free ? "ok" : "taken");
    }, 400);
  }
  function applySlug(s: string) {
    setSlug(s);
    scheduleSlugCheck(s);
    // Re-suggest untouched SKUs.
    setRows((rs) => rs.map((r) => (r.skuTouched ? r : { ...r, sku: suggestSku(brandValue, s, r.size, r.color) })));
  }
  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) applySlug(slugify(v));
  }
  function onSlugChange(v: string) {
    setSlugTouched(true);
    applySlug(slugify(v));
  }
  function onBrandChange(b: string) {
    setBrand(b);
    const bv = b === HOUSE_BRAND ? null : b;
    setRows((rs) => rs.map((r) => (r.skuTouched ? r : { ...r, sku: suggestSku(bv, slug, r.size, r.color) })));
  }

  // ---- variants
  function updateRow(key: string, patch: Partial<VariantDraft>) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if (!next.skuTouched && ("size" in patch || "color" in patch)) {
          next.sku = suggestSku(brandValue, slug, next.size, next.color);
        }
        return next;
      }),
    );
  }
  function addRow() {
    const key = `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setRows((rs) => [
      ...rs,
      { key, sku: suggestSku(brandValue, slug, null, null), size: "", color: "", price: "", is_active: true, skuTouched: false },
    ]);
  }

  // ---- images (drag to reorder; first = cover)
  function moveImage(from: number, to: number) {
    setImages((arr) => {
      const next = [...arr];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (slugState === "taken") {
      setError("Slug is already in use.");
      return;
    }
    const input: MerchInput = {
      id: product?.id,
      name,
      slug,
      description: description || null,
      brand: brandValue,
      images,
      fulfillment_provider: provider,
      is_active: isActive,
      sort_order: sortOrder.trim() ? Number(sortOrder) : null,
      variants: rows.map((r) => ({ id: r.id, sku: r.sku, size: r.size, color: r.color, price: r.price, is_active: r.is_active })),
    };
    start(async () => {
      const res = await saveMerch(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/admin/apparel?saved=${encodeURIComponent(res.data.slug)}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="space-y-5 rounded border bg-white p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-name">Name</Label>
              <Input id="m-name" value={name} onChange={(e) => onNameChange(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-slug">
                Slug{" "}
                {slugState === "checking" && <span className="text-xs text-neutral-500">checking…</span>}
                {slugState === "ok" && slug && <span className="text-xs text-green-700">available</span>}
                {slugState === "taken" && <span className="text-xs text-red-600">already in use</span>}
              </Label>
              <Input id="m-slug" value={slug} onChange={(e) => onSlugChange(e.target.value)} className="font-mono" />
              <p className="text-xs text-neutral-500">/apparel/{slug || "…"}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-brand">Brand attribution</Label>
              <select id="m-brand" value={brand} onChange={(e) => onBrandChange(e.target.value)} className="h-9 w-full rounded-md border px-3 text-sm">
                <option value={HOUSE_BRAND}>{HOUSE_BRAND}</option>
                {BRANDS.map((b) => (
                  <option key={b.slug} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-provider">Who fulfills this when ordered</Label>
              <select
                id="m-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as FulfillmentProvider)}
                className="h-9 w-full rounded-md border px-3 text-sm"
              >
                {FULFILLMENT_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {FULFILLMENT_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-desc">Description</Label>
            <textarea id="m-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-3 rounded border bg-white p-5">
          <div className="flex items-center justify-between">
            <Label>Variants (size / color / price)</Label>
            <Button type="button" size="sm" variant="outline" onClick={addRow}>
              + Add variant
            </Button>
          </div>
          {rows.length === 0 && (
            <p className="rounded border border-dashed p-4 text-xs text-neutral-500">
              No variants yet — a product needs at least one active variant to be purchasable.
            </p>
          )}
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="py-1 pr-2">Size</th>
                    <th className="py-1 pr-2">Color</th>
                    <th className="py-1 pr-2">Price ($)</th>
                    <th className="py-1 pr-2">SKU</th>
                    <th className="py-1 pr-2">Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} className="border-t">
                      <td className="py-1 pr-2">
                        <Input value={r.size ?? ""} onChange={(e) => updateRow(r.key, { size: e.target.value })} placeholder="M" className="h-8 w-24" />
                      </td>
                      <td className="py-1 pr-2">
                        <Input value={r.color ?? ""} onChange={(e) => updateRow(r.key, { color: e.target.value })} placeholder="Black" className="h-8 w-32" />
                      </td>
                      <td className="py-1 pr-2">
                        <Input value={r.price} onChange={(e) => updateRow(r.key, { price: e.target.value })} placeholder="35.00" inputMode="decimal" className="h-8 w-24" />
                      </td>
                      <td className="py-1 pr-2">
                        <Input
                          value={r.sku}
                          onChange={(e) => updateRow(r.key, { sku: e.target.value.toUpperCase(), skuTouched: true })}
                          className="h-8 min-w-44 font-mono text-xs"
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <button
                          type="button"
                          onClick={() => updateRow(r.key, { is_active: !r.is_active })}
                          className={`rounded px-2 py-1 text-[11px] font-bold uppercase ${r.is_active ? "bg-green-600 text-white" : "bg-neutral-200 text-neutral-700"}`}
                        >
                          {r.is_active ? "on" : "off"}
                        </button>
                      </td>
                      <td className="py-1">
                        <Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : product ? "Save changes" : "Create product"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/apparel")}>
            Cancel
          </Button>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="space-y-3 rounded border bg-white p-4">
          <Label>Visibility</Label>
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`w-full rounded px-3 py-2 text-xs font-bold uppercase tracking-wide ${isActive ? "bg-green-600 text-white" : "bg-neutral-200 text-neutral-700"}`}
          >
            {isActive ? "Active in the shop" : "Inactive"}
          </button>
          <div className="space-y-1.5">
            <Label htmlFor="m-sort">Sort order</Label>
            <Input id="m-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3 rounded border bg-white p-4">
          <Label>Images (first = cover · drag to reorder)</Label>
          {images.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {images.map((url, i) => (
                <li
                  key={url + i}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx !== null && dragIdx !== i) moveImage(dragIdx, i);
                    setDragIdx(null);
                  }}
                  className={`group relative aspect-square cursor-grab overflow-hidden rounded border bg-neutral-50 ${i === 0 ? "ring-2 ring-neutral-900" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                      cover
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => setImages((arr) => arr.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs text-red-600 opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <AdminUploader
            bucket="apparel"
            folder={slug || undefined}
            label="Drop apparel image (add as many as you like)"
            onUploaded={(m) => setImages((arr) => [...arr, m.url])}
          />
        </div>
      </aside>
    </form>
  );
}
