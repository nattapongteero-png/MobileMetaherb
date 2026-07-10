/**
 * Recommendation safety. The assistant once answered "มีปัญหานอนไม่หลับ" with
 * coffee: no product name contains the symptom, so every product scored ≈ 0 and
 * the generic rating boost picked the winner.
 *
 * These tests assert the shape of the CANDIDATE POOL, which is what the model is
 * allowed to choose from. Whatever the LLM does, it cannot pick what it never saw.
 */
import { describe, expect, it } from "vitest";
import { ALL_PRODUCTS } from "../src/data/catalog";
import { RAW_PRODUCT_BY_ID } from "../src/data/realProducts";
import { extractGoals, filterProducts, goalExcluded, goalHits, recommendForGoals } from "../src/data/aiEngine";
import { PRODUCT_GOALS, goalsOf, isContraindicated } from "../src/data/productGoals";
import type { HealthGoal } from "../src/data/aiEngine";

const CAFFEINATED = ["3", "4", "27", "44", "45", "14", "17", "28", "20", "25"];
const SUGARY = ["12", "13", "14", "15", "16", "17", "28", "41", "1", "18", "40", "9"];

const poolFor = (q: string) => {
  const goals = extractGoals(q);
  return filterProducts(ALL_PRODUCTS, { query: q, goals, limit: 10 });
};

const named = (id: string) => RAW_PRODUCT_BY_ID[id]?.name ?? id;

describe("นอนไม่หลับ — the bug that started this", () => {
  it("reads the symptom as the sleep goal", () => {
    expect(extractGoals("มีปัญหานอนไม่หลับ")).toEqual(["sleep"]);
  });

  it("never offers anything caffeinated", () => {
    const pool = poolFor("มีปัญหานอนไม่หลับ");
    for (const p of pool) {
      expect(CAFFEINATED, `${named(p.id)} (id ${p.id}) reached a sleep query`).not.toContain(p.id);
    }
  });

  it("offers only products curated as helping sleep", () => {
    const pool = poolFor("มีปัญหานอนไม่หลับ");
    expect(pool.length).toBeGreaterThan(0);
    for (const p of pool) expect(goalsOf(p.id).goals).toContain("sleep");
  });

  it("suggests the aroma products, which are the only ones that qualify here", () => {
    const names = poolFor("มีปัญหานอนไม่หลับ").map((p) => p.name);
    expect(names.some((n) => /พิมเสน|สมุนไพรหอม|Diffuser|Essence/i.test(n))).toBe(true);
  });

  it("excludes oolong tea too — caffeine people forget about", () => {
    expect(isContraindicated("44", ["sleep"])).toBe(true);
    expect(poolFor("นอนไม่หลับ").map((p) => p.id)).not.toContain("44");
  });

  it("excludes chocolate bakery, which carries cocoa caffeine", () => {
    for (const id of ["14", "17", "28"]) expect(isContraindicated(id, ["sleep"])).toBe(true);
  });

  it("excludes a gift set merely because it contains coffee", () => {
    expect(isContraindicated("20", ["sleep"])).toBe(true);
  });
});

describe("other goals keep their own exclusions", () => {
  it("never offers sugar to someone asking about diabetes", () => {
    for (const p of poolFor("เป็นเบาหวาน กินอะไรได้")) {
      expect(SUGARY, `${named(p.id)} reached a diabetes query`).not.toContain(p.id);
    }
  });

  it("never offers doughnuts or cookies for weight loss", () => {
    for (const p of poolFor("อยากลดน้ำหนัก")) {
      expect(goalsOf(p.id).avoid).not.toContain("weight_loss");
    }
  });

  it("still offers coffee for energy — the exclusion is per goal, not blanket", () => {
    const ids = poolFor("อยากได้พลังงาน ตื่นตัว").map((p) => p.id);
    expect(ids.some((id) => ["3", "4", "45", "27"].includes(id))).toBe(true);
  });
});

describe("the matcher itself", () => {
  it("no longer lets a rating boost carry an unrelated product into a goal query", () => {
    // Every survivor of a goal query must genuinely serve that goal.
    for (const goal of Object.keys({ sleep: 1, digestion: 1, immune: 1, energy: 1 }) as HealthGoal[]) {
      for (const p of filterProducts(ALL_PRODUCTS, { goals: [goal], limit: 10 })) {
        expect(goalHits(p, [goal]), `${named(p.id)} for ${goal}`).toBeGreaterThan(0);
      }
    }
  });

  it("scores a contraindicated product below zero so it can never rank", () => {
    const coffee = ALL_PRODUCTS.find((p) => p.id === "45")!;
    expect(goalExcluded(coffee, ["sleep"])).toBe(true);
    expect(goalExcluded(coffee, ["energy"])).toBe(false);
  });

  it("returns nothing rather than padding a themed set with strangers", () => {
    // "hair" has no product in this catalog. An empty answer is the correct one.
    expect(recommendForGoals(ALL_PRODUCTS, ["hair"])).toEqual([]);
  });

  it("recommendForGoals also refuses contraindicated products", () => {
    for (const p of recommendForGoals(ALL_PRODUCTS, ["sleep"], 10)) {
      expect(isContraindicated(p.id, ["sleep"])).toBe(false);
    }
  });
});

describe("the curated table", () => {
  it("covers every product the storefront sells", () => {
    const missing = ALL_PRODUCTS.filter((p) => !PRODUCT_GOALS[p.id]).map((p) => `${p.id} ${p.name}`);
    expect(missing).toEqual([]);
  });

  it("never lists a goal as both helped and avoided", () => {
    for (const [id, g] of Object.entries(PRODUCT_GOALS)) {
      const overlap = g.goals.filter((x) => g.avoid.includes(x));
      expect(overlap, `product ${id}`).toEqual([]);
    }
  });

  it("gives a reason for every exclusion, so it can be reviewed", () => {
    for (const [id, g] of Object.entries(PRODUCT_GOALS)) {
      if (g.avoid.length > 0) expect(g.why, `product ${id} excludes without saying why`).toBeTruthy();
    }
  });

  it("keeps camphor out of every recommendation — it must not be swallowed", () => {
    expect(goalsOf("38").goals).toEqual([]);
  });
});

describe("the exclusion survives a mislabelled goal", () => {
  it("still bars caffeine when the planner also thinks the user wants energy", () => {
    // A planner that answers "energy" to "นอนไม่หลับ" must not unlock coffee.
    const union: HealthGoal[] = ["energy", "sleep"];
    for (const id of ["3", "4", "45", "27", "44"]) {
      expect(isContraindicated(id, union), `${named(id)}`).toBe(true);
    }
  });

  it("keeps the aroma products, which serve sleep and clash with nothing", () => {
    const union: HealthGoal[] = ["energy", "sleep"];
    for (const p of filterProducts(ALL_PRODUCTS, { goals: union, limit: 10 })) {
      expect(isContraindicated(p.id, union), `${named(p.id)}`).toBe(false);
    }
  });
});
