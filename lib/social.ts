/** Private Stock social profiles — ONE source of truth (D-065, D-070). Facebook intentionally absent. */
export const INSTAGRAM_URL = "https://www.instagram.com/privatestock_co/";

export interface SocialProfile {
  /** Short key for tracking + React keys. */
  key: string;
  /** Button label. */
  label: string;
  url: string;
}

/** FOLLOW US pills, in display order: house account first, then the four brands. */
export const INSTAGRAM_PROFILES: readonly SocialProfile[] = [
  { key: "privatestock", label: "Private Stock", url: INSTAGRAM_URL },
  { key: "outfitters", label: "Outfitters", url: "https://www.instagram.com/outfitters_original/" },
  { key: "higherself", label: "Higher Self", url: "https://www.instagram.com/findhigherself/" },
  { key: "terpkings", label: "TerpKings", url: "https://www.instagram.com/terpkingsofficial/" },
  { key: "savagesquadstrains", label: "Savage Squad Strains", url: "https://www.instagram.com/savagesquadstrains/" },
];
