// The buyer's wallet ("คูปองของฉัน").
//
// This was a hardcoded array with its own `Coupon` type, incompatible with the
// seller console's. It is now a view over the single coupon table — a coupon
// the shop creates and the buyer collects shows up here.
export {
  useWalletCoupons,
  useActiveCouponCount,
  type WalletCoupon as Coupon,
  type WalletStatus as CouponStatus,
} from "./couponView";
