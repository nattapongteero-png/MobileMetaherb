/**
 * The payment channel the till has selected.
 *
 * It lives in a store rather than in CafePosScreen's own state so that the
 * customer's ช่องทางชำระเงิน screen — the same screen, reused — can write the
 * choice back without the POS having to hand it a callback through navigation
 * params. Session-only: a new shift starts on cash, like the drawer does.
 */
import { createStore } from "./db";
import type { CafePayChannelId } from "./cafeAdmin";

export const posPayStore = createStore<CafePayChannelId>("cash");

export const setPosPay = (id: CafePayChannelId): void => posPayStore.set(() => id);

/**
 * True while the till has the picker open.
 *
 * The bill is a fullScreen Modal and has to step aside for the picker, then
 * come back. Focus events cannot be used to know when: a screen presented as a
 * modal does not always blur the one under it, so the POS was left sitting on
 * the menu grid. The picker sets this false as it unmounts — whether a channel
 * was chosen or the sheet was simply closed — and the POS reopens on that.
 */
export const posPayPickerStore = createStore<boolean>(false);

export const setPosPayPicker = (open: boolean): void => posPayPickerStore.set(() => open);
