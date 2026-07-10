/**
 * B2B quote requests (RFQ → ใบเสนอราคา) — one record, both sides.
 *
 * HerbalMarketQuoteScreen collected a full RFQ (company, tax id, contact,
 * certificate grade, required-by date, cart lines) and on submit called
 * `setSubmitted(true)`. Nothing was written anywhere. Meanwhile the buyer's
 * B2BDocs page read `MOCK_QUOTES` and the shop console read a different array
 * (`QUOTATIONS`) — two frozen lists that had never met.
 *
 * Pure TS. Line images are dropped before persisting and are optional anyway.
 */
import { createStore } from "./db";
import { emit } from "./events";
import type { ImageRef } from "./types";

/**
 * requested — the buyer sent an RFQ; the shop owes them a price.
 * quoted    — the shop priced it; the buyer owes an answer.
 * accepted / rejected — the buyer's answer.
 * expired   — the quote's validity ran out before either happened.
 */
export type QuoteStatus = "requested" | "quoted" | "accepted" | "rejected" | "expired";

export type QuoteLine = {
  materialId?: string;
  name: string;
  supplier: string;
  qty: number;
  unit: string;
  /** Buyer's reference price at request time; the shop may overwrite it when quoting. */
  price: number;
  image?: ImageRef;
};

export type QuoteRequest = {
  id: string;
  userId: string;
  shopName: string;
  status: QuoteStatus;
  createdAt: number;
  /** Set when the shop responds. */
  quotedAt?: number;
  decidedAt?: number;
  /** Epoch ms; the quote lapses after this. */
  validUntil?: number;
  company: { name: string; taxId: string; address: string };
  contact: { name: string; position?: string; phone: string; email: string; poRef?: string };
  /** Grade / certificate the buyer asked for. */
  certificate?: string;
  /** "ต้องการภายใน" — free text from the form. */
  neededBy?: string;
  note?: string;
  items: QuoteLine[];
  /** The shop's reply. */
  shopNote?: string;
  poNumber?: string;
};

export const quotesStore = createStore<QuoteRequest[]>([], {
  persistKey: "mh.quotes",
  toJSON: (rows) => rows.map((q) => ({ ...q, items: q.items.map(({ image, ...it }) => it) })),
});

export function seedQuotes(rows: QuoteRequest[]): void {
  quotesStore.reset([...rows].sort((a, b) => b.createdAt - a.createdAt));
}

export const quoteTotal = (q: Pick<QuoteRequest, "items">): number =>
  q.items.reduce((s, it) => s + it.qty * it.price, 0);

// ── status ─────────────────────────────────────────────────────
/** A quote whose validity has lapsed reads as expired, whatever the stored status. */
export function effectiveQuoteStatus(q: QuoteRequest, now = Date.now()): QuoteStatus {
  if (q.status === "quoted" && q.validUntil != null && q.validUntil < now) return "expired";
  return q.status;
}

export const daysRemaining = (q: QuoteRequest, now = Date.now()): number =>
  q.validUntil == null ? 0 : Math.max(0, Math.ceil((q.validUntil - now) / 86_400_000));

// ── reads ──────────────────────────────────────────────────────
export const allQuotes = (): QuoteRequest[] => quotesStore.get();
export const quoteById = (id: string): QuoteRequest | undefined =>
  quotesStore.get().find((q) => q.id === id);
export const quotesForUser = (userId: string): QuoteRequest[] =>
  quotesStore.get().filter((q) => q.userId === userId);
export const quotesForShop = (shopName: string): QuoteRequest[] =>
  quotesStore.get().filter((q) => q.shopName === shopName);

let seq = 0;
/** "QT-2569-0001" — the namespace both seeded lists already use. */
export function nextQuoteId(now = Date.now()): string {
  seq += 1;
  const be = new Date(now).getFullYear() + 543;
  return `QT-${be}-${String(seq).padStart(4, "0")}`;
}

// ── writes ─────────────────────────────────────────────────────
export type CreateQuoteInput = Omit<
  QuoteRequest,
  "id" | "status" | "createdAt" | "quotedAt" | "decidedAt" | "validUntil" | "shopNote" | "poNumber"
> & { now?: number };

/** The buyer submits an RFQ. */
export function createQuoteRequest(input: CreateQuoteInput): QuoteRequest {
  const { now, ...rest } = input;
  const at = now ?? Date.now();
  const q: QuoteRequest = { ...rest, id: nextQuoteId(at), status: "requested", createdAt: at };
  quotesStore.set((prev) => [q, ...prev]);
  emit({
    type: "quote_requested",
    audience: ["shop"],
    at,
    userId: q.userId,
    shopName: q.shopName,
    title: "มีคำขอใบเสนอราคาใหม่",
    body: `${q.company.name} · ${q.items.length} รายการ · ฿${quoteTotal(q).toLocaleString()}`,
  });
  return q;
}

function patch(id: string, fn: (q: QuoteRequest) => QuoteRequest): QuoteRequest | undefined {
  let updated: QuoteRequest | undefined;
  quotesStore.set((prev) =>
    prev.map((q) => {
      if (q.id !== id) return q;
      updated = fn(q);
      return updated;
    }),
  );
  return updated;
}

export type SendQuoteInput = {
  /** Per-line prices the shop is offering. Omitted lines keep the buyer's reference price. */
  prices?: Record<string, number>;
  validDays?: number;
  shopNote?: string;
  now?: number;
};

/** The shop prices the RFQ. Only a `requested` quote can be answered. */
export function sendQuote(id: string, input: SendQuoteInput = {}): QuoteRequest | undefined {
  const current = quoteById(id);
  if (!current || current.status !== "requested") return undefined;
  const at = input.now ?? Date.now();
  const validDays = input.validDays ?? 14;

  const q = patch(id, (prev) => ({
    ...prev,
    status: "quoted",
    quotedAt: at,
    validUntil: at + validDays * 86_400_000,
    shopNote: input.shopNote ?? prev.shopNote,
    items: prev.items.map((it) => {
      const key = it.materialId ?? it.name;
      const offered = input.prices?.[key];
      return offered != null ? { ...it, price: offered } : it;
    }),
  }));

  if (q) {
    emit({
      type: "quote_sent",
      audience: ["customer"],
      at,
      userId: q.userId,
      shopName: q.shopName,
      title: "ได้รับใบเสนอราคาแล้ว",
      body: `${q.id} · ฿${quoteTotal(q).toLocaleString()} · ใช้ได้ ${validDays} วัน`,
    });
  }
  return q;
}

let poSeq = 0;
/** "PO-2569-0001" — issued the moment a quote is accepted. */
export function nextPoNumber(now = Date.now()): string {
  poSeq += 1;
  const be = new Date(now).getFullYear() + 543;
  return `PO-${be}-${String(poSeq).padStart(4, "0")}`;
}

/**
 * The buyer accepts, which issues a purchase order. A lapsed quote can't be
 * accepted. (The PO number used to be an optional argument nobody passed, so an
 * accepted quote linked to nothing.)
 */
export function acceptQuote(id: string, poNumber?: string, now = Date.now()): QuoteRequest | undefined {
  const current = quoteById(id);
  if (!current || effectiveQuoteStatus(current, now) !== "quoted") return undefined;
  const po = poNumber ?? nextPoNumber(now);
  const q = patch(id, (prev) => ({ ...prev, status: "accepted", decidedAt: now, poNumber: po }));
  if (q) {
    emit({
      type: "quote_accepted",
      audience: ["shop"],
      at: now,
      userId: q.userId,
      shopName: q.shopName,
      title: "ลูกค้าตอบรับใบเสนอราคา",
      body: `${q.id} · ${q.company.name} · ออก ${po}`,
    });
  }
  return q;
}

export function rejectQuote(id: string, reason?: string, now = Date.now()): QuoteRequest | undefined {
  const current = quoteById(id);
  if (!current || effectiveQuoteStatus(current, now) !== "quoted") return undefined;
  const q = patch(id, (prev) => ({ ...prev, status: "rejected", decidedAt: now, shopNote: reason ?? prev.shopNote }));
  if (q) {
    emit({
      type: "quote_rejected",
      audience: ["shop"],
      at: now,
      userId: q.userId,
      shopName: q.shopName,
      title: "ลูกค้าปฏิเสธใบเสนอราคา",
      body: `${q.id}${reason ? ` · ${reason}` : ""}`,
    });
  }
  return q;
}

/** Test helper. */
export function __resetQuotes(): void {
  quotesStore.reset([]);
  seq = 0;
  poSeq = 0;
}
