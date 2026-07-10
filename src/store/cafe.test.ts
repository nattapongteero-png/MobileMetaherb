import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetCafe,
  activeCafeOrders,
  cafeHistory,
  cafeOrderById,
  cafeQueue,
  completeCafeOrder,
  markCafeReady,
  placeCafeOrder,
  queueAheadOf,
  rateCafeOrder,
  type PlaceCafeOrderInput,
} from "./cafe";
import { __resetEvents, eventsFor } from "./events";

const NOW = 1_700_000_000_000;
const BUYER = "u-1";
const SHOP = "METAHERB Store";

const order = (over: Partial<PlaceCafeOrderInput> = {}): PlaceCafeOrderInput => ({
  orderId: "CAFE0001",
  userId: BUYER,
  shopName: SHOP,
  payLabel: "พร้อมเพย์ (PromptPay)",
  receiveLabel: "รับที่ร้าน",
  items: [{ name: "ลาเต้ (ร้อน)", qty: 1, summary: "หวานน้อย", total: 75 }],
  total: 75,
  queueNo: 12,
  queueAhead: 0,
  waitMinutes: 5,
  readyAt: NOW + 5 * 60_000,
  ...over,
});

beforeEach(() => {
  __resetCafe();
  __resetEvents();
});

describe("the seam: a café order reaches the barista", () => {
  it("appears in the shop queue and the customer's active list", () => {
    placeCafeOrder(order());
    expect(cafeQueue(SHOP)).toHaveLength(1);
    expect(activeCafeOrders(BUYER)).toHaveLength(1);
    expect(cafeQueue(SHOP)[0]).toBe(activeCafeOrders(BUYER)[0]);
  });

  it("is idempotent per orderId", () => {
    placeCafeOrder(order());
    placeCafeOrder(order({ total: 999 }));
    expect(cafeQueue(SHOP)).toHaveLength(1);
    expect(cafeOrderById("CAFE0001")!.total).toBe(75);
  });

  it("notifies the shop with the queue number", () => {
    placeCafeOrder(order());
    const evs = eventsFor("shop", { shopName: SHOP });
    expect(evs.map((e) => e.type)).toEqual(["cafe_order_placed"]);
    expect(evs[0].body).toContain("#12");
  });

  it("sorts the barista's queue by queue number, not by insertion", () => {
    placeCafeOrder(order({ orderId: "A", queueNo: 30 }));
    placeCafeOrder(order({ orderId: "B", queueNo: 11 }));
    expect(cafeQueue(SHOP).map((o) => o.queueNo)).toEqual([11, 30]);
  });

  it("counts the orders genuinely ahead of a queue number", () => {
    placeCafeOrder(order({ orderId: "A", queueNo: 10 }));
    placeCafeOrder(order({ orderId: "B", queueNo: 11 }));
    expect(queueAheadOf(SHOP, 12)).toBe(2);
    expect(queueAheadOf(SHOP, 10)).toBe(0);

    // Handing one over shortens the queue for everyone behind it.
    completeCafeOrder("A");
    expect(queueAheadOf(SHOP, 12)).toBe(1);
  });
});

describe("the barista's actions reach the customer", () => {
  it("marking ready flips the customer's order and notifies them", () => {
    placeCafeOrder(order());
    markCafeReady("CAFE0001", NOW);

    expect(activeCafeOrders(BUYER)[0].status).toBe("ready");
    expect(cafeOrderById("CAFE0001")!.readyAtActual).toBe(NOW);
    expect(eventsFor("customer", { userId: BUYER }).map((e) => e.type)).toEqual(["cafe_order_ready"]);
  });

  it("cannot be marked ready twice", () => {
    placeCafeOrder(order());
    markCafeReady("CAFE0001");
    expect(markCafeReady("CAFE0001")).toBeUndefined();
  });

  it("handing it over moves it out of both queues and into history", () => {
    placeCafeOrder(order());
    markCafeReady("CAFE0001");
    completeCafeOrder("CAFE0001", NOW);

    expect(cafeQueue(SHOP)).toHaveLength(0);
    expect(activeCafeOrders(BUYER)).toHaveLength(0);
    expect(cafeHistory(BUYER).map((o) => o.orderId)).toEqual(["CAFE0001"]);
  });

  it("cannot hand over the same order twice", () => {
    placeCafeOrder(order());
    completeCafeOrder("CAFE0001");
    expect(completeCafeOrder("CAFE0001")).toBeUndefined();
  });

  it("shows history newest-first", () => {
    placeCafeOrder(order({ orderId: "A", queueNo: 1 }));
    placeCafeOrder(order({ orderId: "B", queueNo: 2 }));
    completeCafeOrder("A", NOW);
    completeCafeOrder("B", NOW + 1000);
    expect(cafeHistory(BUYER).map((o) => o.orderId)).toEqual(["B", "A"]);
  });
});

describe("reviews", () => {
  it("save onto the order and tell the shop", () => {
    placeCafeOrder(order());
    completeCafeOrder("CAFE0001");
    __resetEvents();

    rateCafeOrder("CAFE0001", 5, 4, "กาแฟหอมมากครับ");
    const o = cafeOrderById("CAFE0001")!;
    expect(o).toMatchObject({ ratingService: 5, ratingTaste: 4, comment: "กาแฟหอมมากครับ" });
    expect(eventsFor("shop", { shopName: SHOP }).map((e) => e.type)).toEqual(["cafe_order_rated"]);
  });

  it("ignores an unknown order", () => {
    expect(rateCafeOrder("nope", 5, 5, "")).toBeUndefined();
  });
});

describe("scoping", () => {
  it("does not leak another buyer's order into this buyer's lists", () => {
    placeCafeOrder(order({ orderId: "A", userId: "u-2" }));
    expect(activeCafeOrders(BUYER)).toHaveLength(0);
    expect(cafeQueue(SHOP)).toHaveLength(1); // but the barista still makes it
  });
});
