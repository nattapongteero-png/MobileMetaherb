// Coupons offered at checkout — the buyer's own wallet, filtered to what is
// still live. This used to be a frozen 6-row array unrelated to anything the
// buyer had actually collected.
export {
  useCheckoutCoupons,
  checkoutCouponEligible as couponEligible,
  checkoutCouponDiscount as couponDiscount,
  type CheckoutCoupon,
} from "./couponView";
