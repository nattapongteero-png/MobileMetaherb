import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetEvents,
  emit,
  eventsFor,
  isRead,
  markAllEventsRead,
  markEventRead,
  timeAgo,
  unreadCount,
} from "./events";

const NOW = 1_700_000_000_000;
const BUYER = "u-1";
const SHOP = "METAHERB Store";

const both = () =>
  emit({
    type: "order_delivered",
    audience: ["customer", "shop"],
    at: NOW,
    userId: BUYER,
    shopName: SHOP,
    title: "จัดส่งสำเร็จ",
    body: "ถึงมือผู้รับแล้ว",
  });

beforeEach(() => {
  __resetEvents();
});

describe("read receipts are per-audience", () => {
  it("marking read for the buyer leaves the shop's copy unread", () => {
    const e = both();
    markEventRead(e.id, "customer");

    const asCustomer = eventsFor("customer", { userId: BUYER })[0];
    const asShop = eventsFor("shop", { shopName: SHOP })[0];
    expect(isRead(asCustomer, "customer")).toBe(true);
    expect(isRead(asShop, "shop")).toBe(false);
    // Still one row, not two.
    expect(asCustomer).toBe(asShop);
  });

  it("counts unread per audience", () => {
    both();
    emit({ type: "order_placed", audience: ["shop"], at: NOW, shopName: SHOP, title: "ใหม่", body: "" });
    expect(unreadCount("customer", { userId: BUYER })).toBe(1);
    expect(unreadCount("shop", { shopName: SHOP })).toBe(2);
  });

  it("mark-all only touches the caller's audience and scope", () => {
    both();
    emit({ type: "order_shipped", audience: ["customer"], at: NOW, userId: "u-2", title: "ส่งแล้ว", body: "" });

    markAllEventsRead("customer", { userId: BUYER });
    expect(unreadCount("customer", { userId: BUYER })).toBe(0);
    expect(unreadCount("customer", { userId: "u-2" })).toBe(1); // other buyer untouched
    expect(unreadCount("shop", { shopName: SHOP })).toBe(1); // shop copy untouched
  });

  it("ignores an unknown id", () => {
    both();
    markEventRead("nope", "customer");
    expect(unreadCount("customer", { userId: BUYER })).toBe(1);
  });
});

describe("the log", () => {
  it("is newest-first", () => {
    emit({ type: "order_placed", audience: ["shop"], at: NOW, shopName: SHOP, title: "เก่า", body: "" });
    emit({ type: "order_paid", audience: ["shop"], at: NOW + 1, shopName: SHOP, title: "ใหม่", body: "" });
    expect(eventsFor("shop", { shopName: SHOP }).map((e) => e.title)).toEqual(["ใหม่", "เก่า"]);
  });

  it("mints unique ids for events emitted in the same millisecond", () => {
    const a = emit({ type: "order_placed", audience: ["shop"], at: NOW, title: "a", body: "" });
    const b = emit({ type: "order_placed", audience: ["shop"], at: NOW, title: "b", body: "" });
    expect(a.id).not.toBe(b.id);
    expect(a.id.startsWith("ev-")).toBe(true);
  });

  it("does not deliver a shop event to the customer feed", () => {
    emit({ type: "stock_low", audience: ["shop"], at: NOW, shopName: SHOP, title: "ใกล้หมด", body: "" });
    expect(eventsFor("customer", { userId: BUYER })).toHaveLength(0);
  });
});

describe("relative timestamps", () => {
  const MIN = 60_000;
  it("reads naturally across the ranges", () => {
    expect(timeAgo(NOW, NOW)).toBe("เมื่อสักครู่");
    expect(timeAgo(NOW - 5 * MIN, NOW)).toBe("5 นาทีที่แล้ว");
    expect(timeAgo(NOW - 3 * 60 * MIN, NOW)).toBe("3 ชม. ที่แล้ว");
    expect(timeAgo(NOW - 25 * 60 * MIN, NOW)).toBe("เมื่อวานนี้");
    expect(timeAgo(NOW - 3 * 24 * 60 * MIN, NOW)).toBe("3 วันที่แล้ว");
  });

  it("never reads as being in the future", () => {
    expect(timeAgo(NOW + 10_000, NOW)).toBe("เมื่อสักครู่");
  });
});
