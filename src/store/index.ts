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
import { SEED_MESSAGES, SEED_THREADS } from "../data/chatSeed";
import { INITIAL_ADDRESSES } from "../data/addresses";
import { ALL_PRODUCTS } from "../data/catalog";
import { SHOP_STOCK } from "../data/catalog";
import { getRealProductImage } from "../data/realProducts";

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
seedCafeOrders(INITIAL_CAFE_HISTORY);
seedChat(SEED_THREADS, SEED_MESSAGES);
seedPrefs({
  // A few liked products so the wishlist isn't empty on a fresh install.
  wishlist: ALL_PRODUCTS.slice(0, 8).map((p) => p.id),
  addresses: INITIAL_ADDRESSES,
  selectedAddressId: INITIAL_ADDRESSES.find((a) => a.isDefault)?.id ?? INITIAL_ADDRESSES[0]?.id ?? "",
});
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
