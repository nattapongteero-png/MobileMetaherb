import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetCafeAdmin,
  addCafeMenuItem,
  addCafeOptionGroup,
  cafeAdminStore,
  cafeHours,
  cafeAreaBannerVisible,
  isInsideCafeArea,
  cafeOptionLibrary,
  setCafeArea,
  deleteCafeMenuItem,
  deleteCafeOptionGroup,
  editCafeMenuItem,
  editCafeOptionGroup,
  itemOptionRefs,
  resolveOptionGroups,
  setCafeDayHours,
  setCafeItemOff,
  setCafePayChannel,
} from "./cafeAdmin";
// data/cafeAdminMenu.ts (the merge helper) require()s the seed's images, so it
// can't run under Vitest — these tests stay on the pure store API, same as
// cafe.test.ts does.

describe("cafeAdmin store", () => {
  beforeEach(() => __resetCafeAdmin());

  it("stores edits per item id", () => {
    editCafeMenuItem("drink-coffee-hot-espresso", { price: 65 });
    editCafeMenuItem("drink-coffee-hot-espresso", { name: "Espresso" });
    expect(cafeAdminStore.get().edits["drink-coffee-hot-espresso"]).toEqual({ price: 65, name: "Espresso" });
  });

  it("adds and deletes custom items outright", () => {
    const item = addCafeMenuItem({ name: "ชาไทยพรีเมียม", desc: "", price: 59, mainId: "drink", subId: "drink-tea" });
    expect(cafeAdminStore.get().custom).toHaveLength(1);
    deleteCafeMenuItem(item.id);
    expect(cafeAdminStore.get().custom).toHaveLength(0);
    expect(cafeAdminStore.get().hidden).not.toContain(item.id);
  });

  it("hides (not removes) seed items on delete", () => {
    deleteCafeMenuItem("drink-tea-thai-tea");
    expect(cafeAdminStore.get().hidden).toContain("drink-tea-thai-tea");
  });

  it("toggles off via edits", () => {
    setCafeItemOff("drink-tea-thai-tea", true);
    expect(cafeAdminStore.get().edits["drink-tea-thai-tea"]?.off).toBe(true);
  });

  it("keeps the full product-field set in an edit (web-console parity)", () => {
    editCafeMenuItem("drink-tea-thai-tea", {
      cost: 20,
      fullPrice: 80,
      taxPct: 7,
      barcode: "8850000000001",
      trackStock: true,
      stockQty: 40,
      tags: ["recommended", "new"],
      optionGroups: [{ name: "ไข่มุก", choices: [{ name: "เพิ่มไข่มุก", price: 10 }] }],
    });
    const e = cafeAdminStore.get().edits["drink-tea-thai-tea"];
    expect(e.fullPrice).toBe(80);
    expect(e.trackStock).toBe(true);
    expect(e.optionGroups?.[0].choices[0]).toEqual({ name: "เพิ่มไข่มุก", price: 10 });
  });

  it("edits one day's opening hours without touching the rest", () => {
    setCafeDayHours("sun", { enabled: true, open: "10:00" });
    const hours = cafeHours(cafeAdminStore.get());
    expect(hours.sun).toEqual({ open: "10:00", close: "16:00", enabled: true });
    expect(hours.mon.open).toBe("08:00");
  });

  it("gives a new menu its category's option groups with no setup", () => {
    const groups = resolveOptionGroups({ subId: "drink-coffee" }).map((g) => g.name);
    expect(groups).toEqual(["ความหวาน", "เพิ่มช็อตกาแฟ", "นม"]);
    // ท็อปปิ้ง ships in the library but is off until switched on per menu.
    expect(groups).not.toContain("ท็อปปิ้ง");
    expect(resolveOptionGroups({ subId: "dessert-bakery" })).toHaveLength(0);
  });

  it("flows a library edit into every menu that didn't override it", () => {
    editCafeOptionGroup("opt-shot", { choices: [{ name: "+1 ช็อต", price: 20 }] });
    const shot = resolveOptionGroups({ subId: "drink-coffee" }).find((g) => g.name === "เพิ่มช็อตกาแฟ");
    expect(shot?.choices).toEqual([{ name: "+1 ช็อต", price: 20 }]);
  });

  it("keeps a per-menu override independent of the library", () => {
    const item = {
      subId: "drink-tea",
      optionRefs: [
        { groupId: "opt-sweet", on: true },
        { groupId: "opt-milk", on: true, override: { name: "นม", choices: [{ name: "นมข้นหวาน", price: 0 }] } },
      ],
    };
    editCafeOptionGroup("opt-milk", { choices: [{ name: "นมสด", price: 5 }] });
    const milk = resolveOptionGroups(item).find((g) => g.name === "นม");
    expect(milk?.choices).toEqual([{ name: "นมข้นหวาน", price: 0 }]);
  });

  it("switching a group off drops it from that menu only", () => {
    const off = resolveOptionGroups({ subId: "drink-coffee", optionRefs: [{ groupId: "opt-milk", on: false }] });
    expect(off.map((g) => g.name)).toEqual(["ความหวาน", "เพิ่มช็อตกาแฟ"]);
    expect(resolveOptionGroups({ subId: "drink-coffee" }).map((g) => g.name)).toContain("นม");
  });

  it("appends menu-only groups after the library ones", () => {
    const groups = resolveOptionGroups({
      subId: "drink-coffee",
      optionRefs: [{ groupId: "opt-sweet", on: true }],
      extraGroups: [{ name: "ระดับน้ำแข็ง", choices: [{ name: "น้อย", price: 0 }] }],
    });
    expect(groups.map((g) => g.name)).toEqual(["ความหวาน", "เพิ่มช็อตกาแฟ", "นม", "ระดับน้ำแข็ง"]);
  });

  it("adds a library group and turns it on where autoFor says so", () => {
    addCafeOptionGroup({ name: "ระดับน้ำแข็ง", autoFor: ["drink-tea"], choices: [{ name: "น้อย", price: 0 }] });
    expect(resolveOptionGroups({ subId: "drink-tea" }).map((g) => g.name)).toContain("ระดับน้ำแข็ง");
    expect(resolveOptionGroups({ subId: "dessert-bakery" })).toHaveLength(0);
  });

  it("deleting a library group clears it from menus that referenced it", () => {
    editCafeMenuItem("drink-tea-thai-tea", { optionRefs: [{ groupId: "opt-milk", on: true }] });
    deleteCafeOptionGroup("opt-milk");
    expect(cafeOptionLibrary().map((g) => g.id)).not.toContain("opt-milk");
    expect(cafeAdminStore.get().edits["drink-tea-thai-tea"].optionRefs).toEqual([]);
  });

  it("still honours legacy per-item groups saved before the library", () => {
    const legacy = { subId: "drink-tea", optionGroups: [{ name: "ไข่มุก", choices: [{ name: "เพิ่มไข่มุก", price: 10 }] }] };
    expect(resolveOptionGroups(legacy).map((g) => g.name)).toEqual(["ไข่มุก"]);
  });

  it("lists every library group for the editor, on or off", () => {
    const refs = itemOptionRefs({ subId: "dessert-bakery" });
    expect(refs).toHaveLength(cafeOptionLibrary().length);
    expect(refs.every((r) => !r.on)).toBe(true);
  });

  it("measures whether a customer is inside the ring", () => {
    // ~200 m north of the shop, and ~1.5 km away.
    expect(isInsideCafeArea(13.6735, 100.5043)).toBe(true);
    expect(isInsideCafeArea(13.6852, 100.5043)).toBe(false);
    // A wider radius pulls the far point back in.
    setCafeArea({ radiusM: 2000 });
    expect(isInsideCafeArea(13.6852, 100.5043)).toBe(true);
  });

  it("shows the พื้นที่ขาย banner only inside the ring and inside opening hours", () => {
    const wed10 = new Date(2026, 8, 2, 10, 0).getTime(); // พุธ 10:00 — ร้านเปิด
    expect(cafeAreaBannerVisible(cafeAdminStore.get(), wed10, false)).toBe(false); // นอกรัศมี
    expect(cafeAreaBannerVisible(cafeAdminStore.get(), wed10, true)).toBe(true);

    // ปิดพื้นที่ = ไม่เด้งแม้จะยืนอยู่หน้าร้าน
    setCafeArea({ enabled: false });
    expect(cafeAreaBannerVisible(cafeAdminStore.get(), wed10, true)).toBe(false);
    setCafeArea({ enabled: true });

    // นอกเวลาทำการ (ร้านปิด 17:00)
    const wed20 = new Date(2026, 8, 2, 20, 0).getTime();
    expect(cafeAreaBannerVisible(cafeAdminStore.get(), wed20, true)).toBe(false);
    setCafeArea({ activeHours: "always" });
    expect(cafeAreaBannerVisible(cafeAdminStore.get(), wed20, true)).toBe(true);
  });

  it("refuses to disable the last payment channel", () => {
    expect(setCafePayChannel("promptpay", false)).toBe(true);
    expect(setCafePayChannel("cash", false)).toBe(false); // last one standing
    expect(cafeAdminStore.get().pay.cash).toBe(true);
    // ...and it can be switched back on freely.
    expect(setCafePayChannel("promptpay", true)).toBe(true);
    expect(setCafePayChannel("cash", false)).toBe(true);
  });
});
