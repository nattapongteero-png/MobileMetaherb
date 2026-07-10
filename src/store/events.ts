/**
 * Append-only event log. Domain actions emit here; the notification feeds
 * (customer + shop) read from it, so a notification can never exist without a
 * real event behind it — the old seeded lists were pure fiction.
 *
 * Pure TS: no react-native, no timers beyond the store's own debounce.
 */
import { createStore } from "./db";

export type AppEventType =
  | "order_placed"
  | "order_paid"
  | "order_verified"
  | "order_shipped"
  | "order_delivered"
  | "order_completed"
  | "order_cancelled"
  | "cancel_requested"
  | "review_submitted"
  | "stock_low"
  | "product_added"
  | "complaint_filed"
  | "complaint_decided"
  | "trial_applied"
  | "trial_approved"
  | "trial_rejected"
  | "trial_evaluated"
  | "quote_requested"
  | "quote_sent"
  | "quote_accepted"
  | "quote_rejected"
  | "cafe_order_placed"
  | "cafe_order_ready"
  | "cafe_order_rated";

/** Who should see this in their notification feed. */
export type Audience = "customer" | "shop";

export type AppEvent = {
  id: string;
  type: AppEventType;
  at: number;
  audience: Audience[];
  /** Read receipts are per-audience: an event can be addressed to both sides. */
  readCustomer?: boolean;
  readShop?: boolean;
  /** Buyer the event concerns (customer feed filters on it). */
  userId?: string;
  /** Seller the event concerns (shop feed filters on it). */
  shopName?: string;
  orderId?: string;
  productId?: string;
  title: string;
  body: string;
};

export const eventsStore = createStore<AppEvent[]>([], { persistKey: "mh.events" });

let seq = 0;
/**
 * Deterministic, collision-free ids without Math.random — the counter is
 * enough because a single JS runtime owns the log.
 */
function nextId(at: number): string {
  seq += 1;
  return `ev-${at}-${seq}`;
}

export function emit(e: Omit<AppEvent, "id" | "at"> & { at?: number }): AppEvent {
  const at = e.at ?? Date.now();
  const event: AppEvent = { ...e, at, id: nextId(at) };
  // Newest first — every feed renders in this order.
  eventsStore.set((prev) => [event, ...prev].slice(0, 200));
  return event;
}

export function eventsFor(audience: Audience, opts: { userId?: string; shopName?: string } = {}): AppEvent[] {
  return eventsStore.get().filter((e) => {
    if (!e.audience.includes(audience)) return false;
    if (audience === "customer" && opts.userId && e.userId && e.userId !== opts.userId) return false;
    if (audience === "shop" && opts.shopName && e.shopName && e.shopName !== opts.shopName) return false;
    return true;
  });
}

export const isRead = (e: AppEvent, audience: Audience): boolean =>
  Boolean(audience === "customer" ? e.readCustomer : e.readShop);

type ReadKey = "readCustomer" | "readShop";
const readKey = (audience: Audience): ReadKey => (audience === "customer" ? "readCustomer" : "readShop");

export function markEventRead(id: string, audience: Audience): void {
  const key = readKey(audience);
  eventsStore.set((prev) => prev.map((e) => (e.id === id ? { ...e, [key]: true } : e)));
}

export function markAllEventsRead(audience: Audience, opts: { userId?: string; shopName?: string } = {}): void {
  const key = readKey(audience);
  const ids = new Set(eventsFor(audience, opts).map((e) => e.id));
  eventsStore.set((prev) => prev.map((e) => (ids.has(e.id) ? { ...e, [key]: true } : e)));
}

export const unreadCount = (audience: Audience, opts: { userId?: string; shopName?: string } = {}): number =>
  eventsFor(audience, opts).filter((e) => !isRead(e, audience)).length;

/** "5 นาทีที่แล้ว" — how every notification row stamps itself. */
export function timeAgo(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "เมื่อสักครู่";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม. ที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d === 1) return "เมื่อวานนี้";
  return `${d} วันที่แล้ว`;
}

/** Test helper — wipe the log between cases. */
export function __resetEvents(): void {
  eventsStore.reset([]);
  seq = 0;
}
