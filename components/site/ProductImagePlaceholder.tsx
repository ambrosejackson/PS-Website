import { brandByName } from "@/lib/brands";
import { LEGACY_PRODUCT_PLACEHOLDER } from "@/lib/catalog/product-image-urls";

/**
 * What a product shows when it has no real image yet (D-131): the brand's logo
 * centered on the card's existing tile, in the same aspect box as a real image
 * so nothing shifts when one arrives. Logo files come from lib/brands.ts
 * (public/brand-assets); a brand without one falls back to the generic
 * placeholder PNG. `tone="dark"` picks the on-dark logo for dark tiles.
 */
export function ProductImagePlaceholder({
  brand,
  tone = "light",
  className = "",
  alt = "",
}: {
  brand: string;
  tone?: "light" | "dark";
  /** Applied to the box; defaults fill the parent (tiles are already aspect-square). */
  className?: string;
  alt?: string;
}) {
  const b = brandByName(brand);
  const logo = b ? (tone === "dark" ? b.logoOnDark : b.logoOnLight) : null;
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      data-placeholder="product"
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" loading="lazy" decoding="async" className="max-h-[42%] max-w-[55%] object-contain opacity-60" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={LEGACY_PRODUCT_PLACEHOLDER} alt="" loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
      )}
    </div>
  );
}
