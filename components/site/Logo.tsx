/**
 * Placeholder Private Stock wordmark — inline SVG so it inherits currentColor
 * and themes with the header. Swap for the approved logo files from the Drive
 * folders (including white/knockout versions) when Ambrose drops them into
 * public/brand-assets/.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 96"
      role="img"
      aria-label="Private Stock"
      className={className}
      fill="currentColor"
    >
      <text
        x="0"
        y="42"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="44"
        letterSpacing="10"
      >
        PRIVATE
      </text>
      <text
        x="0"
        y="88"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="44"
        letterSpacing="22"
      >
        STOCK
      </text>
    </svg>
  );
}
