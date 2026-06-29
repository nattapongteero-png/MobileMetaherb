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
  /** Wide cover banner shown at the top of the shop's storefront page. */
  banner: number;
  tint: string;
  likes: number;
  // Full storefront identity (consumed by ShopScreen). Optional so existing
  // call sites that only read name/rating/avatar/banner/tint/likes still compile.
  description?: string;
  totalReviews?: number;
  followers?: number;
  joined?: string;
  responseRate?: number;
  responseTime?: string;
  totalProducts?: number;
  totalSold?: string;
  location?: string;
  verified?: boolean;
};

// Three simulated shops, each with a logo image in the profile.
export const SHOPS: Shop[] = [
  {
    name: "METAHERB Store",
    rating: 4.8,
    avatar: require("../../assets/logo.png"),
    avatarFit: "cover",
    banner: require("../../assets/bg1.png"),
    tint: BRAND_GREEN,
    likes: 100,
    // Mirrors ShopScreen.tsx's `const SHOP = {...}` (the flagship's single identity).
    description:
      "ร้านค้าสมุนไพรออร์แกนิกคุณภาพระดับพรีเมียม คัดสรรวัตถุดิบจากแหล่งธรรมชาติทั่วประเทศไทย ผ่านมาตรฐาน อย. และ GMP รับประกันคุณภาพทุกชิ้น จัดส่งรวดเร็วภายใน 1-2 วัน",
    totalReviews: 1250,
    followers: 8520,
    joined: "ม.ค. 2567",
    responseRate: 98,
    responseTime: "ภายใน 5 นาที",
    totalProducts: 45,
    totalSold: "15K+",
    location: "กรุงเทพมหานคร",
    verified: true,
  },
  {
    name: "บ้านสมุนไพรไทย",
    rating: 4.7,
    avatar: require("../../assets/herb-leaf-a.png"),
    avatarFit: "contain",
    banner: require("../../assets/bg2.png"),
    tint: "#7c3aed",
    likes: 68,
    description:
      "บ้านสมุนไพรไทยแท้ ปลูกและแปรรูปเองในสวนสมุนไพรพื้นบ้าน สืบทอดภูมิปัญญาไทยมากว่า 20 ปี คัดสรรสมุนไพรสดใหม่จากไร่ ปลอดสารพิษ ส่งตรงถึงมือคุณ",
    totalReviews: 642,
    followers: 3180,
    joined: "มี.ค. 2566",
    responseRate: 95,
    responseTime: "ภายใน 30 นาที",
    totalProducts: 21,
    totalSold: "8K+",
    location: "เชียงใหม่",
    verified: true,
  },
  {
    name: "กรีนลีฟ ออร์แกนิก",
    rating: 4.8,
    avatar: require("../../assets/herb-leaf-c.png"),
    avatarFit: "contain",
    banner: require("../../assets/bg3.png"),
    tint: "#0891b2",
    likes: 82,
    description:
      "กรีนลีฟ ออร์แกนิก ผู้เชี่ยวชาญด้านผลิตภัณฑ์ออร์แกนิก 100% ได้รับการรับรองมาตรฐานเกษตรอินทรีย์ Organic Thailand ใส่ใจสิ่งแวดล้อม บรรจุภัณฑ์รักษ์โลก เพื่อสุขภาพที่ดีของคุณและครอบครัว",
    totalReviews: 908,
    followers: 5470,
    joined: "ก.ย. 2566",
    responseRate: 97,
    responseTime: "ภายใน 15 นาที",
    totalProducts: 22,
    totalSold: "11K+",
    location: "นครปฐม",
    verified: true,
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
