import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CheckoutClient } from "@/components/site/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

/**
 * /apparel/checkout — cart summary + two payment paths side by side:
 * "Pay with card / wallet" (Stripe Checkout) and PayPal buttons. The PayPal
 * client id is public by nature; it's passed from the server env so the
 * browser bundle never hard-codes it.
 */
export default function CheckoutPage() {
  return (
    <main className="flex min-h-svh flex-col bg-white">
      <Header />
      <section className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 md:py-16">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-tight text-ink md:text-4xl">Checkout</h1>
        <CheckoutClient
          stripeReady={Boolean(process.env.STRIPE_SECRET_KEY)}
          paypalClientId={process.env.PAYPAL_CLIENT_ID ?? null}
        />
      </section>
      <Footer />
    </main>
  );
}
