import type { ComponentType } from "react";
import type { ImageSourcePropType } from "react-native";
import { Banknote } from "lucide-react-native";

export type CafePayMethodId = "promptpay" | "cash";

import { cafeQueueEta, nextCafeQueueNo, queueAheadOf, type CafeOrder, type CafeOrderItem } from "../store/cafe";
import { currentUserId, DEMO_USER } from "../store/session";
import { METAHERB_SHOP } from "./shopOrders";

export type { CafeOrder, CafeOrderItem };

/** A favourited menu item + the saved options to reorder it with. */
export type CafeFavorite = { itemId: string; summary: string; opts: { sweet: number; milk: number; shot: number; note: string } };

/** A completed order kept in history, with the customer's review (ratings 0 = unrated). */
/** Kept for the history screen's prop types; the store row already carries ratings. */
export type CafeHistoryOrder = CafeOrder;

// Sample past orders so the history screen isn't empty on first open. queue/timing
// fields are placeholders — history cards only use id / items / total / ratings.
const RAW_HISTORY: Omit<CafeOrder, "userId" | "shopName" | "status">[] = [
  {
    orderId: "CAFE20486135",
    payLabel: "พร้อมเพย์ (PromptPay)",
    receiveLabel: "รับที่ร้าน",
    items: [
      { name: "อเมริกาโน่ (เย็น)", qty: 1, summary: "หวานน้อย", total: 65 },
      { name: "ลาเต้ (เย็น)", qty: 1, summary: "นมโอ๊ต +20", total: 90 },
    ],
    total: 155,
    queueNo: 18, queueAhead: 0, waitMinutes: 0, readyAt: 0,
    ratingService: 0, ratingTaste: 0, comment: "", // ยังไม่ได้รีวิว
  },
  {
    orderId: "CAFE20390712",
    payLabel: "เงินสด",
    receiveLabel: "รับที่ร้าน",
    items: [
      { name: "มัทฉะลาเต้ (เย็น)", qty: 2, summary: "หวานปกติ", total: 190 },
      { name: "ครัวซองต์เนยสด", qty: 1, summary: "", total: 55 },
    ],
    total: 245,
    queueNo: 12, queueAhead: 0, waitMinutes: 0, readyAt: 0,
    ratingService: 5, ratingTaste: 5, comment: "มัทฉะเข้มข้นอร่อยค่ะ",
  },
  {
    orderId: "CAFE20285940",
    payLabel: "พร้อมเพย์ (PromptPay)",
    receiveLabel: "รับที่ร้าน",
    items: [{ name: "เอสเพรสโซ่ (ร้อน)", qty: 1, summary: "", total: 55 }],
    total: 55,
    queueNo: 7, queueAhead: 0, waitMinutes: 0, readyAt: 0,
    ratingService: 4, ratingTaste: 5, comment: "กาแฟหอมกลมกล่อม บริการดีมากครับ",
  },
];

/** Past orders so the history screen isn't empty on first open. */
export const INITIAL_CAFE_HISTORY: CafeOrder[] = RAW_HISTORY.map((o) => ({
  ...o,
  userId: DEMO_USER.id,
  shopName: METAHERB_SHOP,
  status: "picked_up" as const,
  pickedUpAt: o.readyAt || Date.now(),
}));

/**
 * Build a placed order from checkout data. The queue number comes from the
 * shared counter, and the pickup time from what is on the bill (`prepMinutes`,
 * summed by orderPrepMinutes) queued behind whatever the bar is still making.
 */
export function buildCafeOrder(input: {
  orderId: string;
  total: number;
  payLabel: string;
  receiveLabel: string;
  items: CafeOrderItem[];
  /** เวลาทำทั้งบิล — from the menu's เวลาทำต่อแก้ว. */
  prepMinutes: number;
}) {
  // The same counter the till uses — see nextCafeQueueNo.
  const queueNo = nextCafeQueueNo();
  // Orders ahead is now the REAL queue depth, not a hash of the order id.
  const queueAhead = queueAheadOf(METAHERB_SHOP, queueNo);
  const { readyAt, waitMinutes } = cafeQueueEta(input.prepMinutes);
  return {
    ...input,
    userId: currentUserId(),
    shopName: METAHERB_SHOP,
    queueNo,
    queueAhead,
    waitMinutes,
    readyAt,
  };
}

export type CafePayMethod = {
  id: CafePayMethodId;
  label: string;
  desc: string;
  /** Logo image (shown instead of `Icon` when set). */
  image?: ImageSourcePropType;
  /** Fallback lucide icon for methods without a logo. */
  Icon?: ComponentType<{ size?: number; color?: string }>;
};

// METAHERB Café accepts only PromptPay + cash-on-receipt — no COD, cards, wallets
// or bank transfer (unlike the product checkout's PAYMENT_METHODS).
export const CAFE_PAY_METHODS: CafePayMethod[] = [
  { id: "promptpay", label: "พร้อมเพย์ (PromptPay)", desc: "สแกน QR ชำระเงิน", image: require("../../assets/payment/promptpay.png") },
  { id: "cash", label: "เงินสด", desc: "จ่ายเงินสดเมื่อรับสินค้า", Icon: Banknote },
];

export const cafePayMethod = (id: CafePayMethodId): CafePayMethod =>
  CAFE_PAY_METHODS.find((m) => m.id === id) ?? CAFE_PAY_METHODS[0];
