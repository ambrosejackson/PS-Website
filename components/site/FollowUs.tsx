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
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 text-center">
        <h2 className="font-serif text-3xl tracking-[0.18em] text-neutral-900 md:text-4xl">
          FOLLOW US
        </h2>
        <div className="mt-6 flex items-center justify-center gap-4">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Private Stock on Instagram"
            className="rounded-full border border-neutral-300 p-3 transition-colors hover:bg-neutral-900 hover:text-white"
          >
            <InstagramIcon className="h-5 w-5" />
          </a>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Private Stock on Facebook"
            className="rounded-full border border-neutral-300 p-3 transition-colors hover:bg-neutral-900 hover:text-white"
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
              className="h-40 w-40 rounded-sm object-cover md:h-52 md:w-52"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
