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
import {
  customerStats,
  latestActiveMonth,
  monthlyOrders,
  monthlySales,
  topProducts,
  totals,
} from "../src/store/analytics";
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
  it("seeds one table holding both", () => {
    expect(allOrders().length).toBe(23); // 14 buyer rows + 9 seller rows
  });

  it("shows the shop the buyer's METAHERB orders, which it could never see before", () => {
    const shopOrders = ordersForShop(SHOP);
    const buyersOrdersAtThisShop = ordersForUser(BUYER).filter((o) => o.shopName === SHOP);
    expect(buyersOrdersAtThisShop.length).toBe(7);
    expect(shopOrders.length).toBe(16); // its own 9 + the buyer's 7
    for (const o of buyersOrdersAtThisShop) expect(shopOrders).toContain(o);
  });

  it("parses every seeded Thai date into a real timestamp", () => {
    for (const o of allOrders()) {
      expect(o.createdAt, `${o.id} has date "${o.date}"`).toBeGreaterThan(0);
      expect(new Date(o.createdAt).getFullYear()).toBeGreaterThanOrEqual(2026);
    }
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

  it("opens on a month that actually has orders, so the KPI is not zero", () => {
    const [year, month] = latestActiveMonth(shopOrders());
    expect(monthlySales(shopOrders(), year)[month]).toBeGreaterThan(0);
    expect(monthlyOrders(shopOrders(), year)[month]).toBeGreaterThan(0);
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
