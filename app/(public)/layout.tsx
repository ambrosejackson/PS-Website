import { SiteProviders } from "@/components/site/SiteProviders";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteProviders>{children}</SiteProviders>;
}
