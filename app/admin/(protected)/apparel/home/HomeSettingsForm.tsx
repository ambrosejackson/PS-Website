"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveHomeSettings, type SettingsRow } from "./actions";

export type CollectionOption = { id: string; name: string; slug: string };

/** merch_settings editor (D-071): hero copy + CTA, featured collection, New Releases count. */
export function HomeSettingsForm({ settings, collections }: { settings: SettingsRow | null; collections: CollectionOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "done" } | { kind: "error"; message: string }>({ kind: "idle" });

  const [headline, setHeadline] = useState(settings?.hero_headline ?? "");
  const [subline, setSubline] = useState(settings?.hero_subline ?? "");
  const [ctaLabel, setCtaLabel] = useState(settings?.hero_cta_label ?? "View more");
  const [ctaUrl, setCtaUrl] = useState(settings?.hero_cta_url ?? "");
  const [featured, setFeatured] = useState<string>(settings?.featured_collection_id ?? "");
  const [featuredCta, setFeaturedCta] = useState(settings?.featured_cta_label ?? "Available now");
  const [count, setCount] = useState<string>(String(settings?.new_releases_count ?? 12));

  const selectable = collections.filter((c) => c.slug !== "all");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    start(async () => {
      const res = await saveHomeSettings({
        hero_headline: headline,
        hero_subline: subline,
        hero_cta_label: ctaLabel,
        hero_cta_url: ctaUrl,
        featured_collection_id: featured || null,
        featured_cta_label: featuredCta,
        new_releases_count: Number(count),
      });
      if (!res.ok) {
        setStatus({ kind: "error", message: res.error });
        return;
      }
      setStatus({ kind: "done" });
      router.refresh();
    });
  }

  const selectCls = "h-9 w-full rounded-md border bg-white px-3 text-sm";

  return (
    <form onSubmit={submit} className="space-y-5 rounded border bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Hero overlay</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Copy laid over the <code>/apparel</code> hero (lower-left). The media itself is managed in Heroes. The whole hero
          links to the CTA URL when one is set.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="hs-headline">Headline</Label>
          <Input id="hs-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Fall 2026 Drop" maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hs-subline">Subline</Label>
          <Input id="hs-subline" value={subline} onChange={(e) => setSubline(e.target.value)} placeholder="Private Stock Apparel" maxLength={160} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hs-cta-label">CTA label</Label>
          <Input id="hs-cta-label" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="View more" maxLength={40} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hs-cta-url">CTA URL</Label>
          <Input id="hs-cta-url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="/apparel/collections/fall-2026" className="font-mono" />
          <p className="text-xs text-neutral-500">Site path or https:// link. Empty = hero is not a link.</p>
        </div>
      </div>

      <div className="border-t pt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Featured collection</h2>
        <p className="mt-1 text-xs text-neutral-500">Shown under New Releases as “{"{name}"} Collection” with up to 16 of its products. None = section hidden.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="hs-featured">Collection</Label>
          <select id="hs-featured" value={featured} onChange={(e) => setFeatured(e.target.value)} className={selectCls} disabled={pending}>
            <option value="">— None (section hidden) —</option>
            {selectable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — /apparel/collections/{c.slug}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hs-featured-cta">Featured link label</Label>
          <Input id="hs-featured-cta" value={featuredCta} onChange={(e) => setFeaturedCta(e.target.value)} placeholder="Available now" maxLength={40} />
        </div>
      </div>

      <div className="border-t pt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">New Releases</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="hs-count">Products shown (4–24, newest by Released at)</Label>
          <Input id="hs-count" type="number" min={4} max={24} value={count} onChange={(e) => setCount(e.target.value)} className="w-32" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save home settings"}
        </Button>
        {status.kind === "done" && <p className="text-sm text-green-700">Saved. /apparel revalidated.</p>}
        {status.kind === "error" && <p className="text-sm text-red-600">{status.message}</p>}
      </div>
    </form>
  );
}
