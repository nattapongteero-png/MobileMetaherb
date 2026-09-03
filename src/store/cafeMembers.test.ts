import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetCafeMembers,
  addCafeMember,
  canRedeem,
  cafeMemberStore,
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

  it("earns one point per cup and logs why", () => {
    const m = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    expect(earnPoints(m.id, 3, "CAFE-1", NOW)).toBe(3);
    expect(memberById(m.id)?.points).toBe(3);
    const [t] = memberTxns(m.id);
    expect(t.delta).toBe(3);
    expect(t.reason).toBe("earn");
    expect(t.orderId).toBe("CAFE-1");
  });

  it("refuses to redeem before the card is full", () => {
    const m = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    earnPoints(m.id, 9, undefined, NOW);
    expect(canRedeem(memberById(m.id)!, undefined, NOW)).toBe(false);
    expect(redeemPoints(m.id, undefined, NOW)).toBe(false);
    expect(memberById(m.id)?.points).toBe(9);

    earnPoints(m.id, 1, undefined, NOW);
    expect(redeemPoints(m.id, "CAFE-2", NOW)).toBe(true);
    expect(memberById(m.id)?.points).toBe(0);
    expect(memberTxns(m.id)[0].delta).toBe(-10);
  });

  it("expires the card after a long absence, and starts clean on the next visit", () => {
    const m = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    earnPoints(m.id, 8, undefined, NOW);

    const muchLater = NOW + 400 * 86_400_000; // ~13 เดือน
    expect(usablePoints(memberById(m.id)!, undefined, muchLater)).toBe(0);
    expect(canRedeem(memberById(m.id)!, undefined, muchLater)).toBe(false);

    // Coming back earns from zero, not from the stale 8.
    earnPoints(m.id, 2, undefined, muchLater);
    expect(memberById(m.id)?.points).toBe(2);
  });

  it("stops earning when the programme is switched off", () => {
    const m = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    setCafePointRule({ enabled: false });
    expect(earnPoints(m.id, 5, undefined, NOW)).toBe(0);
    expect(memberById(m.id)?.points).toBe(0);
  });

  it("follows a changed rule", () => {
    setCafePointRule({ earnPerCup: 2, redeemAt: 6 });
    const m = addCafeMember({ phone: "0812345678", name: "มิค" }, NOW);
    earnPoints(m.id, 3, undefined, NOW); // 3 แก้ว × 2 = 6
    expect(memberById(m.id)?.points).toBe(6);
    expect(redeemPoints(m.id, undefined, NOW)).toBe(true);
    expect(memberById(m.id)?.points).toBe(0);
  });
});
