import { CatalogProvider } from "@/components/site/catalog-context";
import { SiteProviders } from "@/components/site/SiteProviders";
import { getBrandBookManifest } from "@/lib/brand-book";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // One Catalog (Brand Book) modal per page, shared by every trigger: the
  // header's CATALOG item and the intro section's link (D-021).
  const brandBook = await getBrandBookManifest();

  return (
    <SiteProviders>
      <CatalogProvider manifest={brandBook}>{children}</CatalogProvider>
    </SiteProviders>
  );
}
