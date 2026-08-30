/**
 * TerpKings brand-page content — brand marketing copy, NOT catalog data.
 * Transcribed verbatim from the Claude Design export
 * (docs/reference/terpkings/terpkings-subpage.html, `<script type="text/x-dc">`
 * block + template). Hex values are the export's exact values.
 *
 * Product images: the export referenced `assets/*.png`; ours live in
 * public/brand-assets/terpkings/ as compressed .webp (PNG >300KB were converted,
 * see scripts note in DECISIONS). Missing files render a brand-palette
 * placeholder instead (see TKProductImage).
 */

export const TK_ASSETS = "/brand-assets/terpkings";

/** Exact palette from the export (named for reuse — never change a value). */
export const TK = {
  bg: "#050604",
  bgDeep: "#020302",
  panel: "#0B0F07",
  panelAlt: "#070A05",
  merchBg: "#0A0D06",
  lime: "#A8C64E",
  limeBright: "#D8F26E",
  limeDim: "#8A9E5C",
  limeMuted: "#5B6E35",
  limeSoft: "#7A8E4C",
  cream: "#E8F0C8",
  body: "#C8D4A0",
  amber: "#FFB000",
  yellow: "#FFD400",
  ink: "#141809",
  borderDark: "#3A4A22",
  borderMid: "#3E5222",
  borderPanel: "#1E2612",
  borderInner: "#2E3A1C",
  borderCard: "#39422A",
  heroBtnText: "#C9E06A",
} as const;

/** Hero CRT layers (exact gradients from the export). */
export const TK_HERO = {
  base: "radial-gradient(ellipse 70% 60% at 50% 45%, #6B7A42 0%, #3E4A26 45%, #181D0E 80%, #0A0C06 100%)",
  multiplyTint:
    "radial-gradient(ellipse 75% 65% at 50% 45%, rgba(168,198,110,.8) 0%, rgba(96,116,52,.85) 45%, rgba(34,42,18,.92) 85%)",
  screenHighlight:
    "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(200,230,130,.35) 0%, transparent 70%)",
  scanlines:
    "repeating-linear-gradient(0deg, rgba(0,0,0,.32) 0px, rgba(0,0,0,.32) 2px, transparent 2px, transparent 5px)",
  static:
    "radial-gradient(1px 1px at 15% 25%, rgba(0,0,0,.5) 50%, transparent 51%), radial-gradient(2px 2px at 60% 70%, rgba(0,0,0,.4) 50%, transparent 51%), radial-gradient(1.5px 1.5px at 80% 30%, rgba(255,255,255,.12) 50%, transparent 51%), radial-gradient(1px 1px at 35% 85%, rgba(0,0,0,.45) 50%, transparent 51%)",
  rollbar:
    "linear-gradient(180deg, transparent, rgba(215,235,150,.08), transparent)",
  vignette:
    "radial-gradient(ellipse 85% 75% at 50% 50%, transparent 45%, rgba(2,3,1,.55) 78%, rgba(2,3,1,.96) 100%)",
  tagline: "BROADCASTING FROM PROVIDENCE 35974C",
  cornerTop: "P 0001 · TITLE CARD ▮",
  cornerSide: "REC ▮▮ TK-2600",
  scroll: "▼ SCROLL TO DECRYPT",
} as const;

export type TerpKey = "gas" | "haze" | "dessert" | "fruit" | "floral";

export interface TerpProfile {
  key: TerpKey;
  name: string;
  color: string;
  king: string;
  /** Public URL of the profile product render (may not exist yet). */
  img: string;
  ref: string;
  specs: string;
  lore: string;
  /** [terpene, percent] — real reference lab readings (export data). */
  bars: [string, number][];
}

export const TERPS: TerpProfile[] = [
  {
    key: "gas",
    name: "GAS",
    color: "#F7931E",
    king: "KING GAZ’RAX",
    img: `${TK_ASSETS}/drip-gas.webp`,
    ref: "OG KUSH",
    specs:
      "DESIGNATION ....... HYBRID\nDOMINANT TERPS .... MYRCENE · LIMONENE · β-CARYOPHYLLENE\nFLAVOR/AROMA ...... FUEL · CITRUS · PEPPER\nEFFECTS ........... UPLIFTING · ANALGESIC · RELAXING\nCULTIVARS ......... OG KUSH · CHEMDAWG · SOUR DIESEL · GORILLA GLUE",
    lore: "The fuel profile. Heavy, dense and unmistakable — the smell most people mean when they say cannabis smells like cannabis. Nothing about it is pretty and all of it is functional.",
    bars: [
      ["MYRCENE", 0.69],
      ["β-CARYOPHYLLENE", 0.48],
      ["LIMONENE", 0.34],
      ["α-HUMULENE", 0.16],
      ["LINALOOL", 0.14],
    ],
  },
  {
    key: "haze",
    name: "HAZE",
    color: "#FF2E2E",
    king: "KING SUR’HAZE",
    img: `${TK_ASSETS}/drip-haze.webp`,
    ref: "JACK HERER",
    specs:
      "DESIGNATION ....... MOSTLY HYBRID\nDOMINANT TERPS .... TERPINOLENE · MYRCENE · β-CARYOPHYLLENE\nFLAVOR/AROMA ...... FRUITY · PINE · HAZE\nEFFECTS ........... ENERGIZING · CEREBRAL · CREATIVE\nCULTIVARS ......... TRAINWRECK · JACK HERER · DURBAN POISON · SUPER LEMON HAZE",
    lore: "Terpinolene at 1.90% is the highest single reading in the set — more than double any other peak, and rare in the genus. Terpinolene-dominant cultivars are the minority chemotype: cerebral, associative, pattern-finding.",
    bars: [
      ["TERPINOLENE", 1.9],
      ["MYRCENE", 0.92],
      ["LINALOOL", 0.5],
      ["FENCHOL", 0.39],
      ["β-CARYOPHYLLENE", 0.31],
    ],
  },
  {
    key: "dessert",
    name: "DESSERT",
    color: "#F473B9",
    king: "KING DULCIR",
    img: `${TK_ASSETS}/drip-dessert.webp`,
    ref: "MODIFIED SHERBET",
    specs:
      "DESIGNATION ....... HYBRID\nDOMINANT TERPS .... LIMONENE · β-CARYOPHYLLENE\nFLAVOR/AROMA ...... DOUGHY · CITRUS · SPICY\nEFFECTS ........... STIMULATING · RACY · COMFORTING\nCULTIVARS ......... BUBBA KUSH · GSC · GELATOS · CAKES",
    lore: "The only profile whose two peaks are nearly level: caryophyllene and limonene within a tenth of a percent. Limonene lifts the mood; caryophyllene is peppery and grounding. Sweetness and spice holding each other up.",
    bars: [
      ["β-CARYOPHYLLENE", 0.82],
      ["LIMONENE", 0.72],
      ["α-HUMULENE", 0.33],
      ["LINALOOL", 0.18],
      ["α-PINENE", 0.15],
    ],
  },
  {
    key: "fruit",
    name: "FRUIT",
    color: "#4A90E2",
    king: "KING FRUVIAN",
    img: `${TK_ASSETS}/drip-fruit.webp`,
    ref: "BLUE DREAM",
    specs:
      "DESIGNATION ....... INDICA\nDOMINANT TERPS .... MYRCENE · PINENE · β-CARYOPHYLLENE\nFLAVOR/AROMA ...... FRUITY · WOODY · HERBACEOUS\nEFFECTS ........... RELAXING · COUCH-LOCK · PAIN RELIEF\nCULTIVARS ......... CLASSIC BLUEBERRY · CHERRY AK · PURPS · BLUE DREAM",
    lore: "Myrcene is the most common terpene in cannabis — the base note of the entire genus. Pinene is forest and resin; caryophyllene is the only terpene that binds a cannabinoid receptor directly.",
    bars: [
      ["MYRCENE", 0.5],
      ["α-PINENE", 0.22],
      ["β-CARYOPHYLLENE", 0.18],
      ["β-PINENE", 0.13],
      ["α-TERPINEOL", 0.07],
    ],
  },
  {
    key: "floral",
    name: "FLORAL",
    color: "#8E5BC0",
    king: "KING FLORAXA",
    img: `${TK_ASSETS}/drip-floral.webp`,
    ref: "DREAM QUEEN",
    specs:
      "DESIGNATION ....... INDICA\nDOMINANT TERPS .... β-OCIMENE · MYRCENE\nFLAVOR/AROMA ...... SWEET · FLORAL · TROPICAL FRUIT\nEFFECTS ........... CALMING · SOOTHING · RELAXING\nCULTIVARS ......... SUPER SKUNK · HAWAIIAN · IN THE PINES · DREAM QUEEN",
    lore: "Ocimene is the outlier — light, volatile, first to leave the room. In the plant it is a signalling compound, emitted under attack. It is, quite literally, how a plant tells other plants something is coming.",
    bars: [
      ["MYRCENE", 0.99],
      ["β-OCIMENE", 0.55],
      ["CARENE", 0.31],
      ["LIMONENE", 0.25],
      ["β-CARYOPHYLLENE", 0.23],
    ],
  },
];

export interface KingDossier {
  name: string;
  title: string;
  domain: string;
  color: string;
  slotId: string;
  placeholder: string;
  story: string;
}

export const KINGS: KingDossier[] = [
  {
    name: "KING GAZ’RAX",
    title: "RULER OF GAS",
    domain: "OGs & GAS",
    color: "#F7931E",
    slotId: "king-gas",
    placeholder: "Drop Gaz’Rax art",
    story:
      "Forged in the refinery moons of the Diesel Belt, Gaz’Rax is half machine, all menace. His court runs on fuel — pungent, earthy, unmistakable.\n\nWhere he lands, the air changes first. Loyal to nothing but the burn, he commands the OG bloodlines: Kush, Chemdawg, Sour Diesel. Function over beauty. Always.",
  },
  {
    name: "KING SUR’HAZE",
    title: "RULER OF HAZE",
    domain: "JACKS & HAZE",
    color: "#FF2E2E",
    slotId: "king-haze",
    placeholder: "Drop Sur’Haze art",
    story:
      "The Overmind of the outer rim. Sur’Haze speaks in patterns others cannot see — terpinolene running double-hot through his veins, the rarest chemotype in the galaxy.\n\nHis dominion is the daylight side: energy, ideas, the endless cerebral spiral. Trainwreck and Jack Herer fly his colors.",
  },
  {
    name: "KING DULCIR",
    title: "RULER OF DESSERT",
    domain: "DESSERTS",
    color: "#F473B9",
    slotId: "king-dessert",
    placeholder: "Drop Dulcir art",
    story:
      "The Hooded One. Dulcir rules the dessert moons where the atmosphere itself tastes of cake batter and burnt citrus.\n\nHis power is balance — sweetness and spice, limonene and caryophyllene, held level to a tenth of a percent. Comforting. Racy. Never one without the other.",
  },
  {
    name: "KING FRUVIAN",
    title: "RULER OF FRUIT",
    domain: "SWEETS & DREAMS",
    color: "#4A90E2",
    slotId: "king-fruit",
    placeholder: "Drop Fruvian art",
    story:
      "The Drifter. Fruvian crossed the Blueberry Nebula alone and came back changed — heavy-lidded, slow-moving, impossible to shake.\n\nMyrcene is his signature: the base note of the entire genus, the gravity that pulls every other flavor into orbit. Sit down. Stay a while.",
  },
  {
    name: "KING FLORAXA",
    title: "RULER OF FLORAL",
    domain: "TROPICAL & FLORAL",
    color: "#8E5BC0",
    slotId: "king-floral",
    placeholder: "Drop Floraxa art",
    story:
      "The Monk. Floraxa took a vow of stillness in the garden worlds, where ocimene drifts on the wind like a warning and a welcome at once.\n\nHis calm is not weakness — it is a signal that travels. Lavender, rose, tropical bloom. Royalty at rest.",
  },
];

export interface ArsenalProduct {
  name: string;
  code: string;
  tag: string;
  color: string;
  img: string;
  desc: string;
}

/** FILE 01 // THE ARSENAL — four field-issued units. */
export const PRODUCTS: ArsenalProduct[] = [
  {
    name: "Drip Packs",
    code: "UNIT TK-01",
    tag: "FLAGSHIP // 5-PACK",
    color: "#FF2E2E",
    img: `${TK_ASSETS}/drip-haze.webp`,
    desc: "> 5 KIEF-COATED, ROSIN-INFUSED PRE-ROLLS PER TIN. Every cone dipped, dusted and dialed to its terp profile.",
  },
  {
    name: "Infused Pre-Rolls",
    code: "UNIT TK-02",
    tag: "SINGLES // 1G",
    color: "#F7931E",
    img: `${TK_ASSETS}/tube-haze.webp`,
    desc: "> SINGLE 1G INFUSED PRE-ROLLS in pop-top tubes, color-coded by profile. Grab-and-go royalty.",
  },
  {
    name: "Live Rosin Vape",
    code: "UNIT TK-03",
    tag: "SOLVENTLESS // AIO",
    color: "#4A90E2",
    img: `${TK_ASSETS}/rosin-vapes.webp`,
    desc: "> ASTRO VAPE ROSIN — 500MG all-in-one disposable. Smooth, flavorful, solventless.",
  },
  {
    name: "Liquid Diamond Vape",
    code: "UNIT TK-04",
    tag: "MAX POTENCY // AIO",
    color: "#F473B9",
    img: `${TK_ASSETS}/ld-dessert.webp`,
    desc: "> THCA DIAMONDS RE-LIQUIFIED for maximum potency and full-spectrum flavor. All-in-one unit.",
  },
];

/** FILE 02 // ORIGINAL GRAPHIC NOVEL */
export const COMIC = {
  eyebrow: "FILE 02 // ORIGINAL GRAPHIC NOVEL",
  titleLine1: "The Lumen War Saga",
  titleLine2: "Part 1",
  blurb:
    "> THE TERPIVERSE IS AT WAR. Follow the five Kings across gas giants and dessert moons in an original comic saga — free to read digitally, in print exclusively with select drops at licensed dispensaries.",
  readCta: "► READ PART 1 FREE",
  printCta: "GET THE PRINT ISSUE",
  coverAlt: "TerpKings: The Lumen War Saga Part 1 — original graphic novel cover",
} as const;

/** FILE 04 // TERP-SCANNER — the expandable education panel. */
export const TERP_EDU = {
  heading: "> TERPENE CLASSIFICATION — WHY WE SORT BY TERPS, NOT THC",
  openLabel: "► TERPENE CLASSIFICATION — LEARN THE SCIENCE",
  closeLabel: "▼ TERPENE CLASSIFICATION — CLOSE FILE",
  blocks: [
    {
      title: "[01] WHAT TERPENES ARE",
      body: "Terpenes are the aromatic compounds that give plants their smell — lavender its calm, citrus peel its brightness, pine its edge, black pepper its bite. Cannabis produces over 150 of them, made in the same trichome glands as THC and CBD. They are what makes one cultivar smell like blueberries and another like fuel.",
    },
    {
      title: "[02] WHY THC% ISN'T THE STORY",
      body: "Two strains with identical THC numbers can feel completely different. The working theory — the entourage effect, first proposed by researchers Mechoulam and Ben-Shabat in 1998 — is that terpenes and cannabinoids act together, shaping the character of the experience. Caryophyllene even binds the body's CB2 cannabinoid receptor directly.",
    },
    {
      title: "[03] THE DATA-DRIVEN PROCESS",
      body: "Every TerpKings batch gets a full lab terpene panel. We read the dominant terpene signature — not the THC number — and sort each cultivar into one of five profiles: GAS, HAZE, DESSERT, FRUIT, FLORAL. The bar charts in this scanner are real reference lab readings, so what you smell is what the data says.",
    },
    {
      title: "[04] WHY IT SURVIVES THE PROCESS",
      body: "Terpenes are volatile — they degrade with heat, light and rough handling. That's why we work in kief, rosin and liquid diamonds: cold, careful extraction methods that keep the terpene profile intact from plant to pull. Flavor first. Always.",
    },
  ],
  sources:
    "SOURCES: HEALTHLINE · AROYA EDUCATION GUIDES · TRIANGLE SEEDS — RESEARCH ON TERPENE EFFECTS IS ONGOING. FOR ADULTS 21+.",
} as const;

/** FILE 05 // SUPPLY DROP */
export const MERCH = [
  { slotId: "merch-tee", name: "Tees", placeholder: "Drop tee photo" },
  { slotId: "merch-hoodie", name: "Hoodies", placeholder: "Drop hoodie photo" },
  { slotId: "merch-hat", name: "Hats", placeholder: "Drop hat photo" },
] as const;

/** SIGNAL FEED */
export const IG = {
  handle: "@TERPKINGSOFFICIAL",
  url: "https://instagram.com/terpkingsofficial",
  slots: ["ig-1", "ig-2", "ig-3", "ig-4", "ig-5"],
} as const;

/** FILE 06 // SUPPLY LINES */
export const LOCATOR = {
  eyebrow: "FILE 06 // SUPPLY LINES",
  title: "Locate the nearest drop",
  blurb: "TERPKINGS UNITS DEPLOYED AT LICENSED DISPENSARIES. ENTER COORDINATES:",
  placeholder: "ZIP CODE_",
  cta: "► SCAN",
  emptyError: "> ERROR: ENTER COORDINATES FIRST.",
} as const;

/** JOIN THE COURT */
export const SIGNUP = {
  title: "Join the court",
  blurb:
    "NEW DROPS · NEW STRAINS · NEW COMIC ISSUES — ENCRYPTED, STRAIGHT TO YOUR INBOX.",
  placeholder: "OPERATOR@EMAIL.COM_",
  cta: "ENLIST",
  confirmed: "♛ TRANSMISSION CONFIRMED. LONG LIVE THE KINGS.",
} as const;

/** Age gate (TERPKINGS OS terminal). */
export const GATE = {
  header: "TERPKINGS OS v2.6 — SECURITY CHECKPOINT",
  title: "> AGE VERIFICATION REQUIRED_",
  body1: "THIS TERMINAL SERVES CANNABIS INTEL FOR ADULTS 21+ ONLY.",
  body2: "CONFIRM OPERATOR STATUS:",
  yes: "[Y] I AM 21+",
  no: "[N] ABORT",
  refused: "> ACCESS DENIED. THIS TERMINAL IS FOR ADULTS 21+ ONLY.",
} as const;

/** Compliance line from the export footer — only used if the shared footer lacks an equivalent. */
export const COMPLIANCE_LINE =
  "THIS PRODUCT CONTAINS CANNABIS AND IS INTENDED FOR ADULTS 21+ ONLY. KEEP OUT OF REACH OF CHILDREN. DO NOT OPERATE A VEHICLE OR MACHINERY UNDER THE INFLUENCE. FOR USE ONLY WHERE LEGAL.";
