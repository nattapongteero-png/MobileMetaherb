// Flash-sale seed. Split from promotionSeed.ts because it reads the catalog
// (and therefore image `require()`s), which would keep the promotion seed out
// of the headless Vitest run.
import type { FlashEntry } from "../store/promotions";
import { REAL_PRODUCTS } from "./realProducts";

const day = (offset: number, h = 0, m = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

// Quota + progress per flash product, by position (catalog ids shift with the
// shop split). One of each lifecycle so every console filter has data.
const FLASH_STATES = [
  { total: 300, soldPct: 62 }, // running
  { total: 300, soldPct: 100 }, // quota gone
  { total: 150, soldPct: 0 }, // just opened
];

/**
 * The storefront's flash cards, restated as real entries. `flashPrice` is the
 * catalog's own sale price, so the first render is pixel-identical — but the
 * price now flows through the pricing engine, and the owner can change it.
 */
export const SEED_FLASH: FlashEntry[] = REAL_PRODUCTS.filter((p) => p.isFlashSale).map((p, i) => {
  const st = FLASH_STATES[i % FLASH_STATES.length];
  return {
    productId: p.id,
    flashPrice: p.price,
    total: st.total,
    sold: Math.round((st.total * st.soldPct) / 100),
    startsAt: day(-1),
    endsAt: day(3, 23, 59),
  };
});
