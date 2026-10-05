import { merchFromCents, type MerchListing } from "@/lib/data";
import { normalizeImages, primaryImage } from "@/lib/merchImages";

/** One merch tile on a brand page, already resolved for rendering. */
export type BrandMerchCard = {
  id: string;
  name: string;
  /** Primary image URL, or null when the product has no image yet. */
  image: string | null;
  alt: string;
  /** "from $X" price text, or null when nothing is purchasable yet. */
  price: string | null;
  /** /apparel detail link, or null when the product has no active variant (shown as coming soon). */
  href: string | null;
};

/** Brand-page view of merch listings: no active variant = visible but not clickable. */
export function toBrandMerchCards(listings: MerchListing[]): BrandMerchCard[] {
  return listings.map((p) => {
    const img = primaryImage(normalizeImages(p.images));
    const from = merchFromCents(p);
    return {
      id: p.id,
      name: p.name,
      image: img?.url ?? null,
      alt: img?.alt || p.name,
      price: from != null ? `from $${(from / 100).toFixed(2)}` : null,
      href: from != null ? `/apparel/${p.slug}` : null,
    };
  });
}
