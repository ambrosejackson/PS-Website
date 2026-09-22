import { getEventBySlug } from "@/lib/events/queries";
import { eventIcs } from "@/lib/events/ics";

/** "Add to calendar" file for an event. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ev = await getEventBySlug(slug);
  if (!ev) return new Response("Not found", { status: 404 });
  return new Response(eventIcs(ev), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
