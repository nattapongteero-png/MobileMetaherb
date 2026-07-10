// Seed rows for the single coupon table (src/store/coupons.ts).
//
// Merges what used to be three hardcoded arrays: the owner console's
// `mockCoupons`, the checkout picker's `CHECKOUT_COUPONS`, and the buyer
// wallet's `COUPONS`. Shop-scoped coupons carry `shopName`; platform-wide ones
// leave it undefined.

import type { Coupon } from "../store/coupons";
import { METAHERB_SHOP } from "./shopOrders";

const day = (offset: number, h = 0, m = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const TEAL = "#00bfa5";
const GREEN = "#319754";
const PURPLE = "#9c27b0";

export const SEED_COUPONS: Coupon[] = [
  // ── METAHERB Store's own coupons (the owner console's list) ──
  {
    id: "a1", code: "WELCOME10", name: "ลด 10% สำหรับสมาชิกใหม่",
    description: "ใช้กับคำสั่งซื้อแรกเท่านั้น", discountType: "percent", discountValue: 10,
    maxDiscount: 100, minOrder: 300, usageLimit: 500, perUserLimit: 1,
    startsAt: day(-3), endsAt: day(27, 23, 59),
    membersOnly: true, firstOrderOnly: true,
    used: 87, status: "active", shopName: METAHERB_SHOP, color: PURPLE,
  },
  {
    id: "a2", code: "SUMMER50", name: "ลด 50 บาท ทันที",
    description: "ลดราคาสินค้าเมื่อช้อปครบ 500 บาท", discountType: "baht", discountValue: 50,
    minOrder: 500, usageLimit: 200, perUserLimit: 2,
    startsAt: day(-7), endsAt: day(14, 23, 59),
    used: 42, status: "active", shopName: METAHERB_SHOP, color: GREEN,
  },
  {
    id: "a3", code: "FREESHIP100", name: "ส่งฟรี ขั้นต่ำ 100 บาท",
    discountType: "freeship", discountValue: 0,
    minOrder: 100, usageLimit: 0, perUserLimit: 3,
    startsAt: day(-1), endsAt: day(60, 23, 59),
    used: 156, status: "active", shopName: METAHERB_SHOP, color: TEAL,
  },
  {
    id: "a4", code: "HERB15", name: "ลด 15% สมุนไพรทุกชนิด",
    discountType: "percent", discountValue: 15,
    maxDiscount: 200, minOrder: 0, usageLimit: 1000, perUserLimit: 5,
    startsAt: day(-2, 9), endsAt: day(7, 23, 59),
    used: 234, status: "active", shopName: METAHERB_SHOP, color: GREEN,
  },
  {
    id: "e1", code: "FR001", name: "ส่งฟรีไม่มีขั้นต่ำ",
    discountType: "freeship", discountValue: 0,
    minOrder: 0, usageLimit: 0, perUserLimit: 1,
    startsAt: day(-50, 11, 41), endsAt: day(-30, 23, 59),
    used: 3, status: "expired", shopName: METAHERB_SHOP, color: TEAL,
  },
  {
    id: "e2", code: "SP100", name: "ลด 100 บาท",
    discountType: "baht", discountValue: 100,
    minOrder: 500, usageLimit: 100, perUserLimit: 1,
    startsAt: day(-50, 11, 13), endsAt: day(-30, 23, 59),
    used: 1, status: "expired", shopName: METAHERB_SHOP, color: GREEN,
  },
  {
    id: "d1", code: "TRYME20", name: "ลด 20% ทดลองรหัส",
    description: "คูปองทดลอง — ปิดใช้งานชั่วคราว", discountType: "percent", discountValue: 20,
    maxDiscount: 150, minOrder: 200, usageLimit: 50, perUserLimit: 1,
    startsAt: day(-5), endsAt: day(20, 23, 59),
    used: 12, status: "disabled", shopName: METAHERB_SHOP, color: GREEN,
  },

  // ── Platform-wide (usable at any shop) ──
  {
    id: "p1", code: "MH30OFF", name: "ส่วนลด ฿30",
    discountType: "baht", discountValue: 30, minOrder: 150, perUserLimit: 1,
    startsAt: day(-10), endsAt: day(45, 23, 59),
    used: 0, status: "active", color: GREEN,
  },
  {
    id: "p2", code: "MH27PCT", name: "ส่วนลด 27% สูงสุด ฿1,000",
    discountType: "percent", discountValue: 27, maxDiscount: 1000, minOrder: 500, perUserLimit: 1,
    startsAt: day(-10), endsAt: day(45, 23, 59),
    used: 0, status: "active", color: GREEN,
  },
  {
    id: "p3", code: "FREESHIP01", name: "ส่งฟรี",
    discountType: "freeship", discountValue: 0, minOrder: 0, perUserLimit: 2,
    startsAt: day(-1), endsAt: day(1, 23, 59),
    used: 0, status: "active", color: TEAL,
  },
  {
    id: "p4", code: "FREESHIP07", name: "ส่งฟรี",
    discountType: "freeship", discountValue: 0, minOrder: 0, perUserLimit: 2,
    startsAt: day(-1), endsAt: day(0, 23, 59),
    used: 0, status: "active", color: TEAL,
  },
  {
    id: "p5", code: "VIP50", name: "ส่วนลด 50% สูงสุด ฿100",
    discountType: "percent", discountValue: 50, maxDiscount: 100, minOrder: 199, perUserLimit: 1,
    membersOnly: true,
    startsAt: day(-1), endsAt: day(1, 23, 59),
    used: 0, status: "active", color: PURPLE,
  },

  // ── Another shop's coupon — proves shop scoping actually bites ──
  {
    id: "s1", code: "BANHERB20", name: "ส่วนลด ฿20",
    discountType: "baht", discountValue: 20, minOrder: 100, perUserLimit: 1,
    startsAt: day(-5), endsAt: day(60, 23, 59),
    used: 0, status: "active", shopName: "บ้านสมุนไพรไทย", color: GREEN,
  },
];

/** Coupons the demo buyer has already collected — their starting wallet. */
export const SEED_WALLET: Record<string, string[]> = {
  "u-1": ["p1", "p2", "p3", "p4", "a3", "s1"],
};
