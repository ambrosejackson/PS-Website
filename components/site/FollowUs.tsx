import { FacebookIcon, InstagramIcon } from "@/components/site/social-icons";

/** FOLLOW US — Instagram + Facebook buttons only, with a scrolling image strip. */
const STRIP_IMAGES = [
  "/placeholders/follow-1.svg",
  "/placeholders/follow-2.svg",
  "/placeholders/follow-3.svg",
  "/placeholders/follow-4.svg",
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
        <div className="mt-6 flex items-center justify-center gap-4">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Private Stock on Instagram"
            className="border border-ink p-3 text-ink transition-colors hover:bg-ink hover:text-white"
          >
            <InstagramIcon className="h-5 w-5" />
          </a>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Private Stock on Facebook"
            className="border border-ink p-3 text-ink transition-colors hover:bg-ink hover:text-white"
          >
            <FacebookIcon className="h-5 w-5" />
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
              className="h-40 w-40 object-cover md:h-52 md:w-52"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
