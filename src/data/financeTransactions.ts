// Shop-owner finance — settlements per order (mirrors the web OwnerDashboard
// TransactionsTab). Each order books: ยอดรับ (gross) − GP (7%) = ยอดการชำระเงิน (payout).
// "settled" = ชำระเงินแล้ว, "pending" = ที่จะชำระเงิน (escrow held).

export type SettlementStatus = "settled" | "pending";

// Earnings breakdown shown in the detail sheet (ported from the web SettlementBreakdown).
export type SettlementBreakdown = {
  productPrice: number; // ราคาสินค้า (ก่อนหักส่วนลด)
  shopDiscount: number; // ส่วนลดจากร้านค้า (negative)
  platformDiscount: number; // ส่วนลดจากแพลตฟอร์ม (positive)
  couponDiscount: number; // ส่วนลดจากคูปอง (negative)
  netPrice: number; // ราคาสุทธิ
  customerShippingFee: number; // ค่าขนส่งของลูกค้า
  platformShippingDiscount: number; // ส่วนลดค่าขนส่งจากแพลตฟอร์ม
  commission: number; // ค่าธรรมเนียม GP (negative)
  vat: number; // VAT 7% (รวมในราคาแล้ว)
};

export type Settlement = {
  orderNo: string; // "ORD-20260206-03517"
  idCode: string; // "ORD2026020603517-S"
  created: string; // "6 ก.พ. 2569"
  time: string; // "16:32"
  paid: string | null; // "6 ก.พ. 2569" or null (pending)
  gross: number; // ยอดรับ
  gp: number; // negative — ค่าธรรมเนียม GP
  payout: number; // ยอดการชำระเงิน
  status: SettlementStatus;
  monthLabel: string; // "กุมภาพันธ์ 2569" — for the month filter
  breakdown: SettlementBreakdown;
};

// Abbreviated → full Thai month (created dates use the short form, e.g. "6 ก.พ. 2569").
const TH_MONTH_FULL: Record<string, string> = {
  "ม.ค.": "มกราคม", "ก.พ.": "กุมภาพันธ์", "มี.ค.": "มีนาคม", "เม.ย.": "เมษายน",
  "พ.ค.": "พฤษภาคม", "มิ.ย.": "มิถุนายน", "ก.ค.": "กรกฎาคม", "ส.ค.": "สิงหาคม",
  "ก.ย.": "กันยายน", "ต.ค.": "ตุลาคม", "พ.ย.": "พฤศจิกายน", "ธ.ค.": "ธันวาคม",
};
const monthLabelOf = (created: string) => {
  const p = created.split(" ");
  return `${TH_MONTH_FULL[p[1]] ?? p[1]} ${p[2] ?? ""}`.trim();
};

// Last 6 months (current = มิถุนายน 2569, going back). Default to the month with data.
export const MONTH_OPTIONS = ["มิถุนายน 2569", "พฤษภาคม 2569", "เมษายน 2569", "มีนาคม 2569", "กุมภาพันธ์ 2569", "มกราคม 2569"];
export const DEFAULT_MONTH = "กุมภาพันธ์ 2569";

// Per-order breakdown variants (same set as the web TransactionsTab mock).
const VARIANTS = [
  { shopPct: 0.2, platformPct: 0.05, coupon: 50, customerShipping: 40, platformShipSub: 20 },
  { shopPct: 0.15, platformPct: 0.04, coupon: 30, customerShipping: 40, platformShipSub: 15 },
  { shopPct: 0.1, platformPct: 0.06, coupon: 0, customerShipping: 50, platformShipSub: 25 },
  { shopPct: 0.25, platformPct: 0.05, coupon: 50, customerShipping: 40, platformShipSub: 20 },
];

const GP_RATE = 0.07;
const round2 = (n: number) => Math.round(n * 100) / 100;

const RAW: { orderNo: string; created: string; time: string; total: number; status: SettlementStatus }[] = [
  // ชำระเงินแล้ว (settled)
  { orderNo: "ORD-20260206-03517", created: "6 ก.พ. 2569", time: "16:32", total: 735, status: "settled" },
  { orderNo: "ORD-20260202-03518", created: "2 ก.พ. 2569", time: "11:09", total: 895, status: "settled" },
  { orderNo: "ORD-20260214-03515", created: "14 ก.พ. 2569", time: "14:18", total: 850, status: "settled" },
  { orderNo: "ORD-20260210-03516", created: "10 ก.พ. 2569", time: "09:55", total: 1240, status: "settled" },
  // ที่จะชำระเงิน (pending / escrow)
  { orderNo: "ORD-20260219-03525", created: "19 ก.พ. 2569", time: "10:21", total: 1850, status: "pending" },
  { orderNo: "ORD-20260218-03524", created: "18 ก.พ. 2569", time: "13:40", total: 990, status: "pending" },
  { orderNo: "ORD-20260218-03523", created: "18 ก.พ. 2569", time: "09:12", total: 2480, status: "pending" },
  { orderNo: "ORD-20260217-03522", created: "17 ก.พ. 2569", time: "15:33", total: 1290, status: "pending" },
  { orderNo: "ORD-20260216-03521", created: "16 ก.พ. 2569", time: "11:48", total: 3560, status: "pending" },
  { orderNo: "ORD-20260216-03520", created: "16 ก.พ. 2569", time: "08:27", total: 720, status: "pending" },
  { orderNo: "ORD-20260215-03519", created: "15 ก.พ. 2569", time: "17:05", total: 4250, status: "pending" },
  { orderNo: "ORD-20260215-03514", created: "15 ก.พ. 2569", time: "12:19", total: 1680, status: "pending" },
  { orderNo: "ORD-20260213-03513", created: "13 ก.พ. 2569", time: "14:52", total: 2990, status: "pending" },
  { orderNo: "ORD-20260212-03512", created: "12 ก.พ. 2569", time: "10:08", total: 560, status: "pending" },
  { orderNo: "ORD-20260211-03511", created: "11 ก.พ. 2569", time: "16:44", total: 1990, status: "pending" },
];

export const SETTLEMENTS: Settlement[] = RAW.map((o, idx) => {
  const gross = o.total;
  const gp = round2(gross * GP_RATE);
  const v = VARIANTS[idx % VARIANTS.length];
  const netFromGross = gross - v.customerShipping + v.platformShipSub;
  const productBefore = (netFromGross + v.coupon) / (1 - v.shopPct + v.platformPct);
  const shopDiscount = -round2(productBefore * v.shopPct);
  const platformDiscount = round2(productBefore * v.platformPct);
  const couponDiscount = -v.coupon;
  const netPrice = round2(productBefore + shopDiscount + platformDiscount + couponDiscount);
  return {
    orderNo: o.orderNo,
    idCode: o.orderNo.replace(/-/g, "") + "-S",
    created: o.created,
    time: o.time,
    paid: o.status === "settled" ? o.created : null,
    gross,
    gp: -gp,
    payout: round2(gross - gp),
    status: o.status,
    monthLabel: monthLabelOf(o.created),
    breakdown: {
      productPrice: round2(productBefore),
      shopDiscount,
      platformDiscount,
      couponDiscount,
      netPrice,
      customerShippingFee: v.customerShipping,
      platformShippingDiscount: v.platformShipSub,
      commission: -gp,
      vat: round2((gross * 7) / 107),
    },
  };
});

const settled = SETTLEMENTS.filter((s) => s.status === "settled");
const pending = SETTLEMENTS.filter((s) => s.status === "pending");

export const SETTLED_COUNT = settled.length;
export const PENDING_COUNT = pending.length;

export const FINANCE_TOTALS = {
  available: round2(settled.reduce((s, x) => s + x.payout, 0)), // ยอดพร้อมถอน
  escrow: round2(pending.reduce((s, x) => s + x.gross, 0)), // รอปล่อย (Escrow)
  escrowCount: pending.length,
  gpFees: round2(settled.reduce((s, x) => s + Math.abs(x.gp), 0)),
  totalIncome: 156200, // รายได้สะสม (lifetime — keeps the dashboard figure intact)
  withdrawn: 0,
};

export const fmtBaht = (n: number) =>
  `฿${Math.abs(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtSigned = (n: number) => (n < 0 ? "-" : "+") + fmtBaht(n);
