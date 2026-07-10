// Buyer-side seed rows for the shared orders table (src/store/orders.ts).
// Line items reference the real store catalog (RAW_PRODUCT_BY_ID) so names,
// prices and photos match what the buyer actually sees in the shop.
//
// The Order type itself now lives in src/store/types.ts — it is the SAME type
// the shop console reads. These rows are just the demo buyer's history.

import { RAW_PRODUCT_BY_ID, getRealProductImage } from "./realProducts";
import { parseThaiDateTime } from "../store/orders";
import { DEMO_USER } from "../store/session";
import {
  CUSTOMER_STATUS_COLOR,
  CUSTOMER_STATUS_LABEL,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Recipient,
} from "../store/types";

export type { Order, OrderItem, OrderStatus, Recipient };
export const STATUS_LABEL = CUSTOMER_STATUS_LABEL;
export const STATUS_COLOR = CUSTOMER_STATUS_COLOR;

// Default delivery target — mirrors the user's saved default address.
const DEFAULT_RECIPIENT: Recipient = {
  name: DEMO_USER.name,
  phone: DEMO_USER.phone,
  address: "เลขที่ 2 ชั้น 2 ซอยสุขสวัสดิ์ 33 แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140",
};

// Build an order line from a real catalog product id ("1"–"43").
const line = (id: string, quantity: number, option: string): OrderItem => {
  const p = RAW_PRODUCT_BY_ID[id];
  return { productId: id, name: p.name, image: getRealProductImage(id), option, quantity, price: p.price };
};

type RawOrder = Omit<Order, "total" | "userId" | "createdAt">;

const RAW_ORDERS: RawOrder[] = [
  // ── รอชำระเงิน ───────────────────────────────────────────────
  {
    id: "ORD-20260219-04012", shopName: "METAHERB Store", status: "pending_payment", date: "19 ก.พ. 2569 · 16:40 น.",
    recipient: DEFAULT_RECIPIENT, shippingMethod: "Flash Express", paymentMethod: "PromptPay",
    items: [line("1", 2, "ขวด 250 ml"), line("3", 1, "แพ็ค 9 ซอง"), line("12", 2, "กล่อง 4 ชิ้น")],
  },
  {
    id: "ORD-20260218-03571", shopName: "บ้านสมุนไพรไทย", status: "pending_payment", date: "18 ก.พ. 2569 · 15:00 น.",
    recipient: DEFAULT_RECIPIENT, shippingMethod: "J&T Express", paymentMethod: "โอนผ่านธนาคาร",
    items: [line("37", 1, "ขนาด 150 g"), line("7", 2, "แท่ง 100 g")],
  },
  // ── รอตรวจสอบ ────────────────────────────────────────────────
  {
    id: "ORD-20260218-03572", shopName: "METAHERB Store", status: "pending_verify", date: "18 ก.พ. 2569 · 13:30 น.",
    recipient: DEFAULT_RECIPIENT, shippingMethod: "J&T Express", paymentMethod: "PromptPay",
    items: [line("10", 1, "เซ็ต Aromatic คละกลิ่น"), line("5", 1, "ขวด พิมเสนน้ำ")],
  },
  {
    id: "ORD-20260217-04880", shopName: "กรีนลีฟ ออร์แกนิก", status: "pending_verify", date: "17 ก.พ. 2569 · 18:05 น.",
    recipient: DEFAULT_RECIPIENT, shippingMethod: "Flash Express", paymentMethod: "โอนผ่านธนาคาร",
    items: [line("8", 2, "กล่อง 50 g"), line("31", 1, "เซต 2 กล่อง")],
  },
  // ── กำลังจัดเตรียม ───────────────────────────────────────────
  {
    id: "ORD-20260217-04821", shopName: "ร้านป่าหมอก", status: "preparing", date: "17 ก.พ. 2569 · 09:15 น.",
    recipient: DEFAULT_RECIPIENT, shippingMethod: "J&T Express", paymentMethod: "PromptPay",
    items: [line("18", 1, "โถ 550 ml"), line("14", 2, "ชิ้น")],
  },
  {
    id: "ORD-20260216-05290", shopName: "METAHERB Store", status: "preparing", date: "16 ก.พ. 2569 · 11:20 น.",
    recipient: DEFAULT_RECIPIENT, shippingMethod: "J&T Express", paymentMethod: "บัตรเครดิต / เดบิต",
    items: [line("4", 3, "แพ็ค 9 ซอง")],
  },
  // ── จัดส่งแล้ว (in transit) ──────────────────────────────────
  {
    id: "ORD-20260216-05133", shopName: "Organic Thai Farm", status: "shipping", date: "16 ก.พ. 2569 · 10:00 น.",
    trackingNumber: "TH123456789", recipient: DEFAULT_RECIPIENT, shippingMethod: "ส่งด่วนภายในวัน", paymentMethod: "บัตรเครดิต / เดบิต",
    items: [line("9", 1, "ขวด 2 รสคู่")],
  },
  {
    id: "ORD-20260215-05511", shopName: "METAHERB Store", status: "shipping", date: "15 ก.พ. 2569 · 19:30 น.",
    trackingNumber: "TH445566778", recipient: DEFAULT_RECIPIENT, shippingMethod: "Flash Express", paymentMethod: "PromptPay",
    items: [line("27", 2, "แก้ว 16 oz"), line("13", 1, "กล่อง 6 ชิ้น")],
  },
  // ── รับสินค้าแล้ว ────────────────────────────────────────────
  {
    id: "ORD-20260215-06244", shopName: "ธรรมชาติพรีเมียม", status: "delivered", date: "15 ก.พ. 2569 · 14:20 น.",
    trackingNumber: "TH987654321", recipient: DEFAULT_RECIPIENT, shippingMethod: "Flash Express", paymentMethod: "เก็บเงินปลายทาง",
    items: [line("29", 1, "ขวด 30 ml"), line("33", 1, "ขวด 30 ml")],
  },
  {
    id: "ORD-20260214-06701", shopName: "METAHERB Store", status: "delivered", date: "14 ก.พ. 2569 · 09:00 น.",
    trackingNumber: "TH998877665", recipient: DEFAULT_RECIPIENT, shippingMethod: "J&T Express", paymentMethod: "บัตรเครดิต / เดบิต",
    items: [line("17", 2, "ชิ้น"), line("16", 3, "ถ้วย")],
  },
  // ── สำเร็จ (รีวิวแล้ว) ───────────────────────────────────────
  {
    id: "ORD-20260210-07355", shopName: "METAHERB Store", status: "completed", date: "10 ก.พ. 2569 · 11:45 น.",
    trackingNumber: "TH555666777", recipient: DEFAULT_RECIPIENT, shippingMethod: "J&T Express", paymentMethod: "PromptPay",
    review: { rating: 5, comment: "สินค้าดี ส่งเร็ว แพ็คเกจสวย", shopRating: 5 },
    items: [line("1", 1, "ขวด 250 ml"), line("19", 1, "เซ็ตของขวัญ")],
  },
  {
    id: "ORD-20260208-07720", shopName: "บ้านสมุนไพรไทย", status: "completed", date: "8 ก.พ. 2569 · 13:10 น.",
    trackingNumber: "TH112233445", recipient: DEFAULT_RECIPIENT, shippingMethod: "Flash Express", paymentMethod: "โอนผ่านธนาคาร",
    review: { rating: 4, comment: "ของแท้ กลิ่นหอม คุ้มราคา", shopRating: 4 },
    items: [line("37", 2, "ขนาด 150 g")],
  },
  {
    id: "ORD-20260205-08010", shopName: "METAHERB Store", status: "completed", date: "5 ก.พ. 2569 · 10:25 น.",
    trackingNumber: "TH224466880", recipient: DEFAULT_RECIPIENT, shippingMethod: "J&T Express", paymentMethod: "PromptPay",
    review: { rating: 5, comment: "ชอบมาก ซื้อซ้ำแน่นอน", shopRating: 5 },
    items: [line("24", 1, "เซ็ตของขวัญ")],
  },
  // ── ยกเลิก ───────────────────────────────────────────────────
  {
    id: "ORD-20260208-08466", shopName: "สมุนไพรบ้านสวน", status: "cancelled", date: "8 ก.พ. 2569 · 16:30 น.",
    recipient: DEFAULT_RECIPIENT, shippingMethod: "Flash Express", paymentMethod: "PromptPay",
    items: [line("35", 1, "เม็ดแห้ง 100 g")],
  },
];

/** The demo buyer's order history — seeded into the shared table at app start. */
export const MOCK_ORDERS: Order[] = RAW_ORDERS.map((o) => ({
  ...o,
  userId: DEMO_USER.id,
  createdAt: parseThaiDateTime(o.date),
  total: o.items.reduce((sum, it) => sum + it.price * it.quantity, 0),
}));
