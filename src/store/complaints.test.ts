import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetComplaints,
  complaintById,
  complaintForOrder,
  complaintsForShop,
  complaintsForUser,
  decideComplaint,
  fileComplaint,
  isDecided,
  nextComplaintId,
  setComplaintNote,
  type FileComplaintInput,
} from "./complaints";
import { __resetEvents, eventsFor } from "./events";

const NOW = 1_700_000_000_000;
const BUYER = "u-1";
const SHOP = "METAHERB Store";

const input = (over: Partial<FileComplaintInput> = {}): FileComplaintInput => ({
  userId: BUYER,
  shopName: SHOP,
  orderId: "ORD-20260710-00001",
  customer: "ณัฐพงษ์ ธีโรภาส",
  customerEmail: "nattapong.t@gmail.com",
  customerPhone: "061-421-3111",
  type: "damaged",
  product: "น้ำผึ้งมะนาว",
  description: "ขวดแตกระหว่างขนส่ง",
  amount: 500,
  refundChannel: "ธนาคารกสิกรไทย [*8821]",
  createdAt: "10 ก.ค. 2569",
  items: [{ productId: "1", name: "น้ำผึ้งมะนาว", option: "250 ml", qty: 2, price: 250, image: 1 }],
  evidence: [{ source: { uri: "file://photo.jpg" } }],
  now: NOW,
  ...over,
});

beforeEach(() => {
  __resetComplaints();
  __resetEvents();
});

describe("filing a case", () => {
  it("opens it as pending, with the first timeline entry stamped", () => {
    const c = fileComplaint(input());
    expect(c.status).toBe("pending");
    expect(c.history).toEqual([{ status: "pending", at: NOW }]);
    expect(c.id).toMatch(/^DSP-\d{8}-\d{3}$/);
  });

  it("is visible to the buyer who filed it and to the shop it names", () => {
    const c = fileComplaint(input());
    expect(complaintsForUser(BUYER).map((x) => x.id)).toEqual([c.id]);
    expect(complaintsForShop(SHOP).map((x) => x.id)).toEqual([c.id]);
    // Same row, not a copy.
    expect(complaintsForUser(BUYER)[0]).toBe(complaintsForShop(SHOP)[0]);
  });

  it("does not leak into another buyer's list", () => {
    fileComplaint(input());
    expect(complaintsForUser("u-2")).toHaveLength(0);
  });

  it("is findable from the order it was filed against", () => {
    const c = fileComplaint(input());
    expect(complaintForOrder(BUYER, "ORD-20260710-00001")!.id).toBe(c.id);
    expect(complaintForOrder(BUYER, "ORD-other")).toBeUndefined();
    expect(complaintForOrder("u-2", "ORD-20260710-00001")).toBeUndefined();
  });

  it("notifies the shop, not the buyer", () => {
    fileComplaint(input());
    expect(eventsFor("shop", { shopName: SHOP }).map((e) => e.type)).toEqual(["complaint_filed"]);
    expect(eventsFor("customer", { userId: BUYER })).toHaveLength(0);
  });

  it("mints unique ids", () => {
    expect(nextComplaintId(NOW)).not.toBe(nextComplaintId(NOW));
  });
});

describe("the return leg: the shop's decision reaches the buyer", () => {
  it("appends to the timeline the buyer's status screen renders", () => {
    const { id } = fileComplaint(input());
    decideComplaint(id, "acknowledged", { now: NOW + 1000 });
    decideComplaint(id, "refund_partial", { refundAmount: 140, note: "คืนบางส่วนครับ", now: NOW + 2000 });

    const c = complaintById(id)!;
    expect(c.status).toBe("refund_partial");
    expect(c.refundAmount).toBe(140);
    expect(c.note).toBe("คืนบางส่วนครับ");
    expect(c.history.map((h) => h.status)).toEqual(["pending", "acknowledged", "refund_partial"]);
  });

  it("tells the buyer, not the shop", () => {
    const { id } = fileComplaint(input());
    __resetEvents();
    decideComplaint(id, "refund_full", { now: NOW + 1000 });
    expect(eventsFor("customer", { userId: BUYER }).map((e) => e.type)).toEqual(["complaint_decided"]);
    expect(eventsFor("shop", { shopName: SHOP })).toHaveLength(0);
  });

  it("does not double-stamp when the same status is set twice", () => {
    const { id } = fileComplaint(input());
    decideComplaint(id, "acknowledged", { now: NOW + 1 });
    decideComplaint(id, "acknowledged", { now: NOW + 2 });
    expect(complaintById(id)!.history).toHaveLength(2);
  });

  it("keeps the earlier refund amount when a later decision omits it", () => {
    const { id } = fileComplaint(input());
    decideComplaint(id, "refund_partial", { refundAmount: 140 });
    decideComplaint(id, "rejected");
    expect(complaintById(id)!.refundAmount).toBe(140);
  });

  it("ignores an unknown id", () => {
    expect(decideComplaint("nope", "refund_full")).toBeUndefined();
  });

  it("lets the shop leave a note without changing the status", () => {
    const { id } = fileComplaint(input());
    setComplaintNote(id, "กำลังตรวจสอบกับขนส่งครับ");
    const c = complaintById(id)!;
    expect(c.note).toBe("กำลังตรวจสอบกับขนส่งครับ");
    expect(c.status).toBe("pending");
    expect(c.history).toHaveLength(1);
  });
});

describe("which statuses close a case", () => {
  it("treats the three refund/reject outcomes as decided", () => {
    expect(isDecided("refund_full")).toBe(true);
    expect(isDecided("refund_partial")).toBe(true);
    expect(isDecided("rejected")).toBe(true);
    expect(isDecided("pending")).toBe(false);
    expect(isDecided("acknowledged")).toBe(false);
  });
});
