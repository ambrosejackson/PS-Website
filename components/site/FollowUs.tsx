import { SocialButtons } from "@/components/site/SocialButtons";
import { SocialStrip } from "@/components/site/SocialStrip";
import type { SocialImage } from "@/lib/data";

/**
 * FOLLOW US — Instagram button with a scrolling image strip (D-064).
 * Images come from /admin/social-media; with none active the placeholder
 * gradients render. Tiles open a lightbox that repeats the two buttons — the
 * strip exists to drive those clicks, tiles never link to posts.
 */
const PLACEHOLDERS = [
  "/placeholders/follow-1.png",
  "/placeholders/follow-2.png",
  "/placeholders/follow-3.png",
  "/placeholders/follow-4.png",
];

export function FollowUs({ images }: { images: SocialImage[] }) {
  const tiles =
    images.length > 0
      ? images.map((i) => ({ id: i.id, src: i.image_url, alt: i.alt ?? "" }))
      : PLACEHOLDERS.map((src, i) => ({ id: `ph-${i}`, src, alt: "" }));
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
