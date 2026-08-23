import "server-only";

/**
 * PayPal Orders v2 REST client (second processor, D-039). Sandbox by default;
 * set PAYPAL_ENV=live for production. No SDK — three calls: token, create,
 * capture.
 */

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function baseUrl(): string {
  return process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal is not configured.");
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !body.access_token) throw new Error(`PayPal auth failed: ${body.error_description ?? res.status}`);
  return body.access_token;
}

async function call<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "PayPal-Request-Id": init.idempotencyKey } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as T & { message?: string; details?: { issue?: string; description?: string }[] }) : ({} as T);
  if (!res.ok) {
    const b = body as { message?: string; details?: { issue?: string; description?: string }[] };
    const detail = b.details?.[0]?.description ?? b.details?.[0]?.issue;
    throw new Error(`PayPal ${path} → ${res.status}: ${detail ?? b.message ?? "error"}`);
  }
  return body;
}

export interface PayPalAmountBreakdown {
  item_total: string;
  shipping: string;
  tax_total: string;
  discount?: string;
}

export interface PayPalCreateOrderInput {
  orderId: string;
  email: string | null;
  currency: string;
  value: string;
  breakdown: PayPalAmountBreakdown;
  items: { name: string; sku: string; quantity: number; unitValue: string }[];
  shipping: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface PayPalOrder {
  id: string;
  status: string;
  purchase_units?: {
    reference_id?: string;
    custom_id?: string;
    payments?: { captures?: { id: string; status: string; amount?: { value: string; currency_code: string } }[] };
  }[];
  payer?: { email_address?: string; name?: { given_name?: string; surname?: string } };
}

export async function createPayPalOrder(input: PayPalCreateOrderInput): Promise<PayPalOrder> {
  return call<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    idempotencyKey: `create-${input.orderId}`,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.orderId,
          custom_id: input.orderId,
          invoice_id: `PS-${input.orderId}`,
          description: "Private Stock merch & apparel",
          amount: {
            currency_code: input.currency,
            value: input.value,
            breakdown: {
              item_total: { currency_code: input.currency, value: input.breakdown.item_total },
              shipping: { currency_code: input.currency, value: input.breakdown.shipping },
              tax_total: { currency_code: input.currency, value: input.breakdown.tax_total },
              ...(input.breakdown.discount
                ? { discount: { currency_code: input.currency, value: input.breakdown.discount } }
                : {}),
            },
          },
          items: input.items.map((i) => ({
            name: i.name.slice(0, 127),
            sku: i.sku.slice(0, 127),
            quantity: String(i.quantity),
            category: "PHYSICAL_GOODS",
            unit_amount: { currency_code: input.currency, value: i.unitValue },
          })),
          shipping: {
            name: { full_name: input.shipping.fullName.slice(0, 300) },
            address: {
              address_line_1: input.shipping.line1,
              ...(input.shipping.line2 ? { address_line_2: input.shipping.line2 } : {}),
              admin_area_2: input.shipping.city,
              admin_area_1: input.shipping.state,
              postal_code: input.shipping.postalCode,
              country_code: input.shipping.country,
            },
          },
        },
      ],
      ...(input.email ? { payer: { email_address: input.email } } : {}),
      application_context: {
        brand_name: "Private Stock",
        shipping_preference: "SET_PROVIDED_ADDRESS",
        user_action: "PAY_NOW",
      },
    }),
  });
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<PayPalOrder> {
  return call<PayPalOrder>(`/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    idempotencyKey: `capture-${paypalOrderId}`,
    body: "{}",
  });
}

export async function getPayPalOrder(paypalOrderId: string): Promise<PayPalOrder> {
  return call<PayPalOrder>(`/v2/checkout/orders/${paypalOrderId}`, { method: "GET" });
}

export const cents = (v: number) => (v / 100).toFixed(2);
