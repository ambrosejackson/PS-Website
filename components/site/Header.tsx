"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ShoppingBag, User } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { FullscreenMenu } from "@/components/site/FullscreenMenu";
import { useHeroChrome } from "@/components/site/hero-context";
import { useCatalog } from "@/components/site/catalog-context";
import { useCart } from "@/lib/cart/context";
import {
  barClass,
  clusterClass,
  iconClass,
  iconStroke,
  logoClass,
  navIconClass,
  navTextClass,
  type HeaderVariant,
} from "@/components/site/header-chrome";

/**
 * Same structure everywhere (guardrail #5) — hamburger + PS badge left,
 * CATALOG  STORE LOCATOR  YOUR REWARDS  [login] [cart] right, underline hover —
 * in one of two chrome treatments:
 *
 * - "solid" (default, every non-brand page): a SOLID WHITE bar that sits ABOVE
 *   the hero, black content, no per-asset theming. Bar geometry follows the
 *   expanded menu's old row rather than the lovable reference's proportions
 *   (D-018) — the reference still governs the white ground and black content.
 * - "overlay" (brand landing pages only): the original transparent bar overlaid
 *   on the hero, text/logo themed off the active asset (decision 9).
 *
 * Nav hover drives the hero media swap in both treatments; CATALOG's CLICK
 * opens the Brand Book flip-book modal (D-021) instead of navigating.
 */

/**
 * CATALOG (D-021) opens the Brand Book flip-book modal instead of navigating;
 * it keeps the hero hover-swap, which still keys off the seeded asset's
 * nav_target "BRANDS" — hence `heroTarget`. `href` is the no-JS / no-brand-book
 * fallback the button degrades to.
 */
const NAV_ITEMS = [
  { label: "CATALOG", href: "/#brands", heroTarget: "BRANDS", opensCatalog: true },
  { label: "STORE LOCATOR", href: "/store-locator" },
  { label: "YOUR REWARDS", href: "/rewards" },
] as const;

export function Header({
  variant = "solid",
}: {
  variant?: HeaderVariant;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, navEnter, navLeave } = useHeroChrome();
  const catalog = useCatalog();
  const cart = useCart();

  const overlay = variant === "overlay";
  // Overlay only: "light" asset (bright top band) → dark text; "dark" → white.
  const overlayLight = overlay && theme === "light";

  const chrome = overlay
    ? `absolute inset-x-0 top-0 transition-colors duration-300 ${
        overlayLight ? "text-neutral-900" : "text-white"
      }`
    : "relative w-full shrink-0 bg-white text-neutral-950";

  return (
    <>
      <header data-hero-no-mute className={`z-40 ${chrome}`}>
        <div className={barClass}>
          <div className={clusterClass(variant)}>
            <button
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="p-1 transition-opacity hover:opacity-60"
            >
              <Menu className={iconClass} strokeWidth={iconStroke} />
            </button>
            <Link href="/" aria-label="Private Stock home">
              <Logo
                variant={overlay && !overlayLight ? "white" : "black"}
                className={logoClass(variant)}
              />
            </Link>
          </div>

          <nav className={`flex items-center gap-5 ${overlay ? "md:gap-9" : "md:gap-11"}`}>
            {NAV_ITEMS.map((item) => {
              const itemClass = `nav-underline hidden font-condensed font-semibold uppercase md:inline-block ${navTextClass(variant)}`;
              const hover = {
                onMouseEnter: () =>
                  navEnter("heroTarget" in item ? item.heroTarget : item.label),
                onMouseLeave: navLeave,
              };
              // Hover still swaps the hero; the click opens the catalog modal.
              if ("opensCatalog" in item && catalog.available) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={catalog.openCatalog}
                    className={itemClass}
                    {...hover}
                  >
                    {item.label}
                  </button>
                );
              }
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={itemClass}
                  {...hover}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/rewards"
              aria-label="Log in"
              className="p-1 transition-opacity hover:opacity-60"
            >
              <User className={navIconClass(variant)} strokeWidth={1.5} />
            </Link>
            {/* Cart icon → CartDrawer (mounted once in SiteProviders) */}
            <button
              type="button"
              aria-label={cart.count > 0 ? `Cart, ${cart.count} items` : "Cart"}
              onClick={() => cart.setOpen(true)}
              className="relative p-1 transition-opacity hover:opacity-60"
            >
              <ShoppingBag className={navIconClass(variant)} strokeWidth={1.5} />
              {cart.count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-current px-1 font-condensed text-[10px] font-bold leading-none">
                  <span className={overlay && !overlayLight ? "text-neutral-900" : "text-white"}>{cart.count}</span>
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>
      <FullscreenMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        variant={variant}
      />
    </>
  );
}
