/**
 * The one coupon table.
 *
 * There used to be four disjoint sources for the same concept:
 *   data/coupons.ts        the buyer's wallet          (type MH/FREE/VIP, display-only)
 *   data/ownerCoupons.ts   the seller's console        (percent/baht/freeship + limits)
 *   data/checkoutCoupons.ts the checkout picker        (static, min-spend math)
 *   CouponCollectScreen    an inline `mockCoupons`     (screen-local)
 * Two of them even exported an incompatible `type Coupon`. A coupon the shop
 * created reached none of the buyer surfaces.
 *
 * The seller's shape wins — it is the only one carrying real discount maths.
 * Presentation shapes are rebuilt by adapters in src/data/couponView.ts.
 */
import { createStore } from "./db";

export type CouponStatus = "active" | "expired" | "disabled";
export type CouponDiscountType = "percent" | "baht" | "freeship";

export type Coupon = {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: CouponDiscountType;
  /** % for "percent", ฿ for "baht", unused for "freeship". */
  discountValue: number;
  /** ฿ cap, percent coupons only. */
  maxDiscount?: number;
  minOrder?: number;
  /** 0 / undefined = unlimited. */
  usageLimit?: number;
  perUserLimit?: number;
  startsAt: string;
  endsAt: string;
  membersOnly?: boolean;
  firstOrderOnly?: boolean;
  used: number;
  /** Explicit override; the effective status also considers `endsAt`. */
  status: CouponStatus;
  /** Shop-scoped coupon. Undefined = platform-wide, usable at any shop. */
  shopName?: string;
  /** Ticket stub colour, carried through to the buyer's wallet card. */
  color?: string;
};

export type CouponState = {
  coupons: Coupon[];
  /** userId → coupon ids the buyer has collected. */
  wallet: Record<string, string[]>;
  /** userId → coupon ids the buyer has already redeemed. */
  redeemed: Record<string, string[]>;
};

export const couponsStore = createStore<CouponState>(
  { coupons: [], wallet: {}, redeemed: {} },
  { persistKey: "mh.coupons" },
);

export function seedCoupons(coupons: Coupon[], wallet: Record<string, string[]> = {}): void {
  couponsStore.reset({ coupons, wallet, redeemed: {} });
}

// ── status ─────────────────────────────────────────────────────
/** Explicit "disabled" wins, then expiry by `endsAt`, else active. */
export function effectiveStatus(c: Coupon, now = Date.now()): CouponStatus {
  if (c.status === "disabled") return "disabled";
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return "expired";
  if (c.usageLimit && c.used >= c.usageLimit) return "expired";
  return "active";
}

export const isUsable = (c: Coupon, now = Date.now()): boolean => effectiveStatus(c, now) === "active";

// ── reads ──────────────────────────────────────────────────────
export const allCoupons = (): Coupon[] => couponsStore.get().coupons;

export const couponById = (id: string): Coupon | undefined =>
  couponsStore.get().coupons.find((c) => c.id === id);

export const couponByCode = (code: string): Coupon | undefined =>
  couponsStore.get().coupons.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());

/** The console's list: this shop's coupons plus the platform-wide ones it can see. */
export const couponsForShop = (shopName: string): Coupon[] =>
  couponsStore.get().coupons.filter((c) => c.shopName === shopName || c.shopName == null);

export const walletIds = (userId: string): string[] => couponsStore.get().wallet[userId] ?? [];
export const redeemedIds = (userId: string): string[] => couponsStore.get().redeemed[userId] ?? [];

export const hasCollected = (userId: string, couponId: string): boolean =>
  walletIds(userId).includes(couponId);

/** Coupons in this buyer's wallet, still usable. */
export const walletCoupons = (userId: string): Coupon[] => {
  const ids = new Set(walletIds(userId));
  return couponsStore.get().coupons.filter((c) => ids.has(c.id));
};

/** Coupons the buyer could still collect. */
export const collectibleCoupons = (userId: string, now = Date.now()): Coupon[] => {
  const owned = new Set(walletIds(userId));
  return couponsStore.get().coupons.filter((c) => !owned.has(c.id) && isUsable(c, now));
};

// ── discount maths ─────────────────────────────────────────────
export const meetsMinimum = (c: Coupon, subtotal: number): boolean => subtotal >= (c.minOrder ?? 0);

/** ฿ off the subtotal. Free-shipping coupons discount nothing here. */
export function couponDiscount(c: Coupon, subtotal: number): number {
  if (!meetsMinimum(c, subtotal)) return 0;
  if (c.discountType === "freeship") return 0;
  if (c.discountType === "percent") {
    const raw = Math.round((subtotal * c.discountValue) / 100);
    return c.maxDiscount != null ? Math.min(raw, c.maxDiscount) : raw;
  }
  return Math.min(c.discountValue, subtotal);
}

/**
 * Can this buyer apply the coupon to this basket right now?
 * A shop-scoped coupon needs at least one line from that shop.
 */
export function canApply(
  c: Coupon,
  opts: { userId: string; subtotal: number; shops?: string[]; now?: number },
): boolean {
  const now = opts.now ?? Date.now();
  if (!isUsable(c, now)) return false;
  if (!hasCollected(opts.userId, c.id)) return false;
  if (!meetsMinimum(c, opts.subtotal)) return false;
  if (c.shopName && opts.shops && !opts.shops.includes(c.shopName)) return false;
  const mine = redeemedIds(opts.userId).filter((id) => id === c.id).length;
  if (c.perUserLimit && mine >= c.perUserLimit) return false;
  return true;
}

// ── writes ─────────────────────────────────────────────────────
let couponSeq = 0;
export function nextCouponId(now = Date.now()): string {
  couponSeq += 1;
  return `cp-${now.toString(36)}-${couponSeq}`;
}

export function addCoupon(c: Coupon): Coupon {
  const s = couponsStore.get();
  couponsStore.set({ ...s, coupons: [c, ...s.coupons] });
  return c;
}

export function updateCoupon(c: Coupon): void {
  const s = couponsStore.get();
  couponsStore.set({ ...s, coupons: s.coupons.map((x) => (x.id === c.id ? c : x)) });
}

export function removeCoupon(id: string): void {
  const s = couponsStore.get();
  couponsStore.set({ ...s, coupons: s.coupons.filter((x) => x.id !== id) });
}

/** Flip disabled ↔ active (the console's ⋯ menu). */
export function toggleCoupon(id: string): void {
  const s = couponsStore.get();
  couponsStore.set({
    ...s,
    coupons: s.coupons.map((x) =>
      x.id === id ? { ...x, status: x.status === "disabled" ? "active" : "disabled" } : x,
    ),
  });
}

/** Buyer taps "เก็บโค้ด". Idempotent. */
export function collectCoupon(userId: string, couponId: string): boolean {
  const s = couponsStore.get();
  if (!s.coupons.some((c) => c.id === couponId)) return false;
  if ((s.wallet[userId] ?? []).includes(couponId)) return true;
  couponsStore.set({ ...s, wallet: { ...s.wallet, [userId]: [...(s.wallet[userId] ?? []), couponId] } });
  return true;
}

/** Spend the coupon at checkout: bump the global counter and record the buyer. */
export function redeemCoupon(userId: string, couponId: string): void {
  const s = couponsStore.get();
  couponsStore.set({
    ...s,
    coupons: s.coupons.map((c) => (c.id === couponId ? { ...c, used: c.used + 1 } : c)),
    redeemed: { ...s.redeemed, [userId]: [...(s.redeemed[userId] ?? []), couponId] },
  });
}

/** Test helper. */
export function __resetCoupons(): void {
  couponsStore.reset({ coupons: [], wallet: {}, redeemed: {} });
  couponSeq = 0;
}
