import Link from "next/link";
import { FacebookIcon, InstagramIcon } from "@/components/site/social-icons";
import { Logo } from "@/components/site/Logo";
import { BRANDS } from "@/lib/brands";

const SHOP_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/apparel", label: "Apparel" },
  { href: "/store-locator", label: "Store Locator" },
  { href: "/rewards", label: "Rewards" },
];

const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/news", label: "In the News" },
  { href: "/contact", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
];

export function Footer() {
  return (
    <footer className="bg-neutral-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo className="h-16 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
            A dedication to the exceptional — from cultivation to retail to
            community.
          </p>
          <div className="mt-5 flex gap-3">
            <a
              href="https://www.instagram.com/privatestockcannabis"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="rounded-full border border-white/20 p-2 transition-colors hover:bg-white hover:text-neutral-950"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a
              href="https://www.facebook.com/privatestockcannabis"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="rounded-full border border-white/20 p-2 transition-colors hover:bg-white hover:text-neutral-950"
            >
              <FacebookIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        <nav aria-label="Shop">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/40">
            SHOP
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {SHOP_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/70 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Brands">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/40">
            BRANDS
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {BRANDS.map((b) => (
              <li key={b.slug}>
                <Link
                  href={`/${b.slug}`}
                  className="text-white/70 hover:text-white"
                >
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/40">
            COMPANY
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {COMPANY_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/70 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/70 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-white/40 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Private Stock LLC. All rights
            reserved.
          </p>
          <p>
            For adults 21 and older. Keep out of reach of children. Cannabis
            products have not been evaluated by the FDA.
          </p>
        </div>
      </div>
    </footer>
  );
}
