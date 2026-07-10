/**
 * App-side wiring for the local mock backend. This is the ONE module allowed to
 * pull in react-native / AsyncStorage / image assets — everything else under
 * src/store/ stays pure so it can run headless under Vitest.
 *
 * Import once, for its side effects, before the first screen renders:
 *   import "./src/store";
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { hydrateAll, setPersistence } from "./db";
import { rehydrateImages, seedOrders } from "./orders";
import { seedStock } from "./stock";
import { seedCoupons } from "./coupons";
import { seedPromotions } from "./promotions";
import { seedComplaints } from "./complaints";
import { seedTrials } from "./trials";
import { seedCafeOrders } from "./cafe";
import { sessionStore, DEMO_USER } from "./session";
import { MOCK_ORDERS } from "../data/orders";
import { SHOP_SEED_ORDERS } from "../data/shopOrders";
import { SEED_COUPONS, SEED_WALLET } from "../data/couponSeed";
import { SEED_PROMOTIONS } from "../data/promotionSeed";
import { SEED_FLASH } from "../data/flashSeed";
import { SHOP_COMPLAINTS } from "../data/shopComplaints";
import { TRIAL_REGISTRATIONS } from "../data/trialRegistrations";
import { INITIAL_CAFE_HISTORY } from "../data/cafePayment";
import { SHOP_STOCK } from "../data/catalog";
import { getRealProductImage } from "../data/realProducts";

setPersistence(AsyncStorage);

// Seed synchronously so the first paint has content, then let `hydrateAll`
// swap in whatever the user actually did on their last run.
seedOrders([...MOCK_ORDERS, ...SHOP_SEED_ORDERS]);
seedStock(Object.fromEntries(Object.entries(SHOP_STOCK).map(([id, s]) => [id, s.stock])));
seedCoupons(SEED_COUPONS, SEED_WALLET);
seedPromotions(SEED_PROMOTIONS, SEED_FLASH);
seedComplaints(SHOP_COMPLAINTS);
seedTrials(TRIAL_REGISTRATIONS);
seedCafeOrders(INITIAL_CAFE_HISTORY);
if (!sessionStore.get().user) sessionStore.reset({ user: DEMO_USER, shopName: null });

let hydrated: Promise<void> | null = null;

/** Restore persisted state. Idempotent; awaited by App.tsx before hiding the splash. */
export function hydrateStores(): Promise<void> {
  hydrated ??= hydrateAll().then(() => {
    // Persisted order lines carry no image handle (bundler ints don't survive
    // a rebuild) — resolve them from productId.
    rehydrateImages((productId) => getRealProductImage(productId));
  });
  return hydrated;
}

export * from "./types";
