import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetPromotions,
  addPromotion,
  computedStatus,
  isRunning,
  pricingFor,
  promotionsStore,
  removeFlash,
  seedPromotions,
  togglePromotion,
  upsertFlash,
  type FlashEntry,
  type Promotion,
} from "./promotions";
import { SEED_PROMOTIONS } from "../data/promotionSeed";

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();

const promo = (over: Partial<Promotion> = {}): Promotion => ({
  id: "p1",
  name: "ลด 10%",
  discountType: "percent",
  discountValue: 10,
  startsAt: iso(-1),
  endsAt: iso(1),
  enabled: true,
  scope: "products",
  products: [{ productId: "23", limit: "unlimited" }],
  ...over,
});

const flash = (over: Partial<FlashEntry> = {}): FlashEntry => ({
  productId: "1",
  flashPrice: 60,
  total: 100,
  sold: 0,
  startsAt: iso(-1),
  endsAt: iso(1),
  ...over,
});

beforeEach(() => {
  __resetPromotions();
});

describe("status", () => {
  it("is scheduled before it starts and ended after it finishes", () => {
    expect(computedStatus(promo({ startsAt: iso(2), endsAt: iso(3) }), NOW)).toBe("scheduled");
    expect(computedStatus(promo({ startsAt: iso(-3), endsAt: iso(-2) }), NOW)).toBe("ended");
    expect(computedStatus(promo(), NOW)).toBe("active");
  });

  it("only runs when enabled", () => {
    expect(isRunning(promo({ enabled: false }), NOW)).toBe(false);
    expect(isRunning(promo(), NOW)).toBe(true);
  });
});

describe("promotions move the customer's price", () => {
  it("applies a percent cut off the base price", () => {
    seedPromotions([promo({ discountType: "percent", discountValue: 25 })]);
    expect(pricingFor("23", 120, promotionsStore.get(), NOW)).toMatchObject({
      price: 90,
      originalPrice: 120,
      discountPercent: 25,
      source: "promotion",
    });
  });

  it("caps a percent cut at maxDiscount", () => {
    seedPromotions([promo({ discountValue: 50, maxDiscount: 20 })]);
    expect(pricingFor("23", 200, promotionsStore.get(), NOW)!.price).toBe(180);
  });

  it("applies a flat baht cut, never below zero", () => {
    seedPromotions([promo({ discountType: "baht", discountValue: 35 })]);
    expect(pricingFor("23", 120, promotionsStore.get(), NOW)!.price).toBe(85);
    seedPromotions([promo({ discountType: "baht", discountValue: 500 })]);
    expect(pricingFor("23", 120, promotionsStore.get(), NOW)!.price).toBe(0);
  });

  it("covers every product when scope is 'all'", () => {
    seedPromotions([promo({ scope: "all", products: [] })]);
    expect(pricingFor("999", 100, promotionsStore.get(), NOW)!.price).toBe(90);
  });

  it("leaves uncovered products alone", () => {
    seedPromotions([promo()]);
    expect(pricingFor("44", 100, promotionsStore.get(), NOW)).toBeUndefined();
  });

  it("ignores scheduled, ended and disabled promotions", () => {
    seedPromotions([promo({ startsAt: iso(2), endsAt: iso(3) })]);
    expect(pricingFor("23", 100, promotionsStore.get(), NOW)).toBeUndefined();
    seedPromotions([promo({ startsAt: iso(-3), endsAt: iso(-2) })]);
    expect(pricingFor("23", 100, promotionsStore.get(), NOW)).toBeUndefined();
    seedPromotions([promo({ enabled: false })]);
    expect(pricingFor("23", 100, promotionsStore.get(), NOW)).toBeUndefined();
  });

  it("never stacks — the deepest single cut wins", () => {
    seedPromotions([
      promo({ id: "a", discountType: "baht", discountValue: 10 }),
      promo({ id: "b", discountType: "percent", discountValue: 25 }),
      promo({ id: "c", scope: "all", products: [], discountType: "baht", discountValue: 5 }),
    ]);
    // 25% of 120 = 30, the largest of {10, 30, 5}.
    expect(pricingFor("23", 120, promotionsStore.get(), NOW)!.price).toBe(90);
  });

  it("reacts to the owner toggling a promotion off", () => {
    seedPromotions([promo()]);
    expect(pricingFor("23", 100, promotionsStore.get(), NOW)).toBeDefined();
    togglePromotion("p1");
    expect(pricingFor("23", 100, promotionsStore.get(), NOW)).toBeUndefined();
  });

  it("picks up a promotion the owner just created", () => {
    seedPromotions([]);
    expect(pricingFor("23", 100, promotionsStore.get(), NOW)).toBeUndefined();
    addPromotion(promo({ discountType: "baht", discountValue: 40 }));
    expect(pricingFor("23", 100, promotionsStore.get(), NOW)!.price).toBe(60);
  });
});

describe("flash sale beats promotions", () => {
  it("uses the flash price and flags the product", () => {
    seedPromotions([promo({ scope: "all", products: [], discountValue: 90 })], [flash()]);
    const p = pricingFor("1", 100, promotionsStore.get(), NOW)!;
    expect(p).toMatchObject({ price: 60, isFlashSale: true, source: "flash", discountPercent: 40 });
  });

  it("falls back to promotions once the quota is gone", () => {
    seedPromotions(
      [promo({ scope: "all", products: [], discountType: "baht", discountValue: 10 })],
      [flash({ sold: 100, total: 100 })],
    );
    const p = pricingFor("1", 100, promotionsStore.get(), NOW)!;
    expect(p).toMatchObject({ price: 90, isFlashSale: false, source: "promotion" });
  });

  it("ignores a flash round outside its window", () => {
    seedPromotions([], [flash({ startsAt: iso(2), endsAt: iso(3) })]);
    expect(pricingFor("1", 100, promotionsStore.get(), NOW)).toBeUndefined();
  });

  it("ignores a flash price that isn't a discount", () => {
    seedPromotions([], [flash({ flashPrice: 150 })]);
    expect(pricingFor("1", 100, promotionsStore.get(), NOW)).toBeUndefined();
  });

  it("joins and leaves a round", () => {
    seedPromotions([], []);
    upsertFlash(flash({ productId: "7", flashPrice: 70 }));
    expect(pricingFor("7", 100, promotionsStore.get(), NOW)!.isFlashSale).toBe(true);
    upsertFlash(flash({ productId: "7", flashPrice: 50 })); // re-price, not duplicate
    expect(promotionsStore.get().flash.filter((f) => f.productId === "7")).toHaveLength(1);
    expect(pricingFor("7", 100, promotionsStore.get(), NOW)!.price).toBe(50);
    removeFlash("7");
    expect(pricingFor("7", 100, promotionsStore.get(), NOW)).toBeUndefined();
  });
});

describe("the shipped seed reproduces the storefront's existing prices", () => {
  // These are the numbers realProducts.ts had baked in. The promotion is now the
  // source of truth; if this drifts, customers see a different price than before.
  beforeEach(() => {
    seedPromotions(SEED_PROMOTIONS, []);
  });

  it("id 23 — ชุดของขวัญ Just For You: ฿120 → ฿85, ลด 29%", () => {
    expect(pricingFor("23", 120, promotionsStore.get())).toMatchObject({
      price: 85,
      originalPrice: 120,
      discountPercent: 29,
      isFlashSale: false,
    });
  });

  it("id 45 — กาแฟดริปอเมริกาโนเย็น: ฿169 → ฿149, ลด 12%", () => {
    expect(pricingFor("45", 169, promotionsStore.get())).toMatchObject({
      price: 149,
      originalPrice: 169,
      discountPercent: 12,
    });
  });

  it("leaves every other product at its catalog price", () => {
    for (const id of ["1", "3", "9", "33", "36", "39", "44"]) {
      expect(pricingFor(id, 200, promotionsStore.get())).toBeUndefined();
    }
  });

  it("ships the shop-wide 10% promo switched off", () => {
    const midYear = SEED_PROMOTIONS.find((p) => p.id === "p-a3")!;
    expect(midYear.scope).toBe("all");
    expect(midYear.enabled).toBe(false);
  });

  it("re-prices the whole catalog the moment the owner enables it", () => {
    togglePromotion("p-a3");
    expect(pricingFor("44", 200, promotionsStore.get())).toMatchObject({ price: 180, discountPercent: 10 });
    // …and the deeper product-scoped cut still wins on id 23.
    expect(pricingFor("23", 120, promotionsStore.get())!.price).toBe(85);
  });

  it("honours the shop-wide promo's ฿150 cap", () => {
    togglePromotion("p-a3");
    expect(pricingFor("44", 5000, promotionsStore.get())!.price).toBe(4850);
  });
});

describe("hostile numbers cannot reverse the till", () => {
  it("clamps a percent above 100 — found by fuzzing", () => {
    seedPromotions([promo({ discountType: "percent", discountValue: 150, maxDiscount: undefined })]);
    const p = pricingFor("23", 120, promotionsStore.get(), NOW)!;
    expect(p.price).toBe(0);
    expect(p.discountPercent).toBe(100);
  });

  it("ignores a negative discount instead of raising the price", () => {
    seedPromotions([promo({ discountType: "baht", discountValue: -50 })]);
    expect(pricingFor("23", 120, promotionsStore.get(), NOW)).toBeUndefined();
  });

  it("treats a negative maxDiscount as no discount at all", () => {
    seedPromotions([promo({ discountType: "percent", discountValue: 30, maxDiscount: -10 })]);
    expect(pricingFor("23", 120, promotionsStore.get(), NOW)).toBeUndefined();
  });

  it("clamps a negative flash price to zero", () => {
    seedPromotions([], [flash({ flashPrice: -5 })]);
    expect(pricingFor("1", 100, promotionsStore.get(), NOW)!.price).toBe(0);
  });
});
