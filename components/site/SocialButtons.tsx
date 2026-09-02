import { InstagramIcon } from "@/components/site/social-icons";
import { INSTAGRAM_URL } from "@/lib/social";

/** FOLLOW US pill button — Instagram only (D-065; Facebook dropped). Used in the strip header and the lightbox; `placement` feeds web_events via data-track (D-064). */
const PILL =
  "flex items-center gap-2 rounded-full border border-ink px-5 py-2.5 font-condensed text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-white";

export function SocialButtons({ placement, className = "" }: { placement: "strip" | "lightbox"; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" data-track={`social:cta:ig:${placement}`} className={PILL}>
        <InstagramIcon className="h-4 w-4" />
        Instagram
      </a>
    </div>
  );
}
