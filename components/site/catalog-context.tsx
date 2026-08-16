"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CatalogModal } from "@/components/site/CatalogModal";
import type { BrandBookManifest } from "@/lib/brand-book";

/**
 * Shared Catalog (Brand Book) modal state. Mounted once per public page in the
 * layout so every trigger on the page opens the SAME flip-book overlay: the
 * header's CATALOG nav item and the "VIEW THE BRAND BOOK" link in the intro
 * section today, anything else added later.
 */
export interface CatalogChrome {
  /** False when the rendered brand-book pages/manifest are missing. */
  available: boolean;
  open: boolean;
  openCatalog: () => void;
  closeCatalog: () => void;
}

const CatalogContext = createContext<CatalogChrome | null>(null);

const NO_CATALOG: CatalogChrome = {
  available: false,
  open: false,
  openCatalog: () => {},
  closeCatalog: () => {},
};

/** Safe outside a provider (admin routes, tests) — reports unavailable. */
export function useCatalog(): CatalogChrome {
  return useContext(CatalogContext) ?? NO_CATALOG;
}

export function CatalogProvider({
  manifest,
  children,
}: {
  manifest: BrandBookManifest | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const openCatalog = useCallback(() => setOpen(true), []);
  const closeCatalog = useCallback(() => setOpen(false), []);

  const value = useMemo<CatalogChrome>(
    () => ({
      available: manifest !== null,
      open,
      openCatalog,
      closeCatalog,
    }),
    [manifest, open, openCatalog, closeCatalog],
  );

  return (
    <CatalogContext.Provider value={value}>
      {children}
      {manifest && (
        <CatalogModal
          open={open}
          onClose={closeCatalog}
          pageCount={manifest.pageCount}
          aspectRatio={manifest.aspectRatio}
        />
      )}
    </CatalogContext.Provider>
  );
}
