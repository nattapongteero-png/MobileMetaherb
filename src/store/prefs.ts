/**
 * Buyer preferences that ought to outlive an app restart: the wishlist and the
 * saved delivery addresses.
 *
 * Both lived in component state, so a product you hearted and an address you
 * typed vanished the moment the app was killed — while the order you placed
 * with that address persisted.
 *
 * Pure TS and JSON-safe (ids and plain strings).
 */
import { createStore } from "./db";
import type { Address } from "../data/addresses";

export type { Address };

export type Prefs = {
  /** Liked product ids. */
  wishlist: string[];
  addresses: Address[];
  selectedAddressId: string;
};

export const prefsStore = createStore<Prefs>(
  { wishlist: [], addresses: [], selectedAddressId: "" },
  { persistKey: "mh.prefs" },
);

export function seedPrefs(prefs: Prefs): void {
  prefsStore.reset(prefs);
}

// ── wishlist ───────────────────────────────────────────────────
export const wishlistIds = (): string[] => prefsStore.get().wishlist;
export const isWishlisted = (id: string): boolean => prefsStore.get().wishlist.includes(id);

/** Toggle and return the NEW liked state. */
export function toggleWishlist(id: string): boolean {
  const cur = prefsStore.get();
  const liked = cur.wishlist.includes(id);
  prefsStore.set({
    ...cur,
    wishlist: liked ? cur.wishlist.filter((x) => x !== id) : [id, ...cur.wishlist],
  });
  return !liked;
}

// ── addresses ──────────────────────────────────────────────────
export const addresses = (): Address[] => prefsStore.get().addresses;

export const selectedAddress = (): Address | undefined => {
  const { addresses: list, selectedAddressId } = prefsStore.get();
  return list.find((a) => a.id === selectedAddressId) ?? list[0];
};

export function selectAddress(id: string): void {
  prefsStore.set({ ...prefsStore.get(), selectedAddressId: id });
}

let addrSeq = 0;
export const nextAddressId = (now = Date.now()): string => `addr-${now.toString(36)}-${++addrSeq}`;

/** Adding an address selects it — the buyer typed it in order to use it. */
export function addAddress(input: Omit<Address, "id">, now = Date.now()): Address {
  const cur = prefsStore.get();
  const address: Address = { ...input, id: nextAddressId(now) };
  // Only one address can be the default.
  const list = input.isDefault ? cur.addresses.map((a) => ({ ...a, isDefault: false })) : cur.addresses;
  prefsStore.set({ ...cur, addresses: [...list, address], selectedAddressId: address.id });
  return address;
}

export function updateAddress(id: string, input: Omit<Address, "id">): void {
  const cur = prefsStore.get();
  let list = cur.addresses.map((a) => (a.id === id ? { ...input, id } : a));
  if (input.isDefault) list = list.map((a) => ({ ...a, isDefault: a.id === id }));
  prefsStore.set({ ...cur, addresses: list });
}

export function removeAddress(id: string): void {
  const cur = prefsStore.get();
  const list = cur.addresses.filter((a) => a.id !== id);
  // Never leave the selection pointing at a deleted row.
  const selectedAddressId =
    cur.selectedAddressId === id ? list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? "" : cur.selectedAddressId;
  prefsStore.set({ ...cur, addresses: list, selectedAddressId });
}

export function setDefaultAddress(id: string): void {
  const cur = prefsStore.get();
  prefsStore.set({ ...cur, addresses: cur.addresses.map((a) => ({ ...a, isDefault: a.id === id })) });
}

/** Test helper. */
export function __resetPrefs(): void {
  prefsStore.reset({ wishlist: [], addresses: [], selectedAddressId: "" });
  addrSeq = 0;
}
