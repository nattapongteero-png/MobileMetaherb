// "เมต้า" LLM brain — Gemma-4 via the BMS vLLM (OpenAI-compatible) endpoint.
// Grounded with the real METAHERB catalog so it only recommends in-store products.
import { REAL_PRODUCTS } from "../data/realProducts";
import { usageTag } from "../data/productUsage";
import { AI_LLM_BASE, AI_LLM_MODEL } from "../config/aiEndpoints";
import { goalBans, isContraindicated, servesAnyGoal } from "../data/productGoals";
import type { HealthGoal } from "../data/aiEngine";

type Role = "system" | "user" | "assistant";
type ChatMsg = { role: Role; content: string };

// Force a male persona: convert female ending particles → ครับ (guard against the
// LLM slipping into ค่ะ/คะ). "คะ" only replaced when it's NOT inside a word like
// "คะแนน" (i.e. not followed by another Thai character).
/**
 * Force the male register. The model sometimes writes both particles ("นะค่ะครับ"),
 * and rewriting ค่ะ→ครับ then produced "ครับครับ" — collapse the repeat.
 */
export function maleify(s: string): string {
  return s
    .replace(/ค่ะ/g, "ครับ")
    .replace(/คะ(?![ก-๛])/g, "ครับ")
    .replace(/(ครับ)(\s*ครับ)+/g, "ครับ");
}

// Compact catalog (name · price · category · rating · usage) for the system
// prompt. The [usage] tag tells เมต้า whether an item is edible — critical so it
// never suggests eating an aroma/inhaler/diffuser product.
//
// Products contraindicated for the customer's goal are REMOVED, not merely
// discouraged: the free-form chat path used to receive the whole catalog and
// would recommend an oolong tea in the same breath as explaining that its
// caffeine ruins sleep.
function catalog(goals: HealthGoal[] = []): string {
  // With a health goal, the model sees ONLY the products curated as serving it.
  // Merely dropping the contraindicated ones was not enough: asked what to drink
  // for insomnia it offered honey-lemon juice, inventing a benefit the product
  // does not have. It cannot recommend what it cannot see.
  const visible = goals.length
    ? REAL_PRODUCTS.filter((p) => servesAnyGoal(p.id, goals) && !isContraindicated(p.id, goals))
    : REAL_PRODUCTS.slice(0, 48);
  return visible
    .map((p) => `- ${p.name} · ฿${p.price}${p.originalPrice ? ` (ปกติ ฿${p.originalPrice})` : ""} · ${p.category} · ⭐${p.rating} · [${usageTag(p.id)}]`)
    .join("\n");
}

/** Said out loud, because an empty product list still tempts a model to improvise. */
const NO_MATCH_RULE =
  'ถ้ารายการสินค้าด้านล่างว่างเปล่า หรือไม่มีสินค้าไหนช่วยเรื่องที่ลูกค้าถามได้จริง ให้บอกตามตรงว่า "ทางร้านยังไม่มีสินค้าที่ช่วยเรื่องนี้ครับ" ห้ามเสนอสินค้าอื่นมาแทนโดยอ้างสรรพคุณที่ไม่มีจริง (เช่น อย่าเสนอน้ำผึ้งหรือน้ำผลไม้ว่าช่วยให้นอนหลับ) — ให้ความรู้ทั่วไปและแนะนำให้ปรึกษาแพทย์แทน';

// The edibility rule shared by every prompt — spelled out so the model never
// tells a customer to consume an external-only product.
const USAGE_RULE =
  'สำคัญมาก (ความปลอดภัย): แต่ละสินค้ามีแท็กวิธีใช้ต่อท้าย — [ทานได้]=กิน/ดื่ม/ชงได้ · [ใช้ภายนอกห้ามกิน]=สูดดม/ทาภายนอกเท่านั้น (น้ำมันหอม/อโรมา/พิมเสน/การบูร/น้ำหอม/ก้านกระจายกลิ่น) · [ชุดผสม(มีของห้ามกิน)]=เซตที่มีทั้งของกินและของใช้ภายนอก. ห้ามแนะนำให้ "กิน/ดื่ม/ชง" สินค้าที่เป็น [ใช้ภายนอกห้ามกิน] เด็ดขาด — ให้บอกวิธีใช้ที่ถูก (สูดดม/ทา/วางกระจายกลิ่น). ถ้าลูกค้าถามหาของ "กิน/ดื่ม/บำรุงร่างกาย" ให้แนะนำเฉพาะ [ทานได้] เท่านั้น. สำหรับ [ชุดผสม] ให้เตือนว่าในเซตมีของใช้ภายนอกปนอยู่ อย่ารับประทานส่วนนั้น. (แท็กในวงเล็บ [] เป็นข้อมูลภายใน ห้ามพิมพ์แท็กให้ลูกค้าเห็น ให้พูดเป็นภาษาธรรมชาติแทน)';

function systemPrompt(goals: HealthGoal[] = [], cautions: string[] = []): string {
  const bans = goalBans(goals);
  return [
    'คุณคือ "เมต้า" ผู้ช่วยช้อปปิ้งสมุนไพรของร้าน METAHERB เป็นผู้ชาย',
    '- พูดภาษาไทย สุภาพ เป็นกันเอง กระชับ (2–5 ประโยค) ลงท้ายด้วย "ครับ" เสมอ (ห้ามใช้ ค่ะ/คะ) ไม่ต้องใช้ตาราง/markdown ยาว',
    "- แนะนำเฉพาะสินค้าที่มีในร้านด้านล่างเท่านั้น และอ้างชื่อสินค้าให้ตรง",
    "- ให้ความรู้สมุนไพรทั่วไปได้ แต่ย้ำเสมอว่าไม่ใช่คำแนะนำทางการแพทย์ ควรปรึกษาแพทย์/เภสัชกรหากมีโรคประจำตัวหรือใช้ยาอื่นอยู่",
    USAGE_RULE,
    ...(bans.length ? ["สำคัญมาก (ข้อห้ามเฉพาะคำถามนี้):", ...bans.map((b) => `- ${b}`)] : []),
    ...(cautions.length ? ["สำคัญที่สุด (บริบทของลูกค้ารายนี้):", ...cautions.map((c) => `- ${c}`)] : []),
    ...(goals.length ? [NO_MATCH_RULE] : []),
    "",
    goals.length ? "สินค้าที่ช่วยเรื่องที่ลูกค้าถาม (มีแท็กวิธีใช้ต่อท้าย):" : "สินค้าในร้าน (มีแท็กวิธีใช้ต่อท้าย):",
    catalog(goals) || "(ไม่มีสินค้าที่ช่วยเรื่องนี้ในร้าน)",
  ].join("\n");
}

/** Test seam: the exact system prompt a chat turn would be given. */
export const __systemPromptFor = (goals: HealthGoal[], cautions: string[] = []): string =>
  systemPrompt(goals, cautions);

// ===== Agent planner — Gemma reads the message and returns a structured plan =====
export type AIPlan = {
  action: "search" | "compare" | "add_cart" | "remove_cart" | "view_cart" | "clear_cart" | "checkout" | "promo" | "bundle" | "orders" | "answer";
  query?: string;
  goal?: string;
  category?: string;
  maxPrice?: number;
  minPrice?: number;
  minRating?: number;
  promoOnly?: boolean;
  sort?: "price_asc" | "price_desc" | "rating" | "sold";
  productName?: string;
  productNames?: string[];
  productIds?: string[];
  quantity?: number;
  reply?: string;
};

// Catalog with ids so the planner can pick the exact matching products.
// The usage tag lets the planner avoid picking external-only items when the
// user is asking for something to consume.
function planCatalog(): string {
  return REAL_PRODUCTS.slice(0, 60)
    .map((p) => `${p.id}|${p.name}|฿${p.price}|${p.category}|⭐${p.rating}|${usageTag(p.id)}${(p.isFlashSale || p.hasCoupon || (p.discountPercent ?? 0) > 0) ? "|โปร" : ""}`)
    .join("\n");
}

function planSystem(): string {
  return [
    'คุณคือสมองของ "เมต้า" ผู้ช่วยช้อปสมุนไพรร้าน METAHERB (เป็นผู้ชาย ลงท้าย "ครับ")',
    "วิเคราะห์ข้อความผู้ใช้ แล้วตอบเป็น JSON object เท่านั้น (ไม่มี markdown) ใส่เฉพาะ field ที่เกี่ยวข้อง:",
    '{ "action":"search|compare|add_cart|remove_cart|view_cart|clear_cart|checkout|promo|bundle|orders|answer",',
    '  "query":"คำค้น", "goal":"สรรพคุณ 1 จาก sleep,weight_loss,weight_gain,skin,hair,brain,energy,immune,digestion,joint,pressure,diabetes,senior,kids,stress",',
    '  "maxPrice":num,"minPrice":num,"minRating":num,"promoOnly":bool,"sort":"price_asc|price_desc|rating|sold",',
    '  "productIds":["id สินค้าที่ตรงที่สุด เรียงตรงสุดก่อน"],"productName":"ชื่อสินค้า","productNames":["หลายชื่อ"],"quantity":num,',
    '  "reply":"ไทยสั้นๆ สุภาพ ลงท้ายครับ" }',
    "กติกา:",
    "- หา/แนะนำสินค้า → action=search · อ่านคำถามแล้วเลือกสินค้าที่ตรงที่สุดจากแคตตาล็อกด้านล่าง ใส่ id ลง productIds (สูงสุด 6 เรียงตรงสุดก่อน) · ใส่ filter ที่ผู้ใช้ระบุ (maxPrice/minPrice/minRating/promoOnly)",
    '- "ถูกสุด"→sort=price_asc · "แพงสุด"→price_desc · "ขายดี"→sort=sold · "รีวิวดีสุด"→sort=rating (เวลามี sort ไม่ต้องใส่ productIds)',
    "- หยิบใส่ตะกร้า→add_cart (productName หรือ productNames, ระบุจำนวน→quantity) · เอาออก→remove_cart · ดูตะกร้า→view_cart · ล้าง/เคลียร์ตะกร้า→clear_cart · สั่งซื้อ/ชำระเงิน→checkout · โปรในตะกร้า→promo · จัดเซต/ชุด→bundle · ออเดอร์→orders · เปรียบเทียบ→compare",
    "- ถามความรู้สมุนไพร/อาการ/คุยเล่น/ทักทาย → action=answer · ถ้าเกี่ยวกับสมุนไพร/อาการ ใส่ productIds (หรือ goal) ด้วย เพื่อแนบสินค้าที่เกี่ยวข้อง",
    "- แคตตาล็อกมีแท็กวิธีใช้: [ทานได้]/[ใช้ภายนอกห้ามกิน]/[ชุดผสม(มีของห้ามกิน)]. ถ้าลูกค้าถามหาของกิน/ดื่ม/บำรุงร่างกาย ห้ามใส่ id ที่เป็น [ใช้ภายนอกห้ามกิน] ลง productIds — เลือกเฉพาะ [ทานได้]. ถ้าถามหาของหอม/อโรมา/สูดดม ค่อยเลือก [ใช้ภายนอกห้ามกิน].",
    "",
    "แคตตาล็อก (id|ชื่อ|ราคา|หมวด|รีวิว|วิธีใช้|โปร):",
    planCatalog(),
  ].join("\n");
}

/** Gemma reads the conversation and returns a structured action plan (JSON mode). */
export async function metaPlan(history: { role: "user" | "ai"; text: string }[], signal?: AbortSignal): Promise<AIPlan> {
  const turns = history.filter((m) => m.text?.trim()).slice(-6);
  const messages: ChatMsg[] = [
    { role: "system", content: planSystem() },
    ...turns.map((m): ChatMsg => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })),
  ];
  const res = await fetch(`${AI_LLM_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: AI_LLM_MODEL, messages, response_format: { type: "json_object" }, temperature: 0.2, max_tokens: 320, stream: false }),
    signal,
  });
  if (!res.ok) throw new Error(`plan ${res.status}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("no plan content");
  const plan = JSON.parse(content) as AIPlan;
  if (!plan || !plan.action) throw new Error("invalid plan");
  if (plan.reply) plan.reply = maleify(plan.reply);
  return plan;
}

/** Ask Gemma for a free-form Thai answer. `history` is the chat so far (last item = current question).
 *  `grounding` (optional) = retrieved evidence (herb KB / web research) the model must answer FROM —
 *  keeps health claims tied to sources instead of the model's own memory. */
export async function metaChat(
  history: { role: "user" | "ai"; text: string }[],
  signal?: AbortSignal,
  grounding?: string,
  /** Health goals detected for this turn — drives the contraindication guard. */
  goals: HealthGoal[] = [],
  /** Sensitive-context rules (pregnancy, children, chronic meds, emergencies). */
  cautions: string[] = [],
): Promise<string> {
  const turns = history.filter((m) => m.text?.trim()).slice(-8);
  const messages: ChatMsg[] = [
    { role: "system", content: systemPrompt(goals, cautions) },
    ...(grounding?.trim()
      ? [{
          role: "system" as const,
          content: [
            "ข้อมูลอ้างอิงที่ค้นมาให้ (ตอบคำถามสุขภาพ/สรรพคุณจากข้อมูลนี้เป็นหลัก ห้ามแต่งสรรพคุณเพิ่มเอง ถ้าข้อมูลไม่พอให้บอกตรงๆ):",
            grounding.trim(),
            "ถ้ามี 'ข้อควรระวัง' ที่เกี่ยวกับคำถาม ให้ยกมาบอกสั้นๆ ด้วยเสมอ",
          ].join("\n"),
        }]
      : []),
    ...turns.map((m): ChatMsg => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })),
  ];

  const res = await fetch(`${AI_LLM_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: AI_LLM_MODEL, messages, temperature: 0.6, max_tokens: 400, stream: false }),
    signal,
  });
  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("empty LLM response");
  return maleify(text.trim());
}

// ===== Vision — เมต้า "sees" a customer photo (symptom / product label) =====
// OpenAI-style multimodal content: text + image_url data-URI. gemma4 (Gemma-4-31B)
// is vision-capable on the BMS vLLM endpoint (verified against /v1/chat/completions).
type VisionPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type VisionMsg = { role: Role; content: string | VisionPart[] };

function visionSystem(goals: HealthGoal[] = [], cautions: string[] = []): string {
  const bans = goalBans(goals);
  return [
    'คุณคือ "เมต้า" ผู้ช่วยของร้านสมุนไพร METAHERB (ผู้ชาย ลงท้าย "ครับ" เสมอ ห้าม ค่ะ/คะ)',
    "ผู้ใช้ส่งรูปมาให้ดู รูปอาจเป็น: (1) อาการบนร่างกาย เช่น ผิว ผม เล็บ (2) ฉลาก/บรรจุภัณฑ์สินค้า (3) สมุนไพร/วัตถุดิบ (4) อื่นๆ",
    "ทำตามนี้:",
    "- อธิบายสั้นๆ ว่าเห็นอะไรในรูป (1–2 ประโยค)",
    "- ถ้าเป็นอาการผิว/ผม/สุขภาพ: ให้คำแนะนำทั่วไปอย่างระวัง ไม่วินิจฉัยโรค ไม่ฟันธง และย้ำว่าไม่ใช่คำแนะนำทางการแพทย์ ควรพบแพทย์/เภสัชกรถ้าอาการรุนแรงหรือเรื้อรัง",
    "- ถ้าเป็นฉลาก/สินค้า/สมุนไพร: อ่านข้อมูลที่เห็น แล้วเชื่อมโยงกับสินค้าในร้านถ้าตรง",
    "- ปิดท้ายด้วยการแนะนำสินค้าในร้านที่เกี่ยวข้อง (อ้างชื่อให้ตรงจากรายการด้านล่างเท่านั้น) ถ้ามี",
    "- กระชับ 3–6 ประโยค ไม่ใช้ markdown ยาว/ตาราง",
    USAGE_RULE,
    ...(bans.length ? ["สำคัญมาก (ข้อห้ามเฉพาะคำถามนี้):", ...bans.map((b) => `- ${b}`)] : []),
    ...(cautions.length ? ["สำคัญที่สุด (บริบทของลูกค้ารายนี้):", ...cautions.map((c) => `- ${c}`)] : []),
    ...(goals.length ? [NO_MATCH_RULE] : []),
    "",
    "สินค้าในร้าน (มีแท็กวิธีใช้ต่อท้าย):",
    catalog(goals) || "(ไม่มีสินค้าที่ช่วยเรื่องนี้ในร้าน)",
  ].join("\n");
}

/**
 * Analyze a customer photo. `imageDataUrl` = "data:image/jpeg;base64,...".
 * `userText` = optional caption. `grounding` = retrieved herb-KB / web evidence
 * (same contract as metaChat) so any health claim stays tied to sources.
 */
export async function metaVision(
  imageDataUrl: string,
  userText: string,
  signal?: AbortSignal,
  grounding?: string,
  /** Health goals read from the caption — drives the contraindication guard. */
  goals: HealthGoal[] = [],
  cautions: string[] = [],
): Promise<string> {
  const messages: VisionMsg[] = [
    { role: "system", content: visionSystem(goals, cautions) },
    ...(grounding?.trim()
      ? [{
          role: "system" as const,
          content:
            "ข้อมูลอ้างอิงที่ค้นมาให้ (ถ้าเกี่ยวกับสิ่งในรูป ให้ตอบจากข้อมูลนี้เป็นหลัก และยก 'ข้อควรระวัง' ที่เกี่ยวข้องมาด้วย):\n" +
            grounding.trim(),
        }]
      : []),
    {
      role: "user",
      content: [
        { type: "text", text: userText.trim() || "ช่วยดูรูปนี้ให้หน่อยครับ ว่าเกี่ยวกับอะไรและแนะนำสินค้าในร้านที่เหมาะได้ไหม" },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    },
  ];

  const res = await fetch(`${AI_LLM_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: AI_LLM_MODEL, messages, temperature: 0.4, max_tokens: 450, stream: false }),
    signal,
  });
  if (!res.ok) throw new Error(`vision ${res.status}`);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("empty vision response");
  return maleify(text.trim());
}

// ===== Grounded recommend — pick the products that TRULY fit the need =====
// The agentic step: given the customer's need + a candidate shortlist + the
// evidence just fetched (herb KB / live web), Gemma re-ranks to the products
// that actually match — instead of guessing from product names. Returns the
// chosen ids (best-first) + a short grounded reply.
export type RecommendCandidate = { id: string; name: string };
export type RecommendResult = { productIds: string[]; reply: string };

export async function metaRecommend(
  need: string,
  candidates: RecommendCandidate[],
  grounding: string,
  signal?: AbortSignal,
  cautions: string[] = [],
): Promise<RecommendResult> {
  const list = candidates
    .map((c) => `${c.id}|${c.name}|[${usageTag(c.id)}]`)
    .join("\n");
  const system = [
    'คุณคือสมองของ "เมต้า" ผู้ช่วยร้านสมุนไพร METAHERB (ผู้ชาย ลงท้าย "ครับ")',
    "งาน: จากความต้องการของลูกค้า + รายการสินค้าที่คัดมาให้ + ข้อมูลอ้างอิงที่ค้นมา จงเลือกสินค้าที่ 'ตรงกับความต้องการจริงๆ' เรียงตรงสุดก่อน",
    "กติกา:",
    "- เลือกจากรายการสินค้าที่ให้เท่านั้น ใส่ id ลง productIds (สูงสุด 5 เรียงตรงสุดก่อน)",
    "- ตัดสินความ 'ตรง' จากข้อมูลอ้างอิงที่ค้นมาเป็นหลัก (สรรพคุณสมุนไพร) ไม่ใช่เดาจากชื่อ ถ้าสินค้าไหนไม่เกี่ยวจริงห้ามใส่",
    USAGE_RULE,
    ...cautions.map((c) => `- ${c}`),
    "- reply = ภาษาไทยสั้นๆ (1–3 ประโยค) สุภาพ ลงท้ายครับ อธิบายว่าทำไมถึงแนะนำตัวที่เลือก (อิงข้อมูลที่ค้นมา) ห้ามพิมพ์แท็กในวงเล็บ []",
    '- ถ้าไม่มีสินค้าไหนตรงเลย ให้ productIds เป็น [] และ reply บอกตามตรงว่ายังไม่มีสินค้าที่ตรง',
    'ตอบเป็น JSON object เท่านั้น: { "productIds": ["id"], "reply": "ข้อความไทย" }',
  ].join("\n");

  const user = [
    `ความต้องการของลูกค้า: "${need}"`,
    "",
    "สินค้าที่คัดมา (id|ชื่อ|วิธีใช้):",
    list,
    "",
    grounding.trim() ? `ข้อมูลอ้างอิงที่ค้นมา:\n${grounding.trim()}` : "(ไม่มีข้อมูลอ้างอิงเพิ่มเติม — ใช้ความรู้ทั่วไปอย่างระวัง)",
  ].join("\n");

  const res = await fetch(`${AI_LLM_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_LLM_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 320,
      stream: false,
    }),
    signal,
  });
  if (!res.ok) throw new Error(`recommend ${res.status}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("no recommend content");
  const parsed = JSON.parse(content) as RecommendResult;
  return {
    productIds: Array.isArray(parsed.productIds) ? parsed.productIds.map(String) : [],
    reply: parsed.reply ? maleify(parsed.reply) : "",
  };
}
