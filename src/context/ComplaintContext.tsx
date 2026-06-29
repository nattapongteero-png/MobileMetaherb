import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { SHOP_COMPLAINTS, type Complaint, type ComplaintStatus } from "../data/shopComplaints";

/**
 * Shared complaints store. The owner console reads this list; the customer
 * "แจ้งปัญหาสินค้า" flow calls addComplaint() on submit so a new pending case
 * shows up at the top of the owner's เรื่องร้องเรียน list.
 */
type NewComplaint = Omit<Complaint, "id" | "status" | "refundAmount" | "note">;

type Ctx = {
  complaints: Complaint[];
  addComplaint: (input: NewComplaint) => string;
  setDecision: (id: string, status: ComplaintStatus, opts?: { refundAmount?: number; note?: string }) => void;
  setNote: (id: string, note: string) => void;
};

const ComplaintCtx = createContext<Ctx | null>(null);

function genId(seq: number): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `DSP-${ymd}-${String(seq).padStart(3, "0")}`;
}

export function ComplaintProvider({ children }: { children: ReactNode }) {
  const [complaints, setComplaints] = useState<Complaint[]>(SHOP_COMPLAINTS);

  const addComplaint = (input: NewComplaint): string => {
    const id = genId(complaints.length + 1);
    setComplaints((prev) => [{ ...input, id, status: "pending" }, ...prev]);
    return id;
  };

  const setDecision: Ctx["setDecision"] = (id, status, opts) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status, refundAmount: opts?.refundAmount ?? c.refundAmount, note: opts?.note ?? c.note }
          : c,
      ),
    );
  };

  const setNote: Ctx["setNote"] = (id, note) => {
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, note } : c)));
  };

  const value = useMemo(() => ({ complaints, addComplaint, setDecision, setNote }), [complaints]);
  return <ComplaintCtx.Provider value={value}>{children}</ComplaintCtx.Provider>;
}

export function useComplaints(): Ctx {
  const ctx = useContext(ComplaintCtx);
  if (!ctx) throw new Error("useComplaints must be used within ComplaintProvider");
  return ctx;
}
