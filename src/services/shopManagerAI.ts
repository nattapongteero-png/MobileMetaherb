// น้องเมต้า — ผู้จัดการร้านค้า LLM brain (Gemma-4 via the BMS vLLM endpoint).
// Reads the owner's free-text question + a live shop-data snapshot, and returns
// a natural Thai reply, one OR MORE data views to render, and (when the owner
// asks to mint a coupon) the coupon draft to create. Falls back to the keyword
// router (respondAsManager) at the call site if this throws.
import { AI_LLM_BASE, AI_LLM_MODEL } from "../config/aiEndpoints";
import { maleify } from "./metaAI";
import type { ManagerAction, CouponDraft } from "../data/shopManager";
import type { Period } from "../data/salesReport";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };
export type ComplaintDecision = "refund_full" | "refund_partial" | "reject" | "acknowledge";
export type ManagerPlan = {
  actions: ManagerAction[];
  reply: string;
  coupon?: CouponDraft;
  period?: Period;
  complaint?: { id?: string; decision?: ComplaintDecision; amount?: number };
  flash?: { product?: string; discount?: number };
  pr?: { id?: string; decision?: "approve" | "reject"; reason?: string };
  edit?: { product?: string; sku?: string; price?: number; stock?: number; addStock?: number };
  goal?: number;
};

const VALID_ACTIONS: ManagerAction[] = [
  "briefing", "kpi", "revenue", "orders", "products", "herbal",
  "rank_sold", "rank_rating", "rank_revenue",
  "complaints", "ack_complaints", "resolve_complaint", "coupons", "create_coupon",
  "flashsale", "set_flashsale", "end_flashsale", "promotions", "draft_pr",
  "set_price", "set_stock", "resolve_pr",
  "forecast", "compare", "goal", "set_goal",
  "customers", "market", "po", "pr", "rfq", "trial", "none",
];
const VALID_PERIODS: Period[] = ["daily", "weekly", "monthly", "yearly"];

/** Coerce an LLM value to a finite number — JSON-mode models often quote numbers ("30000"). */
function toNum(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") { const n = Number(v.replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? n : undefined; }
  return undefined;
}

function managerSystem(snapshot: string): string {
  return [
    'คุณคือ "น้องเมต้า" ผู้จัดการร้านค้า AI ของร้าน METAHERB เป็นผู้ชาย',
    '- พูดไทย สุภาพ กระชับ ลงท้าย "ครับ" (ห้าม ค่ะ/คะ) ไม่ใช้ markdown หรือตารางยาว',
    "- คุณดูแลร้านให้เจ้าของ: ยอดขาย รายได้ คำสั่งซื้อ สต๊อก สินค้าขายดี ลูกค้า การตลาด คูปอง โปรโมชั่น Flash Sale เอกสารจัดซื้อ (PO/PR/ใบเสนอราคา) สินค้าทดลอง",
    "- ตอบจากข้อมูลจริงด้านล่างเท่านั้น อ้างตัวเลขให้ถูกต้อง",
    "- ถ้าเจ้าของถามเชิงวิเคราะห์ (ทำไม/แนวโน้ม/เพราะอะไร/ควรทำยังไง/จะเพิ่มยอดขายยังไง) ให้สรุปตัวเลขสั้นๆ แล้วเสนอคำแนะนำเชิงปฏิบัติ 1–3 ข้อ อิงข้อมูลจริง (เช่น เทรนด์ vs เมื่อวาน/เดือนก่อน, ROAS, สต๊อก, มาร์จิ้น, ลูกค้าเสี่ยงหาย)",
    "",
    "ตอบเป็น JSON object เท่านั้น (ห้ามมี markdown) รูปแบบ:",
    '{ "actions":["..."], "reply":"คำตอบไทยสั้นๆ ลงท้ายครับ", "period":"daily|weekly|monthly|yearly", "coupon": {...}, "complaint": {...}, "flash": {...} }',
    '- "actions" คือ array ของการ์ดข้อมูลที่จะแสดง เลือกได้หลายอัน (สูงสุด 3) ถ้าเจ้าของอยากเห็นหลายมุม เช่น "สรุปร้านวันนี้" → ["briefing"], "ขอภาพรวม+ออเดอร์+ของใกล้หมด" → ["kpi","orders","products"]',
    '- ถ้าเป็นการทักทาย/ถามทั่วไป/ขอคำแนะนำล้วนๆ ที่ไม่ต้องโชว์การ์ด ใช้ actions=["none"]',
    '- "period" ใส่เมื่อ actions มี "kpi" เพื่อเลือกช่วงเวลา: daily=วันนี้, weekly=เดือนนี้(รายสัปดาห์), monthly=ปีนี้(รายเดือน), yearly=หลายปี (ถ้าไม่ระบุ = daily)',
    '- "coupon" ใส่เฉพาะตอน actions มี "create_coupon": { "code","discount","minSpend","expiry","couponType":"MH|FREE|VIP" } ถ้าข้อมูลไม่พอ ให้ถามกลับและใช้ actions=["create_coupon"] โดยไม่ต้องใส่ coupon', // e.g. "ลด 15%" / "ลด 50 บาท" — สตริงพร้อมหน่วยเสมอ
    '- "complaint" ใส่เฉพาะตอน actions มี "resolve_complaint": { "id":"รหัสเคส เช่น DSP-...", "decision":"refund_full|refund_partial|reject|acknowledge", "amount":ยอดคืนเงิน } ถ้าไม่ระบุเคส ระบบจะถือว่าทำกับเคสที่รออยู่ — ถ้า decision=refund_partial ต้องมี amount (จำนวนบาท) ด้วย ถ้าเจ้าของไม่ได้บอกจำนวน อย่าใส่ amount (ระบบจะถามกลับเอง)',
    '- "flash" ใส่ตอน actions มี "set_flashsale" (จัดเข้า/ตั้งส่วนลด) หรือ "end_flashsale" (ถอดออก): { "product":"ชื่อสินค้า", "discount":เปอร์เซ็นต์ }',
    '- "pr" ใส่ตอน actions มี "resolve_pr": { "id":"รหัส PR เช่น PR-...", "decision":"approve|reject", "reason":"เหตุผล(ตอน reject)" } ถ้าไม่ระบุ id จะทำกับใบที่รออนุมัติ',
    '- "edit" ใส่ตอน actions มี "set_price" หรือ "set_stock": { "product":"ชื่อสินค้า", "sku":"รหัส(ถ้ามี)", "price":ราคาใหม่, "stock":สต๊อกใหม่, "addStock":จำนวนที่เติมเพิ่ม }',
    '- "goal" (ตัวเลขบาท) ใส่ตอน actions มี "set_goal" เพื่อตั้งเป้ายอดขายเดือนนี้',
    "",
    "ความหมาย actions: briefing=สรุปร้านวันนี้, kpi=ภาพรวมยอดขาย/สถิติ(เลือก period ได้), revenue=เงินในกระเป๋า, orders=คำสั่งซื้อล่าสุด, products=สต๊อกสินค้า, herbal=วัตถุดิบ Herbal Market, rank_sold=สินค้าขายดี, rank_rating=คะแนนรีวิวดี, rank_revenue=ทำรายได้สูง, complaints=ดูเรื่องร้องเรียน, ack_complaints=รับเรื่องร้องเรียนค้างทั้งหมด, resolve_complaint=ตัดสินใจเคสร้องเรียน(คืนเงิน/ปฏิเสธ), coupons=ดูคูปอง, create_coupon=สร้างคูปองจริง, flashsale=ดู Flash Sale, set_flashsale=จัดเข้า Flash Sale/ตั้งส่วนลด, end_flashsale=ถอดสินค้าออกจาก Flash Sale, promotions=โปรโมชั่น, draft_pr=ร่างใบขอซื้อเติมของใกล้หมด, set_price=ปรับราคาสินค้า, set_stock=ปรับ/เติมสต๊อก, resolve_pr=อนุมัติ/ปฏิเสธใบขอซื้อ PR, forecast=พยากรณ์ของจะหมดในกี่วัน, compare=เทียบช่วงเวลา(period ปัจจุบันกับก่อนหน้า), goal=ดูความคืบหน้าเป้ายอดขาย, set_goal=ตั้งเป้ายอดขาย, customers=วิเคราะห์ลูกค้า, market=การตลาด, po=ใบสั่งซื้อ, pr=ใบขอซื้อ, rfq=ใบเสนอราคา, trial=สินค้าทดลอง, none=ตอบข้อความล้วน",
    "",
    "ข้อมูลร้านล่าสุด:",
    snapshot,
  ].join("\n");
}

/** Gemma reads the conversation + snapshot and returns the plan (JSON mode). */
export async function managerPlan(
  history: { role: "user" | "ai"; text: string }[],
  snapshot: string,
  signal?: AbortSignal,
): Promise<ManagerPlan> {
  const turns = history.filter((m) => m.text?.trim()).slice(-6);
  const messages: ChatMsg[] = [
    { role: "system", content: managerSystem(snapshot) },
    ...turns.map((m): ChatMsg => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })),
  ];
  const res = await fetch(`${AI_LLM_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: AI_LLM_MODEL, messages, response_format: { type: "json_object" }, temperature: 0.3, max_tokens: 420, stream: false }),
    signal,
  });
  if (!res.ok) throw new Error(`manager ${res.status}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("no content");
  const raw = JSON.parse(content) as {
    actions?: unknown; action?: unknown; reply?: unknown; period?: unknown; goal?: unknown;
    coupon?: CouponDraft; complaint?: ManagerPlan["complaint"]; flash?: ManagerPlan["flash"];
    pr?: ManagerPlan["pr"]; edit?: ManagerPlan["edit"];
  };

  // Accept either an `actions` array or a single legacy `action` string.
  const list = Array.isArray(raw.actions) ? raw.actions : raw.action != null ? [raw.action] : [];
  const seen = new Set<ManagerAction>();
  const actions = list
    .filter((a): a is ManagerAction => typeof a === "string" && (VALID_ACTIONS as string[]).includes(a))
    .filter((a) => (seen.has(a) ? false : (seen.add(a), true)))
    .slice(0, 3);
  if (!actions.length) actions.push("none");

  const reply = typeof raw.reply === "string" && raw.reply.trim() ? maleify(raw.reply) : "";
  const coupon = actions.includes("create_coupon") && raw.coupon && typeof raw.coupon === "object" ? raw.coupon : undefined;
  const period = typeof raw.period === "string" && (VALID_PERIODS as string[]).includes(raw.period) ? (raw.period as Period) : undefined;
  const complaint = actions.includes("resolve_complaint") && raw.complaint && typeof raw.complaint === "object"
    ? { id: raw.complaint.id, decision: raw.complaint.decision, amount: toNum(raw.complaint.amount) }
    : undefined;
  const flash = (actions.includes("set_flashsale") || actions.includes("end_flashsale")) && raw.flash && typeof raw.flash === "object"
    ? { product: raw.flash.product, discount: toNum(raw.flash.discount) }
    : undefined;
  const pr = actions.includes("resolve_pr") && raw.pr && typeof raw.pr === "object" ? raw.pr : undefined;
  const edit = (actions.includes("set_price") || actions.includes("set_stock")) && raw.edit && typeof raw.edit === "object"
    ? { product: raw.edit.product, sku: raw.edit.sku, price: toNum(raw.edit.price), stock: toNum(raw.edit.stock), addStock: toNum(raw.edit.addStock) }
    : undefined;
  const goal = actions.includes("set_goal") ? toNum(raw.goal) : undefined;
  return { actions, reply, coupon, period, complaint, flash, pr, edit, goal };
}
