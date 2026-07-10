import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetQuotes,
  acceptQuote,
  createQuoteRequest,
  daysRemaining,
  effectiveQuoteStatus,
  nextQuoteId,
  quoteById,
  quoteTotal,
  quotesForShop,
  quotesForUser,
  rejectQuote,
  sendQuote,
  type CreateQuoteInput,
} from "./quotes";
import { __resetEvents, eventsFor } from "./events";

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;
const BUYER = "u-1";
const SHOP = "METAHERB Store";

const rfq = (over: Partial<CreateQuoteInput> = {}): CreateQuoteInput => ({
  userId: BUYER,
  shopName: SHOP,
  company: { name: "บริษัท เมต้าเฮิร์บ จำกัด", taxId: "0105566000000", address: "กรุงเทพฯ" },
  contact: { name: "ณัฐพงษ์", phone: "061-421-3111", email: "n@metaherb.app" },
  certificate: "Organic Thailand",
  neededBy: "ภายใน 30 วัน",
  items: [
    { materialId: "m-ginger", name: "ขิงแก่แห้ง", supplier: SHOP, qty: 100, unit: "กก.", price: 290 },
    { materialId: "m-cinnamon", name: "อบเชยซีลอน", supplier: SHOP, qty: 20, unit: "กก.", price: 880 },
  ],
  now: NOW,
  ...over,
});

beforeEach(() => {
  __resetQuotes();
  __resetEvents();
});

describe("the seam: an RFQ reaches the shop", () => {
  it("persists the request instead of flipping a `submitted` flag", () => {
    const q = createQuoteRequest(rfq());
    expect(q.status).toBe("requested");
    expect(quotesForUser(BUYER)).toHaveLength(1);
    // Both sides read the same row.
    expect(quotesForShop(SHOP)[0]).toBe(quotesForUser(BUYER)[0]);
  });

  it("mints ids in the shared QT- namespace", () => {
    expect(createQuoteRequest(rfq()).id).toMatch(/^QT-\d{4}-\d{4}$/);
    expect(nextQuoteId(NOW)).not.toBe(nextQuoteId(NOW));
  });

  it("totals qty × price across lines", () => {
    expect(quoteTotal(createQuoteRequest(rfq()))).toBe(100 * 290 + 20 * 880);
  });

  it("notifies the shop, not the buyer", () => {
    createQuoteRequest(rfq());
    expect(eventsFor("shop", { shopName: SHOP }).map((e) => e.type)).toEqual(["quote_requested"]);
    expect(eventsFor("customer", { userId: BUYER })).toHaveLength(0);
  });

  it("scopes by buyer and by shop", () => {
    createQuoteRequest(rfq());
    createQuoteRequest(rfq({ userId: "u-2" }));
    createQuoteRequest(rfq({ shopName: "กรีนลีฟ ออร์แกนิก" }));
    expect(quotesForUser(BUYER)).toHaveLength(2);
    expect(quotesForShop(SHOP)).toHaveLength(2);
  });
});

describe("the shop prices it, and the buyer sees the price", () => {
  it("overwrites only the lines the shop re-priced", () => {
    const { id } = createQuoteRequest(rfq());
    sendQuote(id, { prices: { "m-ginger": 260 }, validDays: 7, shopNote: "ราคาพิเศษครับ", now: NOW });

    const q = quoteById(id)!;
    expect(q.status).toBe("quoted");
    expect(q.items[0].price).toBe(260);
    expect(q.items[1].price).toBe(880); // untouched
    expect(q.shopNote).toBe("ราคาพิเศษครับ");
    expect(q.validUntil).toBe(NOW + 7 * DAY);
  });

  it("tells the buyer", () => {
    const { id } = createQuoteRequest(rfq());
    __resetEvents();
    sendQuote(id, { now: NOW });
    expect(eventsFor("customer", { userId: BUYER }).map((e) => e.type)).toEqual(["quote_sent"]);
  });

  it("refuses to quote anything that isn't awaiting a price", () => {
    const { id } = createQuoteRequest(rfq());
    sendQuote(id, { now: NOW });
    expect(sendQuote(id, { now: NOW })).toBeUndefined(); // already quoted
  });

  it("counts down the remaining validity", () => {
    const { id } = createQuoteRequest(rfq());
    sendQuote(id, { validDays: 10, now: NOW });
    expect(daysRemaining(quoteById(id)!, NOW)).toBe(10);
    expect(daysRemaining(quoteById(id)!, NOW + 9.5 * DAY)).toBe(1);
    expect(daysRemaining(quoteById(id)!, NOW + 20 * DAY)).toBe(0);
  });
});

describe("expiry", () => {
  it("reads as expired once the validity lapses, without a write", () => {
    const { id } = createQuoteRequest(rfq());
    sendQuote(id, { validDays: 3, now: NOW });
    const q = quoteById(id)!;
    expect(effectiveQuoteStatus(q, NOW + 2 * DAY)).toBe("quoted");
    expect(effectiveQuoteStatus(q, NOW + 4 * DAY)).toBe("expired");
    expect(q.status).toBe("quoted"); // the stored value is untouched
  });

  it("cannot be accepted or rejected after it lapses", () => {
    const { id } = createQuoteRequest(rfq());
    sendQuote(id, { validDays: 3, now: NOW });
    expect(acceptQuote(id, "PO-1", NOW + 4 * DAY)).toBeUndefined();
    expect(rejectQuote(id, "แพงไป", NOW + 4 * DAY)).toBeUndefined();
  });

  it("leaves a never-quoted request alone", () => {
    const q = createQuoteRequest(rfq());
    expect(effectiveQuoteStatus(q, NOW + 999 * DAY)).toBe("requested");
  });
});

describe("the buyer's answer reaches the shop", () => {
  it("accept records the PO number and notifies the shop", () => {
    const { id } = createQuoteRequest(rfq());
    sendQuote(id, { now: NOW });
    __resetEvents();
    acceptQuote(id, "PO-2569-0001", NOW + DAY);

    const q = quoteById(id)!;
    expect(q.status).toBe("accepted");
    expect(q.poNumber).toBe("PO-2569-0001");
    expect(eventsFor("shop", { shopName: SHOP }).map((e) => e.type)).toEqual(["quote_accepted"]);
  });

  it("reject carries the reason back to the shop", () => {
    const { id } = createQuoteRequest(rfq());
    sendQuote(id, { now: NOW });
    __resetEvents();
    rejectQuote(id, "ราคาสูงกว่างบ", NOW + DAY);
    expect(quoteById(id)!.status).toBe("rejected");
    expect(eventsFor("shop", { shopName: SHOP })[0].body).toContain("ราคาสูงกว่างบ");
  });

  it("cannot answer a request the shop has not priced yet", () => {
    const { id } = createQuoteRequest(rfq());
    expect(acceptQuote(id, undefined, NOW)).toBeUndefined();
    expect(rejectQuote(id, undefined, NOW)).toBeUndefined();
  });

  it("cannot be answered twice", () => {
    const { id } = createQuoteRequest(rfq());
    sendQuote(id, { now: NOW });
    acceptQuote(id, "PO-1", NOW + DAY);
    expect(rejectQuote(id, "เปลี่ยนใจ", NOW + 2 * DAY)).toBeUndefined();
  });
});
