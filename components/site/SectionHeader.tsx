import Link from "next/link";

/**
 * Reference section header (docs/reference/lovable): bold condensed uppercase
 * title left, small "SEE MORE" link right, sitting under a hairline rule that
 * separates sections.
 */
export function SectionHeader({
  title,
  seeMoreHref,
  seeMoreLabel = "SEE MORE",
  as: Heading = "h2",
}: {
  title: string;
  seeMoreHref?: string;
  seeMoreLabel?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <Heading className="font-condensed text-[26px] font-bold uppercase tracking-tight text-ink md:text-[32px]">
        {title}
      </Heading>
      {seeMoreHref && (
        <Link
          href={seeMoreHref}
          className="nav-underline font-condensed text-xs font-semibold uppercase tracking-wide text-ink"
        >
          {seeMoreLabel}
        </Link>
      )}
    </div>
  );
}
