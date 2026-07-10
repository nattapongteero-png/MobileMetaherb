/**
 * Back-fill: one order history stretching from มกราคม 2568 to the current month,
 * so the dashboard's yearly chart, month heatmap and customer report have depth.
 *
 * The 23 hand-authored orders (data/orders.ts + data/shopOrders.ts) carry the
 * interesting states — a pending cancellation, a rejected review, a shipment in
 * flight — and cover roughly the last 25 days. These rows fill everything before
 * that, and nothing else: `HISTORY_CUTOFF_DAYS` is the seam.
 *
 * Deterministic: a seeded PRNG, never Math.random, so the demo, the tests and a
 * screenshot taken tomorrow all agree.
 */
import { REAL_PRODUCTS, getRealProductImage } from "./realProducts";
import { METAHERB_SHOP } from "./shopOrders";
import { seedOrderId } from "./seedClock";
import { formatThaiDateTime } from "../store/orders";
import type { Order, OrderItem, OrderStatus } from "../store/types";

/** History stops here; the hand-authored orders take over. */
export const HISTORY_CUTOFF_DAYS = 26;

/** First month of the back-fill: มกราคม 2568. */
export const HISTORY_START = { year: 2025, month: 0 };

const SHOP_CATALOG = REAL_PRODUCTS.filter((p) => p.shop === METAHERB_SHOP);

/** Buyers who shopped here before the demo buyer did. Gives the customer report depth. */
const BUYERS = [
  { id: "u-somchai", name: "คุณสมชาย ใจดี", phone: "081-234-5678" },
  { id: "u-somying", name: "คุณสมหญิง รักสุขภาพ", phone: "089-876-5432" },
  { id: "u-tantawan", name: "คุณทานตะวัน งามดี", phone: "086-111-2233" },
  { id: "u-saifon", name: "คุณสายฝน พรหมมา", phone: "082-555-7788" },
  { id: "u-fahsai", name: "คุณฟ้าใส แจ่มจันทร์", phone: "087-222-9090" },
  { id: "u-pimjai", name: "คุณพิมพ์ใจ บุญมา", phone: "085-666-2211" },
  { id: "u-chonticha", name: "คุณชลธิชา แก้วใส", phone: "089-333-8877" },
  { id: "u-kitti", name: "คุณกิตติ วงศ์ทอง", phone: "084-101-2020" },
  { id: "u-napha", name: "คุณนภา ศรีสุข", phone: "092-808-4411" },
  { id: "u-ekachai", name: "คุณเอกชัย มั่นคง", phone: "080-717-3355" },
  { id: "u-warunee", name: "คุณวารุณี ทองดี", phone: "091-262-8899" },
  { id: "u-panupong", name: "คุณภาณุพงศ์ ไชยวัฒน์", phone: "094-505-6677" },
];

const ADDRESSES = [
  "88/12 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
  "120 หมู่ 5 ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
  "9 ซ.ลาดพร้าว 71 แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230",
  "203/7 ถ.เพชรเกษม ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110",
  "99/1 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
];

const SHIPPING = ["จัดส่งปกติ", "จัดส่งด่วน", "รับที่ร้าน"];
const PAYMENT = ["พร้อมเพย์ PromptPay", "บัตรเครดิต/บัตรเดบิต", "บัญชีธนาคาร", "ชำระเงินปลายทาง"];

/** mulberry32 — small, fast, and gives the same stream for the same seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];
const between = (r: () => number, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));

/**
 * Seasonal shape on order VOLUME: a Songkran dip in April, a New Year peak in
 * December. It multiplies a deliberately narrow base count — a wide random range
 * drowned the shape out in the first draft. Revenue follows only loosely, since
 * basket size varies.
 */
const SEASON = [1.0, 0.85, 1.05, 0.7, 0.95, 1.1, 1.15, 1.0, 0.9, 1.05, 1.2, 1.35];

/** Most history is finished business; a little of it went wrong. */
function historyStatus(r: () => number): OrderStatus {
  const x = r();
  if (x < 0.06) return "cancelled";
  if (x < 0.18) return "delivered"; // arrived, never reviewed
  return "completed";
}

function buildOrder(r: () => number, at: number, tailBase: number): Order {
  const buyer = pick(r, BUYERS);
  const lineCount = between(r, 1, 3);
  const items: OrderItem[] = [];
  for (let i = 0; i < lineCount; i++) {
    const p = SHOP_CATALOG[between(r, 0, SHOP_CATALOG.length - 1)];
    // Merge a repeated product rather than listing it twice.
    const existing = items.find((it) => it.productId === p.id);
    if (existing) {
      existing.quantity += 1;
      continue;
    }
    items.push({
      productId: p.id,
      name: p.name,
      option: "",
      quantity: between(r, 1, 3),
      price: p.price,
      image: getRealProductImage(p.id),
    });
  }

  const status = historyStatus(r);
  const tail = String(tailBase % 100000).padStart(5, "0");
  return {
    id: seedOrderId(at, tail),
    userId: buyer.id,
    shopName: METAHERB_SHOP,
    status,
    date: formatThaiDateTime(at),
    createdAt: at,
    items,
    total: items.reduce((s, it) => s + it.price * it.quantity, 0),
    recipient: { name: buyer.name, phone: buyer.phone, address: pick(r, ADDRESSES) },
    shippingMethod: pick(r, SHIPPING),
    paymentMethod: pick(r, PAYMENT),
    ...(status !== "cancelled" ? { trackingNumber: `TH${between(r, 10000000, 99999999)}` } : {}),
    ...(status === "cancelled"
      ? { cancelledBy: "shop" as const, cancelReason: "สินค้าหมดสต็อก", cancellationStatus: "approved" as const }
      : {}),
  };
}

/**
 * Every month from HISTORY_START to the current one, stopping
 * HISTORY_CUTOFF_DAYS before today so these never collide with the
 * hand-authored orders.
 */
export function buildOrderHistory(now = Date.now()): Order[] {
  const today = new Date(now);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - HISTORY_CUTOFF_DAYS);

  const out: Order[] = [];
  let tailBase = 10000;

  const cursor = new Date(HISTORY_START.year, HISTORY_START.month, 1);
  while (cursor <= today) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    // One stream per month: adding a later month never shifts an earlier one.
    const r = rng(year * 100 + month + 1);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const target = Math.round(between(r, 11, 13) * SEASON[month]);

    for (let i = 0; i < target; i++) {
      const day = between(r, 1, daysInMonth);
      const at = new Date(year, month, day, between(r, 8, 20), between(r, 0, 59)).getTime();
      if (at >= cutoff.getTime()) continue; // the hand-authored orders own this window
      out.push(buildOrder(r, at, tailBase++));
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

export const HISTORY_ORDERS: Order[] = buildOrderHistory();
