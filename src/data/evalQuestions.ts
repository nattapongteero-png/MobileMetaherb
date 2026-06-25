/* =============================================================
 *  Evaluation question library + form generator — ported 1:1 from
 *  the METAHERB web app (../Metaherb/src/app/data/evalQuestions.ts).
 *  The shop configures `objectives` per trial; the form is generated
 *  the same way the owner preview + tester form do on the web.
 *  ============================================================= */

export type TestObjective = "efficacy" | "sensory" | "packaging" | "market" | "formula_ab";

export type QuestionType =
  | "scale_1_5"        // 1-5 buttons
  | "stars_1_5"        // 1-5 stars (always-on overall rating)
  | "nps_0_10"         // 0-10 NPS strip
  | "multiple_choice"  // single-pick from `options`
  | "tag"              // multi-pick from `options`
  | "conditional"      // ไม่มี / มี (with optional note)
  | "text"             // free text
  | "ab_choice";       // สูตร A vs สูตร B

export type Phase = "baseline" | "first_use" | "after_full" | "always";

export type ConditionalAnswer = { has: boolean; note?: string };

/** Visual meta per phase — colour + label used in the form headers. */
export const PHASE_META: Record<Phase, { emoji: string; label: string; color: string }> = {
  baseline: { emoji: "📋", label: "ก่อนใช้สินค้า (Baseline)", color: "#3b82f6" },
  first_use: { emoji: "✨", label: "หลังใช้ครั้งแรก", color: "#f59e0b" },
  after_full: { emoji: "📊", label: "หลังใช้ครบกำหนด", color: "#319754" },
  always: { emoji: "⭐", label: "ทุกแบบประเมินรวมเสมอ", color: "#1a1a1a" },
};

export type EvalQuestion = {
  id: string;
  label: string;
  type: QuestionType;
  phase: Phase;
  objective: TestObjective;
  options?: string[];
};

/** Question library keyed by objective → category. `"_default"` is the fallback. */
export const QUESTION_LIBRARY: Record<TestObjective, Record<string, EvalQuestion[]>> = {
  efficacy: {
    "เครื่องสำอาง": [
      { id: "skin_moist_b", label: "ระดับความชุ่มชื้นผิวตอนนี้", type: "scale_1_5", phase: "baseline", objective: "efficacy" },
      { id: "skin_bright_b", label: "ความกระจ่างใสของผิวตอนนี้", type: "scale_1_5", phase: "baseline", objective: "efficacy" },
      { id: "skin_problem", label: "ปัญหาผิวที่ต้องการแก้ไข", type: "multiple_choice", phase: "baseline", objective: "efficacy",
        options: ["สิว / ผด", "จุดด่างดำ / ฝ้า", "ริ้วรอย / ผิวหย่อนคล้อย", "ผิวแห้ง / ลอก", "รูขุมขนกว้าง", "ผิวมัน / ผิวผสม", "ผิวแพ้ง่าย / ระคายเคือง"] },
      { id: "skin_sat_b", label: "ความพึงพอใจสภาพผิวโดยรวมตอนนี้", type: "scale_1_5", phase: "baseline", objective: "efficacy" },
      { id: "skin_moist_a", label: "ผิวชุ่มชื้นขึ้นเทียบกับก่อนใช้", type: "scale_1_5", phase: "after_full", objective: "efficacy" },
      { id: "skin_bright_a", label: "ผิวกระจ่างใสขึ้น", type: "scale_1_5", phase: "after_full", objective: "efficacy" },
      { id: "skin_fix", label: "ปัญหาผิวที่เลือกไว้ดีขึ้นแค่ไหน", type: "scale_1_5", phase: "after_full", objective: "efficacy" },
      { id: "skin_side", label: "ผลข้างเคียง / อาการแพ้", type: "conditional", phase: "after_full", objective: "efficacy" },
    ],
    "อาหาร / เครื่องดื่ม": [
      { id: "drink_taste_b", label: "รสชาติเครื่องดื่มที่ดื่มเป็นประจำ", type: "scale_1_5", phase: "baseline", objective: "efficacy" },
      { id: "drink_effect", label: "ผลที่รู้สึกได้หลังดื่ม", type: "multiple_choice", phase: "after_full", objective: "efficacy",
        options: ["รู้สึกสดชื่น / ตื่นตัว", "ผ่อนคลาย / นอนหลับดีขึ้น", "ระบบขับถ่ายดีขึ้น", "ภูมิคุ้มกันดีขึ้น", "ไม่รู้สึกต่างจากเดิม"] },
    ],
    "สุขภาพ / อาหารเสริม": [
      { id: "supp_baseline", label: "ปัญหาสุขภาพที่ต้องการแก้", type: "multiple_choice", phase: "baseline", objective: "efficacy",
        options: ["ภูมิคุ้มกันต่ำ / เป็นหวัดบ่อย", "นอนไม่หลับ / นอนไม่เพียงพอ", "เหนื่อยล้า / อ่อนเพลีย", "ระบบขับถ่ายไม่ปกติ", "ปวดข้อ / กล้ามเนื้อ", "ผิวพรรณ / ผม / เล็บ"] },
      { id: "supp_effect", label: "ผลที่รู้สึกได้หลังใช้ครบกำหนด", type: "scale_1_5", phase: "after_full", objective: "efficacy" },
      { id: "supp_side", label: "ผลข้างเคียง / อาการไม่พึงประสงค์", type: "conditional", phase: "after_full", objective: "efficacy" },
    ],
    "_default": [
      { id: "eff_b", label: "ระดับปัญหาที่ต้องการแก้ตอนนี้", type: "scale_1_5", phase: "baseline", objective: "efficacy" },
      { id: "eff_a", label: "ปัญหาดีขึ้นหลังใช้สินค้าครบกำหนด", type: "scale_1_5", phase: "after_full", objective: "efficacy" },
      { id: "eff_side", label: "ผลข้างเคียง / อาการไม่พึงประสงค์", type: "conditional", phase: "after_full", objective: "efficacy" },
    ],
  },
  sensory: {
    "เครื่องสำอาง": [
      { id: "sens_texture", label: "เนื้อสัมผัส (Texture) เหมาะกับผิว", type: "scale_1_5", phase: "first_use", objective: "sensory" },
      { id: "sens_absorb", label: "การดูดซึม (Absorption)", type: "scale_1_5", phase: "first_use", objective: "sensory" },
      { id: "sens_smell", label: "กลิ่นน่าใช้ ไม่ฉุนรบกวน", type: "scale_1_5", phase: "first_use", objective: "sensory" },
      { id: "sens_color", label: "สีและลักษณะน่าพอใจ", type: "scale_1_5", phase: "first_use", objective: "sensory" },
      { id: "sens_first", label: "สัมผัสแรกที่รู้สึกได้", type: "tag", phase: "first_use", objective: "sensory",
        options: ["นุ่ม", "ลื่น", "ฉ่ำ", "ซึมไว", "เย็น", "หอมอ่อน", "บางเบา"] },
    ],
    "_default": [
      { id: "sens_smell_d", label: "กลิ่นและรสชาติ", type: "scale_1_5", phase: "first_use", objective: "sensory" },
      { id: "sens_texture_d", label: "เนื้อสัมผัส", type: "scale_1_5", phase: "first_use", objective: "sensory" },
      { id: "sens_first_d", label: "สัมผัสแรก", type: "tag", phase: "first_use", objective: "sensory",
        options: ["สดชื่น", "ผ่อนคลาย", "หอมโทนอุ่น", "หอมโทนเย็น", "ติดทนนาน"] },
    ],
  },
  packaging: {
    "_default": [
      { id: "pkg_design", label: "ดีไซน์ / ความสวยงาม", type: "scale_1_5", phase: "baseline", objective: "packaging" },
      { id: "pkg_func", label: "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา)", type: "scale_1_5", phase: "baseline", objective: "packaging" },
      { id: "pkg_first", label: "First Impression", type: "multiple_choice", phase: "baseline", objective: "packaging",
        options: ["ดูพรีเมียม / น่าใช้", "ดูธรรมชาติ / Organic", "ดูทันสมัย / มินิมอล", "ดูคลาสสิก / น่าเชื่อถือ", "ดูธรรมดา ไม่ประทับใจ"] },
    ],
  },
  market: {
    "_default": [
      { id: "mkt_intent", label: "Purchase Intent — คุณจะซื้อจริงไหม", type: "scale_1_5", phase: "after_full", objective: "market" },
      { id: "mkt_price", label: "ราคาสูงสุดที่ยอมจ่าย", type: "text", phase: "after_full", objective: "market" },
      { id: "mkt_target", label: "เหมาะกับกลุ่มเป้าหมายแบบใด", type: "multiple_choice", phase: "after_full", objective: "market",
        options: ["วัยรุ่น (15-24 ปี)", "วัยทำงาน (25-39 ปี)", "วัยกลางคน (40-54 ปี)", "วัยสูงอายุ (55+ ปี)", "ทุกเพศทุกวัย"] },
    ],
  },
  formula_ab: {
    "_default": [
      { id: "ab_prefer", label: "ชอบสูตรไหนมากกว่า", type: "ab_choice", phase: "after_full", objective: "formula_ab" },
      { id: "ab_diff", label: "ความแตกต่างที่สังเกตได้", type: "text", phase: "after_full", objective: "formula_ab" },
    ],
  },
};

/** Build the full form from objectives + category, with the 3 always-on core questions appended. */
export function generateEvalQuestions(objectives: TestObjective[], category: string): EvalQuestion[] {
  const result: EvalQuestion[] = [];
  for (const obj of objectives) {
    const byCategory = QUESTION_LIBRARY[obj];
    const list = byCategory[category] || byCategory["_default"] || [];
    result.push(...list);
  }
  result.push(
    { id: "core_overall", label: "ความพึงพอใจโดยรวม", type: "stars_1_5", phase: "always", objective: "efficacy" },
    { id: "core_nps", label: "แนะนำให้คนอื่น (NPS)", type: "nps_0_10", phase: "always", objective: "efficacy" },
    { id: "core_text", label: "คำแนะนำเพิ่มเติม", type: "text", phase: "always", objective: "efficacy" },
  );
  return result;
}

/** Tester-facing phases (mobile drops "first_use" like the web does). */
export type EvalPhase = "baseline" | "after_full";

/** Questions shown for one phase. The always-on core questions ride on the LAST
 *  active phase (so the tester answers them once, at the after-use form). */
export function questionsForPhase(
  objectives: TestObjective[],
  category: string,
  hasPreEval: boolean,
  phase: EvalPhase,
): EvalQuestion[] {
  const all = generateEvalQuestions(objectives, category).filter((q) => q.phase !== "first_use");
  const active: EvalPhase[] = hasPreEval ? ["baseline", "after_full"] : ["after_full"];
  const isLast = active[active.length - 1] === phase;
  return all.filter((q) => q.phase === phase || (isLast && q.phase === "always"));
}
