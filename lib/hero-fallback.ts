import type { Database } from "@/lib/database.types";

export type HeroAsset = Database["public"]["Tables"]["content_heroes"]["Row"];

/**
 * Fallback default hero when the DB is unreachable or a page has no rows yet.
 * Lives in its own dependency-free module because client components
 * (HeroSwitcher) import it; lib/data.ts is server-only and re-exports it.
 */
export const FALLBACK_HERO: HeroAsset = {
  id: "fallback",
  page: "/",
  nav_target: null,
  media_url: "/placeholders/hero-default.webp",
  media_type: "image",
  poster_url: null,
  media_url_mobile: null,
  has_audio: false,
  audio_autoplay: false,
  audio_volume: 70,
  theme: "dark",
  video_loop: true,
  is_default: true,
  sort_order: 0,
  is_active: true,
};
