/**
 * Boot integration: import the real seed files exactly as App.tsx does, and
 * assert the claims the unit tests can't reach — that the two order arrays
 * really merged, that the demo buyer's coupons really landed in their wallet,
 * and that the promotion seed really reproduces the storefront's prices.
 */
import { describe, expect, it } from "vitest";

// The side-effectful module App.tsx imports. Seeds run at import time.
import "../src/store";

import { ordersForShop, ordersForUser, allOrders } from "../src/store/orders";
import { customerStats, monthlyOrders, monthlySales, topProducts, totals } from "../src/store/analytics";
import { HISTORY_CUTOFF_DAYS, HISTORY_ORDERS, HISTORY_START, buildOrderHistory } from "../src/data/orderHistorySeed";
import { canFulfill, stockOf } from "../src/store/stock";
import { walletCoupons, couponsForShop } from "../src/store/coupons";
import { pricingFor, promotionsStore } from "../src/store/promotions";
import { allComplaints, complaintsForUser } from "../src/store/complaints";
import { registrationsForUser } from "../src/store/trials";
import { cafeHistory, cafeQueue } from "../src/store/cafe";
import { threadsForShop, threadsForUser } from "../src/store/chat";
import { eventsStore } from "../src/store/events";
import { addresses, selectedAddress, wishlistIds } from "../src/store/prefs";
import { allQuotes } from "../src/store/quotes";
import { DEMO_USER } from "../src/store/session";

const SHOP = "METAHERB Store";
const BUYER = DEMO_USER.id;

describe("orders: the buyer's and the seller's arrays really merged", () => {
  it("seeds one table holding the hand-authored rows and the back-filled history", () => {
    // 14 buyer + 9 seller hand-authored, plus ~19 months of history. The exact
    // count moves with the calendar, so assert the shape, not a magic number.
    expect(allOrders().length).toBeGreaterThan(200);
    expect(HISTORY_ORDERS.length).toBe(allOrders().length - 23);
  });

  it("shows the shop the buyer's METAHERB orders, which it could never see before", () => {
    const shopOrders = ordersForShop(SHOP);
    const buyersOrdersAtThisShop = ordersForUser(BUYER).filter((o) => o.shopName === SHOP);
    expect(buyersOrdersAtThisShop.length).toBe(7);
    for (const o of buyersOrdersAtThisShop) expect(shopOrders).toContain(o);
  });

  it("keeps the back-filled history out of the demo buyer's own order list", () => {
    // The buyer's 14 rows are hand-authored; the history belongs to other people.
    expect(ordersForUser(BUYER)).toHaveLength(14);
    expect(HISTORY_ORDERS.every((o) => o.userId !== BUYER)).toBe(true);
  });

  it("never lets the back-fill collide with the hand-authored window", () => {
    const cutoff = Date.now() - HISTORY_CUTOFF_DAYS * 86_400_000;
    for (const o of HISTORY_ORDERS) expect(o.createdAt, o.id).toBeLessThan(cutoff);
  });

  it("mints a unique id for every order", () => {
    const ids = allOrders().map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stamps every seeded order in the past, never the future", () => {
    const now = Date.now();
    const start = new Date(HISTORY_START.year, HISTORY_START.month, 1).getTime();
    for (const o of allOrders()) {
      expect(o.createdAt, o.id).toBeGreaterThanOrEqual(start);
      expect(o.createdAt, o.id).toBeLessThanOrEqual(now);
    }
  });

  it("covers every month from มกราคม 2568 to the current one, with no gaps", () => {
    const shop = ordersForShop(SHOP);
    const now = new Date();
    const cursor = new Date(HISTORY_START.year, HISTORY_START.month, 1);
    while (cursor <= now) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const revenue = monthlySales(shop, y)[m];
      expect(revenue, `${y}-${m + 1} has no sales`).toBeGreaterThan(0);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  });

  it("is deterministic — the same clock rebuilds the same history", () => {
    const at = new Date(2026, 6, 10, 12, 0).getTime();
    const a = buildOrderHistory(at);
    const b = buildOrderHistory(at);
    expect(a.map((o) => `${o.id}:${o.total}`)).toEqual(b.map((o) => `${o.id}:${o.total}`));
  });

  it("sorts the whole table newest-first", () => {
    const stamps = allOrders().map((o) => o.createdAt);
    expect([...stamps].sort((a, b) => b - a)).toEqual(stamps);
  });

  it("gives every order line a resolvable product id and a positive total", () => {
    for (const o of allOrders()) {
      expect(o.items.length).toBeGreaterThan(0);
      for (const it of o.items) expect(it.productId).toBeTruthy();
      expect(o.total).toBe(o.items.reduce((s, it) => s + it.price * it.quantity, 0));
    }
  });
});

describe("stock", () => {
  it("seeds the shop's tracked products", () => {
    expect(stockOf("1")).toBe(500);
    expect(stockOf("45")).toBe(150);
  });

  it("leaves other shops' products untracked, which means unlimited, not zero", () => {
    // stockOf reports 0 for an untracked id, but the fulfilment check must not
    // treat that as out of stock — only METAHERB's own products carry stock.
    expect(stockOf("37")).toBe(0);
    expect(canFulfill([{ productId: "37", quantity: 9999 }])).toBe(true);
    expect(canFulfill([{ productId: "1", quantity: 9999 }])).toBe(false);
  });
});

describe("coupons", () => {
  it("puts the demo buyer's collected coupons in their wallet", () => {
    const codes = walletCoupons(BUYER).map((c) => c.code).sort();
    expect(codes).toEqual(["BANHERB20", "FREESHIP01", "FREESHIP07", "FREESHIP100", "MH27PCT", "MH30OFF"]);
  });

  it("gives the console this shop's coupons plus the platform-wide ones", () => {
    const forShop = couponsForShop(SHOP);
    expect(forShop.some((c) => c.code === "WELCOME10")).toBe(true); // shop-scoped
    expect(forShop.some((c) => c.code === "MH30OFF")).toBe(true); // platform-wide
    expect(forShop.some((c) => c.code === "BANHERB20")).toBe(false); // another shop's
  });
});

describe("promotions reproduce the storefront's shipped prices", () => {
  it("id 23 — ฿120 → ฿85 (-29%)", () => {
    expect(pricingFor("23", 120, promotionsStore.get())).toMatchObject({ price: 85, discountPercent: 29 });
  });

  it("id 45 — ฿169 → ฿149 (-12%)", () => {
    expect(pricingFor("45", 169, promotionsStore.get())).toMatchObject({ price: 149, discountPercent: 12 });
  });

  it("ships the shop-wide 10% promo off, so nothing else is silently marked down", () => {
    expect(pricingFor("36", 200, promotionsStore.get())).toBeUndefined();
  });

  it("keeps a flash entry for each catalog flash product, priced at its sale price", () => {
    const flash = promotionsStore.get().flash;
    expect(flash.length).toBeGreaterThan(0);
    for (const f of flash) {
      expect(f.flashPrice).toBeGreaterThan(0);
      expect(f.total).toBeGreaterThan(0);
      expect(f.sold).toBeLessThanOrEqual(f.total);
    }
  });
});

describe("the console's dashboard shows real numbers on first open", () => {
  const shopOrders = () => ordersForShop(SHOP);

  it("has sales in the CURRENT month — the dashboard opens on today", () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    expect(monthlySales(shopOrders(), y)[m]).toBeGreaterThan(0);
    expect(monthlyOrders(shopOrders(), y)[m]).toBeGreaterThan(0);
  });

  it("has sales in the PREVIOUS month too, so the month-on-month delta is meaningful", () => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    expect(monthlySales(shopOrders(), prev.getFullYear())[prev.getMonth()]).toBeGreaterThan(0);
  });

  it("stamps today's newest order in the current month, not in a fixed 2569", () => {
    const newest = shopOrders().reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
    const d = new Date(newest.createdAt);
    const now = new Date();
    expect(d.getFullYear()).toBe(now.getFullYear());
    expect(d.getMonth()).toBe(now.getMonth());
  });

  it("gives every order an id whose date matches its own timestamp", () => {
    for (const o of allOrders()) {
      const d = new Date(o.createdAt);
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      expect(o.id, `${o.id} vs ${o.date}`).toContain(ymd);
    }
  });

  it("reports revenue equal to the sum of the shop's non-cancelled orders", () => {
    const t = totals(shopOrders());
    const expected = shopOrders()
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + o.total, 0);
    expect(t.sales).toBe(expected);
    expect(t.settled + t.pending).toBe(t.sales);
  });

  it("ranks best sellers from real order lines", () => {
    const top = topProducts(shopOrders(), 5);
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].units).toBeGreaterThan(0);
    // Sorted by units, descending.
    expect(top.map((p) => p.units)).toEqual([...top.map((p) => p.units)].sort((a, b) => b - a));
  });

  it("counts more than one buyer — the shop's seeded customers plus the demo one", () => {
    const buyers = customerStats(shopOrders());
    expect(buyers.length).toBeGreaterThan(1);
    expect(buyers.some((b) => b.userId === BUYER)).toBe(true);
  });
});

describe("the other tables seed", () => {
  it("gives the console its complaints and the buyer exactly one of their own", () => {
    expect(allComplaints().length).toBe(20);
    expect(complaintsForUser(BUYER).length).toBe(1);
  });

  it("seeds the buyer's trial registrations with full answers on the completed ones", () => {
    const regs = registrationsForUser(BUYER);
    expect(regs.length).toBe(9);
    const done = regs.filter((r) => r.stage === "completed");
    expect(done.length).toBe(2);
    for (const r of done) expect(r.postAnswers!.scoreById["core_overall"]).toBeGreaterThan(0);
  });

  it("seeds café history as picked-up orders, leaving the barista queue empty", () => {
    expect(cafeHistory(BUYER).length).toBe(3);
    expect(cafeQueue(SHOP).length).toBe(0);
  });

  it("seeds three chat threads, one of them staffed by the shop", () => {
    expect(threadsForUser(BUYER).length).toBe(3);
    expect(threadsForShop(SHOP).map((t) => t.id)).toEqual(["metaherb"]);
  });

  it("starts with an empty event log — seeding is not an event", () => {
    expect(eventsStore.get()).toHaveLength(0);
  });

  it("seeds the buyer's wishlist and a selected delivery address", () => {
    expect(wishlistIds().length).toBe(8);
    expect(addresses().length).toBeGreaterThan(0);
    // The selection must point at a real row, or checkout reads undefined.
    const sel = selectedAddress()!;
    expect(addresses().map((a) => a.id)).toContain(sel.id);
  });

  it("seeds no quotes — a purchase order can only exist once one is accepted", () => {
    expect(allQuotes()).toHaveLength(0);
  });
});
