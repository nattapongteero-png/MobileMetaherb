/**
 * Presentation adapters over the single quote table.
 *
 * The buyer's B2BDocs page renders `QuoteRecord`; the shop console renders
 * `MarketDoc`. Rather than rewrite either, project the shared `QuoteRequest`
 * onto both — the same trick used for ShopOrder and the coupon tickets.
 */
import { useStore } from "../store/db";
import {
  daysRemaining,
  effectiveQuoteStatus,
  quoteTotal,
  quotesForShop,
  quotesForUser,
  quotesStore,
  type QuoteRequest,
} from "../store/quotes";
import { currentUserId } from "../store/session";
import type { DocItem, QuoteRecord, QuoteStatus as BuyerQuoteStatus } from "./b2bDocs";

const TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export const fmtDocDate = (epoch: number): string => {
  const d = new Date(epoch);
  return `${d.getDate()} ${TH_MONTH[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const toDocItems = (q: QuoteRequest): DocItem[] =>
  q.items.map((it) => ({
    name: it.name,
    supplier: it.supplier,
    qty: it.qty,
    unit: it.unit,
    price: it.price,
    image: it.image as number | undefined,
  }));

// ── the buyer's B2BDocs page ───────────────────────────────────
/**
 * The buyer's list only knows "received" and "expired". A request the shop has
 * not priced yet is neither — it reads as `pending`, which `QT_STATUS` labels.
 */
export type BuyerQuoteView = Omit<QuoteRecord, "status"> & { status: BuyerQuoteStatus | "pending" };

export function toBuyerQuote(q: QuoteRequest, now = Date.now()): BuyerQuoteView {
  const eff = effectiveQuoteStatus(q, now);
  const status: BuyerQuoteView["status"] =
    eff === "requested" ? "pending" : eff === "expired" || eff === "rejected" ? "expired" : "received";
  return {
    id: q.id,
    date: fmtDocDate(q.createdAt),
    validUntil: q.validUntil ? fmtDocDate(q.validUntil) : "—",
    daysRemaining: daysRemaining(q, now),
    supplier: q.shopName,
    totalAmount: quoteTotal(q),
    status: status as BuyerQuoteView["status"],
    items: toDocItems(q),
    note: q.shopNote,
    company: q.company,
    contact: q.contact,
    certificate: q.certificate,
    neededBy: q.neededBy,
  };
}

/** The buyer's own quote requests, newest first. */
export function useBuyerQuotes(): BuyerQuoteView[] {
  useStore(quotesStore);
  return quotesForUser(currentUserId()).map((q) => toBuyerQuote(q));
}

// ── the shop console ───────────────────────────────────────────
/**
 * The console's `MarketDoc` status. A fresh RFQ is `requested` — the shop owes
 * a price — while `sent` means the shop has priced it and awaits the buyer.
 */
export function shopQuoteStatus(q: QuoteRequest, now = Date.now()): string {
  const eff = effectiveQuoteStatus(q, now);
  return eff === "quoted" ? "sent" : eff; // requested | sent | accepted | rejected | expired
}

/** Shape-compatible with MyShopScreen's MarketDoc, without importing the screen. */
export type ShopQuoteView = {
  id: string;
  status: string;
  date: string;
  company: string;
  taxId?: string;
  contact: string;
  phone: string;
  email?: string;
  address: string;
  paymentTerms: string;
  note?: string;
  items: { name: string; grade?: string; qty: number; unit: string; pricePerUnit: number }[];
  validUntil?: string;
  daysRemaining?: number;
  poNumber?: string;
};

export function toShopQuote(q: QuoteRequest, now = Date.now()): ShopQuoteView {
  return {
    id: q.id,
    status: shopQuoteStatus(q, now),
    date: fmtDocDate(q.createdAt),
    company: q.company.name,
    taxId: q.company.taxId,
    contact: q.contact.name,
    phone: q.contact.phone,
    email: q.contact.email,
    address: q.company.address,
    paymentTerms: "เครดิต 30 วัน",
    note: q.note ?? q.shopNote,
    items: q.items.map((it) => ({
      name: it.name,
      grade: q.certificate,
      qty: it.qty,
      unit: it.unit,
      pricePerUnit: it.price,
    })),
    validUntil: q.validUntil ? fmtDocDate(q.validUntil) : undefined,
    daysRemaining: daysRemaining(q, now),
    poNumber: q.poNumber,
  };
}

/** Live quote requests for this shop, newest first. */
export function useShopQuotes(shopName: string): ShopQuoteView[] {
  useStore(quotesStore);
  return quotesForShop(shopName).map((q) => toShopQuote(q));
}
