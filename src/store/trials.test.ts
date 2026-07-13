import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetTrials,
  applyForTrial,
  approveRegistration,
  EMPTY_ANSWERS,
  evalComment,
  hasApplied,
  overallScore,
  registrationById,
  registrationsForShop,
  registrationsForTrial,
  registrationsForUser,
  rejectRegistration,
  shipTrial,
  submitEval,
  wouldRecommend,
  type ApplyInput,
  type EvalAnswers,
} from "./trials";
import { __resetEvents, eventsFor } from "./events";

const NOW = 1_700_000_000_000;
const BUYER = "u-1";
const SHOP = "METAHERB Store";
const TRIAL = "trial-1";

const apply = (over: Partial<ApplyInput> = {}) =>
  applyForTrial({
    trialId: TRIAL,
    userId: BUYER,
    shopName: SHOP,
    applicantName: "ณัฐพงษ์ ธีโรภาส",
    applicantPhone: "061-421-3111",
    address: "459/153 ถ.สุขสวัสดิ์ กรุงเทพฯ 10140",
    reason: "อยากลองใช้ดูว่าช่วยเรื่องนอนหลับได้จริงไหมครับ",
    objectives: ["efficacy"],
    now: NOW,
    ...over,
  });

const answers = (over: Partial<EvalAnswers> = {}): EvalAnswers => ({
  ...EMPTY_ANSWERS,
  scoreById: { core_overall: 5, q_texture: 4 },
  npsScores: { core_nps: 9 },
  textAnswers: { core_text: "  ดีมากครับ ใช้แล้วหลับสบาย  " },
  mcAnswers: { q_freq: "ทุกวัน" },
  tagAnswers: { q_likes: ["กลิ่น", "เนื้อสัมผัส"] },
  ...over,
});

beforeEach(() => {
  __resetTrials();
  __resetEvents();
});

describe("the seam: an application reaches the shop", () => {
  it("persists the application instead of just navigating to a success screen", () => {
    const r = apply();
    expect(r.stage).toBe("pending_approval");
    expect(registrationsForUser(BUYER)).toHaveLength(1);
    // The shop's registry reads the same row.
    expect(registrationsForTrial(TRIAL)[0]).toBe(registrationsForUser(BUYER)[0]);
    expect(registrationsForShop(SHOP)).toHaveLength(1);
  });

  it("allows one application per buyer per trial", () => {
    const first = apply();
    const second = apply({ reason: "ขอสมัครอีกครั้ง" });
    expect(second.id).toBe(first.id);
    expect(registrationsForTrial(TRIAL)).toHaveLength(1);
    expect(hasApplied(BUYER, TRIAL)).toBe(true);
    expect(hasApplied("u-2", TRIAL)).toBe(false);
  });

  it("lists a trial's applicants newest first", () => {
    apply({ userId: "u-2", now: NOW });
    apply({ userId: "u-3", now: NOW + 1000 });
    expect(registrationsForTrial(TRIAL).map((r) => r.userId)).toEqual(["u-3", "u-2"]);
  });

  it("notifies the shop", () => {
    apply({ productName: "เซรั่มสมุนไพร" });
    const evs = eventsFor("shop", { shopName: SHOP });
    expect(evs.map((e) => e.type)).toEqual(["trial_applied"]);
    expect(evs[0].body).toContain("เซรั่มสมุนไพร");
  });
});

describe("the shop's verdict reaches the buyer", () => {
  it("approve → shipping, and the buyer is told", () => {
    const { id } = apply();
    approveRegistration(id, NOW + 1000);
    expect(registrationsForUser(BUYER)[0].stage).toBe("shipping");
    expect(eventsFor("customer", { userId: BUYER }).map((e) => e.type)).toEqual(["trial_approved"]);
  });

  it("reject → rejected, carrying the reason", () => {
    const { id } = apply();
    rejectRegistration(id, "โควตาเต็มแล้วครับ", NOW + 1000);
    const r = registrationById(id)!;
    expect(r.stage).toBe("rejected");
    expect(r.rejectReason).toBe("โควตาเต็มแล้วครับ");
    expect(eventsFor("customer", { userId: BUYER })[0].body).toBe("โควตาเต็มแล้วครับ");
  });

  it("cannot approve twice, or approve something already rejected", () => {
    const { id } = apply();
    approveRegistration(id);
    expect(approveRegistration(id)).toBeUndefined();

    const other = apply({ userId: "u-2" });
    rejectRegistration(other.id, "ไม่ผ่านเกณฑ์");
    expect(approveRegistration(other.id)).toBeUndefined();
  });

  it("ships only after approval", () => {
    const { id } = apply();
    expect(shipTrial(id, "TH-1")).toBeUndefined();
    approveRegistration(id);
    expect(shipTrial(id, "TH-1")!.stage).toBe("testing");
    expect(registrationById(id)!.trackingNumber).toBe("TH-1");
  });
});

describe("evaluation answers survive", () => {
  it("keeps every per-question answer, not just three summary fields", () => {
    const { id } = apply();
    approveRegistration(id);
    shipTrial(id, "TH-1");
    submitEval(id, "post", answers(), NOW + 5000);

    const r = registrationById(id)!;
    expect(r.stage).toBe("completed");
    // The old code kept {overall, nps, comment} and dropped the rest.
    expect(r.postAnswers!.scoreById).toEqual({ core_overall: 5, q_texture: 4 });
    expect(r.postAnswers!.mcAnswers).toEqual({ q_freq: "ทุกวัน" });
    expect(r.postAnswers!.tagAnswers).toEqual({ q_likes: ["กลิ่น", "เนื้อสัมผัส"] });
    expect(r.evaluatedAt).toBe(NOW + 5000);
  });

  it("waits for the pre-use survey when the trial requires one", () => {
    const { id } = apply({ hasPreEval: true });
    approveRegistration(id);
    shipTrial(id, "TH-1");

    submitEval(id, "post", answers());
    expect(registrationById(id)!.stage).toBe("testing"); // not done — pre survey missing

    submitEval(id, "pre", answers());
    expect(registrationById(id)!.stage).toBe("completed");
  });

  it("keeps the pre- and post-use answers apart", () => {
    const { id } = apply({ hasPreEval: true });
    submitEval(id, "pre", answers({ scoreById: { core_overall: 2 } }));
    submitEval(id, "post", answers({ scoreById: { core_overall: 5 } }));
    const r = registrationById(id)!;
    expect(overallScore(r.preAnswers)).toBe(2);
    expect(overallScore(r.postAnswers)).toBe(5);
  });

  it("tells the shop the tester's score", () => {
    const { id } = apply();
    __resetEvents();
    submitEval(id, "post", answers());
    const evs = eventsFor("shop", { shopName: SHOP });
    expect(evs.map((e) => e.type)).toEqual(["trial_evaluated"]);
    expect(evs[0].body).toContain("5 ดาว");
  });

  it("stays quiet on the pre-use survey", () => {
    const { id } = apply({ hasPreEval: true });
    __resetEvents();
    submitEval(id, "pre", answers());
    expect(eventsFor("shop", { shopName: SHOP })).toHaveLength(0);
  });

  it("derives the summary the dashboards show", () => {
    const a = answers();
    expect(overallScore(a)).toBe(5);
    expect(wouldRecommend(a)).toBe(true); // NPS 9
    expect(wouldRecommend(answers({ npsScores: { core_nps: 6 } }))).toBe(false);
    expect(evalComment(a)).toBe("ดีมากครับ ใช้แล้วหลับสบาย"); // trimmed
    expect(overallScore(undefined)).toBe(0);
  });
});
