"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { CART_STORAGE_KEY, MAX_QTY_PER_LINE, shippingCents } from "@/lib/commerce/config";

/**
 * Client cart — keyed by merch_variants.id with qty, persisted in localStorage.
 * Line snapshots (name/variant/price/image/slug) are for DISPLAY only; every
 * checkout path re-prices from the database server-side (never trust client
 * prices). `open` drives the header drawer.
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
}

interface CartApi {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  shippingCents: number;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(subscribe, readLines, () => EMPTY);
  const [open, setOpen] = useState(false);

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
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotalCents: subtotal,
      shippingCents: shippingCents(subtotal),
      open,
      add,
      setQty,
      remove,
      clear,
      setOpen,
    };
  }, [lines, open, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const NO_CART: CartApi = {
  lines: EMPTY,
  count: 0,
  subtotalCents: 0,
  shippingCents: 0,
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
