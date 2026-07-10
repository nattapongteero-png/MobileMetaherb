/* =============================================================
 *  B2B documents — RFQ (ใบเสนอราคา) / PR (ใบขอสั่งซื้อ) / PO (ใบสั่งซื้อ).
 *  Ported from the METAHERB web app (../Metaherb/src/app/pages/OrdersPage.tsx)
 *  — factory/customer side: quotes received, PRs raised, POs issued.
 *  ============================================================= */

export type DocKind = "rfq" | "pr" | "po";

export type DocItem = {
  name: string;
  supplier: string;
  qty: number;
  unit: string;
  price: number;
  image?: number | string; // local require() or remote URL
  erpCode?: string;        // Item Code ERP (optional, set per PR line)
  note?: string;           // line note (e.g. "ตัวเลือก 1")
};

// Herbal Market raw materials (real photos, same products shown in the app's
// Herbal Market) used as the line items across every B2B document.
const IMG = {
  ginger: require("../../assets/products/herbal/herbal-ginger.jpg"),
  cinnamon: require("../../assets/products/herbal/herbal-cinnamon.jpg"),
  butterflypea: require("../../assets/products/herbal/herbal-butterflypea.jpg"),
  lemon: require("../../assets/products/herbal/herbal-lemon.jpg"),
  blackpepper: require("../../assets/products/herbal/herbal-blackpepper.jpg"),
  shiitake: require("../../assets/products/herbal/herbal-shiitake.jpg"),
  goji: require("../../assets/products/herbal/herbal-goji.jpg"),
  jujube: require("../../assets/products/herbal/herbal-jujube.jpg"),
  fingerroot: require("../../assets/products/herbal/herbal-fingerroot.jpg"),
};
const SUP = "METAHERB Store";
// Shops a PR can combine in one document (no need to split per shop).
const SHOP_GREEN = "กรีนลีฟ ออร์แกนิก";
const SHOP_BAAN = "บ้านสมุนไพรไทย";
/** Line-item presets keyed by herb. `sup` defaults to METAHERB Store (RFQ/PO are
 *  single-supplier); pass a shop to mix multiple suppliers in one PR. */
const L = {
  ginger: (qty: number, sup: string = SUP): DocItem => ({ name: "ขิงแก่แห้ง (ฝานหนา)", supplier: sup, qty, unit: "กก.", price: 290, image: IMG.ginger }),
  cinnamon: (qty: number, sup: string = SUP): DocItem => ({ name: "อบเชยซีลอนแท่ง (Ceylon Cinnamon)", supplier: sup, qty, unit: "กก.", price: 880, image: IMG.cinnamon }),
  butterflypea: (qty: number, sup: string = SUP): DocItem => ({ name: "ดอกอัญชันแห้ง (เกรดส่งออก)", supplier: sup, qty, unit: "กก.", price: 580, image: IMG.butterflypea }),
  lemon: (qty: number, sup: string = SUP): DocItem => ({ name: "มะนาวอบแห้ง (ฝาน)", supplier: sup, qty, unit: "กก.", price: 340, image: IMG.lemon }),
  blackpepper: (qty: number, sup: string = SUP): DocItem => ({ name: "พริกไทยดำเม็ด (Black Pepper)", supplier: sup, qty, unit: "กก.", price: 420, image: IMG.blackpepper }),
  shiitake: (qty: number, sup: string = SUP): DocItem => ({ name: "เห็ดหอมแห้ง (Shiitake)", supplier: sup, qty, unit: "กก.", price: 750, image: IMG.shiitake }),
  goji: (qty: number, sup: string = SUP): DocItem => ({ name: "เก๋ากี้อบแห้ง (Goji Berry)", supplier: sup, qty, unit: "กก.", price: 680, image: IMG.goji }),
  jujube: (qty: number, sup: string = SUP): DocItem => ({ name: "พุทราจีนแห้ง (Red Jujube)", supplier: sup, qty, unit: "กก.", price: 520, image: IMG.jujube }),
  fingerroot: (qty: number, sup: string = SUP): DocItem => ({ name: "กระชายแห้ง (ฝาน)", supplier: sup, qty, unit: "กก.", price: 420, image: IMG.fingerroot }),
};
const sumItems = (items: DocItem[]) => items.reduce((s, it) => s + it.qty * it.price, 0);
function withTotals<T extends { items: DocItem[]; totalAmount: number }>(arr: T[]): T[] {
  return arr.map((d) => ({ ...d, totalAmount: sumItems(d.items) }));
}

// ── PR (Purchase Requisition) ───────────────────────────────────────────────
export type PRStatus = "pending" | "approved" | "converted" | "rejected" | "expired";
export type PRPriority = "Low" | "Normal" | "High" | "Urgent";
export type PRRecord = {
  id: string;
  date: string;
  totalAmount: number;
  priority: PRPriority;
  status: PRStatus;
  approver?: string;
  validityDays: number;
  poNumber?: string;
  rejectReason?: string;
  // Captured on the PR request form.
  requiredDate?: string;
  description?: string;
  justification?: string;
  items: DocItem[];
};

const RAW_PRS: PRRecord[] = [
  { id: "PR-2569-3012", date: "11 มี.ค. 2569 · 10:30 น.", totalAmount: 0, priority: "Normal", status: "converted", validityDays: 15, approver: "คุณวิชัย ใจกล้า", poNumber: "PO-2569-3012",
    requiredDate: "26 มี.ค. 2569", description: "ใช้สำหรับสายการผลิตชาขิงล็อตเดือนหน้า", justification: "สต๊อกขิงคงเหลือต่ำกว่าจุดสั่งซื้อ ต้องเติมเพื่อไม่ให้ไลน์ผลิตสะดุด",
    items: [{ ...L.ginger(200, SHOP_GREEN), erpCode: "ERP-RM-0231", note: "เกรดพรีเมียม" }] },
  { id: "PR-2569-3019", date: "9 มี.ค. 2569 · 14:18 น.", totalAmount: 0, priority: "High", status: "converted", validityDays: 10, approver: "คุณสมศักดิ์ ดวงดี", poNumber: "PO-2569-3019",
    requiredDate: "22 มี.ค. 2569", description: "วัตถุดิบรวมสำหรับสูตรเครื่องดื่มสมุนไพรใหม่ — รวมหลายร้านในใบเดียว", justification: "เตรียมผลิตตัวอย่างเสนอลูกค้ารายใหญ่ภายในเดือนนี้",
    items: [{ ...L.ginger(500, SHOP_GREEN), erpCode: "ERP-RM-0231" }, L.lemon(150), { ...L.fingerroot(80, SHOP_GREEN), erpCode: "ERP-RM-0455", note: "ตัวเลือก 1" }] },
  { id: "PR-2569-3023", date: "8 มี.ค. 2569 · 09:42 น.", totalAmount: 0, priority: "Normal", status: "pending", validityDays: 15,
    requiredDate: "25 มี.ค. 2569", description: "เติมสต๊อกมะนาวอบแห้งสำหรับไลน์เบเกอรี่", justification: "ยอดสั่งซื้อจากหน้าร้านเพิ่มขึ้น ต้องสำรองวัตถุดิบล่วงหน้า",
    items: [L.lemon(300)] },
  { id: "PR-2569-3028", date: "27 ก.พ. 2569 · 13:08 น.", totalAmount: 0, priority: "Urgent", status: "converted", validityDays: 7, approver: "คุณวิชัย ใจกล้า", poNumber: "PO-2569-3028",
    requiredDate: "12 มี.ค. 2569", description: "วัตถุดิบเร่งด่วนสำหรับออเดอร์ส่งออก", justification: "ลูกค้าต่างประเทศยืนยันคำสั่งซื้อแล้ว ต้องจัดหาให้ทันกำหนดเรือ",
    items: [{ ...L.shiitake(50, SHOP_GREEN), erpCode: "ERP-RM-0780" }, L.jujube(80, SHOP_BAAN)] },
  { id: "PR-2569-3035", date: "21 ก.พ. 2569 · 11:20 น.", totalAmount: 0, priority: "High", status: "converted", validityDays: 30, approver: "คุณวิชัย ใจกล้า", poNumber: "PO-2569-3035",
    requiredDate: "20 มี.ค. 2569", description: "วัตถุดิบสำหรับผลิตภัณฑ์เสริมอาหารล็อตใหญ่", justification: "แผนการผลิตไตรมาสหน้าต้องใช้ปริมาณมาก สั่งล่วงหน้าเพื่อราคาดี",
    items: [{ ...L.goji(200, SHOP_BAAN), erpCode: "ERP-RM-0912", note: "นำเข้า" }, L.jujube(100, SHOP_BAAN), L.butterflypea(40, SHOP_GREEN)] },
  { id: "PR-2569-3048", date: "18 ก.พ. 2569 · 13:55 น.", totalAmount: 0, priority: "Low", status: "rejected", validityDays: 30, rejectReason: "ยอดเกินงบประมาณไตรมาส",
    requiredDate: "10 มี.ค. 2569", description: "ทดลองวัตถุดิบดอกอัญชันสำหรับสูตรใหม่", justification: "ขอทดลองปริมาณน้อยก่อนเพื่อประเมินคุณภาพ",
    items: [L.butterflypea(16)] },
  { id: "PR-2569-3009", date: "1 มี.ค. 2569 · 09:10 น.", totalAmount: 0, priority: "Normal", status: "expired", validityDays: 7,
    requiredDate: "12 มี.ค. 2569", description: "เติมสต๊อกอบเชยซีลอนสำหรับไลน์เครื่องดื่ม", justification: "รออนุมัติเกินกำหนดยื่น เอกสารหมดอายุก่อนได้รับการพิจารณา",
    items: [L.cinnamon(60)] },
];
export const MOCK_PRS: PRRecord[] = withTotals(RAW_PRS);

export const PR_STATUS: Record<PRStatus, { label: string; color: string }> = {
  pending: { label: "รออนุมัติ", color: "#f59e0b" },
  approved: { label: "อนุมัติแล้ว", color: "#10b981" },
  converted: { label: "แปลงเป็น PO", color: "#a855f7" },
  rejected: { label: "ปฏิเสธ", color: "#9ca3af" },
  expired: { label: "หมดอายุ", color: "#9ca3af" },
};

export const PRIORITY_STYLE: Record<PRPriority, { bg: string; color: string }> = {
  Low: { bg: "#f3f4f6", color: "#6b7280" },
  Normal: { bg: "rgba(59,130,246,0.10)", color: "#2563eb" },
  High: { bg: "rgba(245,158,11,0.10)", color: "#d97706" },
  Urgent: { bg: "rgba(239,68,68,0.10)", color: "#dc2626" },
};

// ── RFQ (Quotation received) ────────────────────────────────────────────────
/** `pending` = the buyer sent an RFQ and the shop has not priced it yet. */
export type QuoteStatus = "pending" | "received" | "expired";
export type QuoteRecord = {
  id: string;
  date: string;
  validUntil: string;
  daysRemaining: number;
  supplier: string;
  totalAmount: number;
  status: QuoteStatus;
  items: DocItem[];
  note?: string;
  // Details captured on the RFQ request form (company / contact / requirements).
  company?: { name: string; taxId: string; address: string };
  contact?: { name: string; position?: string; phone: string; email: string; poRef?: string };
  certificate?: string; // เกรด / Certificate ที่ต้องการ
  neededBy?: string;     // ต้องการภายใน
};

// Buyer (factory) profile — the same company raises every RFQ in this mock.
const BUYER_COMPANY = {
  name: "บริษัท เฮอร์บัลแบรนด์ จำกัด",
  taxId: "0105560000001",
  address: "เลขที่ 88 หมู่ 4 ตำบลบางพลีใหญ่ อำเภอบางพลี จังหวัดสมุทรปราการ 10540",
};
const BUYER_CONTACT = {
  name: "ณัฐพงษ์ ธีโรภาส",
  position: "ฝ่ายจัดซื้อ",
  phone: "090-000-0001",
  email: "purchase@herbalbrand.co.th",
};

const RAW_QUOTES: QuoteRecord[] = [
  { id: "QT-2569-3012", date: "10 มี.ค. 2569 · 09:30 น.", validUntil: "10 เม.ย. 2569", daysRemaining: 28, supplier: "METAHERB Store", totalAmount: 0, status: "received",
    company: BUYER_COMPANY, contact: BUYER_CONTACT, certificate: "Organic", neededBy: "20 เม.ย. 2569",
    items: [L.ginger(200)] },
  { id: "QT-2569-3028", date: "26 ก.พ. 2569 · 13:45 น.", validUntil: "26 มี.ค. 2569", daysRemaining: 14, supplier: "METAHERB Store", totalAmount: 0, status: "received",
    company: BUYER_COMPANY, contact: { ...BUYER_CONTACT, poRef: "PO-INT-2569-018" }, certificate: "GMP", neededBy: "5 เม.ย. 2569",
    items: [L.shiitake(50), L.jujube(80)] },
  { id: "QT-2569-3035", date: "20 ก.พ. 2569 · 11:20 น.", validUntil: "20 มี.ค. 2569", daysRemaining: 8, supplier: "METAHERB Store", totalAmount: 0, status: "received",
    company: BUYER_COMPANY, contact: BUYER_CONTACT, certificate: "ทั่วไป", neededBy: "30 มี.ค. 2569", note: "ขอ COA แนบทุกล็อต",
    items: [L.goji(200), L.jujube(100)] },
  { id: "QT-2569-3045", date: "5 ก.พ. 2569 · 10:00 น.", validUntil: "7 มี.ค. 2569", daysRemaining: -5, supplier: "METAHERB Store", totalAmount: 0, status: "expired",
    company: BUYER_COMPANY, contact: BUYER_CONTACT, certificate: "GAP", neededBy: "15 มี.ค. 2569",
    items: [L.lemon(80)] },
];
export const MOCK_QUOTES: QuoteRecord[] = withTotals(RAW_QUOTES);

export const QT_STATUS: Record<QuoteStatus, { label: string; color: string }> = {
  pending: { label: "รอร้านเสนอราคา", color: "#f59e0b" },
  received: { label: "ได้รับใบเสนอราคา", color: "#10b981" },
  expired: { label: "หมดอายุ", color: "#9ca3af" },
};

// ── PO (Purchase Order) ─────────────────────────────────────────────────────
export type POStatus = "pending" | "preparing" | "shipped" | "delivered" | "completed" | "cancelled";
export type PORecord = {
  id: string;
  date: string;
  deliveryDate: string;
  supplier: string;
  paymentTerms: string;
  totalAmount: number;
  status: POStatus;
  refPrId?: string;
  refQuoteId?: string;
  trackingNumber?: string;
  items: DocItem[];
  note?: string;
};

const RAW_POS: PORecord[] = [
  { id: "PO-2569-3012", date: "12 มี.ค. 2569 · 09:30 น.", deliveryDate: "26 มี.ค. 2569", supplier: "METAHERB Store", paymentTerms: "เครดิต 30 วัน", totalAmount: 0, status: "pending", refQuoteId: "QT-2569-3012", refPrId: "PR-2569-3012",
    items: [L.ginger(200)] },
  { id: "PO-2569-3019", date: "10 มี.ค. 2569 · 14:18 น.", deliveryDate: "22 มี.ค. 2569", supplier: "METAHERB Store", paymentTerms: "เครดิต 60 วัน", totalAmount: 0, status: "preparing", refPrId: "PR-2569-3019",
    items: [L.ginger(500), L.lemon(150), L.fingerroot(80)] },
  { id: "PO-2569-3028", date: "28 ก.พ. 2569 · 13:08 น.", deliveryDate: "15 มี.ค. 2569", supplier: "METAHERB Store", paymentTerms: "เครดิต 60 วัน", totalAmount: 0, status: "shipped", refQuoteId: "QT-2569-3028", refPrId: "PR-2569-3028", trackingNumber: "TH00125478963",
    items: [L.shiitake(50), L.jujube(80)] },
  { id: "PO-2569-3035", date: "22 ก.พ. 2569 · 11:20 น.", deliveryDate: "8 มี.ค. 2569", supplier: "METAHERB Store", paymentTerms: "เครดิต 90 วัน", totalAmount: 0, status: "delivered", refQuoteId: "QT-2569-3035", refPrId: "PR-2569-3035", trackingNumber: "TH00124589632",
    items: [L.goji(200), L.jujube(100)] },
  { id: "PO-2569-3001", date: "20 ม.ค. 2569 · 11:30 น.", deliveryDate: "5 ก.พ. 2569", supplier: "METAHERB Store", paymentTerms: "เครดิต 30 วัน", totalAmount: 0, status: "completed", trackingNumber: "TH00124573821",
    items: [L.cinnamon(100)] },
  { id: "PO-2569-3038", date: "18 ก.พ. 2569 · 10:45 น.", deliveryDate: "5 มี.ค. 2569", supplier: "METAHERB Store", paymentTerms: "เครดิต 30 วัน", totalAmount: 0, status: "cancelled", refQuoteId: "QT-2569-3038", note: "ยกเลิกเนื่องจากเปลี่ยนสูตรการผลิต",
    items: [L.butterflypea(100)] },
];
export const MOCK_POS: PORecord[] = withTotals(RAW_POS);

export const PO_STATUS: Record<POStatus, { label: string; color: string }> = {
  pending: { label: "รอชำระเงิน", color: "#f59e0b" },
  preparing: { label: "กำลังจัดเตรียม", color: "#007aff" },
  shipped: { label: "จัดส่งแล้ว", color: "#319754" },
  delivered: { label: "รับสินค้าแล้ว", color: "#10b981" },
  completed: { label: "สำเร็จ", color: "#0c8a3e" },
  cancelled: { label: "ยกเลิก", color: "#ef4444" },
};

// ── Per-kind config ─────────────────────────────────────────────────────────
export const DOC_TITLE: Record<DocKind, string> = {
  rfq: "ใบเสนอราคา (RFQ)",
  pr: "ใบขอสั่งซื้อ (PR)",
  po: "ใบสั่งซื้อ (PO)",
};

/** Filter tabs (status keys + a leading "all") for each document kind. */
export const DOC_TABS: Record<DocKind, { key: string; label: string }[]> = {
  rfq: [
    { key: "all", label: "ทั้งหมด" },
    { key: "received", label: "ได้รับแล้ว" },
    { key: "expired", label: "หมดอายุ" },
  ],
  pr: [
    { key: "all", label: "ทั้งหมด" },
    { key: "pending", label: "รออนุมัติ" },
    { key: "approved", label: "อนุมัติแล้ว" },
    { key: "converted", label: "แปลงเป็น PO" },
    { key: "rejected", label: "ปฏิเสธ" },
    { key: "expired", label: "หมดอายุ" },
  ],
  po: [
    { key: "all", label: "ทั้งหมด" },
    { key: "pending", label: "รอชำระเงิน" },
    { key: "preparing", label: "กำลังจัดเตรียม" },
    { key: "shipped", label: "จัดส่งแล้ว" },
    { key: "delivered", label: "รับแล้ว" },
    { key: "completed", label: "สำเร็จ" },
    { key: "cancelled", label: "ยกเลิก" },
  ],
};

export type AnyDoc = PRRecord | QuoteRecord | PORecord;

/**
 * The buyer's documents. RFQs the buyer actually submitted come first (read
 * live from the shared quote table); the demo rows stay behind them so the PR/PO
 * tabs and the charts still have data.
 */
export function docsForKind(kind: DocKind, own: { quotes?: QuoteRecord[]; pos?: PORecord[] } = {}): AnyDoc[] {
  if (kind === "rfq") return [...(own.quotes ?? []), ...MOCK_QUOTES];
  if (kind === "po") return [...(own.pos ?? []), ...MOCK_POS];
  // PRs are still demo rows — nothing in the app raises one yet.
  return MOCK_PRS;
}

export function getDoc(kind: DocKind, id: string): AnyDoc | undefined {
  return docsForKind(kind).find((d) => d.id === id);
}

/** Status badge {label,color} for any record by kind. */
export function statusBadge(kind: DocKind, status: string): { label: string; color: string } {
  if (kind === "rfq") return QT_STATUS[status as QuoteStatus];
  if (kind === "pr") return PR_STATUS[status as PRStatus];
  return PO_STATUS[status as POStatus];
}
