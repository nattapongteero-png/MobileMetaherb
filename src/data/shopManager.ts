/**
 * น้องเมต้า — ผู้จัดการร้านค้า AI (owner-facing assistant brain).
 *
 * Separate from the customer shopping assistant (AIAssistantContext). This module
 * aggregates the shop's OWN data (sales, finance, products, orders, complaints,
 * coupons, flash sale, customers, marketing channels, B2B docs, trial products)
 * and turns a free-text owner question into one or more rich reply cards.
 *
 * Pure data layer — no React. The screen renders the returned `MetaReply[]`.
 */

import type { Product, ProductImage } from "../types/Product";
import {
  REPORT_DATA, PERIOD_SCOPE, computeKpi, PREV_DAY, pctDelta, GP_RATE,
  REGULAR_PRODUCTS, MARKET_PRODUCTS, TOP_PRODUCTS,
  CUSTOMERS, CUSTOMER_GROUP_COLOR, CHANNELS, CHANNEL_TYPE_COLOR,
  type SalesProduct, type Period,
} from "./salesReport";
import { SETTLEMENTS, FINANCE_TOTALS, type SettlementStatus } from "./financeTransactions";
import { COUPONS, addCoupon, type CouponStatus } from "./coupons";
import {
  MOCK_PRS, MOCK_POS, MOCK_QUOTES, PR_STATUS, PO_STATUS, QT_STATUS, DOC_TITLE,
  type DocKind,
} from "./b2bDocs";
import { TRIAL_REGISTRATIONS, STAGE_META } from "./trialRegistrations";
import { REAL_FLASH_SALE, REAL_PROMO, REAL_PRODUCTS } from "./realProducts";
import { SHOP_COMPLAINTS, STATUS_LABEL, STATUS_COLOR, type Complaint, type ComplaintStatus } from "./shopComplaints";

const baht = (n: number) => "฿" + Math.round(n).toLocaleString();

/* ── Message model ─────────────────────────────────────────────────────────── */

export type CountChip = { label: string; n: number; color: string };

/** Assistant reply shapes (no id — the screen assigns id + role on push). */
export type AlertIcon = "complaint" | "stock" | "customer" | "doc";
export type BriefAlert = { icon: AlertIcon; label: string; tone: "warn" | "info"; topic: string };

export type MetaReply =
  | { kind: "text"; text: string }
  | { kind: "briefing"; text: string; greeting: string; scope: string; sales: number; orders: number; salesDelta: number; ordersDelta: number; alerts: BriefAlert[]; suggestions: string[] }
  | { kind: "coupon_created"; text: string; code: string; title: string; minSpend: string; expiry: string; type: string; color: string }
  | { kind: "kpi"; text: string; scope: string; sales: number; orders: number; profit: number; margin: number; aov: number; avgSales: number; salesDelta?: number; ordersDelta?: number; series: number[]; seriesLabels: string[] }
  | { kind: "pr_draft"; text: string; items: { name: string; sku: string; stock: number; unit: string; suggest: number }[]; note: string }
  | { kind: "forecast"; text: string; items: { name: string; sku: string; stock: number; unit: string; perDay: number; daysLeft: number | null; urgent: boolean }[] }
  | { kind: "compare"; text: string; scope: string; curLabel: string; prevLabel: string; rows: { label: string; cur: string; prev: string; delta: number }[] }
  | { kind: "goal"; text: string; goal: number | null; current: number; pct: number; scope: string }
  | { kind: "revenue"; text: string; available: number; escrow: number; escrowCount: number; gpFees: number; totalIncome: number; settledCount: number }
  | { kind: "ranking"; text: string; metricLabel: string; items: { name: string; value: string; sub?: string }[] }
  | { kind: "products"; text: string; unit: string; items: { name: string; sku: string; qty: number; sales: number; stock: number; low: boolean }[]; lowCount: number }
  | { kind: "orders"; text: string; settled: number; pending: number; items: { orderNo: string; created: string; gross: number; payout: number; status: SettlementStatus }[] }
  | { kind: "complaints"; text: string; counts: CountChip[]; items: { id: string; customer: string; product: string; status: ComplaintStatus; amount: number }[] }
  | { kind: "coupons"; text: string; active: number; items: { code: string; title: string; minSpend: string; expiry: string; type: string; color: string; status: CouponStatus }[] }
  | { kind: "flashsale"; text: string; items: { id: string; name: string; price: number; originalPrice?: number; discountPercent?: number; image: ProductImage }[] }
  | { kind: "customers"; text: string; segments: { group: string; n: number; total: number; bg: string; fg: string }[]; atRisk: { name: string; daysAgo: number; total: number }[] }
  | { kind: "market"; text: string; items: { name: string; type: string; revenue: number; orders: number; roas: string; bg: string; fg: string }[] }
  | { kind: "b2b"; text: string; title: string; docKind: DocKind; counts: CountChip[]; items: { id: string; date: string; total: number; statusLabel: string; statusColor: string }[] }
  | { kind: "trial"; text: string; counts: CountChip[]; items: { id: string; stageLabel: string; tint: string; reason: string; tracking?: string }[] }
  | { kind: "actions"; text: string; chips: string[] };

export type ShopMsg =
  | { id: string; role: "user"; text: string }
  | ({ id: string; role: "meta" } & MetaReply);

/* ── Builders ──────────────────────────────────────────────────────────────── */

function buildKpi(period: Period = "daily"): MetaReply {
  const rows = REPORT_DATA[period];
  const k = computeKpi(rows);
  const daily = period === "daily";
  return {
    kind: "kpi",
    text: `สรุปภาพรวมยอดขาย${PERIOD_SCOPE[period]}ให้แล้วครับ 📊`,
    scope: PERIOD_SCOPE[period],
    sales: k.sales, orders: k.orders, profit: k.profit, margin: k.margin, aov: k.aov, avgSales: k.avgSales,
    // Trend vs เมื่อวาน only makes sense for the daily view.
    salesDelta: daily ? pctDelta(k.sales, PREV_DAY.sales) : undefined,
    ordersDelta: daily ? pctDelta(k.orders, PREV_DAY.orders) : undefined,
    series: rows.map((r) => r.sales),
    seriesLabels: rows.map((r) => r.label),
  };
}

/** Time-of-day greeting (owner-facing, male persona). */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "สวัสดีตอนเช้าครับ";
  if (h < 16) return "สวัสดีตอนบ่ายครับ";
  if (h < 19) return "สวัสดีตอนเย็นครับ";
  return "สวัสดีตอนค่ำครับ";
}

/** Proactive daily briefing — today's numbers + the things that need attention. */
function buildBriefing(complaints: Complaint[]): MetaReply {
  const k = computeKpi(REPORT_DATA.daily);
  const pending = complaints.filter((c) => c.status === "pending").length;
  const low = REGULAR_PRODUCTS.filter((p) => p.stock <= 15);
  const atRisk = CUSTOMERS.filter((c) => c.daysAgo >= 60).length;
  const prPending = MOCK_PRS.filter((d) => d.status === "pending").length;

  const alerts: BriefAlert[] = [];
  if (pending) alerts.push({ icon: "complaint", label: `เรื่องร้องเรียนรอดำเนินการ ${pending} รายการ`, tone: "warn", topic: "เรื่องร้องเรียน" });
  if (low.length) alerts.push({ icon: "stock", label: `สต๊อกใกล้หมด ${low.length} รายการ`, tone: "warn", topic: "สต๊อกสินค้า" });
  if (atRisk) alerts.push({ icon: "customer", label: `ลูกค้าเสี่ยงหาย ${atRisk} คน`, tone: "info", topic: "วิเคราะห์ลูกค้า" });
  if (prPending) alerts.push({ icon: "doc", label: `ใบขอซื้อ (PR) รออนุมัติ ${prPending} ใบ`, tone: "info", topic: "เอกสารจัดซื้อ" });

  const suggestions: string[] = [];
  if (pending) suggestions.push("เรื่องร้องเรียน");
  if (low.length) suggestions.push("สต๊อกสินค้า");
  suggestions.push("ออเดอร์ล่าสุด", "สินค้าขายดี", "วิเคราะห์ยอดขาย");

  return {
    kind: "briefing",
    text: "",
    greeting: `${greeting()} สรุปร้านวันนี้ให้แล้วครับ 🌿`,
    scope: PERIOD_SCOPE.daily,
    sales: k.sales, orders: k.orders,
    salesDelta: pctDelta(k.sales, PREV_DAY.sales),
    ordersDelta: pctDelta(k.orders, PREV_DAY.orders),
    alerts,
    suggestions: suggestions.slice(0, 4),
  };
}

/* ── Real action: create a coupon ──────────────────────────────────────────── */

export type CouponDraft = { code?: string; discount?: string; minSpend?: number | string; expiry?: string; couponType?: "MH" | "FREE" | "VIP" };

/** True when the LLM gave enough to actually mint a coupon (else we ask). */
export function couponDraftReady(d?: CouponDraft | null): boolean {
  return !!d && !!(d.discount?.trim() || d.code?.trim());
}

/** Actually mint the coupon (mutates COUPONS) and return a confirmation card. */
export function createCouponFromDraft(draft: CouponDraft): MetaReply {
  const type: "MH" | "FREE" | "VIP" =
    draft.couponType === "FREE" || draft.couponType === "VIP" ? draft.couponType : "MH";
  const color = type === "FREE" ? "#00bfa5" : type === "VIP" ? "#9c27b0" : "#319754";
  const code = (draft.code?.trim() || `MH${Math.floor(Math.random() * 9000 + 1000)}`).toUpperCase().replace(/\s+/g, "");
  const minSpend =
    typeof draft.minSpend === "number" ? `ขั้นต่ำ ฿${draft.minSpend.toLocaleString()}`
      : draft.minSpend?.trim() || "ขั้นต่ำ ฿0";
  const c = addCoupon({
    type,
    title: draft.discount?.trim() || (type === "FREE" ? "ส่งฟรี" : "ส่วนลดพิเศษ"),
    code,
    minSpend,
    expiry: draft.expiry?.trim() || "ใช้ได้ 30 วัน",
    bgColor: color,
  });
  return {
    kind: "coupon_created",
    text: "สร้างคูปองให้เรียบร้อยแล้วครับ ใช้งานได้ทันที ✅",
    code: c.code, title: c.title, minSpend: c.minSpend, expiry: c.expiry, type: c.type, color,
  };
}

function buildRevenue(): MetaReply {
  return {
    kind: "revenue",
    text: "สถานะรายได้ในกระเป๋าร้านครับ 💰",
    available: FINANCE_TOTALS.available,
    escrow: FINANCE_TOTALS.escrow,
    escrowCount: FINANCE_TOTALS.escrowCount,
    gpFees: FINANCE_TOTALS.gpFees,
    totalIncome: FINANCE_TOTALS.totalIncome,
    settledCount: SETTLEMENTS.filter((s) => s.status === "settled").length,
  };
}

type RankMode = "sold" | "rating" | "revenue";
function buildRanking(mode: RankMode): MetaReply {
  const top = [...TOP_PRODUCTS];
  if (mode === "rating") top.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  else if (mode === "revenue") top.sort((a, b) => b.revenue - a.revenue);
  else top.sort((a, b) => b.sold - a.sold);
  const items = top.slice(0, 5).map((p) =>
    mode === "rating"
      ? { name: p.name, value: `★ ${p.rating.toFixed(1)}`, sub: `${p.reviews} รีวิว · ${p.category}` }
      : mode === "revenue"
        ? { name: p.name, value: baht(p.revenue), sub: `ขาย ${p.sold} ชิ้น · ${p.category}` }
        : { name: p.name, value: `${p.sold} ชิ้น`, sub: p.category },
  );
  const text =
    mode === "rating" ? "5 อันดับสินค้าคะแนนรีวิวดีที่สุดครับ ⭐"
      : mode === "revenue" ? "5 อันดับสินค้าที่ทำรายได้สูงสุดครับ 💸"
        : "5 อันดับสินค้าขายดีที่สุด (ตามจำนวนขาย) ครับ 🔥";
  const metricLabel = mode === "rating" ? "คะแนนรีวิว" : mode === "revenue" ? "รายได้" : "จำนวนขาย";
  return { kind: "ranking", text, metricLabel, items };
}

function buildProducts(source: SalesProduct[], unit: string, intro: string, low: number): MetaReply {
  const items = [...source].sort((a, b) => b.sales - a.sales).map((p) => ({
    name: p.name, sku: p.sku, qty: p.qty, sales: p.sales, stock: p.stock, low: p.stock <= low,
  }));
  const lowCount = items.filter((p) => p.low).length;
  return { kind: "products", text: intro, unit, items, lowCount };
}

function buildOrders(): MetaReply {
  const settled = SETTLEMENTS.filter((s) => s.status === "settled").length;
  const pending = SETTLEMENTS.filter((s) => s.status === "pending").length;
  const items = SETTLEMENTS.slice(0, 6).map((s) => ({
    orderNo: s.orderNo, created: s.created, gross: s.gross, payout: s.payout, status: s.status,
  }));
  return { kind: "orders", text: "คำสั่งซื้อล่าสุดที่เข้ามาครับ 🧾", settled, pending, items };
}

function buildComplaints(list: Complaint[]): MetaReply {
  const ORDER: ComplaintStatus[] = ["pending", "acknowledged", "refund_full", "refund_partial", "rejected"];
  const counts: CountChip[] = ORDER
    .map((s) => ({ label: STATUS_LABEL[s], n: list.filter((c) => c.status === s).length, color: STATUS_COLOR[s] }))
    .filter((c) => c.n > 0);
  const items = list.slice(0, 4).map((c) => ({
    id: c.id, customer: c.customer, product: c.product, status: c.status, amount: c.refundAmount ?? c.amount,
  }));
  const pending = list.filter((c) => c.status === "pending").length;
  return {
    kind: "complaints",
    text: pending > 0 ? `มีเรื่องร้องเรียนรอดำเนินการ ${pending} รายการครับ ⚠️` : "สรุปเรื่องร้องเรียนในร้านครับ",
    counts, items,
  };
}

function buildCoupons(creating: boolean): MetaReply {
  const active = COUPONS.filter((c) => c.status === "active");
  const items = active.slice(0, 6).map((c) => ({
    code: c.code, title: c.title, minSpend: c.minSpend, expiry: c.expiry, type: c.type, color: c.bgColor, status: c.status,
  }));
  return {
    kind: "coupons",
    text: creating
      ? `ช่วยร่างคูปองใหม่ได้ครับ บอกรายละเอียดมาได้เลย — โค้ด · ส่วนลด · ยอดขั้นต่ำ · วันหมดอายุ (ตอนนี้มีคูปองใช้งานอยู่ ${active.length} ใบ) 🎟️`
      : `คูปองที่ใช้งานได้ในร้าน ${active.length} ใบครับ 🎟️`,
    active: active.length, items,
  };
}

// Discount-list card (shared by Flash Sale + promotions). Uses the product's
// already-resolved `image` (group cover), so it matches every other screen.
function buildDiscountList(source: Product[], intro: (n: number) => string): MetaReply {
  const items = source.slice(0, 6).map((p) => ({
    id: p.id, name: p.name, price: p.price, originalPrice: p.originalPrice, discountPercent: p.discountPercent,
    image: p.image,
  }));
  return { kind: "flashsale", text: intro(items.length), items };
}
const buildFlashSale = (): MetaReply => buildDiscountList(REAL_FLASH_SALE, (n) => `สินค้าใน Flash Sale ตอนนี้ ${n} รายการครับ ⚡`);
const buildPromotions = (): MetaReply => buildDiscountList(REAL_PROMO, (n) => `สินค้าโปรโมชั่น (ลดราคาพิเศษ) ${n} รายการครับ 🏷️`);

const SAFE_STOCK = 60; // restock target for the PR draft

/** Draft a purchase requisition to top up every low-stock regular product. */
function buildPRDraft(): MetaReply {
  const low = [...REGULAR_PRODUCTS].filter((p) => p.stock <= 15).sort((a, b) => a.stock - b.stock);
  const items = low.map((p) => ({
    name: p.name, sku: p.sku, stock: p.stock, unit: p.unit, suggest: Math.max(30, SAFE_STOCK - p.stock),
  }));
  return {
    kind: "pr_draft",
    text: low.length
      ? `ร่างใบขอซื้อ (PR) เติมสต๊อกของใกล้หมด ${low.length} รายการให้แล้วครับ — กดเปิดหน้าเต็มเพื่อยื่นได้เลย 📝`
      : "ตอนนี้สต๊อกยังเพียงพอ ไม่มีสินค้าที่ต้องเติมด่วนครับ ✅",
    items,
    note: `ปริมาณแนะนำ = เติมจนถึงระดับปลอดภัย ~${SAFE_STOCK} ${low[0]?.unit ?? "ชิ้น"}`,
  };
}

/**
 * Real action: put a product on Flash Sale (or change its discount). Matches by
 * name substring against the live catalog, applies the discount, and surfaces it
 * in REAL_FLASH_SALE so the Flash Sale rail/card shows it. Returns the updated
 * Flash Sale card, or a "not found" text when the name doesn't match.
 */
export function setProductFlashSale(query: string, discount?: number): MetaReply {
  const q = query.trim().toLowerCase();
  if (!q) return { kind: "text", text: "บอกชื่อสินค้าที่อยากจัด Flash Sale มาได้เลยครับ เช่น “จัด Croffle ลด 30%”" };
  const prod = REAL_PRODUCTS.find((p) => p.name.toLowerCase().includes(q));
  if (!prod) return { kind: "text", text: `ไม่พบสินค้าชื่อ “${query}” ในร้านครับ ลองพิมพ์ชื่อให้ตรงขึ้นอีกนิดได้ไหมครับ` };
  const pct = discount && discount > 0 && discount < 90 ? Math.round(discount) : prod.discountPercent ?? 20;
  const base = prod.originalPrice ?? prod.price;
  prod.originalPrice = base;
  prod.price = Math.round(base * (1 - pct / 100));
  prod.discountPercent = pct;
  prod.isFlashSale = true;
  // Keep the promo & flash rails mutually exclusive (REAL_PROMO excludes flash items).
  const promoIdx = REAL_PROMO.findIndex((p) => p.id === prod.id);
  if (promoIdx >= 0) REAL_PROMO.splice(promoIdx, 1);
  if (!REAL_FLASH_SALE.some((p) => p.id === prod.id)) REAL_FLASH_SALE.unshift(prod);
  return { ...buildFlashSale(), text: `จัด “${prod.name}” เข้า Flash Sale ลด ${pct}% เรียบร้อยแล้วครับ ⚡` } as MetaReply;
}

/** Real action: remove a product from Flash Sale (returns it to the promo rail if still discounted). */
export function endProductFlashSale(query: string): MetaReply {
  const q = query.trim().toLowerCase();
  if (!q) return { kind: "text", text: "บอกชื่อสินค้าที่อยากถอดออกจาก Flash Sale มาได้เลยครับ" };
  const idx = REAL_FLASH_SALE.findIndex((p) => p.name.toLowerCase().includes(q));
  if (idx < 0) return { kind: "text", text: `ไม่พบสินค้าชื่อ “${query}” ใน Flash Sale ครับ` };
  const prod = REAL_FLASH_SALE[idx];
  prod.isFlashSale = false;
  REAL_FLASH_SALE.splice(idx, 1);
  if (prod.discountPercent && !REAL_PROMO.some((p) => p.id === prod.id)) REAL_PROMO.unshift(prod);
  return { ...buildFlashSale(), text: `ถอด “${prod.name}” ออกจาก Flash Sale แล้วครับ` } as MetaReply;
}

/** Real action: set a product's price (clears stale discount framing if at/above original). */
export function setProductPrice(query: string, price: number): MetaReply {
  const q = query.trim().toLowerCase();
  if (!q || !(price > 0)) return { kind: "text", text: "บอกชื่อสินค้าและราคาใหม่มาได้เลยครับ เช่น “ตั้งราคา Croffle เป็น 90”" };
  const prod = REAL_PRODUCTS.find((p) => p.name.toLowerCase().includes(q));
  if (!prod) return { kind: "text", text: `ไม่พบสินค้าชื่อ “${query}” ในร้านครับ` };
  const old = prod.price;
  prod.price = Math.round(price);
  // New price wipes out any sale framing → also drop it from the flash/promo rails.
  if (prod.originalPrice && prod.price >= prod.originalPrice) {
    prod.originalPrice = undefined;
    prod.discountPercent = undefined;
    prod.isFlashSale = false;
    const fi = REAL_FLASH_SALE.findIndex((p) => p.id === prod.id);
    if (fi >= 0) REAL_FLASH_SALE.splice(fi, 1);
    const pi = REAL_PROMO.findIndex((p) => p.id === prod.id);
    if (pi >= 0) REAL_PROMO.splice(pi, 1);
  }
  return { kind: "text", text: `ปรับราคา “${prod.name}” จาก ${baht(old)} เป็น ${baht(prod.price)} แล้วครับ ✅` };
}

/** Real action: set or top up a regular product's stock (match by SKU or name). */
export function setProductStock(query: string, stock?: number, addStock?: number): MetaReply {
  const q = query.trim().toLowerCase();
  if (!q) return { kind: "text", text: "บอกชื่อหรือ SKU สินค้าที่จะปรับสต๊อกมาได้เลยครับ" };
  const prod = REGULAR_PRODUCTS.find((p) => p.sku.toLowerCase() === q)
    ?? REGULAR_PRODUCTS.find((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  if (!prod) return { kind: "text", text: `ไม่พบสินค้าชื่อ/SKU “${query}” ในคลังครับ` };
  const old = prod.stock;
  if (typeof addStock === "number" && addStock !== 0) prod.stock = Math.max(0, prod.stock + Math.round(addStock));
  else if (typeof stock === "number" && stock >= 0) prod.stock = Math.round(stock);
  else return { kind: "text", text: "บอกจำนวนสต๊อกใหม่ หรือจำนวนที่จะเติมมาด้วยครับ เช่น “เติมสต๊อก HRB-001 อีก 50”" };
  return { kind: "text", text: `ปรับสต๊อก “${prod.name}” (${prod.sku}) จาก ${old} เป็น ${prod.stock} ${prod.unit} แล้วครับ ✅` };
}

/** Real action: approve / reject a purchase requisition (PR). */
export function resolvePR(id: string | undefined, decision: "approve" | "reject", reason?: string): MetaReply {
  const target = (id ? MOCK_PRS.find((d) => d.id === id) : undefined) ?? MOCK_PRS.find((d) => d.status === "pending");
  if (!target) return { kind: "text", text: "ตอนนี้ไม่มีใบขอซื้อ (PR) ที่รออนุมัติครับ ✅" };
  if (decision === "approve") { target.status = "approved"; target.approver = "ผู้จัดการ (น้องเมต้า)"; }
  else { target.status = "rejected"; target.rejectReason = reason?.trim() || "ไม่ระบุเหตุผล"; }
  const card = buildB2B("pr");
  return { ...card, text: `${decision === "approve" ? "อนุมัติ" : "ปฏิเสธ"}ใบขอซื้อ ${target.id} เรียบร้อยแล้วครับ ${decision === "approve" ? "✅" : "❌"}` } as MetaReply;
}

/* ── Forecast / compare / goal ─────────────────────────────────────────────── */

/** Days-of-cover forecast per regular product (qty treated as ~monthly sell-through). */
function buildForecast(): MetaReply {
  const DAYS = 30;
  const all = [...REGULAR_PRODUCTS].map((p) => {
    const perDay = p.qty / DAYS;
    const daysLeft = perDay > 0 ? Math.round(p.stock / perDay) : null;
    return { name: p.name, sku: p.sku, stock: p.stock, unit: p.unit, perDay: Math.round(perDay * 10) / 10, daysLeft, urgent: daysLeft != null && daysLeft <= 14 };
  });
  const urgent = all.filter((i) => i.urgent).length; // count over ALL, not just the shown top-6
  const items = all.sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999)).slice(0, 6);
  return {
    kind: "forecast",
    text: urgent ? `มีสินค้าที่คาดว่าจะหมดภายใน 14 วัน ${urgent} รายการครับ ควรเติมเร็ว ๆ นี้ ⏳` : "คาดการณ์ของคงเหลือให้แล้วครับ ⏳",
    items,
  };
}

/** Period-over-period comparison (latest vs previous point of the series). */
function buildCompare(period: Period = "monthly"): MetaReply {
  const rows0 = REPORT_DATA[period];
  const cur = rows0[rows0.length - 1];
  const prev = rows0[rows0.length - 2] ?? cur;
  const rows = [
    { label: "ยอดขาย", cur: baht(cur.sales), prev: baht(prev.sales), delta: pctDelta(cur.sales, prev.sales) },
    { label: "ออเดอร์", cur: `${cur.orders}`, prev: `${prev.orders}`, delta: pctDelta(cur.orders, prev.orders) },
    { label: "ลูกค้าใหม่", cur: `${cur.newCust}`, prev: `${prev.newCust}`, delta: pctDelta(cur.newCust, prev.newCust) },
  ];
  return { kind: "compare", text: `เทียบ ${cur.label} กับ ${prev.label} ให้แล้วครับ 📊`, scope: PERIOD_SCOPE[period], curLabel: cur.label, prevLabel: prev.label, rows };
}

let salesGoal: number | null = null;
/** Real action: set the monthly sales target, then render progress. */
export function setSalesGoal(amount: number): MetaReply {
  salesGoal = amount > 0 ? Math.round(amount) : null;
  return buildGoal();
}
function buildGoal(): MetaReply {
  const m = REPORT_DATA.monthly;
  const current = m[m.length - 1].sales; // this month so far
  const pct = salesGoal ? Math.min(999, Math.round((current / salesGoal) * 100)) : 0;
  return {
    kind: "goal",
    text: salesGoal
      ? (current >= salesGoal ? "ทะลุเป้ายอดขายเดือนนี้แล้วครับ! 🎉" : "ความคืบหน้าสู่เป้ายอดขายเดือนนี้ครับ 🎯")
      : "ยังไม่ได้ตั้งเป้ายอดขายครับ บอกตัวเลขมาได้เลย เช่น “ตั้งเป้าเดือนนี้ 30000”",
    goal: salesGoal, current, pct, scope: "เดือนนี้",
  };
}

function buildCustomers(): MetaReply {
  const GROUPS = ["VIP", "ประจำ", "ใหม่", "เสี่ยงหาย", "หายไป"];
  const segments = GROUPS.map((g) => {
    const inG = CUSTOMERS.filter((c) => c.group === g);
    const color = CUSTOMER_GROUP_COLOR[g] ?? { bg: "#f3f4f6", fg: "#525252" };
    return { group: g, n: inG.length, total: inG.reduce((s, c) => s + c.total, 0), bg: color.bg, fg: color.fg };
  }).filter((s) => s.n > 0);
  const atRisk = CUSTOMERS.filter((c) => c.daysAgo >= 60).sort((a, b) => b.daysAgo - a.daysAgo)
    .map((c) => ({ name: c.name, daysAgo: c.daysAgo, total: c.total }));
  return {
    kind: "customers",
    text: `วิเคราะห์กลุ่มลูกค้าให้แล้วครับ${atRisk.length ? ` — มีลูกค้าเสี่ยงหาย ${atRisk.length} คนน่าดูแลครับ` : ""} 👥`,
    segments, atRisk,
  };
}

function buildMarket(): MetaReply {
  const items = [...CHANNELS].sort((a, b) => b.revenue - a.revenue).slice(0, 6).map((c) => {
    const t = CHANNEL_TYPE_COLOR[c.type] ?? { bg: "#f3f4f6", fg: "#525252" };
    return {
      name: c.name, type: c.type, revenue: c.revenue, orders: c.orders,
      roas: c.cost > 0 ? `ROAS ${(c.revenue / c.cost).toFixed(1)}x` : "Organic",
      bg: t.bg, fg: t.fg,
    };
  });
  return { kind: "market", text: "ช่องทางการตลาดเรียงตามรายได้ครับ 📈", items };
}

function buildB2B(kind: DocKind): MetaReply {
  if (kind === "po") {
    const counts: CountChip[] = (["pending", "preparing", "shipped", "delivered", "completed", "cancelled"] as const)
      .map((s) => ({ label: PO_STATUS[s].label, n: MOCK_POS.filter((d) => d.status === s).length, color: PO_STATUS[s].color }))
      .filter((c) => c.n > 0);
    const items = MOCK_POS.slice(0, 4).map((d) => ({ id: d.id, date: d.date, total: d.totalAmount, statusLabel: PO_STATUS[d.status].label, statusColor: PO_STATUS[d.status].color }));
    return { kind: "b2b", text: "สรุป" + DOC_TITLE.po + "ครับ 📦", title: DOC_TITLE.po, docKind: "po", counts, items };
  }
  if (kind === "rfq") {
    const counts: CountChip[] = (["received", "expired"] as const)
      .map((s) => ({ label: QT_STATUS[s].label, n: MOCK_QUOTES.filter((d) => d.status === s).length, color: QT_STATUS[s].color }))
      .filter((c) => c.n > 0);
    const items = MOCK_QUOTES.slice(0, 4).map((d) => ({ id: d.id, date: d.date, total: d.totalAmount, statusLabel: QT_STATUS[d.status].label, statusColor: QT_STATUS[d.status].color }));
    return { kind: "b2b", text: "สรุป" + DOC_TITLE.rfq + "ครับ 📄", title: DOC_TITLE.rfq, docKind: "rfq", counts, items };
  }
  const counts: CountChip[] = (["pending", "approved", "converted", "rejected", "expired"] as const)
    .map((s) => ({ label: PR_STATUS[s].label, n: MOCK_PRS.filter((d) => d.status === s).length, color: PR_STATUS[s].color }))
    .filter((c) => c.n > 0);
  const items = MOCK_PRS.slice(0, 4).map((d) => ({ id: d.id, date: d.date, total: d.totalAmount, statusLabel: PR_STATUS[d.status].label, statusColor: PR_STATUS[d.status].color }));
  return { kind: "b2b", text: "สรุป" + DOC_TITLE.pr + "ครับ 📝", title: DOC_TITLE.pr, docKind: "pr", counts, items };
}

function buildTrial(): MetaReply {
  const STAGES = ["pending_approval", "shipping", "testing", "completed", "rejected"] as const;
  const counts: CountChip[] = STAGES
    .map((s) => ({ label: STAGE_META[s].label, n: TRIAL_REGISTRATIONS.filter((r) => r.stage === s).length, color: STAGE_META[s].tint }))
    .filter((c) => c.n > 0);
  const items = TRIAL_REGISTRATIONS.slice(0, 4).map((r) => ({
    id: r.id, stageLabel: STAGE_META[r.stage].label, tint: STAGE_META[r.stage].tint,
    reason: r.reason ?? "-", tracking: r.trackingNumber,
  }));
  return { kind: "trial", text: `คำขอทดลองสินค้าทั้งหมด ${TRIAL_REGISTRATIONS.length} รายการครับ 🧪`, counts, items };
}

/* ── Quick actions + greeting ──────────────────────────────────────────────── */

export const MANAGER_GREETING =
  "สวัสดีครับ ผมน้องเมต้า ผู้จัดการร้านค้า AI 🌿\nถามผมได้เลยเรื่องร้านของคุณ — ยอดขาย รายได้ คำสั่งซื้อ สินค้า คูปอง ลูกค้า การตลาด และอื่น ๆ";

/** Quick-action chips (the label doubles as the prompt fed to the router). */
export const QUICK_ACTIONS: string[] = [
  "สรุปร้านวันนี้",
  "ยอดขายวันนี้",
  "ยอดขายเดือนนี้",
  "ของจะหมดเมื่อไหร่",
  "เทียบเดือนนี้กับเดือนก่อน",
  "เป้ายอดขาย",
  "เติมสต๊อกของใกล้หมด",
  "รายได้ในกระเป๋า",
  "สินค้าขายดี",
  "สินค้าคะแนนดี",
  "สินค้าทำเงินสูง",
  "สต๊อกสินค้า",
  "ออเดอร์ล่าสุด",
  "เรื่องร้องเรียน",
  "คูปองในร้าน",
  "Flash Sale",
  "โปรโมชั่น",
  "วิเคราะห์ลูกค้า",
  "ช่องทางการตลาด",
  "เอกสารจัดซื้อ",
  "สินค้าทดลอง",
  "วัตถุดิบ Herbal Market",
];

/* ── Router ────────────────────────────────────────────────────────────────── */

const has = (s: string, re: RegExp) => re.test(s);

/** Turn an owner question into one or more reply cards using real shop data. */
export function respondAsManager(input: string, complaints: Complaint[] = SHOP_COMPLAINTS): MetaReply[] {
  const t = input.toLowerCase().trim();

  if (has(t, /สรุปร้าน|บรีฟ|briefing|ภาพรวมร้าน|เปิดร้าน|วันนี้เป็นไง|วันนี้เป็นยังไง/)) return [buildBriefing(complaints)];

  // Forecast / compare / goal — must beat the generic kpi/stock catch-alls below.
  if (has(t, /จะหมดเมื่อ|ของจะหมด|พยากรณ์|คาดการณ์|กี่วันหมด|forecast/)) return [buildForecast()];
  if (has(t, /เทียบ|เปรียบเทียบ|เทียบกับ|\bvs\b/)) {
    const cp: Period = has(t, /สัปดาห์|อาทิตย์|weekly/) ? "weekly"
      : has(t, /ปีนี้|ปีก่อน|รายปี|หลายปี|yearly/) ? "yearly" : "monthly";
    return [buildCompare(cp)];
  }
  if (has(t, /ตั้งเป้า|เป้ายอด|เป้าขาย|เป้า|target|goal/)) return [buildGoal()];

  if (has(t, /flash|แฟลช|แฟรช/)) return [buildFlashSale()];
  if (has(t, /โปรโมชั่น|โปรโมชัน|โปรโมชน|promotion|promo|ลดราคา/)) return [buildPromotions()];
  if (has(t, /คูปอง|coupon|โค้ด|code/)) return [buildCoupons(has(t, /สร้าง|เพิ่ม|ออก|create|ใหม่/))];
  if (has(t, /ร้องเรียน|เคลม|claim|ปัญหา|คืนเงิน|refund|complaint/)) return [buildComplaints(complaints)];
  if (has(t, /ทดลอง|trial|ทดสอบ|ขอลอง/)) return [buildTrial()];

  // B2B documents
  if (has(t, /เสนอราคา|rfq|quotation|ใบเสนอ/)) return [buildB2B("rfq")];
  if (has(t, /\bpo\b|ใบสั่งซื้อ|purchase order/)) return [buildB2B("po")];
  if (has(t, /\bpr\b|ใบขอ|ขอสั่งซื้อ|requisition/)) return [buildB2B("pr")];
  if (has(t, /จัดซื้อ|เอกสาร|b2b/)) return [{ kind: "actions", text: "มีเอกสารจัดซื้อ 3 แบบครับ เลือกดูได้เลย 👇", chips: ["ใบสั่งซื้อ PO", "ใบขอซื้อ PR", "ใบเสนอราคา RFQ"] }];

  // Herbal Market raw materials
  if (has(t, /herbal|วัตถุดิบ|ตลาดสมุนไพร|เฮอร์บัล|ตลาดวัตถุดิบ/))
    return [buildProducts(MARKET_PRODUCTS, "กก.", "สินค้าวัตถุดิบใน Herbal Market ครับ 🌾", 500)];

  if (has(t, /คำสั่งซื้อ|ออเดอร์|order|รายการสั่งซื้อ/)) return [buildOrders()];
  if (has(t, /ลูกค้า|customer|กลุ่ม|segment|สมาชิก/)) return [buildCustomers()];
  if (has(t, /การตลาด|market|ช่องทาง|channel|โฆษณา|roas|ads|แคมเปญ/)) return [buildMarket()];

  // Product rankings (check before generic "สินค้า"/"ยอดขาย")
  if (has(t, /ขายดี|ขายเยอะ|best.?sell|ฮิต/)) return [buildRanking("sold")];
  if (has(t, /คะแนน|รีวิว|rating|เรตติ้ง|ดาว|review/)) return [buildRanking("rating")];
  if (has(t, /ทำเงิน|ทำรายได้|รายได้สูง|มูลค่าสูง|สินค้า.*รายได้|top.?revenue/)) return [buildRanking("revenue")];

  if (has(t, /เติมสต๊อก|เติมของ|เติมสินค้า|ร่าง.?pr|ขอซื้อเพิ่ม|สั่งของเพิ่ม|restock/)) return [buildPRDraft()];

  if (has(t, /สต๊อก|สต็อก|stock|คลัง|inventory|สินค้าในร้าน|สินค้าทั้งหมด|รายการสินค้า/))
    return [buildProducts(REGULAR_PRODUCTS, "ชิ้น", "สินค้าในร้านของคุณครับ 📦", 15)];

  if (has(t, /รายได้|กระเป๋า|เงิน|ถอน|escrow|payout|พร้อมถอน|wallet/)) return [buildRevenue()];

  if (has(t, /ยอดขาย|สรุป|ภาพรวม|แดชบอร์ด|dashboard|สถิติ|kpi|รายงาน|วิเคราะห์/)) {
    // Period labels are shifted (PERIOD_SCOPE): weekly="เดือนนี้", monthly="ปีนี้",
    // yearly="5 ปีล่าสุด". Map keywords to the period whose SCOPE matches the word.
    const period: Period =
      has(t, /ปีนี้|รายเดือน|monthly/) ? "monthly"
        : has(t, /หลายปี|รายปี|ทั้งปี|5 ?ปี|yearly/) ? "yearly"
          : has(t, /เดือนนี้|รายสัปดาห์|สัปดาห์|อาทิตย์|weekly/) ? "weekly"
            : "daily";
    return [buildKpi(period)];
  }

  if (has(t, /สินค้า|product/)) return [buildProducts(REGULAR_PRODUCTS, "ชิ้น", "สินค้าในร้านของคุณครับ 📦", 15)];

  // Greetings
  if (has(t, /สวัสดี|hello|hi|หวัดดี|ดีจ้า/))
    return [{ kind: "text", text: "สวัสดีครับ ผมน้องเมต้า ผู้จัดการร้านของคุณ — อยากให้ช่วยดูอะไรดีครับ?" },
            { kind: "actions", text: "ลองเลือกดูได้เลยครับ 👇", chips: ["ยอดขายวันนี้", "ออเดอร์ล่าสุด", "สินค้าขายดี", "เรื่องร้องเรียน"] }];

  // Fallback
  return [
    { kind: "text", text: "ผมช่วยดูข้อมูลร้านได้หลายอย่างเลยครับ ลองถามตามหัวข้อด้านล่างได้เลย 🌿" },
    { kind: "actions", text: "เลือกหัวข้อที่อยากดูครับ 👇", chips: ["ยอดขายวันนี้", "รายได้ในกระเป๋า", "สินค้าขายดี", "วิเคราะห์ลูกค้า", "คูปองในร้าน"] },
  ];
}

/* ── LLM action mapping + data snapshot ────────────────────────────────────── */

/** The data views the LLM brain can choose to render. */
export type ManagerAction =
  | "briefing" | "kpi" | "revenue" | "orders" | "products" | "herbal"
  | "rank_sold" | "rank_rating" | "rank_revenue"
  | "complaints" | "ack_complaints" | "resolve_complaint" | "coupons" | "create_coupon"
  | "flashsale" | "set_flashsale" | "end_flashsale" | "promotions" | "draft_pr"
  | "set_price" | "set_stock" | "resolve_pr"
  | "forecast" | "compare" | "goal" | "set_goal"
  | "customers" | "market" | "po" | "pr" | "rfq" | "trial" | "none";

/**
 * Build the data card(s) for an LLM-chosen action ([] = text-only reply).
 * Mutating actions (create_coupon with a draft, ack_complaints, resolve_complaint,
 * set_flashsale) are handled by the screen — here they fall through to their
 * read-only / helper form. `opts.period` selects the KPI time range.
 */
export function runManagerAction(action: ManagerAction, complaints: Complaint[] = SHOP_COMPLAINTS, opts?: { period?: Period }): MetaReply[] {
  switch (action) {
    case "briefing": return [buildBriefing(complaints)];
    case "ack_complaints": return [buildComplaints(complaints)];
    case "resolve_complaint": return [buildComplaints(complaints)];
    case "draft_pr": return [buildPRDraft()];
    case "set_flashsale": return [buildFlashSale()];
    case "end_flashsale": return [buildFlashSale()];
    case "resolve_pr": return [buildB2B("pr")];
    case "set_price": return [];
    case "set_stock": return [];
    case "forecast": return [buildForecast()];
    case "compare": return [buildCompare(opts?.period)];
    case "goal": return [buildGoal()];
    case "set_goal": return [buildGoal()];
    case "kpi": return [buildKpi(opts?.period)];
    case "revenue": return [buildRevenue()];
    case "orders": return [buildOrders()];
    case "products": return [buildProducts(REGULAR_PRODUCTS, "ชิ้น", "สินค้าในร้านของคุณครับ 📦", 15)];
    case "herbal": return [buildProducts(MARKET_PRODUCTS, "กก.", "สินค้าวัตถุดิบใน Herbal Market ครับ 🌾", 500)];
    case "rank_sold": return [buildRanking("sold")];
    case "rank_rating": return [buildRanking("rating")];
    case "rank_revenue": return [buildRanking("revenue")];
    case "complaints": return [buildComplaints(complaints)];
    case "coupons": return [buildCoupons(false)];
    case "create_coupon": return [buildCoupons(true)];
    case "flashsale": return [buildFlashSale()];
    case "promotions": return [buildPromotions()];
    case "customers": return [buildCustomers()];
    case "market": return [buildMarket()];
    case "po": return [buildB2B("po")];
    case "pr": return [buildB2B("pr")];
    case "rfq": return [buildB2B("rfq")];
    case "trial": return [buildTrial()];
    default: return [];
  }
}

const signed = (n: number) => (n >= 0 ? `+${n}%` : `${n}%`);

/** Compact real-data snapshot fed to the LLM so its replies cite true numbers
 *  AND can reason about trends (vs เมื่อวาน / เดือนก่อน) + give recommendations. */
export function shopSnapshot(complaints: Complaint[] = SHOP_COMPLAINTS): string {
  const k = computeKpi(REPORT_DATA.daily);
  const sold = [...TOP_PRODUCTS].sort((a, b) => b.sold - a.sold)[0];
  const rated = [...TOP_PRODUCTS].sort((a, b) => b.rating - a.rating)[0];
  const low = REGULAR_PRODUCTS.filter((p) => p.stock <= 15).map((p) => `${p.name} (เหลือ ${p.stock})`);
  const pending = complaints.filter((c) => c.status === "pending").length;
  const activeCoupons = COUPONS.filter((c) => c.status === "active").length;
  const atRisk = CUSTOMERS.filter((c) => c.daysAgo >= 60);
  const prPending = MOCK_PRS.filter((d) => d.status === "pending").length;

  // Trend vs yesterday + month-over-month (real series).
  const salesD = pctDelta(k.sales, PREV_DAY.sales);
  const ordersD = pctDelta(k.orders, PREV_DAY.orders);
  const m = REPORT_DATA.monthly;
  const curM = m[m.length - 1], prevM = m[m.length - 2];
  const moM = pctDelta(curM.sales, prevM.sales);

  // Marketing efficiency + slowest mover (recommendation hooks).
  const paid = CHANNELS.filter((c) => c.cost > 0).map((c) => ({ name: c.name, roas: c.revenue / c.cost }));
  const bestRoas = [...paid].sort((a, b) => b.roas - a.roas)[0];
  const worstRoas = [...paid].sort((a, b) => a.roas - b.roas)[0];
  const slow = [...REGULAR_PRODUCTS].sort((a, b) => a.sales - b.sales)[0];
  const marginOf = (p: SalesProduct) => (p.sales > 0 ? ((p.sales * (1 - GP_RATE) - p.cost) / p.sales) * 100 : 0);
  const thinMargin = [...REGULAR_PRODUCTS].sort((a, b) => marginOf(a) - marginOf(b))[0];

  return [
    `ยอดขายวันนี้ ${baht(k.sales)} (${signed(salesD)} เทียบเมื่อวาน) · ${k.orders} ออเดอร์ (${signed(ordersD)}) · กำไร ${baht(k.profit)} (มาร์จิ้น ${k.margin.toFixed(0)}%) · เฉลี่ย/ออเดอร์ ${baht(k.aov)}`,
    `เทรนด์เดือน: ${curM.label} ${baht(curM.sales)} เทียบ ${prevM.label} ${baht(prevM.sales)} (${signed(moM)})`,
    `เงินในกระเป๋า: พร้อมถอน ${baht(FINANCE_TOTALS.available)} · รอปล่อย(escrow) ${baht(FINANCE_TOTALS.escrow)} จาก ${FINANCE_TOTALS.escrowCount} ออเดอร์ · รายได้สะสม ${baht(FINANCE_TOTALS.totalIncome)}`,
    `สินค้าขายดีสุด: ${sold?.name} (${sold?.sold} ชิ้น) · คะแนนรีวิวดีสุด: ${rated?.name} (⭐${rated?.rating}) · ขายช้าสุด: ${slow?.name} (${slow?.qty} ชิ้น) · มาร์จิ้นบางสุด: ${thinMargin?.name} (${marginOf(thinMargin).toFixed(0)}%)`,
    `การตลาด: คุ้มสุด ${bestRoas?.name} ROAS ${bestRoas?.roas.toFixed(1)}x · คุ้มน้อยสุด ${worstRoas?.name} ROAS ${worstRoas?.roas.toFixed(1)}x`,
    low.length ? `สต๊อกใกล้หมด: ${low.join(", ")}` : "สต๊อกสินค้าปกติ ไม่มีของใกล้หมด",
    `เรื่องร้องเรียนรอดำเนินการ ${pending} รายการ · คูปองใช้งานได้ ${activeCoupons} ใบ · Flash Sale ${REAL_FLASH_SALE.length} รายการ · โปรโมชั่น ${REAL_PROMO.length} รายการ · ลูกค้าเสี่ยงหาย ${atRisk.length} คน${atRisk.length ? ` (${atRisk.map((c) => c.name).slice(0, 3).join(", ")})` : ""} · PR รออนุมัติ ${prPending} ใบ`,
  ].join("\n");
}
