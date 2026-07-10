/**
 * Presentation adapters over the single coupon table.
 *
 * The buyer's wallet, the collect page and the checkout picker were each built
 * against a different ticket shape. Rather than rewrite their JSX, rebuild those
 * shapes from the canonical `Coupon` — the same trick used for ShopOrder.
 */
import { useStore } from "../store/db";
import {
  canApply,
  collectibleCoupons,
  couponDiscount,
  couponsStore,
  effectiveStatus,
  redeemedIds,
  walletCoupons,
  type Coupon,
} from "../store/coupons";
import { currentUserId } from "../store/session";

const TEAL = "#00bfa5";
const GREEN = "#319754";

/** Ticket stub kind, derived rather than stored. */
export type TicketKind = "MH" | "FREE" | "VIP";

export function ticketKind(c: Coupon): TicketKind {
  if (c.discountType === "freeship") return "FREE";
  if (c.membersOnly) return "VIP";
  return "MH";
}

export const ticketColor = (c: Coupon): string =>
  c.color ?? (c.discountType === "freeship" ? TEAL : GREEN);

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/** "ส่วนลด ฿30" / "ส่วนลด 27% สูงสุด ฿1,000" / "ส่งฟรี" */
export function ticketTitle(c: Coupon): string {
  if (c.discountType === "freeship") return "ส่งฟรี";
  if (c.discountType === "percent") {
    return c.maxDiscount
      ? `ส่วนลด ${c.discountValue}% สูงสุด ฿${c.maxDiscount.toLocaleString()}`
      : `ส่วนลด ${c.discountValue}%`;
  }
  return `ส่วนลด ฿${c.discountValue.toLocaleString()}`;
}

// ── the buyer's wallet ("คูปองของฉัน") ─────────────────────────
export type WalletStatus = "active" | "used" | "expired";

export type WalletCoupon = {
  id: string;
  type: TicketKind;
  label: TicketKind;
  sublabel: string;
  title: string;
  code: string;
  minSpend: string;
  tag?: string;
  tagColor?: string;
  expiry: string;
  bgColor: string;
  status: WalletStatus;
  usedDate?: string;
};

function toWallet(c: Coupon, redeemed: Set<string>): WalletCoupon {
  const kind = ticketKind(c);
  const eff = effectiveStatus(c);
  // A redeemed coupon reads as "used" even before it expires.
  const status: WalletStatus = redeemed.has(c.id) ? "used" : eff === "active" ? "active" : "expired";
  return {
    id: c.id,
    type: kind,
    label: kind,
    sublabel: kind === "FREE" ? "โค้ดส่งฟรี" : "โค้ดส่วนลด",
    title: ticketTitle(c),
    code: c.code,
    minSpend: `ขั้นต่ำ ฿${(c.minOrder ?? 0).toLocaleString()}`,
    tag: c.shopName ?? "ทุกร้านค้า",
    tagColor: ticketColor(c),
    expiry: status === "active" ? `ใช้ได้ถึง ${fmtDate(c.endsAt)}` : `หมดอายุ ${fmtDate(c.endsAt)}`,
    bgColor: ticketColor(c),
    status,
  };
}

/** The signed-in buyer's collected coupons. */
export function useWalletCoupons(): WalletCoupon[] {
  useStore(couponsStore);
  const userId = currentUserId();
  const redeemed = new Set(redeemedIds(userId));
  return walletCoupons(userId).map((c) => toWallet(c, redeemed));
}

export function useActiveCouponCount(): number {
  return useWalletCoupons().filter((c) => c.status === "active").length;
}

// ── the collect page ("เก็บคูปอง") ─────────────────────────────
export type CollectibleCoupon = WalletCoupon & { collected: boolean };

/** Every live coupon, flagged with whether this buyer already holds it. */
export function useCollectibleCoupons(): CollectibleCoupon[] {
  useStore(couponsStore);
  const userId = currentUserId();
  const held = new Set(walletCoupons(userId).map((c) => c.id));
  const redeemed = new Set(redeemedIds(userId));
  const live = [...walletCoupons(userId), ...collectibleCoupons(userId)].filter(
    (c) => effectiveStatus(c) === "active",
  );
  return live.map((c) => ({ ...toWallet(c, redeemed), collected: held.has(c.id) }));
}

// ── the checkout picker ────────────────────────────────────────
export type CheckoutCoupon = {
  id: string;
  code: string;
  type: "discount" | "freeship";
  /** Section header in the picker. */
  group: string;
  shop?: string;
  minSpendValue: number;
  label: TicketKind;
  sublabel: string;
  title: string;
  minSpend: string;
  tag?: string;
  tagColor?: string;
  expiry: string;
  bgColor: string;
};

function toCheckout(c: Coupon): CheckoutCoupon {
  const kind = ticketKind(c);
  return {
    id: c.id,
    code: c.code,
    type: c.discountType === "freeship" ? "freeship" : "discount",
    group: c.discountType === "freeship" ? "ส่งฟรี" : c.shopName ? "ส่วนลดจากร้านค้า" : "ส่วนลด",
    shop: c.shopName,
    minSpendValue: c.minOrder ?? 0,
    label: kind,
    sublabel: c.shopName ? "โค้ดร้านค้า" : kind === "FREE" ? "โค้ดส่งฟรี" : "โค้ดส่วนลด",
    title: ticketTitle(c),
    minSpend: `ขั้นต่ำ ฿${(c.minOrder ?? 0).toLocaleString()}`,
    tag: c.shopName ?? "ทุกร้านค้า",
    tagColor: ticketColor(c),
    expiry: `ใช้ได้ถึง ${fmtDate(c.endsAt)}`,
    bgColor: ticketColor(c),
  };
}

/**
 * Coupons the buyer holds that are still live. The picker greys out the ones
 * that don't meet the basket's minimum spend or shop.
 */
export function useCheckoutCoupons(): CheckoutCoupon[] {
  useStore(couponsStore);
  return walletCoupons(currentUserId())
    .filter((c) => effectiveStatus(c) === "active")
    .map(toCheckout);
}

/** Whether this coupon can be applied to the basket in hand. */
export function checkoutCouponEligible(c: CheckoutCoupon, subtotal: number, shops: string[]): boolean {
  const full = couponsStore.get().coupons.find((x) => x.id === c.id);
  if (!full) return false;
  return canApply(full, { userId: currentUserId(), subtotal, shops });
}

/** ฿ off the subtotal for the picked coupon. */
export function checkoutCouponDiscount(c: CheckoutCoupon | null, subtotal: number): number {
  if (!c) return 0;
  const full = couponsStore.get().coupons.find((x) => x.id === c.id);
  return full ? couponDiscount(full, subtotal) : 0;
}
