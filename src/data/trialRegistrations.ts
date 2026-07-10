import { BRAND_GREEN } from "../theme/tokens";
import type { TestObjective } from "./evalQuestions";

// ── Trial lifecycle ────────────────────────────────────────────────────────────
// สมัคร → รออนุมัติ → (ถูกปฏิเสธ | ร้านจัดส่ง) → ได้รับแล้วเริ่มทดลอง + ทำแบบประเมิน → เสร็จสิ้น.
// Some products carry a pre-use survey on top of the post-use one (hasPreEval).
import {
  overallScore,
  evalComment,
  type EvalAnswers,
  type TrialRegistration,
  type TrialStage,
} from "../store/trials";
import { DEMO_USER } from "../store/session";
import { METAHERB_SHOP } from "./shopOrders";

export type { TrialRegistration, TrialStage };

export const STAGE_META: Record<TrialStage, { label: string; tint: string; bg: string }> = {
  pending_approval: { label: "รออนุมัติ", tint: "#f97316", bg: "rgba(249,115,22,0.12)" },
  rejected: { label: "ถูกปฏิเสธ", tint: "#dc2626", bg: "rgba(220,38,38,0.10)" },
  shipping: { label: "กำลังจัดส่ง", tint: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
  testing: { label: "กำลังทดลอง", tint: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  completed: { label: "เสร็จสิ้น", tint: BRAND_GREEN, bg: "rgba(49,151,84,0.12)" },
};

const DAY = 1000 * 60 * 60 * 24;
const now = Date.now();
const ADDR = "459/153 ถ.สุขสวัสดิ์ ราษฎร์บูรณะ กรุงเทพฯ 10140";

/** Turn a legacy {overall, nps, comment} summary into the full answer shape. */
const summary = (overall: number, nps: number, comment: string): EvalAnswers => ({
  scoreById: { core_overall: overall },
  npsScores: { core_nps: nps },
  mcAnswers: {},
  tagAnswers: {},
  abChoices: {},
  textAnswers: { core_text: comment },
  conditionalAnswers: {},
});

type SeedTrial = Omit<TrialRegistration, "userId" | "shopName" | "applicantName" | "applicantPhone">;

const BASE: SeedTrial[] = [
  // รออนุมัติ — เพิ่งส่งใบสมัคร
  { id: "treg-1", trialId: "trial-1", address: ADDR, submittedAt: now - DAY * 1, stage: "pending_approval", objectives: ["efficacy", "sensory"], reason: "ผิวแห้งและแพ้ง่าย อยากลองครีมอโรมาสูตรอ่อนโยน และช่วยรีวิวเพื่อพัฒนาสินค้า" },
  // ถูกปฏิเสธ — ร้านไม่อนุมัติคำขอ
  { id: "treg-2", trialId: "trial-7", address: ADDR, submittedAt: now - DAY * 4, stage: "rejected", objectives: ["efficacy"], reason: "สนใจผลิตภัณฑ์ตัวนี้มาก อยากทดลองใช้จริงก่อนตัดสินใจซื้อ", rejectReason: "คุณสมบัติผู้ทดสอบไม่ตรงเกณฑ์ของรอบนี้" },
  // กำลังจัดส่ง — อนุมัติแล้ว ร้านส่งของ
  { id: "treg-3", trialId: "trial-6", address: ADDR, submittedAt: now - DAY * 3, stage: "shipping", trackingNumber: "TH-TRIAL-0098", objectives: ["sensory", "packaging"], reason: "ใช้ผลิตภัณฑ์ประเภทนี้เป็นประจำ อยากเปรียบเทียบกับแบรนด์ที่ใช้อยู่และให้ฟีดแบ็ก" },
  // กำลังทดลอง — ได้รับแล้ว มีแบบประเมินก่อนใช้ที่ยังไม่ทำ
  { id: "treg-4", trialId: "trial-2", address: ADDR, submittedAt: now - DAY * 6, stage: "testing", trackingNumber: "TH-TRIAL-0072", objectives: ["efficacy", "sensory"], reason: "ชอบทดลองสินค้าใหม่ ๆ และเขียนรีวิวอย่างละเอียด อยากช่วยทีมพัฒนาผลิตภัณฑ์", hasPreEval: true, preEvalDone: false, postEvalDone: false },
  // กำลังทดลอง — ทำก่อนใช้แล้ว เหลือหลังใช้
  { id: "treg-5", trialId: "trial-3", address: ADDR, submittedAt: now - DAY * 9, stage: "testing", trackingNumber: "TH-TRIAL-0061", objectives: ["efficacy", "market"], reason: "ดื่มชาทุกวัน อยากลองรสชาติใหม่ก่อนวางขายจริงและบอกความเห็น", hasPreEval: true, preEvalDone: true, postEvalDone: false },
  // กำลังทดลอง — ไม่มีก่อนใช้ เหลือหลังใช้
  { id: "treg-6", trialId: "trial-5", address: ADDR, submittedAt: now - DAY * 7, stage: "testing", trackingNumber: "TH-TRIAL-0055", objectives: ["efficacy"], reason: "มองหาสินค้าสมุนไพรที่ใช้ได้จริง อยากทดสอบประสิทธิภาพด้วยตัวเอง", postEvalDone: false },
  // กำลังทดลอง — ตัวอย่างครบทุกวัตถุประสงค์ (เห็นคำถามครบชุด ทั้งก่อน/หลังใช้)
  { id: "treg-9", trialId: "trial-13", address: ADDR, submittedAt: now - DAY * 5, stage: "testing", trackingNumber: "TH-TRIAL-0110", objectives: ["efficacy", "sensory", "packaging", "market", "formula_ab"], reason: "อยากร่วมทดสอบเต็มรูปแบบ และให้ฟีดแบ็กครบทุกด้านเพื่อช่วยพัฒนาสินค้า", hasPreEval: true, preEvalDone: false, postEvalDone: false },
  // เสร็จสิ้น — ประเมินครบ
  { id: "treg-7", trialId: "trial-4", address: ADDR, submittedAt: now - DAY * 30, stage: "completed", objectives: ["efficacy", "market"], reason: "เป็นลูกค้าประจำ อยากร่วมทดสอบและสนับสนุนผลิตภัณฑ์ใหม่ของร้าน", hasPreEval: true, preEvalDone: true, postEvalDone: true, postAnswers: summary(5, 9, "ใช้แล้วเห็นผลจริง ชอบมาก แพ็กเกจสวย จะซื้อซ้ำแน่นอน") },
  { id: "treg-8", trialId: "trial-eq", address: ADDR, submittedAt: now - DAY * 20, stage: "completed", objectives: ["packaging", "market"], reason: "สนใจอุปกรณ์รุ่นนี้ อยากลองใช้งานจริงและให้ความเห็นเชิงลึก", postEvalDone: true, postAnswers: summary(4, 8, "อุปกรณ์ใช้งานดี แข็งแรง คุ้มราคา") },
];

/** The demo buyer's trial history — seeded into the shared table at app start. */
export const TRIAL_REGISTRATIONS: TrialRegistration[] = BASE.map((r) => ({
  ...r,
  userId: DEMO_USER.id,
  shopName: METAHERB_SHOP,
  applicantName: DEMO_USER.name,
  applicantPhone: DEMO_USER.phone,
}));

/** Which survey the user should fill next while testing (null = nothing pending). */
export type EvalKind = "pre" | "post" | null;
export function nextEval(reg: TrialRegistration): EvalKind {
  if (reg.stage !== "testing") return null;
  if (reg.hasPreEval && !reg.preEvalDone) return "pre";
  if (!reg.postEvalDone) return "post";
  return null;
}

/** Legacy accessors — screens still show the overall star / comment summary. */
export const regOverall = (r: TrialRegistration): number => overallScore(r.postAnswers);
export const regComment = (r: TrialRegistration): string => evalComment(r.postAnswers);

export const fmtTrialDate = (ts: number) =>
  new Date(ts).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
