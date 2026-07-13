import { beforeEach, describe, expect, it } from "vitest";
import { matchesShopTab, shopDisplayStatus, toShopOrder } from "../data/shopOrderView";
import {
  __resetOrders,
  createOrder,
  markPaid,
  orderById,
  ordersForShop,
  requestCancellation,
  shipOrder,
  verifyPayment,
} from "./orders";
import { __resetEvents } from "./events";
import { __resetStock, seedStock } from "./stock";
import type { Order } from "./types";

const SHOP = "METAHERB Store";

const base = (over: Partial<Order> = {}): Order => ({
  id: "ORD-1",
  userId: "u-1",
  shopName: SHOP,
  status: "preparing",
  date: "4 ก.พ. 2569 · 08:12 น.",
  createdAt: 1,
  total: 500,
  recipient: { name: "คุณสมชาย ใจดี", phone: "081-234-5678", address: "88/12 กรุงเทพฯ" },
  items: [{ productId: "1", name: "น้ำผึ้งมะนาว", option: "150 g", quantity: 2, price: 250 }],
  ...over,
});

beforeEach(() => {
  __resetOrders();
  __resetEvents();
  __resetStock();
  seedStock({ "1": 50 });
});

describe("the seller's projection of a shared order", () => {
  it("flattens the recipient into the console's flat fields", () => {
    const v = toShopOrder(base());
    expect(v.customer).toBe("คุณสมชาย ใจดี");
    expect(v.phone).toBe("081-234-5678");
    expect(v.address).toBe("88/12 กรุงเทพฯ");
  });

  it("converts the unit price into the line total the console prints", () => {
    // The table stores 250 × 2; the console's `orderTotal` sums `price` directly.
    const v = toShopOrder(base());
    expect(v.items[0]).toMatchObject({ qty: 2, price: 500 });
    expect(v.items.reduce((s, it) => s + it.price, 0)).toBe(500);
  });

  it("rebuilds per-item review rows and drops unrated lines", () => {
    const v = toShopOrder(
      base({
        status: "completed",
        items: [
          { productId: "1", name: "a", option: "", quantity: 1, price: 10 },
          { productId: "2", name: "b", option: "", quantity: 1, price: 10 },
        ],
        review: {
          rating: 4,
          comment: "ดี",
          shopRating: 4,
          reviewerName: "คุณชลธิชา",
          reviewedAt: "31 ม.ค. 2569",
          products: [
            { name: "a", rating: 5, comment: "หอมมาก", photos: [] },
            { name: "b", rating: 0, comment: "", photos: [] }, // not rated
          ],
        },
      }),
    );
    expect(v.reviewScore).toBe(4);
    expect(v.review!.items).toEqual([{ itemIndex: 0, rating: 5, comment: "หอมมาก" }]);
  });

  it("hides an anonymous reviewer's name from the seller", () => {
    const v = toShopOrder(
      base({ status: "completed", review: { rating: 5, comment: "", anonymous: true, reviewerName: "ณัฐพงษ์" } }),
    );
    expect(v.review!.reviewerName).toBe("ลูกค้า");
  });

  it("files a pending cancellation request under ยกเลิก without cancelling it", () => {
    const o = base({ status: "preparing", cancellationStatus: "pending" });
    expect(shopDisplayStatus(o)).toBe("cancelled"); // what the console shows
    expect(o.status).toBe("preparing"); // what is actually true
  });
});

describe("shop filter tabs", () => {
  it("collects delivered and reviewed orders under ส่งสำเร็จ", () => {
    expect(matchesShopTab("delivered", "delivered")).toBe(true);
    expect(matchesShopTab("completed", "delivered")).toBe(true);
    expect(matchesShopTab("shipping", "delivered")).toBe(false);
  });

  it("matches everything under ทั้งหมด", () => {
    expect(matchesShopTab("cancelled", "all")).toBe(true);
  });
});

describe("end-to-end through the projection", () => {
  it("a buyer's checkout appears in the seller's console and the seller's shipment reaches the buyer", () => {
    const res = createOrder({
      userId: "u-1",
      shopName: SHOP,
      items: [{ productId: "1", name: "น้ำผึ้งมะนาว", option: "150 g", quantity: 2, price: 250 }],
      recipient: { name: "ณัฐพงษ์ ธีโรภาส", phone: "061-421-3111", address: "กรุงเทพฯ" },
    });
    expect(res.ok).toBe(true);
    const id = res.ok ? res.order.id : "";

    // Seller sees it, rendered in their own shape.
    const [seen] = ordersForShop(SHOP).map(toShopOrder);
    expect(seen.id).toBe(id);
    expect(seen.customer).toBe("ณัฐพงษ์ ธีโรภาส");
    expect(seen.status).toBe("pending_payment");

    markPaid(id);
    verifyPayment(id);
    shipOrder(id, "TH-777");

    // …and the buyer's row carries the tracking number.
    expect(orderById(id)!.trackingNumber).toBe("TH-777");
    expect(ordersForShop(SHOP).map(toShopOrder)[0].status).toBe("shipping");
  });

  it("a buyer's cancellation request shows as ยกเลิก to the seller while staying live", () => {
    const res = createOrder({
      userId: "u-1",
      shopName: SHOP,
      items: [{ productId: "1", name: "x", option: "", quantity: 1, price: 10 }],
      recipient: { name: "n", phone: "p", address: "a" },
    });
    const id = res.ok ? res.order.id : "";
    markPaid(id);
    verifyPayment(id);
    requestCancellation(id, "สั่งผิด");

    expect(ordersForShop(SHOP).map(toShopOrder)[0].status).toBe("cancelled");
    expect(orderById(id)!.status).toBe("preparing");
  });
});
