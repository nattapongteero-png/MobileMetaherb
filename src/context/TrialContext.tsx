import { type ReactNode } from "react";
import { useStore } from "../store/db";
import {
  allRegistrations,
  applyForTrial,
  registrationById,
  submitEval,
  trialsStore,
  type ApplyInput,
  type EvalAnswers,
  type TrialRegistration,
} from "../store/trials";

/**
 * Thin view over the shared trial table (src/store/trials.ts).
 *
 * Applying used to persist nothing at all, and the eval form's answers were
 * summarised to three fields inside a buyer-only store — the shop's applicant
 * list and "คำตอบแบบประเมิน" page read a *synthesised* cohort instead. Both
 * sides now read this table.
 */
type TrialContextValue = {
  registrations: TrialRegistration[];
  getRegistration: (id: string) => TrialRegistration | undefined;
  /** Buyer submits an application. Idempotent per (buyer, trial). */
  apply: (input: Omit<ApplyInput, "now">) => TrialRegistration;
  /** Save a survey. The FULL answer set is kept; the shop reads it verbatim. */
  markEvalDone: (id: string, kind: "pre" | "post", answers: EvalAnswers) => void;
};

export function TrialProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useTrials(): TrialContextValue {
  useStore(trialsStore); // subscribe
  return {
    registrations: allRegistrations(),
    getRegistration: registrationById,
    apply: applyForTrial,
    markEvalDone: (id, kind, answers) => void submitEval(id, kind, answers),
  };
}
