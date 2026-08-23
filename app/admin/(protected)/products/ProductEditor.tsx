"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BRANDS } from "@/lib/brands";
import { slugify } from "@/lib/sheet-sync/map";
import { AdminUploader } from "@/lib/admin/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkSlugAvailable, saveProduct, type ProductInput, type ProductRow, type TerpeneEntry } from "./actions";

const TERP_CATEGORIES = ["fruit", "haze", "gas", "dessert", "floral"] as const;
const CATEGORIES = ["Flower", "Pre-Rolls", "Vapes", "Edibles", "Extracts", "Tinctures", "Topicals", "Gear"];

export function ProductEditor({ product }: { product: ProductRow | null }) {
  const router = useRouter();
  const synced = product?.source === "sheet";
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [brand, setBrand] = useState(product?.brand ?? BRANDS[0].name);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [category, setCategory] = useState(product?.category ?? "");
  const [format, setFormat] = useState(product?.format ?? "");
  const [weight, setWeight] = useState(product?.weight ?? "");
  const [thc, setThc] = useState(product?.thc_range ?? "");
  const [strain, setStrain] = useState<string>(product?.strain_type ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [terps, setTerps] = useState<TerpeneEntry[]>(
    (Array.isArray(product?.terpene_profile) ? (product!.terpene_profile as unknown as Partial<TerpeneEntry>[]) : []).map((t) => ({
      name: t.name ?? "",
      note: t.note ?? "",
    })),
  );
  const [terpCategory, setTerpCategory] = useState(product?.terp_category ?? "");
  const [isActive, setIsActive] = useState(product?.is_active ?? false);
  const [sortOrder, setSortOrder] = useState<string>(product?.sort_order?.toString() ?? "");

  // Debounced slug uniqueness check, driven from the change handlers (no
  // setState-in-effect — see nextjs16 gotchas).
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSlugCheck(s: string) {
    if (synced || !s) return;
    if (s === product?.slug) {
      setSlugState("ok");
      return;
    }
    setSlugState("checking");
    if (slugTimer.current) clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(async () => {
      const free = await checkSlugAvailable(s, product?.id);
      setSlugState(free ? "ok" : "taken");
    }, 400);
  }
  // Slug auto-follows the name until edited by hand (manual products only).
  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched && !synced) {
      const s = slugify(v);
      setSlug(s);
      scheduleSlugCheck(s);
    }
  }
  function onSlugChange(v: string) {
    setSlugTouched(true);
    const s = slugify(v);
    setSlug(s);
    scheduleSlugCheck(s);
  }

  const isTerpKings = brand === "TerpKings";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!synced && slugState === "taken") {
      setError("Slug is already in use.");
      return;
    }
    const input: ProductInput = {
      id: product?.id,
      brand,
      name,
      slug,
      category: category || null,
      format: format || null,
      weight: weight || null,
      thc_range: thc || null,
      strain_type: (strain || null) as ProductInput["strain_type"],
      description: description || null,
      image_url: imageUrl || null,
      terpene_profile: terps,
      terp_category: isTerpKings ? terpCategory || null : null,
      is_active: isActive,
      sort_order: sortOrder.trim() ? Number(sortOrder) : null,
    };
    start(async () => {
      const res = await saveProduct(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/admin/products?saved=${encodeURIComponent(res.data.slug)}`);
      router.refresh();
    });
  }

  const lockCls = synced ? "bg-neutral-100 text-neutral-500" : "";
  const fieldHint = synced ? " — managed by iHeartJane sheet" : "";

  return (
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-5 rounded border bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-brand">Brand{fieldHint}</Label>
            <select
              id="p-brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={synced}
              className={`h-9 w-full rounded-md border px-3 text-sm ${lockCls}`}
            >
              {BRANDS.map((b) => (
                <option key={b.slug} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Name{fieldHint}</Label>
            <Input id="p-name" value={name} onChange={(e) => onNameChange(e.target.value)} disabled={synced} required className={lockCls} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-slug">
            Slug{synced ? " — fixed on synced products" : ""}{" "}
            {!synced && slugState === "checking" && <span className="text-xs text-neutral-500">checking…</span>}
            {!synced && slugState === "ok" && slug && <span className="text-xs text-green-700">available</span>}
            {!synced && slugState === "taken" && <span className="text-xs text-red-600">already in use</span>}
          </Label>
          <Input
            id="p-slug"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            disabled={synced}
            className={`font-mono ${lockCls}`}
          />
          <p className="text-xs text-neutral-500">/products/{BRANDS.find((b) => b.name === brand)?.slug}/{slug || "…"}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-cat">Category{fieldHint}</Label>
            <Input id="p-cat" list="p-cat-list" value={category} onChange={(e) => setCategory(e.target.value)} disabled={synced} className={lockCls} />
            <datalist id="p-cat-list">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-format">Format / type{fieldHint}</Label>
            <Input id="p-format" value={format} onChange={(e) => setFormat(e.target.value)} disabled={synced} className={lockCls} placeholder="Top Shelf, 5-Pack, All-In-One…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-weight">Weight{fieldHint}</Label>
            <Input id="p-weight" value={weight} onChange={(e) => setWeight(e.target.value)} disabled={synced} className={lockCls} placeholder="3.5g" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-thc">THC range (not in the sheet — always editable)</Label>
            <Input id="p-thc" value={thc} onChange={(e) => setThc(e.target.value)} placeholder="24–28%" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-strain">Strain type{fieldHint}</Label>
            <select id="p-strain" value={strain} onChange={(e) => setStrain(e.target.value)} disabled={synced} className={`h-9 w-full rounded-md border px-3 text-sm ${lockCls}`}>
              <option value="">—</option>
              <option value="indica">Indica</option>
              <option value="sativa">Sativa</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-desc">Description</Label>
          <textarea
            id="p-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label>Terpene profile (name + short note)</Label>
          {terps.map((t, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={t.name}
                onChange={(e) => setTerps((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                placeholder="Myrcene"
                className="max-w-56"
              />
              <Input
                value={t.note}
                onChange={(e) => setTerps((arr) => arr.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
                placeholder="earthy"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => setTerps((arr) => arr.filter((_, j) => j !== i))}>
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setTerps((arr) => [...arr, { name: "", note: "" }])}>
            + Add terpene
          </Button>
        </div>

        {isTerpKings && (
          <div className="space-y-1.5">
            <Label htmlFor="p-terpcat">Terp category (TerpKings)</Label>
            <select id="p-terpcat" value={terpCategory} onChange={(e) => setTerpCategory(e.target.value)} className="h-9 w-full max-w-56 rounded-md border px-3 text-sm">
              <option value="">—</option>
              {TERP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : product ? "Save changes" : "Create product"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/products")}>
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
            className={`w-full rounded px-3 py-2 text-xs font-bold uppercase tracking-wide ${
              isActive ? "bg-green-600 text-white" : "bg-neutral-200 text-neutral-700"
            }`}
          >
            {isActive ? "Shown on site" : "Hidden"}
          </button>
          <div className="space-y-1.5">
            <Label htmlFor="p-sort">Sort order (within brand)</Label>
            <Input id="p-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3 rounded border bg-white p-4">
          <Label>Main image{fieldHint}</Label>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="aspect-square w-full rounded bg-neutral-50 object-contain" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded bg-neutral-100 text-xs text-neutral-400">
              no image
            </div>
          )}
          {!synced && (
            <>
              <AdminUploader bucket="products" folder={BRANDS.find((b) => b.name === brand)?.slug} onUploaded={(m) => setImageUrl(m.url)} label="Drop product image" />
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="…or paste an image URL" className="font-mono text-xs" />
            </>
          )}
        </div>
      </aside>
    </form>
  );
}
