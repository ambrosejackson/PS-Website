import { VT323 } from "next/font/google";

/**
 * VT323 — loaded via next/font/google and SCOPED to the TerpKings surfaces:
 * the /terpkings page applies `vt323.variable` on its <main>; the TK age gate
 * and newsletter popup (rendered by the global providers, outside <main>) apply
 * it on their own roots and are only pulled in via next/dynamic on /terpkings,
 * so the font never ships on other pages. `.tk-mono` reads --font-vt323.
 */
export const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});
