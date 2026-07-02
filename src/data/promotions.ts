/* ============================================================================
 *  In-memory store for owner "โปรโมชั่น" (promotions), ported 1:1 from the web
 *  OwnerDashboard (PromotionsTab + CreatePromotionView). Mirrors the trialDrafts
 *  store shape: a useSyncExternalStore hook + imperative mutators, seeded with
 *  mockPromotions. Not persisted across reloads (mockup).
 *  ========================================================================== */
import { useSyncExternalStore } from "react";

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

/** Minimal product shape the picker needs (subset of the web mockProducts). */
export type PromoProduct = {
  id: string;
  name: string;
  price: string;
  stock: string;
  status: string; // "เปิดขาย" | "สินค้าหมด" | "ปิดขาย"
  image: string;
};

/* Subset of the web mockProducts — only fields the picker + chips display. */
export const PROMO_PRODUCTS: PromoProduct[] = [
  { id: "1", name: "พิมเสนน้ำอโรมา ตราเมต้าเฮิร์บ", price: "฿ 89.00", stock: "120 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1624454002302-36b824d7bd0a?w=400&q=80" },
  { id: "2", name: "ขมิ้นชันแคปซูล 60 แคป", price: "฿ 220.00", stock: "85 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1740592754365-2117f5977528?w=400&q=80" },
  { id: "3", name: "ฟ้าทะลายโจรผง 100 g", price: "฿ 145.00", stock: "40 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1759064716219-ba8c60a7ce07?w=400&q=80" },
  { id: "4", name: "กาแฟดริป Signature อเมริกาโนเย็น", price: "฿ 150.00 - 280.00", stock: "62 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1599639932525-213272ff954b?w=400&q=80" },
  { id: "5", name: "ใบบัวบกแคปซูล 60 แคป", price: "฿ 180.00", stock: "95 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1748390359572-8e7a47bf5cb5?w=400&q=80" },
  { id: "6", name: "ชาเก๊กฮวยออร์แกนิก 20 ซอง", price: "฿ 125.00", stock: "210 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1610643625267-aee6dae3ca22?w=400&q=80" },
  { id: "7", name: "น้ำมันมะพร้าวสกัดเย็น 250 ml", price: "฿ 290.00 - 520.00", stock: "48 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1591282017732-207fbba7dfd4?w=400&q=80" },
  { id: "8", name: "ชามะรุม 30 ซอง", price: "฿ 130.00", stock: "75 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400&q=80" },
  { id: "9", name: "เห็ดหลินจือสกัด 60 แคป", price: "฿ 245.00", stock: "0 ชิ้น", status: "สินค้าหมด", image: "https://images.unsplash.com/photo-1644061923948-f5b918b524c7?w=400&q=80" },
  { id: "10", name: "น้ำผึ้งดอกลำไย 250 ml", price: "฿ 215.00 - 380.00", stock: "32 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1645693091199-77a764e1ea16?w=400&q=80" },
  { id: "11", name: "ขิงผงออร์แกนิก 100 g", price: "฿ 130.00", stock: "150 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1573821663912-6df460f9c684?w=400&q=80" },
  { id: "12", name: "สบู่สมุนไพรขมิ้น", price: "฿ 65.00", stock: "180 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80" },
  { id: "13", name: "บาล์มสมุนไพรไพล", price: "฿ 95.00", stock: "8 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1546039907-7fa05f864c02?w=400&q=80" },
  { id: "14", name: "ถุงหอมอโรมา MetaHerb Bloom Essence", price: "฿ 79.00 - 199.00", stock: "0 ชิ้น", status: "ปิดขาย", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80" },
  { id: "15", name: "ชาตะไคร้ใบเตย 30 ซอง", price: "฿ 110.00", stock: "245 ชิ้น", status: "เปิดขาย", image: "https://images.unsplash.com/photo-1592479996-0c8a1e8c5d4e?w=400&q=80" },
];

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
  {
    id: "p-a1", name: "ลดสุดคุ้ม สมุนไพรทุกชนิด 15%",
    description: "ลดราคาสมุนไพรแคปซูลและผงสมุนไพรทุกตัว",
    discountType: "percent", discountValue: 15, maxDiscount: 200,
    startsAt: _promoDay(-3, 0, 0), endsAt: _promoDay(14, 23, 59),
    enabled: true, scope: "products",
    products: [
      { productId: "2", limit: "unlimited" },
      { productId: "3", limit: "unlimited" },
      { productId: "5", limit: "unlimited" },
      { productId: "9", limit: "unlimited" },
    ],
  },
  {
    id: "p-a2", name: "ดื่มดี สุขภาพดี ลด ฿30",
    description: "ลดราคาชาสมุนไพรทุกซอง 30 บาท เมื่อช้อปครบ 200 บาท",
    discountType: "baht", discountValue: 30,
    startsAt: _promoDay(-5, 0, 0), endsAt: _promoDay(7, 23, 59),
    enabled: true, scope: "products",
    products: [
      { productId: "6", limit: "unlimited" },
      { productId: "8", limit: "unlimited" },
      { productId: "15", limit: "unlimited" },
    ],
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
      { productId: "1", limit: "unlimited" },
      { productId: "4", limit: "unlimited" },
      { productId: "10", limit: "unlimited" },
      { productId: "12", limit: "unlimited" },
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
      { productId: "1", limit: "unlimited" },
      { productId: "2", limit: "unlimited" },
      { productId: "3", limit: "unlimited" },
    ],
  },
  {
    id: "p-e2", name: "โปรสายบุญ วันมาฆะบูชา",
    description: "โปรสายบุญ ชุดทำบุญถวายพระในวันมาฆะบูชา",
    discountType: "percent", discountValue: 20,
    startsAt: _promoDay(-60, 2, 0), endsAt: _promoDay(-60, 16, 59),
    enabled: true, scope: "products",
    products: [
      { productId: "4", limit: "unlimited" },
      { productId: "5", limit: "unlimited" },
      { productId: "6", limit: "unlimited" },
      { productId: "7", limit: "unlimited" },
      { productId: "8", limit: "unlimited" },
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
