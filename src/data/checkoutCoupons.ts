// Coupons applied at checkout — ticket-style, mirroring the web / My-Coupons
// card design. Distinct from the wallet coupons in `coupons.ts`.
export type CheckoutCouponType = "discount" | "freeship";

export type CheckoutCoupon = {
  code: string;
  type: CheckoutCouponType;
  /** Section header in the picker. */
  group: string;
  // --- discount math ---
  /** Flat THB off (type "discount"). */
  discount?: number;
  /** Percent off (type "discount") — capped by maxDiscount. */
  percent?: number;
  maxDiscount?: number;
  /** Shop name for shop coupons; omitted for platform-wide. */
  shop?: string;
  /** Order subtotal (THB) required to use this coupon. */
  minSpendValue: number;
  // --- ticket display ---
  label: string; // big stub text (e.g. "FREE", "MH")
  sublabel: string; // small stub text
  title: string;
  minSpend: string;
  tag?: string;
  tagColor?: string;
  expiry: string;
  bgColor: string; // stub colour
};

const TEAL = "#00bfa5";
const GREEN = "#319754";

export const CHECKOUT_COUPONS: CheckoutCoupon[] = [
  // ส่งฟรี
  { code: "FREESHIP01", minSpendValue: 0, type: "freeship", group: "ส่งฟรี", label: "FREE", sublabel: "โค้ดส่งฟรี", title: "ส่งฟรี", minSpend: "ขั้นต่ำ ฿0", tag: "ส่งด่วน", tagColor: TEAL, expiry: "ใช้ได้ในอีก 1 วัน", bgColor: TEAL },
  { code: "FREESHIP07", minSpendValue: 0, type: "freeship", group: "ส่งฟรี", label: "FREE", sublabel: "โค้ดส่งฟรี", title: "ส่งฟรี", minSpend: "ขั้นต่ำ ฿0", tag: "ส่งด่วน", tagColor: TEAL, expiry: "ใช้ได้ในอีก 12 ชั่วโมง", bgColor: TEAL },
  // ส่วนลด
  { code: "MH30OFF", minSpendValue: 150, type: "discount", group: "ส่วนลด", discount: 30, label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด ฿30", minSpend: "ขั้นต่ำ ฿150", tag: "ทุกร้านค้า", tagColor: GREEN, expiry: "ใช้ได้ถึง 25.03.2026", bgColor: GREEN },
  { code: "MH27PCT", minSpendValue: 500, type: "discount", group: "ส่วนลด", percent: 27, maxDiscount: 1000, label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด 27% ลดสูงสุด ฿1,000", minSpend: "ขั้นต่ำ ฿500", expiry: "ใช้ได้ตั้งแต่: 24.03.2026", bgColor: GREEN },
  // ส่วนลดจากร้านค้า
  { code: "METAHERB50", minSpendValue: 199, type: "discount", group: "ส่วนลดจากร้านค้า", percent: 50, maxDiscount: 100, shop: "METAHERB Store", label: "MH", sublabel: "โค้ดร้านค้า", title: "ส่วนลด 50% สูงสุด ฿100", minSpend: "ขั้นต่ำ ฿199", tag: "METAHERB Store", tagColor: GREEN, expiry: "ใช้ได้ในอีก 1 วัน", bgColor: GREEN },
  { code: "BANHERB20", minSpendValue: 100, type: "discount", group: "ส่วนลดจากร้านค้า", discount: 20, shop: "บ้านสมุนไพรไทย", label: "บ้าน", sublabel: "โค้ดร้านค้า", title: "ส่วนลด ฿20", minSpend: "ขั้นต่ำ ฿100", tag: "บ้านสมุนไพรไทย", tagColor: GREEN, expiry: "ใช้ได้ถึง 30.04.2026", bgColor: GREEN },
];

/** Whether the order subtotal meets this coupon's minimum spend. */
export function couponEligible(c: CheckoutCoupon, subtotal: number): boolean {
  return subtotal >= c.minSpendValue;
}

/** Discount amount (THB) this coupon applies to the given subtotal. */
export function couponDiscount(c: CheckoutCoupon, subtotal: number): number {
  if (c.type !== "discount") return 0;
  if (c.percent != null) {
    const raw = Math.round((subtotal * c.percent) / 100);
    return c.maxDiscount != null ? Math.min(raw, c.maxDiscount) : raw;
  }
  return c.discount ?? 0;
}
