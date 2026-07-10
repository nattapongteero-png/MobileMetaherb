/**
 * What each product is actually FOR — and what it must never be recommended for.
 *
 * Before this, the assistant matched a health goal against `${product.name}
 * ${categoryLabel}` using keyword hints. No product name contains "นอนไม่หลับ",
 * so a query about insomnia scored every product ≈ 0 and the pool fell back to
 * generic boosts (isRecommended + rating). Coffee ranked highly and was
 * recommended to someone who could not sleep.
 *
 * Two lists per product, both hand-checked:
 *
 *   goals  it genuinely supports. Empty means "recommend this for nothing" —
 *          which is the right answer for a doughnut.
 *   avoid  it must never appear for. Caffeine for sleep, sugar for diabetes and
 *          weight loss. `avoid` is a hard exclusion, checked before ranking, and
 *          it wins over anything an LLM might suggest.
 *
 * Pairs with productUsage.ts, which says whether a thing may be swallowed at all.
 */
import type { HealthGoal } from "./aiEngine";

export type ProductGoals = {
  goals: HealthGoal[];
  avoid: HealthGoal[];
  /** Why it is excluded. Shown in review, never to the customer. */
  why?: string;
};

const CAFFEINE = "มีคาเฟอีน";
const SUGAR = "น้ำตาลสูง";
const COCOA = "มีโกโก้/คาเฟอีน";

export const PRODUCT_GOALS: Record<string, ProductGoals> = {
  // ── น้ำผึ้งมะนาว ──
  "1": { goals: ["immune", "energy"], avoid: ["diabetes", "weight_loss"], why: SUGAR },
  "2": { goals: ["immune", "energy"], avoid: ["diabetes", "weight_loss"], why: SUGAR },
  "18": { goals: ["immune", "energy"], avoid: ["diabetes", "weight_loss"], why: SUGAR },
  "40": { goals: ["immune", "energy"], avoid: ["diabetes", "weight_loss"], why: SUGAR },

  // ── กาแฟ — คาเฟอีน ──
  "3": { goals: ["energy", "brain"], avoid: ["sleep", "pressure"], why: CAFFEINE },
  "4": { goals: ["energy", "brain"], avoid: ["sleep", "pressure"], why: CAFFEINE },
  "27": { goals: ["energy", "brain"], avoid: ["sleep", "pressure"], why: CAFFEINE },
  "45": { goals: ["energy", "brain"], avoid: ["sleep", "pressure"], why: CAFFEINE },

  // ── ชาอูหลง — คาเฟอีนเช่นกัน (คนมักลืม) ──
  "44": { goals: ["digestion"], avoid: ["sleep"], why: CAFFEINE },

  // ── เครื่องหอม / สูดดม — กลุ่มเดียวในร้านที่ช่วยเรื่องการนอน ──
  "5": { goals: ["sleep", "stress"], avoid: [] },
  "10": { goals: ["sleep", "stress"], avoid: [] },
  "11": { goals: ["sleep", "stress"], avoid: [] },
  "22": { goals: ["sleep", "stress"], avoid: [] },
  "29": { goals: ["sleep", "stress"], avoid: [] },
  "42": { goals: ["sleep", "stress"], avoid: [] },
  "43": { goals: ["sleep", "stress"], avoid: [] },
  "33": { goals: ["stress"], avoid: [] },
  "19": { goals: ["stress"], avoid: [] },

  // การบูร — ห้ามรับประทาน (productUsage.ts). ไม่แนะนำเพื่อเป้าหมายสุขภาพใด ๆ.
  "38": { goals: [], avoid: [], why: "การบูร ใช้สูดดม/ทาภายนอกเท่านั้น" },

  // ── เครื่องเทศ ──
  "6": { goals: ["digestion"], avoid: [] },
  "34": { goals: ["digestion"], avoid: [] },
  "35": { goals: ["digestion"], avoid: [] },
  "39": { goals: ["digestion"], avoid: [] },
  "7": { goals: ["digestion", "immune", "diabetes"], avoid: [] },
  "8": { goals: ["digestion", "immune", "diabetes"], avoid: [] },
  "31": { goals: ["digestion", "immune", "diabetes"], avoid: [] },
  "36": { goals: ["digestion", "immune"], avoid: [] },
  "37": { goals: ["digestion", "immune", "diabetes"], avoid: [] },

  // ── น้ำผัก/ผลไม้ ──
  "9": { goals: ["immune", "digestion"], avoid: ["diabetes"], why: "น้ำตาลจากผลไม้" },

  // ── ของหวาน / เบเกอรี่ — ไม่ใช่ของเพื่อสุขภาพ ──
  "12": { goals: [], avoid: ["weight_loss", "diabetes"], why: SUGAR },
  "13": { goals: [], avoid: ["weight_loss", "diabetes"], why: SUGAR },
  "15": { goals: [], avoid: ["weight_loss", "diabetes"], why: SUGAR },
  "16": { goals: [], avoid: ["weight_loss", "diabetes"], why: SUGAR },
  "41": { goals: [], avoid: ["weight_loss", "diabetes"], why: SUGAR },
  // ช็อกโกแลต = โกโก้ → มีคาเฟอีน/ธีโอโบรมีน
  "14": { goals: [], avoid: ["weight_loss", "diabetes", "sleep"], why: `${SUGAR} · ${COCOA}` },
  "17": { goals: [], avoid: ["weight_loss", "diabetes", "sleep"], why: `${SUGAR} · ${COCOA}` },
  "28": { goals: [], avoid: ["weight_loss", "diabetes", "sleep"], why: `${SUGAR} · ${COCOA}` },

  // ── ชุดของขวัญ — สินค้าเชิงของฝาก ไม่ได้ขายสรรพคุณ ──
  "20": { goals: [], avoid: ["sleep"], why: `มีกาแฟ · ${CAFFEINE}` },
  "25": { goals: [], avoid: ["sleep", "weight_loss", "diabetes"], why: `มีกาแฟ + คุกกี้` },
  "21": { goals: [], avoid: [] },
  "23": { goals: [], avoid: [] },
  "24": { goals: [], avoid: [] },
  "26": { goals: [], avoid: [] },
};

const EMPTY: ProductGoals = { goals: [], avoid: [] };

export const goalsOf = (productId: string): ProductGoals => PRODUCT_GOALS[productId] ?? EMPTY;

/** How many of the asked-for goals this product genuinely supports. */
export const goalMatchCount = (productId: string, goals: HealthGoal[]): number =>
  goals.filter((g) => goalsOf(productId).goals.includes(g)).length;

/** Serves at least one of the goals asked about. */
export const servesAnyGoal = (productId: string, goals: HealthGoal[]): boolean =>
  goalMatchCount(productId, goals) > 0;

/**
 * True when the product must not be offered for ANY of these goals. Checked
 * before ranking, and applied to whatever the LLM proposes as well — a model
 * that suggests coffee for insomnia is overruled here, not asked nicely.
 */
export const isContraindicated = (productId: string, goals: HealthGoal[]): boolean =>
  goals.some((g) => goalsOf(productId).avoid.includes(g));

/** The reason, for logs and review. Never shown to a customer. */
export const contraindicationReason = (productId: string): string | undefined => goalsOf(productId).why;

/**
 * Spelled out for the LLM. Removing a product from the catalog it can see stops
 * it recommending that product; this stops it recommending the CLASS — a model
 * that has just explained why caffeine ruins sleep will still cheerfully suggest
 * a tea, which is what it did before this existed.
 */
const GOAL_BAN: Partial<Record<HealthGoal, string>> = {
  sleep: "ลูกค้ามีปัญหาเรื่องการนอน — ห้ามแนะนำหรือชักชวนให้ดื่ม/กินสิ่งที่มีคาเฟอีน (กาแฟ ชา ช็อกโกแลต) แม้จะเตือนข้อเสียไปแล้วก็ห้ามแนะนำ",
  pressure: "ลูกค้ามีปัญหาความดัน — ห้ามแนะนำเครื่องดื่มที่มีคาเฟอีน",
  diabetes: "ลูกค้าเป็นเบาหวาน — ห้ามแนะนำของหวาน น้ำผึ้ง เบเกอรี่ หรือน้ำผลไม้ที่มีน้ำตาลสูง",
  weight_loss: "ลูกค้าต้องการลดน้ำหนัก — ห้ามแนะนำของหวาน เบเกอรี่ หรือคุกกี้",
};

/** The safety constraints that apply to this question, as prompt text. */
export function goalBans(goals: HealthGoal[]): string[] {
  return goals.map((g) => GOAL_BAN[g]).filter((x): x is string => Boolean(x));
}
