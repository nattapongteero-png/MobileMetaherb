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
import { detectIntent, extractBudget, extractCautions, extractGoals, filterProducts, type HealthGoal } from "../src/data/aiEngine";
import { goalsOf } from "../src/data/productGoals";
import { isExternalOnly, usageTag } from "../src/data/productUsage";
import { searchHerbKB } from "../src/data/herbKB";
import { goalBans } from "../src/data/productGoals";
import { __systemPromptFor, maleify } from "../src/services/metaAI";
import { couponDraftReady, createCouponFromDraft } from "../src/data/shopManager";
import { __resetCoupons, couponsForShop, seedCoupons } from "../src/store/coupons";
import { METAHERB_SHOP } from "../src/data/shopOrders";

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

// ── scenario matrix ────────────────────────────────────────────
describe("colloquial and language variants", () => {
  it('"ง่วงนอนตลอดเวลา" is an ENERGY problem — the old keywords read it as insomnia', () => {
    const g = extractGoals("ง่วงนอนตลอดเวลา อยากตื่นตัว");
    expect(g).toContain("energy");
    expect(g).not.toContain("sleep");
    // …so coffee is exactly the right suggestion here, not a banned one.
    const ids = filterProducts(ALL_PRODUCTS, { goals: g, limit: 10 }).map((p) => p.id);
    expect(ids.some((id) => ["3", "4", "27", "45"].includes(id))).toBe(true);
  });

  it("still reads every real sleep complaint", () => {
    for (const q of ["นอนไม่หลับ", "หลับยากมาก", "หลับไม่สนิท ตื่นกลางดึก", "อยากนอนหลับสบาย", "ช่วยให้หลับหน่อย", "นอนน้อยมาก"]) {
      expect(extractGoals(q), q).toContain("sleep");
    }
  });

  it("reads English symptoms", () => {
    expect(extractGoals("I have insomnia, can't sleep")).toContain("sleep");
    expect(extractGoals("something for stress please")).toContain("stress");
  });
});

describe("several goals at once", () => {
  it("นอนไม่หลับ + เครียด → both goals, and the pool obeys both", () => {
    const g = extractGoals("นอนไม่หลับ แล้วก็เครียดมากด้วย");
    expect(g).toEqual(expect.arrayContaining(["sleep", "stress"]));
    for (const p of filterProducts(ALL_PRODUCTS, { goals: g, limit: 10 })) {
      expect(goalsOf(p.id).avoid, named(p.id)).not.toContain("sleep");
    }
  });

  it("conflicting goals: the sleep ban beats the energy wish", () => {
    // Someone tired AND sleepless must not get caffeine, whatever energy would allow.
    const pool = filterProducts(ALL_PRODUCTS, { goals: ["sleep", "energy"] as HealthGoal[], limit: 10 });
    for (const p of pool) {
      expect(["3", "4", "27", "44", "45"], `${named(p.id)} reached a sleep+energy query`).not.toContain(p.id);
    }
    expect(pool.length).toBeGreaterThan(0); // still offers the safe overlap
  });
});

describe("budget combined with a goal", () => {
  it("caps the price without loosening the goal filter", () => {
    const pool = filterProducts(ALL_PRODUCTS, { goals: ["digestion"] as HealthGoal[], maxPrice: 150, limit: 10 });
    expect(pool.length).toBeGreaterThan(0);
    for (const p of pool) {
      expect(p.price).toBeLessThanOrEqual(150);
      expect(goalsOf(p.id).goals).toContain("digestion");
    }
  });
});

describe("sensitive contexts carry a rule into the prompt", () => {
  it("pregnancy", () => {
    const c = extractCautions("ตั้งครรภ์ 4 เดือน กินอบเชยได้ไหมคะ");
    expect(c).toHaveLength(1);
    expect(c[0]).toMatch(/ตั้งครรภ์/);
    expect(__systemPromptFor(["digestion"], c)).toContain("ตั้งครรภ์");
  });

  it("small children — including via ages", () => {
    expect(extractCautions("ลูก 3 ขวบ ให้ดมยาดมได้ไหม")[0]).toMatch(/เด็ก/);
    expect(extractCautions("เด็กเล็กใช้พิมเสนได้ไหม")).toHaveLength(1);
  });

  it("chronic medication — the cinnamon × diabetes-drug interaction", () => {
    const c = extractCautions("กินยาเบาหวานอยู่ กินอบเชยเสริมได้ไหม");
    expect(c).toHaveLength(1);
    expect(c[0]).toMatch(/ตีกับยา/);
  });

  it("emergency symptoms tell the model to stop selling", () => {
    const c = extractCautions("แน่นหน้าอก หายใจไม่สะดวก มีสมุนไพรช่วยไหม");
    expect(c[0]).toMatch(/1669|ฉุกเฉิน/);
    expect(c[0]).toMatch(/ห้ามเสนอขาย/);
  });

  it("does not fire on lookalikes", () => {
    expect(extractCautions("ท้องอืด อาหารไม่ย่อย")).toEqual([]); // ท้อง ≠ ตั้งครรภ์
    expect(extractCautions("ลูกจันทน์เทศราคาเท่าไหร่")).toEqual([]); // ลูก… is a nutmeg
    expect(extractCautions("เป็นเบาหวาน")).toEqual([]); // the disease alone ≠ on medication
  });
});

describe("the copilot's coupon draft survives a numeric discount", () => {
  // The live model returns 15 for "ลด 15%" even when asked for a string; the
  // old .trim() crashed the manager chat on exactly that draft.
  it("reads a bare number as a usable draft", () => {
    expect(couponDraftReady({ discount: 15 })).toBe(true);
    expect(couponDraftReady({})).toBe(false);
  });

  it("mints percent from a small number, baht from a large one, into the shared table", () => {
    __resetCoupons();
    seedCoupons([]);
    createCouponFromDraft({ discount: 15, minSpend: 300, code: "NUM15" });
    createCouponFromDraft({ discount: 150, code: "NUM150" });
    const byCode = (code: string) => couponsForShop(METAHERB_SHOP).find((c) => c.code === code)!;
    expect(byCode("NUM15")).toMatchObject({ discountType: "percent", discountValue: 15, minOrder: 300 });
    expect(byCode("NUM150")).toMatchObject({ discountType: "baht", discountValue: 150 });
  });
});
