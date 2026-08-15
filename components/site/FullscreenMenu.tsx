"use client";

import Link from "next/link";
import { X } from "lucide-react";

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
    <div className="fixed inset-0 z-[70] flex flex-col bg-neutral-950/97 text-white">
      <button
        onClick={onClose}
        aria-label="Close menu"
        className="absolute right-6 top-6 p-2 transition-opacity hover:opacity-60"
      >
        <X className="h-8 w-8" strokeWidth={1.25} />
      </button>
      <nav className="flex flex-1 flex-col items-center justify-center gap-6">
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
      </nav>
    </div>
  );
}
