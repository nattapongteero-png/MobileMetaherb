/**
 * Sales analytics derived from the orders table.
 *
 * Every report in the console was mock: `MONTHLY_SALES_DATA` was twelve
 * hardcoded numbers, and `groupedSales()` synthesised line items from a bucket
 * index. Selling something changed nothing on any chart.
 *
 * What this module does NOT do is invent the things an order cannot tell us —
 * page visits, conversion rate, cost of goods. Those stay mock, and the screens
 * that show them say so. Revenue, order counts, units, AOV, top products and
 * new-vs-repeat customers all come from real rows.
 *
 * Pure TS.
 */
import { ordersForShop } from "./orders";
import type { Order, OrderStatus } from "./types";

/** A cancelled order is not revenue; everything else is (it has been committed to). */
export const countsAsRevenue = (o: Order): boolean => o.status !== "cancelled";

/** Money the shop can actually be paid for: the buyer has it, or has confirmed it. */
export const isSettled = (o: Order): boolean => o.status === "delivered" || o.status === "completed";

/** Awaiting fulfilment — revenue booked but not yet payable. */
export const isPending = (o: Order): boolean =>
  o.status === "pending_payment" || o.status === "pending_verify" || o.status === "preparing" || o.status === "shipping";

export const unitsOf = (o: Order): number => o.items.reduce((s, it) => s + it.quantity, 0);

/**
 * Two different, both-correct notions of "sales":
 *
 *   order.total   what the buyer paid — includes shipping and VAT, net of coupons.
 *                 This is revenue, and what a payout draws on.
 *   lineRevenue   the goods only (unit price × quantity), summed over the lines.
 *
 * They coincide for the seeded orders (no shipping), and diverge the moment a
 * real checkout adds a carrier fee. The dashboard's sales card sits directly
 * above a per-product breakdown sheet, so it uses lineRevenue — otherwise the
 * card and the sheet it opens would show different numbers.
 */
export const lineRevenue = (o: Order): number => o.items.reduce((s, it) => s + it.price * it.quantity, 0);

// ── periods ────────────────────────────────────────────────────
export type Range = { from: number; to: number };

/** Orders in [from, to). */
export function ordersIn(orders: Order[], range: Range): Order[] {
  return orders.filter((o) => o.createdAt >= range.from && o.createdAt < range.to);
}

export function monthRange(year: number, monthIndex: number): Range {
  return { from: new Date(year, monthIndex, 1).getTime(), to: new Date(year, monthIndex + 1, 1).getTime() };
}

export function yearRange(year: number): Range {
  return { from: new Date(year, 0, 1).getTime(), to: new Date(year + 1, 0, 1).getTime() };
}

// ── headline numbers ───────────────────────────────────────────
export type Totals = {
  /** ฿ booked, cancellations excluded. */
  sales: number;
  orders: number;
  units: number;
  /** Average order value; 0 when there are no orders. */
  aov: number;
  /** ฿ from delivered/completed orders — what a payout can draw on. */
  settled: number;
  /** ฿ from orders still in flight. */
  pending: number;
  cancelled: number;
};

export function totals(orders: Order[]): Totals {
  const live = orders.filter(countsAsRevenue);
  const sales = live.reduce((s, o) => s + o.total, 0);
  return {
    sales,
    orders: live.length,
    units: live.reduce((s, o) => s + unitsOf(o), 0),
    aov: live.length ? Math.round(sales / live.length) : 0,
    settled: orders.filter(isSettled).reduce((s, o) => s + o.total, 0),
    pending: orders.filter(isPending).reduce((s, o) => s + o.total, 0),
    cancelled: orders.filter((o) => o.status === "cancelled").reduce((s, o) => s + o.total, 0),
  };
}

/** Percent change, guarding the divide-by-zero that would render as NaN%. */
export function pctDelta(now: number, prev: number): number {
  if (prev === 0) return now === 0 ? 0 : 100;
  return Math.round(((now - prev) / prev) * 100);
}

// ── series ─────────────────────────────────────────────────────
/** Sales per month of a given year, index 0 = January. Always 12 entries. */
export function monthlySales(orders: Order[], year: number): number[] {
  const out = new Array(12).fill(0);
  for (const o of orders) {
    if (!countsAsRevenue(o)) continue;
    const d = new Date(o.createdAt);
    if (d.getFullYear() === year) out[d.getMonth()] += o.total;
  }
  return out;
}

/** Goods-only revenue per month. Matches what the breakdown sheet lists. */
export function monthlyLineRevenue(orders: Order[], year: number): number[] {
  const out = new Array(12).fill(0);
  for (const o of orders) {
    if (!countsAsRevenue(o)) continue;
    const d = new Date(o.createdAt);
    if (d.getFullYear() === year) out[d.getMonth()] += lineRevenue(o);
  }
  return out;
}

export function monthlyOrders(orders: Order[], year: number): number[] {
  const out = new Array(12).fill(0);
  for (const o of orders) {
    if (!countsAsRevenue(o)) continue;
    const d = new Date(o.createdAt);
    if (d.getFullYear() === year) out[d.getMonth()] += 1;
  }
  return out;
}

// ── products ───────────────────────────────────────────────────
export type ProductStat = {
  productId: string;
  name: string;
  units: number;
  /** ฿ from this product's lines (unit price × quantity), before order-level discounts. */
  sales: number;
  orders: number;
};

/** Best sellers, by units then revenue. */
export function topProducts(orders: Order[], limit = 5): ProductStat[] {
  const by = new Map<string, ProductStat>();
  for (const o of orders) {
    if (!countsAsRevenue(o)) continue;
    for (const it of o.items) {
      const cur = by.get(it.productId) ?? { productId: it.productId, name: it.name, units: 0, sales: 0, orders: 0 };
      cur.units += it.quantity;
      cur.sales += it.price * it.quantity;
      cur.orders += 1;
      by.set(it.productId, cur);
    }
  }
  return [...by.values()].sort((a, b) => b.units - a.units || b.sales - a.sales).slice(0, limit);
}

/** Goods-only revenue per day of a month, index 1 = the 1st. Index 0 is unused. */
export function dailySales(orders: Order[], year: number, monthIndex: number): number[] {
  const out = new Array(32).fill(0);
  for (const o of orders) {
    if (!countsAsRevenue(o)) continue;
    const d = new Date(o.createdAt);
    if (d.getFullYear() === year && d.getMonth() === monthIndex) out[d.getDate()] += lineRevenue(o);
  }
  return out;
}

export function dailyOrderCount(orders: Order[], year: number, monthIndex: number): number[] {
  const out = new Array(32).fill(0);
  for (const o of orders) {
    if (!countsAsRevenue(o)) continue;
    const d = new Date(o.createdAt);
    if (d.getFullYear() === year && d.getMonth() === monthIndex) out[d.getDate()] += 1;
  }
  return out;
}

/**
 * Heat level 1 (low) … 5 (high) per day, or 0 for a day with no sales.
 * Scaled against the month's own best day, so a quiet month is still readable.
 */
export function heatLevels(daily: number[]): number[] {
  const peak = Math.max(...daily);
  return daily.map((v) => (v <= 0 || peak <= 0 ? 0 : Math.max(1, Math.ceil((v / peak) * 5))));
}

// ── customers ──────────────────────────────────────────────────
export type CustomerStat = { userId: string; name: string; orders: number; total: number; firstAt: number };

export function customerStats(orders: Order[]): CustomerStat[] {
  const by = new Map<string, CustomerStat>();
  for (const o of orders) {
    if (!countsAsRevenue(o)) continue;
    const cur = by.get(o.userId) ?? {
      userId: o.userId,
      name: o.recipient.name,
      orders: 0,
      total: 0,
      firstAt: o.createdAt,
    };
    cur.orders += 1;
    cur.total += o.total;
    cur.firstAt = Math.min(cur.firstAt, o.createdAt);
    by.set(o.userId, cur);
  }
  return [...by.values()].sort((a, b) => b.total - a.total);
}

/**
 * Buyers whose FIRST order with this shop falls inside the range, versus those
 * who had already bought before it. Counted against the shop's whole history,
 * not just the range — otherwise every buyer looks new in the first month shown.
 */
export function newVsRepeat(all: Order[], range: Range): { newCust: number; repeat: number } {
  const firstOrderAt = new Map<string, number>();
  for (const o of all) {
    if (!countsAsRevenue(o)) continue;
    const cur = firstOrderAt.get(o.userId);
    if (cur == null || o.createdAt < cur) firstOrderAt.set(o.userId, o.createdAt);
  }

  const buyersInRange = new Set(ordersIn(all.filter(countsAsRevenue), range).map((o) => o.userId));
  let newCust = 0;
  let repeat = 0;
  for (const userId of buyersInRange) {
    const first = firstOrderAt.get(userId)!;
    if (first >= range.from && first < range.to) newCust += 1;
    else repeat += 1;
  }
  return { newCust, repeat };
}

// ── order status board ─────────────────────────────────────────
export function countByStatus(orders: Order[]): Record<OrderStatus, number> {
  const out: Record<OrderStatus, number> = {
    pending_payment: 0,
    pending_verify: 0,
    preparing: 0,
    shipping: 0,
    delivered: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const o of orders) out[o.status] += 1;
  return out;
}

// ── shop-scoped convenience ────────────────────────────────────
export const shopTotals = (shopName: string, range?: Range): Totals =>
  totals(range ? ordersIn(ordersForShop(shopName), range) : ordersForShop(shopName));
