import { FacebookIcon, InstagramIcon } from "@/components/site/social-icons";

/** FOLLOW US pill buttons (Instagram + Facebook ONLY). Used in the strip header and the lightbox; `placement` feeds web_events via data-track (D-064). */
// TODO(Ambrose): confirm final Instagram/Facebook profile URLs.
export const INSTAGRAM_URL = "https://www.instagram.com/privatestockcannabis";
export const FACEBOOK_URL = "https://www.facebook.com/privatestockcannabis";

const PILL =
  "flex items-center gap-2 rounded-full border border-ink px-5 py-2.5 font-condensed text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-white";

export function SocialButtons({ placement, className = "" }: { placement: "strip" | "lightbox"; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" data-track={`social:cta:ig:${placement}`} className={PILL}>
        <InstagramIcon className="h-4 w-4" />
        Instagram
      </a>
      <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" data-track={`social:cta:fb:${placement}`} className={PILL}>
        <FacebookIcon className="h-4 w-4" />
        Facebook
      </a>
    </div>
  );
}
