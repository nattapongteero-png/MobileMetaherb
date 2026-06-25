import { createContext, useContext, useState, type ReactNode } from "react";
import { TRIAL_REGISTRATIONS, type TrialRegistration } from "../data/trialRegistrations";

type TrialContextValue = {
  registrations: TrialRegistration[];
  getRegistration: (id: string) => TrialRegistration | undefined;
  /** Mark a survey done; advances the trial to "completed" once every required survey is in.
   *  Pass the after-use summary (overall/nps/comment) on the post survey. */
  markEvalDone: (
    id: string,
    kind: "pre" | "post",
    result?: { overall: number; nps?: number; comment?: string }
  ) => void;
};

const TrialContext = createContext<TrialContextValue | undefined>(undefined);

export function TrialProvider({ children }: { children: ReactNode }) {
  const [registrations, setRegistrations] = useState<TrialRegistration[]>(TRIAL_REGISTRATIONS);

  const getRegistration = (id: string) => registrations.find((r) => r.id === id);

  const markEvalDone = (
    id: string,
    kind: "pre" | "post",
    result?: { overall: number; nps?: number; comment?: string }
  ) => {
    setRegistrations((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next: TrialRegistration = { ...r };
        if (kind === "pre") next.preEvalDone = true;
        else {
          next.postEvalDone = true;
          if (result) next.evaluation = result; // overall feeds the product rating
        }
        // Done when the post-use survey is in (and the pre-use one too, if required).
        const preOk = !next.hasPreEval || !!next.preEvalDone;
        if (preOk && next.postEvalDone) next.stage = "completed";
        return next;
      })
    );
  };

  return (
    <TrialContext.Provider value={{ registrations, getRegistration, markEvalDone }}>
      {children}
    </TrialContext.Provider>
  );
}

export function useTrials() {
  const ctx = useContext(TrialContext);
  if (!ctx) throw new Error("useTrials must be used within TrialProvider");
  return ctx;
}
