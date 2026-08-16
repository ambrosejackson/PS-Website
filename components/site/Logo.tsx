/**
 * Private Stock badge mark — the REAL brand files from public/brand-assets/:
 * white PNG on dark heroes, black PNG when the header themes light (decision 9).
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
      : "/brand-assets/private-stock-white.png";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Private Stock Cannabis Co." className={className} />
  );
}
