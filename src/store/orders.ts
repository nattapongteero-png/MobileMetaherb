/**
 * The orders table — one array read by BOTH the buyer's "คำสั่งซื้อ" screens and
 * the seller's console. A buyer's checkout lands here; the shop's ship/cancel
 * writes here; the buyer sees the result. Nothing is duplicated.
 *
 * Pure TS (no react-native): `image` on each line is dropped before persisting
 * and rehydrated from `productId` by the app-side seed.
 */
import { createStore } from "./db";
import { emit } from "./events";
import { releaseStock, reserveStock, shortfall } from "./stock";
import { canTransition, orderSubtotal, type Order, type OrderItem, type OrderReview, type OrderStatus, type Recipient } from "./types";

export const ordersStore = createStore<Order[]>([], {
  persistKey: "mh.orders",
  // RN image handles are bundler-local ints — persisting them would break on
  // the next build. Drop them; the app rehydrates from productId.
  toJSON: (orders) => orders.map((o) => ({ ...o, items: o.items.map(({ image, ...it }) => it) })),
});

// ── seeding ────────────────────────────────────────────────────
export function seedOrders(rows: Order[]): void {
  ordersStore.reset([...rows].sort((a, b) => b.createdAt - a.createdAt));
}

/** Re-attach image handles after a hydrate (persisted orders carry none). */
export function rehydrateImages(resolve: (productId: string) => OrderItem["image"]): void {
  ordersStore.set((prev) =>
    prev.map((o) => ({
      ...o,
      items: o.items.map((it) => (it.image ? it : { ...it, image: resolve(it.productId) })),
    })),
  );
}

// ── selectors ──────────────────────────────────────────────────
export const allOrders = (): Order[] => ordersStore.get();

export const orderById = (id: string): Order | undefined => ordersStore.get().find((o) => o.id === id);

/** Orders this buyer placed, newest first. */
export const ordersForUser = (userId: string): Order[] =>
  ordersStore.get().filter((o) => o.userId === userId);

/** Orders this shop received, newest first. */
export const ordersForShop = (shopName: string): Order[] =>
  ordersStore.get().filter((o) => o.shopName === shopName);

// ── id + date helpers ──────────────────────────────────────────
const TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** "16 ก.พ. 2569 · 10:00 น." — Buddhist year, matching the seeded rows. */
export function formatThaiDateTime(epoch: number): string {
  const d = new Date(epoch);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${TH_MONTH[d.getMonth()]} ${d.getFullYear() + 543} · ${hh}:${mm} น.`;
}

/** Inverse of `formatThaiDateTime`, tolerant of the `·` and `-` separators the seeds use. */
export function parseThaiDateTime(s: string, fallback = 0): number {
  const m = s.match(/(\d{1,2})\s+(\S+)\s+(\d{4})[^\d]+(\d{1,2}):(\d{2})/);
  if (!m) return fallback;
  const month = TH_MONTH.indexOf(m[2]);
  if (month < 0) return fallback;
  return new Date(Number(m[3]) - 543, month, Number(m[1]), Number(m[4]), Number(m[5])).getTime();
}

let orderSeq = 0;
/**
 * "ORD-20260710-04821" — the same namespace the seeded buyer and seller rows
 * already use, so a new order is indistinguishable from a seeded one. (Checkout
 * used to mint an unrelated `MH…` id that neither side could look up.)
 */
export function nextOrderId(now = Date.now()): string {
  const d = new Date(now);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  orderSeq += 1;
  const tail = String((Math.floor(now / 1000) % 100000) + orderSeq).padStart(5, "0").slice(-5);
  return `ORD-${ymd}-${tail}`;
}

// ── mutations ──────────────────────────────────────────────────
function patch(id: string, fn: (o: Order) => Order): Order | undefined {
  let updated: Order | undefined;
  ordersStore.set((prev) =>
    prev.map((o) => {
      if (o.id !== id) return o;
      updated = fn(o);
      return updated;
    }),
  );
  return updated;
}

export type CreateOrderInput = {
  userId: string;
  shopName: string;
  items: OrderItem[];
  recipient: Recipient;
  /** Grand total including shipping and discounts. Defaults to the line subtotal. */
  total?: number;
  shippingMethod?: string;
  paymentMethod?: string;
  note?: string;
  /** PromptPay/bank flows start unpaid; card/wallet flows may start verified. */
  status?: Extract<OrderStatus, "pending_payment" | "pending_verify">;
  now?: number;
};

export type CreateOrderResult =
  | { ok: true; order: Order }
  | { ok: false; reason: "out_of_stock"; shortfall: { productId: string; quantity: number }[] };

/**
 * Place an order. Reserves stock first — an overdrawn line aborts the whole
 * order rather than silently overselling.
 */
export function createOrder(input: CreateOrderInput): CreateOrderResult {
  const lines = input.items.map((it) => ({ productId: it.productId, quantity: it.quantity }));
  if (!reserveStock(lines, { shopName: input.shopName })) {
    return { ok: false, reason: "out_of_stock", shortfall: shortfall(lines) };
  }

  const now = input.now ?? Date.now();
  const order: Order = {
    id: nextOrderId(now),
    userId: input.userId,
    shopName: input.shopName,
    status: input.status ?? "pending_payment",
    date: formatThaiDateTime(now),
    createdAt: now,
    items: input.items,
    total: input.total ?? orderSubtotal({ items: input.items }),
    recipient: input.recipient,
    shippingMethod: input.shippingMethod,
    paymentMethod: input.paymentMethod,
    note: input.note,
  };
  ordersStore.set((prev) => [order, ...prev]);

  emit({
    type: "order_placed",
    audience: ["shop"],
    at: now,
    userId: order.userId,
    shopName: order.shopName,
    orderId: order.id,
    title: "คำสั่งซื้อใหม่",
    body: `${order.recipient.name} สั่งซื้อ ${order.items.length} รายการ · ฿${order.total.toLocaleString()}`,
  });
  return { ok: true, order };
}

/** Guarded status move. Returns undefined when the transition is illegal. */
export function setOrderStatus(id: string, status: OrderStatus): Order | undefined {
  const current = orderById(id);
  if (!current || !canTransition(current.status, status)) return undefined;
  return patch(id, (o) => ({ ...o, status }));
}

/** Buyer paid (slip uploaded / card charged) → the shop must verify. */
export function markPaid(id: string): Order | undefined {
  const o = setOrderStatus(id, "pending_verify");
  if (o) {
    emit({
      type: "order_paid",
      audience: ["shop"],
      userId: o.userId,
      shopName: o.shopName,
      orderId: o.id,
      title: "มีการชำระเงินเข้ามา",
      body: `${o.id} · ฿${o.total.toLocaleString()} — รอตรวจสอบ`,
    });
  }
  return o;
}

/** Shop confirmed the payment → start preparing. */
export function verifyPayment(id: string): Order | undefined {
  const o = setOrderStatus(id, "preparing");
  if (o) {
    emit({
      type: "order_verified",
      audience: ["customer"],
      userId: o.userId,
      shopName: o.shopName,
      orderId: o.id,
      title: "ร้านยืนยันการชำระเงินแล้ว",
      body: `${o.id} กำลังจัดเตรียมสินค้า`,
    });
  }
  return o;
}

/** Shop handed the parcel to the courier. */
export function shipOrder(id: string, trackingNumber: string): Order | undefined {
  const current = orderById(id);
  if (!current || !canTransition(current.status, "shipping")) return undefined;
  const o = patch(id, (prev) => ({ ...prev, status: "shipping", trackingNumber }));
  if (o) {
    emit({
      type: "order_shipped",
      audience: ["customer"],
      userId: o.userId,
      shopName: o.shopName,
      orderId: o.id,
      title: "พัสดุออกจากร้านแล้ว",
      body: `เลขพัสดุ ${trackingNumber} — ติดตามได้ในหน้าคำสั่งซื้อ`,
    });
  }
  return o;
}

/** Parcel arrived — set by the shop ("ส่งสำเร็จ") or the buyer ("ได้รับสินค้าแล้ว"). */
export function markDelivered(id: string): Order | undefined {
  const o = setOrderStatus(id, "delivered");
  if (o) {
    emit({
      type: "order_delivered",
      audience: ["customer", "shop"],
      userId: o.userId,
      shopName: o.shopName,
      orderId: o.id,
      title: "จัดส่งสำเร็จ",
      body: `${o.id} ถึงมือผู้รับแล้ว`,
    });
  }
  return o;
}

export function submitOrderReview(id: string, review: OrderReview): Order | undefined {
  const current = orderById(id);
  if (!current || !canTransition(current.status, "completed")) return undefined;
  const o = patch(id, (prev) => ({ ...prev, status: "completed", review }));
  if (o) {
    emit({
      type: "review_submitted",
      audience: ["shop"],
      userId: o.userId,
      shopName: o.shopName,
      orderId: o.id,
      title: "ลูกค้ารีวิวสินค้า",
      body: `${review.anonymous ? "ลูกค้า" : o.recipient.name} ให้ ${review.rating} ดาว`,
    });
  }
  return o;
}

export type CancelInput = { by: "shop" | "customer"; reason?: string; note?: string };

/** Cancel outright and put the reserved stock back. */
export function cancelOrder(id: string, input: CancelInput): Order | undefined {
  const current = orderById(id);
  if (!current || !canTransition(current.status, "cancelled")) return undefined;
  releaseStock(current.items.map((it) => ({ productId: it.productId, quantity: it.quantity })));
  const o = patch(id, (prev) => ({
    ...prev,
    status: "cancelled",
    cancelledBy: input.by,
    cancelReason: input.reason,
    cancelNote: input.note,
    cancellationStatus: "approved",
  }));
  if (o) {
    emit({
      type: "order_cancelled",
      // The other party is the one who needs telling.
      audience: input.by === "customer" ? ["shop"] : ["customer"],
      userId: o.userId,
      shopName: o.shopName,
      orderId: o.id,
      title: "คำสั่งซื้อถูกยกเลิก",
      body: `${o.id}${input.reason ? ` · ${input.reason}` : ""}`,
    });
  }
  return o;
}

/**
 * Buyer asks to cancel an order the shop has already started. The shop decides;
 * stock stays reserved until then.
 */
export function requestCancellation(id: string, reason: string, note?: string): Order | undefined {
  const current = orderById(id);
  if (!current || current.status === "cancelled" || current.status === "completed") return undefined;
  const o = patch(id, (prev) => ({
    ...prev,
    cancellationStatus: "pending",
    previousStatus: prev.status,
    cancelReason: reason,
    cancelNote: note,
    cancelledBy: "customer",
  }));
  if (o) {
    emit({
      type: "cancel_requested",
      audience: ["shop"],
      userId: o.userId,
      shopName: o.shopName,
      orderId: o.id,
      title: "ลูกค้าขอยกเลิกคำสั่งซื้อ",
      body: `${o.id} · ${reason}`,
    });
  }
  return o;
}

/** Shop's verdict on a pending cancellation. Denying restores the prior status. */
export function decideCancellation(id: string, approve: boolean): Order | undefined {
  const current = orderById(id);
  if (!current || current.cancellationStatus !== "pending") return undefined;
  if (approve) return cancelOrder(id, { by: "customer", reason: current.cancelReason, note: current.cancelNote });
  return patch(id, (prev) => ({
    ...prev,
    status: prev.previousStatus ?? prev.status,
    cancellationStatus: "denied",
    previousStatus: undefined,
  }));
}

/** Test helper. */
export function __resetOrders(): void {
  ordersStore.reset([]);
  orderSeq = 0;
}
