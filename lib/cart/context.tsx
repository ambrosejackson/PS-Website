"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  CART_STORAGE_KEY,
  MAX_QTY_PER_LINE,
  SHIPPING_PREF_STORAGE_KEY,
  ZIP_RE,
  isShippingService,
  type ShippingOption,
  type ShippingQuote,
  type ShippingService,
} from "@/lib/commerce/config";

/**
 * Client cart — keyed by merch_variants.id with qty, persisted in localStorage.
 * Line snapshots (name/variant/price/image/slug) are for DISPLAY only; every
 * checkout path re-prices from the database server-side (never trust client
 * prices). `open` drives the header drawer.
 *
 * Shipping (D-120): the buyer's ZIP and chosen USPS service live beside the
 * cart; a quote is fetched from /api/shipping/quote whenever the ZIP or the
 * lines change, and `shippingCents` is the chosen option's price (null until
 * a ZIP is entered — "calculated at checkout"). Both rails re-quote server-side.
 */

export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  /** e.g. "M · Black" */
  variantLabel: string;
  sku: string;
  priceCents: number;
  image: string | null;
  qty: number;
  /** Pre-order: ISO date the product ships by (D-123). Display only. */
  shipsAfter?: string | null;
}

export type ShippingStatus = "idle" | "loading" | "ready" | "error";

interface CartApi {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  /** Chosen option's price, or null while no ZIP / no quote yet. */
  shippingCents: number | null;
  /** Latest ships_after across the cart, or null. */
  shipsAfter: string | null;
  shipping: {
    zip: string;
    service: ShippingService;
    status: ShippingStatus;
    quote: ShippingQuote | null;
    option: ShippingOption | null;
    error: string | null;
    setZip: (zip: string) => void;
    setService: (service: ShippingService) => void;
  };
  open: boolean;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

const CartContext = createContext<CartApi | null>(null);

// ---- external store over localStorage so SSR/hydration never mismatch ----
const listeners = new Set<() => void>();
let cached: { raw: string | null; lines: CartLine[] } = { raw: null, lines: [] };
const EMPTY: CartLine[] = [];

function readLines(): CartLine[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cached.raw) return cached.lines;
  let lines: CartLine[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      lines = parsed.filter(
        (l): l is CartLine =>
          l && typeof l.variantId === "string" && typeof l.qty === "number" && l.qty > 0 && typeof l.priceCents === "number",
      );
    }
  } catch {
    lines = [];
  }
  cached = { raw, lines };
  return lines;
}

function writeLines(lines: CartLine[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CART_STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

interface ShipPref {
  zip: string;
  service: ShippingService;
}

function readShipPref(): ShipPref {
  try {
    const raw = typeof window === "undefined" ? null : localStorage.getItem(SHIPPING_PREF_STORAGE_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<ShipPref>) : {};
    return {
      zip: typeof p.zip === "string" && ZIP_RE.test(p.zip) ? p.zip : "",
      service: isShippingService(p.service) ? p.service : "standard",
    };
  } catch {
    return { zip: "", service: "standard" };
  }
}

function writeShipPref(p: ShipPref) {
  try {
    localStorage.setItem(SHIPPING_PREF_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(subscribe, readLines, () => EMPTY);
  const [open, setOpen] = useState(false);

  // ---- shipping preference + quote
  const [pref, setPref] = useState<ShipPref>({ zip: "", service: "standard" });
  const [prefLoaded, setPrefLoaded] = useState(false);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [status, setStatus] = useState<ShippingStatus>("idle");
  const [shipError, setShipError] = useState<string | null>(null);

  useEffect(() => {
    // Hydrate the stored preference once on the client (never during SSR).
    const stored = readShipPref();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage hydration
    setPref(stored);
    setPrefLoaded(true);
  }, []);

  const lineKey = lines.map((l) => `${l.variantId}:${l.qty}`).join(",");

  useEffect(() => {
    if (!prefLoaded) return;
    if (!ZIP_RE.test(pref.zip) || lines.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- derived reset when inputs vanish
      setQuote(null);
      setStatus("idle");
      setShipError(null);
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    setShipError(null);
    fetch("/api/shipping/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ zip: pref.zip, lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })) }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "Could not get shipping rates.");
        return body as ShippingQuote;
      })
      .then((q) => {
        setQuote(q);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setQuote(null);
        setStatus("error");
        setShipError(e instanceof Error ? e.message : "Could not get shipping rates.");
      });
    return () => controller.abort();
    // lineKey stands in for `lines` so a re-render with identical lines does not re-quote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefLoaded, pref.zip, lineKey]);

  const setZip = useCallback((zip: string) => {
    const z = zip.replace(/\D/g, "").slice(0, 5);
    setPref((p) => {
      const next = { ...p, zip: z };
      writeShipPref(next);
      return next;
    });
  }, []);

  const setService = useCallback((service: ShippingService) => {
    setPref((p) => {
      const next = { ...p, service };
      writeShipPref(next);
      return next;
    });
  }, []);

  const add = useCallback((line: Omit<CartLine, "qty">, qty = 1) => {
    const current = readLines();
    const existing = current.find((l) => l.variantId === line.variantId);
    const next = existing
      ? current.map((l) =>
          l.variantId === line.variantId ? { ...l, ...line, qty: Math.min(MAX_QTY_PER_LINE, l.qty + qty) } : l,
        )
      : [...current, { ...line, qty: Math.min(MAX_QTY_PER_LINE, Math.max(1, qty)) }];
    writeLines(next);
    setOpen(true);
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    const current = readLines();
    const next =
      qty <= 0
        ? current.filter((l) => l.variantId !== variantId)
        : current.map((l) => (l.variantId === variantId ? { ...l, qty: Math.min(MAX_QTY_PER_LINE, qty) } : l));
    writeLines(next);
  }, []);

  const remove = useCallback((variantId: string) => {
    writeLines(readLines().filter((l) => l.variantId !== variantId));
  }, []);

  const clear = useCallback(() => writeLines([]), []);

  const value = useMemo<CartApi>(() => {
    const subtotal = lines.reduce((s, l) => s + l.priceCents * l.qty, 0);
    // If the chosen service isn't in the quote (Priority during fallback), use what is.
    const option = quote ? (quote.options.find((o) => o.service === pref.service) ?? quote.options[0] ?? null) : null;
    const shipsAfter = lines.reduce<string | null>(
      (latest, l) => (l.shipsAfter && (!latest || l.shipsAfter > latest) ? l.shipsAfter : latest),
      null,
    );
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotalCents: subtotal,
      shippingCents: option ? option.cents : null,
      shipsAfter,
      shipping: {
        zip: pref.zip,
        service: option?.service ?? pref.service,
        status,
        quote,
        option,
        error: shipError,
        setZip,
        setService,
      },
      open,
      add,
      setQty,
      remove,
      clear,
      setOpen,
    };
  }, [lines, open, add, setQty, remove, clear, pref, quote, status, shipError, setZip, setService]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const NO_CART: CartApi = {
  lines: EMPTY,
  count: 0,
  subtotalCents: 0,
  shippingCents: null,
  shipsAfter: null,
  shipping: { zip: "", service: "standard", status: "idle", quote: null, option: null, error: null, setZip: () => {}, setService: () => {} },
  open: false,
  add: () => {},
  setQty: () => {},
  remove: () => {},
  clear: () => {},
  setOpen: () => {},
};

/** Safe outside a provider (admin, 404) — an inert empty cart. */
export function useCart(): CartApi {
  return useContext(CartContext) ?? NO_CART;
}
