import "server-only";
import { EMAIL_NOTIFY_TO, notifyStaff, send } from "@/lib/email";
import { money } from "@/lib/commerce/config";
import type { OrderItemRow, OrderWithItems, ShippingAddressJson } from "@/lib/commerce/orders";

/**
 * On-brand, simple HTML emails (D-042, Resend):
 *  - customer order confirmation (items, totals, shipping address, "tracking
 *    when it ships")
 *  - staff notification to ambrose@ with per-item fulfillment_provider tags
 *  - customer shipping notification (carrier + tracking)
 * All sends are idempotent per order via Resend idempotency keys.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://privatestock.co";
const BLACK = "#111318";
const MUTED = "#6b7280";
const RULE = "#e7e7e7";

function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function addressHtml(a: ShippingAddressJson | null): string {
  if (!a) return `<span style="color:${MUTED}">—</span>`;
  const lines = [a.name, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(", "), a.country]
    .filter((x) => x && String(x).trim())
    .map((x) => esc(String(x)));
  return lines.join("<br>");
}

function addressText(a: ShippingAddressJson | null): string {
  if (!a) return "—";
  return [a.name, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(", "), a.country]
    .filter((x) => x && String(x).trim())
    .join("\n");
}

function providerTag(p: string | null): { label: string; bg: string } {
  switch (p) {
    case "printify":
      return { label: "PRINTIFY — place order in Printify", bg: "#dbeafe" };
    case "tapstitch":
      return { label: "TAPSTITCH — place order in Tapstitch", bg: "#fce7f3" };
    default:
      return { label: "SELF — pack & ship", bg: "#dcfce7" };
  }
}

function itemsTable(items: OrderItemRow[], withProvider: boolean): string {
  const rows = items
    .map((i) => {
      const tag = providerTag(i.fulfillment_provider);
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${RULE};vertical-align:top">
          ${i.image_url ? `<img src="${esc(i.image_url)}" width="56" height="56" alt="" style="display:inline-block;vertical-align:top;margin-right:12px;border-radius:2px;object-fit:cover">` : ""}
          <div style="display:inline-block;vertical-align:top">
            <div style="font-weight:600;color:${BLACK}">${esc(i.title ?? "Item")}</div>
            <div style="font-size:12px;color:${MUTED}">${esc(i.variant_label)}${i.sku ? ` · SKU ${esc(i.sku)}` : ""} · qty ${i.qty}</div>
            ${withProvider ? `<div style="margin-top:4px;display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;padding:2px 6px;border-radius:2px;background:${tag.bg};color:${BLACK}">${tag.label}</div>` : ""}
          </div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${RULE};text-align:right;vertical-align:top;color:${BLACK}">${money(i.unit_price_cents * i.qty)}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${rows}</table>`;
}

function totalsTable(o: OrderWithItems): string {
  const row = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0;color:${bold ? BLACK : MUTED};font-weight:${bold ? 700 : 400}">${label}</td><td style="padding:4px 0;text-align:right;color:${BLACK};font-weight:${bold ? 700 : 400}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:8px">
    ${row("Subtotal", money(o.subtotal_cents ?? 0))}
    ${o.discount_cents ? row(`Discount${o.promo_code ? ` (${esc(o.promo_code)})` : ""}`, `− ${money(o.discount_cents)}`) : ""}
    ${row("Shipping", o.shipping_cents ? money(o.shipping_cents) : "FREE")}
    ${row("Tax", money(o.tax_cents ?? 0))}
    ${row("Total", money(o.total_cents ?? 0), true)}
  </table>`;
}

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Helvetica,Arial,sans-serif;color:${BLACK}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff">
      <tr><td style="padding:28px 32px 8px;border-bottom:1px solid ${RULE}">
        <div style="font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:${MUTED}">Private Stock Cannabis Co.</div>
        <div style="font-size:22px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;margin-top:6px">${esc(title)}</div>
      </td></tr>
      <tr><td style="padding:20px 32px 28px;font-size:14px;line-height:1.55">${body}</td></tr>
      <tr><td style="padding:16px 32px 28px;border-top:1px solid ${RULE};font-size:11px;color:${MUTED}">
        Private Stock LLC · Chicago, IL · <a href="${SITE}" style="color:${MUTED}">privatestock.co</a><br>
        Merch &amp; apparel only — no cannabis products are sold online. For adults 21+.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export function orderConfirmationEmail(o: OrderWithItems) {
  const statusUrl = `${SITE}/apparel/order/${o.id}`;
  const html = shell(
    "Order confirmed",
    `<p>Thanks${o.customer_name ? `, ${esc(o.customer_name.split(" ")[0])}` : ""} — we've got your order <strong>#${shortId(o.id)}</strong>.</p>
     ${itemsTable(o.order_items, false)}
     ${totalsTable(o)}
     <h3 style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${MUTED};margin:24px 0 6px">Shipping to</h3>
     <p style="margin:0">${addressHtml(o.shipping_address as ShippingAddressJson | null)}</p>
     <p style="margin-top:24px">You'll get a second email with tracking as soon as it ships. Check your order anytime:
       <a href="${statusUrl}" style="color:${BLACK};font-weight:600">${statusUrl}</a></p>`,
  );
  return { subject: `Private Stock order #${shortId(o.id)} confirmed`, html };
}

export function staffOrderEmail(o: OrderWithItems) {
  const counts = o.order_items.reduce<Record<string, number>>((m, i) => {
    const k = i.fulfillment_provider ?? "self";
    m[k] = (m[k] ?? 0) + i.qty;
    return m;
  }, {});
  const summary = Object.entries(counts)
    .map(([k, n]) => `${n} × ${k.toUpperCase()}`)
    .join(" · ");
  const html = shell(
    `New order #${shortId(o.id)} — ${summary}`,
    `<p><strong>${esc(o.payment_provider.toUpperCase())}</strong> · ${money(o.total_cents ?? 0)} · ${esc(o.email)}${o.promo_code ? ` · promo ${esc(o.promo_code)}` : ""}</p>
     ${itemsTable(o.order_items, true)}
     ${totalsTable(o)}
     <h3 style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${MUTED};margin:24px 0 6px">Ship to</h3>
     <pre style="margin:0;font:13px/1.5 Helvetica,Arial,sans-serif;white-space:pre-wrap">${esc(addressText(o.shipping_address as ShippingAddressJson | null))}</pre>
     <p style="margin-top:24px"><a href="${SITE}/admin/orders/${o.id}" style="display:inline-block;background:${BLACK};color:#fff;text-decoration:none;padding:12px 18px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px">Open in /admin/orders</a></p>`,
  );
  return { subject: `🛍 New order #${shortId(o.id)} — ${summary} — ${money(o.total_cents ?? 0)}`, html };
}

export function shippingEmail(o: OrderWithItems, tracking: { carrier: string; number: string; url?: string | null }) {
  const statusUrl = `${SITE}/apparel/order/${o.id}`;
  const html = shell(
    "Your order has shipped",
    `<p>Order <strong>#${shortId(o.id)}</strong> is on its way.</p>
     <p style="margin:16px 0;padding:14px 16px;border:1px solid ${RULE}"><strong>${esc(tracking.carrier)}</strong> · tracking
       ${tracking.url ? `<a href="${esc(tracking.url)}" style="color:${BLACK};font-weight:600">${esc(tracking.number)}</a>` : `<strong>${esc(tracking.number)}</strong>`}</p>
     ${itemsTable(o.order_items, false)}
     <p style="margin-top:24px">Order status: <a href="${statusUrl}" style="color:${BLACK};font-weight:600">${statusUrl}</a></p>`,
  );
  return { subject: `Private Stock order #${shortId(o.id)} has shipped`, html };
}

/** Customer confirmation + staff notification for a freshly-paid order. */
export async function sendOrderEmails(o: OrderWithItems) {
  const results = [];
  if (o.email) {
    const c = orderConfirmationEmail(o);
    results.push(await send({ to: o.email, subject: c.subject, html: c.html, idempotencyKey: `order-confirm-${o.id}` }));
  }
  const s = staffOrderEmail(o);
  results.push(await notifyStaff(s.subject, s.html, { replyTo: o.email ?? undefined, idempotencyKey: `order-staff-${o.id}` }));
  return results;
}

export async function sendShippingEmail(o: OrderWithItems, tracking: { carrier: string; number: string; url?: string | null }) {
  if (!o.email) return { ok: true as const, skipped: true as const, reason: "no customer email" };
  const m = shippingEmail(o, tracking);
  return send({ to: o.email, subject: m.subject, html: m.html, idempotencyKey: `order-ship-${o.id}-${tracking.number}` });
}

export { EMAIL_NOTIFY_TO };
