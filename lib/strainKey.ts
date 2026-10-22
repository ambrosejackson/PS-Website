/**
 * Normalizes a catalog or dispensary-menu product name to a brand-agnostic
 * strain key, so "Higher Self | AppleScotti | Small Batch Flower | Hybrid |"
 * and "Higher Self Apple Scotti 14g Prepack" both become "applescotti".
 *
 * The database computes the same key (migration `strain_key`, function
 * `public.strain_key(text)`) into generated columns on `catalog_products`
 * and `product_availability`; the join happens there. This copy exists for
 * admin previews and tests. KEEP THE VOCABULARY IDENTICAL TO THE SQL.
 */

const FORMAT_WORDS =
  "liquid diamonds?|all ?in ?one|aio|astro vape|live astro|live atro|premium astro|astro|" +
  "premium flower|premium smalls|premium|small batch flower|small batch|smalls|popcorn|flower|" +
  "vape stone|stone|vape cartridge|vape cart|cartridge|cart|disposable|vape|preroll pack|pre ?rolls?|preroll|" +
  "infused blunt|blunt|glass tip|hash infused|hash|live resin|reserve|prepack|pre pack|infused|blowout sale!?|" +
  "top shelf|diamond|each|pack|pk|hybrid|indica|sativa|" +
  "[0-9]+(\\.[0-9]+)?\\s*(mg|ml|g|oz)|[0-9]+\\s*(pk|pack|ct)|1/[248]oz";

const FORMAT_RE = new RegExp(`(?<![a-z0-9])(${FORMAT_WORDS})(?![a-z0-9])`, "g");
const FORMAT_RE_CI = new RegExp(`(?<![A-Za-z0-9])(${FORMAT_WORDS})(?![A-Za-z0-9])`, "gi");
const BRAND_RE = /(higher self|savage squad strains|savage squad|terp kings|terpkings|outfitters)/g;
// Pipe-delimited ALL-CAPS category tags from one menu platform ("Magic Melonade | FRUIT | Liquid Diamonds").
// Case-sensitive on purpose so "Razz Gas" and "Forbidden Fruit" survive.
const PIPE_TAG_RE = /\|\s*(FRUIT|GAS|DESSERT|FLORAL|HAZE)\s*(?=\||$)/g;
const ACCENTS: Record<string, string> = { ç: "c", á: "a", í: "i", é: "e", ó: "o", ú: "u" };

export function strainKey(name: string | null | undefined): string {
  let s = (name ?? "").replace(PIPE_TAG_RE, "|");
  s = s.toLowerCase().replace(/[çáíéóú]/g, (ch) => ACCENTS[ch] ?? ch);
  s = s.replace(/\[[^\]]*\]/g, " ").replace(/\([^)]*\)/g, " ");
  s = s.replace(BRAND_RE, " ");
  s = s.replace(/[|/,:–—-]/g, " ");
  s = s.replace(FORMAT_RE, " ").replace(FORMAT_RE, " ");
  return s.replace(/[^a-z0-9]+/g, "");
}

/**
 * The human-readable strain name for a catalog row: the second pipe field when
 * the name is pipe-delimited ("Brand | Strain | Format | …"), else the name,
 * with bracket tags and format words removed but original casing kept —
 * "Razz Gas [Gas] Liquid Diamonds All-In-One" → "Razz Gas".
 */
export function strainDisplayName(catalogName: string): string {
  const parts = catalogName.split("|").map((p) => p.trim()).filter(Boolean);
  const field = parts.length > 1 ? parts[1] : catalogName.trim();
  const cleaned = field
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[\-–—]/g, " ")
    .replace(FORMAT_RE_CI, " ")
    .replace(FORMAT_RE_CI, " ")
    .replace(/[\s\-–—]+/g, " ")
    .trim();
  return cleaned || field;
}
