"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { FacebookIcon, InstagramIcon } from "@/components/site/social-icons";

/**
 * Full-screen hamburger menu per the docx reference (Jeeter): close X top-left
 * beside the logo, left-aligned column of condensed uppercase links, social
 * icons at the bottom of the column.
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
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-neutral-950/97 text-white">
      <div className="flex items-center gap-5 px-5 py-5 md:px-10">
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="p-1 transition-opacity hover:opacity-60"
        >
          <X className="h-7 w-7 md:h-8 md:w-8" strokeWidth={1.25} />
        </button>
        <Link href="/" onClick={onClose} aria-label="Private Stock home">
          <Logo variant="white" className="h-16 w-auto md:h-24" />
        </Link>
      </div>
      <nav className="flex flex-col items-start gap-5 px-8 py-10 md:px-24">
        {MENU_ITEMS.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="nav-underline font-condensed text-3xl font-bold uppercase tracking-tight md:text-4xl"
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
            <InstagramIcon className="h-6 w-6" />
          </a>
          <a
            href="https://www.facebook.com/privatestockcannabis"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="transition-opacity hover:opacity-60"
          >
            <FacebookIcon className="h-6 w-6" />
          </a>
        </div>
      </nav>
    </div>
  );
}
