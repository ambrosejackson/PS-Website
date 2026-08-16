"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { FacebookIcon, InstagramIcon } from "@/components/site/social-icons";
import {
  barClass,
  clusterClass,
  iconClass,
  iconStroke,
  logoClass,
  type HeaderVariant,
} from "@/components/site/header-chrome";

/**
 * Hamburger menu per the docx reference (Jeeter): close X top-left beside the
 * logo, left-aligned column of condensed uppercase links, social icons at the
 * bottom of the column.
 *
 * The top row reuses the header's own geometry (header-chrome.ts) so the X sits
 * exactly where the hamburger was and the logo neither moves nor resizes when
 * the menu opens (D-015). On mobile the panel is a left drawer over a dimmed
 * page; from md up it stays full-bleed as before.
 */

const MENU_ITEMS = [
  { href: "/", label: "HOME" },
  { href: "/about", label: "ABOUT" },
  { href: "/products", label: "PRODUCTS" },
  { href: "/apparel", label: "APPAREL" },
  { href: "/rewards", label: "REWARDS" },
  { href: "/contact", label: "CONTACT" },
];

export function FullscreenMenu({
  open,
  onClose,
  variant = "solid",
}: {
  open: boolean;
  onClose: () => void;
  variant?: HeaderVariant;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Dimmed page at the right edge — tapping it closes the drawer. */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 md:hidden"
      />
      <div className="absolute inset-y-0 left-0 w-[83%] max-w-[26rem] overflow-y-auto bg-neutral-950/97 text-white md:w-full md:max-w-none">
        <div className={barClass(variant)}>
          <div className={clusterClass}>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="p-1 transition-opacity hover:opacity-60"
            >
              <X
                className={iconClass(variant)}
                strokeWidth={iconStroke(variant)}
              />
            </button>
            <Link href="/" onClick={onClose} aria-label="Private Stock home">
              <Logo variant="white" className={logoClass(variant)} />
            </Link>
          </div>
        </div>
        {/* Same left gutter as the hamburger/logo above. */}
        <nav className="flex flex-col items-start gap-5 px-6 py-10 md:px-12">
          {MENU_ITEMS.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="nav-underline font-condensed text-4xl font-bold uppercase tracking-tight md:text-[2.7rem]"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-6 flex gap-5">
            <a
              href="https://www.instagram.com/privatestockcannabis"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="transition-opacity hover:opacity-60"
            >
              <InstagramIcon className="h-[1.8rem] w-[1.8rem]" />
            </a>
            <a
              href="https://www.facebook.com/privatestockcannabis"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="transition-opacity hover:opacity-60"
            >
              <FacebookIcon className="h-[1.8rem] w-[1.8rem]" />
            </a>
          </div>
        </nav>
      </div>
    </div>
  );
}
