/* =============================================================================
 *  Owner-side trial registrations + deterministic evaluation engine.
 *
 *  Ported 1:1 from the METAHERB web app
 *  (../Metaherb/src/app/pages/owner/OwnerTrialTabs.tsx +
 *   ../Metaherb/src/app/data/trialProducts.ts).
 *
 *  This is PURE LOGIC — no JSX, no localStorage/window. The web version seeds
 *  localStorage on first load and merges real submissions on top of a mock
 *  array; on mobile (mockup) we keep ONLY the static MOCK_REGISTRATIONS array.
 *
 *  The synth helpers (mulberry32 / seedFor / weightedPick / biasedScale /
 *  biasedNps + buildMockEvaluation) are copied VERBATIM so the enriched numbers
 *  reproduce the web dashboard 1:1 (e.g. trial-1 → female 13 / male 7 / lgbtq 1,
 *  NPS skewed +, ~15 evaluated rows).
 *
 *  The question library / generateEvalQuestions / EvalQuestion / PHASE_META are
 *  already ported in ./evalQuestions — we re-export them here so this module is
 *  the single import surface for the detail screen without duplicating the
 *  literal question lib (one source of truth).
 *  ========================================================================== */

import {
  generateEvalQuestions,
  type EvalQuestion,
  type TestObjective,
  type Phase,
  type ConditionalAnswer,
  PHASE_META,
} from "./evalQuestions";

// Re-export the shared question-engine surface so callers can import everything
// from this one module.
export { generateEvalQuestions, PHASE_META };
export type { EvalQuestion, TestObjective, Phase, ConditionalAnswer };

/* =============================================================================
 *  Types — ported from web trialProducts.ts
 *  ========================================================================== */

export type Evaluation = {
  /** Overall 1-5 rating — from the always-on `core_overall` (stars_1_5) question. */
  overall: number;
  /** Per-criterion 1-5 ratings, keyed by criterion LABEL (legacy / whatToTest). */
  criteria: Record<string, number>;
  /** Free-form comment — from `core_text` (always-on). */
  comment: string;
  /** Would the tester recommend? Derived from NPS >= 7. */
  wouldRecommend: boolean;
  /** Per-question 1-5 scale ratings keyed by stable question ID. */
  scoreById?: Record<string, number>;
  /** NPS 0-10 scores keyed by question ID (`core_nps`). */
  npsScores?: Record<string, number>;
  /** Multiple-choice single selections per question ID. */
  mcAnswers?: Record<string, string>;
  /** Multi-select tag arrays per question ID. */
  tagAnswers?: Record<string, string[]>;
  /** A/B preference per question ID ("A" | "B"). */
  abChoices?: Record<string, "A" | "B">;
  /** Free-text answers for non-core_text text questions (price ceiling, A/B diff). */
  textAnswers?: Record<string, string>;
  /** Yes/No + note responses for conditional questions (side effects). */
  conditionalAnswers?: Record<string, ConditionalAnswer>;
};

import {
  evalComment,
  overallScore,
  registrationsForTrial,
  wouldRecommend,
  type TrialRegistration as StoredRegistration,
} from "../store/trials";

export type Gender = "male" | "female" | "lgbtq";
export type AgeRange = "15-24" | "25-34" | "35-44" | "45-54" | "55+";

export type Registration = {
  /** Set for real applicants from the shared table; absent on the demo cohort. */
  id?: string;
  trialId: string;
  name: string;
  phone: string;
  address: string;
  motivation: string;
  submittedAt: number;
  /** Owner approved the application. */
  approvedAt?: number;
  /** Owner rejected the application. */
  rejectedAt?: number;
  /** User submitted the evaluation survey. */
  evaluatedAt?: number;
  /** Filled when user submits the evaluation form. */
  evaluation?: Evaluation;
  /** Tester demographics — powers the trial detail dashboard. */
  gender?: Gender;
  ageRange?: AgeRange;
};

export type RegistrationStatus = "pending_approval" | "approved" | "evaluated" | "rejected";

export function getRegistrationStatus(r: Registration): RegistrationStatus {
  if (r.rejectedAt) return "rejected";
  if (r.evaluatedAt) return "evaluated";
  if (r.approvedAt) return "approved";
  return "pending_approval";
}

/* =============================================================================
 *  Per-question analytics — PerQuestionStat shape + computeQuestionStat.
 *  Ported from OwnerTrialTabs.tsx (L3571-3752).
 *  ========================================================================== */

type ScaleBucketWithGender = {
  count: number;
  female: number;
  male: number;
  lgbtq: number;
  isTop: boolean;
};

export type PerQuestionStat = {
  q: EvalQuestion;
  kind: "scale" | "nps" | "mc" | "tag" | "cond" | "text" | "ab";
  /** Number of evaluated registrations that had a non-null answer. */
  responses: number;
  /** kind === "scale" (scale_1_5 + stars_1_5). */
  scale?: { dist: Record<number, ScaleBucketWithGender>; avg: number; topAnswer: number };
  /** kind === "nps". */
  nps?: { dist: number[]; score: number; promoters: number; passives: number; detractors: number };
  /** kind === "mc". options preserves declared order. */
  mc?: { options: string[]; counts: Record<string, number>; topOption: string | null };
  /** kind === "tag". */
  tag?: { counts: Record<string, number>; total: number };
  /** kind === "cond". */
  cond?: {
    yes: number;
    no: number;
    notes: string[];
    regsWithNotes: { reg: Registration; note: string }[];
    noRegs: Registration[];
  };
  /** kind === "text". */
  text?: { samples: string[]; samplesByReg: { reg: Registration; value: string }[] };
  /** kind === "ab". */
  ab?: {
    a: number;
    b: number;
    aPct: number;
    bPct: number;
    winner: "A" | "B" | null;
    gap: number;
    aRegs: Registration[];
    bRegs: Registration[];
  };
};

/** Read a question's answer from an Evaluation, dispatching on q.id + q.type. */
function readAnswer(ev: Evaluation | undefined, q: EvalQuestion): unknown {
  if (!ev) return undefined;
  if (q.id === "core_overall") return ev.overall;
  if (q.id === "core_text") return ev.comment || undefined;
  switch (q.type) {
    case "scale_1_5":
    case "stars_1_5":
      return ev.scoreById?.[q.id] ?? ev.criteria?.[q.label];
    case "nps_0_10":
      return ev.npsScores?.[q.id];
    case "multiple_choice":
      return ev.mcAnswers?.[q.id];
    case "tag":
      return ev.tagAnswers?.[q.id];
    case "conditional":
      return ev.conditionalAnswers?.[q.id];
    case "text":
      return ev.textAnswers?.[q.id];
    case "ab_choice":
      return ev.abChoices?.[q.id];
  }
}

/** Aggregate answers across all evaluated testers for one question. */
export function computeQuestionStat(q: EvalQuestion, evaluated: Registration[]): PerQuestionStat {
  switch (q.type) {
    case "scale_1_5":
    case "stars_1_5": {
      const seed = (): ScaleBucketWithGender => ({ count: 0, female: 0, male: 0, lgbtq: 0, isTop: false });
      const dist: Record<number, ScaleBucketWithGender> = { 1: seed(), 2: seed(), 3: seed(), 4: seed(), 5: seed() };
      let sum = 0,
        count = 0;
      evaluated.forEach((r) => {
        const v = readAnswer(r.evaluation, q);
        if (typeof v === "number" && v >= 1 && v <= 5) {
          const b = dist[v];
          b.count++;
          if (r.gender === "female") b.female++;
          else if (r.gender === "male") b.male++;
          else if (r.gender === "lgbtq") b.lgbtq++;
          sum += v;
          count++;
        }
      });
      const topAnswer = [5, 4, 3, 2, 1].reduce((a, b) => (dist[a].count >= dist[b].count ? a : b), 5);
      if (dist[topAnswer].count > 0) dist[topAnswer].isTop = true;
      return { q, kind: "scale", responses: count, scale: { dist, avg: count > 0 ? sum / count : 0, topAnswer } };
    }
    case "nps_0_10": {
      const dist = new Array(11).fill(0);
      let promoters = 0,
        passives = 0,
        detractors = 0,
        count = 0;
      evaluated.forEach((r) => {
        const v = readAnswer(r.evaluation, q);
        if (typeof v === "number" && v >= 0 && v <= 10) {
          dist[v]++;
          count++;
          if (v >= 9) promoters++;
          else if (v >= 7) passives++;
          else detractors++;
        }
      });
      const score = count > 0 ? Math.round(((promoters - detractors) / count) * 100) : 0;
      return { q, kind: "nps", responses: count, nps: { dist, score, promoters, passives, detractors } };
    }
    case "multiple_choice": {
      const options = q.options ?? [];
      const counts: Record<string, number> = {};
      options.forEach((o) => {
        counts[o] = 0;
      });
      let total = 0;
      evaluated.forEach((r) => {
        const v = readAnswer(r.evaluation, q);
        if (typeof v === "string" && v.length > 0) {
          counts[v] = (counts[v] ?? 0) + 1;
          total++;
        }
      });
      let topOption: string | null = null;
      let topCount = 0;
      options.forEach((o) => {
        if ((counts[o] ?? 0) > topCount) {
          topOption = o;
          topCount = counts[o];
        }
      });
      return { q, kind: "mc", responses: total, mc: { options, counts, topOption } };
    }
    case "tag": {
      const counts: Record<string, number> = {};
      let total = 0;
      evaluated.forEach((r) => {
        const v = readAnswer(r.evaluation, q);
        if (Array.isArray(v)) {
          v.forEach((t) => {
            if (typeof t === "string" && t.length > 0) {
              counts[t] = (counts[t] ?? 0) + 1;
            }
          });
          if (v.length > 0) total++;
        }
      });
      return { q, kind: "tag", responses: total, tag: { counts, total } };
    }
    case "conditional": {
      let yes = 0,
        no = 0;
      const notes: string[] = [];
      const regsWithNotes: { reg: Registration; note: string }[] = [];
      const noRegs: Registration[] = [];
      evaluated.forEach((r) => {
        const v = readAnswer(r.evaluation, q) as ConditionalAnswer | undefined;
        if (v) {
          if (v.has) {
            yes++;
            const note = v.note?.trim() ?? "";
            if (note) notes.push(note);
            regsWithNotes.push({ reg: r, note });
          } else {
            no++;
            noRegs.push(r);
          }
        }
      });
      return { q, kind: "cond", responses: yes + no, cond: { yes, no, notes, regsWithNotes, noRegs } };
    }
    case "text": {
      const samples: string[] = [];
      const samplesByReg: { reg: Registration; value: string }[] = [];
      evaluated.forEach((r) => {
        const v = readAnswer(r.evaluation, q);
        if (typeof v === "string" && v.trim().length > 0) {
          const trimmed = v.trim();
          samples.push(trimmed);
          samplesByReg.push({ reg: r, value: trimmed });
        }
      });
      return { q, kind: "text", responses: samples.length, text: { samples, samplesByReg } };
    }
    case "ab_choice": {
      const aRegs: Registration[] = [];
      const bRegs: Registration[] = [];
      evaluated.forEach((r) => {
        const v = readAnswer(r.evaluation, q);
        if (v === "A") aRegs.push(r);
        else if (v === "B") bRegs.push(r);
      });
      const a = aRegs.length;
      const b = bRegs.length;
      const total = a + b;
      const aPct = total > 0 ? Math.round((a / total) * 100) : 0;
      const bPct = total > 0 ? Math.round((b / total) * 100) : 0;
      const winner: "A" | "B" | null = total === 0 ? null : a > b ? "A" : b > a ? "B" : null;
      return {
        q,
        kind: "ab",
        responses: total,
        ab: { a, b, aPct, bPct, winner, gap: Math.abs(aPct - bPct), aRegs, bRegs },
      };
    }
  }
}

/* =============================================================================
 *  Trial engine config — the FIELDS buildMockEvaluation needs off each trial
 *  (category + testObjectives + whatToTest). Ported from web trialProducts.ts.
 *
 *  The web `buildMockEvaluation` looks these up off TRIAL_PRODUCTS; the mobile
 *  TrialProductsScreen.TRIAL_PRODUCTS doesn't carry testObjectives/whatToTest,
 *  so we keep a dedicated, minimal config map here keyed by WEB trial ids.
 *  ========================================================================== */

type TrialEvalConfig = {
  category: string;
  testObjectives: TestObjective[];
  whatToTest: string[];
};

const DEFAULT_OBJECTIVES: TestObjective[] = ["efficacy", "packaging", "market", "formula_ab"];

const TRIAL_EVAL_CONFIG: Record<string, TrialEvalConfig> = {
  "trial-1": {
    category: "เครื่องสำอาง",
    testObjectives: ["efficacy", "packaging", "market", "formula_ab"],
    whatToTest: [
      "ระดับความชุ่มชื้นผิวตอนนี้",
      "ความกระจ่างใสของผิวตอนนี้",
      "ปัญหาผิวที่ต้องการแก้ไข",
      "ความพึงพอใจสภาพผิวโดยรวมตอนนี้",
      "ผิวชุ่มชื้นขึ้นเทียบกับก่อนใช้",
      "ผิวกระจ่างใสขึ้น",
      "ปัญหาผิวที่เลือกไว้ดีขึ้นแค่ไหน",
      "ผลข้างเคียง / อาการแพ้",
      "ดีไซน์ / ความสวยงาม",
      "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)",
      "First Impression",
      "Purchase Intent — คุณจะซื้อจริงไหม",
      "ราคาสูงสุดที่ยอมจ่าย",
      "เหมาะกับกลุ่มเป้าหมายแบบใด",
      "ชอบสูตรไหนมากกว่า",
      "ความแตกต่างที่สังเกตได้",
      "ความพึงพอใจโดยรวม",
      "แนะนำให้คนอื่น (NPS)",
      "คำแนะนำเพิ่มเติม",
    ],
  },
  "trial-2": {
    category: "อาหาร / เครื่องดื่ม",
    testObjectives: ["efficacy", "packaging", "market", "formula_ab"],
    whatToTest: [
      "รสชาติเครื่องดื่มที่ดื่มเป็นประจำ",
      "ผลที่รู้สึกได้หลังดื่ม",
      "ดีไซน์ / ความสวยงาม",
      "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)",
      "First Impression",
      "Purchase Intent — คุณจะซื้อจริงไหม",
      "ราคาสูงสุดที่ยอมจ่าย",
      "เหมาะกับกลุ่มเป้าหมายแบบใด",
      "ชอบสูตรไหนมากกว่า",
      "ความแตกต่างที่สังเกตได้",
      "ความพึงพอใจโดยรวม",
      "แนะนำให้คนอื่น (NPS)",
      "คำแนะนำเพิ่มเติม",
    ],
  },
  "trial-4": {
    category: "สุขภาพ / อาหารเสริม",
    testObjectives: ["efficacy", "packaging", "market", "formula_ab"],
    whatToTest: [
      "ปัญหาสุขภาพที่ต้องการแก้",
      "ผลที่รู้สึกได้หลังใช้ครบกำหนด",
      "ผลข้างเคียง / อาการไม่พึงประสงค์",
      "ดีไซน์ / ความสวยงาม",
      "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)",
      "First Impression",
      "Purchase Intent — คุณจะซื้อจริงไหม",
      "ราคาสูงสุดที่ยอมจ่าย",
      "เหมาะกับกลุ่มเป้าหมายแบบใด",
      "ชอบสูตรไหนมากกว่า",
      "ความแตกต่างที่สังเกตได้",
      "ความพึงพอใจโดยรวม",
      "แนะนำให้คนอื่น (NPS)",
      "คำแนะนำเพิ่มเติม",
    ],
  },
  "trial-6": {
    category: "อโรมา / เครื่องหอม",
    testObjectives: ["efficacy", "packaging", "market", "formula_ab"],
    whatToTest: [
      "ระดับปัญหาที่ต้องการแก้ตอนนี้",
      "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด",
      "ผลข้างเคียง / อาการไม่พึงประสงค์",
      "ดีไซน์ / ความสวยงาม",
      "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)",
      "First Impression",
      "Purchase Intent — คุณจะซื้อจริงไหม",
      "ราคาสูงสุดที่ยอมจ่าย",
      "เหมาะกับกลุ่มเป้าหมายแบบใด",
      "ชอบสูตรไหนมากกว่า",
      "ความแตกต่างที่สังเกตได้",
      "ความพึงพอใจโดยรวม",
      "แนะนำให้คนอื่น (NPS)",
      "คำแนะนำเพิ่มเติม",
    ],
  },
  "trial-eq": {
    category: "อุปกรณ์ / เครื่องมือ",
    testObjectives: ["efficacy", "packaging", "market", "formula_ab"],
    whatToTest: [
      "ระดับปัญหาที่ต้องการแก้ตอนนี้",
      "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด",
      "ผลข้างเคียง / อาการไม่พึงประสงค์",
      "ดีไซน์ / ความสวยงาม",
      "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)",
      "First Impression",
      "Purchase Intent — คุณจะซื้อจริงไหม",
      "ราคาสูงสุดที่ยอมจ่าย",
      "เหมาะกับกลุ่มเป้าหมายแบบใด",
      "ชอบสูตรไหนมากกว่า",
      "ความแตกต่างที่สังเกตได้",
      "ความพึงพอใจโดยรวม",
      "แนะนำให้คนอื่น (NPS)",
      "คำแนะนำเพิ่มเติม",
    ],
  },
};

/** Map a mobile product `category` string → an eval config (for synthesised cohorts
 *  on trials that have no hand-authored base rows). Mirrors the web category buckets. */
function configForCategory(category: string): TrialEvalConfig {
  // Re-use the closest hand-authored config that matches the category, falling
  // back to a cosmetic-style efficacy form.
  switch (category) {
    case "อาหาร / เครื่องดื่ม":
      return TRIAL_EVAL_CONFIG["trial-2"];
    case "สุขภาพ / อาหารเสริม":
      return TRIAL_EVAL_CONFIG["trial-4"];
    case "อโรมา / เครื่องหอม":
      return TRIAL_EVAL_CONFIG["trial-6"];
    case "อุปกรณ์ / เครื่องมือ":
      return TRIAL_EVAL_CONFIG["trial-eq"];
    case "เครื่องสำอาง":
    default:
      return TRIAL_EVAL_CONFIG["trial-1"];
  }
}

/* =============================================================================
 *  Deterministic synth helpers — copied VERBATIM from OwnerTrialTabs.tsx so the
 *  enriched numbers are byte-for-byte identical to the web dashboard.
 *  ========================================================================== */

/** Deterministic 32-bit PRNG (mulberry32) so mock data is identical across reloads. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** djb2-style hash over a string → 32-bit seed for mulberry32. */
function seedFor(parts: string): number {
  let h = 5381;
  for (let i = 0; i < parts.length; i++) h = (h * 33) ^ parts.charCodeAt(i);
  return h >>> 0;
}

/** Pick an item from `pool` weighted by index — earlier items more likely (~60/30/10). */
function weightedPick<T>(pool: T[], rng: () => number, frontBias = 0.6): T {
  if (pool.length === 0) throw new Error("weightedPick: empty pool");
  if (pool.length === 1) return pool[0];
  const r = rng();
  if (r < frontBias) return pool[Math.floor(rng() * Math.min(2, pool.length))];
  return pool[Math.floor(rng() * pool.length)];
}

/** Bias an integer 1-5 toward the middle-high end (most evaluations skew positive). */
function biasedScale(rng: () => number, mean: number): number {
  const noise = (rng() - 0.5) * 2; // -1..1
  const v = Math.round(mean + noise * 1.2);
  return Math.max(1, Math.min(5, v));
}

/** Bias an NPS 0-10 toward 7-10 (matches a typical promoter-heavy beta cohort). */
function biasedNps(rng: () => number): number {
  const r = rng();
  if (r < 0.55) return 9 + Math.floor(rng() * 2); // 9-10 (promoter)
  if (r < 0.85) return 7 + Math.floor(rng() * 2); // 7-8  (passive)
  return Math.floor(rng() * 7); // 0-6  (detractor)
}

/** Tag pools per category — pulled in when generating multi-select tag answers. */
const TAG_POOLS: Record<string, string[]> = {
  "เครื่องสำอาง": ["นุ่ม", "ลื่น", "ฉ่ำ", "ซึมไว", "เย็น", "หอมอ่อน", "บางเบา"],
  "อาหาร / เครื่องดื่ม": ["หอม", "กลมกล่อม", "สดชื่น", "ดื่มง่าย", "หวานน้อย", "ขมเล็กน้อย"],
  "สุขภาพ / อาหารเสริม": ["กลืนง่าย", "ไม่ขม", "ไม่ติดคอ", "ขนาดพอดี", "ไม่มีกลิ่น"],
  "อโรมา / เครื่องหอม": ["หอมโทนอุ่น", "หอมโทนเย็น", "ผ่อนคลาย", "สดชื่น", "ติดทนนาน"],
  "อุปกรณ์ / เครื่องมือ": ["ใช้ง่าย", "พกพาสะดวก", "เงียบ", "ดูพรีเมียม", "ขนาดพอดี"],
};

/** Realistic side-effect notes for the conditional safety question. */
const SIDE_NOTES = [
  "ผิวแดงเล็กน้อยช่วงแรก หายไปใน 2-3 วัน",
  "รู้สึกแสบเบาๆ ตอนเริ่มใช้ แต่ปรับตัวได้",
  "คันบริเวณที่ทาเป็นบางครั้ง",
  "มีผื่นเล็กน้อยช่วงแรก",
  "รู้สึกร้อนนิดหน่อยตอนทาแรก",
];

/** Realistic "ความแตกต่างที่สังเกตได้" (A/B diff) notes. */
const AB_DIFF_NOTES = [
  "สูตร A เนื้อนุ่มกว่า แต่ B หอมกว่า",
  "B ซึมไวกว่า แต่ A ให้ความชุ่มชื้นนานกว่า",
  "ทั้งสองสูตรดี แต่ A เข้ากับผิวมากกว่า",
  "สูตร B เนื้อเข้มข้นกว่า เหมาะกับผิวแห้ง",
  "A กลิ่นนุ่มกว่า เหมาะใช้กลางวัน",
  "ไม่ต่างกันมาก ทั้งคู่ใช้แล้วผิวดีขึ้น",
];

/** Build a fully-populated Evaluation for one tester on one trial.
 *  - `seed` is a stable per-tester key (the registration index).
 *  - `overrides` lets seed rows preserve their hand-authored overall/comment/wouldRecommend. */
function buildMockEvaluation(
  trialId: string,
  seed: number,
  overrides?: Partial<Evaluation>,
  configOverride?: TrialEvalConfig,
): Evaluation {
  const config = configOverride ?? TRIAL_EVAL_CONFIG[trialId];
  // Trial not in the static config (e.g. a synthesised id without category info):
  // fall back to the override only — don't crash.
  if (!config) {
    return {
      overall: overrides?.overall ?? 4,
      criteria: overrides?.criteria ?? {},
      comment: overrides?.comment ?? "",
      wouldRecommend: overrides?.wouldRecommend ?? true,
      ...overrides,
    };
  }
  const objectives = config.testObjectives ?? [];
  const allQuestions = objectives.length > 0 ? generateEvalQuestions(objectives, config.category) : [];
  // Defensive: empty objectives → only seed minimal scale data for whatToTest labels.
  if (allQuestions.length === 0) {
    const rng = mulberry32(seedFor(`${trialId}:fallback:${seed}`));
    const criteria: Record<string, number> = { ...(overrides?.criteria ?? {}) };
    for (const label of config.whatToTest) {
      if (criteria[label] === undefined) criteria[label] = biasedScale(rng, 4);
    }
    return {
      overall: overrides?.overall ?? biasedScale(rng, 4),
      criteria,
      comment: overrides?.comment ?? "",
      wouldRecommend: overrides?.wouldRecommend ?? rng() > 0.25,
    };
  }

  const criteria: Record<string, number> = { ...(overrides?.criteria ?? {}) };
  const scoreById: Record<string, number> = {};
  const npsScores: Record<string, number> = {};
  const mcAnswers: Record<string, string> = {};
  const tagAnswers: Record<string, string[]> = {};
  const abChoices: Record<string, "A" | "B"> = {};
  const textAnswers: Record<string, string> = {};
  const conditionalAnswers: Record<string, ConditionalAnswer> = {};

  let overall = overrides?.overall ?? 4;
  let comment = overrides?.comment ?? "";
  // Bias `meanScore` by the seed row's overall so cards look consistent with the hero comment.
  const meanScore = overrides?.overall ?? 4;

  for (const q of allQuestions) {
    const rng = mulberry32(seedFor(`${trialId}:${q.id}:${seed}`));
    switch (q.type) {
      case "scale_1_5": {
        const v = biasedScale(rng, meanScore);
        scoreById[q.id] = v;
        // Mirror into legacy criteria map keyed by label so existing scale charts keep working.
        if (criteria[q.label] === undefined) criteria[q.label] = v;
        break;
      }
      case "stars_1_5": {
        // core_overall lives at evaluation.overall — only override if no seed value given.
        if (overrides?.overall === undefined) overall = biasedScale(rng, meanScore);
        break;
      }
      case "nps_0_10": {
        // Bias NPS upward if the row was overall-positive; downward otherwise.
        const v = meanScore >= 4 ? biasedNps(rng) : Math.floor(rng() * 8);
        npsScores[q.id] = v;
        break;
      }
      case "multiple_choice": {
        if (q.options && q.options.length > 0) {
          mcAnswers[q.id] = weightedPick(q.options, rng);
        }
        break;
      }
      case "tag": {
        const pool = TAG_POOLS[config.category] ?? TAG_POOLS["เครื่องสำอาง"];
        const count = 1 + Math.floor(rng() * 3); // 1-3 tags
        const picks = new Set<string>();
        while (picks.size < Math.min(count, pool.length)) picks.add(pool[Math.floor(rng() * pool.length)]);
        tagAnswers[q.id] = Array.from(picks);
        break;
      }
      case "conditional": {
        // ~30% report an issue.
        const has = rng() < 0.3;
        conditionalAnswers[q.id] = has
          ? { has: true, note: SIDE_NOTES[Math.floor(rng() * SIDE_NOTES.length)] }
          : { has: false };
        break;
      }
      case "text": {
        if (q.id === "core_text") {
          // Always-on free comment is the hero comment from the seed row.
          if (comment === "") comment = "ใช้แล้วประทับใจ จะแนะนำเพื่อน";
        } else if (q.id === "mkt_price") {
          const base = 240 + Math.floor(rng() * 8) * 30;
          textAnswers[q.id] = `฿${base}`;
        } else if (q.id === "ab_diff") {
          textAnswers[q.id] = AB_DIFF_NOTES[Math.floor(rng() * AB_DIFF_NOTES.length)];
        } else {
          textAnswers[q.id] = "—";
        }
        break;
      }
      case "ab_choice": {
        abChoices[q.id] = rng() < 0.55 ? "A" : "B";
        break;
      }
    }
  }

  // wouldRecommend derived from the dominant NPS if present, else from overall, else override.
  const npsList = Object.values(npsScores);
  const derivedRecommend =
    npsList.length > 0 ? npsList.filter((n) => n >= 7).length >= npsList.length / 2 : overall >= 4;

  return {
    overall,
    criteria,
    comment,
    wouldRecommend: overrides?.wouldRecommend ?? derivedRecommend,
    scoreById,
    npsScores,
    mcAnswers,
    tagAnswers,
    abChoices,
    textAnswers,
    conditionalAnswers,
  };
}

/* =============================================================================
 *  MOCK_REGISTRATIONS_BASE — the literal tester array, ported VERBATIM.
 *
 *  NOTE on timestamps: the web uses `Date.now() - N * 86400000` literally. We
 *  keep the exact `N * DAY` offsets here, snapshotting Date.now() ONCE at module
 *  load (NOW) so all rows share a single base — the relative spacing (and hence
 *  every status / chart number) is byte-identical to the web run.
 *  ========================================================================== */

const DAY = 86400000;
const NOW = Date.now();

const MOCK_REGISTRATIONS_BASE: Registration[] = [
  // 4 pending_approval (just submitted, owner hasn't decided yet)
  { trialId: "trial-2", name: "ปัญญา สุขสบาย", phone: "082-100-9988", address: "22/8 พหลโยธิน 24 จตุจักร กทม. 10900", motivation: "นอนไม่หลับเรื้อรัง ต้องการตัวช่วยจากธรรมชาติ", submittedAt: NOW - 1 * DAY, gender: "female", ageRange: "35-44" },
  { trialId: "trial-6", name: "ดวงใจ พรหมเดช", phone: "081-888-9911", address: "120/3 ถ.รัชดา ห้วยขวาง กทม. 10310", motivation: "ทำงานออฟฟิศ ปวดเมื่อยทุกวัน", submittedAt: NOW - 1 * DAY, gender: "female", ageRange: "25-34" },

  // 3 approved (waiting for evaluation submission)
  { trialId: "trial-1", name: "นภัสวรรณ สุขดี", phone: "081-234-1100", address: "10/2 ถ.พระราม 9 บางกะปิ กทม. 10240", motivation: "อยากลองสูตรใหม่ — เคยใช้สูตรเก่าแล้วชอบ", submittedAt: NOW - 4 * DAY, approvedAt: NOW - 3 * DAY, gender: "female", ageRange: "25-34" },
  { trialId: "trial-1", name: "ธารินี อ่อนหวาน", phone: "081-220-8800", address: "78 ม.3 บางเขน กทม. 10220", motivation: "ทำงานหน้าจอมาก ผิวคล้ำ", submittedAt: NOW - 2 * DAY, approvedAt: NOW - 1 * DAY, gender: "female", ageRange: "25-34" },
  { trialId: "trial-1", name: "ภาสกร วรสิทธิ์", phone: "082-770-3344", address: "12/9 ลาดพร้าว 64 วังทองหลาง กทม. 10310", motivation: "ลองสูตรขมิ้นชัน", submittedAt: NOW - 5 * DAY, approvedAt: NOW - 4 * DAY, gender: "male", ageRange: "35-44" },
  { trialId: "trial-1", name: "พิมพ์ลภัส รัตนกุล", phone: "086-118-9911", address: "23 รามคำแหง 12 หัวหมาก กทม. 10240", motivation: "ฝ้ากระเยอะ อยากให้กระจ่างขึ้น", submittedAt: NOW - 22 * DAY, approvedAt: NOW - 20 * DAY, gender: "female", ageRange: "45-54" },
  { trialId: "trial-1", name: "เจษฎา ภูริชา", phone: "087-447-2200", address: "56 สาทร 8 บางรัก กทม. 10500", motivation: "ลองดู เผื่อรอยสิวจาง", submittedAt: NOW - 18 * DAY, approvedAt: NOW - 16 * DAY, gender: "male", ageRange: "25-34" },

  // 4 evaluated (full cycle done) — with sample evaluation data
  { trialId: "trial-1", name: "อรอนงค์ เจริญสุข", phone: "089-555-2200", address: "55 ม.5 บางใหญ่ นนทบุรี 11140", motivation: "ผิวมีปัญหารอยดำ อยากลองดูว่าจะช่วยได้ไหม", submittedAt: NOW - 12 * DAY, approvedAt: NOW - 11 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 5, criteria: { "รสชาติเครื่องดื่มที่ดื่มเป็นประจำ": 5, "ดีไซน์ / ความสวยงาม": 4, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 5 }, comment: "เนื้อบางซึมไว ใช้ครบ 2 สัปดาห์เห็นรอยดำจางลงชัดเจน กลิ่นขมิ้นอ่อน ไม่ฉุนเหมือนสูตรเก่า แนะนำเพื่อนแล้ว!", wouldRecommend: true } },
  { trialId: "trial-2", name: "สมรัก ใจเย็น", phone: "086-777-3300", address: "9/14 ถ.บางนา บางพลี สมุทรปราการ 10540", motivation: "อยากลดยานอนหลับ ลองสมุนไพรก่อน", submittedAt: NOW - 15 * DAY, approvedAt: NOW - 14 * DAY, evaluatedAt: NOW - 2 * DAY, gender: "male", ageRange: "45-54", evaluation: { overall: 4, criteria: { "รสชาติเครื่องดื่มที่ดื่มเป็นประจำ": 4, "ดีไซน์ / ความสวยงาม": 3, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 5 }, comment: "นอนหลับลึกขึ้นจริงๆ ตื่นมาสดชื่น แต่รสติดขมไปนิด อยากให้เพิ่มกลิ่นวานิลลาหรือน้ำผึ้งหน่อย", wouldRecommend: true } },

  // 1 rejected
  { trialId: "trial-4", name: "สุชาติ จันทร์ฉาย", phone: "087-111-2233", address: "100/5 รามอินทรา 65 บางเขน กทม. 10220", motivation: "อยากลอง", submittedAt: NOW - 7 * DAY, rejectedAt: NOW - 6 * DAY, gender: "male", ageRange: "55+" },

  // ===== Rich evaluation dataset for trial-1 (เซรั่มขมิ้นชัน Brightening v2) — 14 more =====
  { trialId: "trial-1", name: "ธัญลักษณ์ ศิริมงคล", phone: "081-220-3344", address: "88 ลาดพร้าว 122 วังทองหลาง กทม. 10310", motivation: "ผิวหมองคล้ำ อยากให้กระจ่างขึ้น", submittedAt: NOW - 14 * DAY, approvedAt: NOW - 13 * DAY, evaluatedAt: NOW - 2 * DAY, gender: "female", ageRange: "25-34", evaluation: { overall: 5, criteria: { "ผลที่รู้สึกได้หลังใช้ครบกำหนด": 5, "ดีไซน์ / ความสวยงาม": 4, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 5 }, comment: "ผิวกระจ่างใสขึ้นจริง ไม่แห้ง", wouldRecommend: true } },
  { trialId: "trial-1", name: "พรพิมล แสงทอง", phone: "082-441-5566", address: "12 รามคำแหง 24 หัวหมาก กทม. 10240", motivation: "ทดสอบสูตรใหม่", submittedAt: NOW - 13 * DAY, approvedAt: NOW - 12 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 4, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 4, "ความกระจ่างใสของผิวตอนนี้": 3, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 5 }, comment: "เห็นผลช้านิด แต่ไม่ระคายเคืองดีมาก", wouldRecommend: true } },
  { trialId: "trial-1", name: "สมชาย ใจดี", phone: "083-555-7788", address: "44/12 สุขุมวิท 71 พระโขนง กทม. 10110", motivation: "ลองดู เผื่อช่วยรอยสิว", submittedAt: NOW - 12 * DAY, approvedAt: NOW - 11 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "male", ageRange: "25-34", evaluation: { overall: 5, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 5, "ความกระจ่างใสของผิวตอนนี้": 4, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 5 }, comment: "ครีมซึมไว ผิวเนียนขึ้น", wouldRecommend: true } },
  { trialId: "trial-1", name: "ฉัตรชัย พงศ์ดี", phone: "081-660-2244", address: "5 ม.7 บางพลี สมุทรปราการ 10540", motivation: "ฝ้ากระเยอะ ลองสูตรขมิ้น", submittedAt: NOW - 11 * DAY, approvedAt: NOW - 10 * DAY, evaluatedAt: NOW - 2 * DAY, gender: "male", ageRange: "45-54", evaluation: { overall: 3, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 3, "ความกระจ่างใสของผิวตอนนี้": 2, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 4 }, comment: "พอใช้ ฝ้ายังไม่จาง", wouldRecommend: false } },
  { trialId: "trial-1", name: "ปิยะดา รักษ์ไพร", phone: "084-118-3322", address: "77 บางนา-ตราด กม.3 บางนา กทม. 10260", motivation: "ผิวแห้งช่วงหน้าหนาว", submittedAt: NOW - 10 * DAY, approvedAt: NOW - 9 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "female", ageRange: "45-54", evaluation: { overall: 5, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 5, "ความกระจ่างใสของผิวตอนนี้": 4, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 5 }, comment: "ผิวชุ่มชื้น เห็นผลใน 1 สัปดาห์", wouldRecommend: true } },
  { trialId: "trial-1", name: "เบญจมาศ วงศ์ทอง", phone: "086-227-9911", address: "99/3 ม.5 สันป่าตอง เชียงใหม่ 50120", motivation: "ทดสอบสูตรสมุนไพรไทย", submittedAt: NOW - 9 * DAY, approvedAt: NOW - 8 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "female", ageRange: "55+", evaluation: { overall: 4, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 4, "ความกระจ่างใสของผิวตอนนี้": 3, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 5 }, comment: "กลิ่นหอม ใช้ง่าย", wouldRecommend: true } },
  { trialId: "trial-1", name: "นิติพงษ์ ปานทอง", phone: "082-998-4455", address: "23 รามอินทรา 8 บางเขน กทม. 10220", motivation: "อายุน้อย ผิวเริ่มไม่ดี", submittedAt: NOW - 9 * DAY, approvedAt: NOW - 8 * DAY, evaluatedAt: NOW - 2 * DAY, gender: "male", ageRange: "15-24", evaluation: { overall: 4, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 4, "ความกระจ่างใสของผิวตอนนี้": 3, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 5 }, comment: "เหมาะกับวัยรุ่น ไม่มัน", wouldRecommend: true } },
  { trialId: "trial-1", name: "กฤษณา ทองดี", phone: "088-771-3300", address: "11/9 ลาดพร้าว 80 วังทองหลาง กทม. 10310", motivation: "อยากลองสูตรไม่มีพาราเบน", submittedAt: NOW - 8 * DAY, approvedAt: NOW - 7 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "female", ageRange: "25-34", evaluation: { overall: 5, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 5, "ความกระจ่างใสของผิวตอนนี้": 4, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 5 }, comment: "ดีเยี่ยม ไม่มีพาราเบนตามที่บอก", wouldRecommend: true } },
  { trialId: "trial-1", name: "วราภรณ์ สุขสมบูรณ์", phone: "087-554-6677", address: "65 สาทร 1 บางรัก กทม. 10500", motivation: "ทำงานออฟฟิศ ผิวหมอง", submittedAt: NOW - 8 * DAY, approvedAt: NOW - 7 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 4, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 4, "ความกระจ่างใสของผิวตอนนี้": 3, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 5 }, comment: "เห็นผลชัดเจน ผิวสว่างขึ้น", wouldRecommend: true } },
  { trialId: "trial-1", name: "ณัฏฐา พิทักษ์ชน", phone: "081-330-9988", address: "8/22 ม.4 บางใหญ่ นนทบุรี 11140", motivation: "ลองดูแล้วรีวิว", submittedAt: NOW - 7 * DAY, approvedAt: NOW - 6 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "lgbtq", ageRange: "25-34", evaluation: { overall: 5, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 5, "ความกระจ่างใสของผิวตอนนี้": 4, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 5 }, comment: "ใช้ดีมาก แนะนำเพื่อนแล้ว", wouldRecommend: true } },
  { trialId: "trial-1", name: "ทิพย์รัตน์ มั่นคง", phone: "089-447-1100", address: "172 จรัญสนิทวงศ์ 65 บางพลัด กทม. 10700", motivation: "ผิวบาง อยากบำรุง", submittedAt: NOW - 6 * DAY, approvedAt: NOW - 5 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 4, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 4, "ความกระจ่างใสของผิวตอนนี้": 3, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 5 }, comment: "ผิวดีขึ้น แต่อยากให้กลิ่นจาง", wouldRecommend: true } },
  { trialId: "trial-1", name: "อภิวัฒน์ คงทอง", phone: "083-882-5544", address: "9 ม.1 ปากเกร็ด นนทบุรี 11120", motivation: "ดูจากรีวิวเลยอยากลอง", submittedAt: NOW - 6 * DAY, approvedAt: NOW - 5 * DAY, evaluatedAt: NOW - 2 * DAY, gender: "male", ageRange: "35-44", evaluation: { overall: 2, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 2, "ความกระจ่างใสของผิวตอนนี้": 1, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 3 }, comment: "ระคายเคืองนิดหน่อย ผลไม่ค่อยเห็น", wouldRecommend: false } },
  { trialId: "trial-1", name: "ศุภาพิชญ์ บุญรอด", phone: "086-330-7722", address: "33 ม.2 บางบ่อ สมุทรปราการ 10560", motivation: "ผิวอ่อนแอ ลองเสริมความแข็งแรง", submittedAt: NOW - 5 * DAY, approvedAt: NOW - 4 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "female", ageRange: "15-24", evaluation: { overall: 5, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 5, "ความกระจ่างใสของผิวตอนนี้": 4, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 5 }, comment: "เป๊ะปังมาก ใช้ทุกวัน", wouldRecommend: true } },
  { trialId: "trial-1", name: "ดนุพล จิตรอารี", phone: "081-005-8866", address: "201 บรรทัดทอง ถ.พญาไท ราชเทวี กทม. 10400", motivation: "ทดลองสูตรไทย", submittedAt: NOW - 5 * DAY, approvedAt: NOW - 4 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "male", ageRange: "25-34", evaluation: { overall: 3, criteria: { "ระดับความชุ่มชื้นผิวตอนนี้": 3, "ความกระจ่างใสของผิวตอนนี้": 2, "ความพึงพอใจสภาพผิวโดยรวมตอนนี้": 4 }, comment: "พอใช้ได้ ไม่ว้าวมาก", wouldRecommend: true } },

  // ===== Auto-generated evaluation pool for trials 2/4/6 (5 testers each) =====
  { trialId: "trial-2", name: "อรุณี ศรีสุข", phone: "081-440-1100", address: "กรุงเทพฯ และปริมณฑล", motivation: "นอนไม่หลับเรื้อรัง", submittedAt: NOW - 17 * DAY, approvedAt: NOW - 15 * DAY, evaluatedAt: NOW - 3 * DAY, gender: "female", ageRange: "25-34", evaluation: { overall: 5, criteria: { "รสชาติเครื่องดื่มที่ดื่มเป็นประจำ": 5, "ดีไซน์ / ความสวยงาม": 4, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 5 }, comment: "หลับสนิทขึ้นจริง ตื่นมาสดชื่น", wouldRecommend: true } },
  { trialId: "trial-2", name: "สมพงษ์ ไกรเกษม", phone: "082-554-2200", address: "กรุงเทพฯ และปริมณฑล", motivation: "ทำงานเครียด", submittedAt: NOW - 19 * DAY, approvedAt: NOW - 17 * DAY, evaluatedAt: NOW - 5 * DAY, gender: "male", ageRange: "45-54", evaluation: { overall: 4, criteria: { "รสชาติเครื่องดื่มที่ดื่มเป็นประจำ": 4, "ดีไซน์ / ความสวยงาม": 3, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 5 }, comment: "ช่วยให้ผ่อนคลายได้ดี", wouldRecommend: true } },
  { trialId: "trial-2", name: "กชกร แก้วใจ", phone: "083-118-7733", address: "กรุงเทพฯ และปริมณฑล", motivation: "ลองชาธรรมชาติ", submittedAt: NOW - 21 * DAY, approvedAt: NOW - 19 * DAY, evaluatedAt: NOW - 7 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 5, criteria: { "รสชาติเครื่องดื่มที่ดื่มเป็นประจำ": 5, "ดีไซน์ / ความสวยงาม": 4, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 5 }, comment: "กลิ่นหอมไม่ขมเลย", wouldRecommend: true } },
  { trialId: "trial-2", name: "ธีรภัทร นาคทอง", phone: "086-225-9911", address: "กรุงเทพฯ และปริมณฑล", motivation: "อยากลดยานอนหลับ", submittedAt: NOW - 23 * DAY, approvedAt: NOW - 21 * DAY, evaluatedAt: NOW - 9 * DAY, gender: "male", ageRange: "25-34", evaluation: { overall: 3, criteria: { "รสชาติเครื่องดื่มที่ดื่มเป็นประจำ": 3, "ดีไซน์ / ความสวยงาม": 2, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 4 }, comment: "ดื่มต่อเนื่อง 7 วันหลับลึกขึ้น", wouldRecommend: false } },
  { trialId: "trial-2", name: "ฟลิป มานะดี", phone: "087-660-1122", address: "กรุงเทพฯ และปริมณฑล", motivation: "ตามรีวิว", submittedAt: NOW - 25 * DAY, approvedAt: NOW - 23 * DAY, evaluatedAt: NOW - 11 * DAY, gender: "lgbtq", ageRange: "15-24", evaluation: { overall: 4, criteria: { "รสชาติเครื่องดื่มที่ดื่มเป็นประจำ": 4, "ดีไซน์ / ความสวยงาม": 3, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 5 }, comment: "พอใช้ได้ แต่รสติดขม", wouldRecommend: true } },
  { trialId: "trial-4", name: "ศิริพร ดอกไม้", phone: "081-552-3344", address: "กรุงเทพฯ และปริมณฑล", motivation: "ภูมิแพ้บ่อย", submittedAt: NOW - 17 * DAY, approvedAt: NOW - 15 * DAY, evaluatedAt: NOW - 3 * DAY, gender: "female", ageRange: "25-34", evaluation: { overall: 5, criteria: { "ผลที่รู้สึกได้หลังใช้ครบกำหนด": 5, "ดีไซน์ / ความสวยงาม": 4, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 5 }, comment: "เป็นหวัดน้อยลง ไม่มีผลข้างเคียง", wouldRecommend: true } },
  { trialId: "trial-4", name: "ภานุวัฒน์ คล้ายฟ้า", phone: "082-441-9900", address: "กรุงเทพฯ และปริมณฑล", motivation: "ลองดู", submittedAt: NOW - 19 * DAY, approvedAt: NOW - 17 * DAY, evaluatedAt: NOW - 5 * DAY, gender: "male", ageRange: "45-54", evaluation: { overall: 4, criteria: { "ผลที่รู้สึกได้หลังใช้ครบกำหนด": 4, "ดีไซน์ / ความสวยงาม": 3, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 5 }, comment: "กินง่าย ไม่ขม", wouldRecommend: true } },
  { trialId: "trial-4", name: "สุภา ใจงาม", phone: "083-006-7788", address: "กรุงเทพฯ และปริมณฑล", motivation: "ทำงานหนัก", submittedAt: NOW - 21 * DAY, approvedAt: NOW - 19 * DAY, evaluatedAt: NOW - 7 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 5, criteria: { "ผลที่รู้สึกได้หลังใช้ครบกำหนด": 5, "ดีไซน์ / ความสวยงาม": 4, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 5 }, comment: "ภูมิคุ้มกันดีขึ้นจริง", wouldRecommend: true } },
  { trialId: "trial-4", name: "เจษฎา รุ่งสกุล", phone: "086-220-3300", address: "กรุงเทพฯ และปริมณฑล", motivation: "คุณแม่บ้าน", submittedAt: NOW - 23 * DAY, approvedAt: NOW - 21 * DAY, evaluatedAt: NOW - 9 * DAY, gender: "male", ageRange: "25-34", evaluation: { overall: 3, criteria: { "ผลที่รู้สึกได้หลังใช้ครบกำหนด": 3, "ดีไซน์ / ความสวยงาม": 2, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 4 }, comment: "พอใช้ ผลไม่ชัดเจน", wouldRecommend: false } },
  { trialId: "trial-4", name: "พิม ปริญญา", phone: "087-449-2211", address: "กรุงเทพฯ และปริมณฑล", motivation: "อยากเสริมภูมิ", submittedAt: NOW - 25 * DAY, approvedAt: NOW - 23 * DAY, evaluatedAt: NOW - 11 * DAY, gender: "lgbtq", ageRange: "15-24", evaluation: { overall: 4, criteria: { "ผลที่รู้สึกได้หลังใช้ครบกำหนด": 4, "ดีไซน์ / ความสวยงาม": 3, "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)": 5 }, comment: "ดีเลยแนะนำสำหรับเด็ก", wouldRecommend: true } },
  { trialId: "trial-6", name: "ปริมประภา ใจเย็น", phone: "081-882-2200", address: "กรุงเทพฯ และปริมณฑล", motivation: "ปวดเมื่อยทั่วไป", submittedAt: NOW - 17 * DAY, approvedAt: NOW - 15 * DAY, evaluatedAt: NOW - 3 * DAY, gender: "female", ageRange: "25-34", evaluation: { overall: 5, criteria: { "ระดับปัญหาที่ต้องการแก้ตอนนี้": 5, "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด": 4, "ดีไซน์ / ความสวยงาม": 5 }, comment: "สะดวกพกพา กลิ่นดี", wouldRecommend: true } },
  { trialId: "trial-6", name: "อภิชาติ ทัศนีย์", phone: "082-006-3311", address: "กรุงเทพฯ และปริมณฑล", motivation: "ทำงานออฟฟิศ", submittedAt: NOW - 19 * DAY, approvedAt: NOW - 17 * DAY, evaluatedAt: NOW - 5 * DAY, gender: "male", ageRange: "45-54", evaluation: { overall: 4, criteria: { "ระดับปัญหาที่ต้องการแก้ตอนนี้": 4, "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด": 3, "ดีไซน์ / ความสวยงาม": 5 }, comment: "ใช้แล้วผ่อนคลายเร็ว", wouldRecommend: true } },
  { trialId: "trial-6", name: "สิริวรรณ ภูเขียว", phone: "083-557-9900", address: "กรุงเทพฯ และปริมณฑล", motivation: "ลองเทียบลูกประคบ", submittedAt: NOW - 21 * DAY, approvedAt: NOW - 19 * DAY, evaluatedAt: NOW - 7 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 5, criteria: { "ระดับปัญหาที่ต้องการแก้ตอนนี้": 5, "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด": 4, "ดีไซน์ / ความสวยงาม": 5 }, comment: "สเปรย์สะดวกกว่าเดิม", wouldRecommend: true } },
  { trialId: "trial-6", name: "ปฐมพร โพธิ์ทอง", phone: "086-118-2200", address: "กรุงเทพฯ และปริมณฑล", motivation: "ปวดหลัง", submittedAt: NOW - 23 * DAY, approvedAt: NOW - 21 * DAY, evaluatedAt: NOW - 9 * DAY, gender: "male", ageRange: "25-34", evaluation: { overall: 3, criteria: { "ระดับปัญหาที่ต้องการแก้ตอนนี้": 3, "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด": 2, "ดีไซน์ / ความสวยงาม": 4 }, comment: "ร้อนพอดี กลิ่นหอม", wouldRecommend: false } },
  { trialId: "trial-6", name: "เปรมิกา ทองดี", phone: "087-225-5544", address: "กรุงเทพฯ และปริมณฑล", motivation: "หลังออกกำลัง", submittedAt: NOW - 25 * DAY, approvedAt: NOW - 23 * DAY, evaluatedAt: NOW - 11 * DAY, gender: "lgbtq", ageRange: "15-24", evaluation: { overall: 4, criteria: { "ระดับปัญหาที่ต้องการแก้ตอนนี้": 4, "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด": 3, "ดีไซน์ / ความสวยงาม": 5 }, comment: "ดี ใช้ทุกวัน", wouldRecommend: true } },

  // ===== Sample evaluations for trial-eq (อุปกรณ์) =====
  { trialId: "trial-eq", name: "มาิชญา รุ่งสว่าง", phone: "081-110-2233", address: "44 รามอินทรา 12 บางเขน กทม. 10220", motivation: "มองหาดิฟฟิวเซอร์ใหม่", submittedAt: NOW - 16 * DAY, approvedAt: NOW - 14 * DAY, evaluatedAt: NOW - 2 * DAY, gender: "female", ageRange: "25-34", evaluation: { overall: 5, criteria: { "ระดับปัญหาที่ต้องการแก้ตอนนี้": 5, "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด": 4, "ดีไซน์ / ความสวยงาม": 5 }, comment: "เครื่องเงียบมาก ไอน้ำกระจายได้ทั่วห้อง จะซื้อจริง", wouldRecommend: true } },
  { trialId: "trial-eq", name: "ธนพล เจริญยิ่ง", phone: "082-220-9911", address: "5 พหลโยธิน 12 จตุจักร กทม. 10900", motivation: "ต้องการเครื่องที่เงียบ", submittedAt: NOW - 18 * DAY, approvedAt: NOW - 16 * DAY, evaluatedAt: NOW - 4 * DAY, gender: "male", ageRange: "35-44", evaluation: { overall: 4, criteria: { "ระดับปัญหาที่ต้องการแก้ตอนนี้": 4, "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด": 3, "ดีไซน์ / ความสวยงาม": 5 }, comment: "พอใช้ได้ แบตเตอรี่หมดไว ต้องชาร์จบ่อย", wouldRecommend: true } },
  { trialId: "trial-eq", name: "ธัญญรัตน์ บุญล้อม", phone: "083-440-7755", address: "8/2 สุขุมวิท 31 วัฒนา กทม. 10110", motivation: "ชอบอโรมาก่อนนอน", submittedAt: NOW - 15 * DAY, approvedAt: NOW - 13 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 5, criteria: { "ระดับปัญหาที่ต้องการแก้ตอนนี้": 5, "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด": 4, "ดีไซน์ / ความสวยงาม": 5 }, comment: "หอมโชยถึงห้อง รล. ยอดเยี่ยม", wouldRecommend: true } },
  { trialId: "trial-eq", name: "อัมรินทร์ วรสิทธิ์", phone: "086-770-1144", address: "23 ลาดพร้าว 64 วังทองหลาง กทม. 10310", motivation: "ลองดู", submittedAt: NOW - 17 * DAY, approvedAt: NOW - 15 * DAY, evaluatedAt: NOW - 3 * DAY, gender: "male", ageRange: "25-34", evaluation: { overall: 3, criteria: { "ระดับปัญหาที่ต้องการแก้ตอนนี้": 3, "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด": 2, "ดีไซน์ / ความสวยงาม": 4 }, comment: "พอใช้ ยังไม่ได้ว้าว", wouldRecommend: false } },
  { trialId: "trial-eq", name: "พิมอร รุ่งโรจน์", phone: "087-220-5544", address: "12 รามคำแหง 12 หัวหมาก กทม. 10240", motivation: "ชอบไล้ฟ์สไตล์บ้าน", submittedAt: NOW - 14 * DAY, approvedAt: NOW - 12 * DAY, evaluatedAt: NOW - 1 * DAY, gender: "lgbtq", ageRange: "25-34", evaluation: { overall: 4, criteria: { "ระดับปัญหาที่ต้องการแก้ตอนนี้": 4, "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด": 3, "ดีไซน์ / ความสวยงาม": 5 }, comment: "ดีไซน์สวย ใช้ง่าย ต้องชาร์จบ่อย", wouldRecommend: true } },

  // ===== Bumped sample sizes — trial-2 (Sleep+) 8 more =====
  { trialId: "trial-2", name: "ชุติมา ทองดี", phone: "081-700-1188", address: "กรุงเทพฯ และปริมณฑล", motivation: "นอนไม่หลับ", submittedAt: NOW - 27 * DAY, approvedAt: NOW - 25 * DAY, evaluatedAt: NOW - 13 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 5, criteria: {}, comment: "หลับลึก ตื่นมาสดชื่น ใช้ต่อแน่ๆ", wouldRecommend: true } },
  { trialId: "trial-2", name: "พงศ์ศักดิ์ ก้องเกียรติ", phone: "082-700-2299", address: "กรุงเทพฯ และปริมณฑล", motivation: "ทำงานเครียดมาก", submittedAt: NOW - 28 * DAY, approvedAt: NOW - 26 * DAY, evaluatedAt: NOW - 14 * DAY, gender: "male", ageRange: "35-44", evaluation: { overall: 4, criteria: {}, comment: "ดื่มแล้วผ่อนคลายดี รสไม่ขมเหมือนยาสมุนไพรอื่น", wouldRecommend: true } },
  { trialId: "trial-2", name: "สุนิสา รวยรัตน์", phone: "083-700-3300", address: "กรุงเทพฯ และปริมณฑล", motivation: "อยากลดยานอนหลับ", submittedAt: NOW - 29 * DAY, approvedAt: NOW - 27 * DAY, evaluatedAt: NOW - 15 * DAY, gender: "female", ageRange: "45-54", evaluation: { overall: 4, criteria: {}, comment: "ค่อยๆ ลดยานอนหลับลงได้ แต่อยากให้รสหวานขึ้น", wouldRecommend: true } },
  { trialId: "trial-2", name: "นพดล วงศ์ใหญ่", phone: "086-700-4411", address: "กรุงเทพฯ และปริมณฑล", motivation: "อายุยังน้อย ไม่อยากใช้ยา", submittedAt: NOW - 30 * DAY, approvedAt: NOW - 28 * DAY, evaluatedAt: NOW - 16 * DAY, gender: "male", ageRange: "25-34", evaluation: { overall: 5, criteria: {}, comment: "ดีมาก ไม่ตื่นกลางดึก จะซื้อเก็บไว้", wouldRecommend: true } },
  { trialId: "trial-2", name: "อารยา ลิ้มสุวรรณ", phone: "087-700-5522", address: "กรุงเทพฯ และปริมณฑล", motivation: "อยากผ่อนคลาย", submittedAt: NOW - 31 * DAY, approvedAt: NOW - 29 * DAY, evaluatedAt: NOW - 17 * DAY, gender: "female", ageRange: "25-34", evaluation: { overall: 4, criteria: {}, comment: "กลิ่นหอม ดื่มแล้วสบายใจ", wouldRecommend: true } },
  { trialId: "trial-2", name: "ภคพล ทักษิณ", phone: "081-700-6633", address: "กรุงเทพฯ และปริมณฑล", motivation: "ลองสมุนไพรไทย", submittedAt: NOW - 33 * DAY, approvedAt: NOW - 31 * DAY, evaluatedAt: NOW - 18 * DAY, gender: "male", ageRange: "45-54", evaluation: { overall: 3, criteria: {}, comment: "ผลพอใช้ ติดรสขมไปนิด", wouldRecommend: false } },
  { trialId: "trial-2", name: "วิภาวี ปานทอง", phone: "082-700-7744", address: "กรุงเทพฯ และปริมณฑล", motivation: "ค้นหาตัวช่วยนอน", submittedAt: NOW - 34 * DAY, approvedAt: NOW - 32 * DAY, evaluatedAt: NOW - 19 * DAY, gender: "female", ageRange: "55+", evaluation: { overall: 5, criteria: {}, comment: "ผู้สูงอายุก็ดื่มได้ ปลอดภัยกว่ายา", wouldRecommend: true } },
  { trialId: "trial-2", name: "ปิติพงษ์ คงไทย", phone: "083-700-8855", address: "กรุงเทพฯ และปริมณฑล", motivation: "ดูรีวิว", submittedAt: NOW - 35 * DAY, approvedAt: NOW - 33 * DAY, evaluatedAt: NOW - 20 * DAY, gender: "male", ageRange: "25-34", evaluation: { overall: 4, criteria: {}, comment: "หลับลึกขึ้น แต่ตื่นเช้ายังง่วงนิดๆ", wouldRecommend: true } },

  // ===== trial-4 (ฟ้าทะลายโจร) 8 more =====
  { trialId: "trial-4", name: "พรพรรณ สวัสดี", phone: "081-800-1188", address: "กรุงเทพฯ และปริมณฑล", motivation: "หวัดบ่อย", submittedAt: NOW - 29 * DAY, approvedAt: NOW - 27 * DAY, evaluatedAt: NOW - 13 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 5, criteria: {}, comment: "หวัดน้อยลง ภูมิคุ้มกันดีขึ้น", wouldRecommend: true } },
  { trialId: "trial-4", name: "อนุพงษ์ ใจหาญ", phone: "082-800-2299", address: "กรุงเทพฯ และปริมณฑล", motivation: "ไอเรื้อรัง", submittedAt: NOW - 30 * DAY, approvedAt: NOW - 28 * DAY, evaluatedAt: NOW - 14 * DAY, gender: "male", ageRange: "45-54", evaluation: { overall: 4, criteria: {}, comment: "ดีขึ้น แต่กลิ่นแคปซูลแรงไปหน่อย", wouldRecommend: true } },
  { trialId: "trial-4", name: "กชพร แก้วใส", phone: "083-800-3300", address: "กรุงเทพฯ และปริมณฑล", motivation: "ภูมิคุ้มกันต่ำ", submittedAt: NOW - 31 * DAY, approvedAt: NOW - 29 * DAY, evaluatedAt: NOW - 15 * DAY, gender: "female", ageRange: "25-34", evaluation: { overall: 5, criteria: {}, comment: "ไม่เป็นหวัดตลอด 30 วัน ดีมาก", wouldRecommend: true } },
  { trialId: "trial-4", name: "ธีรพันธ์ สมจิต", phone: "086-800-4411", address: "กรุงเทพฯ และปริมณฑล", motivation: "เสริมภูมิ", submittedAt: NOW - 32 * DAY, approvedAt: NOW - 30 * DAY, evaluatedAt: NOW - 16 * DAY, gender: "male", ageRange: "35-44", evaluation: { overall: 4, criteria: {}, comment: "เห็นผลใน 2 สัปดาห์ พอใจ", wouldRecommend: true } },
  { trialId: "trial-4", name: "สุดารัตน์ มากดี", phone: "087-800-5522", address: "กรุงเทพฯ และปริมณฑล", motivation: "อายุเริ่มมาก ภูมิตก", submittedAt: NOW - 33 * DAY, approvedAt: NOW - 31 * DAY, evaluatedAt: NOW - 17 * DAY, gender: "female", ageRange: "55+", evaluation: { overall: 5, criteria: {}, comment: "ใช้ได้ดี ไม่มีผลข้างเคียง", wouldRecommend: true } },
  { trialId: "trial-4", name: "วรุฒ ตั้งจิต", phone: "081-800-6633", address: "กรุงเทพฯ และปริมณฑล", motivation: "ลองดู", submittedAt: NOW - 34 * DAY, approvedAt: NOW - 32 * DAY, evaluatedAt: NOW - 18 * DAY, gender: "male", ageRange: "25-34", evaluation: { overall: 3, criteria: {}, comment: "ดีกลางๆ ขมเกินไป", wouldRecommend: false } },
  { trialId: "trial-4", name: "นุชนาฏ เสริมสุข", phone: "082-800-7744", address: "กรุงเทพฯ และปริมณฑล", motivation: "ต้องการเสริมภูมิ", submittedAt: NOW - 35 * DAY, approvedAt: NOW - 33 * DAY, evaluatedAt: NOW - 19 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 4, criteria: {}, comment: "ผลดี เป็นหวัดน้อยลงจริง", wouldRecommend: true } },
  { trialId: "trial-4", name: "ชัยพร เสริมศักดิ์", phone: "083-800-8855", address: "กรุงเทพฯ และปริมณฑล", motivation: "อายุเริ่มมาก", submittedAt: NOW - 36 * DAY, approvedAt: NOW - 34 * DAY, evaluatedAt: NOW - 20 * DAY, gender: "male", ageRange: "45-54", evaluation: { overall: 4, criteria: {}, comment: "ค่อยๆ ดี ใช้ครบ 30 วันเห็นผล", wouldRecommend: true } },

  // ===== trial-6 (ลูกประคบสเปรย์) 8 more =====
  { trialId: "trial-6", name: "ปิยฉัตร ใจอ่อน", phone: "081-900-1188", address: "กรุงเทพฯ และปริมณฑล", motivation: "ปวดเมื่อยหลัง", submittedAt: NOW - 28 * DAY, approvedAt: NOW - 26 * DAY, evaluatedAt: NOW - 12 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 5, criteria: {}, comment: "สเปรย์สะดวกมาก กลิ่นหอม ใช้บนรถได้", wouldRecommend: true } },
  { trialId: "trial-6", name: "ก้องเกียรติ ดอกไม้", phone: "082-900-2299", address: "กรุงเทพฯ และปริมณฑล", motivation: "ออฟฟิศซินโดรม", submittedAt: NOW - 29 * DAY, approvedAt: NOW - 27 * DAY, evaluatedAt: NOW - 13 * DAY, gender: "male", ageRange: "25-34", evaluation: { overall: 4, criteria: {}, comment: "ใช้ที่คอบ่าไหล่ ผ่อนคลายดี", wouldRecommend: true } },
  { trialId: "trial-6", name: "นพรัตน์ สุขใจ", phone: "083-900-3300", address: "กรุงเทพฯ และปริมณฑล", motivation: "ปวดเข่า", submittedAt: NOW - 30 * DAY, approvedAt: NOW - 28 * DAY, evaluatedAt: NOW - 14 * DAY, gender: "female", ageRange: "55+", evaluation: { overall: 5, criteria: {}, comment: "ผู้สูงอายุใช้สะดวก ไม่ต้องนึ่งลูกประคบ", wouldRecommend: true } },
  { trialId: "trial-6", name: "ภัทรพล ก้าวหน้า", phone: "086-900-4411", address: "กรุงเทพฯ และปริมณฑล", motivation: "เล่นกีฬาบ่อย", submittedAt: NOW - 31 * DAY, approvedAt: NOW - 29 * DAY, evaluatedAt: NOW - 15 * DAY, gender: "male", ageRange: "25-34", evaluation: { overall: 4, criteria: {}, comment: "ใช้หลังออกกำลังกาย ดีมาก", wouldRecommend: true } },
  { trialId: "trial-6", name: "วาสนา ทรัพย์ดี", phone: "087-900-5522", address: "กรุงเทพฯ และปริมณฑล", motivation: "อยากลอง", submittedAt: NOW - 32 * DAY, approvedAt: NOW - 30 * DAY, evaluatedAt: NOW - 16 * DAY, gender: "female", ageRange: "45-54", evaluation: { overall: 5, criteria: {}, comment: "ดีจริง ปวดน้อยลงตั้งแต่วันแรก", wouldRecommend: true } },
  { trialId: "trial-6", name: "ชนะ ตั้งใจ", phone: "081-900-6633", address: "กรุงเทพฯ และปริมณฑล", motivation: "ปวดหลังเรื้อรัง", submittedAt: NOW - 33 * DAY, approvedAt: NOW - 31 * DAY, evaluatedAt: NOW - 17 * DAY, gender: "male", ageRange: "45-54", evaluation: { overall: 4, criteria: {}, comment: "ดี แต่ขวดเล็กไปหน่อย", wouldRecommend: true } },
  { trialId: "trial-6", name: "พิมพ์ใจ รักดี", phone: "082-900-7744", address: "กรุงเทพฯ และปริมณฑล", motivation: "หลังตึง", submittedAt: NOW - 34 * DAY, approvedAt: NOW - 32 * DAY, evaluatedAt: NOW - 18 * DAY, gender: "female", ageRange: "25-34", evaluation: { overall: 5, criteria: {}, comment: "ใช้ก่อนนอน หลับสบาย", wouldRecommend: true } },
  { trialId: "trial-6", name: "ธวัชชัย โพธิ์ทอง", phone: "083-900-8855", address: "กรุงเทพฯ และปริมณฑล", motivation: "ดูจากเพื่อน", submittedAt: NOW - 35 * DAY, approvedAt: NOW - 33 * DAY, evaluatedAt: NOW - 19 * DAY, gender: "male", ageRange: "55+", evaluation: { overall: 3, criteria: {}, comment: "พอใช้ ฉีดแล้วร้อนเร็ว", wouldRecommend: false } },

  // ===== trial-eq (Mist Pro) 8 more =====
  { trialId: "trial-eq", name: "ปริญญา ดวงดาว", phone: "081-310-1188", address: "กรุงเทพฯ และปริมณฑล", motivation: "ใช้ก่อนนอน", submittedAt: NOW - 27 * DAY, approvedAt: NOW - 25 * DAY, evaluatedAt: NOW - 12 * DAY, gender: "female", ageRange: "25-34", evaluation: { overall: 5, criteria: {}, comment: "เสียงเงียบมาก ใช้ตอนนอนได้", wouldRecommend: true } },
  { trialId: "trial-eq", name: "สมเกียรติ ใจตรง", phone: "082-310-2299", address: "กรุงเทพฯ และปริมณฑล", motivation: "ของขวัญให้ภรรยา", submittedAt: NOW - 28 * DAY, approvedAt: NOW - 26 * DAY, evaluatedAt: NOW - 13 * DAY, gender: "male", ageRange: "45-54", evaluation: { overall: 4, criteria: {}, comment: "ดีไซน์สวย เหมาะเป็นของขวัญ", wouldRecommend: true } },
  { trialId: "trial-eq", name: "อัญชลี ศรีงาม", phone: "083-310-3300", address: "กรุงเทพฯ และปริมณฑล", motivation: "ชอบกลิ่นหอม", submittedAt: NOW - 29 * DAY, approvedAt: NOW - 27 * DAY, evaluatedAt: NOW - 14 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 5, criteria: {}, comment: "ไอน้ำกระจายดี ห้องหอมทั้งวัน", wouldRecommend: true } },
  { trialId: "trial-eq", name: "อภิสิทธิ์ สวยงาม", phone: "086-310-4411", address: "กรุงเทพฯ และปริมณฑล", motivation: "ตกแต่งห้องนอน", submittedAt: NOW - 30 * DAY, approvedAt: NOW - 28 * DAY, evaluatedAt: NOW - 15 * DAY, gender: "male", ageRange: "25-34", evaluation: { overall: 4, criteria: {}, comment: "ใช้ดี แสง LED สวย ติดตั้งง่าย", wouldRecommend: true } },
  { trialId: "trial-eq", name: "ธิดารัตน์ พรประเสริฐ", phone: "087-310-5522", address: "กรุงเทพฯ และปริมณฑล", motivation: "อยากผ่อนคลาย", submittedAt: NOW - 31 * DAY, approvedAt: NOW - 29 * DAY, evaluatedAt: NOW - 16 * DAY, gender: "female", ageRange: "35-44", evaluation: { overall: 5, criteria: {}, comment: "ใช้บ่อยมาก คุ้มกับราคา", wouldRecommend: true } },
  { trialId: "trial-eq", name: "เกียรติศักดิ์ สมบัติ", phone: "081-310-6633", address: "กรุงเทพฯ และปริมณฑล", motivation: "ลองดู", submittedAt: NOW - 32 * DAY, approvedAt: NOW - 30 * DAY, evaluatedAt: NOW - 17 * DAY, gender: "male", ageRange: "55+", evaluation: { overall: 3, criteria: {}, comment: "พอใช้ แบตหมดเร็ว", wouldRecommend: false } },
  { trialId: "trial-eq", name: "ปาณิสรา ดอกบัว", phone: "082-310-7744", address: "กรุงเทพฯ และปริมณฑล", motivation: "อยากได้ของใหม่", submittedAt: NOW - 33 * DAY, approvedAt: NOW - 31 * DAY, evaluatedAt: NOW - 18 * DAY, gender: "female", ageRange: "25-34", evaluation: { overall: 5, criteria: {}, comment: "ดีไซน์มินิมอล เข้ากับห้องทุกแบบ", wouldRecommend: true } },
  { trialId: "trial-eq", name: "ปรีชา รวยสุข", phone: "083-310-8855", address: "กรุงเทพฯ และปริมณฑล", motivation: "ใช้กับสปาที่บ้าน", submittedAt: NOW - 34 * DAY, approvedAt: NOW - 32 * DAY, evaluatedAt: NOW - 19 * DAY, gender: "male", ageRange: "35-44", evaluation: { overall: 4, criteria: {}, comment: "ดี ใช้กับน้ำมันหอมระเหยได้หลายชนิด", wouldRecommend: true } },
];

/* =============================================================================
 *  Enrichment — each base row keeps its hand-authored overall/comment/
 *  wouldRecommend; its evaluation is regenerated with the full set of
 *  type-specific maps the dashboard needs. The seed is the FULL-array index `i`
 *  (matches the web `MOCK_REGISTRATIONS_BASE.map((r, i) => …)` exactly).
 *  ========================================================================== */
export const MOCK_REGISTRATIONS: Registration[] = MOCK_REGISTRATIONS_BASE.map((r, i) => {
  if (!r.evaluation) return r;
  return {
    ...r,
    evaluation: buildMockEvaluation(r.trialId, i, r.evaluation),
  };
});

/* =============================================================================
 *  Public API — getRegistrationsForTrial(trialId)
 *
 *  Returns the enriched registrations for a trial. If a trialId has NO base
 *  rows (every mobile product except trial-1/2/4/6/eq), deterministically
 *  synthesise a populated cohort seeded by the trialId so EVERY product still
 *  renders a full dashboard.
 *  ========================================================================== */

/** Demographics distribution for a synthesised cohort — promoter-heavy beta skew. */
const SYNTH_GENDERS: Gender[] = ["female", "female", "female", "male", "male", "lgbtq"];
const SYNTH_AGES: AgeRange[] = ["15-24", "25-34", "25-34", "35-44", "35-44", "45-54", "55+"];
const SYNTH_FIRST = ["ปวีณา", "ธนกร", "ศิริพร", "วีระชัย", "นภัสสร", "ชัยวัฒน์", "พิมพ์ชนก", "ภาณุพงศ์", "อรวรรณ", "กิตติพงษ์", "ณัฐริกา", "สุรชัย", "เมธาวี", "อนุชา", "รัตนาภรณ์", "ธีรเดช"];
const SYNTH_LAST = ["ใจดี", "ทองคำ", "สุขสันต์", "รุ่งเรือง", "พงษ์ไพบูลย์", "ศรีสุข", "มั่นคง", "วงศ์ทอง", "เจริญสุข", "บุญมา"];
const SYNTH_MOTIVATION = ["อยากลองสินค้าใหม่ก่อนวางขาย", "สนใจสมุนไพรไทย", "ตามรีวิวมา", "อยากได้รีวิวจริง", "ใช้ผลิตภัณฑ์ประเภทนี้ประจำ", "หาตัวช่วยจากธรรมชาติ"];

/** A cached synthesised cohort per trialId so repeated calls return stable arrays. */
const synthCache: Record<string, Registration[]> = {};

/** Build a deterministic cohort for a trial that has no hand-authored base rows.
 *  `category` lets us pick the right question set; pass it from the mobile
 *  TrialProduct so the generated charts match the product type. */
function synthesizeCohort(trialId: string, category: string): Registration[] {
  if (synthCache[trialId]) return synthCache[trialId];

  const rng = mulberry32(seedFor(trialId));
  const config = configForCategory(category);
  // 12-16 evaluated testers — a full dashboard without overclaiming.
  const n = 12 + Math.floor(rng() * 5);
  const rows: Registration[] = [];

  for (let i = 0; i < n; i++) {
    const gender = SYNTH_GENDERS[Math.floor(rng() * SYNTH_GENDERS.length)];
    const ageRange = SYNTH_AGES[Math.floor(rng() * SYNTH_AGES.length)];
    const name = `${SYNTH_FIRST[Math.floor(rng() * SYNTH_FIRST.length)]} ${SYNTH_LAST[Math.floor(rng() * SYNTH_LAST.length)]}`;
    const motivation = SYNTH_MOTIVATION[Math.floor(rng() * SYNTH_MOTIVATION.length)];
    // Overall skews 3-5 (positive beta cohort).
    const overall = 3 + Math.floor(rng() * 3);
    const daysAgo = 5 + Math.floor(rng() * 25);

    // Stable per-tester seed string → numeric seed for buildMockEvaluation.
    const evalSeed = seedFor(`${trialId}:synth:${i}`);
    const evaluation = buildMockEvaluation(trialId, evalSeed, { overall }, config);

    rows.push({
      trialId,
      name,
      phone: `08${1 + (i % 9)}-${String(100 + i).padStart(3, "0")}-${String(1000 + Math.floor(rng() * 9000)).slice(0, 4)}`,
      address: "กรุงเทพฯ และปริมณฑล",
      motivation,
      submittedAt: NOW - (daysAgo + 2) * DAY,
      approvedAt: NOW - (daysAgo + 1) * DAY,
      evaluatedAt: NOW - daysAgo * DAY,
      gender,
      ageRange,
      evaluation,
    });
  }

  synthCache[trialId] = rows;
  return rows;
}

/** Returns the enriched registrations for a trial.
 *  - If the trial has hand-authored base rows (trial-1/2/4/6/eq), returns those.
 *  - Otherwise synthesises a deterministic populated cohort seeded by trialId.
 *  @param category Optional mobile-product category — drives the synthesised
 *                  question set for trials without base rows. Defaults to a
 *                  cosmetic-style efficacy form.
 */
/**
 * Real applicants (from the shared trial table) first, then the demo cohort.
 *
 * The console used to show ONLY hand-authored rows, or — for trials without any
 * — a `synthesizeCohort()` of invented testers whose "answers" nobody ever gave.
 * A customer's application and their survey answers now appear here for real;
 * the mock rows stay behind them so every dashboard still has data to chart.
 */
export function getRegistrationsForTrial(trialId: string, category = "เครื่องสำอาง"): Registration[] {
  const real = registrationsForTrial(trialId).map(toOwnerRegistration);
  const base = MOCK_REGISTRATIONS.filter((r) => r.trialId === trialId);
  const demo = base.length > 0 ? base : synthesizeCohort(trialId, category);
  return [...real, ...demo];
}

/** Project a shared registration onto the console's Registration shape. */
function toOwnerRegistration(r: StoredRegistration): Registration {
  const a = r.postAnswers;
  return {
    id: r.id,
    trialId: r.trialId,
    name: r.applicantName,
    phone: r.applicantPhone,
    address: r.address,
    motivation: r.reason,
    submittedAt: r.submittedAt,
    approvedAt: r.approvedAt,
    rejectedAt: r.rejectedAt,
    evaluatedAt: r.evaluatedAt,
    evaluation: a
      ? {
          overall: overallScore(a),
          // The legacy per-criterion map has no equivalent in the new form.
          criteria: {},
          comment: evalComment(a),
          wouldRecommend: wouldRecommend(a),
          scoreById: a.scoreById,
          npsScores: a.npsScores,
          mcAnswers: a.mcAnswers,
          tagAnswers: a.tagAnswers,
          abChoices: a.abChoices,
          textAnswers: a.textAnswers,
          conditionalAnswers: a.conditionalAnswers,
        }
      : undefined,
  };
}

// Silence "unused" on the shared default objective set — kept for parity / future use.
void DEFAULT_OBJECTIVES;
