import { beforeEach, describe, expect, it } from "vitest";
import { clearPersisted, createStore, hydrateAll, readMeta, setPersistence, writeMeta } from "./db";

/** An in-memory stand-in for AsyncStorage that records what happened. */
function fakeDisk(initial: Record<string, string> = {}) {
  const data = { ...initial };
  const removed: string[] = [];
  return {
    data,
    removed,
    getItem: async (k: string) => data[k] ?? null,
    setItem: async (k: string, v: string) => void (data[k] = v),
    removeItem: async (k: string) => {
      removed.push(k);
      delete data[k];
    },
  };
}

describe("persistence", () => {
  it("restores a persisted store over its seed", async () => {
    const disk = fakeDisk({ "t.a": JSON.stringify([1, 2, 3]) });
    setPersistence(disk);
    const store = createStore<number[]>([], { persistKey: "t.a" });
    store.reset([9]); // the seed

    await hydrateAll();
    expect(store.get()).toEqual([1, 2, 3]);
  });

  it("leaves the seed alone when nothing is persisted", async () => {
    setPersistence(fakeDisk());
    const store = createStore<number[]>([], { persistKey: "t.b" });
    store.reset([9]);
    await hydrateAll();
    expect(store.get()).toEqual([9]);
  });

  it("falls back to the seed rather than crashing on a corrupt entry", async () => {
    setPersistence(fakeDisk({ "t.c": "{not json" }));
    const store = createStore<number[]>([], { persistKey: "t.c" });
    store.reset([9]);
    await expect(hydrateAll()).resolves.toBeUndefined();
    expect(store.get()).toEqual([9]);
  });

  it("clearPersisted removes every registered key, so a stale seed cannot win", async () => {
    const disk = fakeDisk({ "t.d": "[1]", "t.e": "[2]" });
    setPersistence(disk);
    createStore<number[]>([], { persistKey: "t.d" });
    createStore<number[]>([], { persistKey: "t.e" });

    await clearPersisted();
    expect(disk.removed).toEqual(expect.arrayContaining(["t.d", "t.e"]));
    expect(await disk.getItem("t.d")).toBeNull();
  });

  it("reads and writes metadata that is not a store", async () => {
    setPersistence(fakeDisk());
    expect(await readMeta("mh.seedVersion")).toBeNull();
    await writeMeta("mh.seedVersion", "5@2026-07-10");
    expect(await readMeta("mh.seedVersion")).toBe("5@2026-07-10");
  });
});

describe("a store without a persistKey", () => {
  it("is never written to disk", async () => {
    const disk = fakeDisk();
    setPersistence(disk);
    const store = createStore<number[]>([]);
    store.set([1]);
    await clearPersisted();
    expect(Object.keys(disk.data)).toEqual([]);
  });
});
