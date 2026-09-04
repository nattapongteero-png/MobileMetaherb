/**
 * Merged café menu — the frozen seed (data/cafeMenu.ts) with the admin's
 * overlay (store/cafeAdmin.ts) applied: edits override name/price/desc,
 * hidden seed ids drop out, custom items append. The admin console shows
 * everything (including ปิดขาย items); the POS and customer menu should use
 * activeCafeMenu(), which filters those out.
 */
import { CAFE_MENU, type CafeItem } from "./cafeMenu";
import { cafeAdminStore, type CafeAdminState, type CafeItemFields } from "../store/cafeAdmin";

export type AdminCafeItem = Omit<CafeItem, "image"> & CafeItemFields & {
  /** Bundled image handle — absent on admin-created items. */
  image?: number;
  /** Created by the admin (deletable outright). */
  custom?: boolean;
  /** ปิดขาย — kept in the admin list, hidden from POS/customers. */
  off?: boolean;
};

// ตัวเลือกเพิ่มเติม resolves against the shared คลังตัวเลือก — the logic is pure
// (and unit-tested) so it lives in the store; re-exported here because the café
// screens read everything menu-shaped from this module.
export { itemOptionRefs, resolveOptionGroups } from "../store/cafeAdmin";

export function adminCafeMenu(state: CafeAdminState = cafeAdminStore.get()): AdminCafeItem[] {
  const seed: AdminCafeItem[] = CAFE_MENU
    .filter((i) => !state.hidden.includes(i.id))
    .map((i) => ({ ...i, ...state.edits[i.id] }));
  const custom: AdminCafeItem[] = state.custom.map((c) => ({
    ...c,
    sold: 0,
    custom: true,
    ...state.edits[c.id],
  }));
  return [...seed, ...custom];
}

/** Only items that are actually for sale — the POS / customer-facing list. */
export const activeCafeMenu = (state?: CafeAdminState): AdminCafeItem[] =>
  adminCafeMenu(state).filter((i) => !i.off);
