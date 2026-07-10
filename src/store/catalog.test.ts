import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetCatalog,
  addProduct,
  addedProducts,
  catalogStore,
  deleteProduct,
  isDeleted,
  nextProductId,
  patchFor,
  patchProduct,
  restoreProduct,
  setProductClosed,
  setProductRecommended,
} from "./catalog";
import { __resetEvents, eventsFor } from "./events";

const SHOP = "METAHERB Store";

const newInput = (over: Partial<Parameters<typeof addProduct>[0]> = {}) => ({
  shop: SHOP,
  name: "ชาสมุนไพรใหม่",
  price: 180,
  category: "food",
  type: "beverage",
  now: 1_700_000_000_000,
  ...over,
});

beforeEach(() => {
  __resetCatalog();
  __resetEvents();
});

describe("owner-created products", () => {
  it("persists the product instead of discarding the form", () => {
    const p = addProduct(newInput());
    expect(addedProducts()).toHaveLength(1);
    expect(addedProducts()[0]).toMatchObject({ name: "ชาสมุนไพรใหม่", price: 180, shop: SHOP });
    expect(p.id).toMatch(/^new-/);
  });

  it("mints ids outside the seed's numeric range", () => {
    const a = nextProductId(1);
    const b = nextProductId(1);
    expect(a).not.toBe(b);
    expect(Number.isNaN(Number(a))).toBe(true); // can never collide with "1".."45"
  });

  it("lists newest first", () => {
    addProduct(newInput({ name: "เก่า" }));
    addProduct(newInput({ name: "ใหม่" }));
    expect(addedProducts().map((p) => p.name)).toEqual(["ใหม่", "เก่า"]);
  });

  it("notifies the shop feed", () => {
    addProduct(newInput());
    const evs = eventsFor("shop", { shopName: SHOP });
    expect(evs.map((e) => e.type)).toContain("product_added");
    expect(evs[0].body).toContain("180");
  });

  it("patches an added product in place rather than creating a stray patch entry", () => {
    const p = addProduct(newInput());
    patchProduct(p.id, { price: 220 });
    expect(addedProducts()[0].price).toBe(220);
    expect(catalogStore.get().patches[p.id]).toBeUndefined();
  });

  it("can be deleted and restored", () => {
    const p = addProduct(newInput());
    deleteProduct(p.id);
    expect(isDeleted(p.id)).toBe(true);
    restoreProduct(p.id);
    expect(isDeleted(p.id)).toBe(false);
  });
});

describe("patching a seeded product", () => {
  it("records only the changed fields", () => {
    patchProduct("1", { price: 99 });
    expect(patchFor("1")).toEqual({ price: 99 });
  });

  it("accumulates across calls", () => {
    patchProduct("1", { price: 99 });
    setProductRecommended("1", true);
    setProductClosed("1", true);
    expect(patchFor("1")).toEqual({ price: 99, recommended: true, closed: true });
  });

  it("keeps closed and deleted distinct", () => {
    setProductClosed("1", true);
    expect(isDeleted("1")).toBe(false); // ปิดขาย ≠ ลบ
    deleteProduct("1");
    expect(isDeleted("1")).toBe(true);
  });

  it("leaves other products untouched", () => {
    patchProduct("1", { price: 99 });
    expect(patchFor("2")).toBeUndefined();
  });
});
