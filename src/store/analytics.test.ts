import { beforeEach, describe, expect, it } from "vitest";
import {
  countByStatus,
  countsAsRevenue,
  dailyOrderCount,
  dailySales,
  customerStats,
  heatLevels,
  isSettled,
  lineRevenue,
  monthlyLineRevenue,
  monthRange,
  monthlyOrders,
  monthlySales,
  newVsRepeat,
  ordersIn,
  pctDelta,
  topProducts,
  totals,
  unitsOf,
  yearRange,
} from "./analytics";
import type { Order, OrderStatus } from "./types";

const at = (y: number, m: number, d = 1) => new Date(y, m, d).getTime();

let seq = 0;
const order = (over: Partial<Order> = {}): Order => ({
  id: `ORD-${++seq}`,
  userId: "u-1",
  shopName: "METAHERB Store",
  status: "completed",
  date: "",
  createdAt: at(2026, 1, 10),
  items: [{ productId: "1", name: "น้ำผึ้งมะนาว", option: "", quantity: 2, price: 100 }],
  total: 200,
  recipient: { name: "ณัฐพงษ์", phone: "", address: "" },
  ...over,
});

beforeEach(() => {
  seq = 0;
});

describe("what counts as revenue", () => {
  it("excludes cancelled orders, includes everything else", () => {
    const statuses: OrderStatus[] = ["pending_payment", "pending_verify", "preparing", "shipping", "delivered", "completed"];
    for (const s of statuses) expect(countsAsRevenue(order({ status: s }))).toBe(true);
    expect(countsAsRevenue(order({ status: "cancelled" }))).toBe(false);
  });

  it("treats only delivered and completed orders as payable", () => {
    expect(isSettled(order({ status: "delivered" }))).toBe(true);
    expect(isSettled(order({ status: "completed" }))).toBe(true);
    expect(isSettled(order({ status: "shipping" }))).toBe(false);
  });
});

describe("totals", () => {
  const rows = [
    order({ total: 300, status: "completed" }),
    order({ total: 100, status: "shipping" }),
    order({ total: 999, status: "cancelled" }),
  ];

  it("sums booked revenue and leaves cancellations out of it", () => {
    const t = totals(rows);
    expect(t.sales).toBe(400);
    expect(t.orders).toBe(2);
    expect(t.cancelled).toBe(999);
  });

  it("splits settled from in-flight money", () => {
    const t = totals(rows);
    expect(t.settled).toBe(300);
    expect(t.pending).toBe(100);
    expect(t.settled + t.pending).toBe(t.sales);
  });

  it("computes AOV, and doesn't divide by zero on an empty shop", () => {
    expect(totals(rows).aov).toBe(200);
    expect(totals([]).aov).toBe(0);
    expect(totals([]).sales).toBe(0);
  });

  it("counts units across every line", () => {
    const o = order({
      items: [
        { productId: "1", name: "a", option: "", quantity: 2, price: 10 },
        { productId: "2", name: "b", option: "", quantity: 3, price: 10 },
      ],
    });
    expect(unitsOf(o)).toBe(5);
    expect(totals([o]).units).toBe(5);
  });
});

describe("percent change", () => {
  it("reads naturally", () => {
    expect(pctDelta(120, 100)).toBe(20);
    expect(pctDelta(80, 100)).toBe(-20);
  });

  it("never returns NaN or Infinity when the previous period was empty", () => {
    expect(pctDelta(0, 0)).toBe(0);
    expect(pctDelta(500, 0)).toBe(100);
  });
});

describe("periods", () => {
  it("bounds a month half-open, so the last millisecond isn't double-counted", () => {
    const feb = monthRange(2026, 1);
    expect(ordersIn([order({ createdAt: feb.from })], feb)).toHaveLength(1);
    expect(ordersIn([order({ createdAt: feb.to })], feb)).toHaveLength(0);
  });

  it("buckets sales and orders by month, always twelve entries", () => {
    const rows = [
      order({ createdAt: at(2026, 1, 5), total: 100 }),
      order({ createdAt: at(2026, 1, 20), total: 200 }),
      order({ createdAt: at(2026, 6, 1), total: 50 }),
      order({ createdAt: at(2025, 1, 1), total: 999 }), // wrong year
      order({ createdAt: at(2026, 1, 6), total: 999, status: "cancelled" }),
    ];
    const sales = monthlySales(rows, 2026);
    expect(sales).toHaveLength(12);
    expect(sales[1]).toBe(300); // Feb, cancellation excluded
    expect(sales[6]).toBe(50);
    expect(sales[0]).toBe(0);
    expect(monthlyOrders(rows, 2026)[1]).toBe(2);
  });

});

describe("top products", () => {
  it("ranks by units, breaking ties on revenue", () => {
    const rows = [
      order({ items: [{ productId: "a", name: "A", option: "", quantity: 5, price: 10 }] }),
      order({ items: [{ productId: "b", name: "B", option: "", quantity: 5, price: 50 }] }),
      order({ items: [{ productId: "c", name: "C", option: "", quantity: 9, price: 1 }] }),
    ];
    expect(topProducts(rows).map((p) => p.productId)).toEqual(["c", "b", "a"]);
  });

  it("sums a product across orders and skips cancellations", () => {
    const line = { productId: "a", name: "A", option: "", quantity: 2, price: 100 };
    const rows = [order({ items: [line] }), order({ items: [line] }), order({ status: "cancelled", items: [line] })];
    expect(topProducts(rows)[0]).toMatchObject({ units: 4, sales: 400, orders: 2 });
  });

  it("returns nothing for a shop that has sold nothing", () => {
    expect(topProducts([])).toEqual([]);
  });
});

describe("customers", () => {
  const feb = monthRange(2026, 1);
  const mar = monthRange(2026, 2);

  it("ranks by lifetime spend", () => {
    const rows = [
      order({ userId: "a", total: 100 }),
      order({ userId: "b", total: 300 }),
      order({ userId: "a", total: 100 }),
    ];
    expect(customerStats(rows).map((c) => c.userId)).toEqual(["b", "a"]);
    expect(customerStats(rows)[1]).toMatchObject({ orders: 2, total: 200 });
  });

  it("calls a buyer new only in the month of their first order", () => {
    const rows = [
      order({ userId: "a", createdAt: at(2026, 1, 5) }),
      order({ userId: "a", createdAt: at(2026, 2, 5) }), // same buyer, next month
      order({ userId: "b", createdAt: at(2026, 2, 6) }), // genuinely new in March
    ];
    expect(newVsRepeat(rows, feb)).toEqual({ newCust: 1, repeat: 0 });
    expect(newVsRepeat(rows, mar)).toEqual({ newCust: 1, repeat: 1 });
  });

  it("counts each buyer once however many times they ordered in the range", () => {
    const rows = [
      order({ userId: "a", createdAt: at(2026, 1, 5) }),
      order({ userId: "a", createdAt: at(2026, 1, 6) }),
    ];
    expect(newVsRepeat(rows, feb)).toEqual({ newCust: 1, repeat: 0 });
  });

  it("is empty for a range with no orders", () => {
    expect(newVsRepeat([order({ createdAt: at(2026, 1, 5) })], mar)).toEqual({ newCust: 0, repeat: 0 });
  });
});

describe("status board", () => {
  it("counts every status, including the ones with none", () => {
    const c = countByStatus([order({ status: "preparing" }), order({ status: "preparing" }), order({ status: "cancelled" })]);
    expect(c.preparing).toBe(2);
    expect(c.cancelled).toBe(1);
    expect(c.shipping).toBe(0);
  });
});

describe("a whole year", () => {
  it("covers Jan 1 to Dec 31", () => {
    const y = yearRange(2026);
    expect(ordersIn([order({ createdAt: at(2026, 0, 1) })], y)).toHaveLength(1);
    expect(ordersIn([order({ createdAt: at(2026, 11, 31) })], y)).toHaveLength(1);
    expect(ordersIn([order({ createdAt: at(2027, 0, 1) })], y)).toHaveLength(0);
  });
});

describe("per-day series", () => {
  const rows = [
    order({ createdAt: at(2026, 6, 3), total: 100 }),
    order({ createdAt: at(2026, 6, 3), total: 300 }),
    order({ createdAt: at(2026, 6, 9), total: 200 }),
    order({ createdAt: at(2026, 6, 9), total: 999, status: "cancelled" }),
    order({ createdAt: at(2026, 5, 9), total: 999 }), // previous month
  ];

  it("buckets by day of the selected month, 1-indexed", () => {
    const d = dailySales(rows, 2026, 6);
    expect(d[3]).toBe(400);
    expect(d[9]).toBe(200); // cancellation excluded
    expect(d[1]).toBe(0);
    expect(dailyOrderCount(rows, 2026, 6)[3]).toBe(2);
  });

  it("scales the heatmap against the month's own best day", () => {
    const levels = heatLevels(dailySales(rows, 2026, 6));
    expect(levels[3]).toBe(5); // the peak
    expect(levels[9]).toBe(3); // 200/400 → ceil(2.5)
    expect(levels[1]).toBe(0); // no sales at all
  });

  it("gives a month with no sales no heat at all, rather than dividing by zero", () => {
    expect(heatLevels(dailySales([], 2026, 6)).every((l) => l === 0)).toBe(true);
  });

  it("never renders a day with sales as level 0", () => {
    const levels = heatLevels([0, 1, 1000]);
    expect(levels[1]).toBe(1);
    expect(levels[2]).toBe(5);
  });
});

describe("goods revenue vs paid revenue", () => {
  // A real checkout adds shipping and subtracts a coupon, so `total` is not the
  // sum of the lines. Both numbers are correct; they answer different questions.
  const withShipping = order({
    items: [{ productId: "1", name: "a", option: "", quantity: 2, price: 100 }],
    total: 235, // 200 goods + 50 shipping − 15 coupon
  });

  it("keeps them apart", () => {
    expect(lineRevenue(withShipping)).toBe(200);
    expect(totals([withShipping]).sales).toBe(235);
  });

  it("uses goods-only for the sales card's series, so it matches the breakdown sheet", () => {
    const rows = [order({ ...withShipping, createdAt: at(2026, 6, 3) })];
    expect(monthlyLineRevenue(rows, 2026)[6]).toBe(200);
    expect(monthlySales(rows, 2026)[6]).toBe(235);
  });

  it("excludes cancellations from both", () => {
    const c = order({ ...withShipping, status: "cancelled" });
    expect(monthlyLineRevenue([c], 2026).every((v) => v === 0)).toBe(true);
    expect(totals([c]).sales).toBe(0);
  });

  it("bases the heatmap on goods revenue, like the card above it", () => {
    const rows = [order({ ...withShipping, createdAt: at(2026, 6, 3) })];
    expect(dailySales(rows, 2026, 6)[3]).toBe(200);
  });
});
