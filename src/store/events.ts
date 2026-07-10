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
  | "quote_rejected";

/** Who should see this in their notification feed. */
export type Audience = "customer" | "shop";

export type AppEvent = {
  id: string;
  type: AppEventType;
  at: number;
  audience: Audience[];
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

/** Test helper — wipe the log between cases. */
export function __resetEvents(): void {
  eventsStore.reset([]);
  seq = 0;
}
