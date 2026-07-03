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

// Web-parity taxonomy — the web catalog (../Metaherb/src/app/data/products.ts)
// files every product under 4 Thai categories. Each mobile CategoryKey folds
// into exactly one of them (verified product-by-product against the web data),
// so shop-facing surfaces (shop profile chips, owner console lists) show the
// same category names as the web shop pages.
export const WEB_CATEGORY_LABEL: Record<CategoryKey, string> = {
  food: "อาหาร",
  health: "อาหาร",
  raw: "สมุนไพร",
  herbal: "สมุนไพร",
  aroma: "เครื่องหอม",
  gift: "ชุดของขวัญ",
};

/** Web category name for a product's category value (codes pass Thai labels through). */
export function webCategoryLabel(category: string): string {
  return (WEB_CATEGORY_LABEL as Record<string, string>)[category] ?? category;
}

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

export type CatalogProduct = Product & { category: CategoryKey; type: TypeKey; shop?: string };

// The Products tab now serves the real METAHERB samples (names, prices, photos)
// ported from the web app. See src/data/realProducts.ts.
export { REAL_PRODUCTS as ALL_PRODUCTS } from "./realProducts";
