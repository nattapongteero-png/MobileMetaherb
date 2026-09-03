/**
 * Mock café sales history — the numbers behind หลังบ้าน Meta Cafe's report.
 *
 * The console derives every figure from the shared café order store, so an
 * empty store made the whole report read as broken (flat chart, no top sellers,
 * ฿0 on the card). These rows fill it in the way a real counter would: a busy
 * recent month, a thinner back-catalogue over the year, weekends heavier than
 * Mondays, and a menu mix where a handful of drinks genuinely lead.
 *
 * Deterministic — a small LCG seeded per day, so the same day always produces
 * the same figures (a report that reshuffles on every reload is unreadable).
 * Timestamps hang off SEED_TODAY, so "วันนี้ / เดือนนี้ / ปีนี้" are never empty.
 */
import type { CafeOrder, CafeOrderItem } from "../store/cafe";
import { METAHERB_SHOP } from "./shopOrders";
import { SEED_TODAY } from "./seedClock";

const DAY = 86_400_000;

/** Menu pool with a popularity weight — bigger weight = sells more often. */
const POOL: { name: string; price: number; weight: number; opts: string[] }[] = [
  { name: "Iced Latte", price: 70, weight: 10, opts: ["หวาน 50%", "หวาน 75% · นมโอ้ต", "หวาน 100%"] },
  { name: "Thai Tea", price: 70, weight: 9, opts: ["หวาน 100%", "หวาน 75%", "หวาน 125% · ไข่มุก"] },
  { name: "Iced Americano", price: 80, weight: 9, opts: ["ไม่หวาน", "หวาน 25%", "+1 ช็อตกาแฟ"] },
  { name: "Green Tea Latte", price: 80, weight: 7, opts: ["หวาน 50% · นมโอ้ต", "หวาน 75%"] },
  { name: "Iced Caramel Macchiato", price: 70, weight: 6, opts: ["หวาน 50%", "+1 ช็อตกาแฟ · นมโอ้ต"] },
  { name: "Strawberry Milk", price: 85, weight: 5, opts: ["หวาน 75%", "หวาน 100% · วิปครีม"] },
  { name: "Iced Mocha", price: 65, weight: 5, opts: ["หวาน 75%", "หวาน 50% · นมถั่วเหลือง"] },
  { name: "Hot Cappuccino", price: 75, weight: 4, opts: ["หวาน 50%", "นมสด"] },
  { name: "Iced Cocoa", price: 80, weight: 4, opts: ["หวาน 100% · วิปครีม", "หวาน 75%"] },
  { name: "Jasmine Milk Tea", price: 55, weight: 4, opts: ["หวาน 75% · ไข่มุก", "หวาน 50%"] },
  { name: "Hot Americano", price: 70, weight: 3, opts: ["ไม่หวาน", ""] },
  { name: "Butterfly Pea Latte", price: 65, weight: 3, opts: ["หวาน 50%", "นมโอ้ต"] },
  { name: "Black Coffee", price: 60, weight: 2, opts: ["", "ไม่หวาน"] },
  { name: "Mint Dark Cocoa", price: 65, weight: 2, opts: ["หวาน 75%"] },
];

const WEIGHT_TOTAL = POOL.reduce((s, m) => s + m.weight, 0);

/** Deterministic PRNG — same day in, same numbers out. */
function rng(seed: number): () => number {
  let v = (seed * 1664525 + 1013904223) >>> 0;
  return () => {
    v = (v * 1664525 + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

const pickMenu = (r: number) => {
  let acc = 0;
  const target = r * WEIGHT_TOTAL;
  for (const m of POOL) {
    acc += m.weight;
    if (target <= acc) return m;
  }
  return POOL[0];
};

/**
 * Orders on a given day. Recent days are busy and fully logged; older days keep
 * a thinner trace, which is what a year of history looks like anyway — and it
 * keeps the persisted store to a sane size.
 */
function ordersOnDay(daysBack: number, weekday: number, rand: () => number): number {
  const weekend = weekday === 0 || weekday === 6 ? 1.45 : weekday === 1 ? 0.8 : 1;
  const base = daysBack <= 30 ? 11 : daysBack <= 120 ? 5 : 2;
  const spike = daysBack % 37 === 0 ? 1.8 : 1; // the odd promo day
  return Math.max(1, Math.round(base * weekend * spike * (0.7 + rand() * 0.6)));
}

const PAY = ["เงินสด", "พร้อมเพย์ (QR)"];

function buildDay(daysBack: number): CafeOrder[] {
  const dayStart = SEED_TODAY - daysBack * DAY;
  const weekday = new Date(dayStart).getDay();
  const rand = rng(Math.floor(dayStart / DAY));
  const count = ordersOnDay(daysBack, weekday, rand);
  const rows: CafeOrder[] = [];

  for (let i = 0; i < count; i++) {
    // Spread across opening hours, 08:00–17:00.
    const minutes = Math.floor(8 * 60 + rand() * 9 * 60);
    const at = dayStart + minutes * 60_000;
    if (at > Date.now()) continue; // never stamp an order in the future

    const lines = 1 + (rand() < 0.35 ? 1 : 0) + (rand() < 0.1 ? 1 : 0);
    const items: CafeOrderItem[] = [];
    for (let l = 0; l < lines; l++) {
      const m = pickMenu(rand());
      const qty = rand() < 0.18 ? 2 : 1;
      const summary = m.opts[Math.floor(rand() * m.opts.length)] ?? "";
      items.push({ name: m.name, qty, summary, total: m.price * qty });
    }
    const total = items.reduce((s, it) => s + it.total, 0);

    // Today's last few are still on the counter, so the queue ring has all
    // three colours; everything older has been handed over.
    const isToday = daysBack === 0;
    const live = isToday && i >= count - 3;
    const status: CafeOrder["status"] = !live ? "picked_up" : i === count - 1 ? "preparing" : i === count - 2 ? "preparing" : "ready";

    rows.push({
      orderId: `CAFE-SEED-${daysBack}-${rows.length}`,
      userId: rand() < 0.3 ? "walkin" : "pos-walkin",
      shopName: METAHERB_SHOP,
      status,
      payLabel: PAY[rand() < 0.55 ? 1 : 0],
      receiveLabel: "รับที่หน้าร้าน",
      items,
      total,
      // Queue numbers restart every morning, the way a real counter works —
      // and it keeps the POS's "max + 1" from landing on #1500.
      queueNo: rows.length + 1,
      queueAhead: 0,
      waitMinutes: 5,
      readyAt: at,
      readyAtActual: status === "picked_up" ? at : undefined,
      pickedUpAt: status === "picked_up" ? at + 6 * 60_000 : undefined,
      ratingService: status === "picked_up" && rand() < 0.25 ? 4 + Math.round(rand()) : 0,
      ratingTaste: status === "picked_up" && rand() < 0.25 ? 4 + Math.round(rand()) : 0,
      comment: "",
    });
  }
  return rows;
}

/** ~13 months back, so รายเดือน and รายปี both have something to draw. */
const SPAN_DAYS = 400;

export const CAFE_SALES_SEED: CafeOrder[] = (() => {
  const rows: CafeOrder[] = [];
  for (let d = SPAN_DAYS; d >= 0; d--) rows.push(...buildDay(d));
  return rows;
})();
