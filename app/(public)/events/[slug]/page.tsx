import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { RsvpForm } from "@/components/events/RsvpForm";
import { getDispensaryOptions, getEventBySlug, getPlateStats, rsvpIsOpen } from "@/lib/events/queries";
import { eventContent } from "@/lib/events/content";
import { eventDate, eventTimeRange, eventUrl, siteUrl } from "@/lib/events/format";

// Plates-left changes as people RSVP; a short ISR window keeps it close to live.
export const revalidate = 30;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const ev = await getEventBySlug(slug);
  if (!ev) return {};
  const content = eventContent(slug);
  const title = ev.tagline ? `${ev.name}: ${ev.tagline}` : ev.name;
  const description = `${eventDate(ev)}, ${eventTimeRange(ev)} · ${ev.address}. Free with RSVP, 21+. ${content?.intro ?? ""}`.trim();
  return {
    title,
    description,
    alternates: { canonical: eventUrl(slug) },
    openGraph: { title, description, url: eventUrl(slug), images: content ? [{ url: content.flyer.src }] : undefined },
  };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-condensed text-sm font-semibold uppercase tracking-wide text-kb-blue">{label}</p>
      <div className="mt-1 text-lg leading-snug text-ink">{children}</div>
    </div>
  );
}

export default async function EventPage({ params }: Params) {
  const { slug } = await params;
  const ev = await getEventBySlug(slug);
  if (!ev) notFound();
  const content = eventContent(slug);
  const [dispensaries, plates] = await Promise.all([getDispensaryOptions(), getPlateStats(ev)]);
  const open = rsvpIsOpen(ev);
  const date = eventDate(ev);
  const time = eventTimeRange(ev);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: ev.tagline ? `${ev.name}: ${ev.tagline}` : ev.name,
    startDate: ev.starts_at,
    endDate: ev.ends_at,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: ev.venue_name ?? ev.address, address: ev.address },
    image: content ? [`${siteUrl()}${content.flyer.src}`] : undefined,
    description: content?.intro,
    typicalAgeRange: "21-",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD", url: eventUrl(slug), availability: "https://schema.org/InStock" },
    organizer: [
      { "@type": "Organization", name: "Private Stock Cannabis Co.", url: "https://privatestock.co" },
      { "@type": "Organization", name: "Renegades of Funk" },
    ],
  };

  return (
    <main>
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero: the flyer art on black. h1 carries the event name for SEO; the art repeats it. */}
      <section className="relative overflow-hidden bg-black text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_75%_40%,rgba(247,209,23,0.18),transparent_70%),radial-gradient(40%_50%_at_10%_90%,rgba(36,88,214,0.25),transparent_70%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div>
            <p className="font-condensed text-sm font-semibold uppercase tracking-[0.2em] text-kb-yellow">
              Private Stock × Renegades of Funk
            </p>
            <h1 className="sr-only">{ev.tagline ? `${ev.name}: ${ev.tagline}` : ev.name}</h1>
            {content ? (
              <Image src={content.logo.src} alt={content.logo.alt} width={content.logo.width} height={content.logo.height} priority className="mt-4 h-auto w-full max-w-[560px]" />
            ) : (
              <p className="mt-4 font-condensed text-6xl font-bold uppercase">{ev.name}</p>
            )}
            <div className="mt-6 inline-block -rotate-1 border-2 border-black bg-kb-yellow px-5 py-3 font-condensed text-xl font-bold uppercase leading-tight text-black shadow-[6px_6px_0_#000] md:text-2xl">
              <span className="block">{date}</span>
              <span className="block">{time}</span>
              <span className="block">Free w/ RSVP (21+)</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#rsvp" className="inline-flex h-12 items-center rounded-lg bg-kb-yellow px-8 font-condensed text-base font-bold uppercase tracking-wide text-black transition hover:brightness-95">
                {open ? "RSVP free" : "RSVPs closed"}
              </a>
              <a href="#budtenders" className="inline-flex h-12 items-center rounded-lg border border-white/40 px-6 font-condensed text-base font-semibold uppercase tracking-wide text-white transition hover:bg-white/10">
                Budtenders eat free
              </a>
            </div>
          </div>
          {content && (
            <Image
              src={content.flyer.src}
              alt={content.flyer.alt}
              width={content.flyer.width}
              height={content.flyer.height}
              priority
              className="mx-auto hidden h-auto w-full max-w-[440px] drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)] md:block"
            />
          )}
        </div>
      </section>

      {/* Facts */}
      <section className="bg-kb-yellow">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="When">{date}<br />{time}</Fact>
          <Fact label="Where">
            {ev.address.split(",")[0]}
            {ev.venue_name && <><br /><span className="text-base">({ev.venue_name})</span></>}
            {ev.map_url && (
              <><br /><a href={ev.map_url} target="_blank" rel="noopener noreferrer" className="text-base underline underline-offset-4">Open map</a></>
            )}
          </Fact>
          <Fact label="Entry">Free with RSVP<br />Free parking lot<br />Age 21+</Fact>
          <Fact label="Hosts">{content ? content.hosts.map((h) => h.name).join(" & ") : "Private Stock"}</Fact>
        </div>
      </section>

      {content && (
        <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <h2 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink md:text-5xl">What to expect</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-neutral-600">{content.intro}</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {content.expect.map((x) => (
              <figure key={x.title}>
                <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                  <Image src={x.img} alt={x.alt} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
                </div>
                <figcaption className="mt-3 font-condensed text-xl font-bold uppercase text-ink">{x.title}</figcaption>
              </figure>
            ))}
          </div>
          {content.paintBattle && (
            <p className="mt-10 border-l-4 border-kb-yellow pl-4 text-lg text-ink">
              <strong className="font-condensed uppercase">The paint battle:</strong> {content.paintBattle}
            </p>
          )}
        </section>
      )}

      {/* Budtender callout + form */}
      <section id="rsvp" className="scroll-mt-24 border-t border-hairline bg-neutral-50">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1fr_1.4fr] md:py-24">
          <div id="budtenders" className="scroll-mt-24">
            <h2 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink md:text-5xl">RSVP</h2>
            <p className="mt-4 leading-relaxed text-neutral-600">
              Free entry, one RSVP per person. Your ticket (with a QR code) lands in your inbox right away.
            </p>
            <div className="mt-8 border-2 border-ink bg-white p-5">
              <p className="font-condensed text-2xl font-bold uppercase leading-tight text-ink">Budtenders eat free</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                Work the counter at a licensed Illinois dispensary? Tick the budtender box, tell us your dispensary and
                town, and your BBQ plate is on the house. Bring your valid IDFPR dispensary agent badge on the day.
              </p>
              <p className="mt-3 font-condensed text-lg font-semibold uppercase text-kb-blue">
                {plates.left > 0 ? `${plates.left} of ${plates.cap} plates left` : "Plates claimed: waitlist open"}
              </p>
            </div>
          </div>
          <div>
            {open ? (
              <RsvpForm slug={slug} dispensaries={dispensaries} platesLeft={plates.left} plateCap={plates.cap} />
            ) : (
              <div className="border border-hairline bg-white p-8">
                <p className="font-condensed text-2xl font-bold uppercase text-ink">RSVPs are closed</p>
                <p className="mt-2 text-neutral-600">Thanks to everyone who pulled up. Follow us for the next one.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {content && (
        <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h2 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">FAQ</h2>
            <dl className="mt-8 divide-y divide-hairline border-y border-hairline">
              {content.faq.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-condensed text-lg font-semibold uppercase text-ink">
                    {f.q}
                    <span aria-hidden="true" className="ml-4 text-2xl leading-none transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-neutral-600">{f.a}</p>
                </details>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">The hosts</h2>
            <div className="mt-8 space-y-6">
              {content.hosts.map((h) => (
                <div key={h.name} className="border border-hairline p-6">
                  <p className="font-condensed text-xl font-bold uppercase text-ink">{h.name}</p>
                  <p className="mt-2 leading-relaxed text-neutral-600">{h.blurb}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <Footer />
    </main>
  );
}
