import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CartPage } from "@/components/shop/CartPage";

export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false, follow: false },
};

/** /apparel/cart — full-page cart (D-067: the drawer's "View cart"). Same chrome as checkout. */
export default function ApparelCartPage() {
  return (
    <main className="flex min-h-svh flex-col bg-white">
      <Header />
      <section className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 md:py-16">
        <nav className="mb-6 font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">
          <Link href="/apparel" className="hover:text-ink">
            Apparel
          </Link>{" "}
          / <span className="text-ink">Cart</span>
        </nav>
        <h1 className="mb-8 font-condensed text-3xl font-bold uppercase tracking-tight text-ink md:text-4xl">Cart</h1>
        <CartPage />
      </section>
      <Footer />
    </main>
  );
}
