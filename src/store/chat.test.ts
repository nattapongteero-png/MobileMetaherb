import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetChat,
  ensureThread,
  findThread,
  lastMessageOf,
  openThread,
  markThreadRead,
  messagesOf,
  sendMessage,
  threadById,
  threadsForShop,
  threadsForUser,
  unreadTotalForShop,
  unreadTotalForUser,
} from "./chat";
import { __resetEvents, eventsFor } from "./events";

const NOW = 1_700_000_000_000;
const BUYER = "u-1";
const SHOP = "METAHERB Store";

beforeEach(() => {
  __resetChat();
  __resetEvents();
  ensureThread("metaherb", BUYER, SHOP);
});

describe("the seam: what a buyer types reaches the shop", () => {
  it("puts the message in one thread both sides read", () => {
    sendMessage("metaherb", "user", "สินค้ามีพร้อมส่งไหมครับ", { now: NOW });
    expect(messagesOf("metaherb")).toHaveLength(1);
    expect(threadsForUser(BUYER)[0]).toBe(threadsForShop(SHOP)[0]);
  });

  it("badges the side that did not write it", () => {
    sendMessage("metaherb", "user", "สวัสดีครับ", { now: NOW });
    expect(unreadTotalForShop(SHOP)).toBe(1);
    expect(unreadTotalForUser(BUYER)).toBe(0);

    sendMessage("metaherb", "shop", "สวัสดีค่ะ", { now: NOW + 1 });
    expect(unreadTotalForUser(BUYER)).toBe(1);
    expect(unreadTotalForShop(SHOP)).toBe(1); // still unread for the shop
  });

  it("clears only the reader's badge when they open the thread", () => {
    sendMessage("metaherb", "user", "a", { now: NOW });
    sendMessage("metaherb", "shop", "b", { now: NOW + 1 });

    markThreadRead("metaherb", "shop");
    expect(unreadTotalForShop(SHOP)).toBe(0);
    expect(unreadTotalForUser(BUYER)).toBe(1);
  });

  it("notifies the other side, never the sender", () => {
    sendMessage("metaherb", "user", "ถามหน่อยครับ", { now: NOW });
    expect(eventsFor("shop", { shopName: SHOP }).map((e) => e.type)).toEqual(["chat_message"]);
    expect(eventsFor("customer", { userId: BUYER })).toHaveLength(0);

    __resetEvents();
    sendMessage("metaherb", "shop", "ได้เลยค่ะ", { now: NOW + 1 });
    expect(eventsFor("customer", { userId: BUYER }).map((e) => e.type)).toEqual(["chat_message"]);
    expect(eventsFor("shop", { shopName: SHOP })).toHaveLength(0);
  });
});

describe("messages", () => {
  it("render oldest-first regardless of insertion order", () => {
    sendMessage("metaherb", "user", "second", { now: NOW + 10 });
    sendMessage("metaherb", "shop", "first", { now: NOW });
    expect(messagesOf("metaherb").map((m) => m.text)).toEqual(["first", "second"]);
    expect(lastMessageOf("metaherb")!.text).toBe("second");
  });

  it("trims, and refuses an empty message", () => {
    expect(sendMessage("metaherb", "user", "   ", { now: NOW })).toBeUndefined();
    expect(sendMessage("metaherb", "user", "  hi  ", { now: NOW })!.text).toBe("hi");
    expect(unreadTotalForShop(SHOP)).toBe(1); // the empty one didn't badge anything
  });

  it("allows an image with no text", () => {
    const m = sendMessage("metaherb", "user", "", { image: "file://a.jpg", now: NOW });
    expect(m!.image).toBe("file://a.jpg");
    expect(eventsFor("shop", { shopName: SHOP })[0].body).toBe("ส่งรูปภาพ");
  });

  it("ignores an unknown thread", () => {
    expect(sendMessage("nope", "user", "hi")).toBeUndefined();
  });

  it("mints unique ids within the same millisecond", () => {
    const a = sendMessage("metaherb", "user", "a", { now: NOW })!;
    const b = sendMessage("metaherb", "user", "b", { now: NOW })!;
    expect(a.id).not.toBe(b.id);
  });
});

describe("opening a thread by shop name", () => {
  it("finds the existing thread instead of starting a second one", () => {
    const t = openThread(BUYER, SHOP);
    expect(t.id).toBe("metaherb");
    expect(threadsForUser(BUYER)).toHaveLength(1);
  });

  it("creates one on first contact with a shop the buyer has never messaged", () => {
    const t = openThread(BUYER, "กรีนลีฟ ออร์แกนิก");
    expect(t.shopName).toBe("กรีนลีฟ ออร์แกนิก");
    expect(threadsForUser(BUYER)).toHaveLength(2);
    // …and it is a different thread, not METAHERB's.
    expect(t.id).not.toBe("metaherb");
  });

  it("keeps two buyers' threads with the same shop apart", () => {
    const a = openThread(BUYER, "กรีนลีฟ ออร์แกนิก");
    const b = openThread("u-2", "กรีนลีฟ ออร์แกนิก");
    expect(a.id).not.toBe(b.id);
    expect(threadsForShop("กรีนลีฟ ออร์แกนิก")).toHaveLength(2);
    // Neither buyer can read the other's conversation.
    expect(threadsForUser(BUYER).map((t) => t.id)).not.toContain(b.id);
    expect(threadsForUser("u-2").map((t) => t.id)).toEqual([b.id]);
  });

  it("does not put one buyer's message in another buyer's thread", () => {
    const mine = openThread(BUYER, "กรีนลีฟ ออร์แกนิก");
    const theirs = openThread("u-2", "กรีนลีฟ ออร์แกนิก");
    sendMessage(theirs.id, "user", "ของคนอื่น", { now: NOW });
    expect(messagesOf(mine.id)).toHaveLength(0);
  });

  it("routes a message to the shop the buyer actually named", () => {
    openThread(BUYER, "กรีนลีฟ ออร์แกนิก");
    const t = findThread(BUYER, "กรีนลีฟ ออร์แกนิก")!;
    sendMessage(t.id, "user", "มีของไหมคะ", { now: NOW });
    expect(unreadTotalForShop("กรีนลีฟ ออร์แกนิก")).toBe(1);
    expect(unreadTotalForShop(SHOP)).toBe(0); // the old bug delivered this here
  });
});

describe("threads", () => {
  it("are created once per conversation", () => {
    const again = ensureThread("metaherb", BUYER, SHOP);
    expect(again).toBe(threadById("metaherb"));
    expect(threadsForUser(BUYER)).toHaveLength(1);
  });

  it("scope by buyer and by shop", () => {
    ensureThread("green", BUYER, "กรีนลีฟ ออร์แกนิก");
    ensureThread("other", "u-2", SHOP);
    expect(threadsForUser(BUYER)).toHaveLength(2);
    expect(threadsForShop(SHOP)).toHaveLength(2);
    expect(threadsForUser("u-2")).toHaveLength(1);
  });

  it("do not leak unread counts across shops", () => {
    ensureThread("green", BUYER, "กรีนลีฟ ออร์แกนิก");
    sendMessage("green", "user", "hi", { now: NOW });
    expect(unreadTotalForShop(SHOP)).toBe(0);
    expect(unreadTotalForShop("กรีนลีฟ ออร์แกนิก")).toBe(1);
  });
});
