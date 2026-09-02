import { InstagramIcon } from "@/components/site/social-icons";
import { INSTAGRAM_PROFILES } from "@/lib/social";

/**
 * FOLLOW US pill row — one Instagram button per profile (Private Stock + the
 * four brands, D-070). Used in the strip header and the lightbox; `placement`
 * feeds web_events via data-track (D-064).
 */
const PILL =
  "flex items-center gap-2 rounded-full border border-ink px-4 py-2.5 font-condensed text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-white md:px-5";

export function SocialButtons({ placement, className = "" }: { placement: "strip" | "lightbox"; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 md:gap-3 ${className}`}>
      {INSTAGRAM_PROFILES.map((p) => (
        <a key={p.key} href={p.url} target="_blank" rel="noopener noreferrer" data-track={`social:cta:ig:${p.key}:${placement}`} className={PILL}>
          <InstagramIcon className="h-4 w-4 shrink-0" />
          {p.label}
        </a>
      ))}
    </div>
  );
}
