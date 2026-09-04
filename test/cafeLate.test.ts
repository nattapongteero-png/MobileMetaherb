import { beforeEach, describe, expect, it } from "vitest";
import { __resetEvents, eventsFor } from "../src/store/events";
import { cafeStore, placeCafeOrder, flagLateCafeOrders } from "../src/store/cafe";

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
