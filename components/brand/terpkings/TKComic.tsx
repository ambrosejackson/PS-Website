import { COMIC } from "@/lib/terpkings-content";

/** FILE 02 // ORIGINAL GRAPHIC NOVEL — tilted cover frame + copy. */
export function TKComic() {
  return (
    <section id="comic" className="tk-gutter mx-auto max-w-[1140px] py-[100px]">
      <div className="tk-comic-grid">
        <div className="flex min-w-0 items-center justify-center">
          {/* Brand render is a static file with known sizing — plain img. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-pages/terpkings/comic-lumen-war-saga.png"
            alt={COMIC.coverAlt}
            className="h-auto w-full max-w-[430px] object-contain"
            loading="lazy"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-[18px]">
          <div className="tk-mono text-[20px] tracking-[.24em] text-[#FFB000]">{COMIC.eyebrow}</div>
          <h2
            className="m-0 font-extrabold uppercase leading-none text-[#E8F0C8]"
            style={{ fontSize: "clamp(32px, 4.5vw, 56px)" }}
          >
            {COMIC.titleLine1}
            <br />
            <span className="text-[#FFB000]">{COMIC.titleLine2}</span>
          </h2>
          <p className="tk-mono m-0 text-[21px] leading-[1.55] text-[#8A9E5C]">{COMIC.blurb}</p>
          <div className="flex flex-wrap gap-[14px]">
            <a
              href="#locator"
              className="tk-mono tk-btn-amber rounded-[4px] px-7 py-[13px] text-[21px] tracking-[.1em]"
            >
              {COMIC.readCta}
            </a>
            <a
              href="#locator"
              className="tk-mono tk-btn-outline rounded-[4px] px-7 py-[11px] text-[21px] tracking-[.1em]"
            >
              {COMIC.printCta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
