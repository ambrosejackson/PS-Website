import { SocialButtons } from "@/components/site/SocialButtons";
import { SocialStrip, type SocialTile } from "@/components/site/SocialStrip";
import type { SocialImage } from "@/lib/data";

/**
 * FOLLOW US — Instagram button with a scrolling strip of images / muted clips
 * (D-064, D-068). Tiles come from /admin/social-media; with none active the
 * placeholder gradients render. A tile with an Instagram link opens the post;
 * one without opens a lightbox that repeats the Instagram button.
 */
const PLACEHOLDERS = [
  "/placeholders/follow-1.png",
  "/placeholders/follow-2.png",
  "/placeholders/follow-3.png",
  "/placeholders/follow-4.png",
];

export function FollowUs({ images }: { images: SocialImage[] }) {
  const tiles: SocialTile[] =
    images.length > 0
      ? images.map((i) => ({
          id: i.id,
          src: i.image_url,
          alt: i.alt ?? "",
          kind: i.media_type === "video" ? "video" : "image",
          poster: i.poster_url,
          href: i.link_url,
        }))
      : PLACEHOLDERS.map((src, i) => ({ id: `ph-${i}`, src, alt: "", kind: "image" as const, poster: null, href: null }));
  return (
    <section className="border-t border-hairline py-12 md:py-14">
      <div className="mx-auto max-w-screen-2xl px-6 text-center md:px-12">
        <h2 className="font-condensed text-[26px] font-bold uppercase tracking-tight text-ink md:text-[32px]">
          Follow Us
        </h2>
        {/* Pill button with icon + label (Instagram only — D-065), light visual style. */}
        <SocialButtons placement="strip" className="mt-6" />
      </div>
      <SocialStrip tiles={tiles} lightbox={images.length > 0} />
    </section>
  );
}
