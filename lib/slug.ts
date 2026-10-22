/**
 * URL slug from a human name — shared by the product, apparel and collection
 * admin forms (D-135: moved here from the deleted sheet-sync mapper).
 * Lower-case ASCII, accents stripped, "&" → "and", runs of anything else → "-",
 * trimmed, max 120 chars.
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
