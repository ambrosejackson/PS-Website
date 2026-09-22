/**
 * Editorial content for event pages, keyed by events.slug. The events row holds
 * the facts (date, address, plate cap); this holds the copy and art. Copy is
 * from The Kickback sponsorship deck (Ambrose, 2026-09-22).
 */
export interface EventContent {
  logo: { src: string; width: number; height: number; alt: string };
  flyer: { src: string; width: number; height: number; alt: string };
  intro: string;
  hosts: { name: string; url?: string; blurb: string }[];
  expect: { title: string; img: string; alt: string }[];
  paintBattle?: string;
  faq: { q: string; a: string }[];
}

const KICKBACK: EventContent = {
  logo: { src: "/events/kickback/kickback-logo.webp", width: 1000, height: 500, alt: "The Kickback: Bud, Bombing & BBQ" },
  flyer: { src: "/events/kickback/kickback-flyer.webp", width: 864, height: 1080, alt: "The Kickback flyer: DJ, graffiti writer, grill master and friends in a gold frame" },
  intro:
    "A cannabis and culture kickback in Logan Square: live graffiti with a paint battle, BBQ and tacos off the grill, DJs on the decks, and a vendor row of cannabis brands, merch and art.",
  hosts: [
    {
      name: "Private Stock Cannabis Co.",
      url: "/about",
      blurb:
        "Chicago-born, Illinois-licensed and founder-led. Home of Savage Squad Strains, TerpKings, Outfitters and Higher Self, and of Parkway Dispensary in Tilton, IL.",
    },
    {
      name: "Renegades of Funk",
      blurb:
        "A Chicago nonprofit preserving, learning and teaching the five elements of hip-hop: DJing, MCing, breaking, graffiti art and knowledge. Hosts of Battle for the Eagle in Logan Square.",
    },
  ],
  expect: [
    { title: "Live graffiti battle", img: "/events/kickback/graffiti-battle.webp", alt: "Writers painting a wall in an alley" },
    { title: "DJ + live stream", img: "/events/kickback/dj-live-stream.webp", alt: "DJ on the decks" },
    { title: "BBQ smoker + taco truck", img: "/events/kickback/bbq-taco-truck.webp", alt: "Pitmaster working the grill" },
    { title: "Music artist set", img: "/events/kickback/music-artist-set.webp", alt: "Artist posing by a lowrider" },
    { title: "Blunt-rolling class", img: "/events/kickback/blunt-rolling-class.webp", alt: "Instructor holding up a rolled blunt" },
    { title: "Vendors", img: "/events/kickback/vendors.webp", alt: "Vendor tents on a lawn" },
  ],
  paintBattle: "$1,000 in prizes to the winner: $500 cash + $500 in paint.",
  faq: [
    { q: "Is it really free?", a: "Yes. Entry is free with an RSVP. One RSVP per person, so everyone in your crew should grab their own." },
    { q: "Do I need to be 21?", a: "Yes, 21+ only. Bring a valid government photo ID; wristbands are handed out at entry." },
    { q: "Who gets a free BBQ plate?", a: "Budtenders at licensed Illinois dispensaries. Tick the budtender box when you RSVP, then bring your valid IDFPR dispensary agent badge. We verify it at check-in and release your plate. Plates are limited; once they're gone you can join the plate waitlist." },
    { q: "Can I buy weed there?", a: "No cannabis is sold on site. Vendors can do giveaways, discount cards, merch, paraphernalia and raffles." },
    { q: "Where do I park?", a: "There's a free parking lot on site, behind Liberty Bank at 2929 W Fullerton Ave." },
    { q: "Plans changed?", a: "Use the cancel link in your confirmation email so someone else can take your spot (and plate)." },
    { q: "Will I be on camera?", a: "Probably. There's a photo and video crew on site all day, plus a DJ live stream." },
  ],
};

const CONTENT: Record<string, EventContent> = { kickback: KICKBACK };

export function eventContent(slug: string): EventContent | null {
  return CONTENT[slug] ?? null;
}
