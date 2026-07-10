/**
 * The seller's view of the shared orders table.
 *
 * The console was built against its own `ShopOrder` shape (flat `customer` /
 * `phone` / `address`, `qty` instead of `quantity`, and a line *total* in
 * `price`). Rather than rewrite ~6k lines of MyShopScreen, that shape is now a
 * read-only projection of the single `Order` row — so the console renders
 * unchanged while reading the same data the buyer writes.
 */
import { useStore } from "../store/db";
import { ordersForShop, ordersStore } from "../store/orders";
import type { Order, OrderStatus } from "../store/types";

export type { OrderStatus };

/** Status pill bg + footer note tag (exact web values from statusConfig). */
export const ORDER_STATUS_CFG: Record<
  OrderStatus,
  { label: string; pillBg: string; note: string; noteColor: string }
> = {
  pending_payment: { label: "รอชำระเงิน", pillBg: "#ff8d28", note: "ยังไม่ชำระเงิน", noteColor: "#ff9500" },
  pending_verify: { label: "รอตรวจสอบ", pillBg: "#ff9500", note: "รอร้านตรวจสอบ", noteColor: "#ff9500" },
  preparing: { label: "พร้อมจัดส่ง", pillBg: "#007aff", note: "พร้อมส่งให้ลูกค้า", noteColor: "#007aff" },
  shipping: { label: "กำลังจัดส่ง", pillBg: "#319754", note: "ระหว่างจัดส่ง", noteColor: "#319754" },
  delivered: { label: "ส่งสำเร็จ", pillBg: "#10b981", note: "ส่งสำเร็จแล้ว", noteColor: "#10b981" },
  completed: { label: "สำเร็จ", pillBg: "#16a34a", note: "ลูกค้ารีวิวแล้ว", noteColor: "#16a34a" },
  cancelled: { label: "ยกเลิก", pillBg: "#ff3b30", note: "ยกเลิกแล้ว", noteColor: "#ff3b30" },
};

export type ShopOrderItem = { name: string; option: string; qty: number; price: number; image: number };

export type ShopOrder = {
  id: string;
  status: OrderStatus;
  date: string;
  customer: string;
  phone: string;
  address: string;
  shippingMethod: string;
  trackingNumber?: string;
  reviewScore?: number;
  paymentMethod?: string;
  note?: string;
  cancelReason?: string;
  cancelNote?: string;
  cancelledBy?: "shop" | "customer";
  cancellationStatus?: "pending" | "approved" | "denied";
  previousStatus?: OrderStatus;
  review?: {
    reviewerName: string;
    reviewedAt: string;
    shopRating: number;
    items: { itemIndex: number; rating: number; comment: string }[];
  };
  items: ShopOrderItem[];
};

/**
 * An order awaiting the shop's verdict on a cancellation request still files
 * under "ยกเลิก" in the console, even though it is technically still live.
 */
export function shopDisplayStatus(o: Order): OrderStatus {
  return o.cancellationStatus === "pending" ? "cancelled" : o.status;
}

export function toShopOrder(o: Order): ShopOrder {
  return {
    id: o.id,
    status: shopDisplayStatus(o),
    date: o.date,
    customer: o.recipient.name,
    phone: o.recipient.phone,
    address: o.recipient.address,
    shippingMethod: o.shippingMethod ?? "จัดส่งปกติ",
    trackingNumber: o.trackingNumber,
    reviewScore: o.review?.rating,
    paymentMethod: o.paymentMethod,
    note: o.note,
    cancelReason: o.cancelReason,
    cancelNote: o.cancelNote,
    cancelledBy: o.cancelledBy,
    cancellationStatus: o.cancellationStatus,
    previousStatus: o.previousStatus,
    review: o.review
      ? {
          reviewerName: o.review.anonymous ? "ลูกค้า" : o.review.reviewerName ?? o.recipient.name,
          reviewedAt: o.review.reviewedAt ?? "",
          shopRating: o.review.shopRating ?? o.review.rating,
          // Per-item ratings are stored parallel to `items`; drop unrated lines.
          items: (o.review.products ?? [])
            .map((p, itemIndex) => ({ itemIndex, rating: p.rating, comment: p.comment }))
            .filter((r) => r.rating > 0),
        }
      : undefined,
    // The console prints a line total here, the table stores a unit price.
    items: o.items.map((it) => ({
      name: it.name,
      option: it.option,
      qty: it.quantity,
      price: it.price * it.quantity,
      image: it.image as number,
    })),
  };
}

/** "ส่งสำเร็จ" covers both delivered and reviewed orders. */
export function matchesShopTab(status: OrderStatus, tab: "all" | OrderStatus): boolean {
  if (tab === "all") return true;
  if (tab === "delivered") return status === "delivered" || status === "completed";
  return status === tab;
}

/** The shop's raw orders — analytics needs `createdAt` and `status`, which the
 *  ShopOrder projection flattens away. */
export function useShopOrderRows(shopName: string): Order[] {
  useStore(ordersStore); // subscribe
  return ordersForShop(shopName);
}

/** Live seller view. Re-renders whenever a buyer places or updates an order. */
export function useShopOrders(shopName: string): ShopOrder[] {
  useStore(ordersStore); // subscribe
  return ordersForShop(shopName).map(toShopOrder);
}

export function useShopOrder(shopName: string, id: string | undefined): ShopOrder | undefined {
  return useShopOrders(shopName).find((o) => o.id === id);
}
