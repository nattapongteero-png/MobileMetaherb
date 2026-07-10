import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetPrefs,
  addAddress,
  addresses,
  isWishlisted,
  removeAddress,
  seedPrefs,
  selectAddress,
  selectedAddress,
  setDefaultAddress,
  toggleWishlist,
  updateAddress,
  wishlistIds,
  type Address,
} from "./prefs";

const addr = (over: Partial<Omit<Address, "id">> = {}): Omit<Address, "id"> => ({
  name: "ณัฐพงษ์",
  phone: "061-421-3111",
  detail: "เลขที่ 2 ซอยสุขสวัสดิ์ 33",
  area: "ราษฎร์บูรณะ กรุงเทพฯ 10140",
  isDefault: false,
  ...(over as object),
}) as Omit<Address, "id">;

beforeEach(() => {
  __resetPrefs();
});

describe("wishlist", () => {
  it("toggles on and off, returning the new state", () => {
    expect(toggleWishlist("1")).toBe(true);
    expect(isWishlisted("1")).toBe(true);
    expect(toggleWishlist("1")).toBe(false);
    expect(isWishlisted("1")).toBe(false);
  });

  it("keeps the newest like first", () => {
    toggleWishlist("1");
    toggleWishlist("2");
    expect(wishlistIds()).toEqual(["2", "1"]);
  });

  it("never stores a duplicate", () => {
    toggleWishlist("1");
    toggleWishlist("1");
    toggleWishlist("1");
    expect(wishlistIds()).toEqual(["1"]);
  });
});

describe("addresses", () => {
  it("selects a newly added address — the buyer typed it in order to use it", () => {
    const a = addAddress(addr());
    expect(selectedAddress()!.id).toBe(a.id);
  });

  it("mints unique ids within the same millisecond", () => {
    const a = addAddress(addr(), 1);
    const b = addAddress(addr(), 1);
    expect(a.id).not.toBe(b.id);
  });

  it("keeps exactly one default", () => {
    const a = addAddress(addr({ isDefault: true }));
    const b = addAddress(addr({ isDefault: true }));
    expect(addresses().filter((x) => x.isDefault).map((x) => x.id)).toEqual([b.id]);

    setDefaultAddress(a.id);
    expect(addresses().filter((x) => x.isDefault).map((x) => x.id)).toEqual([a.id]);
  });

  it("edits in place without changing the id", () => {
    const a = addAddress(addr());
    updateAddress(a.id, addr({ name: "ใหม่" }));
    expect(addresses()[0]).toMatchObject({ id: a.id, name: "ใหม่" });
  });

  it("never leaves the selection pointing at a deleted address", () => {
    const a = addAddress(addr());
    const b = addAddress(addr({ isDefault: true }));
    selectAddress(a.id);
    removeAddress(a.id);
    expect(selectedAddress()!.id).toBe(b.id);
  });

  it("survives deleting every address", () => {
    const a = addAddress(addr());
    removeAddress(a.id);
    expect(addresses()).toEqual([]);
    expect(selectedAddress()).toBeUndefined();
  });

  it("falls back to the first address when nothing is selected", () => {
    seedPrefs({ wishlist: [], addresses: [{ ...addr(), id: "a1" }], selectedAddressId: "" });
    expect(selectedAddress()!.id).toBe("a1");
  });
});
