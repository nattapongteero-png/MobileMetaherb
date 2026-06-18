import { BRAND_GREEN } from "../theme/tokens";

/** A seller account in the marketplace. The same shop can list general
 *  products, publish trial products, and supply herbal materials. */
export type Shop = {
  name: string;
  rating: number;
  /** Bundled logo image; when absent, UIs render an initial on `tint`. */
  avatar?: number;
  /** How the avatar image fits its circle. "cover" for full square logos,
   *  "contain" for transparent marks (e.g. leaf logos) so they sit centered. */
  avatarFit?: "cover" | "contain";
  tint: string;
  likes: number;
};

// Three simulated shops, each with a logo image in the profile.
export const SHOPS: Shop[] = [
  {
    name: "METAHERB Store",
    rating: 4.9,
    avatar: require("../../assets/logo.png"),
    avatarFit: "cover",
    tint: BRAND_GREEN,
    likes: 100,
  },
  {
    name: "บ้านสมุนไพรไทย",
    rating: 4.7,
    avatar: require("../../assets/herb-leaf-a.png"),
    avatarFit: "contain",
    tint: "#7c3aed",
    likes: 68,
  },
  {
    name: "กรีนลีฟ ออร์แกนิก",
    rating: 4.8,
    avatar: require("../../assets/herb-leaf-c.png"),
    avatarFit: "contain",
    tint: "#0891b2",
    likes: 82,
  },
];

/** Look up a shop by name (falls back to the flagship). */
export function getShop(name?: string): Shop {
  return SHOPS.find((s) => s.name === name) ?? SHOPS[0];
}

/** Deterministically map an arbitrary key (e.g. a product id) to a shop, so
 *  catalog products without an explicit shop field split across the three. */
export function shopForKey(key: string): Shop {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SHOPS[h % SHOPS.length];
}
