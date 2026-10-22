import type { CSSProperties } from "react";
import {
  PRODUCT_IMAGE_SIZES_CARD,
  productImageIsMissing,
  productImageSrcSet,
} from "@/lib/catalog/product-image-urls";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";

/** The catalog_products columns a product image needs. */
export interface ProductImageSource {
  name: string;
  brand: string;
  image_url: string | null;
  image_storage_path?: string | null;
  image_missing: boolean;
}

/**
 * One product image, three cases (D-131):
 *  1. image_storage_path set → responsive <img srcSet sizes> over the 400/800/1600 renditions
 *  2. a legacy image_url (Drive link etc., until the P3 import) → plain lazy <img>
 *  3. nothing real → ProductImagePlaceholder (brand logo on the tile)
 * `className` goes on the <img>; `placeholderClassName` on the placeholder box
 * (defaults fill the parent). Renditions are at most 1600 px wide; width/height
 * are intrinsic hints only — every tile fixes its own aspect box.
 */
export function ProductImage({
  product,
  sizes = PRODUCT_IMAGE_SIZES_CARD,
  className = "",
  placeholderClassName = "",
  tone = "light",
  alt,
  style,
  eager = false,
}: {
  product: ProductImageSource;
  sizes?: string;
  className?: string;
  placeholderClassName?: string;
  tone?: "light" | "dark";
  alt?: string;
  style?: CSSProperties;
  /** Above-the-fold hero image: no lazy loading. */
  eager?: boolean;
}) {
  const label = alt ?? product.name;
  if (productImageIsMissing(product)) {
    return <ProductImagePlaceholder brand={product.brand} tone={tone} className={placeholderClassName} alt={label} />;
  }
  const loading = eager ? "eager" : "lazy";
  if (product.image_storage_path) {
    const s = productImageSrcSet(product.image_storage_path);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={s.src}
        srcSet={s.srcSet}
        sizes={sizes}
        alt={label}
        width={800}
        height={800}
        loading={loading}
        decoding="async"
        className={className}
        style={style}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={product.image_url!} alt={label} loading={loading} decoding="async" className={className} style={style} />
  );
}
