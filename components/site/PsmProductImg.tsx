"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * The PSM-hosted branch of ProductImage (D-137), kept client-side only for the
 * onError hops. Renders the Storage transform renditions; on a load error it
 * swaps ONCE to the plain object URL (no srcSet); a second error renders
 * `fallback` — the website's own image chain, passed in from the server.
 */
export function PsmProductImg({
  src,
  srcSet,
  sizes,
  plainSrc,
  alt,
  loading,
  className,
  style,
  fallback,
}: {
  src: string;
  srcSet: string;
  sizes: string;
  /** The untransformed PSM object URL used after the first error. */
  plainSrc: string;
  alt: string;
  loading: "eager" | "lazy";
  className?: string;
  style?: CSSProperties;
  fallback: ReactNode;
}) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  if (stage === 2) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={stage === 0 ? src : plainSrc}
      srcSet={stage === 0 ? srcSet : undefined}
      sizes={stage === 0 ? sizes : undefined}
      alt={alt}
      width={800}
      height={800}
      loading={loading}
      decoding="async"
      className={className}
      style={style}
      onError={() => setStage((s) => (s === 0 ? 1 : 2))}
    />
  );
}
