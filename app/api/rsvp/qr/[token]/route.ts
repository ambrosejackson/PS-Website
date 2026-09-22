import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventUrl, ticketUrl } from "@/lib/events/format";

/**
 * Ticket QR as a PNG (email clients block data: URIs, so the confirmation
 * email links here). Encodes the ticket URL; the check-in screen pulls the
 * 48-hex token back out of whatever it scans. Unknown tokens 404.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) return new Response("Not found", { status: 404 });
  const admin = createAdminClient();
  const { data } = await admin.from("event_rsvps").select("ticket_token, events(slug)").eq("ticket_token", token).maybeSingle();
  const slug = (data?.events as { slug: string } | null)?.slug;
  if (!data || !slug) return new Response("Not found", { status: 404 });
  const png = await QRCode.toBuffer(ticketUrl(slug, token), { type: "png", width: 480, margin: 2, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Robots-Tag": "noindex",
      Link: `<${eventUrl(slug)}>; rel="canonical"`,
    },
  });
}
