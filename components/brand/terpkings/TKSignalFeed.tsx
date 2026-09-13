import { SocialStrip, type SocialTile } from "@/components/site/SocialStrip";
import type { SocialImage } from "@/lib/data";
import { IG } from "@/lib/terpkings-content";
import { TKPlaceholder } from "./TKBits";

/**
 * SIGNAL FEED — @TERPKINGSOFFICIAL. With admin tiles (content_social_images
 * rows where brand = terpkings, curated at /admin/social-media) it renders the
 * landing strip's big 4:5 marquee (D-064/D-067) in CRT chrome; tiles with an
 * Instagram link open the post. No lightbox here — a linkless tile is inert,
 * so give every tile its post link in admin. With zero tiles it falls back to
 * the export's five placeholder slots.
 */
const TK_TILE =
  "ps-nosave aspect-[4/5] w-[calc(100vw-3rem)] rounded-[6px] border-2 border-[#39422A] object-cover md:w-[600px]";

export function TKSignalFeed({ images }: { images: SocialImage[] }) {
  const tiles: SocialTile[] = images.map((i) => ({
    id: i.id,
    src: i.image_url,
    alt: i.alt ?? "",
    kind: i.media_type === "video" ? "video" : "image",
    poster: i.poster_url,
    href: i.link_url,
  }));
  return (
    <section className="tk-gutter mx-auto max-w-[1240px] pb-[90px] pt-[50px]" aria-label="Instagram">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <h2 className="tk-mono m-0 text-[26px] tracking-[.12em] text-[#A8C64E]">
          {`// SIGNAL FEED — ${IG.handle}`}
        </h2>
        <a
          href={IG.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tk-mono tk-link text-[19px] tracking-[.12em]"
        >
          FOLLOW →
        </a>
      </div>
      {tiles.length > 0 ? (
        <SocialStrip tiles={tiles} lightbox={false} tileClassName={TK_TILE} />
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          {IG.slots.map((slot) => (
            <div
              key={slot}
              className="aspect-square overflow-hidden rounded-[6px] border-2 border-[#39422A]"
            >
              <TKPlaceholder label="IG post" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
