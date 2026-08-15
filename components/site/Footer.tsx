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

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav aria-label={heading}>
      <p className="font-condensed text-sm font-semibold uppercase tracking-wide text-ink">
        {heading}
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-neutral-500 hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-white text-ink">
      <div className="mx-auto grid max-w-screen-2xl gap-10 px-6 py-14 md:grid-cols-[2fr_1fr_1fr_1fr] md:px-12">
        <div>
          <Logo className="h-24 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
            A dedication to the exceptional — from cultivation to retail to
            community.
          </p>
          <div className="mt-5 flex gap-3">
            <a
              href="https://www.instagram.com/privatestockcannabis"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="border border-neutral-300 p-2 transition-colors hover:bg-ink hover:text-white"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a
              href="https://www.facebook.com/privatestockcannabis"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="border border-neutral-300 p-2 transition-colors hover:bg-ink hover:text-white"
            >
              <FacebookIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        <FooterColumn heading="Shop" links={SHOP_LINKS} />
        <FooterColumn
          heading="Brands"
          links={BRANDS.map((b) => ({ href: `/${b.slug}`, label: b.name }))}
        />
        <FooterColumn
          heading="Company"
          links={[...COMPANY_LINKS, ...LEGAL_LINKS]}
        />
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 px-6 py-6 text-xs text-neutral-400 md:flex-row md:items-center md:justify-between md:px-12">
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
