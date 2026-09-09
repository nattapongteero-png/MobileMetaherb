import { beforeEach, describe, expect, it } from "vitest";
import { __resetEvents, eventsFor } from "../src/store/events";
import { cafeStore, placeCafeOrder, flagLateCafeOrders, nextCafeQueueNo, cafeQueueEta, markCafeReady, cafeOrderById, cafeQueue } from "../src/store/cafe";

const NOW = new Date(2026, 8, 3, 10, 0).getTime();

describe("late café orders", () => {
  beforeEach(() => { __resetEvents(); cafeStore.reset([]); });

  it("flags an order past its promised time exactly once", () => {
    placeCafeOrder({
      orderId: "POS-late", userId: "u1", shopName: "METAHERB Store", payLabel: "เงินสด",
      receiveLabel: "รับที่ร้าน", items: [{ name: "Latte", qty: 1, summary: "", total: 70 }],
      total: 70, queueNo: 1, queueAhead: 0, waitMinutes: 5, readyAt: NOW + 5 * 60000,
    });
    expect(flagLateCafeOrders(NOW + 60000)).toBe(0);
    expect(flagLateCafeOrders(NOW + 9 * 60000)).toBe(1);
    expect(flagLateCafeOrders(NOW + 20 * 60000)).toBe(0);
    expect(eventsFor("shop").filter((e) => e.type === "cafe_order_late")).toHaveLength(1);
  });
});

describe("queue numbering", () => {
  it("hands the app and the till numbers from one running counter", () => {
    cafeStore.reset([]);
    const place = (orderId: string) =>
      placeCafeOrder({
        orderId,
        userId: "u1",
        shopName: "METAHERB Café",
        payLabel: "เงินสด",
        receiveLabel: "รับที่ร้าน",
        items: [{ name: "ลาเต้", qty: 1, summary: "", total: 65 }],
        total: 65,
        queueNo: nextCafeQueueNo(),
        queueAhead: 0,
        waitMinutes: 5,
        readyAt: Date.now() + 300000,
      });

    expect(place("CAFE1").queueNo).toBe(1);
    expect(place("POS-2").queueNo).toBe(2);
    expect(place("CAFE3").queueNo).toBe(3);
  });
});

describe("queue clock", () => {
  it("queues a new bill behind what the bar is still making", () => {
    cafeStore.reset([]);
    // Nothing in hand: the wait is just this bill's own เวลาทำ.
    expect(cafeQueueEta(6, NOW)).toEqual({ readyAt: NOW + 6 * 60000, waitMinutes: 6 });

    placeCafeOrder({
      orderId: "CAFE-ahead", userId: "u1", shopName: "METAHERB Café", payLabel: "เงินสด",
      receiveLabel: "รับที่ร้าน", items: [{ name: "ลาเต้", qty: 1, summary: "", total: 65 }],
      total: 65, queueNo: nextCafeQueueNo(), queueAhead: 0, waitMinutes: 6, readyAt: NOW + 6 * 60000,
    });
    // The next bill starts when that one finishes, so its wait is 6 + 4.
    expect(cafeQueueEta(4, NOW)).toEqual({ readyAt: NOW + 10 * 60000, waitMinutes: 10 });
  });
});

describe("re-timing the queue", () => {
  const place = (orderId: string, prepMinutes: number, at: number) => {
    const { readyAt, waitMinutes } = cafeQueueEta(prepMinutes, at);
    return placeCafeOrder({
      orderId, userId: "u1", shopName: "METAHERB Café", payLabel: "เงินสด",
      receiveLabel: "รับที่ร้าน", items: [{ name: "ลาเต้", qty: 1, summary: "", total: 65 }],
      total: 65, queueNo: nextCafeQueueNo(), queueAhead: 0, prepMinutes, waitMinutes, readyAt,
    });
  };

  it("moves the next order up when the one before it finishes early", () => {
    cafeStore.reset([]);
    place("Q1", 4, NOW);
    expect(place("Q2", 4, NOW).waitMinutes).toBe(8);

    // คิวแรกเสร็จที่นาทีที่ 2 — เร็วกว่าที่คาดไว้ 2 นาที
    markCafeReady("Q1", NOW + 2 * 60000);
    const q2 = cafeOrderById("Q2");
    expect(q2?.readyAt).toBe(NOW + 6 * 60000);
    expect(q2?.waitMinutes).toBe(4);
  });

  it("never pushes a promised time later when the bar is running behind", () => {
    cafeStore.reset([]);
    place("Q1", 4, NOW);
    place("Q2", 4, NOW);

    // คิวแรกเสร็จช้า — คิวที่สองยังยืนเวลาเดิมที่บอกลูกค้าไว้
    markCafeReady("Q1", NOW + 7 * 60000);
    expect(cafeOrderById("Q2")?.readyAt).toBe(NOW + 8 * 60000);
  });
});

describe("queue position", () => {
  it("recounts how many are ahead as the bar clears them", () => {
    cafeStore.reset([]);
    const mk = (orderId: string, prepMinutes: number) => {
      const { readyAt, waitMinutes } = cafeQueueEta(prepMinutes, NOW);
      const queueAhead = cafeQueue("METAHERB Café").filter((o) => o.status === "preparing").length;
      return placeCafeOrder({
        orderId, userId: "u1", shopName: "METAHERB Café", payLabel: "เงินสด",
        receiveLabel: "รับที่ร้าน", items: [{ name: "ลาเต้", qty: 1, summary: "", total: 65 }],
        total: 65, queueNo: nextCafeQueueNo(), queueAhead, prepMinutes, waitMinutes, readyAt,
      });
    };
    mk("P1", 4); mk("P2", 4);
    expect(mk("P3", 4).queueAhead).toBe(2);

    markCafeReady("P1", NOW + 60000);
    expect(cafeOrderById("P3")?.queueAhead).toBe(1);
    markCafeReady("P2", NOW + 120000);
    expect(cafeOrderById("P3")?.queueAhead).toBe(0);
  });
});
