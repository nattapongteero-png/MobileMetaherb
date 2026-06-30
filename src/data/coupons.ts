// Ported from the MetaHerb website (src/app/pages/MyCouponsPage.tsx).

export type CouponStatus = "active" | "used" | "expired";

export type Coupon = {
  id: string;
  type: "MH" | "FREE" | "VIP";
  label: string;
  sublabel: string;
  title: string;
  code: string;
  minSpend: string;
  tag?: string;
  tagColor?: string;
  expiry: string;
  bgColor: string;
  status: CouponStatus;
  usedDate?: string;
};

export const COUPONS: Coupon[] = [
  { id: "1", type: "MH", label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด ฿30", code: "MH30OFF", minSpend: "ขั้นต่ำ ฿150", tag: "ทุกร้านค้า", tagColor: "#319754", expiry: "ใช้ได้ถึง 25.03.2026", bgColor: "#319754", status: "active" },
  { id: "2", type: "FREE", label: "FREE", sublabel: "โค้ดส่งฟรี", title: "ส่งฟรี", code: "FREESHIP01", minSpend: "ขั้นต่ำ ฿0", tag: "ส่งด่วน", tagColor: "#00bfa5", expiry: "ใช้ได้ในอีก 1 วัน", bgColor: "#00bfa5", status: "active" },
  { id: "3", type: "FREE", label: "FREE", sublabel: "โค้ดส่งฟรี", title: "ส่งฟรี", code: "FREESHIP02", minSpend: "ขั้นต่ำ ฿0", tag: "ส่งด่วน", tagColor: "#00bfa5", expiry: "ใช้ได้ในอีก 1 วัน", bgColor: "#00bfa5", status: "active" },
  { id: "5", type: "MH", label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด 27% สูงสุด ฿1,000", code: "MH27PCT", minSpend: "ขั้นต่ำ ฿500", expiry: "ใช้ได้ถึง 24.03.2026", bgColor: "#319754", status: "active" },
  { id: "8", type: "VIP", label: "VIP", sublabel: "โค้ดส่วนลด", title: "ส่วนลด 50% สูงสุด ฿100", code: "VIP50", minSpend: "ขั้นต่ำ ฿199", tag: "สมาชิก VIP", tagColor: "#9c27b0", expiry: "ใช้ได้ในอีก 1 วัน", bgColor: "#9c27b0", status: "active" },
  { id: "9", type: "MH", label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด 23% สูงสุด ฿1,000", code: "MH23PCT", minSpend: "ขั้นต่ำ ฿500", expiry: "ใช้ได้ถึง 24.03.2026", bgColor: "#319754", status: "active" },
  { id: "7", type: "FREE", label: "FREE", sublabel: "โค้ดส่งฟรี", title: "ส่งฟรี", code: "FREESHIP07", minSpend: "ขั้นต่ำ ฿0", tag: "ส่งด่วน", tagColor: "#00bfa5", expiry: "ใช้ได้ในอีก 12 ชั่วโมง", bgColor: "#00bfa5", status: "active" },
  { id: "20", type: "MH", label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด ฿50", code: "MH50OFF", minSpend: "ขั้นต่ำ ฿200", expiry: "หมดอายุ 10.03.2026", bgColor: "#319754", status: "used", usedDate: "08.03.2026" },
  { id: "21", type: "FREE", label: "FREE", sublabel: "โค้ดส่งฟรี", title: "ส่งฟรี", code: "FREESHIP99", minSpend: "ขั้นต่ำ ฿0", expiry: "หมดอายุ 12.03.2026", bgColor: "#00bfa5", status: "used", usedDate: "11.03.2026" },
  { id: "6", type: "MH", label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด 27% สูงสุด ฿1,000", code: "MH27PCT2", minSpend: "ขั้นต่ำ ฿500", expiry: "หมดอายุ 24.03.2026", bgColor: "#319754", status: "expired" },
  { id: "10", type: "MH", label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด 17% สูงสุด ฿3,000", code: "MH17PCT", minSpend: "ขั้นต่ำ ฿200", expiry: "หมดอายุ 24.03.2026", bgColor: "#319754", status: "expired" },
];

/**
 * Create a real, active coupon at runtime (used by น้องเมต้า's "สร้างคูปอง" action).
 * Mutates COUPONS in place and returns the new coupon so the assistant can show it;
 * it then appears live in the owner's coupon views that read from COUPONS.
 */
let _couponSeq = 100;
export function addCoupon(input: {
  type: Coupon["type"];
  title: string;
  code: string;
  minSpend: string;
  expiry: string;
  bgColor: string;
}): Coupon {
  const c: Coupon = {
    id: `new-${++_couponSeq}`,
    type: input.type,
    label: input.type,
    sublabel: input.type === "FREE" ? "โค้ดส่งฟรี" : "โค้ดส่วนลด",
    title: input.title,
    code: input.code,
    minSpend: input.minSpend,
    tag: "สร้างใหม่",
    tagColor: input.bgColor,
    expiry: input.expiry,
    bgColor: input.bgColor,
    status: "active",
  };
  COUPONS.unshift(c);
  return c;
}
