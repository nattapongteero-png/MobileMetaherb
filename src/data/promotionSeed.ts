// Seed rows for the promotions store (src/store/promotions.ts).
//
// Ported from the web OwnerDashboard's mockPromotions. The two active
// product-scoped promos reproduce, to the satang, the storefront's two
// discounted non-flash cards — id 23 (฿120 → ฿85) and id 45 (฿169 → ฿149) —
// except that the price is now *computed from* the promotion rather than baked
// into realProducts.ts and coincidentally matching.

import type { Promotion } from "../store/promotions";

const day = (offset: number, h = 0, m = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const SEED_PROMOTIONS: Promotion[] = [
  // ── กำลังดำเนินการ (active) ──
  {
    id: "p-a1", name: "ชุดของขวัญสุดคุ้ม ลด ฿35",
    description: "ลดราคาชุดของขวัญ Just For You ทันที 35 บาท",
    discountType: "baht", discountValue: 35,
    startsAt: day(-3), endsAt: day(14, 23, 59),
    enabled: true, scope: "products",
    products: [{ productId: "23", limit: "unlimited" }],
  },
  {
    id: "p-a2", name: "ดื่มดี สุขภาพดี ลด ฿20",
    description: "ลดราคากาแฟดริป Signature อเมริกาโนเย็น 20 บาท",
    discountType: "baht", discountValue: 20,
    startsAt: day(-5), endsAt: day(7, 23, 59),
    enabled: true, scope: "products",
    products: [{ productId: "45", limit: "unlimited" }],
  },
  {
    // Seeded OFF. Promotions now really do set storefront prices, and a
    // shop-wide 10% would silently re-price the whole catalog on first launch.
    // Toggle it on in จัดการโปรโมชั่น to watch every card drop 10%.
    id: "p-a3", name: "Mid Year Sale ลดทั้งร้าน 10%",
    description: "ลดราคาสินค้าทุกชนิดในร้าน 10% รวมถึงทุกตัวเลือก",
    discountType: "percent", discountValue: 10, maxDiscount: 150,
    startsAt: day(-1), endsAt: day(30, 23, 59),
    enabled: false, scope: "all",
    products: [],
  },
  // ── กำหนดไว้ (scheduled) ──
  {
    id: "p-s1", name: "Flash Sale 6.6 ลด 25%",
    description: "โปรโมชั่นมหกรรม 6.6 — ลดสูงสุด 250 บาท",
    discountType: "percent", discountValue: 25, maxDiscount: 250,
    startsAt: day(20), endsAt: day(20, 23, 59),
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
    startsAt: day(45), endsAt: day(60, 23, 59),
    enabled: true, scope: "all",
    products: [],
  },
  // ── สิ้นสุดแล้ว (ended) ──
  {
    id: "p-e1", name: "ต้อนรับเปิดร้าน ลด 20%",
    description: "โปรโมชั่นฉลองเปิดเว็บไซต์ใหม่ ลด 20%",
    discountType: "percent", discountValue: 20,
    startsAt: day(-50, 17, 53), endsAt: day(-30, 17, 53),
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
    startsAt: day(-60, 2), endsAt: day(-60, 16, 59),
    enabled: true, scope: "products",
    products: [
      { productId: "23", limit: "unlimited" },
      { productId: "36", limit: "unlimited" },
      { productId: "39", limit: "unlimited" },
      { productId: "45", limit: "unlimited" },
    ],
  },
];
