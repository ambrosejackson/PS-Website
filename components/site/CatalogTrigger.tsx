"use client";

import Link from "next/link";
import { useCatalog } from "@/components/site/catalog-context";

/**
 * Any in-page pointer to the Catalog (Brand Book) modal. Opens the SAME modal
 * the header's CATALOG item opens — shared state lives in catalog-context.
 * Falls back to the on-page brand rows when the brand book isn't rendered.
 */
export function CatalogTrigger({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const { available, openCatalog } = useCatalog();

  if (!available) {
    return (
      <Link href="/#brands" className={className}>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={openCatalog} className={className}>
      {label}
    </button>
  );
}
