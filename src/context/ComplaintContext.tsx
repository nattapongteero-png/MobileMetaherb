import { type ReactNode } from "react";
import { useStore } from "../store/db";
import {
  allComplaints,
  complaintsStore,
  decideComplaint,
  fileComplaint,
  setComplaintNote,
  type Complaint,
  type ComplaintStatus,
  type FileComplaintInput,
} from "../store/complaints";

/**
 * Thin view over the shared complaints table (src/store/complaints.ts). The
 * owner console reads this list; the buyer's "แจ้งปัญหาสินค้า" flow calls
 * addComplaint(), and — new in Phase 3 — the buyer's ComplaintStatusScreen
 * reads the very same row, so the shop's decision reaches them.
 */
type Ctx = {
  complaints: Complaint[];
  addComplaint: (input: Omit<FileComplaintInput, "now">) => string;
  setDecision: (id: string, status: ComplaintStatus, opts?: { refundAmount?: number; note?: string }) => void;
  setNote: (id: string, note: string) => void;
};

export function ComplaintProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useComplaints(): Ctx {
  useStore(complaintsStore); // subscribe
  return {
    complaints: allComplaints(),
    addComplaint: (input) => fileComplaint(input).id,
    setDecision: (id, status, opts) => void decideComplaint(id, status, opts),
    setNote: setComplaintNote,
  };
}
