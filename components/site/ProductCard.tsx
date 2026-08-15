import Link from "next/link";

/**
 * Reference product card (docs/reference/lovable): product image on pure white,
 * no border/shadow, centered condensed uppercase caption in 2–3 short lines
 * beneath, slightly-navy ink.
 */
export function ProductCard({
  href,
  imageUrl,
  caption,
  imageAlt,
  track,
  hoverHint,
}: {
  href?: string;
  imageUrl: string;
  caption: string;
  imageAlt?: string;
  track?: string;
  /** Optional overlay label shown on hover (e.g. "CLICK FOR MORE INFO"). */
  hoverHint?: string;
}) {
  const body = (
    <>
      <div className="relative flex aspect-square items-center justify-center bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={imageAlt ?? caption}
          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {hoverHint && (
          <span className="absolute inset-x-0 bottom-0 bg-white/90 py-2 text-center font-condensed text-[10px] font-semibold uppercase tracking-wide text-ink opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {hoverHint}
          </span>
        )}
      </div>
      <p className="mx-auto mt-4 max-w-[26ch] text-center font-condensed text-[13px] font-semibold uppercase leading-[1.45] tracking-wide text-caption">
        {caption}
      </p>
    </>
  );
  if (!href) return <div className="group">{body}</div>;
  return (
    <Link href={href} className="group block" data-track={track}>
      {body}
    </Link>
  );
}
