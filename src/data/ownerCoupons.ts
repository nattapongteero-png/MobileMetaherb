/* ============================================================================
 *  In-memory store for owner "คูปอง" (coupons), ported 1:1 from the web
 *  OwnerDashboard (CouponsTab + CreateCouponModal). Mirrors the promotions store
 *  shape: a useSyncExternalStore hook + imperative mutators, seeded with
 *  mockCoupons. Not persisted across reloads (mockup).
 *
 *  NOTE: named `ownerCoupons` (not `coupons`) because `src/data/coupons.ts` is
 *  already the buyer-side "My Coupons" store — this is the seller/owner console.
 *  ========================================================================== */
import { useSyncExternalStore } from "react";

export type CouponStatus = "active" | "expired" | "disabled";
export type CouponDiscountType = "percent" | "baht" | "freeship";

export type Coupon = {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number; // % หรือ ฿ (ไม่ใช้กับ freeship)
  maxDiscount?: number; // ฿ — สูงสุด (เฉพาะ %)
  minOrder?: number; // ฿
  usageLimit?: number; // 0 = ไม่จำกัด
  perUserLimit?: number; // ต่อคน
  startsAt: string; // ISO
  endsAt: string; // ISO
  membersOnly?: boolean;
  firstOrderOnly?: boolean;
  used: number;
  status: CouponStatus; // override (default คำนวณจากวันที่)
};

const _couponDay = (offset: number, h = 0, m = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const mockCoupons: Coupon[] = [
  // ── ใช้งานอยู่ (active) ──
  {
    id: "a1", code: "WELCOME10", name: "ลด 10% สำหรับสมาชิกใหม่",
    description: "ใช้กับคำสั่งซื้อแรกเท่านั้น", discountType: "percent", discountValue: 10,
    maxDiscount: 100, minOrder: 300, usageLimit: 500, perUserLimit: 1,
    startsAt: _couponDay(-3, 0, 0), endsAt: _couponDay(27, 23, 59),
    membersOnly: true, firstOrderOnly: true,
    used: 87, status: "active",
  },
  {
    id: "a2", code: "SUMMER50", name: "ลด 50 บาท ทันที",
    description: "ลดราคาสินค้าเมื่อช้อปครบ 500 บาท", discountType: "baht", discountValue: 50,
    minOrder: 500, usageLimit: 200, perUserLimit: 2,
    startsAt: _couponDay(-7, 0, 0), endsAt: _couponDay(14, 23, 59),
    used: 42, status: "active",
  },
  {
    id: "a3", code: "FREESHIP100", name: "ส่งฟรี ขั้นต่ำ 100 บาท",
    discountType: "freeship", discountValue: 0,
    minOrder: 100, usageLimit: 0, perUserLimit: 3,
    startsAt: _couponDay(-1, 0, 0), endsAt: _couponDay(60, 23, 59),
    used: 156, status: "active",
  },
  {
    id: "a4", code: "HERB15", name: "ลด 15% สมุนไพรทุกชนิด",
    discountType: "percent", discountValue: 15,
    maxDiscount: 200, minOrder: 0, usageLimit: 1000, perUserLimit: 5,
    startsAt: _couponDay(-2, 9, 0), endsAt: _couponDay(7, 23, 59),
    used: 234, status: "active",
  },
  // ── หมดอายุ (expired) ──
  {
    id: "e1", code: "FR001", name: "ส่งฟรีไม่มีขั้นต่ำ",
    discountType: "freeship", discountValue: 0,
    minOrder: 0, usageLimit: 0, perUserLimit: 1,
    startsAt: _couponDay(-50, 11, 41), endsAt: _couponDay(-30, 23, 59),
    used: 3, status: "expired",
  },
  {
    id: "e2", code: "SP100", name: "ลด 100 บาท",
    discountType: "baht", discountValue: 100,
    minOrder: 500, usageLimit: 100, perUserLimit: 1,
    startsAt: _couponDay(-50, 11, 13), endsAt: _couponDay(-30, 23, 59),
    used: 1, status: "expired",
  },
  // ── ปิดใช้งาน (disabled) ──
  {
    id: "d1", code: "TRYME20", name: "ลด 20% ทดลองรหัส",
    description: "คูปองทดลอง — ปิดใช้งานชั่วคราว", discountType: "percent", discountValue: 20,
    maxDiscount: 150, minOrder: 200, usageLimit: 50, perUserLimit: 1,
    startsAt: _couponDay(-5, 0, 0), endsAt: _couponDay(20, 23, 59),
    used: 12, status: "disabled",
  },
];

/** Thai Buddhist-year date-time formatter (e.g. "3 ก.ค. 2569 09:00"). */
export function fmtCouponThaiDateTime(iso: string): string {
  const d = new Date(iso);
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Discount label + color: freeship=blue "ส่งฟรี", percent="N%" green, baht="฿N" green. */
export function fmtCouponDiscount(c: Coupon): { label: string; color: string } {
  if (c.discountType === "freeship") return { label: "ส่งฟรี", color: "#3b82f6" }; // ฟ้า
  if (c.discountType === "percent") return { label: `${c.discountValue}%`, color: "#319754" }; // เขียว
  return { label: `฿${c.discountValue}`, color: "#319754" }; // เขียว
}

/** Derived status — explicit "disabled" override wins, else expired by endsAt, else active. */
export function computedCouponStatus(c: Coupon): CouponStatus {
  if (c.status === "disabled") return "disabled";
  if (c.endsAt && new Date(c.endsAt).getTime() < Date.now()) return "expired";
  return "active";
}

/* ── in-memory store (mirrors promotions) ── */
let coupons: Coupon[] = [...mockCoupons];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function addCoupon(c: Coupon) {
  coupons = [c, ...coupons];
  emit();
}

export function updateCoupon(c: Coupon) {
  coupons = coupons.map((x) => (x.id === c.id ? c : x));
  emit();
}

export function removeCoupon(id: string) {
  coupons = coupons.filter((x) => x.id !== id);
  emit();
}

/** Flip disabled ↔ active (matches the web ⋯ menu behavior). */
export function toggleCoupon(id: string) {
  coupons = coupons.map((x) => (x.id === id ? { ...x, status: x.status === "disabled" ? "active" : "disabled" } : x));
  emit();
}

/** Non-hook snapshot — for one-off reads (e.g. prefilling the edit form). */
export function getCouponById(id: string): Coupon | undefined {
  return coupons.find((c) => c.id === id);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Live list of all coupons (re-renders on add / update / remove / toggle). */
export function useAllCoupons(): Coupon[] {
  return useSyncExternalStore(subscribe, () => coupons, () => coupons);
}
