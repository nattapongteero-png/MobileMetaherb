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
import { sessionStore, DEMO_USER } from "./session";
import { MOCK_ORDERS } from "../data/orders";
import { SHOP_SEED_ORDERS } from "../data/shopOrders";
import { SHOP_STOCK } from "../data/catalog";
import { getRealProductImage } from "../data/realProducts";

setPersistence(AsyncStorage);

// Seed synchronously so the first paint has content, then let `hydrateAll`
// swap in whatever the user actually did on their last run.
seedOrders([...MOCK_ORDERS, ...SHOP_SEED_ORDERS]);
seedStock(Object.fromEntries(Object.entries(SHOP_STOCK).map(([id, s]) => [id, s.stock])));
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
