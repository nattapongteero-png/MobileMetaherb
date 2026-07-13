/**
 * Complaints ("เรื่องร้องเรียน") — one record, read by both sides.
 *
 * This was the one customer→shop flow that already worked: ComplaintFormScreen
 * wrote into a shared context the owner console read. What was missing was the
 * return leg — the buyer's ComplaintStatusScreen rendered a hardcoded case and
 * nothing ever navigated to it, so the shop's decision reached no one.
 *
 * Not persisted: the seeded cases carry evidence photos as bundler image
 * handles, which don't survive a JSON round-trip. Orders / coupons / promotions
 * persist; complaints reset with the app.
 */
import { createStore } from "./db";
import { emit } from "./events";
import type { ImageRef } from "./types";

export type ComplaintKind = "damaged" | "wrong_item" | "return" | "refund";

export type ComplaintStatus = "pending" | "acknowledged" | "refund_full" | "refund_partial" | "rejected";

export const COMPLAINT_STATUS_LABEL: Record<ComplaintStatus, string> = {
  pending: "รอดำเนินการ",
  acknowledged: "ยืนยันรับแจ้งปัญหา",
  refund_full: "คืนเงินเต็มจำนวน",
  refund_partial: "คืนเงินบางส่วน",
  rejected: "ปฏิเสธ",
};

/** Statuses that close a case. Anything else is still in the shop's queue. */
export const isDecided = (s: ComplaintStatus): boolean =>
  s === "refund_full" || s === "refund_partial" || s === "rejected";

export type ComplaintItem = {
  productId?: string;
  name: string;
  option: string;
  qty: number;
  price: number;
  image: ImageRef;
};

/** A photo or video clip attached as supporting evidence. */
export type Evidence = { source: ImageRef; video?: boolean };

export type Complaint = {
  id: string;
  /** Buyer who filed it — scopes their status screen. */
  userId: string;
  /** Shop the order belongs to — scopes the console. */
  shopName: string;
  orderId: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  type: ComplaintKind;
  status: ComplaintStatus;
  product: string;
  description: string;
  amount: number;
  refundAmount?: number;
  refundChannel: string;
  createdAt: string;
  /** The shop's reply to the buyer. */
  note?: string;
  items: ComplaintItem[];
  evidence: Evidence[];
  /** One entry per status change — drives the buyer's timeline. */
  history: { status: ComplaintStatus; at: number }[];
};

export const complaintsStore = createStore<Complaint[]>([]);

export function seedComplaints(rows: Complaint[]): void {
  complaintsStore.reset(rows);
}

// ── reads ──────────────────────────────────────────────────────
export const allComplaints = (): Complaint[] => complaintsStore.get();
export const complaintById = (id: string): Complaint | undefined =>
  complaintsStore.get().find((c) => c.id === id);
export const complaintsForUser = (userId: string): Complaint[] =>
  complaintsStore.get().filter((c) => c.userId === userId);
export const complaintsForShop = (shopName: string): Complaint[] =>
  complaintsStore.get().filter((c) => c.shopName === shopName);
/** The buyer's case against a given order, if they filed one. */
export const complaintForOrder = (userId: string, orderId: string): Complaint | undefined =>
  complaintsStore.get().find((c) => c.userId === userId && c.orderId === orderId);

// ── ids ────────────────────────────────────────────────────────
let seq = 0;
/** "DSP-20260710-001" — the namespace the seeded cases already use. */
export function nextComplaintId(now = Date.now()): string {
  const d = new Date(now);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  seq += 1;
  return `DSP-${ymd}-${String(seq).padStart(3, "0")}`;
}

// ── writes ─────────────────────────────────────────────────────
export type FileComplaintInput = Omit<
  Complaint,
  "id" | "status" | "refundAmount" | "note" | "history"
> & { now?: number };

export function fileComplaint(input: FileComplaintInput): Complaint {
  const { now, ...rest } = input;
  const at = now ?? Date.now();
  const record: Complaint = {
    ...rest,
    id: nextComplaintId(at),
    status: "pending",
    history: [{ status: "pending", at }],
  };
  complaintsStore.set((prev) => [record, ...prev]);
  emit({
    type: "complaint_filed",
    audience: ["shop"],
    at,
    userId: record.userId,
    shopName: record.shopName,
    orderId: record.orderId,
    title: "มีเรื่องร้องเรียนใหม่",
    body: `${record.customer} · ${record.orderId} · ฿${record.amount.toLocaleString()}`,
  });
  return record;
}

/** The shop's verdict. The buyer's status screen reads this very row. */
export function decideComplaint(
  id: string,
  status: ComplaintStatus,
  opts: { refundAmount?: number; note?: string; now?: number } = {},
): Complaint | undefined {
  const at = opts.now ?? Date.now();
  let updated: Complaint | undefined;
  complaintsStore.set((prev) =>
    prev.map((c) => {
      if (c.id !== id) return c;
      updated = {
        ...c,
        status,
        refundAmount: opts.refundAmount ?? c.refundAmount,
        note: opts.note ?? c.note,
        // Re-deciding the same status shouldn't add a duplicate timeline entry.
        history: c.status === status ? c.history : [...c.history, { status, at }],
      };
      return updated;
    }),
  );
  if (updated) {
    emit({
      type: "complaint_decided",
      audience: ["customer"],
      at,
      userId: updated.userId,
      shopName: updated.shopName,
      orderId: updated.orderId,
      title: "ร้านตอบกลับเรื่องร้องเรียนแล้ว",
      body: `${updated.id} · ${COMPLAINT_STATUS_LABEL[status]}`,
    });
  }
  return updated;
}

export function setComplaintNote(id: string, note: string): void {
  complaintsStore.set((prev) => prev.map((c) => (c.id === id ? { ...c, note } : c)));
}

/** Test helper. */
export function __resetComplaints(): void {
  complaintsStore.reset([]);
  seq = 0;
}
