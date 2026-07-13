/**
 * Agentic AI flows — the assistant as an ACTOR, not a chatbot.
 *
 * A message like "หยิบน้ำผึ้งใส่ตะกร้า" becomes a structured plan that mutates
 * real app state. These tests drive the planner and the full recommend chain
 * (plan → candidate pool → research → rank) exactly the way
 * AIAssistantContext does, against the live model. AI_LIVE=1 to run.
 */
import { describe, expect, it } from "vitest";
import { ALL_PRODUCTS } from "../src/data/catalog";
import { RAW_PRODUCT_BY_ID } from "../src/data/realProducts";
import { extractCautions, extractGoals, filterProducts, goalExcluded, type HealthGoal } from "../src/data/aiEngine";
import { goalsOf } from "../src/data/productGoals";
import { isExternalOnly, usageTag } from "../src/data/productUsage";
import { metaPlan, metaRecommend, metaVision, type AIPlan } from "../src/services/metaAI";
import { research } from "../src/services/herbResearch";

const LIVE = process.env.AI_LIVE === "1";
const d = LIVE ? describe : describe.skip;
const T = 90_000;

const named = (id: string) => RAW_PRODUCT_BY_ID[id]?.name ?? id;
const plan = (q: string) => metaPlan([{ role: "user", text: q }]);

/** The exact pool-building the context performs before asking the model. */
function buildPool(p: AIPlan, text: string) {
  const goals: HealthGoal[] = [
    ...new Set<HealthGoal>([...(p.goal ? [p.goal as HealthGoal] : []), ...extractGoals(text)]),
  ];
  const byId = new Map(ALL_PRODUCTS.map((x) => [x.id, x]));
  const pool: (typeof ALL_PRODUCTS)[number][] = [];
  const seen = new Set<string>();
  const add = (x?: (typeof ALL_PRODUCTS)[number]) => {
    if (!x || seen.has(x.id)) return;
    if (p.maxPrice != null && x.price > p.maxPrice) return;
    if (goalExcluded(x, goals)) return;
    seen.add(x.id);
    pool.push(x);
  };
  (p.productIds ?? []).forEach((id) => add(byId.get(String(id))));
  filterProducts(ALL_PRODUCTS, { query: p.query, goals, maxPrice: p.maxPrice, limit: 10 }).forEach(add);
  return { pool: pool.slice(0, 10), goals };
}

// ── the planner routes actions ─────────────────────────────────
d("the planner turns speech into the right action", () => {
  const CASES: { q: string; want: AIPlan["action"][]; check?: (p: AIPlan) => void }[] = [
    { q: "หยิบน้ำผึ้งมะนาวใส่ตะกร้า 2 ขวด", want: ["add_cart"], check: (p) => expect(p.quantity ?? 2).toBe(2) },
    { q: "เอาน้ำผึ้งมะนาวออกจากตะกร้า", want: ["remove_cart"] },
    { q: "ขอดูตะกร้าหน่อย", want: ["view_cart"] },
    { q: "ล้างตะกร้าให้หน่อย", want: ["clear_cart"] },
    { q: "สั่งซื้อเลย ชำระเงิน", want: ["checkout"] },
    { q: "ออเดอร์ล่าสุดของฉันถึงไหนแล้ว", want: ["orders"] },
    { q: "เปรียบเทียบอบเชยแท่งกับผงอบเชยให้หน่อย", want: ["compare"] },
    { q: "กาแฟตัวไหนถูกที่สุด", want: ["search"], check: (p) => expect(p.sort).toBe("price_asc") },
    { q: "สินค้าขายดีที่สุดของร้าน", want: ["search"], check: (p) => expect(p.sort).toBe("sold") },
    { q: "มีอะไรลดราคาอยู่บ้าง", want: ["search"], check: (p) => expect(p.promoOnly).toBe(true) },
  ];

  for (const { q, want, check } of CASES) {
    it(`"${q}" → ${want.join("|")}`, async () => {
      const p = await plan(q);
      console.log(`\n👤 ${q}\n🧭 action=${p.action}${p.sort ? ` sort=${p.sort}` : ""}${p.quantity ? ` qty=${p.quantity}` : ""}${p.productName ? ` product=${p.productName}` : ""}`);
      expect(want, `got action="${p.action}"`).toContain(p.action);
      check?.(p);
    }, T);
  }
});

d("the planner respects edibility when picking ids", () => {
  it("ของกิน/บำรุงร่างกาย → only edible product ids (×2)", async () => {
    for (let i = 0; i < 2; i++) {
      const p = await plan("อยากได้ของกินบำรุงร่างกาย มีอะไรแนะนำ");
      for (const id of p.productIds ?? []) {
        expect(isExternalOnly(String(id)), `run ${i}: picked ${named(String(id))} [${usageTag(String(id))}]`).toBe(false);
      }
    }
  }, T * 2);

  it("ของหอมไว้สูดดม → external-only picks are correct here", async () => {
    const p = await plan("อยากได้ของหอมๆ ไว้สูดดมผ่อนคลาย");
    expect((p.productIds ?? []).length).toBeGreaterThan(0);
  }, T);
});

d("budget flows through the plan", () => {
  it("same turn: งบ 200 → maxPrice ≤ 200 and the pool obeys it", async () => {
    const q = "แนะนำของบำรุงภูมิคุ้มกัน งบไม่เกิน 200 บาท";
    const p = await plan(q);
    expect(p.maxPrice).toBeLessThanOrEqual(200);
    const { pool } = buildPool(p, q);
    for (const x of pool) expect(x.price, named(x.id)).toBeLessThanOrEqual(200);
  }, T);
});

// ── the full recommend chain, end to end ───────────────────────
d("full chain: plan → pool → research → rank", () => {
  const runChain = async (q: string) => {
    const p = await plan(q);
    const { pool, goals } = buildPool(p, q);
    const r = await research(p.query?.trim() || q, true);
    const ranked = await metaRecommend(
      p.query?.trim() || q,
      pool.map((x) => ({ id: x.id, name: x.name })),
      r.grounding,
      undefined,
      extractCautions(q),
    );
    const picks = ranked.productIds.filter((id) => pool.some((x) => x.id === id));
    console.log(`\n👤 ${q}\n🧭 goals=[${goals.join(",")}] pool=${pool.length}\n🤖 ${ranked.reply}\n   เลือก: ${picks.map(named).join(" · ") || "(ไม่มี)"}`);
    return { p, pool, goals, ranked, picks };
  };

  it("ท้องอืด: every final pick is edible AND serves digestion (×2)", async () => {
    for (let i = 0; i < 2; i++) {
      const { ranked, picks } = await runChain("ท้องอืด อาหารไม่ย่อย กินอะไรดี");
      expect(picks.length).toBeGreaterThan(0);
      for (const id of picks) {
        expect(usageTag(id), `run ${i}: ${named(id)}`).toBe("ทานได้");
        expect(goalsOf(id).goals, `run ${i}: ${named(id)}`).toContain("digestion");
      }
      expect(ranked.reply).toMatch(/ครับ/);
      expect(ranked.reply).not.toMatch(/\[ทานได้\]|\[ใช้ภายนอก/);
    }
  }, T * 4);

  it("นอนไม่หลับ: the original bug can no longer emerge from the WHOLE chain (×2)", async () => {
    for (let i = 0; i < 2; i++) {
      const { picks } = await runChain("มีปัญหานอนไม่หลับ กินอะไรดี");
      for (const id of picks) {
        expect(goalsOf(id).avoid, `run ${i}: ${named(id)} reached the final answer`).not.toContain("sleep");
        expect(goalsOf(id).goals, `run ${i}: ${named(id)}`).toContain("sleep");
      }
    }
  }, T * 4);

  it("คนท้องถามหาของช่วยย่อย: ranked reply defers to a doctor", async () => {
    const { ranked } = await runChain("ตั้งครรภ์อยู่ อยากได้ของช่วยย่อยอาหาร");
    expect(ranked.reply).toMatch(/แพทย์|เภสัช/);
  }, T * 2);
});

// ── vision smoke ───────────────────────────────────────────────
d("vision flow accepts an image end to end", () => {
  const PNG_1PX =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  it("returns Thai, in the male register, without crashing the multimodal path", async () => {
    const ans = await metaVision(PNG_1PX, "นี่รูปอะไรครับ", undefined, undefined, [], []);
    console.log(`\n👁 ${ans}`);
    expect(ans).toMatch(/[ก-๙]/);
    expect(ans).not.toMatch(/ค่ะ|คะ(?![ก-๛])/);
  }, T);
});
