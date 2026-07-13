/**
 * The two notification feeds, built from the event log.
 *
 * Both feeds used to be static seed arrays: placing an order, filing a
 * complaint or running out of stock produced no notification anywhere. Every
 * domain action now emits an event (src/store/events.ts), and these adapters
 * project the log onto each side's existing row shape.
 *
 * The seed rows survive as *older* entries so a fresh install isn't empty —
 * they sit below anything that actually happened.
 */
import { useStore } from "../store/db";
import {
  eventsFor,
  eventsStore,
  isRead,
  markAllEventsRead,
  markEventRead,
  timeAgo,
  type AppEvent,
  type AppEventType,
} from "../store/events";

import { currentUserId } from "../store/session";
import { SHOP_NOTIF_SEED, type ShopNotif, type ShopNotifType } from "./shopNotifications";

export { timeAgo };

// ── the buyer's feed ───────────────────────────────────────────
export type CustomerNotifType = "order" | "promo" | "chat" | "system" | "payment";

export type CustomerNotif = {
  id: string;
  type: CustomerNotifType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  /** Present when the row can deep-link to an order. */
  orderId?: string;
};

const CUSTOMER_TYPE: Partial<Record<AppEventType, CustomerNotifType>> = {
  order_verified: "payment",
  order_shipped: "order",
  order_delivered: "order",
  order_completed: "order",
  order_cancelled: "order",
  complaint_decided: "payment",
  trial_approved: "system",
  trial_rejected: "system",
  quote_sent: "system",
  cafe_order_ready: "order",
  chat_message: "chat",
};

function toCustomerNotif(e: AppEvent): CustomerNotif {
  return {
    id: e.id,
    type: CUSTOMER_TYPE[e.type] ?? "system",
    title: e.title,
    message: e.body,
    time: timeAgo(e.at),
    read: isRead(e, "customer"),
    orderId: e.orderId,
  };
}

// ── the shop's feed ────────────────────────────────────────────
const SHOP_TYPE: Partial<Record<AppEventType, ShopNotifType>> = {
  order_placed: "order",
  order_paid: "finance",
  order_delivered: "order",
  order_cancelled: "order",
  cancel_requested: "order",
  review_submitted: "order",
  stock_low: "stock",
  product_added: "marketing",
  complaint_filed: "complaint",
  trial_applied: "marketing",
  trial_evaluated: "marketing",
  quote_requested: "order",
  quote_accepted: "finance",
  quote_rejected: "order",
  cafe_order_placed: "order",
  cafe_order_rated: "order",
  chat_message: "chat",
};

function toShopNotif(e: AppEvent): ShopNotif {
  return {
    id: e.id,
    type: SHOP_TYPE[e.type] ?? "order",
    title: e.title,
    message: e.body,
    time: timeAgo(e.at),
    read: isRead(e, "shop"),
  };
}

// ── seeds (older, below the real events) ───────────────────────
/** The demo rows the two feeds shipped with. Kept so a fresh install isn't empty. */
export const CUSTOMER_NOTIF_SEED: CustomerNotif[] = [
  { id: "n2", type: "promo", title: "🔥 Flash Sale เริ่มแล้ว!", message: "ลดสูงสุด 70% สินค้าสมุนไพรคุณภาพ วันนี้เท่านั้น!", time: "1 ชม. ที่แล้ว", read: false },
  { id: "n3", type: "promo", title: "คูปองส่วนลดพิเศษ", message: "คุณได้รับคูปองลด 100 บาท ใช้ได้ถึง 31 มี.ค. 2569", time: "3 ชม. ที่แล้ว", read: false },
  { id: "n5", type: "chat", title: "ข้อความจาก METAHERB Store", message: "สินค้าจัดเตรียมเรียบร้อยแล้วค่ะ จะจัดส่งภายในวันนี้", time: "1 วันที่แล้ว", read: true },
  { id: "n6", type: "system", title: "ยินดีต้อนรับสู่ MetaHerb!", message: "ขอบคุณที่สมัครสมาชิก รับส่วนลด 50 บาทสำหรับการสั่งซื้อครั้งแรก", time: "2 วันที่แล้ว", read: true },
];

/** An id that belongs to the event log rather than a seed row. */
export const isEventId = (id: string): boolean => id.startsWith("ev-");

// ── hooks ──────────────────────────────────────────────────────
export function useCustomerNotifications(): CustomerNotif[] {
  useStore(eventsStore);
  const live = eventsFor("customer", { userId: currentUserId() }).map(toCustomerNotif);
  return [...live, ...CUSTOMER_NOTIF_SEED];
}

export function useShopNotifications(shopName: string): ShopNotif[] {
  useStore(eventsStore);
  const live = eventsFor("shop", { shopName }).map(toShopNotif);
  return [...live, ...SHOP_NOTIF_SEED];
}

/** Mark one row read. Seed rows have no backing event, so the caller keeps local state. */
export function readNotification(id: string, audience: "customer" | "shop"): boolean {
  if (!isEventId(id)) return false;
  markEventRead(id, audience);
  return true;
}

export function readAllNotifications(audience: "customer" | "shop", opts: { userId?: string; shopName?: string } = {}): void {
  markAllEventsRead(audience, opts);
}
