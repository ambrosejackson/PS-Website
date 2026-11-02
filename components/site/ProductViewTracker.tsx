"use client";

import { useEffect } from "react";
import { useConsent } from "@/components/site/ConsentProvider";
import { trackProductView } from "@/lib/analytics/client";

/**
 * Emits one `product_view` per product detail render (D-140). Rendered by the
 * server-side catalog product page and by ApparelDetail. Waits for consent so a
 * visitor who accepts on the product page is still counted.
 */
export function ProductViewTracker({ productId, kind }: { productId: string; kind: "merch" | "apparel" | "catalog" }) {
  const consent = useConsent();
  useEffect(() => {
    if (consent !== "accepted") return;
    trackProductView(productId, kind);
  }, [consent, productId, kind]);
  return null;
}
