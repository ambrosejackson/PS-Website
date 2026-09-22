import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BadgeInstruction } from "@/components/events/RsvpForm";
import { TicketActions } from "@/components/events/TicketActions";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventDate, eventTimeRange } from "@/lib/events/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your ticket", robots: { index: false, follow: false } };

type Params = {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ cancel?: string; unsubscribe?: string }>;
};

/** Guest ticket: QR for the gate, plate status, add-to-calendar, cancel / unsubscribe. The token is the credential. */
export default async function TicketPage({ params, searchParams }: Params) {
  const { slug, token } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();
  const admin = createAdminClient();
  const { data } = await admin.from("event_rsvps").select("*, events!inner(*)").eq("ticket_token", token).eq("events.slug", slug).maybeSingle();
  if (!data) notFound();
  const { events: ev, ...r } = data;

  const cancelled = r.status === "cancelled";
  return (
    <main className="flex min-h-svh flex-col bg-white">
      <Header />
      <section className="mx-auto w-full max-w-xl flex-1 px-5 py-12 md:py-16">
        <p className="font-condensed text-sm font-semibold uppercase tracking-[0.2em] text-kb-blue">Your ticket</p>
        <h1 className="mt-2 font-condensed text-4xl font-bold uppercase tracking-tight text-ink">
          {ev.name}
          {ev.tagline && <span className="block text-2xl text-neutral-600">{ev.tagline}</span>}
        </h1>
        <p className="mt-4 text-lg text-ink">
          {eventDate(ev)}, {eventTimeRange(ev)}
          <br />
          {ev.address}
          {ev.map_url && (
            <>
              {" · "}
              <a href={ev.map_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">map</a>
            </>
          )}
        </p>

        {cancelled ? (
          <div className="mt-8 border border-hairline bg-neutral-50 p-6">
            <p className="font-condensed text-2xl font-bold uppercase text-ink">This RSVP is cancelled</p>
            <p className="mt-2 text-neutral-600">
              Changed your mind? <Link href={`/events/${slug}#rsvp`} className="underline underline-offset-4">RSVP again</Link> with the same email.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 border-2 border-ink p-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic PNG from our own route */}
              <img src={`/api/rsvp/qr/${token}`} width={240} height={240} alt="Ticket QR code" className="mx-auto" />
              <p className="mt-4 font-condensed text-2xl font-bold uppercase text-ink">
                {r.first_name} {r.last_name}
              </p>
              <p className="text-sm text-neutral-500">Show this at the gate with a valid 21+ photo ID.</p>
              {r.checked_in_at && <p className="mt-3 font-condensed text-lg font-semibold uppercase text-green-700">Checked in</p>}
            </div>

            {r.is_budtender && r.plate_status === "confirmed" && (
              <div className="mt-6">
                <p className="mb-3 font-condensed text-lg font-semibold uppercase text-ink">
                  {r.plate_redeemed_at ? "Plate redeemed. Enjoy!" : "Free BBQ plate reserved"}
                </p>
                {!r.plate_redeemed_at && <BadgeInstruction />}
              </div>
            )}
            {r.is_budtender && r.plate_status === "waitlisted" && (
              <div className="mt-6 border border-hairline bg-neutral-50 p-4 text-sm text-neutral-700">
                <p className="font-condensed text-base font-bold uppercase text-ink">
                  Plate waitlist{r.plate_waitlist_position ? `: #${r.plate_waitlist_position}` : ""}
                </p>
                <p className="mt-1">We&apos;ll email you if a plate opens up. Bring your IDFPR dispensary agent badge just in case.</p>
              </div>
            )}
          </>
        )}

        <TicketActions
          token={token}
          slug={slug}
          cancelled={cancelled}
          checkedIn={Boolean(r.checked_in_at)}
          optedIn={r.marketing_opt_in}
          intent={sp.cancel === "1" ? "cancel" : sp.unsubscribe === "1" ? "unsubscribe" : null}
        />
      </section>
      <Footer />
    </main>
  );
}
