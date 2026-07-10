import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetOrders,
  cancelOrder,
  createOrder,
  formatThaiDateTime,
  decideCancellation,
  markDelivered,
  markPaid,
  orderById,
  parseThaiDateTime,
  ordersForShop,
  ordersForUser,
  requestCancellation,
  seedOrders,
  shipOrder,
  submitOrderReview,
  verifyPayment,
} from "./orders";
import { __resetEvents, eventsFor, eventsStore } from "./events";
import { __resetStock, seedStock, stockOf } from "./stock";
import type { Order, OrderItem, Recipient } from "./types";

const SHOP = "METAHERB Store";
const BUYER = "u-1";

const RECIPIENT: Recipient = {
  name: "ณัฐพงษ์ ธีโรภาส",
  phone: "061-421-3111",
  address: "เลขที่ 2 ซอยสุขสวัสดิ์ 33 เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140",
};

const item = (productId: string, quantity: number, price = 100): OrderItem => ({
  productId,
  name: `สินค้า ${productId}`,
  option: "ขนาดมาตรฐาน",
  quantity,
  price,
});

function place(items = [item("1", 2)]) {
  const res = createOrder({ userId: BUYER, shopName: SHOP, items, recipient: RECIPIENT });
  if (!res.ok) throw new Error(`expected order to be created, got ${res.reason}`);
  return res.order;
}

beforeEach(() => {
  __resetOrders();
  __resetEvents();
  __resetStock();
  seedStock({ "1": 20, "9": 3 }); // "1" plentiful, "9" nearly out
});

describe("the seam: a buyer's order reaches the seller", () => {
  it("puts one order in both the buyer's list and the shop's list", () => {
    const order = place();

    expect(ordersForUser(BUYER).map((o) => o.id)).toEqual([order.id]);
    expect(ordersForShop(SHOP).map((o) => o.id)).toEqual([order.id]);
    // Same row, not two copies.
    expect(ordersForUser(BUYER)[0]).toBe(ordersForShop(SHOP)[0]);
  });

  it("mints an id in the shared ORD- namespace, not the old MH- one", () => {
    expect(place().id).toMatch(/^ORD-\d{8}-\d{5}$/);
  });

  it("scopes orders by buyer and by shop", () => {
    place();
    createOrder({ userId: "u-2", shopName: SHOP, items: [item("1", 1)], recipient: RECIPIENT });
    createOrder({ userId: BUYER, shopName: "กรีนลีฟ ออร์แกนิก", items: [item("1", 1)], recipient: RECIPIENT });

    expect(ordersForUser(BUYER)).toHaveLength(2);
    expect(ordersForShop(SHOP)).toHaveLength(2);
  });

  it("totals from unit price × quantity", () => {
    expect(place([item("1", 3, 250)]).total).toBe(750);
  });

  it("honours an explicit total (shipping + coupon applied at checkout)", () => {
    const res = createOrder({
      userId: BUYER,
      shopName: SHOP,
      items: [item("1", 2, 100)],
      recipient: RECIPIENT,
      total: 235, // 200 + 50 shipping − 15 coupon
    });
    expect(res.ok && res.order.total).toBe(235);
  });
});

describe("the full lifecycle, buyer ⇄ seller", () => {
  it("walks pending_payment → completed and the shop's writes are visible to the buyer", () => {
    const { id } = place();
    expect(orderById(id)!.status).toBe("pending_payment");

    markPaid(id); // buyer uploads slip
    expect(orderById(id)!.status).toBe("pending_verify");

    verifyPayment(id); // shop confirms
    expect(orderById(id)!.status).toBe("preparing");

    shipOrder(id, "TH1234567890"); // shop ships
    // The buyer reads the very same row — this is the assertion that used to be impossible.
    const asBuyer = ordersForUser(BUYER).find((o) => o.id === id)!;
    expect(asBuyer.status).toBe("shipping");
    expect(asBuyer.trackingNumber).toBe("TH1234567890");

    markDelivered(id);
    expect(orderById(id)!.status).toBe("delivered");

    submitOrderReview(id, { rating: 5, comment: "ดีมากครับ", shopRating: 5 });
    const done = orderById(id)!;
    expect(done.status).toBe("completed");
    expect(done.review!.rating).toBe(5);
    // And the shop sees the review on its copy.
    expect(ordersForShop(SHOP).find((o) => o.id === id)!.review!.rating).toBe(5);
  });

  it("refuses illegal jumps", () => {
    const { id } = place();
    expect(shipOrder(id, "TH1")).toBeUndefined(); // can't ship before paying
    expect(orderById(id)!.status).toBe("pending_payment");
    expect(submitOrderReview(id, { rating: 5, comment: "" })).toBeUndefined();
    expect(markDelivered(id)).toBeUndefined();
  });

  it("cannot cancel an order that already arrived", () => {
    const { id } = place();
    markPaid(id);
    verifyPayment(id);
    shipOrder(id, "TH1");
    markDelivered(id);
    expect(cancelOrder(id, { by: "shop" })).toBeUndefined();
    expect(orderById(id)!.status).toBe("delivered");
  });
});

describe("stock is really taken and really returned", () => {
  it("decrements on purchase", () => {
    place([item("1", 5)]);
    expect(stockOf("1")).toBe(15);
  });

  it("refuses to oversell and leaves stock untouched", () => {
    const res = createOrder({ userId: BUYER, shopName: SHOP, items: [item("9", 4)], recipient: RECIPIENT });
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.reason).toBe("out_of_stock");
    expect(res.ok === false && res.shortfall).toEqual([{ productId: "9", quantity: 4 }]);
    expect(stockOf("9")).toBe(3); // unchanged
    expect(ordersForShop(SHOP)).toHaveLength(0); // and no order was created
  });

  it("rolls the whole order back when only one line is short", () => {
    const res = createOrder({
      userId: BUYER,
      shopName: SHOP,
      items: [item("1", 2), item("9", 99)],
      recipient: RECIPIENT,
    });
    expect(res.ok).toBe(false);
    expect(stockOf("1")).toBe(20); // the fulfillable line was not silently taken
  });

  it("returns stock when the order is cancelled", () => {
    const { id } = place([item("1", 6)]);
    expect(stockOf("1")).toBe(14);
    cancelOrder(id, { by: "shop", reason: "สินค้าหมด" });
    expect(stockOf("1")).toBe(20);
  });

  it("leaves untracked products unlimited", () => {
    expect(createOrder({ userId: BUYER, shopName: SHOP, items: [item("999", 1000)], recipient: RECIPIENT }).ok).toBe(true);
  });
});

describe("buyer-requested cancellation waits on the shop", () => {
  it("holds stock while pending, releases it on approval", () => {
    const { id } = place([item("1", 4)]);
    markPaid(id);
    verifyPayment(id);

    requestCancellation(id, "สั่งผิดขนาด");
    expect(orderById(id)!.cancellationStatus).toBe("pending");
    expect(orderById(id)!.status).toBe("preparing"); // still live
    expect(stockOf("1")).toBe(16); // still reserved

    decideCancellation(id, true);
    expect(orderById(id)!.status).toBe("cancelled");
    expect(stockOf("1")).toBe(20);
  });

  it("restores the prior status when the shop denies", () => {
    const { id } = place();
    markPaid(id);
    verifyPayment(id);
    requestCancellation(id, "เปลี่ยนใจ");

    decideCancellation(id, false);
    const o = orderById(id)!;
    expect(o.status).toBe("preparing");
    expect(o.cancellationStatus).toBe("denied");
    expect(o.previousStatus).toBeUndefined();
  });
});

describe("notifications come from real events", () => {
  it("tells the shop about a new order and the buyer about the shipment", () => {
    const { id } = place();
    expect(eventsFor("shop", { shopName: SHOP }).map((e) => e.type)).toContain("order_placed");
    expect(eventsFor("customer", { userId: BUYER })).toHaveLength(0); // nothing to tell the buyer yet

    markPaid(id);
    verifyPayment(id);
    shipOrder(id, "TH9");

    const forBuyer = eventsFor("customer", { userId: BUYER });
    expect(forBuyer.map((e) => e.type)).toEqual(["order_shipped", "order_verified"]); // newest first
    expect(forBuyer[0].body).toContain("TH9");
  });

  it("does not leak another buyer's events", () => {
    createOrder({ userId: "u-2", shopName: SHOP, items: [item("1", 1)], recipient: RECIPIENT });
    const other = ordersForUser("u-2")[0];
    markPaid(other.id);
    verifyPayment(other.id);

    expect(eventsFor("customer", { userId: BUYER })).toHaveLength(0);
    expect(eventsFor("customer", { userId: "u-2" })).toHaveLength(1);
  });

  it("warns the shop when a purchase drops a product to the low-stock line", () => {
    place([item("9", 1)]); // 3 → 2, under the threshold
    expect(eventsFor("shop", { shopName: SHOP }).map((e) => e.type)).toContain("stock_low");
  });

  it("routes a cancellation to whichever side did not do it", () => {
    const a = place();
    cancelOrder(a.id, { by: "customer", reason: "สั่งซ้ำ" });
    expect(eventsFor("shop", { shopName: SHOP }).some((e) => e.type === "order_cancelled")).toBe(true);
    expect(eventsFor("customer", { userId: BUYER }).some((e) => e.type === "order_cancelled")).toBe(false);

    __resetEvents();
    const b = place();
    cancelOrder(b.id, { by: "shop", reason: "ของหมด" });
    expect(eventsFor("customer", { userId: BUYER }).some((e) => e.type === "order_cancelled")).toBe(true);
  });
});

describe("Thai date round-trip (the seeds' sort key)", () => {
  it("parses both separators the seed rows use", () => {
    // "·" in the buyer rows, "-" in the old seller rows.
    const a = parseThaiDateTime("4 ก.พ. 2569 · 08:12 น.");
    const b = parseThaiDateTime("4 ก.พ. 2569 - 08:12 น.");
    expect(a).toBe(b);
    expect(new Date(a).getFullYear()).toBe(2026); // 2569 BE
    expect(new Date(a).getMonth()).toBe(1); // ก.พ. = February
    expect(new Date(a).getHours()).toBe(8);
  });

  it("orders February after January, as the seed list assumes", () => {
    expect(parseThaiDateTime("4 ก.พ. 2569 · 08:12 น.")).toBeGreaterThan(
      parseThaiDateTime("31 ม.ค. 2569 · 13:05 น."),
    );
  });

  it("survives a format round-trip", () => {
    const s = "16 ก.พ. 2569 · 10:00 น.";
    expect(formatThaiDateTime(parseThaiDateTime(s))).toBe(s);
  });

  it("falls back rather than producing NaN on garbage", () => {
    expect(parseThaiDateTime("ไม่ใช่วันที่", 42)).toBe(42);
    expect(parseThaiDateTime("1 XX 2569 · 10:00 น.", 7)).toBe(7);
  });
});

describe("seeding", () => {
  it("sorts seeded rows newest-first regardless of input order", () => {
    const mk = (id: string, createdAt: number): Order => ({
      id,
      userId: BUYER,
      shopName: SHOP,
      status: "completed",
      date: "",
      createdAt,
      items: [item("1", 1)],
      total: 100,
      recipient: RECIPIENT,
    });
    seedOrders([mk("old", 1000), mk("new", 3000), mk("mid", 2000)]);
    expect(ordersForUser(BUYER).map((o) => o.id)).toEqual(["new", "mid", "old"]);
  });

  it("keeps the event log empty (seeding is not an event)", () => {
    seedOrders([]);
    expect(eventsStore.get()).toHaveLength(0);
  });
});
