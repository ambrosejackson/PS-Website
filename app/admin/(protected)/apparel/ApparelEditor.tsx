"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BRANDS } from "@/lib/brands";
import { slugify } from "@/lib/sheet-sync/map";
import { AdminUploader } from "@/lib/admin/upload";
import { CATEGORIES, RESERVED_PRODUCT_SLUGS, tabLabel } from "@/lib/merchCategories";
import { normalizeImages, type MerchImage, type MerchImageRole } from "@/lib/merchImages";
import { STOCK_BADGE_LABEL, stockBadge } from "@/lib/merchStock";
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

export type CollectionOption = { id: string; name: string; slug: string };

type VariantDraft = VariantInput & { key: string; skuTouched: boolean };
type ImageDraft = MerchImage & { key: string };

/** ISO → <input type="datetime-local"> value (local time). */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ApparelEditor({
  product,
  variants,
  collections,
}: {
  product: MerchRow | null;
  variants: VariantRow[];
  collections: CollectionOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "taken" | "reserved">("idle");
  const [description, setDescription] = useState(product?.description ?? "");
  const [brand, setBrand] = useState<string>(product?.brand ?? HOUSE_BRAND);
  const [images, setImages] = useState<ImageDraft[]>(() =>
    normalizeImages(product?.images).map((i, n) => ({ ...i, key: `${n}-${i.url}` })),
  );
  const [provider, setProvider] = useState<FulfillmentProvider>(
    (FULFILLMENT_PROVIDERS as readonly string[]).includes(product?.fulfillment_provider ?? "")
      ? (product!.fulfillment_provider as FulfillmentProvider)
      : "self",
  );
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState<string>(product?.sort_order?.toString() ?? "");
  const [collectionId, setCollectionId] = useState<string>(product?.collection_id ?? "");
  const [category, setCategory] = useState<string>(product?.category ?? "");
  const [threshold, setThreshold] = useState<string>(String(product?.low_stock_threshold ?? 3));
  const [releasedAt, setReleasedAt] = useState<string>(toLocalInput(product?.released_at));
  const [rows, setRows] = useState<VariantDraft[]>(
    variants.map((v) => ({
      key: v.id,
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      price: (v.price_cents / 100).toFixed(2),
      stock_qty: v.stock_qty === null ? "" : String(v.stock_qty),
      is_active: v.is_active,
      skuTouched: true,
    })),
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const brandValue = brand === HOUSE_BRAND ? null : brand;
  const variantColors = [...new Set(rows.map((r) => (r.color ?? "").trim()).filter(Boolean))];

  // Badge preview — same helper as the storefront (D-066).
  const badge = stockBadge(
    rows.map((r) => ({
      size: r.size,
      color: r.color,
      stock_qty: r.stock_qty.trim() === "" ? null : Number(r.stock_qty),
      is_active: r.is_active,
    })),
    Number(threshold) || 0,
  );
  const trackedCount = rows.filter((r) => r.is_active && r.stock_qty.trim() !== "").length;

  // ---- slug (handler-driven debounce; no setState in effects)
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSlugCheck(s: string) {
    if (!s) return;
    if ((RESERVED_PRODUCT_SLUGS as readonly string[]).includes(s)) {
      setSlugState("reserved");
      return;
    }
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
      { key, sku: suggestSku(brandValue, slug, null, null), size: "", color: "", price: "", stock_qty: "", is_active: true, skuTouched: false },
    ]);
  }

  // ---- images (drag to reorder; first = cover; colour + role tags)
  function moveImage(from: number, to: number) {
    setImages((arr) => {
      const next = [...arr];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }
  function patchImage(key: string, p: Partial<MerchImage>) {
    setImages((arr) => arr.map((i) => (i.key === key ? { ...i, ...p } : i)));
  }
  /** "Set as hover": this image becomes the (only) hover image for its colour. */
  function setAsHover(key: string) {
    setImages((arr) => {
      const target = arr.find((i) => i.key === key);
      if (!target) return arr;
      const c = (target.color ?? "").toUpperCase();
      return arr.map((i) => {
        if (i.key === key) return { ...i, role: "hover" as MerchImageRole };
        if (i.role === "hover" && (i.color ?? "").toUpperCase() === c) return { ...i, role: null };
        return i;
      });
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (slugState === "taken") {
      setError("Slug is already in use.");
      return;
    }
    if (slugState === "reserved") {
      setError(`"${slug}" is a reserved shop route.`);
      return;
    }
    const input: MerchInput = {
      id: product?.id,
      name,
      slug,
      description: description || null,
      brand: brandValue,
      images: images.map((i) => ({ url: i.url, alt: i.alt, color: i.color, role: i.role })),
      fulfillment_provider: provider,
      is_active: isActive,
      sort_order: sortOrder.trim() ? Number(sortOrder) : null,
      collection_id: collectionId || null,
      category: category || null,
      low_stock_threshold: Number(threshold),
      released_at: releasedAt,
      variants: rows.map((r) => ({ id: r.id, sku: r.sku, size: r.size, color: r.color, price: r.price, stock_qty: r.stock_qty, is_active: r.is_active })),
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

  const selectCls = "h-9 w-full rounded-md border bg-white px-3 text-sm";
  const smallSelect = "h-7 rounded border bg-white px-1.5 text-xs";

  return (
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div className="space-y-5 rounded border bg-white p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-name">
                Name{" "}
                {badge && (
                  <span className="ml-1 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" title="Storefront badge preview (same rule as the card)">
                    {STOCK_BADGE_LABEL[badge]}
                  </span>
                )}
                {!badge && trackedCount > 0 && <span className="ml-1 text-[10px] uppercase text-neutral-400">in stock</span>}
                {!badge && trackedCount === 0 && rows.length > 0 && <span className="ml-1 text-[10px] uppercase text-neutral-400">made to order</span>}
              </Label>
              <Input id="m-name" value={name} onChange={(e) => onNameChange(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-slug">
                Slug{" "}
                {slugState === "checking" && <span className="text-xs text-neutral-500">checking…</span>}
                {slugState === "ok" && slug && <span className="text-xs text-green-700">available</span>}
                {slugState === "taken" && <span className="text-xs text-red-600">already in use</span>}
                {slugState === "reserved" && <span className="text-xs text-red-600">reserved route</span>}
              </Label>
              <Input id="m-slug" value={slug} onChange={(e) => onSlugChange(e.target.value)} className="font-mono" />
              <p className="text-xs text-neutral-500">/apparel/{slug || "…"}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-brand">Brand attribution</Label>
              <select id="m-brand" value={brand} onChange={(e) => onBrandChange(e.target.value)} className={selectCls}>
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
              <select id="m-provider" value={provider} onChange={(e) => setProvider(e.target.value as FulfillmentProvider)} className={selectCls}>
                {FULFILLMENT_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {FULFILLMENT_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-collection">Collection</Label>
              <select id="m-collection" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className={selectCls}>
                <option value="">— None —</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-category">Category</Label>
              <select id="m-category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
                <option value="">— None —</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label} · {tabLabel(c.tab)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-released">Released at (New Releases order)</Label>
              <Input id="m-released" type="datetime-local" value={releasedAt} onChange={(e) => setReleasedAt(e.target.value)} />
              {!product && <p className="text-xs text-neutral-500">Blank = now.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-threshold">Low stock threshold</Label>
              <Input id="m-threshold" type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-28" />
              <p className="text-xs text-neutral-500">Badge when a tracked size has 1–{threshold || 0} left.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-desc">Description</Label>
            <textarea id="m-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-3 rounded border bg-white p-5">
          <div className="flex items-center justify-between">
            <Label>Variants (size / color / price / stock)</Label>
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
                    <th className="py-1 pr-2" title="Blank = made to order (never badged). Number = tracked.">
                      Stock
                    </th>
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
                          value={r.stock_qty}
                          onChange={(e) => updateRow(r.key, { stock_qty: e.target.value })}
                          placeholder="—"
                          inputMode="numeric"
                          className={`h-8 w-20 ${r.stock_qty.trim() === "0" ? "border-red-400" : ""}`}
                          title="Blank = made to order"
                        />
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
          <p className="text-xs text-neutral-500">
            Stock blank = made to order (Printify/Tapstitch) — never badged. A number = tracked: <strong>0</strong> = that size sold out (disabled on the card),
            1–threshold = Low Stock, all sizes 0 = Sold Out.
          </p>
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
          <Label>Images (first = cover · drag to reorder · 1:1)</Label>
          <p className="text-xs text-neutral-500">
            Tag each image with its colour so swatches and the PDP resolve per colour. Mark one image per colour as <strong>hover</strong> for the
            card crossfade — untagged images never crossfade.
          </p>
          {images.length > 0 && (
            <ul className="space-y-2">
              {images.map((img, i) => (
                <li
                  key={img.key}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx !== null && dragIdx !== i) moveImage(dragIdx, i);
                    setDragIdx(null);
                  }}
                  className={`flex cursor-grab gap-2 rounded border p-2 ${i === 0 ? "ring-2 ring-neutral-900" : ""} ${img.role === "hover" ? "bg-blue-50/40" : ""}`}
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-neutral-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-0.5 top-0.5 rounded bg-neutral-900 px-1 py-px text-[9px] font-bold uppercase text-white">cover</span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <select value={img.color ?? ""} onChange={(e) => patchImage(img.key, { color: e.target.value || null })} className={smallSelect} title="Colour">
                        <option value="">colour: any</option>
                        {variantColors.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        {img.color && !variantColors.includes(img.color) && <option value={img.color}>{img.color} (no variant)</option>}
                      </select>
                      <select value={img.role ?? ""} onChange={(e) => patchImage(img.key, { role: (e.target.value || null) as MerchImageRole | null })} className={smallSelect} title="Role">
                        <option value="">role: —</option>
                        <option value="primary">primary</option>
                        <option value="hover">hover</option>
                      </select>
                      {img.role !== "hover" && (
                        <button type="button" onClick={() => setAsHover(img.key)} className="rounded border px-1.5 py-0.5 text-[11px] hover:bg-neutral-100">
                          Set as hover
                        </button>
                      )}
                    </div>
                    <Input value={img.alt ?? ""} onChange={(e) => patchImage(img.key, { alt: e.target.value || null })} placeholder="Alt text" className="h-7 text-xs" maxLength={160} />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => setImages((arr) => arr.filter((x) => x.key !== img.key))}
                    className="self-start rounded px-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          {variantColors.length === 0 && images.length > 0 && (
            <p className="text-xs text-amber-700">Add variant colours first to tag images by colour.</p>
          )}
          <AdminUploader
            bucket="apparel"
            folder={slug || undefined}
            label="Drop apparel image (add as many as you like)"
            onUploaded={(m) => setImages((arr) => [...arr, { key: `${Date.now()}-${m.url}`, url: m.url }])}
          />
        </div>
      </aside>
    </form>
  );
}
