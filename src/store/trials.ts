/**
 * Product-trial registrations ("ทดลองสินค้า") — one table, both sides.
 *
 * Before this there were two disconnected arrays:
 *   data/trialRegistrations.ts   the buyer's MyTrials list
 *   data/ownerTrialRegistrations.ts  the shop's applicants — with a
 *     `synthesizeCohort()` that INVENTED testers and answers for any trial
 *     without hand-authored rows.
 * Applying persisted nothing (TrialApplyScreen just navigated to a success
 * screen), and TrialEvalScreen threw away every per-question answer, keeping
 * only {overall, nps, comment} — inside the buyer's own store at that.
 *
 * Pure TS. Persisted: answers and stages are plain JSON.
 */
import { createStore } from "./db";
import { emit } from "./events";

export type TrialStage = "pending_approval" | "rejected" | "shipping" | "testing" | "completed";

export type ConditionalAnswer = { has: boolean; note?: string };

/** Every answer the eval form can collect, keyed by stable question id. */
export type EvalAnswers = {
  scoreById: Record<string, number>;
  npsScores: Record<string, number>;
  mcAnswers: Record<string, string>;
  tagAnswers: Record<string, string[]>;
  abChoices: Record<string, "A" | "B">;
  textAnswers: Record<string, string>;
  conditionalAnswers: Record<string, ConditionalAnswer>;
};

export const EMPTY_ANSWERS: EvalAnswers = {
  scoreById: {},
  npsScores: {},
  mcAnswers: {},
  tagAnswers: {},
  abChoices: {},
  textAnswers: {},
  conditionalAnswers: {},
};

export type TrialRegistration = {
  id: string;
  trialId: string;
  /** Buyer who applied. */
  userId: string;
  /** Shop running the trial. */
  shopName: string;
  applicantName: string;
  applicantPhone: string;
  address: string;
  reason: string;
  submittedAt: number;
  stage: TrialStage;
  objectives: string[];
  trackingNumber?: string;
  rejectReason?: string;
  approvedAt?: number;
  rejectedAt?: number;
  evaluatedAt?: number;
  /** Some products require a survey BEFORE the trial begins. */
  hasPreEval?: boolean;
  preEvalDone?: boolean;
  postEvalDone?: boolean;
  /** Full per-question answers — the pre- and post-use forms kept apart. */
  preAnswers?: EvalAnswers;
  postAnswers?: EvalAnswers;
};

export const trialsStore = createStore<TrialRegistration[]>([], { persistKey: "mh.trials" });

export function seedTrials(rows: TrialRegistration[]): void {
  trialsStore.reset(rows);
}

// ── reads ──────────────────────────────────────────────────────
export const allRegistrations = (): TrialRegistration[] => trialsStore.get();
export const registrationById = (id: string): TrialRegistration | undefined =>
  trialsStore.get().find((r) => r.id === id);
export const registrationsForUser = (userId: string): TrialRegistration[] =>
  trialsStore.get().filter((r) => r.userId === userId);
/** Real applicants for a trial, newest first — what the shop's registry shows. */
export const registrationsForTrial = (trialId: string): TrialRegistration[] =>
  trialsStore.get().filter((r) => r.trialId === trialId).sort((a, b) => b.submittedAt - a.submittedAt);
export const registrationsForShop = (shopName: string): TrialRegistration[] =>
  trialsStore.get().filter((r) => r.shopName === shopName);
/** Has this buyer already applied to this trial? */
export const hasApplied = (userId: string, trialId: string): boolean =>
  trialsStore.get().some((r) => r.userId === userId && r.trialId === trialId);

let seq = 0;
export function nextRegistrationId(now = Date.now()): string {
  seq += 1;
  return `treg-${now.toString(36)}-${seq}`;
}

// ── writes ─────────────────────────────────────────────────────
export type ApplyInput = {
  trialId: string;
  userId: string;
  shopName: string;
  applicantName: string;
  applicantPhone: string;
  address: string;
  reason: string;
  objectives: string[];
  hasPreEval?: boolean;
  productName?: string;
  now?: number;
};

/** Buyer applies. Idempotent per (buyer, trial) — one application each. */
export function applyForTrial(input: ApplyInput): TrialRegistration {
  const existing = trialsStore.get().find((r) => r.userId === input.userId && r.trialId === input.trialId);
  if (existing) return existing;

  const at = input.now ?? Date.now();
  const reg: TrialRegistration = {
    id: nextRegistrationId(at),
    trialId: input.trialId,
    userId: input.userId,
    shopName: input.shopName,
    applicantName: input.applicantName,
    applicantPhone: input.applicantPhone,
    address: input.address,
    reason: input.reason,
    submittedAt: at,
    stage: "pending_approval",
    objectives: input.objectives,
    hasPreEval: input.hasPreEval,
  };
  trialsStore.set((prev) => [reg, ...prev]);
  emit({
    type: "trial_applied",
    audience: ["shop"],
    at,
    userId: reg.userId,
    shopName: reg.shopName,
    title: "มีผู้สมัครทดลองสินค้าใหม่",
    body: `${reg.applicantName}${input.productName ? ` · ${input.productName}` : ""}`,
  });
  return reg;
}

function patch(id: string, fn: (r: TrialRegistration) => TrialRegistration): TrialRegistration | undefined {
  let updated: TrialRegistration | undefined;
  trialsStore.set((prev) =>
    prev.map((r) => {
      if (r.id !== id) return r;
      updated = fn(r);
      return updated;
    }),
  );
  return updated;
}

/** Shop approves → the buyer's MyTrials moves to "กำลังจัดส่ง". */
export function approveRegistration(id: string, now = Date.now()): TrialRegistration | undefined {
  const current = registrationById(id);
  if (!current || current.stage !== "pending_approval") return undefined;
  const r = patch(id, (prev) => ({ ...prev, stage: "shipping", approvedAt: now }));
  if (r) {
    emit({
      type: "trial_approved",
      audience: ["customer"],
      at: now,
      userId: r.userId,
      shopName: r.shopName,
      title: "คำขอทดลองสินค้าได้รับการอนุมัติ",
      body: "ร้านกำลังจัดส่งสินค้าให้คุณ",
    });
  }
  return r;
}

export function rejectRegistration(id: string, reason: string, now = Date.now()): TrialRegistration | undefined {
  const current = registrationById(id);
  if (!current || current.stage !== "pending_approval") return undefined;
  const r = patch(id, (prev) => ({ ...prev, stage: "rejected", rejectedAt: now, rejectReason: reason }));
  if (r) {
    emit({
      type: "trial_rejected",
      audience: ["customer"],
      at: now,
      userId: r.userId,
      shopName: r.shopName,
      title: "คำขอทดลองสินค้าไม่ผ่านการพิจารณา",
      body: reason,
    });
  }
  return r;
}

/** Shop ships the sample → the buyer can start testing. */
export function shipTrial(id: string, trackingNumber: string): TrialRegistration | undefined {
  const current = registrationById(id);
  if (!current || current.stage !== "shipping") return undefined;
  return patch(id, (prev) => ({ ...prev, stage: "testing", trackingNumber }));
}

/**
 * Buyer submits a survey. The FULL answer set is stored — the owner's
 * "คำตอบแบบประเมิน" screen reads it instead of a synthesised one.
 */
export function submitEval(
  id: string,
  kind: "pre" | "post",
  answers: EvalAnswers,
  now = Date.now(),
): TrialRegistration | undefined {
  const current = registrationById(id);
  if (!current) return undefined;

  const r = patch(id, (prev) => {
    const next: TrialRegistration = { ...prev };
    if (kind === "pre") {
      next.preEvalDone = true;
      next.preAnswers = answers;
    } else {
      next.postEvalDone = true;
      next.postAnswers = answers;
      next.evaluatedAt = now;
    }
    const preOk = !next.hasPreEval || Boolean(next.preEvalDone);
    if (preOk && next.postEvalDone) next.stage = "completed";
    return next;
  });

  if (r && kind === "post") {
    emit({
      type: "trial_evaluated",
      audience: ["shop"],
      at: now,
      userId: r.userId,
      shopName: r.shopName,
      title: "ผู้ทดลองส่งแบบประเมินแล้ว",
      body: `${r.applicantName} · ให้ ${answers.scoreById["core_overall"] ?? 0} ดาว`,
    });
  }
  return r;
}

/** Overall stars from the always-on `core_overall` question. */
export const overallScore = (a?: EvalAnswers): number => a?.scoreById["core_overall"] ?? 0;
/** NPS ≥ 7 means the tester would recommend. */
export const wouldRecommend = (a?: EvalAnswers): boolean => (a?.npsScores["core_nps"] ?? 0) >= 7;
export const evalComment = (a?: EvalAnswers): string => (a?.textAnswers["core_text"] ?? "").trim();

/** Test helper. */
export function __resetTrials(): void {
  trialsStore.reset([]);
  seq = 0;
}
