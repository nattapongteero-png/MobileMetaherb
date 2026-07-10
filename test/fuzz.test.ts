/**
 * Property-based fuzz: instead of hand-picked examples, thousands of random
 * inputs — asserting the rules that must hold for EVERY input. Seeded PRNG
 * (mulberry32), so a failure reproduces exactly.
 */
import { describe, expect, it } from "vitest";
import { detectIntent, extractBudget, extractCautions, extractGoals, type HealthGoal } from "../src/data/aiEngine";
import { pricingFor, type FlashEntry, type Promotion } from "../src/store/promotions";
import {
  __resetOrders, cancelOrder, createOrder, decideCancellation, markDelivered,
  markPaid, ordersStore, requestCancellation, shipOrder, verifyPayment,
} from "../src/store/orders";
import { __resetStock, seedStock, stockOf } from "../src/store/stock";
import { __resetEvents } from "../src/store/events";
import { __resetCoupons, addCoupon, collectCoupon, couponById, redeemCoupon, seedCoupons, walletIds, type Coupon } from "../src/store/coupons";
import { totals, monthlySales, topProducts, customerStats } from "../src/store/analytics";
import type { Order } from "../src/store/types";

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
const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

const GOALS: HealthGoal[] = ["sleep","weight_loss","weight_gain","skin","hair","brain","energy","immune","digestion","joint","pressure","diabetes","senior","kids","stress"];

// ── text extractors survive anything ───────────────────────────
describe("extractors never crash, whatever the customer types", () => {
  const POOL = [
    "นอนไม่หลับ", "กาแฟ", "ผม", "ท้อง", "ครับ", "ค่ะ", "๑๒๓", "ฯลฯ",
    "sleep", "coffee", "💊", "😴", "🤰", "ๆๆๆ",
    "<script>alert(1)</script>", "'; DROP TABLE orders;--", "{{template}}",
    "ลูก", "ขวบ", "ยา", "เบาหวาน", "100", "บาท",
  ];

  it("10,000 random strings through all four extractors", () => {
    const r = rng(42);
    for (let i = 0; i < 10_000; i++) {
      const parts = Array.from({ length: int(r, 0, 12) }, () => pick(r, POOL));
      const text = parts.join(pick(r, ["", " ", "  "]));

      const goals = extractGoals(text);
      expect(Array.isArray(goals)).toBe(true);
      for (const g of goals) expect(GOALS).toContain(g);

      const cautions = extractCautions(text);
      for (const c of cautions) expect(typeof c).toBe("string");

      const budget = extractBudget(text);
      if (budget !== undefined) {
        expect(budget).toBeGreaterThanOrEqual(50);
        expect(budget).toBeLessThanOrEqual(100000);
      }

      expect(typeof detectIntent(text)).toBe("string");
    }
  });

  it("survives a 100k-character message", () => {
    expect(() => extractGoals("นอนไม่หลับ".repeat(10_000))).not.toThrow();
  });
});

// ── pricing invariants ─────────────────────────────────────────
describe("pricing never produces a nonsense price", () => {
  const NOW = 1_700_000_000_000;
  const DAY = 86_400_000;

  it("2,000 random promotion sets", () => {
    const r = rng(7);
    for (let i = 0; i < 2_000; i++) {
      const base = int(r, 1, 5000);
      const promos: Promotion[] = Array.from({ length: int(r, 0, 3) }, (_, k) => ({
        id: `p${k}`,
        name: "fuzz",
        discountType: pick(r, ["percent", "baht"] as const),
        discountValue: int(r, 0, 6000),
        maxDiscount: r() < 0.5 ? int(r, 0, 500) : undefined,
        startsAt: new Date(NOW + int(r, -30, 5) * DAY).toISOString(),
        endsAt: new Date(NOW + int(r, -5, 30) * DAY).toISOString(),
        enabled: r() < 0.8,
        scope: pick(r, ["all", "products"] as const),
        products: [{ productId: "1", limit: "unlimited" }],
      }));
      const flash: FlashEntry[] = r() < 0.4
        ? [{ productId: "1", flashPrice: int(r, 0, 6000), total: int(r, 1, 100), sold: int(r, 0, 120),
             startsAt: new Date(NOW - DAY).toISOString(), endsAt: new Date(NOW + DAY).toISOString() }]
        : [];

      const res = pricingFor("1", base, { promotions: promos, flash }, NOW);
      if (res) {
        expect(Number.isFinite(res.price), `price NaN at i=${i}`).toBe(true);
        expect(res.price).toBeGreaterThanOrEqual(0);
        expect(res.price).toBeLessThan(base + 1);
        expect(res.originalPrice).toBe(base);
        expect(res.discountPercent).toBeGreaterThanOrEqual(0);
        expect(res.discountPercent).toBeLessThanOrEqual(100);
      }
    }
  });
});

// ── the order machine under random abuse ───────────────────────
describe("random operation storms keep the books straight", () => {
  const RECIPIENT = { name: "f", phone: "0", address: "a" };
  const SEED_STOCK = 500;

  it("40 storms × 30 ops: stock is conserved and never negative", () => {
    for (let round = 0; round < 40; round++) {
      __resetOrders(); __resetStock(); __resetEvents();
      seedStock({ "1": SEED_STOCK });
      const r = rng(round + 1);
      const ids: string[] = [];

      for (let op = 0; op < 30; op++) {
        const dice = r();
        if (dice < 0.35 || ids.length === 0) {
          const res = createOrder({
            userId: `u-${int(r, 1, 3)}`, shopName: "METAHERB Store",
            items: [{ productId: "1", name: "x", option: "", quantity: int(r, 1, 4), price: 100 }],
            recipient: RECIPIENT,
          });
          if (res.ok) ids.push(res.order.id);
        } else {
          const id = pick(r, ids);
          const act = int(r, 0, 6);
          if (act === 0) markPaid(id);
          else if (act === 1) verifyPayment(id);
          else if (act === 2) shipOrder(id, "TH-f");
          else if (act === 3) markDelivered(id);
          else if (act === 4) cancelOrder(id, { by: pick(r, ["shop", "customer"] as const) });
          else if (act === 5) requestCancellation(id, "fuzz");
          else decideCancellation(id, r() < 0.5);
        }

        // Invariants, after EVERY op:
        const stock = stockOf("1");
        expect(stock, `round ${round} op ${op}: stock negative`).toBeGreaterThanOrEqual(0);
        const live = ordersStore.get().filter((o) => o.status !== "cancelled");
        const held = live.reduce((s, o) => s + o.items.reduce((t, it) => t + it.quantity, 0), 0);
        expect(stock + held, `round ${round} op ${op}: stock not conserved`).toBe(SEED_STOCK);
      }
    }
  });
});

// ── coupons under random abuse ─────────────────────────────────
describe("coupon counters stay truthful", () => {
  it("30 storms: used == number of redeems, wallets never duplicate", () => {
    for (let round = 0; round < 30; round++) {
      __resetCoupons();
      seedCoupons([]);
      const r = rng(round + 99);
      const c: Coupon = {
        id: "c1", code: "FZ", name: "fuzz", discountType: "baht", discountValue: 10,
        startsAt: new Date(0).toISOString(), endsAt: new Date(9999999999999).toISOString(),
        used: 0, status: "active",
      };
      addCoupon(c);
      let redeems = 0;
      for (let op = 0; op < 40; op++) {
        const user = `u-${int(r, 1, 3)}`;
        if (r() < 0.5) collectCoupon(user, "c1");
        else { redeemCoupon(user, "c1"); redeems++; }
        expect(couponById("c1")!.used).toBe(redeems);
        const w = walletIds(user);
        expect(new Set(w).size).toBe(w.length);
      }
    }
  });
});

// ── analytics scale ────────────────────────────────────────────
describe("analytics stays fast and finite at scale", () => {
  it("10,000 orders: totals/series/top-products under 300 ms, no NaN", () => {
    const r = rng(2024);
    const orders: Order[] = Array.from({ length: 10_000 }, (_, i) => ({
      id: `F-${i}`, userId: `u-${int(r, 1, 200)}`, shopName: "METAHERB Store",
      status: pick(r, ["completed", "delivered", "shipping", "cancelled"] as const),
      date: "", createdAt: new Date(2026, int(r, 0, 11), int(r, 1, 28)).getTime(),
      items: [{ productId: String(int(r, 1, 45)), name: `p${int(r, 1, 45)}`, option: "", quantity: int(r, 1, 5), price: int(r, 10, 900) }],
      total: 0, recipient: { name: `n${i}`, phone: "", address: "" },
    })).map((o) => ({ ...o, total: o.items.reduce((s, it) => s + it.price * it.quantity, 0) }));

    const t0 = performance.now();
    const t = totals(orders);
    const series = monthlySales(orders, 2026);
    const top = topProducts(orders, 10);
    const buyers = customerStats(orders);
    const ms = performance.now() - t0;

    expect(ms, `analytics took ${ms.toFixed(0)}ms`).toBeLessThan(300);
    expect(Number.isFinite(t.sales) && Number.isFinite(t.aov)).toBe(true);
    expect(series.every(Number.isFinite)).toBe(true);
    expect(top.length).toBeGreaterThan(0);
    expect(buyers.length).toBeGreaterThan(0);
  });
});
