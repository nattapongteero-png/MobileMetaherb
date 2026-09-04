/**
 * App-side wiring for the local mock backend. This is the ONE module allowed to
 * pull in react-native / AsyncStorage / image assets — everything else under
 * src/store/ stays pure so it can run headless under Vitest.
 *
 * Import once, for its side effects, before the first screen renders:
 *   import "./src/store";
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { clearPersisted, hydrateAll, readMeta, setPersistence, writeMeta } from "./db";
import { rehydrateImages, seedOrders } from "./orders";
import { seedStock } from "./stock";
import { seedCoupons } from "./coupons";
import { seedPromotions } from "./promotions";
import { seedComplaints } from "./complaints";
import { seedTrials } from "./trials";
import { seedCafeOrders } from "./cafe";
import { seedCafeMembers } from "./cafeMembers";
import "./cafeMembers";
import "./cafeAdmin"; // register the café back-office store for hydration
import { seedChat } from "./chat";
import { seedPrefs } from "./prefs";
import { sessionStore, DEMO_USER } from "./session";
import { MOCK_ORDERS } from "../data/orders";
import { SHOP_SEED_ORDERS } from "../data/shopOrders";
import { HISTORY_ORDERS } from "../data/orderHistorySeed";
import { SEED_COUPONS, SEED_WALLET } from "../data/couponSeed";
import { SEED_PROMOTIONS } from "../data/promotionSeed";
import { SEED_FLASH } from "../data/flashSeed";
import { SHOP_COMPLAINTS } from "../data/shopComplaints";
import { TRIAL_REGISTRATIONS } from "../data/trialRegistrations";
import { INITIAL_CAFE_HISTORY } from "../data/cafePayment";
import { CAFE_SALES_SEED } from "../data/cafeSalesSeed";
import { CAFE_MEMBERS_SEED, CAFE_POINT_TXNS_SEED } from "../data/cafeMembersSeed";
import { SEED_MESSAGES, SEED_THREADS } from "../data/chatSeed";
import { INITIAL_ADDRESSES } from "../data/addresses";
import { ALL_PRODUCTS } from "../data/catalog";
import { SHOP_STOCK } from "../data/catalog";
import { getRealProductImage } from "../data/realProducts";
import { SEED_TODAY } from "../data/seedClock";

setPersistence(AsyncStorage);

// Seed synchronously so the first paint has content, then let `hydrateAll`
// swap in whatever the user actually did on their last run.
// HISTORY_ORDERS back-fills every month from มกราคม 2568 up to the window the
// hand-authored rows cover, so the yearly chart and heatmap are never empty.
seedOrders([...MOCK_ORDERS, ...SHOP_SEED_ORDERS, ...HISTORY_ORDERS]);
seedStock(Object.fromEntries(Object.entries(SHOP_STOCK).map(([id, s]) => [id, s.stock])));
seedCoupons(SEED_COUPONS, SEED_WALLET);
seedPromotions(SEED_PROMOTIONS, SEED_FLASH);
seedComplaints(SHOP_COMPLAINTS);
seedTrials(TRIAL_REGISTRATIONS);
// The customer's own past orders + a year of counter sales behind the report.
seedCafeOrders([...INITIAL_CAFE_HISTORY, ...CAFE_SALES_SEED]);
// Stamp-card members behind สมาชิก / แต้มสะสม.
seedCafeMembers(CAFE_MEMBERS_SEED, CAFE_POINT_TXNS_SEED);
seedChat(SEED_THREADS, SEED_MESSAGES);
seedPrefs({
  // A few liked products so the wishlist isn't empty on a fresh install.
  wishlist: ALL_PRODUCTS.slice(0, 8).map((p) => p.id),
  addresses: INITIAL_ADDRESSES,
  selectedAddressId: INITIAL_ADDRESSES.find((a) => a.isDefault)?.id ?? INITIAL_ADDRESSES[0]?.id ?? "",
});
if (!sessionStore.get().user) sessionStore.reset({ user: DEMO_USER, shopName: null });

const SEED_VERSION_KEY = "mh.seedVersion";

/**
 * Identifies the seed the persisted data was written from.
 *
 * Two things force a re-seed:
 *
 *   schema  bumped by hand whenever a seed file changes shape or content.
 *   day     the seeds are anchored to the day the app opens (data/seedClock.ts),
 *           so yesterday's persisted orders would drag "this month" back to
 *           being empty — the exact bug this guard exists to prevent.
 *
 * Hydration used to restore whatever was on disk unconditionally, and the very
 * first launch wrote the seeds there (via `rehydrateImages`, which calls `set`).
 * From then on the persisted copy won forever: editing a seed file could never
 * reach an installed app.
 *
 * The cost is that anything the user did on a previous DAY is dropped. For a
 * mockup with a live-looking dashboard that is the right trade; within a day,
 * orders they place, coupons they collect and addresses they type all persist.
 */
const SEED_SCHEMA = "8";
const seedDay = new Date(SEED_TODAY).toISOString().slice(0, 10);
export const SEED_VERSION = `${SEED_SCHEMA}@${seedDay}`;

let hydrated: Promise<void> | null = null;

/** Restore persisted state. Idempotent; awaited by App.tsx before hiding the splash. */
export function hydrateStores(): Promise<void> {
  hydrated ??= (async () => {
    const stored = await readMeta(SEED_VERSION_KEY);
    if (stored !== SEED_VERSION) {
      // Stale (or absent): the in-memory seeds are already correct — throw the
      // old copy away rather than letting it overwrite them.
      await clearPersisted();
      await writeMeta(SEED_VERSION_KEY, SEED_VERSION);
      return;
    }
    await hydrateAll();
    // Persisted order lines carry no image handle (bundler ints don't survive
    // a rebuild) — resolve them from productId.
    rehydrateImages((productId) => getRealProductImage(productId));
  })();
  return hydrated;
}

export * from "./types";
