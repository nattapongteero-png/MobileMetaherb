/**
 * Tiny observable store — the backbone of the app's local "mock backend".
 *
 * Everything under src/store/ is **pure TypeScript**: no react-native, no
 * `require()` of images, no AsyncStorage import. That keeps the domain logic
 * runnable headless under Vitest, and lets the app inject its own persistence.
 *
 * Screens subscribe through `useStore` (useSyncExternalStore), which is the
 * same pattern the project already uses in data/promotions.ts + data/ownerCoupons.ts.
 */
import { useSyncExternalStore } from "react";

type Listener = () => void;

/** Matches AsyncStorage's shape — injected by the app, absent under test. */
export type Persistence = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

let persistence: Persistence | null = null;
const registry: { key: string; load: (raw: string) => void; dump: () => string }[] = [];

/** Wire real persistence (called once from src/store/index.ts on the app side). */
export function setPersistence(p: Persistence): void {
  persistence = p;
}

/** Direct access for metadata that isn't a store (e.g. the seed version). */
export const readMeta = (key: string): Promise<string | null> =>
  persistence ? persistence.getItem(key) : Promise.resolve(null);

export const writeMeta = (key: string, value: string): Promise<void> =>
  persistence ? persistence.setItem(key, value) : Promise.resolve();

/**
 * Drop every persisted store. Called when the seeds have changed underneath a
 * stale install — otherwise `hydrateAll` would restore the old seed forever and
 * no amount of editing the seed files would ever reach the device.
 */
export async function clearPersisted(): Promise<void> {
  if (!persistence) return;
  for (const s of registry) {
    try {
      await persistence.removeItem(s.key);
    } catch {
      /* nothing persisted under that key */
    }
  }
}

/** Read every registered store back from disk. Safe to call when unpersisted. */
export async function hydrateAll(): Promise<void> {
  if (!persistence) return;
  for (const s of registry) {
    try {
      const raw = await persistence.getItem(s.key);
      if (raw) s.load(raw);
    } catch {
      /* corrupt entry — fall back to the seed rather than crashing the app */
    }
  }
}

export type Store<T> = {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: Listener): () => void;
  /** Replace the value without persisting — for seeding and test isolation. */
  reset(next: T): void;
};

export type StoreOptions<T> = {
  /**
   * Persist under this key. Omit for ephemeral stores.
   * Values must survive JSON round-tripping — strip anything that can't
   * (e.g. RN `require()` image handles) with `toJSON`/`fromJSON`.
   */
  persistKey?: string;
  toJSON?: (value: T) => unknown;
  fromJSON?: (raw: any) => T;
};

export function createStore<T>(initial: T, opts: StoreOptions<T> = {}): Store<T> {
  let value = initial;
  const listeners = new Set<Listener>();
  let flushHandle: ReturnType<typeof setTimeout> | null = null;

  const dump = () => JSON.stringify(opts.toJSON ? opts.toJSON(value) : value);

  // Coalesce bursts of writes (a checkout touches orders + stock + events).
  const schedulePersist = () => {
    if (!persistence || !opts.persistKey) return;
    if (flushHandle) clearTimeout(flushHandle);
    flushHandle = setTimeout(() => {
      flushHandle = null;
      void persistence?.setItem(opts.persistKey!, dump());
    }, 120);
  };

  const emit = () => {
    for (const l of listeners) l();
  };

  if (opts.persistKey) {
    registry.push({
      key: opts.persistKey,
      dump,
      load: (raw) => {
        const parsed = JSON.parse(raw);
        value = opts.fromJSON ? opts.fromJSON(parsed) : (parsed as T);
        emit();
      },
    });
  }

  return {
    get: () => value,
    set(next) {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      emit();
      schedulePersist();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset(next) {
      value = next;
      emit();
    },
  };
}

/** Subscribe a component to a store. Re-renders on every `set`. */
export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
