/**
 * Promotions + flash-sale entries, and the pricing engine that turns them into
 * the price a customer actually pays.
 *
 * Before this, the owner's promotions lived in a console-only store while the
 * storefront's strike-through prices and "ลด N%" badges were static fields
 * baked into realProducts.ts. The seed numbers were hand-matched, so the two
 * agreed by coincidence — running a new promotion changed nothing for buyers.
 *
 * Pure TS; consumed by src/data/liveCatalog.ts at read time.
 */
import { createStore } from "./db";

export type PromoStatus = "active" | "scheduled" | "ended";
export type PromoDiscountType = "percent" | "baht";
export type PromoScope = "products" | "all";

export type PromoProductLimit = { productId: string; limit: number | "unlimited" };

export type Promotion = {
  id: string;
  name: string;
  description?: string;
  discountType: PromoDiscountType;
  discountValue: number;
  maxDiscount?: number;
  startsAt: string;
  endsAt?: string;
  noExpiry?: boolean;
  enabled: boolean;
  scope: PromoScope;
  products: PromoProductLimit[];
};

/** A product joined to a flash round. Overrides any promotion. */
export type FlashEntry = {
  productId: string;
  /** The sale price, not a discount — the owner types the final number. */
  flashPrice: number;
  /** Quota for the round. */
  total: number;
  sold: number;
  startsAt: string;
  endsAt: string;
  /** Set when the product joined an app-run round (FLASH_EVENTS id). */
  eventId?: string;
};

export type PromotionState = {
  promotions: Promotion[];
  flash: FlashEntry[];
};

export const promotionsStore = createStore<PromotionState>(
  { promotions: [], flash: [] },
  { persistKey: "mh.promotions" },
);

export function seedPromotions(promotions: Promotion[], flash: FlashEntry[] = []): void {
  promotionsStore.reset({ promotions, flash });
}

// ── status ─────────────────────────────────────────────────────
export function computedStatus(p: Promotion, now = Date.now()): PromoStatus {
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return "scheduled";
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return "ended";
  return "active";
}

/** Enabled, started, and not yet finished. Only these move a price. */
export const isRunning = (p: Promotion, now = Date.now()): boolean =>
  p.enabled && computedStatus(p, now) === "active";

const flashRunning = (f: FlashEntry, now = Date.now()): boolean =>
  new Date(f.startsAt).getTime() <= now && now <= new Date(f.endsAt).getTime() && f.sold < f.total;

// ── reads ──────────────────────────────────────────────────────
export const allPromotions = (): Promotion[] => promotionsStore.get().promotions;
export const getPromotionById = (id: string): Promotion | undefined =>
  promotionsStore.get().promotions.find((p) => p.id === id);
export const allFlash = (): FlashEntry[] => promotionsStore.get().flash;
export const flashFor = (productId: string): FlashEntry | undefined =>
  promotionsStore.get().flash.find((f) => f.productId === productId);

const covers = (p: Promotion, productId: string): boolean =>
  p.scope === "all" || p.products.some((x) => x.productId === productId);

// ── pricing ────────────────────────────────────────────────────
export type Pricing = {
  price: number;
  originalPrice: number;
  discountPercent: number;
  isFlashSale: boolean;
  /** Which rule set the price — for debugging and the owner's product page. */
  source: "flash" | "promotion";
};

function amountOff(p: Promotion, base: number): number {
  if (p.discountType === "percent") {
    const raw = Math.round((base * p.discountValue) / 100);
    return p.maxDiscount != null ? Math.min(raw, p.maxDiscount) : raw;
  }
  return Math.min(p.discountValue, base);
}

/**
 * The live price for a product, or undefined when nothing applies (the seed's
 * own price stands). Flash beats promotions; among promotions the deepest cut
 * wins, so stacking two campaigns never over-discounts.
 */
export function pricingFor(
  productId: string,
  basePrice: number,
  state = promotionsStore.get(),
  now = Date.now(),
): Pricing | undefined {
  const flash = state.flash.find((f) => f.productId === productId);
  if (flash && flashRunning(flash, now) && flash.flashPrice < basePrice) {
    return {
      price: flash.flashPrice,
      originalPrice: basePrice,
      discountPercent: Math.round(((basePrice - flash.flashPrice) / basePrice) * 100),
      isFlashSale: true,
      source: "flash",
    };
  }

  const running = state.promotions.filter((p) => isRunning(p, now) && covers(p, productId));
  if (running.length === 0) return undefined;

  const best = running.reduce((a, b) => (amountOff(b, basePrice) > amountOff(a, basePrice) ? b : a));
  const off = amountOff(best, basePrice);
  if (off <= 0) return undefined;

  const price = basePrice - off;
  return {
    price,
    originalPrice: basePrice,
    discountPercent: Math.round((off / basePrice) * 100),
    isFlashSale: false,
    source: "promotion",
  };
}

// ── writes ─────────────────────────────────────────────────────
export function addPromotion(p: Promotion): void {
  const s = promotionsStore.get();
  promotionsStore.set({ ...s, promotions: [p, ...s.promotions] });
}

export function updatePromotion(p: Promotion): void {
  const s = promotionsStore.get();
  promotionsStore.set({ ...s, promotions: s.promotions.map((x) => (x.id === p.id ? p : x)) });
}

export function removePromotion(id: string): void {
  const s = promotionsStore.get();
  promotionsStore.set({ ...s, promotions: s.promotions.filter((x) => x.id !== id) });
}

export function togglePromotion(id: string): void {
  const s = promotionsStore.get();
  promotionsStore.set({
    ...s,
    promotions: s.promotions.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)),
  });
}

/** Join a product to a flash round (or move it to a new price). */
export function upsertFlash(entry: FlashEntry): void {
  const s = promotionsStore.get();
  const exists = s.flash.some((f) => f.productId === entry.productId);
  promotionsStore.set({
    ...s,
    flash: exists ? s.flash.map((f) => (f.productId === entry.productId ? entry : f)) : [entry, ...s.flash],
  });
}

export function removeFlash(productId: string): void {
  const s = promotionsStore.get();
  promotionsStore.set({ ...s, flash: s.flash.filter((f) => f.productId !== productId) });
}

/** Test helper. */
export function __resetPromotions(): void {
  promotionsStore.reset({ promotions: [], flash: [] });
}
