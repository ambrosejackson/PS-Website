/**
 * Private Stock badge mark from public/brand-assets/ — white SVG on dark
 * heroes, black PNG variant when the header themes light (decision 9).
 * Current files are placeholders approximating the real badge; dropping the
 * Drive exports in with the same filenames swaps them site-wide.
 */
export function Logo({
  variant = "white",
  className,
}: {
  variant?: "white" | "black";
  className?: string;
}) {
  const src =
    variant === "black"
      ? "/brand-assets/private-stock-black.png"
      : "/brand-assets/private-stock-white.svg";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Private Stock Cannabis Co." className={className} />
  );
}
