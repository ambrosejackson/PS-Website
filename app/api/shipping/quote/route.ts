import { NextResponse } from "next/server";
import { priceCart, PricingError, quoteCart } from "@/lib/commerce/pricing";

/**
 * Cart-page shipping quote (D-120): ZIP + (variantId, qty) in → the two USPS
 * options out, priced from server-side variant data. Amounts returned here are
 * for DISPLAY; each checkout rail re-quotes from the same inputs. Short cache
 * so a buyer flipping between tabs doesn't re-hit Shippo.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { zip?: string; lines?: { variantId: string; qty: number }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const cart = await priceCart(body.lines ?? []);
    const quote = await quoteCart(cart, body.zip ?? "");
    return NextResponse.json(quote, { headers: { "Cache-Control": "private, max-age=900" } });
  } catch (e) {
    if (e instanceof PricingError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[shipping/quote]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not get shipping rates — please try again." }, { status: 500 });
  }
}
