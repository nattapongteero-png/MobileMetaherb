/* ============================================================================
 *  In-memory store for owner "โปรโมชั่น" (promotions), ported 1:1 from the web
 *  OwnerDashboard (PromotionsTab + CreatePromotionView). Mirrors the trialDrafts
 *  store shape: a useSyncExternalStore hook + imperative mutators, seeded with
 *  mockPromotions. Not persisted across reloads (mockup).
 *  ========================================================================== */
import { useSyncExternalStore } from "react";
import { REAL_PRODUCTS } from "./realProducts";
import { SHOP_STOCK } from "./catalog";

export type PromoStatus = "active" | "scheduled" | "ended";
export type PromoDiscountType = "percent" | "baht";
export type PromoScope = "products" | "all";

export type PromoProductLimit = { productId: string; limit: number | "unlimited" };

export type Promotion = {
  id: string;
  name: string;
  description?: string;
  discountType: PromoDiscountType;
  discountValue: number;
  maxDiscount?: number;
  startsAt: string;
  endsAt?: string;
  noExpiry?: boolean;
  enabled: boolean;
  scope: PromoScope;
  products: PromoProductLimit[];
};

/** Minimal product shape the picker needs (image = require() from the catalog). */
export type PromoProduct = {
  id: string;
  name: string;
  price: string;
  stock: string;
  status: string; // "เปิดขาย" | "สินค้าหมด" | "ปิดขาย"
  image: number;
};

// The promotion pool = METAHERB Store's real storefront products, minus the
// flash-sale items (a product is never in Flash Sale AND a promotion at once).
// Price shows the pre-discount base (originalPrice) so the promo math lands on
// the exact price the storefront card displays; stock comes from SHOP_STOCK —
// the same map จัดการสินค้า reads.
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

const _promoDay = (offset: number, h = 0, m = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const mockPromotions: Promotion[] = [
  // ── กำลังดำเนินการ (active) ──
  // The two active product-scoped promos cover EXACTLY the storefront's two
  // discounted (non-flash) cards: id 23 (฿120 → ฿85, ลด 29%) and id 45
  // (฿169 → ฿149, ลด 12%). The baht cuts reproduce those prices to the satang,
  // and stay disjoint from the flash-sale products (1/9/33).
  {
    id: "p-a1", name: "ชุดของขวัญสุดคุ้ม ลด ฿35",
    description: "ลดราคาชุดของขวัญ Just For You ทันที 35 บาท",
    discountType: "baht", discountValue: 35,
    startsAt: _promoDay(-3, 0, 0), endsAt: _promoDay(14, 23, 59),
    enabled: true, scope: "products",
    products: [{ productId: "23", limit: "unlimited" }],
  },
  {
    id: "p-a2", name: "ดื่มดี สุขภาพดี ลด ฿20",
    description: "ลดราคากาแฟดริป Signature อเมริกาโนเย็น 20 บาท",
    discountType: "baht", discountValue: 20,
    startsAt: _promoDay(-5, 0, 0), endsAt: _promoDay(7, 23, 59),
    enabled: true, scope: "products",
    products: [{ productId: "45", limit: "unlimited" }],
  },
  {
    id: "p-a3", name: "Mid Year Sale ลดทั้งร้าน 10%",
    description: "ลดราคาสินค้าทุกชนิดในร้าน 10% รวมถึงทุกตัวเลือก",
    discountType: "percent", discountValue: 10, maxDiscount: 150,
    startsAt: _promoDay(-1, 0, 0), endsAt: _promoDay(30, 23, 59),
    enabled: true, scope: "all",
    products: [],
  },
  // ── กำหนดไว้ (scheduled) ──
  {
    id: "p-s1", name: "Flash Sale 6.6 ลด 25%",
    description: "โปรโมชั่นมหกรรม 6.6 — ลดสูงสุด 250 บาท",
    discountType: "percent", discountValue: 25, maxDiscount: 250,
    startsAt: _promoDay(20, 0, 0), endsAt: _promoDay(20, 23, 59),
    enabled: true, scope: "products",
    products: [
      { productId: "23", limit: 2 },
      { productId: "36", limit: "unlimited" },
      { productId: "39", limit: "unlimited" },
      { productId: "45", limit: 5 },
    ],
  },
  {
    id: "p-s2", name: "Pre-Order วันแม่ ลด ฿50",
    description: "เตรียมความพร้อมโปรวันแม่ ลด 50 บาท ทุกออเดอร์",
    discountType: "baht", discountValue: 50,
    startsAt: _promoDay(45, 0, 0), endsAt: _promoDay(60, 23, 59),
    enabled: true, scope: "all",
    products: [],
  },
  // ── สิ้นสุดแล้ว (ended) ──
  {
    id: "p-e1", name: "ต้อนรับเปิดร้าน ลด 20%",
    description: "โปรโมชั่นฉลองเปิดเว็บไซต์ใหม่ ลด 20%",
    discountType: "percent", discountValue: 20,
    startsAt: _promoDay(-50, 17, 53), endsAt: _promoDay(-30, 17, 53),
    enabled: true, scope: "products",
    products: [
      { productId: "36", limit: "unlimited" },
      { productId: "39", limit: "unlimited" },
      { productId: "45", limit: "unlimited" },
    ],
  },
  {
    id: "p-e2", name: "โปรสายบุญ วันมาฆะบูชา",
    description: "โปรสายบุญ ชุดทำบุญถวายพระในวันมาฆะบูชา",
    discountType: "percent", discountValue: 20,
    startsAt: _promoDay(-60, 2, 0), endsAt: _promoDay(-60, 16, 59),
    enabled: true, scope: "products",
    products: [
      { productId: "23", limit: "unlimited" },
      { productId: "36", limit: "unlimited" },
      { productId: "39", limit: "unlimited" },
      { productId: "45", limit: "unlimited" },
    ],
  },
];

/** Thai Buddhist-year date-time formatter (e.g. "3 ก.ค. 2569 09:00"). */
export function fmtPromoThaiDateTime(iso: string): string {
  const d = new Date(iso);
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Derived status — scheduled if not started yet, ended if past endsAt, else active. */
export function computedStatus(p: Promotion): PromoStatus {
  const now = Date.now();
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return "scheduled";
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return "ended";
  return "active";
}

/* ── in-memory store (mirrors trialDrafts) ── */
let promotions: Promotion[] = [...mockPromotions];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function addPromotion(p: Promotion) {
  promotions = [p, ...promotions];
  emit();
}

export function updatePromotion(p: Promotion) {
  promotions = promotions.map((x) => (x.id === p.id ? p : x));
  emit();
}

export function removePromotion(id: string) {
  promotions = promotions.filter((x) => x.id !== id);
  emit();
}

export function togglePromotion(id: string) {
  promotions = promotions.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x));
  emit();
}

/** Non-hook snapshot — for one-off reads (e.g. prefilling the edit form). */
export function getPromotionById(id: string): Promotion | undefined {
  return promotions.find((p) => p.id === id);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Live list of all promotions (re-renders on add / update / remove / toggle). */
export function useAllPromotions(): Promotion[] {
  return useSyncExternalStore(subscribe, () => promotions, () => promotions);
}
