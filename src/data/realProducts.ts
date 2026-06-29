import type { Product, ProductImage } from "../types/Product";
import type { CategoryKey, TypeKey, CatalogProduct } from "./catalog";
import { GROUP_BY_ID, MERGED_AWAY_IDS, IMAGE_OVERRIDE } from "./productVariants";

/**
 * Real product samples ported 1:1 from the METAHERB web app
 * (../Metaherb/src/app/data/products.ts) — real names, prices, ratings,
 * discounts and flash-sale flags. Each product's photo is the matching
 * downsized shot from the user-provided product-images set
 * (product-01.png … product-43.jpg), bundled under assets/products/catalog/.
 *
 * `category`/`type` map the web's Thai taxonomy onto the mobile catalog's
 * CategoryKey/TypeKey filters (curated for an even spread across the 6 tabs).
 */

// Static require() map — React Native's bundler needs literal paths, so the
// 43 images are listed by hand. Index i → product id (i + 1).
const CATALOG_IMAGES: number[] = [
  require("../../assets/products/catalog/product-01.png"),
  require("../../assets/products/catalog/product-02.png"),
  require("../../assets/products/catalog/product-03.png"),
  require("../../assets/products/catalog/product-04.png"),
  require("../../assets/products/catalog/product-05.png"),
  require("../../assets/products/catalog/product-06.jpg"),
  require("../../assets/products/catalog/product-07.jpg"),
  require("../../assets/products/catalog/product-08.jpg"),
  require("../../assets/products/catalog/product-09.jpg"),
  require("../../assets/products/catalog/product-10.jpg"),
  require("../../assets/products/catalog/product-11.jpg"),
  require("../../assets/products/catalog/product-12.jpg"),
  require("../../assets/products/catalog/product-13.jpg"),
  require("../../assets/products/catalog/product-14.jpg"),
  require("../../assets/products/catalog/product-15.jpg"),
  require("../../assets/products/catalog/product-16.jpg"),
  require("../../assets/products/catalog/product-17.jpg"),
  require("../../assets/products/catalog/product-18.jpg"),
  require("../../assets/products/catalog/product-19.jpg"),
  require("../../assets/products/catalog/product-20.jpg"),
  require("../../assets/products/catalog/product-21.jpg"),
  require("../../assets/products/catalog/product-22.jpg"),
  require("../../assets/products/catalog/product-23.jpg"),
  require("../../assets/products/catalog/product-24.jpg"),
  require("../../assets/products/catalog/product-25.jpg"),
  require("../../assets/products/catalog/product-26.jpg"),
  require("../../assets/products/catalog/product-27.jpg"),
  require("../../assets/products/catalog/product-28.jpg"),
  require("../../assets/products/catalog/product-29.jpg"),
  // Slots 30 & 32 retired (duplicate cinnamon photos removed); kept as the
  // surviving product-31 image to preserve id→index alignment. Never rendered —
  // no product references id "30" or "32".
  require("../../assets/products/catalog/product-31.jpg"),
  require("../../assets/products/catalog/product-31.jpg"),
  require("../../assets/products/catalog/product-31.jpg"),
  require("../../assets/products/catalog/product-33.jpg"),
  require("../../assets/products/catalog/product-34.jpg"),
  require("../../assets/products/catalog/product-35.jpg"),
  require("../../assets/products/catalog/product-36.jpg"),
  require("../../assets/products/catalog/product-37.jpg"),
  require("../../assets/products/catalog/product-38.jpg"),
  require("../../assets/products/catalog/product-39.jpg"),
  require("../../assets/products/catalog/product-40.jpg"),
  require("../../assets/products/catalog/product-41.png"),
  require("../../assets/products/catalog/product-42.png"),
  require("../../assets/products/catalog/product-43.png"),
];

/**
 * Photo for a real product id. Custom photos in IMAGE_OVERRIDE win (e.g. ids
 * 44/45 which have no slot in the 1–43 CATALOG_IMAGES array); otherwise the
 * id→index image, falling back to the first image.
 */
export function getRealProductImage(id: string): ProductImage {
  const n = parseInt(id, 10);
  return IMAGE_OVERRIDE[id] ?? CATALOG_IMAGES[n - 1] ?? CATALOG_IMAGES[0];
}

// Compact source rows — everything except the image, which is resolved by id.
type Row = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  rating: number;
  sold: string;
  category: CategoryKey;
  type: TypeKey;
  isFlashSale?: boolean;
  isRecommended?: boolean;
  isFreeShipping?: boolean;
  hasCoupon?: boolean;
  flashSaleEndsIn?: number;
};

const ROWS: Row[] = [
  { id: "1", name: "น้ำผึ้งมะนาว Honey Lemon", price: 199, originalPrice: 330, discountPercent: 40, rating: 4.5, sold: "ขายได้ 150+", category: "health", type: "beverage", isFlashSale: true, hasCoupon: true, isFreeShipping: true, flashSaleEndsIn: 43988 },
  { id: "2", name: "น้ำผึ้งมะนาว Honey Lemon (พรีเมียม)", price: 250, originalPrice: 350, discountPercent: 29, rating: 4.9, sold: "ขายได้ 80+", category: "health", type: "beverage", isRecommended: true, hasCoupon: true, isFreeShipping: true },
  { id: "3", name: "กาแฟดริป Signature Blend (Medium Roast)", price: 150, originalPrice: 250, discountPercent: 40, rating: 4.7, sold: "ขายได้ 120+", category: "food", type: "beverage", isFlashSale: true, flashSaleEndsIn: 28800 },
  { id: "4", name: "กาแฟดริป Signature Blend (Dark Roast)", price: 185, originalPrice: 260, discountPercent: 29, rating: 4.6, sold: "ขายได้ 210+", category: "food", type: "beverage", isRecommended: true, hasCoupon: true },
  { id: "5", name: "เมต้าเฮิร์บ สมุนไพรหอม พิมเสนน้ำ", price: 159, originalPrice: 265, discountPercent: 40, rating: 4.7, sold: "ขายได้ 95+", category: "aroma", type: "aroma", isFlashSale: true, hasCoupon: true, isFreeShipping: true, flashSaleEndsIn: 14400 },
  { id: "6", name: "กระวานแห้ง", price: 120, rating: 4.6, sold: "ขายได้ 350+", category: "raw", type: "powder", isRecommended: true },
  { id: "7", name: "อบเชยแท่ง Alba", price: 99, originalPrice: 140, discountPercent: 29, rating: 4.6, sold: "ขายได้ 180+", category: "raw", type: "powder", hasCoupon: true },
  { id: "8", name: "ผงอบเชย Cinnamon Powder", price: 89, originalPrice: 120, discountPercent: 26, rating: 4.4, sold: "ขายได้ 90+", category: "herbal", type: "powder", isFreeShipping: true },
  { id: "9", name: "น้ำผักผลไม้สด 2 รสคู่", price: 280, originalPrice: 420, discountPercent: 33, rating: 4.9, sold: "ขายได้ 80+", category: "health", type: "beverage", isFlashSale: true, hasCoupon: true, isFreeShipping: true, flashSaleEndsIn: 7200 },
  { id: "10", name: "เมต้าเฮิร์บ สมุนไพรหอม Aromatic Herbals", price: 299, originalPrice: 450, discountPercent: 34, rating: 4.9, sold: "ขายได้ 75+", category: "aroma", type: "aroma", isFlashSale: true, isFreeShipping: true, flashSaleEndsIn: 36000 },
  { id: "11", name: "เมต้าเฮิร์บ สมุนไพรหอม Aromatic Herbals (Orange)", price: 249, rating: 4.8, sold: "ขายได้ 200+", category: "aroma", type: "aroma", isRecommended: true, hasCoupon: true },
  { id: "12", name: "Croffle ครอฟเฟิลเมต้าคาเฟ่", price: 75, originalPrice: 110, discountPercent: 32, rating: 4.9, sold: "ขายได้ 420+", category: "food", type: "food", isFlashSale: true, hasCoupon: true, flashSaleEndsIn: 21600 },
  { id: "13", name: "Donut โดนัทเมต้าเฮิร์บ", price: 320, originalPrice: 480, discountPercent: 33, rating: 4.8, sold: "ขายได้ 60+", category: "food", type: "food", isFlashSale: true, hasCoupon: true, isFreeShipping: true, flashSaleEndsIn: 18000 },
  { id: "14", name: "Muffin มัฟฟินช็อกโกแลต", price: 189, originalPrice: 290, discountPercent: 35, rating: 4.5, sold: "ขายได้ 130+", category: "food", type: "food", isRecommended: true, hasCoupon: true, isFreeShipping: true },
  { id: "15", name: "Egg Tart ทาร์ตไข่", price: 65, rating: 4.3, sold: "ขายได้ 300+", category: "food", type: "food" },
  { id: "16", name: "วุ้นมะพร้าวอัญชัน", price: 45, rating: 4.6, sold: "ขายได้ 500+", category: "food", type: "food" },
  { id: "17", name: "Brownie บราวนี่ช็อกโกแลต", price: 220, originalPrice: 350, discountPercent: 37, rating: 4.7, sold: "ขายได้ 45+", category: "food", type: "food", isFlashSale: true, hasCoupon: true, isFreeShipping: true, flashSaleEndsIn: 10800 },
  { id: "18", name: "น้ำผึ้งมะนาวโถใหญ่", price: 599, originalPrice: 890, discountPercent: 33, rating: 4.9, sold: "ขายได้ 25+", category: "health", type: "food", isRecommended: true, hasCoupon: true, isFreeShipping: true },
  { id: "19", name: "Bloom Essence Gift Set", price: 179, originalPrice: 250, discountPercent: 28, rating: 4.4, sold: "ขายได้ 170+", category: "gift", type: "gift", hasCoupon: true, isFreeShipping: true },
  { id: "20", name: "ชุดของขวัญ Happy New Year (กาแฟ + Essence)", price: 95, rating: 4.5, sold: "ขายได้ 220+", category: "gift", type: "gift", isRecommended: true },
  { id: "21", name: "ชุดของขวัญ Happy New Year (Premium)", price: 129, originalPrice: 180, discountPercent: 28, rating: 4.6, sold: "ขายได้ 90+", category: "gift", type: "gift", hasCoupon: true, isFreeShipping: true },
  { id: "22", name: "Meta Herb Essence Duo (Rose + พิมเสนน้ำ)", price: 110, rating: 4.3, sold: "ขายได้ 140+", category: "aroma", type: "aroma", isRecommended: true },
  { id: "23", name: "ชุดของขวัญ Just For You", price: 85, originalPrice: 120, discountPercent: 29, rating: 4.7, sold: "ขายได้ 180+", category: "gift", type: "gift", hasCoupon: true },
  { id: "24", name: "ชุดของขวัญ Thank You", price: 290, originalPrice: 420, discountPercent: 31, rating: 4.8, sold: "ขายได้ 65+", category: "gift", type: "gift", isFlashSale: true, hasCoupon: true, isFreeShipping: true, flashSaleEndsIn: 25200 },
  { id: "25", name: "ชุดของขวัญกาแฟดริป + Butter Cookies", price: 145, rating: 4.4, sold: "ขายได้ 110+", category: "gift", type: "gift" },
  { id: "26", name: "ชุดของขวัญ Happy New Year (Premium 3 ชิ้น)", price: 125, originalPrice: 180, discountPercent: 31, rating: 4.6, sold: "ขายได้ 200+", category: "gift", type: "gift", hasCoupon: true, isFreeShipping: true },
  { id: "27", name: "Americano Coconut อเมริกาโน่มะพร้าว", price: 79, rating: 4.2, sold: "ขายได้ 250+", category: "food", type: "beverage", isRecommended: true },
  { id: "28", name: "Banana Chocolate Donut", price: 159, originalPrice: 230, discountPercent: 31, rating: 4.7, sold: "ขายได้ 95+", category: "food", type: "food", isFlashSale: true, hasCoupon: true, isFreeShipping: true, flashSaleEndsIn: 14400 },
  { id: "29", name: "น้ำหอมพิมเสนน้ำ Meta Herb Essence", price: 175, originalPrice: 260, discountPercent: 33, rating: 4.9, sold: "ขายได้ 35+", category: "aroma", type: "aroma", isRecommended: true, hasCoupon: true },
  { id: "31", name: "ผงอบเชย Cinnamon Powder (เซต 2 กล่อง)", price: 139, originalPrice: 199, discountPercent: 30, rating: 4.4, sold: "ขายได้ 85+", category: "herbal", type: "powder", hasCoupon: true, isFreeShipping: true },
  { id: "33", name: "Meta Herb Essence Rose Plumeria Bergamot", price: 175, originalPrice: 260, discountPercent: 33, rating: 4.6, sold: "ขายได้ 70+", category: "aroma", type: "aroma", isFlashSale: true, hasCoupon: true, isFreeShipping: true, flashSaleEndsIn: 32400 },
  { id: "34", name: "ดอกกานพลู Clove", price: 69, rating: 4.5, sold: "ขายได้ 340+", category: "raw", type: "powder" },
  { id: "35", name: "ลูกจันทน์เทศ Nutmeg", price: 450, originalPrice: 650, discountPercent: 31, rating: 4.8, sold: "ขายได้ 20+", category: "raw", type: "powder", isRecommended: true, hasCoupon: true, isFreeShipping: true },
  { id: "36", name: "สมุลเว้ง Cinnamomum Bajolghote", price: 55, rating: 4.2, sold: "ขายได้ 190+", category: "raw", type: "powder" },
  { id: "37", name: "อบเชยเทศ Cinnamon Varum (Alba)", price: 199, originalPrice: 290, discountPercent: 31, rating: 4.7, sold: "ขายได้ 55+", category: "raw", type: "powder", isFlashSale: true, hasCoupon: true, isFreeShipping: true, flashSaleEndsIn: 9000 },
  { id: "38", name: "กระวาน Camphor Seed", price: 115, rating: 4.4, sold: "ขายได้ 120+", category: "raw", type: "powder", isRecommended: true, hasCoupon: true },
  { id: "39", name: "ดอกจันทน์เทศ Mace", price: 49, rating: 4.3, sold: "ขายได้ 280+", category: "raw", type: "powder" },
  { id: "40", name: "น้ำผึ้งมะนาวพร้อมดื่ม", price: 0, rating: 5.0, sold: "แจกแล้ว 500+", category: "health", type: "beverage" },
  { id: "41", name: "เซตของขวัญ Butter Cookies คู่", price: 79, originalPrice: 110, discountPercent: 28, rating: 4.5, sold: "ขายได้ 150+", category: "gift", type: "gift", hasCoupon: true },
  { id: "42", name: "Reed Diffuser ก้านไม้กระจายกลิ่น", price: 359, originalPrice: 520, discountPercent: 31, rating: 4.9, sold: "ขายได้ 40+", category: "aroma", type: "aroma", isFlashSale: true, hasCoupon: true, isFreeShipping: true, flashSaleEndsIn: 16200 },
  { id: "43", name: "Meta Herb Essence Duo Set", price: 499, rating: 4.8, sold: "จอง 30+", category: "aroma", type: "aroma", isRecommended: true, hasCoupon: true },
  { id: "44", name: "ชาอู๋หลงผสมดอกหอมหมื่นลี้", price: 200, rating: 4.7, sold: "ขายได้ 45+", category: "food", type: "beverage", isRecommended: true, hasCoupon: true },
  { id: "45", name: "กาแฟดริป Signature อเมริกาโนเย็น", price: 149, originalPrice: 169, discountPercent: 12, rating: 4.6, sold: "ขายได้ 60+", category: "food", type: "beverage", isRecommended: true, hasCoupon: true },
];

// Every product, keyed by id (image + soldPercent resolved). Used to build the
// variant lists on the detail page — includes SKUs merged out of the card list.
export const RAW_PRODUCT_BY_ID: Record<string, CatalogProduct> = {};
ROWS.forEach((r) => {
  RAW_PRODUCT_BY_ID[r.id] = {
    ...r,
    image: IMAGE_OVERRIDE[r.id] ?? getRealProductImage(r.id),
    // Deterministic goal-gradient fill for flash-sale cards (no Math.random so
    // the value is stable across re-renders).
    soldPercent: r.isFlashSale ? 30 + ((parseInt(r.id, 10) * 7) % 60) : undefined,
  };
});

// "Same product" SKUs collapse into one card per group (cover/first photo +
// generic name); the rest are hidden and only appear as detail-page options.
export const REAL_PRODUCTS: CatalogProduct[] = ROWS.filter((r) => !MERGED_AWAY_IDS.has(r.id)).map(
  (r, i) => {
    // Per-shop ownership: split the catalog two ways by index so every product
    // belongs to exactly one of the two non-flagship shops (METAHERB Store keeps
    // its own curated SHOP_PRODUCTS list and is never sourced from here).
    const shop = i % 2 === 0 ? "บ้านสมุนไพรไทย" : "กรีนลีฟ ออร์แกนิก";
    const raw = RAW_PRODUCT_BY_ID[r.id];
    const group = GROUP_BY_ID[r.id];
    if (!group) return { ...raw, shop };
    // Keep the merged card in the Flash Sale rail if ANY variant is on flash
    // (else a merged-away SKU could drop the product out of that section).
    const flash = group.items.map((it) => RAW_PRODUCT_BY_ID[it.id]).find((p) => p?.isFlashSale);
    return {
      ...raw,
      shop,
      name: group.name,
      image: group.cover ?? raw.image,
      ...(flash
        ? { isFlashSale: true, flashSaleEndsIn: flash.flashSaleEndsIn, soldPercent: flash.soldPercent }
        : {}),
    };
  },
);

/** Products carrying the web's isFlashSale flag, in id order. */
export const REAL_FLASH_SALE: Product[] = REAL_PRODUCTS.filter((p) => p.isFlashSale);
/** Products carrying the web's isRecommended flag, in id order. */
export const REAL_RECOMMENDED: Product[] = REAL_PRODUCTS.filter((p) => p.isRecommended);
/** Discounted products for the promo rail (excludes flash-sale to avoid overlap). */
export const REAL_PROMO: Product[] = REAL_PRODUCTS.filter(
  (p) => p.discountPercent && !p.isFlashSale,
);
