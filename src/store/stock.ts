/**
 * Inventory. Previously nothing decremented stock on purchase — a product could
 * be bought forever. Orders now reserve stock at checkout and release it on
 * cancellation.
 *
 * Keyed by catalog product id ("1".."45"). Seeded from data/catalog.ts SHOP_STOCK
 * on the app side; tests seed their own numbers.
 */
import { createStore } from "./db";
import { emit } from "./events";

export const LOW_STOCK_THRESHOLD = 10;

export type StockTable = Record<string, number>;

export const stockStore = createStore<StockTable>({}, { persistKey: "mh.stock" });

export function seedStock(table: StockTable): void {
  stockStore.reset({ ...table });
}

export function stockOf(productId: string): number {
  return stockStore.get()[productId] ?? 0;
}

/** Products absent from the table are unlimited (catalog items the shop doesn't own). */
function tracked(productId: string): boolean {
  return productId in stockStore.get();
}

export type StockLine = { productId: string; quantity: number };

/** True when every tracked line has enough on hand. */
export function canFulfill(lines: StockLine[]): boolean {
  const table = stockStore.get();
  return lines.every((l) => !(l.productId in table) || table[l.productId] >= l.quantity);
}

/** The lines that would overdraw — surfaced to the buyer before charging them. */
export function shortfall(lines: StockLine[]): StockLine[] {
  const table = stockStore.get();
  return lines.filter((l) => l.productId in table && table[l.productId] < l.quantity);
}

/**
 * Take stock for an order. Returns false and changes nothing when any tracked
 * line is short — callers must not create the order in that case.
 */
export function reserveStock(lines: StockLine[], ctx: { shopName?: string } = {}): boolean {
  if (!canFulfill(lines)) return false;
  const next = { ...stockStore.get() };
  const dropped: string[] = [];
  for (const l of lines) {
    if (!tracked(l.productId)) continue;
    next[l.productId] -= l.quantity;
    if (next[l.productId] <= LOW_STOCK_THRESHOLD) dropped.push(l.productId);
  }
  stockStore.set(next);
  for (const productId of dropped) {
    emit({
      type: "stock_low",
      audience: ["shop"],
      shopName: ctx.shopName,
      productId,
      title: "สินค้าใกล้หมด",
      body: `เหลือ ${next[productId]} ชิ้น — ควรเติมสต็อก`,
    });
  }
  return true;
}

/** Put stock back (order cancelled). */
export function releaseStock(lines: StockLine[]): void {
  const next = { ...stockStore.get() };
  for (const l of lines) {
    if (!tracked(l.productId)) continue;
    next[l.productId] += l.quantity;
  }
  stockStore.set(next);
}

export function setStock(productId: string, quantity: number): void {
  stockStore.set({ ...stockStore.get(), [productId]: Math.max(0, quantity) });
}

/** Test helper. */
export function __resetStock(): void {
  stockStore.reset({});
}
