/**
 * Placeholder Private Stock mark — circular EST.-style badge approximating the
 * reference screenshots (docs/reference/lovable/01), inline SVG inheriting
 * currentColor so it themes with the header. Swap for the approved logo files
 * from the Drive folders when they land in public/brand-assets/.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label="Private Stock Cannabis Co."
      className={className}
      fill="currentColor"
    >
      <defs>
        <path id="ps-arc-top" d="M 18 60 A 42 42 0 0 1 102 60" />
        <path id="ps-arc-bottom" d="M 14 60 A 46 46 0 0 0 106 60" />
      </defs>
      <circle
        cx="60"
        cy="60"
        r="56"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      <text
        fontFamily="'Arial Narrow', Arial, sans-serif"
        fontSize="13.5"
        fontWeight="700"
        letterSpacing="2"
      >
        <textPath href="#ps-arc-top" startOffset="50%" textAnchor="middle">
          PRIVATE STOCK
        </textPath>
      </text>
      <text
        x="60"
        y="66"
        textAnchor="middle"
        fontFamily="'Arial Narrow', Arial, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="4"
      >
        EST.
      </text>
      <text
        fontFamily="'Arial Narrow', Arial, sans-serif"
        fontSize="11"
        fontWeight="700"
        letterSpacing="2"
      >
        <textPath href="#ps-arc-bottom" startOffset="50%" textAnchor="middle">
          CANNABIS CO.
        </textPath>
      </text>
    </svg>
  );
}
