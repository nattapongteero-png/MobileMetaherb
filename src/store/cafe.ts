/**
 * METAHERB Café orders — one queue, seen by the customer and the barista.
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
  /** ยอดที่ต้องชำระจริง — หักส่วนลดแลกแต้มแล้ว. */
  total: number;
  /** Set when the bill spent a stamp card: how much came off, and how many
   *  points it cost. Without it the lines add up to more than the total and
   *  nothing on the order says why — the free cup would be invisible to the
   *  barista handing it over, and to anyone reading the day's sales back. */
  redeemDiscount?: number;
  redeemPoints?: number;
  /** Running queue number (e.g. #23). */
  queueNo: number;
  queueAhead: number;
  waitMinutes: number;
  /** เวลาทำของบิลนี้ (นาที) — summed from the menu's เวลาทำต่อแก้ว. Kept on the
   *  order because the queue is re-timed whenever the bar gets ahead, and that
   *  needs each order's own making time, not just the estimate it was given. */
  prepMinutes?: number;
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

/**
 * When a bill placed now can be handed over, and the wait to quote for it.
 *
 * The bar works through one order at a time, so a new order starts when the
 * last one still being made finishes — not when it was rung up. That is why the
 * customer's "รับได้ ~x นาที" grows with the queue instead of always saying the
 * same five minutes.
 */
export function cafeQueueEta(prepMinutes: number, now = Date.now()): { readyAt: number; waitMinutes: number } {
  const busyUntil = cafeStore
    .get()
    .filter((o) => o.status === "preparing")
    .reduce((m, o) => Math.max(m, o.readyAt), now);
  const readyAt = busyUntil + Math.max(1, prepMinutes) * 60000;
  return { readyAt, waitMinutes: Math.max(1, Math.round((readyAt - now) / 60000)) };
}

/** How long this order takes to make; older orders only carry the estimate. */
const prepOf = (o: CafeOrder): number => Math.max(1, o.prepMinutes ?? o.waitMinutes);

/**
 * Re-time the orders still being made, in queue order, starting from now.
 *
 * A promised time is only ever pulled EARLIER, never pushed back: when the bar
 * finishes a drink in two minutes instead of four, everyone behind moves up —
 * which is what a customer watching the counter can see happening anyway. The
 * reverse is not allowed, because a shop that is running late must not be able
 * to erase that by rewriting the time it already told someone (it is also what
 * flagLateCafeOrders reads to raise ออเดอร์เกินเวลา).
 */
export function reflowCafeQueue(now = Date.now()): void {
  cafeStore.set((prev) => {
    const line = prev.filter((o) => o.status === "preparing").sort((a, b) => a.queueNo - b.queueNo);
    const retimed = new Map<string, { readyAt: number; waitMinutes: number; queueAhead: number }>();
    let free = now;
    for (const [i, o] of line.entries()) {
      const readyAt = Math.min(o.readyAt, free + prepOf(o) * 60000);
      // How many are genuinely still in front of this one, recounted here: the
      // number was stamped at checkout and never moved, so the customer was told
      // "รออีก 3 คิว" long after all three had been handed over.
      retimed.set(o.orderId, {
        readyAt,
        waitMinutes: Math.max(1, Math.round((readyAt - now) / 60000)),
        queueAhead: i,
      });
      free = readyAt;
    }
    return prev.map((o) => {
      const t = retimed.get(o.orderId);
      return t && (t.readyAt !== o.readyAt || t.queueAhead !== o.queueAhead) ? { ...o, ...t } : o;
    });
  });
}

/**
 * The next number to call out. One counter for the whole shop: an order placed
 * in the app and an order rung up at the till stand in the same line, and the
 * queue is sorted by this, so the two must never be handed out by different
 * rules — a walk-in taking #4 while the app hands out #23 puts the app order at
 * the back of a line it actually joined first.
 */
export const nextCafeQueueNo = (): number =>
  cafeStore.get().reduce((m, o) => Math.max(m, o.queueNo), 0) + 1;

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
    // The bar is free again — whoever is behind may now be ready sooner.
    reflowCafeQueue(now);
  }
  return o;
}

/** Handed over. Moves the order into the customer's history. */
export function completeCafeOrder(orderId: string, now = Date.now()): CafeOrder | undefined {
  const current = cafeOrderById(orderId);
  if (!current || current.status === "picked_up") return undefined;
  const o = patch(orderId, (prev) => ({ ...prev, status: "picked_up", pickedUpAt: now }));
  // Handed straight over without passing through "พร้อมรับ" — the bar still
  // freed up, so the rest of the line moves with it.
  if (current.status === "preparing") reflowCafeQueue(now);
  return o;
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
