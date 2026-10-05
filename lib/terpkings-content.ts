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
  /** Hero tagline, one entry per line on mobile (joined for desktop + metadata). */
  taglineLines: ["BROADCASTING FROM", "PROVIDENCE 35974C"],
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
  /** Dossier clip (540×960 H.264 + AAC, faststart) and its first-frame poster. */
  video?: string;
  poster?: string;
  story: string;
}

export const KINGS: KingDossier[] = [
  {
    name: "KING GAZ’RAX",
    title: "RULER OF GAS",
    domain: "OGs & GAS",
    color: "#F7931E",
    slotId: "king-gas",
    video: `${TK_ASSETS}/kings/king-gas.mp4`,
    poster: `${TK_ASSETS}/kings/king-gas.jpg`,
    placeholder: "Drop Gaz’Rax art",
    story:
      "King Gaz’Rax is a member of the Grennok-Vaar, a cultivated species with no entry in human catalogs of extraterrestrial life. Gaz’Rax’s home world, the Forge Nexus, is the planet catalogued by human astronomers as 55 Cancri e, located in the constellation Cancer approximately 41 light-years from Earth.\n\n55 Cancri e orbits its star in about eighteen hours, and its dayside is believed to be largely molten rock; in 2024, the James Webb Space Telescope found evidence of a substantial atmosphere likely replenished by gases escaping from a global magma ocean. Human contact literature frequently describes Draconian reptilian operations on and beneath the surface, and the Grennok-Vaar were bred as a Council defense force against such threats and against the war machines of the Orion Alliance.\n\nThe Grennok-Vaar are distinguished by their construction and their discipline. An individual is a symbiosis of silicate structure and living tissue, armored and part-metallic, venting pale vapor as waste heat from cognitive processing. The Gas profile is derived from First Oil, a dense resinous reservoir formed when the Forge Nexus’s ancient forests were buried during a period of global melting. Gaz’Rax refines First Oil through a process of fractional distillation. The heavy fraction yields myrcene, the light fraction yields limonene, and the binding fraction yields β-caryophyllene, which acts directly on the CB2 receptor. The Gas profile produces uplift, pain relief, and relaxation effects while preserving functional cognition.\n\nFirst Oil is drawn from beneath a molten surface and cannot be transported in raw form. Gaz’Rax therefore refines it at a still maintained inside the Council station on the Moon. Cannabis populations whose origin can be attributed to King Gaz’Rax became the ancestral stock of the Gas cultivars, including OG Kush, Chemdawg, Sour Diesel, and Gorilla Glue, whose aroma is the one most commonly identified by humans as the characteristic smell of cannabis.",
  },
  {
    name: "KING SUR’HAZE",
    title: "RULER OF HAZE",
    domain: "JACKS & HAZE",
    color: "#FF2E2E",
    slotId: "king-haze",
    video: `${TK_ASSETS}/kings/king-haze.mp4`,
    poster: `${TK_ASSETS}/kings/king-haze.jpg`,
    placeholder: "Drop Sur’Haze art",
    story:
      "King Sur’Haze is the last known member of the Hesperians, a biological species native to Venus. Sur’Haze’s home world, Venus, is the second planet from the Sun and Earth’s nearest planetary neighbor, located between approximately 2 and 14.5 light-minutes from Earth depending on the two planets’ positions.\n\nThe Hesperians were distinguished by their technology and its consequences. Their civilization built a predictive artificial intelligence that expanded beyond control, and its computation released waste heat on a planetary scale, driving Venus into a runaway greenhouse state. Sur’Haze, one of its architects, severed his neural link before the end but retained part of its forecasting layer, the source of his ability to perceive future probabilities. NASA climate modeling published in 2016 suggested Venus may have sustained oceans and habitable temperatures for as long as two billion years, and in 2020 a team led by Jane Greaves reported phosphine in the Venusian clouds, a gas associated on Earth with living organisms.\n\nVenusian flora cannot survive the planet’s present surface, at about 465 degrees Celsius under ninety times Earth’s atmospheric pressure. All that remains is a single seed archive Sur’Haze carried off-world. Terpinolene was the principal aromatic compound of Venus’s lost surface vegetation, and its rarity in cannabis reflects how little survived. Myrcene is drawn from EdenRoot stock, and β-caryophyllene from the Oath Pepper. Cannabis populations within the Haze profile, producing energizing, cerebral, and creative effects, became the ancestral stock of the Haze cultivars, including Trainwreck, Jack Herer, Durban Poison, and Super Lemon Haze.",
  },
  {
    name: "KING DULCIR",
    title: "RULER OF DESSERT",
    domain: "DESSERTS",
    color: "#F473B9",
    slotId: "king-dessert",
    video: `${TK_ASSETS}/kings/king-dessert.mp4`,
    poster: `${TK_ASSETS}/kings/king-dessert.jpg`,
    placeholder: "Drop Dulcir art",
    story:
      "King Dulcir is a member of the Afim Spiantsy, a small species belonging to the Galactic Federation. Dulcir’s home world, Velvetreach, orbits Kepler-51, a young star in the constellation Cygnus approximately 2,600 light-years from Earth and too faint to observe without a telescope.\n\nThe Afim Spiantsy are closely allied with the Pleiadians, the human-like species of the Pleiades star cluster that appear frequently in human contact literature, and are among the most regular guests at Afim festivals. The Afim Spiantsy branch is distinguished by its scale and its habitat. Adults are rounded and cherubic, faintly luminescent, and approximately sixteen inches tall. They respire hydrogen and are capable of voluntary invisibility. Velvetreach is one of the Kepler-51 planets known to human astronomers as cotton-candy planets, among the lowest-density worlds ever measured; Hubble Space Telescope observations reported in 2019 found their atmospheres too thick with haze to read any chemical signature through them.\n\nDulcir’s terpenes are not cultivated. They are the second sentient population of his kingdom, the Terplings: golden, droplet-shaped organisms roughly the size of a cannabis trichome head, each consisting of a single terpene molecule with independent cognition. The population is divided into two clans. The Zestlings are composed of limonene, carry a citrus aroma, and exhibit high activity. The Grumbles are composed of β-caryophyllene, carry a peppery aroma, and exhibit low activity. Velvetreach law requires numerical parity between the clans, which is consistent with laboratory measurement: in the Modified Sherbet reference sample, caryophyllene measures 0.82 percent and limonene 0.72 percent, the closest pair of dominant peaks in any of the five profiles.\n\nThe Dessert profile produces stimulation, mood elevation, and comfort. It is the only terpene profile without significant myrcene, as Velvetreach declined EdenRoot stock by public referendum. Cannabis cultivars bred using a high concentrate of Terplings became the ancestral stock of the Dessert cultivars, including Bubba Kush, GSC, Gelatos, and Cakes.",
  },
  {
    name: "KING FRUVIAN",
    title: "RULER OF FRUIT",
    domain: "SWEETS & DREAMS",
    color: "#4A90E2",
    slotId: "king-fruit",
    video: `${TK_ASSETS}/kings/king-fruit.mp4`,
    poster: `${TK_ASSETS}/kings/king-fruit.jpg`,
    placeholder: "Drop Fruvian art",
    story:
      "King Fruvian is a member of the Kataay, a plasma-based species belonging to the broader Arcturian family. Fruvian’s home world, EdenRoot, orbits Arcturus, an orange giant in the constellation Boötes approximately 36.7 light-years from Earth and the brightest star in the northern celestial hemisphere.\n\nThe Arcturians are among the most frequently described benevolent species in human contact literature, associated with healing and with the elevation of human consciousness. The Kataay branch is distinguished by its physical substrate and its specialty. A Kataay individual is a self-organizing body of ionized gas that maintains its structure through internal wave oscillations, comparable to the ion-acoustic waves described in laboratory plasma physics.\n\nThe Fruit profile produces relaxation, pain relief, and sedative effects. It is derived from three EdenRoot organisms. Myrcene is pressed from the Lowfruit, a dense, dark fruit that ripens in response to an infrasonic frequency and forms the base layer of EdenRoot’s orchards. Pinene is drawn from the Tuning Pines, resin trees planted in rings that release resin whenever orchard frequencies drift. β-Caryophyllene is extracted from the Oath Pepper, a climbing vine cultivated on the walls of Council chambers; it is the only compound in the profile that binds a cannabinoid receptor, CB2, directly.\n\nEdenRoot flora cannot be established in Earth soil and only matures under exposure to specific sustained frequencies. Fruvian therefore exports processed material rather than living plants. Pressed oils and pollen arrive each January as fine particulate within the Quadrantid meteor shower, which radiates from Boötes, and fall below the detection threshold of the Fracturing Grid. Wild cannabis populations that absorbed this material became the ancestral stock of the Fruit cultivars, including Blueberry, Cherry AK, Forbidden Fruit, and Blue Dream.",
  },
  {
    name: "KING FLORAXA",
    title: "RULER OF FLORAL",
    domain: "TROPICAL & FLORAL",
    color: "#8E5BC0",
    slotId: "king-floral",
    video: `${TK_ASSETS}/kings/king-floral.mp4`,
    poster: `${TK_ASSETS}/kings/king-floral.jpg`,
    placeholder: "Drop Floraxa art",
    story:
      "King Floraxa is human, a member of the original Martian population of Homo sapiens. Floraxa’s home world, Mars, is the fourth planet from the Sun, located between approximately 3 and 22 light-minutes from Earth depending on the two planets’ positions.\n\nFloraxa’s people are distinguished by their history and their adaptation. Mars once held rivers, lakes, and a breathable atmosphere. A nuclear war destroyed the surface’s habitability. The survivors divided. One group excavated tunnels and built cities beneath the surface, and over many thousands of years in low gravity and near-darkness developed elongated bodies, pale hairless skin, and large black eyes. A breakaway group fled to the nearby planet Earth. In 1996, NASA scientists reported possible fossil microbes in ALH84001, a Martian meteorite recovered in Antarctica.\n\nThe tall greys are among the most frequently described beings in human contact literature, distinct from the more commonly reported small greys identified as Zeta Reticulans. Contrary to some theories, their species do not represent our time traveling descendants, but rather our ancestors which now represent a separate and distinct evolutionary branch. β-Ocimene is, in living plants, a distress signal released under attack; when the Martian surface burned, every plant on the planet released it at once, and the underground root networks preserved the signal as a planet-wide warning.\n\nThis is a basis for why the Floral profile produces calming, soothing, and relaxing effects. Myrcene, from Martian seed stock, was bred into the underground crops as a sedative counterweight to that chronic alarm. The profile’s tropical character is a reconstruction, bred from archived seed by a population that had not seen a living surface in thousands of years. Cannabis cultivars that absorbed material from the garden became the ancestral stock of the Floral cultivars, including Super Skunk, Hawaiian, In the Pines, and Dream Queen.",
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
    img: `${TK_ASSETS}/drip-packs-haze.webp`,
    desc: "> 5 KIEF-COATED, ROSIN-INFUSED PRE-ROLLS PER TIN. Every cone dipped, dusted and dialed to its terp profile.",
  },
  {
    name: "Infused Pre-Rolls",
    code: "UNIT TK-02",
    tag: "SINGLES // 1G",
    color: "#F7931E",
    img: `${TK_ASSETS}/tube-gas.webp`,
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
    img: `${TK_ASSETS}/ld-lineup.webp`,
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
  invalidZip: "> ERROR: ENTER A 5-DIGIT SECTOR CODE.",
  comingSoon: "> SUPPLY LINES ENCRYPTED — DECLASSIFYING SOON.",
  scanning: "> SCANNING SECTOR",
  nearestHeader: "> NO UNITS IN 10-MI RADIUS — NEAREST SUPPLY LINES:",
  noneFound: "> NO ACTIVE SUPPLY LINES ON RECORD.",
  failedError: "> TRANSMISSION ERROR — RETRY SCAN.",
  menuLink: "► VIEW MENU",
  mapLink: "► MAP",
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
