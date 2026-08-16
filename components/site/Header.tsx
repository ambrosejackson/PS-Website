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
 * Same structure everywhere (guardrail #5) — hamburger + PS badge left,
 * BRANDS  STORE LOCATOR  YOUR REWARDS  [login] [cart] right, underline hover —
 * in one of two chrome treatments:
 *
 * - "solid" (default, every non-brand page): a SOLID WHITE bar that sits ABOVE
 *   the hero, black content, no per-asset theming. Matches
 *   docs/reference/lovable/01-header-hero.png.
 * - "overlay" (brand landing pages only): the original transparent bar overlaid
 *   on the hero, text/logo themed off the active asset (decision 9).
 *
 * Nav hover drives the hero media swap in both treatments.
 */

const NAV_ITEMS = [
  { label: "BRANDS", href: "/#brands" },
  { label: "STORE LOCATOR", href: "/store-locator" },
  { label: "YOUR REWARDS", href: "/rewards" },
];

export function Header({
  variant = "solid",
}: {
  variant?: "solid" | "overlay";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, navEnter, navLeave } = useHeroChrome();

  const overlay = variant === "overlay";
  // Overlay only: "light" asset (bright top band) → dark text; "dark" → white.
  const overlayLight = overlay && theme === "light";

  const chrome = overlay
    ? `absolute inset-x-0 top-0 transition-colors duration-300 ${
        overlayLight ? "text-neutral-900" : "text-white"
      }`
    : "relative w-full shrink-0 bg-white text-neutral-950";

  const bar = overlay
    ? "flex items-center justify-between px-5 py-5 md:px-10"
    : "mx-auto flex h-[72px] max-w-screen-2xl items-center justify-between px-6 md:h-28 md:px-12";

  return (
    <>
      <header className={`z-40 ${chrome}`}>
        <div className={bar}>
          <div className="flex items-center gap-4 md:gap-6">
            <button
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="p-1 transition-opacity hover:opacity-60"
            >
              <Menu
                className={overlay ? "h-7 w-7 md:h-8 md:w-8" : "h-6 w-6 md:h-7 md:w-7"}
                strokeWidth={overlay ? 1.25 : 1.5}
              />
            </button>
            <Link href="/" aria-label="Private Stock home">
              <Logo
                variant={overlay && !overlayLight ? "white" : "black"}
                className={overlay ? "h-16 w-auto md:h-24" : "h-11 w-auto md:h-16"}
              />
            </Link>
          </div>

          <nav className={`flex items-center gap-5 ${overlay ? "md:gap-9" : "md:gap-11"}`}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onMouseEnter={() => navEnter(item.label)}
                onMouseLeave={navLeave}
                className={`nav-underline hidden font-condensed font-semibold uppercase md:inline-block ${
                  overlay
                    ? "text-[13px] tracking-[0.22em]"
                    : "text-[12px] tracking-[0.16em]"
                }`}
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
        </div>
      </header>
      <FullscreenMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
