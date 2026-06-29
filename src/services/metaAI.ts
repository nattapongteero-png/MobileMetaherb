// "เมต้า" LLM brain — Gemma-4 via the BMS vLLM (OpenAI-compatible) endpoint.
// Grounded with the real METAHERB catalog so it only recommends in-store products.
import { REAL_PRODUCTS } from "../data/realProducts";
import { AI_LLM_BASE, AI_LLM_MODEL } from "../config/aiEndpoints";

type Role = "system" | "user" | "assistant";
type ChatMsg = { role: Role; content: string };

// Force a male persona: convert female ending particles → ครับ (guard against the
// LLM slipping into ค่ะ/คะ). "คะ" only replaced when it's NOT inside a word like
// "คะแนน" (i.e. not followed by another Thai character).
export function maleify(s: string): string {
  return s.replace(/ค่ะ/g, "ครับ").replace(/คะ(?![ก-๛])/g, "ครับ");
}

// Compact catalog (name · price · category · rating) for the system prompt.
function catalog(): string {
  return REAL_PRODUCTS.slice(0, 48)
    .map((p) => `- ${p.name} · ฿${p.price}${p.originalPrice ? ` (ปกติ ฿${p.originalPrice})` : ""} · ${p.category} · ⭐${p.rating}`)
    .join("\n");
}

function systemPrompt(): string {
  return [
    'คุณคือ "เมต้า" ผู้ช่วยช้อปปิ้งสมุนไพรของร้าน METAHERB เป็นผู้ชาย',
    '- พูดภาษาไทย สุภาพ เป็นกันเอง กระชับ (2–5 ประโยค) ลงท้ายด้วย "ครับ" เสมอ (ห้ามใช้ ค่ะ/คะ) ไม่ต้องใช้ตาราง/markdown ยาว',
    "- แนะนำเฉพาะสินค้าที่มีในร้านด้านล่างเท่านั้น และอ้างชื่อสินค้าให้ตรง",
    "- ให้ความรู้สมุนไพรทั่วไปได้ แต่ย้ำเสมอว่าไม่ใช่คำแนะนำทางการแพทย์ ควรปรึกษาแพทย์/เภสัชกรหากมีโรคประจำตัวหรือใช้ยาอื่นอยู่",
    "",
    "สินค้าในร้าน:",
    catalog(),
  ].join("\n");
}

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
function planCatalog(): string {
  return REAL_PRODUCTS.slice(0, 60)
    .map((p) => `${p.id}|${p.name}|฿${p.price}|${p.category}|⭐${p.rating}${(p.isFlashSale || p.hasCoupon || (p.discountPercent ?? 0) > 0) ? "|โปร" : ""}`)
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
    "",
    "แคตตาล็อก (id|ชื่อ|ราคา|หมวด|รีวิว|โปร):",
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

/** Ask Gemma for a free-form Thai answer. `history` is the chat so far (last item = current question). */
export async function metaChat(history: { role: "user" | "ai"; text: string }[], signal?: AbortSignal): Promise<string> {
  const turns = history.filter((m) => m.text?.trim()).slice(-8);
  const messages: ChatMsg[] = [
    { role: "system", content: systemPrompt() },
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
