/**
 * Private Stock badge mark — the REAL brand files from public/brand-assets/:
 * black PNG in the solid white header bar and wherever the ground is light;
 * white PNG on dark grounds and on brand pages' dark-themed overlay heroes.
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
