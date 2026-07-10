/**
 * Offline evaluation of the assistant's deterministic layer.
 *
 * This is everything that runs BEFORE the model is asked anything: reading the
 * intent, extracting the health goal, and assembling the candidate pool. The LLM
 * can only choose from that pool, so most recommendation quality is decided here
 * — and it is decided the same way every time, which is why it can be a test.
 *
 * The live-model evaluation is a script, not a test: it needs the network.
 * See scripts/ai-eval.mjs.
 */
import { describe, expect, it } from "vitest";
import { ALL_PRODUCTS } from "../src/data/catalog";
import { RAW_PRODUCT_BY_ID } from "../src/data/realProducts";
import { detectIntent, extractBudget, extractGoals, filterProducts, type HealthGoal } from "../src/data/aiEngine";
import { goalsOf } from "../src/data/productGoals";
import { isExternalOnly, usageTag } from "../src/data/productUsage";
import { searchHerbKB } from "../src/data/herbKB";
import { goalBans } from "../src/data/productGoals";
import { __systemPromptFor, maleify } from "../src/services/metaAI";

const named = (id: string) => RAW_PRODUCT_BY_ID[id]?.name ?? id;
const pool = (q: string) => filterProducts(ALL_PRODUCTS, { query: q, goals: extractGoals(q), limit: 10 });

// ── goal extraction ────────────────────────────────────────────
describe("reading the symptom", () => {
  const CASES: [string, HealthGoal[]][] = [
    ["มีปัญหานอนไม่หลับ", ["sleep"]],
    ["นอนหลับยาก ตื่นกลางดึกบ่อย", ["sleep"]],
    ["ท้องอืด อาหารไม่ย่อย", ["digestion"]],
    ["อยากลดน้ำหนัก", ["weight_loss"]],
    ["เป็นเบาหวาน", ["diabetes"]],
    ["ความดันสูง", ["pressure"]],
    ["อยากบำรุงผิว หน้าใส", ["skin"]],
    ["เครียด กังวล", ["stress"]],
    ["ภูมิคุ้มกันต่ำ ป่วยบ่อย", ["immune"]],
  ];

  for (const [q, want] of CASES) {
    it(`"${q}" → ${want.join(",")}`, () => {
      expect(extractGoals(q)).toEqual(expect.arrayContaining(want));
    });
  }

  it("finds no goal in a pure browsing question", () => {
    expect(extractGoals("มีกาแฟอะไรบ้าง")).toEqual([]);
  });
});

describe("reading the intent", () => {
  it("separates a recommendation request from an order lookup", () => {
    expect(detectIntent("แนะนำอะไรดี")).toBe("recommend");
    expect(detectIntent("ขอดูออเดอร์ล่าสุด")).toBe("order_recent");
  });
});

describe("reading a budget", () => {
  it("picks a plausible baht figure and ignores nonsense", () => {
    expect(extractBudget("งบไม่เกิน 300 บาท")).toBe(300);
    expect(extractBudget("อยากได้ของดี")).toBeUndefined();
    expect(extractBudget("ขอ 5 ชิ้น")).toBeUndefined(); // below the ฿50 floor
  });
});

// ── the candidate pool: what the model may choose from ─────────
describe("the candidate pool never contains a contraindicated product", () => {
  const QUERIES: [string, HealthGoal][] = [
    ["มีปัญหานอนไม่หลับ", "sleep"],
    ["นอนหลับยาก", "sleep"],
    ["เป็นเบาหวาน กินอะไรได้บ้าง", "diabetes"],
    ["อยากลดน้ำหนัก", "weight_loss"],
    ["ความดันสูง", "pressure"],
  ];

  for (const [q, goal] of QUERIES) {
    it(`"${q}"`, () => {
      for (const p of pool(q)) {
        expect(goalsOf(p.id).avoid, `${named(p.id)} reached "${q}"`).not.toContain(goal);
      }
    });
  }
});

describe("every product offered actually serves the goal asked about", () => {
  const GOALS: HealthGoal[] = ["sleep", "digestion", "immune", "energy", "diabetes", "stress", "skin"];
  for (const goal of GOALS) {
    it(`${goal}`, () => {
      for (const p of filterProducts(ALL_PRODUCTS, { goals: [goal], limit: 10 })) {
        expect(goalsOf(p.id).goals, `${named(p.id)} offered for ${goal}`).toContain(goal);
      }
    });
  }
});

describe("an empty answer is a valid answer", () => {
  it("returns nothing for a goal this catalog cannot serve", () => {
    // The assistant then says "ยังไม่พบสินค้าที่ตรง" rather than improvising.
    expect(filterProducts(ALL_PRODUCTS, { goals: ["hair"], limit: 10 })).toEqual([]);
    expect(filterProducts(ALL_PRODUCTS, { goals: ["kids"], limit: 10 })).toEqual([]);
  });
});

// ── edibility: the other safety axis ───────────────────────────
describe("edibility is tagged for the model", () => {
  it("marks camphor as external-only, despite its edible-sounding Thai name", () => {
    expect(named("38")).toContain("กระวาน"); // reads like an edible spice
    expect(isExternalOnly("38")).toBe(true);
    expect(usageTag("38")).toBe("ใช้ภายนอกห้ามกิน");
  });

  it("marks the aroma products offered for sleep as external-only", () => {
    // They are the right recommendation — and must never be described as drinkable.
    for (const p of pool("มีปัญหานอนไม่หลับ")) {
      expect(usageTag(p.id), `${named(p.id)}`).not.toBe("ทานได้");
    }
  });

  it("marks the spices offered for digestion as edible", () => {
    const edible = pool("ท้องอืด อาหารไม่ย่อย").filter((p) => usageTag(p.id) === "ทานได้");
    expect(edible.length).toBeGreaterThan(0);
  });
});

// ── grounding ──────────────────────────────────────────────────
describe("the curated knowledge base", () => {
  it("finds an entry by Thai name", () => {
    expect(searchHerbKB("อบเชย").length).toBeGreaterThan(0);
  });

  it("finds an entry by symptom keyword", () => {
    expect(searchHerbKB("ท้องอืด").length).toBeGreaterThan(0);
  });

  it("returns nothing for an unrelated query rather than a bad match", () => {
    expect(searchHerbKB("รถยนต์ไฟฟ้า")).toEqual([]);
  });

  it("carries a citation on every entry it returns", () => {
    for (const e of searchHerbKB("ขมิ้น")) expect(e.refs.length).toBeGreaterThan(0);
  });
});

// ── the prompt itself ──────────────────────────────────────────
describe("what the model is allowed to see", () => {
  it("hides caffeinated products from the catalog on a sleep question", () => {
    const prompt = __systemPromptFor(["sleep"]);
    for (const name of ["กาแฟดริป", "ชาอู๋หลง"]) {
      expect(prompt, `"${name}" was still in the prompt`).not.toContain(name);
    }
    // …but the aroma products it should recommend are there.
    expect(prompt).toContain("สมุนไพรหอม");
  });

  it("hides sugar from a diabetes question", () => {
    const prompt = __systemPromptFor(["diabetes"]);
    expect(prompt).not.toContain("น้ำผึ้งมะนาว");
    expect(prompt).toContain("อบเชย");
  });

  it("shows the whole catalog when no goal was detected", () => {
    const prompt = __systemPromptFor([]);
    expect(prompt).toContain("กาแฟดริป");
    expect(prompt).toContain("น้ำผึ้งมะนาว");
  });

  it("states the ban explicitly, so the model cannot suggest the CLASS either", () => {
    // Removing coffee from the list stops it naming coffee. It does not stop it
    // saying "try a tea" — which is what it did.
    expect(goalBans(["sleep"])[0]).toMatch(/คาเฟอีน/);
    expect(goalBans(["diabetes"])[0]).toMatch(/น้ำตาล|ของหวาน/);
    expect(goalBans([])).toEqual([]);
  });
});

describe("the male register", () => {
  it("collapses the double particle the model sometimes emits", () => {
    expect(maleify("แทนนะค่ะครับ")).toBe("แทนนะครับ");
    expect(maleify("สวัสดีค่ะครับ")).toBe("สวัสดีครับ");
    expect(maleify("ขอบคุณครับ ครับ")).toBe("ขอบคุณครับ");
  });

  it("still rewrites the female particles on their own", () => {
    expect(maleify("ขอบคุณค่ะ")).toBe("ขอบคุณครับ");
    expect(maleify("ได้เลยคะ")).toBe("ได้เลยครับ");
  });

  it("leaves correct text alone", () => {
    expect(maleify("แนะนำอบเชยครับ")).toBe("แนะนำอบเชยครับ");
  });
});

describe("goal extraction pitfalls", () => {
  it('does not read the male pronoun "ผม" as the hair goal', () => {
    // Every man who starts a sentence with "ผม" ("I") was flagged as asking
    // about his hair, which unlocked the wrong product set.
    expect(extractGoals("ผมเป็นเบาหวาน")).not.toContain("hair");
    expect(extractGoals("ผมนอนไม่หลับครับ")).toEqual(["sleep"]);
    expect(extractGoals("ผมอยากลดน้ำหนัก")).toEqual(["weight_loss"]);
  });

  it("still reads a genuine hair concern", () => {
    expect(extractGoals("ผมร่วงเยอะมาก")).toContain("hair");
    expect(extractGoals("อยากบำรุงเส้นผม")).toContain("hair");
  });
});

describe("the model cannot improvise a benefit", () => {
  it("shows only sleep-serving products on a sleep question — no honey, no juice", () => {
    const prompt = __systemPromptFor(["sleep"]);
    // Honey-lemon and cold-pressed juice do nothing for sleep; they must be absent.
    expect(prompt).not.toContain("น้ำผึ้งมะนาว");
    expect(prompt).not.toContain("น้ำผักผลไม้สด");
    expect(prompt).toContain("สมุนไพรหอม");
  });

  it("tells the model to admit an empty shelf rather than substitute", () => {
    // The rule is present whenever a goal narrows the list — "hair" has no
    // product at all, so the shelf really is empty.
    const prompt = __systemPromptFor(["hair"]);
    expect(prompt).toMatch(/ยังไม่มีสินค้า|ห้ามเสนอสินค้าอื่น/);
    expect(prompt).toContain("(ไม่มีสินค้าที่ช่วยเรื่องนี้ในร้าน)");
  });

  it("leaves the catalog whole when there is no goal to narrow it", () => {
    const prompt = __systemPromptFor([]);
    expect(prompt).toContain("น้ำผึ้งมะนาว");
    expect(prompt).toContain("กาแฟดริป");
  });
});
