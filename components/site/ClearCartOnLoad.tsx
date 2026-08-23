"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/context";

/** Mounted on the order confirmation page after a successful payment: empties the cart once. */
export function ClearCartOnLoad() {
  const cart = useCart();
  useEffect(() => {
    cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
