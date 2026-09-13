"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { loadMoreProducts } from "@/lib/merch/actions";
import type { ShopBanner, ShopProduct } from "@/lib/merch/queries";
import { ProductCard } from "./ProductCard";

/**
 * Product grid (§6.7): 4-up desktop / 3-up md / 2-up mobile with the measured
 * 13 px gutter; interstitial banners spliced after product N as full-row
 * items (col-span-full keeps the next row aligned); "Load more" appends the
 * next page via a server action and mirrors the count into ?page= so reload
 * and back-button restore it. Reduced motion: nothing here animates.
 */
export function CollectionGrid({
  products: initialProducts,
  banners = [],
  filter,
  page: initialPage = 1,
  hasMore: initialHasMore = false,
  emptyMessage = "Nothing here yet — check back soon.",
}: {
  products: ShopProduct[];
  banners?: ShopBanner[];
  /** Same filter the page rendered with; omit to disable Load more (home sections). */
  filter?: { slug: string; tab?: string | null; brand?: string | null };
  page?: number;
  hasMore?: boolean;
  emptyMessage?: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function loadMore() {
    if (!filter || pending) return;
    setError(null);
    const next = page + 1;
    start(async () => {
      try {
        const res = await loadMoreProducts({ ...filter, page: next });
        setProducts((ps) => {
          const seen = new Set(ps.map((p) => p.id));
          return [...ps, ...res.products.filter((p) => !seen.has(p.id))];
        });
        setPage(next);
        setHasMore(res.hasMore);
        const url = new URL(window.location.href);
        url.searchParams.set("page", String(next));
        window.history.replaceState(window.history.state, "", url.toString());
      } catch {
        setError("Could not load more — please try again.");
      }
    });
  }

  if (products.length === 0) {
    return <p className="border border-dashed border-hairline p-12 text-center font-condensed text-sm uppercase tracking-wide text-neutral-400">{emptyMessage}</p>;
  }

  // Splice banners: after product N (1-based). Several at one position all render.
  const byPosition = new Map<number, ShopBanner[]>();
  for (const b of banners) byPosition.set(b.insert_after, [...(byPosition.get(b.insert_after) ?? []), b]);
  const items: React.ReactNode[] = [];
  products.forEach((p, i) => {
    items.push(<ProductCard key={p.id} product={p} priority={i < 4} />);
    for (const b of byPosition.get(i + 1) ?? []) items.push(<Interstitial key={`b-${b.id}`} banner={b} />);
  });

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-[13px] gap-y-10 md:grid-cols-3 lg:grid-cols-4">{items}</div>
      {filter && hasMore && (
        <div className="mt-12 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            aria-busy={pending}
            className="inline-flex min-w-44 items-center justify-center gap-2 border border-ink bg-white px-8 py-3 font-condensed text-xs font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            {pending && <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent motion-reduce:animate-none" aria-hidden />}
            {pending ? "Loading…" : "Load more"}
          </button>
          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      {filter && !hasMore && products.length > 8 && (
        <p className="mt-12 text-center font-condensed text-[11px] uppercase tracking-[0.16em] text-neutral-400">Products finished</p>
      )}
    </div>
  );
}

/** Full-row editorial banner: 2:1 desktop / ~2:3 mobile (docs/MERCH-MEDIA.md), optional link. */
function Interstitial({ banner }: { banner: ShopBanner }) {
  const media =
    banner.media_type === "video" ? (
      <video src={banner.media_url} poster={banner.media_url_mobile ?? undefined} autoPlay muted loop playsInline preload="metadata" className="h-full w-full object-cover" aria-label={banner.alt ?? undefined} />
    ) : (
      <picture>
        {banner.media_url_mobile && <source media="(max-width: 767px)" srcSet={banner.media_url_mobile} />}
        <img src={banner.media_url} alt={banner.alt ?? ""} loading="lazy" className="h-full w-full object-cover" />
      </picture>
    );
  const box = <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#f0f0f0] md:aspect-[2/1]">{media}</div>;
  return (
    <div className="col-span-full">
      {banner.link_url ? (
        <Link href={banner.link_url} className="block" aria-label={banner.alt ?? "Shop this feature"}>
          {box}
        </Link>
      ) : (
        box
      )}
    </div>
  );
}
