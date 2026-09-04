import { beforeEach, describe, expect, it } from "vitest";
import { __resetEvents, eventsFor } from "./events";
import {
  __resetCafeMembers,
  addCafeMember,
  canRedeem,
  cafeMemberStore,
  cafePointRule,
  DEFAULT_CAFE_POINT_RULE,
  earnPoints,
  memberByPhone,
  memberById,
  memberTxns,
  redeemPoints,
  setCafePointRule,
  usablePoints,
} from "./cafeMembers";

const NOW = new Date(2026, 8, 2, 10, 0).getTime();

describe("cafeMembers store", () => {
  beforeEach(() => __resetCafeMembers());

  it("finds a member however the cashier typed the phone", () => {
    addCafeMember({ phone: "081-234-5678", name: "มิค" }, NOW);
    expect(memberByPhone("0812345678")?.name).toBe("มิค");
    expect(memberByPhone("081 234 5678")?.name).toBe("มิค");
  });

  it("keeps one member per phone", () => {
    const a = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    const b = addCafeMember({ phone: "081-234-5678", name: "มิคซ้ำ" }, NOW);
    expect(b.id).toBe(a.id);
    expect(cafeMemberStore.get().members).toHaveLength(1);
  });

  it("earns one point per visit and logs why", () => {
    const m = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    expect(earnPoints(m.id, "CAFE-1", NOW)).toBe(1);
    expect(memberById(m.id)?.points).toBe(1);
    const [t] = memberTxns(m.id);
    expect(t.delta).toBe(1);
    expect(t.reason).toBe("earn");
    expect(t.orderId).toBe("CAFE-1");
  });

  it("counts a three-cup bill as one visit, not three", () => {
    const m = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    // One receipt with three drinks on it — still a single stamp.
    earnPoints(m.id, "CAFE-3CUPS", NOW);
    expect(memberById(m.id)?.points).toBe(1);
    // Three separate visits are what earn three.
    earnPoints(m.id, "CAFE-B", NOW);
    earnPoints(m.id, "CAFE-C", NOW);
    expect(memberById(m.id)?.points).toBe(3);
  });

  it("refuses to redeem before the card is full", () => {
    const m = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    for (let i = 0; i < 9; i += 1) earnPoints(m.id, undefined, NOW);
    expect(canRedeem(memberById(m.id)!, undefined, NOW)).toBe(false);
    expect(redeemPoints(m.id, undefined, NOW)).toBe(false);
    expect(memberById(m.id)?.points).toBe(9);

    earnPoints(m.id, undefined, NOW);
    expect(redeemPoints(m.id, "CAFE-2", NOW)).toBe(true);
    expect(memberById(m.id)?.points).toBe(0);
    expect(memberTxns(m.id)[0].delta).toBe(-10);
  });

  it("expires the card after a long absence, and starts clean on the next visit", () => {
    const m = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    for (let i = 0; i < 8; i += 1) earnPoints(m.id, undefined, NOW);

    const muchLater = NOW + 400 * 86_400_000; // ~13 เดือน
    expect(usablePoints(memberById(m.id)!, undefined, muchLater)).toBe(0);
    expect(canRedeem(memberById(m.id)!, undefined, muchLater)).toBe(false);

    // Coming back earns from zero, not from the stale 8.
    earnPoints(m.id, undefined, muchLater);
    earnPoints(m.id, undefined, muchLater);
    expect(memberById(m.id)?.points).toBe(2);
  });

  it("stops earning when the programme is switched off", () => {
    const m = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    setCafePointRule({ enabled: false });
    expect(earnPoints(m.id, undefined, NOW)).toBe(0);
    expect(memberById(m.id)?.points).toBe(0);
  });

  it("tells the shop when a free cup is claimed", () => {
    __resetEvents();
    const m = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    for (let i = 0; i < 10; i += 1) earnPoints(m.id, undefined, NOW);
    expect(redeemPoints(m.id, "POS-1", NOW)).toBe(true);
    const feed = eventsFor("shop").filter((e) => e.type === "cafe_points_redeemed");
    expect(feed).toHaveLength(1);
    expect(feed[0].orderId).toBe("POS-1");
  });

  it("fills in a rule saved by an older build", () => {
    // The per-cup ancestor of earnPerVisit, as it would come back from storage.
    cafeMemberStore.reset({ members: [], txns: [], rule: { earnPerCup: 2, redeemAt: 6 } as never });
    const rule = cafePointRule();
    expect(rule.earnPerVisit).toBe(2);
    expect(rule.maxRedeemPrice).toBe(DEFAULT_CAFE_POINT_RULE.maxRedeemPrice);
    expect(rule.enabled).toBe(true);
  });

  it("follows a changed rule", () => {
    setCafePointRule({ earnPerVisit: 2, redeemAt: 6 });
    const m = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    for (let i = 0; i < 3; i += 1) earnPoints(m.id, undefined, NOW); // 3 ครั้ง × 2 = 6
    expect(memberById(m.id)?.points).toBe(6);
    expect(redeemPoints(m.id, undefined, NOW)).toBe(true);
    expect(memberById(m.id)?.points).toBe(0);
  });
});
