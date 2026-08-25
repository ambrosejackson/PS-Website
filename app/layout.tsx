import type { Metadata } from "next";
import {
  Archivo_Black,
  Caveat,
  Geist,
  Geist_Mono,
  Oswald,
  Poppins,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Brand-page approximations of each brand's live-site typography (I-014).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://privatestock.co",
  ),
  title: {
    default: "Private Stock Cannabis Co.",
    template: "%s | Private Stock",
  },
  description:
    "Private Stock Cannabis Co. — a dedication to the exceptional. Home of Outfitters, TerpKings, Higher Self, and Savage Squad Strains.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${poppins.variable} ${caveat.variable} ${archivoBlack.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          Pre-paint age-gate resolution (I-063). The gate markup ships in the
          static HTML for EVERY visitor — useAgeVerified's SSR snapshot is
          false — so an already-verified visitor watched it paint and then
          vanish at hydration. That flash also stepped on the hero video's
          first frames (most visibly on /terpkings). This script runs while the
          body is still parsing, BEFORE the gate markup exists, and stamps
          <html data-age-ok="1">; globals.css hides [data-age-gate] under that
          attribute, so the gate never paints for a verified visitor. Visitors
          without the cookie get no attribute and see the gate as before.
          Keep it inline and synchronous — next/script would run too late.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(/(?:^|;\\s*)ps_age_verified=1(?:\\s*;|$)/.test(document.cookie)){document.documentElement.setAttribute('data-age-ok','1')}}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
