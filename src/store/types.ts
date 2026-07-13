/**
 * Domain types shared by the customer app and the shop console.
 *
 * Before this file the two sides had *different* Order types, different status
 * enums and different id namespaces, so nothing a buyer did could ever be seen
 * by the seller. There is now exactly one Order.
 */

/** RN `require()` handle on native, `{uri}` on web. Never persisted. */
export type ImageRef = number | { uri: string };

/**
 * The single order lifecycle. Merged from the old customer enum
 * (pending_payment → pending_verify → preparing → shipped → delivered → completed)
 * and the old shop enum (… → ready_ship → shipping → shipped).
 *
 * The clash: the shop's "shipped" meant *delivered*, while the customer's
 * "shipped" meant *in transit*. Resolved by naming the in-transit state
 * `shipping` and the arrival state `delivered`. Each side keeps its own
 * Thai label map, so no on-screen copy changes.
 */
export type OrderStatus =
  | "pending_payment" // รอชำระเงิน
  | "pending_verify" // รอตรวจสอบสลิป
  | "preparing" // กำลังจัดเตรียม (ร้าน: พร้อมจัดส่ง)
  | "shipping" // กำลังจัดส่ง (ลูกค้า: จัดส่งแล้ว)
  | "delivered" // รับสินค้าแล้ว (ร้าน: ส่งสำเร็จ)
  | "completed" // สำเร็จ — รีวิวแล้ว
  | "cancelled"; // ยกเลิก

/** Forward transitions the shop may drive. Guards the state machine. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["pending_verify", "cancelled"],
  pending_verify: ["preparing", "pending_payment", "cancelled"],
  preparing: ["shipping", "cancelled"],
  shipping: ["delivered", "cancelled"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUS[from].includes(to);
}

/**
 * One order line. `price` is the **unit** price — line total is `price * quantity`.
 * (The old shop type stored a line total here; the shop view adapter multiplies.)
 * `image` is derived from `productId` at read time and is never persisted.
 */
export type OrderItem = {
  productId: string;
  name: string;
  option: string;
  quantity: number;
  price: number;
  image?: ImageRef;
};

export type Recipient = {
  name: string;
  phone: string;
  /** Full delivery address on one line. */
  address: string;
};

export type OrderReview = {
  /** Overall rating (average of per-product ratings). */
  rating: number;
  comment: string;
  /** Stars given to the shop itself. */
  shopRating?: number;
  anonymous?: boolean;
  reviewerName?: string;
  reviewedAt?: string;
  products?: { name: string; rating: number; comment: string; photos: string[] }[];
};

export type Order = {
  id: string;
  /** Buyer. Customer surfaces filter on this. */
  userId: string;
  /** Seller. The shop console filters on this. */
  shopName: string;
  status: OrderStatus;
  /** Display date, e.g. "4 ก.พ. 2569 · 08:12 น." */
  date: string;
  /** Epoch ms — the sort key (display `date` is not sortable). */
  createdAt: number;
  items: OrderItem[];
  total: number;
  recipient: Recipient;
  trackingNumber?: string;
  shippingMethod?: string;
  paymentMethod?: string;
  /** Buyer's note to the shop. */
  note?: string;
  review?: OrderReview;
  // ── cancellation ─────────────────────────────────────────────
  cancelReason?: string;
  cancelNote?: string;
  cancelledBy?: "shop" | "customer";
  /** A buyer-requested cancellation waits on the shop's decision. */
  cancellationStatus?: "pending" | "approved" | "denied";
  /** Restored when the shop denies a cancellation request. */
  previousStatus?: OrderStatus;
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

// ── Label maps: one status set, two vocabularies ────────────────
export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "รอชำระเงิน",
  pending_verify: "รอตรวจสอบ",
  preparing: "กำลังจัดเตรียม",
  shipping: "จัดส่งแล้ว",
  delivered: "รับสินค้าแล้ว",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก",
};

export const CUSTOMER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment: "#f97316",
  pending_verify: "#0ea5e9",
  preparing: "#a855f7",
  shipping: "#319754",
  delivered: "#0d9488",
  completed: "#16a34a",
  cancelled: "#9ca3af",
};

export const orderSubtotal = (o: Pick<Order, "items">): number =>
  o.items.reduce((s, it) => s + it.price * it.quantity, 0);
