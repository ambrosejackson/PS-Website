import type { CSSProperties } from "react";
import {
  PRODUCT_IMAGE_SIZES_CARD,
  productImageIsMissing,
  productImageSrcSet,
  psmRenditionUrls,
} from "@/lib/catalog/product-image-urls";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";
import { PsmProductImg } from "./PsmProductImg";

/** The catalog_products columns a product image needs. */
export interface ProductImageSource {
  name: string;
  brand: string;
  image_url: string | null;
  image_storage_path?: string | null;
  image_missing: boolean;
  /** PSM-hosted public object URL (D-137); preferred over the website image when set. */
  psm_image_url?: string | null;
}

/**
 * One product image, four cases (D-131, D-137):
 *  1. psm_image_url set → PSM Storage transform renditions (400/800/1600, q75);
 *     one onError hop to the plain object URL, then on to the chain below
 *  2. image_storage_path set → responsive <img srcSet sizes> over the 400/800/1600 renditions
 *  3. a legacy image_url (Drive link etc., until the P3 import) → plain lazy <img>
 *  4. nothing real → ProductImagePlaceholder (brand logo on the tile)
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
  const loading = eager ? "eager" : "lazy";

  /** Cases 2–4: the website's own chain, also the final fallback behind a PSM image. */
  function websiteImage() {
    const own = { ...product, psm_image_url: null };
    if (productImageIsMissing(own)) {
      return <ProductImagePlaceholder brand={product.brand} tone={tone} className={placeholderClassName} alt={label} />;
    }
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

  if (product.psm_image_url) {
    const s = psmRenditionUrls(product.psm_image_url);
    return (
      <PsmProductImg
        src={s.src}
        srcSet={s.srcSet}
        sizes={sizes}
        plainSrc={product.psm_image_url}
        alt={label}
        loading={loading}
        className={className}
        style={style}
        fallback={websiteImage()}
      />
    );
  }
  return websiteImage();
}
