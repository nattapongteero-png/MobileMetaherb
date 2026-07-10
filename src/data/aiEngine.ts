/**
 * Mock AI shopping-assistant engine — pure functions, no API calls.
 * Ported from the web (src/app/data/aiEngine.ts) and adapted to the mobile
 * CatalogProduct shape (category is a CategoryKey; no weight/stock/description).
 */
import type { CatalogProduct } from "./catalog";
import { CATEGORIES } from "./catalog";
import { goalMatchCount, isContraindicated } from "./productGoals";

type P = CatalogProduct;

export type Intent =
  | "greet" | "help"
  | "search" | "recommend" | "compare" | "bundle"
  | "promo" | "value"
  | "cart_add" | "cart_view" | "cart_remove" | "checkout"
  | "order_status" | "order_recent"
  | "qa" | "unknown";

/** Health goals we map free text to canonical labels. */
export type HealthGoal =
  | "sleep" | "weight_loss" | "weight_gain" | "skin" | "hair"
  | "brain" | "energy" | "immune" | "digestion" | "joint"
  | "pressure" | "diabetes" | "senior" | "kids" | "stress";

export interface CustomerProfile {
  goals: HealthGoal[];
  budgetMax?: number;
  lastIntent?: Intent;
  lastCategory?: string;
  lastQuery?: string;
}

const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
export function categoryLabel(key: string): string { return CAT_LABEL[key] ?? key; }

/** ===== Keyword → canonical mappings (Thai-leaning) ===== */
const GOAL_KEYWORDS: Record<HealthGoal, string[]> = {
  sleep:        ["นอน", "หลับ", "อินซอม", "พักผ่อน", "sleep", "insomnia"],
  weight_loss:  ["ลดน้ำหนัก", "ลดความอ้วน", "ผอม", "ดีท็อกซ์", "diet", "burn"],
  weight_gain:  ["เพิ่มน้ำหนัก", "อ้วน", "บำรุงร่างกาย"],
  skin:         ["ผิว", "หน้าใส", "สิว", "ฝ้า", "skin", "คอลลาเจน", "ขาว"],
  hair:         ["ผม", "หัวล้าน", "ผมร่วง", "hair"],
  brain:        ["สมอง", "ความจำ", "บำรุงสมอง", "memory", "focus"],
  energy:       ["พลังงาน", "อ่อนเพลีย", "เหนื่อย", "energy", "บำรุงกำลัง"],
  immune:       ["ภูมิคุ้มกัน", "ป้องกัน", "หวัด", "ไข้หวัด", "immune"],
  digestion:    ["ย่อย", "ท้อง", "ขับถ่าย", "ลำไส้", "stomach"],
  joint:        ["ข้อ", "เข่า", "ปวดข้อ", "joint", "กระดูก"],
  pressure:     ["ความดัน", "blood pressure"],
  diabetes:     ["เบาหวาน", "น้ำตาล", "diabetes"],
  senior:       ["ผู้สูงอายุ", "คนแก่", "ปู่ย่า", "ตายาย", "senior"],
  kids:         ["เด็ก", "ลูก", "kids"],
  stress:       ["เครียด", "วิตก", "stress", "anxiety"],
};

const GOAL_LABEL: Record<HealthGoal, string> = {
  sleep: "ช่วยนอนหลับ", weight_loss: "ลดน้ำหนัก", weight_gain: "เพิ่มน้ำหนัก",
  skin: "บำรุงผิว", hair: "บำรุงผม", brain: "บำรุงสมอง", energy: "เพิ่มพลังงาน",
  immune: "เสริมภูมิคุ้มกัน", digestion: "ช่วยย่อย-ขับถ่าย", joint: "บำรุงข้อ-เข่า",
  pressure: "ดูแลความดัน", diabetes: "ดูแลเบาหวาน", senior: "ผู้สูงอายุ",
  kids: "สำหรับเด็ก", stress: "ลดความเครียด",
};

/** Words that hint each goal might fit certain product names/categories. */

/** ===== Intent parser ===== */
export function detectIntent(text: string): Intent {
  const t = text.toLowerCase().trim();
  if (!t) return "unknown";
  if (/^(สวัสดี|hello|hi|หวัดดี|ดีครับ|ดีค่ะ)/i.test(t)) return "greet";
  if (/(ช่วยอะไร|ทำอะไรได้|ใช้งานยังไง|วิธีใช้|how to use|what can you)/i.test(t)) return "help";

  if (/(เปรียบเทียบ|compare|ต่างกัน|แบบไหนดีกว่า)/.test(t)) return "compare";
  if (/(จัดเซต|bundle|ชุด|แพ็ค|รวม|set)/.test(t)) return "bundle";
  if (/(โปร|promo|ส่วนลด|คูปอง|coupon|deal)/.test(t)) return "promo";
  if (/(คุ้ม|ความคุ้ม|value|ราคาต่อ|คุ้มกว่า)/.test(t)) return "value";

  if (/(เพิ่มใส่|ใส่ตะกร้า|add to cart|หยิบ.*ตะกร้า|เพิ่ม.*ตะกร้า)/.test(t)) return "cart_add";
  if (/(ตะกร้า|cart|รถเข็น)/.test(t) && /(ดู|แสดง|เปิด|view)/.test(t)) return "cart_view";
  if (/(เอาออก|ลบ.*ตะกร้า|remove)/.test(t)) return "cart_remove";
  if (/(ชำระ|checkout|สั่งซื้อ|สั่ง.*เลย|order now)/.test(t)) return "checkout";

  if (/(ออเดอร์.*ถึงไหน|order.*status|ติดตาม|เลข.*track|tracking)/.test(t)) return "order_status";
  if (/(ออเดอร์.*ล่าสุด|ประวัติ.*สั่ง|orders|my orders)/.test(t)) return "order_recent";

  if (/(แนะนำ|recommend|มีอะไร|มีตัว|แบบไหน|suggest)/.test(t)) return "recommend";
  if (/(หา|search|มี.*ไหม|มี|อยาก.*หา|มอง)/.test(t)) return "search";

  if (/(วิธีรับประทาน|กิน.*ยังไง|วิธี.*ใช้|ส่วนประกอบ|ข้อควรระวัง|กลุ่ม.*เหมาะ)/.test(t)) return "qa";

  return "unknown";
}

export function extractGoals(text: string): HealthGoal[] {
  const t = text.toLowerCase();
  const hits: HealthGoal[] = [];
  for (const g of Object.keys(GOAL_KEYWORDS) as HealthGoal[]) {
    if (GOAL_KEYWORDS[g].some((kw) => t.includes(kw.toLowerCase()))) hits.push(g);
  }
  return hits;
}

export function extractBudget(text: string): number | undefined {
  const m = text.match(/(\d{2,5})\s*(บาท|baht|฿|thb)?/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 50 && n <= 100000) return n;
  }
  return undefined;
}

/** Match free text against known category labels → returns the CategoryKey. */
export function extractCategory(text: string): string | undefined {
  const t = text.toLowerCase();
  for (const c of CATEGORIES) {
    if (t.includes(c.label.toLowerCase()) || t.includes(c.key)) return c.key;
  }
  return undefined;
}

export function goalLabel(g: HealthGoal): string { return GOAL_LABEL[g]; }

/** ===== Search / recommendation ===== */

/**
 * Does this product genuinely serve one of the goals? Answered by the curated
 * table (data/productGoals.ts), not by looking for herb names inside the product
 * title — no product is called "นอนไม่หลับ", so name matching scored every item
 * ≈ 0 and let the generic rating boost decide. That is how coffee ended up being
 * recommended for insomnia.
 */
export const goalHits = (p: P, goals: HealthGoal[]): number => goalMatchCount(p.id, goals);

/** Hard exclusion: caffeine for sleep, sugar for diabetes. Never overridable. */
export const goalExcluded = (p: P, goals: HealthGoal[]): boolean => isContraindicated(p.id, goals);

export function scoreProduct(p: P, goals: HealthGoal[], q: string): number {
  if (goalExcluded(p, goals)) return -1;
  let score = 0;
  const text = `${p.name} ${categoryLabel(p.category)}`.toLowerCase();

  q.toLowerCase().split(/\s+/).filter(Boolean).forEach((tok) => {
    if (tok.length < 2) return;
    if (text.includes(tok)) score += 3;
  });

  // A curated goal hit outweighs anything a name match or a rating can add.
  score += goalHits(p, goals) * 10;

  if (p.isRecommended) score += 1.5;
  if (p.isFlashSale) score += 1;
  if (p.rating >= 4.5) score += 1;

  return score;
}

export function searchProducts(
  products: P[],
  q: string,
  opts: { goals?: HealthGoal[]; budgetMax?: number; category?: string; limit?: number } = {},
): P[] {
  const goals = opts.goals ?? extractGoals(q);
  const budgetMax = opts.budgetMax;
  const cat = opts.category;
  const limit = opts.limit ?? 5;

  return products
    .filter((p) => !cat || p.category === cat)
    .filter((p) => !budgetMax || p.price <= budgetMax)
    .map((p) => ({ p, s: scoreProduct(p, goals, q) }))
    .filter(({ s }) => s > 0 || goals.length > 0 || q.trim().length === 0)
    .sort((a, b) => b.s - a.s || b.p.rating - a.p.rating)
    .slice(0, limit)
    .map(({ p }) => p);
}

/** Recommend top products for a goal even with no explicit query. */
export function recommendForGoals(products: P[], goals: HealthGoal[], limit = 5): P[] {
  if (goals.length === 0) {
    return [...products]
      .sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0) || b.rating - a.rating)
      .slice(0, limit);
  }
  // Only products that genuinely match a goal hint — never pad a themed set
  // with unrelated items (e.g. a ยาดม in a weight-loss set). Generic boosts
  // (isRecommended / rating) must not sneak an off-theme product in.
  const matched = products
    .filter((p) => !goalExcluded(p, goals))
    .map((p) => ({ p, hit: goalHits(p, goals), s: scoreProduct(p, goals, "") }))
    .filter(({ hit }) => hit > 0)
    .sort((a, b) => b.s - a.s || b.p.rating - a.p.rating)
    .slice(0, limit)
    .map(({ p }) => p);
  // Nothing in the catalog serves this goal → say so. This used to fall back to
  // "top picks", which is how an unrelated product got recommended for a symptom
  // it does nothing about. Every caller handles an empty list.
  return matched;
}

/** ===== Smart filter — price / rating / promo / benefit / sort (LLM agent) ===== */
const soldNum = (s?: string) => parseInt((s ?? "").replace(/[^0-9]/g, ""), 10) || 0;

export interface ProductFilter {
  query?: string;
  goals?: HealthGoal[];
  category?: string;
  maxPrice?: number;
  minPrice?: number;
  minRating?: number;
  promoOnly?: boolean;
  sort?: "price_asc" | "price_desc" | "rating" | "sold";
  limit?: number;
}

export function filterProducts(products: P[], f: ProductFilter): P[] {
  const goals = f.goals ?? [];
  const q = f.query ?? "";
  let list = products.filter((p) => {
    if (f.category && p.category !== f.category) return false;
    if (f.maxPrice != null && p.price > f.maxPrice) return false;
    if (f.minPrice != null && p.price < f.minPrice) return false;
    if (f.minRating != null && p.rating < f.minRating) return false;
    if (f.promoOnly && !(p.isFlashSale || p.hasCoupon || (p.discountPercent ?? 0) > 0)) return false;
    return true;
  });

  const scored = q.trim().length > 0 || goals.length > 0;
  if (scored) {
    list = list
      // Contraindicated products are dropped outright, whatever else matches.
      .filter((p) => !goalExcluded(p, goals))
      .map((p) => ({ p, s: scoreProduct(p, goals, q) }))
      // With a goal, only products that genuinely serve it survive. `s > 0` used
      // to be waived whenever a goal was present, which let every product
      // through on its rating boost alone.
      .filter(({ p, s }) => (goals.length > 0 ? goalHits(p, goals) > 0 : s > 0))
      .sort((a, b) => b.s - a.s || b.p.rating - a.p.rating)
      .map(({ p }) => p);
  }

  switch (f.sort) {
    case "price_asc": list = [...list].sort((a, b) => a.price - b.price); break;
    case "price_desc": list = [...list].sort((a, b) => b.price - a.price); break;
    case "rating": list = [...list].sort((a, b) => b.rating - a.rating); break;
    case "sold": list = [...list].sort((a, b) => soldNum(b.sold) - soldNum(a.sold)); break;
    default:
      if (!scored) list = [...list].sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0) || b.rating - a.rating);
  }
  return list.slice(0, f.limit ?? 6);
}

/** ===== Comparison ===== */
export interface ComparisonRow {
  label: string;
  values: (string | number)[];
  highlight?: number; // index of "best" cell
}

export function compareProducts(products: P[]): { products: P[]; rows: ComparisonRow[]; summary: string } {
  if (products.length < 2) return { products, rows: [], summary: "ต้องเปรียบเทียบอย่างน้อย 2 รายการ" };

  const rows: ComparisonRow[] = [
    { label: "ราคา (บาท)", values: products.map((p) => p.price), highlight: argMin(products.map((p) => p.price)) },
    { label: "ราคาเดิม",   values: products.map((p) => p.originalPrice ?? p.price) },
    { label: "ส่วนลด %",   values: products.map((p) => p.discountPercent ?? 0), highlight: argMax(products.map((p) => p.discountPercent ?? 0)) },
    { label: "คะแนนรีวิว", values: products.map((p) => p.rating), highlight: argMax(products.map((p) => p.rating)) },
    { label: "หมวดหมู่",   values: products.map((p) => categoryLabel(p.category)) },
    { label: "ยอดขาย",     values: products.map((p) => p.sold) },
  ];

  const cheapestIdx = argMin(products.map((p) => p.price));
  const priciestIdx = argMax(products.map((p) => p.price));
  const saving = Math.round((1 - products[cheapestIdx].price / products[priciestIdx].price) * 100);
  const summary = cheapestIdx === priciestIdx
    ? `ราคาใกล้เคียงกัน เลือกตามคะแนนรีวิว (${products[argMax(products.map((p) => p.rating))].name})`
    : `หากเน้นความคุ้มค่า ${products[cheapestIdx].name} ราคาถูกกว่าประมาณ ${saving}%`;

  return { products, rows, summary };
}

function argMin(arr: number[]): number { return arr.reduce((bi, v, i, a) => (v < a[bi] ? i : bi), 0); }
function argMax(arr: number[]): number { return arr.reduce((bi, v, i, a) => (v > a[bi] ? i : bi), 0); }

/** ===== Value analysis (no per-weight unit on mobile catalog) ===== */
export function valueAnalysis(p: P): { verdict: string; savings?: string; discountPct: number } {
  const discountPct = p.discountPercent ?? (p.originalPrice && p.originalPrice > p.price
    ? Math.round((1 - p.price / p.originalPrice) * 100)
    : 0);
  const savings = p.originalPrice && p.originalPrice > p.price
    ? `ประหยัด ฿${(p.originalPrice - p.price).toFixed(0)} (${discountPct}%)`
    : undefined;
  let verdict = p.price < 100 ? "คุ้มมาก" : p.price < 250 ? "คุ้ม" : "ราคาปกติ";
  if (p.isFlashSale) verdict = "Flash Sale — คุ้มสุดๆ";
  else if (discountPct >= 30) verdict = "ส่วนลดเยอะ คุ้มมาก";
  return { verdict, savings, discountPct };
}

/** ===== Bundle generator ===== */
export function buildBundle(products: P[], goals: HealthGoal[], budgetMax?: number): { items: P[]; total: number; discount: number; finalPrice: number; name: string } {
  const candidates = recommendForGoals(products, goals, 8);
  const picked: P[] = [];
  let total = 0;
  for (const p of candidates) {
    if (budgetMax && total + p.price > budgetMax * 0.9) continue;
    picked.push(p);
    total += p.price;
    if (picked.length === 3) break;
  }
  if (picked.length === 0 && candidates.length > 0) picked.push(candidates[0]);
  total = picked.reduce((s, p) => s + p.price, 0);
  const discount = Math.round(total * 0.1);
  const name = goals.length > 0 ? `ชุด${goalLabel(goals[0])}` : "ชุดแนะนำ";
  return { items: picked, total, discount, finalPrice: total - discount, name };
}

/** ===== Promotion advisor ===== */
export interface PromoSuggestion {
  type: "discount" | "freeship" | "upsell";
  title: string;
  body: string;
}
export function suggestPromos(cartTotal: number, freeshipThreshold = 500, discountThreshold = 1000): PromoSuggestion[] {
  const out: PromoSuggestion[] = [];
  if (cartTotal === 0) return out;
  if (cartTotal < freeshipThreshold) {
    out.push({ type: "freeship", title: "ใกล้ได้ส่งฟรี!", body: `เพิ่มอีก ฿${(freeshipThreshold - cartTotal).toLocaleString()} รับส่งฟรี` });
  } else {
    out.push({ type: "freeship", title: "ส่งฟรี ✓", body: "ออเดอร์นี้ได้ส่งฟรีแล้ว" });
  }
  if (cartTotal < discountThreshold) {
    out.push({ type: "discount", title: "ใกล้ได้ส่วนลด 10%", body: `เพิ่มอีก ฿${(discountThreshold - cartTotal).toLocaleString()} รับโค้ดส่วนลด` });
  }
  if (cartTotal >= 1500) {
    out.push({ type: "upsell", title: "VIP คุ้มกว่า", body: "ออเดอร์ ≥ ฿1,500 ใช้โค้ด VIP10 ลดเพิ่ม 10%" });
  }
  return out;
}

/** Cross-sell from a "seed" product. */
export function crossSell(products: P[], seed: P, limit = 3): P[] {
  return products
    .filter((p) => p.id !== seed.id && p.category === seed.category)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

/** ===== Quick-reply suggestions based on intent ===== */
export function quickReplies(intent: Intent, profile: CustomerProfile): string[] {
  switch (intent) {
    case "greet":
    case "unknown":
      return ["มีสมุนไพรช่วยนอนหลับไหม", "อยากลดน้ำหนัก แนะนำหน่อย", "เปรียบเทียบสินค้าขายดี", "ออเดอร์ล่าสุด"];
    case "search":
    case "recommend":
      return ["จัดเซตแนะนำให้หน่อย", "ตัวที่ถูกที่สุด", "เปรียบเทียบ 2 ตัวบนสุด", "ดูโปรโมชั่น"];
    case "compare":
      return ["ตัวไหนคุ้มกว่า", "เพิ่มตัวคุ้มสุดเข้าตะกร้า", "มีโปรไหม"];
    case "cart_view":
    case "promo":
      return ["ชำระเงิน", "แนะนำของแถม", "ลบสินค้าออก"];
    case "checkout":
      return ["ดูตะกร้า", "หาสินค้าเพิ่ม", "ออเดอร์ของฉัน"];
    default:
      return ["หาสินค้าใหม่", "ดูตะกร้า", "ออเดอร์ของฉัน", profile.goals[0] ? `${goalLabel(profile.goals[0])} อะไรดี` : "จัดเซตแนะนำ"];
  }
}
