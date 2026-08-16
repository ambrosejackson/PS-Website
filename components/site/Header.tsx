"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ShoppingBag, User } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { FullscreenMenu } from "@/components/site/FullscreenMenu";
import { useHeroChrome } from "@/components/site/hero-context";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * Identical on every page (guardrail #5): hamburger + large PS logo left;
 * BRANDS  STORE LOCATOR  YOUR REWARDS  [login] [cart] right; overlaid on the
 * full-bleed hero; text themes off the active hero asset; underline hover.
 */

const NAV_ITEMS = [
  { label: "BRANDS", href: "/#brands" },
  { label: "STORE LOCATOR", href: "/store-locator" },
  { label: "YOUR REWARDS", href: "/rewards" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, navEnter, navLeave } = useHeroChrome();

  // "light" asset (bright top band) → dark text; "dark" asset → white text.
  const color = theme === "light" ? "text-neutral-900" : "text-white";

  return (
    <>
      <header
        className={`absolute inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-5 transition-colors duration-300 md:px-10 ${color}`}
      >
        <div className="flex items-center gap-4 md:gap-6">
          <button
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="p-1 transition-opacity hover:opacity-60"
          >
            <Menu className="h-7 w-7 md:h-8 md:w-8" strokeWidth={1.25} />
          </button>
          <Link href="/" aria-label="Private Stock home">
            <Logo
              variant={theme === "light" ? "black" : "white"}
              className="h-16 w-auto md:h-24"
            />
          </Link>
        </div>

        <nav className="flex items-center gap-5 md:gap-9">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onMouseEnter={() => navEnter(item.label)}
              onMouseLeave={navLeave}
              className="nav-underline hidden font-condensed text-[13px] font-semibold uppercase tracking-[0.22em] md:inline-block"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/rewards"
            aria-label="Log in"
            className="p-1 transition-opacity hover:opacity-60"
          >
            <User className="h-5 w-5 md:h-[22px] md:w-[22px]" strokeWidth={1.5} />
          </Link>
          <Sheet>
            <SheetTrigger
              aria-label="Cart"
              className="p-1 transition-opacity hover:opacity-60"
            >
              <ShoppingBag
                className="h-5 w-5 md:h-[22px] md:w-[22px]"
                strokeWidth={1.5}
              />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="font-condensed uppercase tracking-wide">Your cart</SheetTitle>
                <SheetDescription>
                  Shop opening soon — merch and apparel checkout is on the way.
                </SheetDescription>
              </SheetHeader>
              <div className="px-4">
                <Button
                  render={<Link href="/apparel">Preview Apparel</Link>}
                  variant="outline"
                  className="w-full"
                />
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </header>
      <FullscreenMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
