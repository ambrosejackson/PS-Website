import { FacebookIcon, InstagramIcon } from "@/components/site/social-icons";

/** FOLLOW US — Instagram + Facebook buttons only, with a scrolling image strip. */
const STRIP_IMAGES = [
  "/placeholders/follow-1.png",
  "/placeholders/follow-2.png",
  "/placeholders/follow-3.png",
  "/placeholders/follow-4.png",
];

// TODO(Ambrose): confirm final Instagram/Facebook profile URLs.
const INSTAGRAM_URL = "https://www.instagram.com/privatestockcannabis";
const FACEBOOK_URL = "https://www.facebook.com/privatestockcannabis";

export function FollowUs() {
  const strip = [...STRIP_IMAGES, ...STRIP_IMAGES, ...STRIP_IMAGES];
  return (
    <section className="border-t border-hairline py-12 md:py-14">
      <div className="mx-auto max-w-screen-2xl px-6 text-center md:px-12">
        <h2 className="font-condensed text-[26px] font-bold uppercase tracking-tight text-ink md:text-[32px]">
          Follow Us
        </h2>
        {/* Pill buttons with icon + label per the docx reference structure
            (Instagram + Facebook ONLY), kept in our light visual style. */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-ink px-5 py-2.5 font-condensed text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-white"
          >
            <InstagramIcon className="h-4 w-4" />
            Instagram
          </a>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-ink px-5 py-2.5 font-condensed text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-white"
          >
            <FacebookIcon className="h-4 w-4" />
            Facebook
          </a>
        </div>
      </div>
      <div className="mt-10 overflow-hidden">
        <div className="ps-marquee flex w-max gap-4">
          {strip.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className="aspect-[4/5] w-40 rounded-lg object-cover md:w-52"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
