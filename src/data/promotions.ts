/* ============================================================================
 *  The owner console's "โปรโมชั่น" view.
 *
 *  This was a console-only in-memory store while the storefront's discounted
 *  prices and "ลด N%" badges were static fields in realProducts.ts — so a
 *  promotion the owner created never changed a customer's price. It is now a
 *  thin facade over the shared store (src/store/promotions.ts), whose pricing
 *  engine feeds data/liveCatalog.ts.
 *  ========================================================================== */
import { useStore } from "../store/db";
import {
  addPromotion as addPromotionAction,
  allPromotions,
  computedStatus as computedStatusAction,
  getPromotionById as getPromotionByIdAction,
  promotionsStore,
  removePromotion as removePromotionAction,
  togglePromotion as togglePromotionAction,
  updatePromotion as updatePromotionAction,
  type FlashEntry,
  type PromoDiscountType,
  type PromoProductLimit,
  type Promotion,
  type PromoScope,
  type PromoStatus,
} from "../store/promotions";
import { REAL_PRODUCTS } from "./realProducts";
import { SHOP_STOCK } from "./catalog";

export type { Promotion, PromoStatus, PromoDiscountType, PromoScope, PromoProductLimit, FlashEntry };

/** Minimal product shape the picker needs (image = require() from the catalog). */
export type PromoProduct = {
  id: string;
  name: string;
  price: string;
  stock: string;
  status: string; // "เปิดขาย" | "สินค้าหมด" | "ปิดขาย"
  image: number;
};

// The promotion pool = METAHERB Store's storefront products, minus the
// flash-sale items (a product is never in Flash Sale AND a promotion at once).
// Price shows the pre-discount base, which is what the engine discounts from.
export const PROMO_PRODUCTS: PromoProduct[] = REAL_PRODUCTS.filter(
  (p) => p.shop === "METAHERB Store" && !p.isFlashSale,
).map((p) => {
  const s = SHOP_STOCK[p.id] ?? { stock: 200 };
  return {
    id: p.id,
    name: p.name,
    price: `฿ ${(p.originalPrice ?? p.price).toFixed(2)}`,
    stock: `${s.stock.toLocaleString()} ชิ้น`,
    status: s.closed ? "ปิดขาย" : s.stock === 0 ? "สินค้าหมด" : "เปิดขาย",
    image: p.image as number,
  };
});

export function promoProductById(id: string): PromoProduct | undefined {
  return PROMO_PRODUCTS.find((p) => p.id === id);
}

/** Thai Buddhist-year date-time formatter (e.g. "3 ก.ค. 2569 09:00"). */
export function fmtPromoThaiDateTime(iso: string): string {
  const d = new Date(iso);
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Derived status — scheduled if not started yet, ended if past endsAt, else active. */
export const computedStatus = (p: Promotion): PromoStatus => computedStatusAction(p);

export const addPromotion = addPromotionAction;
export const updatePromotion = updatePromotionAction;
export const removePromotion = removePromotionAction;
export const togglePromotion = togglePromotionAction;
export const getPromotionById = getPromotionByIdAction;

/** Live list of all promotions (re-renders on add / update / remove / toggle). */
export function useAllPromotions(): Promotion[] {
  useStore(promotionsStore);
  return allPromotions();
}
