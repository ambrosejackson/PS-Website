import { brandByName } from "@/lib/brands";
import type { SheetTab } from "./fetch";

/**
 * Sheet row → catalog_products mapping (approved 2026-08-22, see DECISIONS
 * I-044). Pure functions — no I/O — so the mapping can be dry-run and tested.
 *
 * Sheet-owned columns (written on every sync): name, brand, category, format,
 * weight, strain_type, image_url, image_missing. Seeded ONCE on insert, admin-
 * owned afterwards: description, terp_category. Never touched: thc_range,
 * is_active, terpene_profile, sort_order.
 */

export type TerpCategory = "fruit" | "haze" | "gas" | "dessert" | "floral";

export interface MappedRow {
  sheetRowRef: string;
  tab: SheetTab;
  brand: string;
  name: string;
  category: string;
  format: string | null;
  weight: string | null;
  strainType: "indica" | "sativa" | "hybrid" | null;
  imageUrl: string | null;
  imageMissing: boolean;
  /** Seeded on insert only. */
  description: string | null;
  terpCategory: TerpCategory | null;
  /** Set when the row must be stored as quarantined. */
  quarantineReason: string | null;
}

export type MapResult =
  | { kind: "row"; row: MappedRow }
  | { kind: "skip"; reason: string } // non-allowlisted brand, blank row — silent
  | { kind: "invalid"; reason: string; tab: SheetTab; rowIndex: number }; // no stable key — reported, not stored

export const TAB_CATEGORY: Record<SheetTab, string> = {
  Flower: "Flower",
  "Pre-Roll": "Pre-Rolls",
  Vape: "Vapes",
  Edible: "Edibles",
  Extract: "Extracts",
  Tincture: "Tinctures",
  Topical: "Topicals",
  Gear: "Gear",
  "Merch.": "Merch",
};

/* ---------- helpers ---------- */

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** First record value whose header starts with one of the prefixes (normalized). */
function col(rec: Record<string, string>, ...prefixes: string[]): string {
  for (const p of prefixes) {
    const np = norm(p);
    for (const [h, v] of Object.entries(rec)) {
      if (norm(h).startsWith(np)) return (v ?? "").trim();
    }
  }
  return "";
}

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

function titleCase(s: string): string {
  const cap = (w: string) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w);
  return s
    .replace(/\[[^\]]*\]/g, " ") // drop [Fruit]-style tags from categories
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.split("-").map(cap).join("-"))
    .join(" ")
    .replace(/\bPre Roll\b/gi, "Pre-Roll")
    .replace(/\bAll In One\b/gi, "All-In-One");
}

/** "3.5g " → "3.5g"; "1.75" → "1.75g"; "500mg" stays; "[2g]" → "2g". */
function normWeight(s: string): string | null {
  let t = s.replace(/[\[\]]/g, "").replace(/\s+/g, "").toLowerCase();
  if (!t) return null;
  if (t.startsWith(".")) t = "0" + t;
  if (/^\d+(\.\d+)?$/.test(t)) return `${t}g`;
  if (/^\d+(\.\d+)?(g|mg|oz|ml)$/.test(t)) return t;
  return t.slice(0, 40);
}

function normPack(s: string): string | null {
  const t = s.replace(/[\[\]]/g, "").replace(/\s+/g, "").toLowerCase();
  const m = t.match(/^(\d+)\s*(pk|pack|ct)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  return n > 1 ? `${n}pk` : null;
}

function strainType(lineage: string): MappedRow["strainType"] {
  const l = lineage.toLowerCase();
  if (l.includes("indica")) return "indica";
  if (l.includes("sativa")) return "sativa";
  if (l.includes("hybrid")) return "hybrid";
  return null;
}

const DRIVE_ID_RES = [
  /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/,
  /drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,})/,
  /drive\.google\.com\/thumbnail\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,})/,
  /lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]{10,})/,
];

/**
 * Drive file ID → browser-loadable image URL (D-063). `drive.google.com/uc?
 * export=view` answers a bare GET with the image but returns 403 text/html to
 * an <img> fetch (Sec-Fetch-Dest: image + Referer) — Google blocks hotlinking
 * there. The lh3 CDN form serves inline; `=w1200` asks for a resized copy
 * instead of the multi-MB original.
 */
export const driveImageUrl = (id: string) => `https://lh3.googleusercontent.com/d/${id}=w1200`;

/** Returns {url} for a usable image URL, {missing} for blank, {bad} for junk. */
export function normalizeImage(raw: string): { url: string } | { missing: true } | { bad: string } {
  const s = raw.trim();
  if (!s) return { missing: true };
  for (const re of DRIVE_ID_RES) {
    const m = s.match(re);
    if (m) return { url: driveImageUrl(m[1]) };
  }
  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:") return { url: u.toString() };
  } catch {
    /* fallthrough */
  }
  return { bad: `Image link is not a URL: "${s.slice(0, 60)}"` };
}

const TERP_TAG = /\[(fruit|haze|gas|dessert|floral)\]/i;
function terpCategoryFromName(brand: string, name: string): TerpCategory | null {
  if (brand !== "TerpKings") return null;
  const m = name.match(TERP_TAG);
  return m ? (m[1].toLowerCase() as TerpCategory) : null;
}

/** Standard-size rows hold the size in "Pack Size Next Steps"; instruction text otherwise. */
function packSizeNextSteps(rec: Record<string, string>): string | null {
  const v = col(rec, "pack size next steps");
  if (!v || /^(enter|for products)/i.test(v)) return null;
  return normWeight(v);
}

function sizeFromName(name: string): string | null {
  const m = name.match(/(\d+(?:\.\d+)?)\s*(mg|g)\b/i);
  return m ? `${m[1]}${m[2].toLowerCase()}` : null;
}

/* ---------- the mapping ---------- */

export function mapRecord(tab: SheetTab, rec: Record<string, string>, rowIndex: number): MapResult {
  const rawBrand = col(rec, "brand");
  if (!rawBrand) return { kind: "skip", reason: "blank brand" };
  const brand = brandByName(rawBrand.replace(/\s+/g, " "));
  if (!brand) return { kind: "skip", reason: `brand not allowlisted: ${rawBrand}` };

  const name = col(rec, "product name").replace(/\s+/g, " ").trim();
  if (!name || /^\|?\s*(\|\s*)*$/.test(name)) {
    return { kind: "invalid", reason: "missing product name", tab, rowIndex };
  }

  const category = TAB_CATEGORY[tab];
  const brandCategory = col(rec, "brand category");
  const lineage = col(rec, "lineage");
  const nonStd = col(rec, "enter non-standard pack size");

  let format: string | null = brandCategory ? titleCase(brandCategory) : null;
  let weight: string | null = null;

  switch (tab) {
    case "Flower":
    case "Extract": {
      weight = packSizeNextSteps(rec) ?? normWeight(nonStd);
      break;
    }
    case "Pre-Roll": {
      const total = normWeight(col(rec, "total weight"));
      const pack = normPack(col(rec, "pack size"));
      const each = normWeight(col(rec, "amount [g]", "amount"));
      const w = total ?? (pack && each ? `${pack} × ${each}` : each);
      weight = w ? (pack && total ? `${pack} · ${total}` : w) : null;
      break;
    }
    case "Vape": {
      const type = col(rec, "product type");
      const parts = [brandCategory, type].filter(Boolean).map(titleCase);
      format = [...new Set(parts.map((x) => x.toLowerCase()))].map((l) => parts.find((x) => x.toLowerCase() === l)!).join(" ") || null;
      weight = normWeight(nonStd) ?? sizeFromName(name);
      break;
    }
    case "Edible":
    case "Tincture":
    case "Topical": {
      const amount = col(rec, "container amount", "pack size");
      const dose = col(rec, "dosage");
      weight = [amount, dose].filter(Boolean).join(" ").replace(/[\[\]()]/g, "").trim() || null;
      break;
    }
    default:
      break;
  }

  const img = normalizeImage(col(rec, "image link"));
  const description = col(rec, "product description") || null;

  const row: MappedRow = {
    sheetRowRef: `${slugify(tab)}|${brand.slug}|${slugify(name)}${weight ? "|" + slugify(weight) : ""}`,
    tab,
    brand: brand.name,
    name,
    category,
    format,
    weight,
    strainType: strainType(lineage),
    imageUrl: "url" in img ? img.url : null,
    imageMissing: "missing" in img,
    description,
    terpCategory: terpCategoryFromName(brand.name, name),
    quarantineReason: "bad" in img ? img.bad : null,
  };
  return { kind: "row", row };
}
