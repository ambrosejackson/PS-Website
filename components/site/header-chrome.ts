/**
 * Shared geometry for the header bar and the fullscreen menu's top row.
 *
 * The closed header and the open menu render the SAME left cluster (icon button
 * + PS badge) at the SAME bar height, gutter, gap and icon/logo size, so
 * toggling the menu moves nothing (docs/DECISIONS.md D-015). Both sides import
 * from here — never hard-code these values in one place only, or the two states
 * drift apart again.
 */

export type HeaderVariant = "solid" | "overlay";

/** Bar wrapper: height + page gutter. Left cluster is flush to the gutter. */
export function barClass(variant: HeaderVariant): string {
  return variant === "overlay"
    ? "flex items-center justify-between px-5 py-5 md:px-10"
    : "mx-auto flex h-24 max-w-screen-2xl items-center justify-between px-6 md:h-28 md:px-12";
}

/** Gap between the hamburger/X and the logo. */
export const clusterClass = "flex items-center gap-4 md:gap-6";

/** Hamburger and X share one box so the glyph lands on the same pixel. */
export function iconClass(variant: HeaderVariant): string {
  return variant === "overlay"
    ? "h-7 w-7 md:h-8 md:w-8"
    : "h-6 w-6 md:h-7 md:w-7";
}

export function iconStroke(variant: HeaderVariant): number {
  return variant === "overlay" ? 1.25 : 1.5;
}

/** Solid mobile logo = the size it used to render at in the menu (4rem) +20%. */
export function logoClass(variant: HeaderVariant): string {
  return variant === "overlay"
    ? "h-16 w-auto md:h-24"
    : "h-[4.8rem] w-auto md:h-16";
}
