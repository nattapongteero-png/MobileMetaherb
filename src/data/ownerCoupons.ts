/* ============================================================================
 *  The owner console's "คูปอง" view.
 *
 *  This used to be its own in-memory store, disjoint from the buyer's wallet
 *  (src/data/coupons.ts), the checkout picker (checkoutCoupons.ts) and the
 *  collect page's inline array — so a coupon created here reached no buyer.
 *  It is now a thin facade over the single table (src/store/coupons.ts); the
 *  console's screens keep their existing imports.
 *  ========================================================================== */
import { useStore } from "../store/db";
import {
  addCoupon as addCouponAction,
  couponById,
  couponsForShop,
  couponsStore,
  effectiveStatus,
  nextCouponId,
  removeCoupon as removeCouponAction,
  toggleCoupon as toggleCouponAction,
  updateCoupon as updateCouponAction,
  type Coupon,
  type CouponDiscountType,
  type CouponStatus,
} from "../store/coupons";
import { METAHERB_SHOP } from "./shopOrders";

export type { Coupon, CouponDiscountType, CouponStatus };
export { nextCouponId };

/** Derived status — explicit "disabled" wins, else expired by endsAt/usage, else active. */
export const computedCouponStatus = (c: Coupon): CouponStatus => effectiveStatus(c);

export const addCoupon = (c: Coupon): void => void addCouponAction(c);
export const updateCoupon = updateCouponAction;
export const removeCoupon = removeCouponAction;
export const toggleCoupon = toggleCouponAction;
export const getCouponById = couponById;

/** Live list for the console: this shop's coupons plus platform-wide ones. */
export function useAllCoupons(): Coupon[] {
  useStore(couponsStore);
  return couponsForShop(METAHERB_SHOP);
}

/** Thai Buddhist-year date-time formatter (e.g. "3 ก.ค. 2569 09:00"). */
export function fmtCouponThaiDateTime(iso: string): string {
  const d = new Date(iso);
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Discount label + color: freeship=blue "ส่งฟรี", percent="N%" green, baht="฿N" green. */
export function fmtCouponDiscount(c: Coupon): { label: string; color: string } {
  if (c.discountType === "freeship") return { label: "ส่งฟรี", color: "#3b82f6" };
  if (c.discountType === "percent") return { label: `${c.discountValue}%`, color: "#319754" };
  return { label: `฿${c.discountValue}`, color: "#319754" };
}
