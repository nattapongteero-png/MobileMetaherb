/**
 * Hand-off slot between the POS grid and the POS item page.
 *
 * The bill lives in CafePosScreen's own state, so the item page can't push into
 * it directly. It drops the configured line here and pops back; the POS picks
 * it up and clears the slot. Session-only — nothing to persist, a half-built
 * line must never survive a restart.
 */
import { createStore } from "./db";

/** One chosen option: "ความหวาน" → "หวาน 50%" (+฿0). */
export type PosChoice = { group: string; choice: string; price: number };

/** A configured cup on its way to the bill. */
export type PosLine = {
  /** itemId + options + note — same cup twice just bumps qty. */
  key: string;
  itemId: string;
  qty: number;
  opts: PosChoice[];
  /** โน้ตถึงร้าน — free text the barista reads off the ticket. */
  note?: string;
};

export const posDraftStore = createStore<PosLine | null>(null);

export const setPosDraft = (line: PosLine): void => posDraftStore.set(() => line);

/** Read once and clear, so the same line can't land on the bill twice. */
export function takePosDraft(): PosLine | null {
  const line = posDraftStore.get();
  if (line) posDraftStore.set(() => null);
  return line;
}
