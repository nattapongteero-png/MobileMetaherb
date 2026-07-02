import type { ComponentType } from "react";
import type { ImageSourcePropType } from "react-native";
import { Banknote } from "lucide-react-native";

export type CafePayMethodId = "promptpay" | "cash";

/** A lightweight order-line snapshot passed to the café success screen (no image). */
export type CafeOrderItem = { name: string; qty: number; summary: string; total: number };

/** A placed café order — the single source of truth for the success screen and
 *  the "order in progress" queue banner on the café landing. */
export type CafeOrder = {
  orderId: string;
  payLabel: string;
  receiveLabel: string;
  items: CafeOrderItem[];
  total: number;
  /** Your running queue number (e.g. #23). */
  queueNo: number;
  /** Orders ahead of you. */
  queueAhead: number;
  /** Rough prep estimate in minutes. */
  waitMinutes: number;
  /** Estimated ready time as an epoch (ms). */
  readyAt: number;
};

/** A favourited menu item + the saved options to reorder it with. */
export type CafeFavorite = { itemId: string; summary: string; opts: { sweet: number; milk: number; shot: number; note: string } };

/** A completed order kept in history, with the customer's review (ratings 0 = unrated). */
export type CafeHistoryOrder = CafeOrder & { ratingService: number; ratingTaste: number; comment: string };

// Sample past orders so the history screen isn't empty on first open. queue/timing
// fields are placeholders — history cards only use id / items / total / ratings.
export const INITIAL_CAFE_HISTORY: CafeHistoryOrder[] = [
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
    receiveLabel: "จัดส่ง",
    items: [
      { name: "มัทฉะลาเต้ (เย็น)", qty: 2, summary: "หวานปกติ", total: 190 },
      { name: "ครัวซองต์เนยสด", qty: 1, summary: "", total: 55 },
    ],
    total: 265, // 245 + ค่าส่ง 20
    queueNo: 12, queueAhead: 0, waitMinutes: 0, readyAt: 0,
    ratingService: 5, ratingTaste: 5, comment: "มัทฉะเข้มข้นอร่อย ส่งไวดีค่ะ",
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

/** Build a placed order from checkout data — queue figures are a deterministic
 *  mock from the order id; readyAt is stamped from the current time. */
export function buildCafeOrder(input: {
  orderId: string;
  total: number;
  payLabel: string;
  receiveLabel: string;
  items: CafeOrderItem[];
}): CafeOrder {
  const seed = parseInt(input.orderId.replace(/\D/g, "").slice(-4) || "0", 10);
  const queueNo = 10 + (seed % 40); // running counter #10..#49
  const queueAhead = 1 + (seed % 5); // 1..5 orders ahead
  const waitMinutes = queueAhead * 4 + 3; // ~7..23 min depending on queue
  const readyAt = Date.now() + waitMinutes * 60000;
  return { ...input, queueNo, queueAhead, waitMinutes, readyAt };
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

// META Caffe accepts only PromptPay + cash-on-receipt — no COD, cards, wallets
// or bank transfer (unlike the product checkout's PAYMENT_METHODS).
export const CAFE_PAY_METHODS: CafePayMethod[] = [
  { id: "promptpay", label: "พร้อมเพย์ (PromptPay)", desc: "สแกน QR ชำระเงิน", image: require("../../assets/payment/promptpay.png") },
  { id: "cash", label: "เงินสด", desc: "จ่ายเงินสดเมื่อรับสินค้า", Icon: Banknote },
];

export const cafePayMethod = (id: CafePayMethodId): CafePayMethod =>
  CAFE_PAY_METHODS.find((m) => m.id === id) ?? CAFE_PAY_METHODS[0];
