/**
 * META Caffe orders — one queue, seen by the customer and the barista.
 *
 * The café was a customer-only island: CafeCartContext held the orders in
 * component state, nothing persisted them, and MyShopScreen had no café surface
 * at all (a grep for "cafe" across the 305 KB console returned nothing). A
 * barista could not see a single order.
 *
 * Pure TS. Line items are text-only, so the whole record is JSON-safe.
 */
import { createStore } from "./db";
import { emit, eventsStore } from "./events";

export type CafeOrderStatus = "preparing" | "ready" | "picked_up";

export type CafeOrderItem = { name: string; qty: number; summary: string; total: number };

export type CafeOrder = {
  orderId: string;
  userId: string;
  shopName: string;
  status: CafeOrderStatus;
  payLabel: string;
  receiveLabel: string;
  items: CafeOrderItem[];
  total: number;
  /** Running queue number (e.g. #23). */
  queueNo: number;
  queueAhead: number;
  waitMinutes: number;
  /** Estimated ready time, epoch ms. */
  readyAt: number;
  /** Set when the barista (or the timer) marks it ready. */
  readyAtActual?: number;
  pickedUpAt?: number;
  // Review — 0 means unrated.
  ratingService: number;
  ratingTaste: number;
  comment: string;
};

export const cafeStore = createStore<CafeOrder[]>([], { persistKey: "mh.cafe" });

export function seedCafeOrders(rows: CafeOrder[]): void {
  cafeStore.reset(rows);
}

// ── reads ──────────────────────────────────────────────────────
export const cafeOrderById = (orderId: string): CafeOrder | undefined =>
  cafeStore.get().find((o) => o.orderId === orderId);

/** The customer's orders still in the shop: being made or waiting at the counter. */
export const activeCafeOrders = (userId: string): CafeOrder[] =>
  cafeStore.get().filter((o) => o.userId === userId && o.status !== "picked_up");

/** Picked up, newest first — the history screen. */
export const cafeHistory = (userId: string): CafeOrder[] =>
  cafeStore.get()
    .filter((o) => o.userId === userId && o.status === "picked_up")
    .sort((a, b) => (b.pickedUpAt ?? b.readyAt) - (a.pickedUpAt ?? a.readyAt));

/** The barista's queue: everything not yet handed over, oldest first. */
export const cafeQueue = (shopName: string): CafeOrder[] =>
  cafeStore.get()
    .filter((o) => o.shopName === shopName && o.status !== "picked_up")
    .sort((a, b) => a.queueNo - b.queueNo);

/** Orders ahead of this one in the queue. */
export const queueAheadOf = (shopName: string, queueNo: number): number =>
  cafeQueue(shopName).filter((o) => o.queueNo < queueNo).length;

// ── writes ─────────────────────────────────────────────────────
export type PlaceCafeOrderInput = Omit<
  CafeOrder,
  "status" | "ratingService" | "ratingTaste" | "comment" | "readyAtActual" | "pickedUpAt"
>;

/** Idempotent per orderId — a double-submit can't duplicate the order. */
export function placeCafeOrder(input: PlaceCafeOrderInput): CafeOrder {
  const existing = cafeOrderById(input.orderId);
  if (existing) return existing;

  const order: CafeOrder = { ...input, status: "preparing", ratingService: 0, ratingTaste: 0, comment: "" };
  cafeStore.set((prev) => [order, ...prev]);

  const first = order.items[0];
  const label = first ? (order.items.length > 1 ? `${first.name} +${order.items.length - 1}` : first.name) : "ออเดอร์กาแฟ";
  emit({
    type: "cafe_order_placed",
    audience: ["shop"],
    userId: order.userId,
    shopName: order.shopName,
    orderId: order.orderId,
    title: "ออเดอร์คาเฟ่ใหม่",
    body: `คิว #${order.queueNo} · ${label} · ฿${order.total.toLocaleString()}`,
  });
  return order;
}

function patch(orderId: string, fn: (o: CafeOrder) => CafeOrder): CafeOrder | undefined {
  let updated: CafeOrder | undefined;
  cafeStore.set((prev) =>
    prev.map((o) => {
      if (o.orderId !== orderId) return o;
      updated = fn(o);
      return updated;
    }),
  );
  return updated;
}

/** The barista finished it. The customer's queue banner flips to "รับได้เลย". */
export function markCafeReady(orderId: string, now = Date.now()): CafeOrder | undefined {
  const current = cafeOrderById(orderId);
  if (!current || current.status !== "preparing") return undefined;
  const o = patch(orderId, (prev) => ({ ...prev, status: "ready", readyAtActual: now }));
  if (o) {
    const first = o.items[0];
    emit({
      type: "cafe_order_ready",
      audience: ["customer"],
      at: now,
      userId: o.userId,
      shopName: o.shopName,
      orderId: o.orderId,
      title: "ออเดอร์พร้อมแล้ว! ☕",
      body: `คิว #${o.queueNo} · ${first?.name ?? "ออเดอร์กาแฟ"} — รับได้ที่เคาน์เตอร์`,
    });
  }
  return o;
}

/** Handed over. Moves the order into the customer's history. */
export function completeCafeOrder(orderId: string, now = Date.now()): CafeOrder | undefined {
  const current = cafeOrderById(orderId);
  if (!current || current.status === "picked_up") return undefined;
  return patch(orderId, (prev) => ({ ...prev, status: "picked_up", pickedUpAt: now }));
}

export function rateCafeOrder(orderId: string, service: number, taste: number, comment: string): CafeOrder | undefined {
  const current = cafeOrderById(orderId);
  if (!current) return undefined;
  const o = patch(orderId, (prev) => ({ ...prev, ratingService: service, ratingTaste: taste, comment }));
  if (o) {
    emit({
      type: "cafe_order_rated",
      audience: ["shop"],
      userId: o.userId,
      shopName: o.shopName,
      orderId: o.orderId,
      title: "ลูกค้ารีวิวคาเฟ่",
      body: `บริการ ${service} ดาว · รสชาติ ${taste} ดาว`,
    });
  }
  return o;
}

/** Test helper. */
export function __resetCafe(): void {
  cafeStore.reset([]);
}

/**
 * Orders still being made after the wait the customer was promised.
 *
 * The counter has no way to notice this on its own — the queue card looks the
 * same at 3 minutes and at 13 — so the feed says it once per order. Idempotent:
 * an order that already raised the flag never raises it twice.
 */
export function flagLateCafeOrders(now = Date.now()): number {
  const flagged = new Set(
    eventsStore.get().filter((e) => e.type === "cafe_order_late").map((e) => e.orderId),
  );
  let raised = 0;
  for (const o of cafeStore.get()) {
    if (o.status !== "preparing" || now <= o.readyAt || flagged.has(o.orderId)) continue;
    const lateMin = Math.max(1, Math.round((now - o.readyAt) / 60000));
    emit({
      type: "cafe_order_late",
      audience: ["shop"],
      at: now,
      userId: o.userId,
      shopName: o.shopName,
      orderId: o.orderId,
      title: "ออเดอร์เกินเวลาที่บอกลูกค้า",
      body: `คิว #${o.queueNo} · ช้ากว่ากำหนด ${lateMin} นาที`,
    });
    raised += 1;
  }
  return raised;
}
