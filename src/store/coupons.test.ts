import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetCoupons,
  addCoupon,
  canApply,
  collectCoupon,
  collectibleCoupons,
  couponDiscount,
  couponsForShop,
  effectiveStatus,
  hasCollected,
  redeemCoupon,
  seedCoupons,
  toggleCoupon,
  walletCoupons,
  type Coupon,
} from "./coupons";

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;
const BUYER = "u-1";
const SHOP = "METAHERB Store";

const coupon = (over: Partial<Coupon> = {}): Coupon => ({
  id: "c1",
  code: "SAVE50",
  name: "ลด 50 บาท",
  discountType: "baht",
  discountValue: 50,
  minOrder: 300,
  startsAt: new Date(NOW - DAY).toISOString(),
  endsAt: new Date(NOW + DAY).toISOString(),
  used: 0,
  status: "active",
  ...over,
});

beforeEach(() => {
  __resetCoupons();
});

describe("discount maths", () => {
  it("gives flat baht off, never more than the subtotal", () => {
    expect(couponDiscount(coupon(), 500)).toBe(50);
    expect(couponDiscount(coupon({ minOrder: 0, discountValue: 900 }), 500)).toBe(500);
  });

  it("caps a percent coupon at maxDiscount", () => {
    const c = coupon({ discountType: "percent", discountValue: 50, maxDiscount: 100, minOrder: 0 });
    expect(couponDiscount(c, 100)).toBe(50);
    expect(couponDiscount(c, 1000)).toBe(100); // 500 → capped
  });

  it("gives nothing below the minimum spend", () => {
    expect(couponDiscount(coupon({ minOrder: 300 }), 299)).toBe(0);
  });

  it("discounts nothing for a free-shipping coupon (it waives the carrier fee instead)", () => {
    expect(couponDiscount(coupon({ discountType: "freeship", minOrder: 0 }), 1000)).toBe(0);
  });
});

describe("status", () => {
  it("expires by end date", () => {
    const c = coupon({ endsAt: new Date(NOW - DAY).toISOString() });
    expect(effectiveStatus(c, NOW)).toBe("expired");
  });

  it("expires once the global usage limit is reached", () => {
    expect(effectiveStatus(coupon({ usageLimit: 2, used: 2 }), NOW)).toBe("expired");
    expect(effectiveStatus(coupon({ usageLimit: 2, used: 1 }), NOW)).toBe("active");
  });

  it("lets an explicit disable win over the dates", () => {
    expect(effectiveStatus(coupon({ status: "disabled" }), NOW)).toBe("disabled");
  });
});

describe("the seam: a shop-created coupon reaches the buyer", () => {
  beforeEach(() => {
    seedCoupons([]);
    addCoupon(coupon({ id: "shop1", code: "MH50", shopName: SHOP }));
    addCoupon(coupon({ id: "plat1", code: "ALL30", discountValue: 30 })); // platform-wide
  });

  it("shows in the shop console alongside platform-wide coupons", () => {
    expect(couponsForShop(SHOP).map((c) => c.id).sort()).toEqual(["plat1", "shop1"]);
    expect(couponsForShop("กรีนลีฟ ออร์แกนิก").map((c) => c.id)).toEqual(["plat1"]);
  });

  it("is collectible by the buyer, then lands in their wallet", () => {
    expect(collectibleCoupons(BUYER, NOW).map((c) => c.id).sort()).toEqual(["plat1", "shop1"]);
    expect(walletCoupons(BUYER)).toHaveLength(0);

    collectCoupon(BUYER, "shop1");
    expect(hasCollected(BUYER, "shop1")).toBe(true);
    expect(walletCoupons(BUYER).map((c) => c.id)).toEqual(["shop1"]);
    // …and it drops out of the collectible list.
    expect(collectibleCoupons(BUYER, NOW).map((c) => c.id)).toEqual(["plat1"]);
  });

  it("collects idempotently", () => {
    collectCoupon(BUYER, "shop1");
    collectCoupon(BUYER, "shop1");
    expect(walletCoupons(BUYER)).toHaveLength(1);
  });

  it("refuses to collect a coupon that does not exist", () => {
    expect(collectCoupon(BUYER, "nope")).toBe(false);
  });

  it("hides a disabled coupon from the collect page but keeps it in the console", () => {
    toggleCoupon("shop1");
    expect(collectibleCoupons(BUYER, NOW).map((c) => c.id)).toEqual(["plat1"]);
    expect(couponsForShop(SHOP)).toHaveLength(2);
  });
});

describe("applying a coupon at checkout", () => {
  beforeEach(() => {
    seedCoupons([]);
    addCoupon(coupon({ id: "shop1", shopName: SHOP, minOrder: 300 }));
    addCoupon(coupon({ id: "plat1", minOrder: 0 }));
  });

  it("requires the buyer to have collected it first", () => {
    expect(canApply(coupon({ id: "plat1", minOrder: 0 }), { userId: BUYER, subtotal: 500, now: NOW })).toBe(false);
    collectCoupon(BUYER, "plat1");
    expect(canApply(coupon({ id: "plat1", minOrder: 0 }), { userId: BUYER, subtotal: 500, now: NOW })).toBe(true);
  });

  it("requires a line from the coupon's shop", () => {
    collectCoupon(BUYER, "shop1");
    const c = coupon({ id: "shop1", shopName: SHOP, minOrder: 300 });
    expect(canApply(c, { userId: BUYER, subtotal: 500, shops: ["กรีนลีฟ ออร์แกนิก"], now: NOW })).toBe(false);
    expect(canApply(c, { userId: BUYER, subtotal: 500, shops: [SHOP], now: NOW })).toBe(true);
  });

  it("enforces the minimum spend", () => {
    collectCoupon(BUYER, "shop1");
    const c = coupon({ id: "shop1", shopName: SHOP, minOrder: 300 });
    expect(canApply(c, { userId: BUYER, subtotal: 299, shops: [SHOP], now: NOW })).toBe(false);
  });

  it("enforces the per-user limit after redemption", () => {
    collectCoupon(BUYER, "plat1");
    const c = coupon({ id: "plat1", minOrder: 0, perUserLimit: 1 });
    expect(canApply(c, { userId: BUYER, subtotal: 500, now: NOW })).toBe(true);
    redeemCoupon(BUYER, "plat1");
    expect(canApply(c, { userId: BUYER, subtotal: 500, now: NOW })).toBe(false);
  });

  it("counts redemptions toward the shop's global usage limit", () => {
    collectCoupon(BUYER, "plat1");
    redeemCoupon(BUYER, "plat1");
    redeemCoupon("u-2", "plat1");
    expect(couponsForShop(SHOP).find((c) => c.id === "plat1")!.used).toBe(2);
  });

  it("does not leak one buyer's wallet into another's", () => {
    collectCoupon(BUYER, "plat1");
    expect(walletCoupons("u-2")).toHaveLength(0);
  });
});
