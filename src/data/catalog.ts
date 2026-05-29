import type { Product } from "../types/Product";

/**
 * Catalog data for the Products tab. Self-contained for now (HomeScreen keeps
 * its own flash-sale/recommended pool); both could later share this module.
 */

export type CategoryKey =
  | "health"
  | "food"
  | "aroma"
  | "herbal"
  | "raw"
  | "gift";

export type Category = { key: CategoryKey; label: string };

export const CATEGORIES: Category[] = [
  { key: "health", label: "ผลิตภัณฑ์สุขภาพ" },
  { key: "food", label: "อาหาร & เครื่องดื่ม" },
  { key: "aroma", label: "เครื่องหอม & อโรม่า" },
  { key: "herbal", label: "ผลิตภัณฑ์สมุนไพร" },
  { key: "raw", label: "วัตถุดิบสมุนไพร" },
  { key: "gift", label: "ของชำร่วย & ของขวัญ" },
];

// Product form/type — a second taxonomy, independent of category.
export type TypeKey = "capsule" | "powder" | "beverage" | "aroma" | "gift" | "food";

export type ProductType = { key: TypeKey; label: string };

export const TYPES: ProductType[] = [
  { key: "capsule", label: "แคปซูล/เม็ด" },
  { key: "powder", label: "ผง/อบแห้ง" },
  { key: "beverage", label: "ชา/กาแฟ" },
  { key: "aroma", label: "เครื่องหอม/ยาดม" },
  { key: "gift", label: "เซ็ต/ของขวัญ" },
  { key: "food", label: "อาหาร/น้ำผึ้ง" },
];

export type PriceRange = { key: string; label: string; min: number; max: number };

export const PRICE_RANGES: PriceRange[] = [
  { key: "all", label: "ทั้งหมด", min: 0, max: Infinity },
  { key: "lt100", label: "ต่ำกว่า ฿100", min: 0, max: 100 },
  { key: "100-200", label: "฿100–200", min: 100, max: 200 },
  { key: "200-300", label: "฿200–300", min: 200, max: 300 },
  { key: "gt300", label: "มากกว่า ฿300", min: 300, max: Infinity },
];

export type CatalogProduct = Product & { category: CategoryKey; type: TypeKey };

const IMG_CINNAMON = require("../../assets/products/cinnamon.png");
const IMG_COFFEE = require("../../assets/products/coffee.png");
const IMG_GIFT_RIBBON = require("../../assets/products/gift-ribbon.png");
const IMG_GIFT_SET = require("../../assets/products/gift-set.png");
const IMG_HERB_JAR = require("../../assets/products/herb-jar.png");
const IMG_DOKJUN = require("../../assets/products/dokjun.png");
const IMG_LEMON = require("../../assets/products/lemon.png");

type PoolItem = { name: string; image: number; category: CategoryKey; type: TypeKey };

const POOL: PoolItem[] = [
  { name: "เมต้าเฮิร์บ ยาดมสมุนไพร แดง+น้ำเงิน", image: IMG_HERB_JAR, category: "health", type: "aroma" },
  { name: "ขมิ้นชันแคปซูล 60 เม็ด", image: IMG_HERB_JAR, category: "health", type: "capsule" },
  { name: "น้ำผึ้งดิบจากป่าธรรมชาติ 350ml", image: IMG_HERB_JAR, category: "health", type: "food" },
  { name: "ฟ้าทะลายโจรแคปซูล 100 เม็ด", image: IMG_HERB_JAR, category: "health", type: "capsule" },

  { name: "กาแฟดริป Dark Roast Arabica 9 ซอง", image: IMG_COFFEE, category: "food", type: "beverage" },
  { name: "กาแฟคั่วเข้ม Signature Blend 200g", image: IMG_COFFEE, category: "food", type: "beverage" },
  { name: "ชาสมุนไพร 9 ชนิด รวมในซองเดียว", image: IMG_CINNAMON, category: "food", type: "beverage" },
  { name: "มะตูมแห้งหั่นชง พร้อมชง 200g", image: IMG_CINNAMON, category: "food", type: "beverage" },

  { name: "เครื่องหอมอโรม่า กลิ่นตะไคร้หอม", image: IMG_LEMON, category: "aroma", type: "aroma" },
  { name: "ยาดมสมุนไพร Herbal Inhaler Classic", image: IMG_HERB_JAR, category: "aroma", type: "aroma" },
  { name: "น้ำมันหอมระเหย ตะไคร้ 30ml", image: IMG_LEMON, category: "aroma", type: "aroma" },

  { name: "อบเชยเทศ Cinnamon Varum 150g", image: IMG_CINNAMON, category: "herbal", type: "powder" },
  { name: "กระชายอบแห้งบดละเอียด 100g", image: IMG_DOKJUN, category: "herbal", type: "powder" },
  { name: "ใบบัวบกอบแห้ง คัดพิเศษ 30g", image: IMG_DOKJUN, category: "herbal", type: "powder" },

  { name: "ดอกจันอบแห้ง คัดพิเศษ 30g", image: IMG_DOKJUN, category: "raw", type: "powder" },
  { name: "อัญชันแห้ง พรีเมียม 100g", image: IMG_DOKJUN, category: "raw", type: "powder" },
  { name: "เปลือกมะนาวอบแห้ง 50g", image: IMG_LEMON, category: "raw", type: "powder" },
  { name: "ตะไคร้แห้งหั่นฝอย 80g", image: IMG_LEMON, category: "raw", type: "powder" },

  { name: "ชุดของขวัญพรีเมียม ผูกโบว์", image: IMG_GIFT_RIBBON, category: "gift", type: "gift" },
  { name: "ชุดของขวัญ Limited Edition", image: IMG_GIFT_RIBBON, category: "gift", type: "gift" },
  { name: "ชุดของขวัญคุกกี้สมุนไพร", image: IMG_GIFT_SET, category: "gift", type: "gift" },
  { name: "ชุดของขวัญ Cookies & Tea Set", image: IMG_GIFT_SET, category: "gift", type: "gift" },
];

function makeProduct(idx: number, item: PoolItem): CatalogProduct {
  const price = Math.round((45 + Math.random() * 400) / 5) * 5;
  const hasDiscount = Math.random() > 0.35;
  const discountPercent = hasDiscount ? Math.floor(Math.random() * 30) + 15 : undefined;
  const originalPrice = discountPercent
    ? Math.round(price / (1 - discountPercent / 100) / 5) * 5
    : undefined;
  const rating = Math.round(Math.random() * 9 + 41) / 10; // 4.1 – 5.0
  const soldCount = Math.floor(Math.random() * 380) + 40;
  return {
    id: `p${idx + 1}`,
    name: item.name,
    price,
    originalPrice,
    discountPercent,
    rating,
    sold: `ขายได้ ${soldCount}+`,
    image: item.image,
    category: item.category,
    type: item.type,
    isRecommended: Math.random() > 0.7,
    isFreeShipping: Math.random() > 0.5,
    hasCoupon: Math.random() > 0.6,
  };
}

// Generated once on module load so the catalog is stable across re-renders.
export const ALL_PRODUCTS: CatalogProduct[] = POOL.map((item, idx) =>
  makeProduct(idx, item),
);
