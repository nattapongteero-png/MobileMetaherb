/* ============================================================================
 *  In-memory store for owner-created trial products ("เพิ่มสินค้าทดลองใหม่").
 *  The registry merges these on top of the static TRIAL_PRODUCTS so a newly
 *  added product shows immediately (mockup — not persisted across reloads).
 *  ========================================================================== */
import { useSyncExternalStore } from "react";
import type { TrialProduct } from "../screens/TrialProductsScreen";

let added: TrialProduct[] = [];
const listeners = new Set<() => void>();

export function addTrialDraft(p: TrialProduct) {
  added = [p, ...added];
  listeners.forEach((l) => l());
}

/** Insert or replace by id — used by the edit flow (overrides a static product too). */
export function upsertTrialDraft(p: TrialProduct) {
  added = added.some((x) => x.id === p.id) ? added.map((x) => (x.id === p.id ? p : x)) : [p, ...added];
  listeners.forEach((l) => l());
}

/** Non-hook snapshot — for one-off reads (e.g. prefilling the edit form). */
export function getAddedTrials(): TrialProduct[] {
  return added;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Live list of owner-added trial products (re-renders on add). */
export function useAddedTrials(): TrialProduct[] {
  return useSyncExternalStore(subscribe, () => added, () => added);
}
