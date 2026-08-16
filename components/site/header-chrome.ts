/**
 * Shared geometry for the header bar and the fullscreen menu's top row.
 *
 * ANCHOR (D-018): the expanded menu's old row is the reference — the closed
 * header's hamburger + logo sit where the menu's X + logo sat (20px gutter
 * mobile / 40px desktop, py-5, row height derived from the logo). The closed
 * and open states therefore render the SAME left cluster and nothing moves when
 * the menu toggles. Both sides import from here — never hard-code these values
 * in one place only, or the two states drift apart again.
 */

export type HeaderVariant = "solid" | "overlay";

/**
 * Bar wrapper: page gutter + vertical padding. Height is intentionally NOT
 * fixed — it follows the logo, exactly as the old menu row did. No max-width
 * container: the cluster must sit on the viewport gutter, not a centered rail.
 */
export const barClass =
  "flex items-center justify-between px-5 py-5 md:px-10";

/** Gap between the hamburger/X and the logo. */
export function clusterClass(variant: HeaderVariant): string {
  return variant === "overlay"
    ? "flex items-center gap-4 md:gap-6"
    : "flex items-center gap-5";
}

/** Hamburger and X share one box so the glyph lands on the same pixel. */
export const iconClass = "h-7 w-7 md:h-8 md:w-8";
export const iconStroke = 1.25;

/** Solid logo = the size it rendered at next to the X (4rem / 6rem), +20%. */
export function logoClass(variant: HeaderVariant): string {
  return variant === "overlay"
    ? "h-16 w-auto md:h-24"
    : "h-[4.8rem] w-auto md:h-[7.2rem]";
}

/** Right-nav label type. Solid is the old 12px/0.16em +20%. */
export function navTextClass(variant: HeaderVariant): string {
  return variant === "overlay"
    ? "text-[13px] tracking-[0.22em]"
    : "text-[0.9rem] tracking-[0.16em]";
}

/** Login/cart icons. Solid is the old 20/22px +20%. */
export function navIconClass(variant: HeaderVariant): string {
  return variant === "overlay"
    ? "h-5 w-5 md:h-[22px] md:w-[22px]"
    : "h-6 w-6 md:h-[26.4px] md:w-[26.4px]";
}
