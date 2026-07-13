/**
 * Sales-report data ported from the web OwnerDashboard (รายงานผลยอดขาย).
 * Period datasets + the product-sales table source + KPI maths.
 */

export type Period = "daily" | "weekly" | "monthly" | "yearly";

export const PERIODS: { id: Period; label: string }[] = [
  { id: "daily", label: "รายวัน" },
  { id: "weekly", label: "รายสัปดาห์" },
  { id: "monthly", label: "รายเดือน" },
  { id: "yearly", label: "รายปี" },
];

export type Point = { label: string; sales: number; orders: number; visits: number; newCust: number; repeat: number; units: number; topProduct: string };
export type SeriesKey = "sales" | "orders" | "visits" | "newCust" | "repeat" | "units";

const DAILY: Point[] = [
  { label: "00:00", sales: 0, orders: 0, visits: 12, newCust: 0, repeat: 0, units: 0, topProduct: "-" },
  { label: "04:00", sales: 120, orders: 1, visits: 18, newCust: 1, repeat: 0, units: 2, topProduct: "ใบบัวบกแคปซูล" },
  { label: "08:00", sales: 480, orders: 3, visits: 65, newCust: 2, repeat: 1, units: 8, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "12:00", sales: 980, orders: 5, visits: 80, newCust: 3, repeat: 2, units: 14, topProduct: "ฟ้าทะลายโจร" },
  { label: "16:00", sales: 1200, orders: 9, visits: 105, newCust: 2, repeat: 1, units: 22, topProduct: "น้ำผึ้งดอกลำไย" },
  { label: "20:00", sales: 720, orders: 5, visits: 60, newCust: 3, repeat: 2, units: 11, topProduct: "ชาเก๊กฮวยออร์แกนิก" },
];

const WEEKLY: Point[] = [
  { label: "สัปดาห์ 1", sales: 6420, orders: 38, visits: 1180, newCust: 14, repeat: 9, units: 42, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "สัปดาห์ 2", sales: 8950, orders: 54, visits: 1620, newCust: 22, repeat: 16, units: 68, topProduct: "ฟ้าทะลายโจร" },
  { label: "สัปดาห์ 3", sales: 11240, orders: 68, visits: 1985, newCust: 28, repeat: 21, units: 95, topProduct: "น้ำผึ้งดอกลำไย" },
  { label: "สัปดาห์ 4", sales: 9780, orders: 59, visits: 1745, newCust: 19, repeat: 18, units: 81, topProduct: "ชาเก๊กฮวยออร์แกนิก" },
  { label: "สัปดาห์ 5", sales: 4380, orders: 26, visits: 820, newCust: 8, repeat: 6, units: 28, topProduct: "น้ำมันมะพร้าวสกัดเย็น" },
];

const MONTHLY: Point[] = [
  { label: "ม.ค.", sales: 18200, orders: 124, visits: 868, newCust: 27, repeat: 20, units: 161, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "ก.พ.", sales: 16800, orders: 108, visits: 756, newCust: 24, repeat: 17, units: 140, topProduct: "ฟ้าทะลายโจร" },
  { label: "มี.ค.", sales: 22400, orders: 151, visits: 1057, newCust: 33, repeat: 24, units: 196, topProduct: "น้ำผึ้งดอกลำไย" },
  { label: "เม.ย.", sales: 19600, orders: 132, visits: 924, newCust: 29, repeat: 21, units: 172, topProduct: "ชาเก๊กฮวยออร์แกนิก" },
  { label: "พ.ค.", sales: 25800, orders: 173, visits: 1211, newCust: 38, repeat: 28, units: 225, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "มิ.ย.", sales: 28950, orders: 196, visits: 1372, newCust: 43, repeat: 31, units: 255, topProduct: "ฟ้าทะลายโจร" },
  { label: "ก.ค.", sales: 24100, orders: 162, visits: 1134, newCust: 36, repeat: 26, units: 211, topProduct: "น้ำผึ้งดอกลำไย" },
  { label: "ส.ค.", sales: 26700, orders: 181, visits: 1267, newCust: 40, repeat: 29, units: 235, topProduct: "ชามะรุม" },
  { label: "ก.ย.", sales: 21300, orders: 144, visits: 1008, newCust: 32, repeat: 23, units: 187, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "ต.ค.", sales: 23950, orders: 159, visits: 1113, newCust: 35, repeat: 25, units: 207, topProduct: "ฟ้าทะลายโจร" },
  { label: "พ.ย.", sales: 30200, orders: 205, visits: 1435, newCust: 45, repeat: 33, units: 267, topProduct: "น้ำผึ้งดอกลำไย" },
  { label: "ธ.ค.", sales: 32600, orders: 221, visits: 1547, newCust: 49, repeat: 35, units: 287, topProduct: "ชุดของขวัญสมุนไพร" },
];

const YEARLY: Point[] = [
  { label: "2565", sales: 124800, orders: 845, visits: 18420, newCust: 285, repeat: 412, units: 685, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "2566", sales: 168450, orders: 1124, visits: 24680, newCust: 342, repeat: 568, units: 924, topProduct: "น้ำผึ้งดอกลำไย" },
  { label: "2567", sales: 215300, orders: 1486, visits: 32150, newCust: 458, repeat: 742, units: 1248, topProduct: "ฟ้าทะลายโจร" },
  { label: "2568", sales: 248920, orders: 1672, visits: 38240, newCust: 524, repeat: 868, units: 1492, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "2569", sales: 86420, orders: 542, visits: 12180, newCust: 184, repeat: 268, units: 542, topProduct: "ชาเก๊กฮวยออร์แกนิก" },
];

export const REPORT_DATA: Record<Period, Point[]> = { daily: DAILY, weekly: WEEKLY, monthly: MONTHLY, yearly: YEARLY };

export const PERIOD_SCOPE: Record<Period, string> = {
  daily: "วันนี้",
  weekly: "เดือนนี้",
  monthly: "ปีนี้",
  yearly: "5 ปีล่าสุด",
};

/** Yesterday's totals — baseline for the "วันนี้ vs เมื่อวาน" trend deltas. */
export const PREV_DAY = { sales: 3080, orders: 21 };

/** Signed percentage change vs a prior value (0 when prior is 0). */
export const pctDelta = (now: number, prev: number) =>
  prev > 0 ? Math.round(((now - prev) / prev) * 100) : 0;

const COST_RATE = 0.55; // herbal goods cost ≈ 55% of sales

export type Kpi = { sales: number; orders: number; cost: number; profit: number; avgSales: number; aov: number; costRatio: number; margin: number };

export function computeKpi(rows: Point[]): Kpi {
  const sales = rows.reduce((s, r) => s + r.sales, 0);
  const orders = rows.reduce((s, r) => s + r.orders, 0);
  const cost = Math.round(sales * COST_RATE);
  const profit = sales - cost;
  const days = Math.max(1, rows.filter((r) => r.sales > 0).length);
  return {
    sales,
    orders,
    cost,
    profit,
    avgSales: Math.round(sales / days),
    aov: orders > 0 ? Math.round(sales / orders) : 0,
    costRatio: sales > 0 ? Math.round((cost / sales) * 100) : 0,
    margin: sales > 0 ? (profit / sales) * 100 : 0,
  };
}

export const fmtBaht = (n: number) => `฿${n.toLocaleString()}`;

/* ---------- Product sales table ---------- */

export type SalesProduct = { name: string; sku: string; initial: string; bg: string; fg: string; category: string; qty: number; sales: number; cost: number; stock: number; unit: string };

export const GP_RATE = 0.07;

export const REGULAR_PRODUCTS: SalesProduct[] = [
  { name: "ขมิ้นชันแคปซูล 60 แคป", sku: "HRB-001", initial: "ขม", bg: "#fef3c7", fg: "#b45309", category: "สมุนไพรแคปซูล", qty: 64, sales: 11360, cost: 5120, stock: 42, unit: "ชิ้น" },
  { name: "ฟ้าทะลายโจรผง 100 g", sku: "HRB-014", initial: "ฟท", bg: "#dcfce7", fg: "#15803d", category: "ผงสมุนไพร", qty: 48, sales: 9200, cost: 3840, stock: 28, unit: "ชิ้น" },
  { name: "น้ำผึ้งดอกลำไย 250 ml", sku: "HNY-002", initial: "นผ", bg: "#fef9c3", fg: "#a16207", category: "น้ำผึ้ง", qty: 35, sales: 8400, cost: 3850, stock: 51, unit: "ชิ้น" },
  { name: "ชาเก๊กฮวยออร์แกนิก", sku: "TEA-007", initial: "ชก", bg: "#ffedd5", fg: "#c2410c", category: "ชาสมุนไพร", qty: 41, sales: 6150, cost: 2870, stock: 33, unit: "ชิ้น" },
  { name: "น้ำมันมะพร้าวสกัดเย็น", sku: "OIL-003", initial: "นม", bg: "#e0f2fe", fg: "#0369a1", category: "น้ำมันสมุนไพร", qty: 22, sales: 5280, cost: 2640, stock: 9, unit: "ชิ้น" },
  { name: "ใบบัวบกแคปซูล", sku: "HRB-021", initial: "บบ", bg: "#dcfce7", fg: "#15803d", category: "สมุนไพรแคปซูล", qty: 29, sales: 4350, cost: 1885, stock: 60, unit: "ชิ้น" },
  { name: "ชามะรุม 30 ซอง", sku: "TEA-011", initial: "ชม", bg: "#ffedd5", fg: "#c2410c", category: "ชาสมุนไพร", qty: 18, sales: 2340, cost: 1170, stock: 24, unit: "ชิ้น" },
  { name: "สบู่สมุนไพรขมิ้น", sku: "SOP-004", initial: "สบ", bg: "#fef3c7", fg: "#b45309", category: "สบู่สมุนไพร", qty: 26, sales: 1690, cost: 845, stock: 75, unit: "ชิ้น" },
];

export const MARKET_PRODUCTS: SalesProduct[] = [
  { name: "ขมิ้นชันแห้ง (ผง) — พรีเมียม", sku: "MKT-001", initial: "ขม", bg: "#fef3c7", fg: "#b45309", category: "ผงสมุนไพร", qty: 200, sales: 64000, cost: 38000, stock: 1200, unit: "กก." },
  { name: "ฟ้าทะลายโจร (ผง) — พรีเมียม", sku: "MKT-002", initial: "ฟท", bg: "#dcfce7", fg: "#15803d", category: "ผงสมุนไพร", qty: 500, sales: 120000, cost: 78000, stock: 2400, unit: "กก." },
  { name: "ดอกคำฝอยแห้ง — คัดพิเศษ", sku: "MKT-007", initial: "คฝ", bg: "#ffe4e6", fg: "#be123c", category: "ดอกไม้แห้ง", qty: 120, sales: 42000, cost: 25200, stock: 640, unit: "กก." },
  { name: "ตะไคร้หอมอบแห้ง", sku: "MKT-012", initial: "ตค", bg: "#dcfce7", fg: "#15803d", category: "สมุนไพรอบแห้ง", qty: 320, sales: 51200, cost: 32000, stock: 1500, unit: "กก." },
  { name: "ขิงผงออร์แกนิก", sku: "MKT-019", initial: "ขง", bg: "#fef9c3", fg: "#a16207", category: "ผงสมุนไพร", qty: 180, sales: 39600, cost: 23400, stock: 880, unit: "กก." },
  { name: "เก๊กฮวยอบแห้ง", sku: "MKT-023", initial: "กฮ", bg: "#fef3c7", fg: "#b45309", category: "ดอกไม้แห้ง", qty: 95, sales: 28500, cost: 17100, stock: 420, unit: "กก." },
];

export type ProductSort = "sales_desc" | "sales_asc" | "qty_desc" | "margin_desc" | "latest";

export const SORT_OPTIONS: { id: ProductSort; label: string }[] = [
  { id: "sales_desc", label: "ยอดขายสูงสุด" },
  { id: "sales_asc", label: "ยอดขายต่ำสุด" },
  { id: "qty_desc", label: "จำนวนขายสูงสุด" },
  { id: "margin_desc", label: "มาร์จิ้นสูงสุด" },
  // Orders the GROUP cards newest → oldest by their period date (handled in the
  // view); lines within a group have no date, so they keep the sales default.
  { id: "latest", label: "ล่าสุด" },
];

export function sortProducts(list: SalesProduct[], sort: ProductSort): SalesProduct[] {
  const margin = (p: SalesProduct) => {
    const net = p.sales * (1 - GP_RATE);
    return p.sales > 0 ? (net - p.cost) / p.sales : 0;
  };
  const arr = [...list];
  switch (sort) {
    case "sales_asc": return arr.sort((a, b) => a.sales - b.sales);
    case "qty_desc": return arr.sort((a, b) => b.qty - a.qty);
    case "margin_desc": return arr.sort((a, b) => margin(b) - margin(a));
    default: return arr.sort((a, b) => b.sales - a.sales);
  }
}

/* ---------- Grouped product-sales table (web parity) ----------
 * The web table groups sale lines under the period's time buckets
 * (day → hours, month → weeks, …) with a per-group summary column:
 * n รายการ · units, ยอดขาย, GP, สุทธิ, กำไร. Lines are generated
 * deterministically from the product list so every period/tab combination
 * renders stable mock data. */

export type SaleLine = {
  p: SalesProduct;
  qty: number;
  price: number;    // unit price
  discount: number; // ส่วนลด (0 = none)
  sales: number;    // qty×price − discount
  gp: number;       // platform GP cut (7%)
  net: number;      // ร้านรับสุทธิ
  cost: number;
  profit: number;   // net − cost
  margin: number;   // % of sales
};

export type SalesGroup = {
  label: string;
  lines: SaleLine[];
  units: number;
  sales: number;
  gp: number;
  net: number;
  cost: number;
  profit: number;
  margin: number;
};

export function groupedSales(period: Period, list: SalesProduct[]): SalesGroup[] {
  const buckets = REPORT_DATA[period].filter((b) => b.sales > 0);
  return buckets.map((b, gi) => {
    const count = Math.min(list.length, 3 + ((gi + list.length) % 3));
    const lines: SaleLine[] = [];
    for (let k = 0; k < count; k++) {
      const p = list[(gi * 2 + k) % list.length];
      const price = Math.max(1, Math.round(p.sales / p.qty));
      const qty = Math.max(1, Math.round((p.qty * (0.6 + ((gi + k) % 4) * 0.2)) / buckets.length));
      const gross = price * qty;
      const discount = (gi + k) % 3 === 0 ? Math.round(gross * 0.05) : 0;
      const sales = gross - discount;
      const gp = Math.round(sales * GP_RATE);
      const net = sales - gp;
      const cost = Math.round((p.cost / p.qty) * qty);
      const profit = net - cost;
      lines.push({ p, qty, price, discount, sales, gp, net, cost, profit, margin: sales > 0 ? (profit / sales) * 100 : 0 });
    }
    const sum = (f: (l: SaleLine) => number) => lines.reduce((s, l) => s + f(l), 0);
    const sales = sum((l) => l.sales);
    const profit = sum((l) => l.profit);
    return {
      label: b.label,
      lines,
      units: sum((l) => l.qty),
      sales,
      gp: sum((l) => l.gp),
      net: sum((l) => l.net),
      cost: sum((l) => l.cost),
      profit,
      margin: sales > 0 ? (profit / sales) * 100 : 0,
    };
  });
}

/** เรียงในกลุ่ม — same sort keys as the flat table, applied per group. */
export function sortLines(lines: SaleLine[], sort: ProductSort): SaleLine[] {
  const arr = [...lines];
  switch (sort) {
    case "sales_asc": return arr.sort((a, b) => a.sales - b.sales);
    case "qty_desc": return arr.sort((a, b) => b.qty - a.qty);
    case "margin_desc": return arr.sort((a, b) => b.margin - a.margin);
    default: return arr.sort((a, b) => b.sales - a.sales);
  }
}

export const sumField = (rows: Point[], key: SeriesKey) => rows.reduce((s, r) => s + (r[key] as number), 0);

/* ---------- Customer report ---------- */
export type Customer = { id: string; name: string; email: string; group: string; initial: string; bg: string; fg: string; orders: number; total: number; lastBuy: string; daysAgo: number; fav: string };

export const CUSTOMERS: Customer[] = [
  { id: "CST-001", email: "somchai.j@gmail.com", name: "สมชาย ใจดี", group: "VIP", initial: "สม", bg: "#fef3c7", fg: "#b45309", orders: 5, total: 1420, lastBuy: "2 พ.ค.", daysAgo: 2, fav: "ขมิ้นชัน" },
  { id: "CST-007", email: "malee.s@hotmail.com", name: "มาลี สดใส", group: "VIP", initial: "มล", bg: "#fde68a", fg: "#854d0e", orders: 4, total: 980, lastBuy: "28 เม.ย.", daysAgo: 6, fav: "ฟ้าทะลายโจร" },
  { id: "CST-008", email: "thanaphol.s@gmail.com", name: "ธนพล ศรีสุข", group: "VIP", initial: "ธน", bg: "#fef3c7", fg: "#b45309", orders: 4, total: 880, lastBuy: "29 เม.ย.", daysAgo: 5, fav: "เห็ดหลินจือ" },
  { id: "CST-003", email: "warapron.t@gmail.com", name: "วราภรณ์ ทองดี", group: "ประจำ", initial: "วร", bg: "#dcfce7", fg: "#15803d", orders: 3, total: 720, lastBuy: "25 เม.ย.", daysAgo: 9, fav: "น้ำมันมะพร้าว" },
  { id: "CST-010", email: "phuri.t@gmail.com", name: "ภูริ ทองเนื้อเก้า", group: "ประจำ", initial: "ภร", bg: "#dcfce7", fg: "#15803d", orders: 3, total: 620, lastBuy: "30 เม.ย.", daysAgo: 4, fav: "บาล์มไพล" },
  { id: "CST-005", email: "pichaya.r@hotmail.com", name: "พิชญา รุ่งเรือง", group: "ประจำ", initial: "พช", bg: "#dcfce7", fg: "#15803d", orders: 3, total: 540, lastBuy: "1 พ.ค.", daysAgo: 3, fav: "ใบบัวบก" },
  { id: "CST-012", email: "preeya.k@gmail.com", name: "ปรียา แก้วใส", group: "ใหม่", initial: "ปร", bg: "#dbeafe", fg: "#1e40af", orders: 1, total: 580, lastBuy: "3 พ.ค.", daysAgo: 1, fav: "ชาตะไคร้" },
  { id: "CST-002", email: "adithep.p@yahoo.com", name: "อดิเทพ พงษ์เพชร", group: "เสี่ยงหาย", initial: "อด", bg: "#fee2e2", fg: "#b91c1c", orders: 2, total: 420, lastBuy: "95 วันที่แล้ว", daysAgo: 95, fav: "ยาดมสมุนไพร" },
  { id: "CST-006", email: "kitti.p@yahoo.com", name: "กิตติ ภักดี", group: "เสี่ยงหาย", initial: "กต", bg: "#fee2e2", fg: "#b91c1c", orders: 2, total: 380, lastBuy: "75 วันที่แล้ว", daysAgo: 75, fav: "สบู่สมุนไพร" },
  { id: "CST-014", email: "sudarat.m@gmail.com", name: "สุดารัตน์ มีโชค", group: "ใหม่", initial: "สด", bg: "#dbeafe", fg: "#1e40af", orders: 1, total: 280, lastBuy: "2 พ.ค.", daysAgo: 2, fav: "น้ำผึ้งดอกลำไย" },
  { id: "CST-011", email: "naphaporn.d@gmail.com", name: "นภาพร ดวงดี", group: "ใหม่", initial: "นภ", bg: "#dbeafe", fg: "#1e40af", orders: 1, total: 162, lastBuy: "4 พ.ค.", daysAgo: 0, fav: "รางจืด" },
  { id: "CST-009", email: "wanwipa.j@hotmail.com", name: "วรรณวิภา จงเจริญ", group: "หายไป", initial: "วว", bg: "#f3f4f6", fg: "#525252", orders: 1, total: 180, lastBuy: "120 วันที่แล้ว", daysAgo: 120, fav: "ขิงผง" },
];

export const CUSTOMER_GROUP_COLOR: Record<string, { bg: string; fg: string }> = {
  VIP: { bg: "#fef3c7", fg: "#b45309" },
  ประจำ: { bg: "#dcfce7", fg: "#15803d" },
  ใหม่: { bg: "#dbeafe", fg: "#1e40af" },
  เสี่ยงหาย: { bg: "#fee2e2", fg: "#b91c1c" },
  หายไป: { bg: "#f3f4f6", fg: "#525252" },
};

/* ---------- Customer table (web parity) ----------
 * The web's "ลูกค้าที่มียอดซื้อสูงสุด" table is a FLAT ranked list — no grouping.
 * Columns: # · ลูกค้า(ชื่อ+อีเมล) · ออเดอร์ · ยอดรวม · AOV · อัตราซื้อซ้ำ · ซื้อล่าสุด · สินค้าที่ชอบ,
 * with a รวม summary row. Same five sort keys as the web <select>. */

export type CustomerSort = "total_desc" | "total_asc" | "orders_desc" | "recent" | "oldest";

export const CUSTOMER_SORT_OPTIONS: { id: CustomerSort; label: string }[] = [
  { id: "total_desc", label: "ยอดซื้อรวม" },
  { id: "total_asc", label: "ยอดซื้อต่ำสุด" },
  { id: "orders_desc", label: "ออเดอร์มากสุด" },
  { id: "recent", label: "ซื้อล่าสุด" },
  { id: "oldest", label: "ห่างจากซื้อ" },
];

export function sortCustomers(list: Customer[], sort: CustomerSort): Customer[] {
  const arr = [...list];
  switch (sort) {
    case "total_asc": return arr.sort((a, b) => a.total - b.total);
    case "orders_desc": return arr.sort((a, b) => b.orders - a.orders);
    case "recent": return arr.sort((a, b) => a.daysAgo - b.daysAgo);
    case "oldest": return arr.sort((a, b) => b.daysAgo - a.daysAgo);
    default: return arr.sort((a, b) => b.total - a.total);
  }
}

/** AOV + อัตราซื้อซ้ำ + สีของ badge — web's per-row derived values. */
export function customerStats(c: Customer) {
  const aov = c.orders > 0 ? Math.round(c.total / c.orders) : 0;
  const repeatRate = c.orders > 1 ? Math.round(((c.orders - 1) / c.orders) * 100) : 0;
  const rr =
    repeatRate >= 70 ? { fg: "#15803d", bg: "#dcfce7" }
    : repeatRate >= 40 ? { fg: "#319754", bg: "#d6eadd" }
    : repeatRate > 0 ? { fg: "#0ea5e9", bg: "#dbeafe" }
    : { fg: "#9ca3af", bg: "#f3f4f6" };
  return { aov, repeatRate, rr, stale: c.daysAgo > 30 };
}

/** อันดับ 1–3 ได้เหรียญ ทอง/เงิน/ทองแดง (web rankBg). */
export const rankColor = (rank: number) =>
  rank === 0 ? "#eab308" : rank === 1 ? "#94a3b8" : rank === 2 ? "#f97316" : "#e5e7eb";

/** เลขบนเหรียญ — 1–3 ขาว, ที่เหลือเทา. */
export const rankTextColor = (rank: number) => (rank < 3 ? "#ffffff" : "#9ca3af");

/** กรองตามช่วงเวลา — web scales the base (monthly) list by period and drops
 *  some customers on short periods, so the table reacts to the period tab. */
export function customersForPeriod(period: Period, monthIdx: number): Customer[] {
  const hash = period.length * 13 + monthIdx * 5;
  const scale = period === "daily" ? 0.35 : period === "weekly" ? 0.7 : period === "yearly" ? 12 : 1;
  return CUSTOMERS.map((c, i) => {
    const drop = period === "daily" ? (i + hash) % 3 === 0 : period === "weekly" ? (i + hash) % 5 === 0 : false;
    if (drop) return { ...c, orders: 0, total: 0 };
    return { ...c, orders: Math.max(1, Math.round(c.orders * scale)), total: Math.max(1, Math.round(c.total * scale)) };
  }).filter((c) => c.orders > 0);
}

/** กรองเฉพาะจุดที่เลือกบนกราฟ — web's focusedLabel: the table narrows to the
 *  customers that make up that bucket (rotated + scaled deterministically). */
export function focusCustomers(list: Customer[], label: string, bucketCustomers: number): Customer[] {
  if (bucketCustomers <= 0 || list.length === 0) return [];
  const hash = Array.from(label).reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const rotateBy = hash % list.length;
  return [...list.slice(rotateBy), ...list.slice(0, rotateBy)]
    .slice(0, Math.min(bucketCustomers, list.length))
    .map((c, i) => ({
      ...c,
      orders: Math.max(1, Math.round(c.orders * (1 - i * 0.08))),
      total: Math.max(1, Math.round(c.total * (0.4 + (((hash + i) % 60) / 100)))),
    }));
}

/* ---------- Product report ---------- */
export type TopProduct = { name: string; category: string; sold: number; revenue: number; rating: number; reviews: number };

export const TOP_PRODUCTS: TopProduct[] = [
  // Stress-test row — หลักแสนชิ้น / รายได้หลักล้าน, proves the card's stat row
  // still fits (the value shrinks a step instead of truncating).
  { name: "ชุดของขวัญสมุนไพรพรีเมียม (ขายส่ง)", category: "ชุดของขวัญ", sold: 128400, revenue: 12480500, rating: 4.9, reviews: 3120 },
  { name: "พิมเสนน้ำอโรมา ตราเมต้าเฮิร์บ", category: "ผลิตภัณฑ์สมุนไพร", sold: 16, revenue: 1122, rating: 4.8, reviews: 142 },
  { name: "สบู่สมุนไพรขมิ้น", category: "ของใช้ออร์แกนิก", sold: 12, revenue: 1800, rating: 4.6, reviews: 180 },
  { name: "ถุงหอมอโรมา MetaHerb Bloom", category: "เครื่องหอม & อโรม่า", sold: 11, revenue: 1069, rating: 4.7, reviews: 98 },
  { name: "ขมิ้นชันแคปซูล 60 แคป", category: "สมุนไพรแคปซูล", sold: 8, revenue: 1420, rating: 4.9, reviews: 210 },
  { name: "ใบบัวบกแคปซูล 60 แคป", category: "สมุนไพรแคปซูล", sold: 7, revenue: 1280, rating: 4.6, reviews: 88 },
  { name: "ชาเก๊กฮวยออร์แกนิก 20 ซอง", category: "ชาสมุนไพร", sold: 6, revenue: 760, rating: 4.5, reviews: 110 },
  { name: "กาแฟดริป signature อเมริกาโนเย็น", category: "อาหารและเครื่องดื่ม", sold: 5, revenue: 850, rating: 4.6, reviews: 64 },
  { name: "ฟ้าทะลายโจรผง 100 g", category: "ผงสมุนไพร", sold: 5, revenue: 1150, rating: 4.7, reviews: 156 },
  { name: "ชามะรุม 30 ซอง", category: "ชาสมุนไพร", sold: 5, revenue: 650, rating: 4.4, reviews: 58 },
  { name: "เห็ดหลินจือสกัด 60 แคป", category: "สมุนไพรสกัด", sold: 4, revenue: 980, rating: 4.8, reviews: 55 },
  { name: "ขิงผงออร์แกนิก 100 g", category: "ผงสมุนไพร", sold: 4, revenue: 520, rating: 4.3, reviews: 67 },
  { name: "น้ำมันมะพร้าวสกัดเย็น", category: "น้ำมันสมุนไพร", sold: 3, revenue: 870, rating: 4.5, reviews: 72 },
  { name: "น้ำผึ้งดอกลำไย 250 ml", category: "ผลิตภัณฑ์ออร์แกนิก", sold: 3, revenue: 645, rating: 4.9, reviews: 95 },
  { name: "ชาตะไคร้ใบเตย 30 ซอง", category: "ชาสมุนไพร", sold: 2, revenue: 580, rating: 4.4, reviews: 48 },
  { name: "บาล์มสมุนไพรไพล", category: "ของใช้ออร์แกนิก", sold: 2, revenue: 380, rating: 4.7, reviews: 42 },
];

/* ---------- Market report ---------- */
/* ---------- Product table (web parity) ----------
 * The web's "Top Product" table is a FLAT ranked list:
 *   # · สินค้า · ยอดขาย(ชิ้น) · รายได้ · เฉลี่ย/ชิ้น   (+ rating/reviews on its own table)
 * Same three sort keys as the web <select>. */

export type TopProductSort = "sold_desc" | "sold_asc" | "revenue_desc";

export const PRODUCT_SORT_OPTIONS: { id: TopProductSort; label: string }[] = [
  { id: "sold_desc", label: "ขายดีที่สุด" },
  { id: "sold_asc", label: "ขายน้อยที่สุด" },
  { id: "revenue_desc", label: "รายได้สูงสุด" },
];

/** ตาราง Rating Product ของเว็บ — คนละ sort set กับ Top Product. */
export type RatingSort = "rating_desc" | "rating_asc" | "reviews_desc";

export const RATING_SORT_OPTIONS: { id: RatingSort; label: string }[] = [
  { id: "rating_desc", label: "คะแนนสูงสุด" },
  { id: "rating_asc", label: "คะแนนต่ำสุด" },
  { id: "reviews_desc", label: "รีวิวมากสุด" },
];

export function sortRatingProducts(list: TopProduct[], sort: RatingSort): TopProduct[] {
  const arr = [...list];
  switch (sort) {
    case "rating_asc": return arr.sort((a, b) => a.rating - b.rating);
    case "reviews_desc": return arr.sort((a, b) => b.reviews - a.reviews);
    default: return arr.sort((a, b) => b.rating - a.rating);
  }
}

export function sortTopProducts(list: TopProduct[], sort: TopProductSort): TopProduct[] {
  const arr = [...list];
  switch (sort) {
    case "sold_asc": return arr.sort((a, b) => a.sold - b.sold);
    case "revenue_desc": return arr.sort((a, b) => b.revenue - a.revenue);
    default: return arr.sort((a, b) => b.sold - a.sold);
  }
}

/** รายได้เฉลี่ยต่อชิ้น = รายได้ ÷ ยอดขาย (web's เฉลี่ย/ชิ้น column). */
export const avgPerUnit = (p: TopProduct) => (p.sold > 0 ? Math.round(p.revenue / p.sold) : 0);

/** ยอดส่วนลดต่อรายการ — web's itemDiscount: deterministic 0–17% of revenue. */
export function productDiscount(p: TopProduct): number {
  const seed = Array.from(p.name).reduce((a, c) => a + c.charCodeAt(0), 0);
  const pct = seed % 4 === 0 ? 0 : (seed % 18) / 100;
  return Math.round(p.revenue * pct);
}

/** กรองตามช่วงเวลา — same scaling rule the customer table uses. */
export function productsForPeriod(period: Period, monthIdx: number): TopProduct[] {
  const hash = period.length * 11 + monthIdx * 7;
  const scale = period === "daily" ? 0.35 : period === "weekly" ? 0.7 : period === "yearly" ? 12 : 1;
  return TOP_PRODUCTS.map((p, i) => {
    const drop = period === "daily" ? (i + hash) % 3 === 0 : period === "weekly" ? (i + hash) % 5 === 0 : false;
    if (drop) return { ...p, sold: 0, revenue: 0 };
    return { ...p, sold: Math.max(1, Math.round(p.sold * scale)), revenue: Math.max(1, Math.round(p.revenue * scale)) };
  }).filter((p) => p.sold > 0);
}

/** กรองเฉพาะจุดที่เลือกบนกราฟ (web focusedLabel). */
export function focusProducts(list: TopProduct[], label: string, bucketUnits: number): TopProduct[] {
  if (bucketUnits <= 0 || list.length === 0) return [];
  const hash = Array.from(label).reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const rotateBy = hash % list.length;
  const take = Math.max(1, Math.min(list.length, Math.round(bucketUnits / 8)));
  return [...list.slice(rotateBy), ...list.slice(0, rotateBy)]
    .slice(0, take)
    .map((p, i) => ({
      ...p,
      sold: Math.max(1, Math.round(p.sold * (1 - i * 0.08))),
      revenue: Math.max(1, Math.round(p.revenue * (0.4 + (((hash + i) % 60) / 100)))),
    }));
}

export type Channel = { name: string; type: string; visits: number; orders: number; revenue: number; cost: number; initial: string; bg: string; fg: string };

export const CHANNELS: Channel[] = [
  { name: "Google Search", type: "Organic", visits: 1240, orders: 52, revenue: 24800, cost: 0, initial: "G", bg: "#fff", fg: "#4285f4" },
  { name: "TikTok", type: "Social", visits: 1450, orders: 45, revenue: 19800, cost: 2200, initial: "T", bg: "#0f0f0f", fg: "#fff" },
  { name: "Facebook", type: "Social", visits: 980, orders: 38, revenue: 18200, cost: 1500, initial: "f", bg: "#1877f2", fg: "#fff" },
  { name: "Google Ads", type: "Paid", visits: 890, orders: 31, revenue: 16500, cost: 3200, initial: "Ad", bg: "#fef3c7", fg: "#a16207" },
  { name: "Instagram", type: "Social", visits: 720, orders: 28, revenue: 14600, cost: 1200, initial: "I", bg: "#fce7f3", fg: "#be185d" },
  { name: "Line OA", type: "Direct", visits: 540, orders: 22, revenue: 12300, cost: 800, initial: "L", bg: "#dcfce7", fg: "#15803d" },
  { name: "Email Marketing", type: "Direct", visits: 320, orders: 18, revenue: 8400, cost: 200, initial: "@", bg: "#fee2e2", fg: "#b91c1c" },
  { name: "Direct (URL)", type: "Direct", visits: 280, orders: 12, revenue: 6800, cost: 0, initial: "U", bg: "#f3f4f6", fg: "#525252" },
  { name: "Affiliate", type: "Partner", visits: 210, orders: 9, revenue: 5400, cost: 540, initial: "Af", bg: "#e0e7ff", fg: "#4338ca" },
  { name: "YouTube", type: "Social", visits: 180, orders: 6, revenue: 3200, cost: 600, initial: "Y", bg: "#fee2e2", fg: "#b91c1c" },
];

export const CHANNEL_TYPE_COLOR: Record<string, { bg: string; fg: string }> = {
  Organic: { bg: "#dcfce7", fg: "#15803d" },
  Social: { bg: "#fce7f3", fg: "#be185d" },
  Paid: { bg: "#fef3c7", fg: "#a16207" },
  Direct: { bg: "#dbeafe", fg: "#1e40af" },
  Partner: { bg: "#e0e7ff", fg: "#4338ca" },
};


/* ---------- Market table (ประสิทธิภาพช่องทาง) ---------- */

export type ChannelSort = "revenue_desc" | "conv_desc" | "visits_desc" | "roas_desc";

export const CHANNEL_SORT_OPTIONS: { id: ChannelSort; label: string }[] = [
  { id: "revenue_desc", label: "รายได้สูงสุด" },
  { id: "visits_desc", label: "ผู้เข้าชมมากสุด" },
  { id: "conv_desc", label: "Conv. Rate สูงสุด" },
  { id: "roas_desc", label: "ROAS สูงสุด" },
];

/** อัตราคอนเวิร์ต + ROAS ของช่องทาง (organic = ไม่มีต้นทุน → ROAS = null). */
export function channelStats(ch: Channel) {
  const conv = ch.visits > 0 ? (ch.orders / ch.visits) * 100 : 0;
  const roas = ch.cost > 0 ? ch.revenue / ch.cost : null;
  return { conv, roas };
}

/** สีแบรนด์จริงของแต่ละแพลตฟอร์ม (ไล่เฉดหัวการ์ด: เข้ม → อ่อน). */
export const CHANNEL_BRAND: Record<string, [string, string]> = {
  "Google Search": ["#1a73e8", "#4285f4"], // Google blue
  TikTok: ["#2b2b2b", "#4a4a4a"],          // เทาเข้ม → เทา (พื้นให้โลโก้สีจริงเด่น)
  Facebook: ["#1877F2", "#42A5F5"],
  "Google Ads": ["#3C8BD9", "#FBBC04"],    // ฟ้า → เหลือง Ads
  Instagram: ["#833AB4", "#FD1D1D"],       // ม่วง → แดง (ไล่เฉด IG)
  "Line OA": ["#06C755", "#33D375"],
  "Email Marketing": ["#C5221F", "#EA4335"],
  "Direct (URL)": ["#475569", "#94A3B8"],
  Affiliate: ["#4338CA", "#818CF8"],
  YouTube: ["#CC0000", "#FF0000"],
};

/** สีเดี่ยวของช่องทาง (ring/จุด) — เฉดเข้มของแบรนด์นั้น. */
export const channelColor = (ch: Channel) =>
  CHANNEL_BRAND[ch.name]?.[0] ?? (ch.fg.toLowerCase().startsWith("#fff") ? ch.bg : ch.fg);

/** ไล่เฉดสำหรับหัวการ์ด. */
export const channelGradient = (ch: Channel): [string, string] => {
  const brand = CHANNEL_BRAND[ch.name];
  if (brand) return brand;
  const c = channelColor(ch);
  return [c, c + "cc"];
};

export function sortChannels(list: Channel[], sort: ChannelSort): Channel[] {
  const arr = [...list];
  switch (sort) {
    case "conv_desc": return arr.sort((a, b) => channelStats(b).conv - channelStats(a).conv);
    case "visits_desc": return arr.sort((a, b) => b.visits - a.visits);
    case "roas_desc": return arr.sort((a, b) => (channelStats(b).roas ?? 0) - (channelStats(a).roas ?? 0));
    default: return arr.sort((a, b) => b.revenue - a.revenue);
  }
}

/** กรองตามช่วงเวลา — same scaling rule the customer/product tables use. */
export function channelsForPeriod(period: Period, monthIdx: number): Channel[] {
  const hash = period.length * 17 + monthIdx * 3;
  const scale = period === "daily" ? 0.35 : period === "weekly" ? 0.7 : period === "yearly" ? 12 : 1;
  // No dropping here (unlike customers/products): a marketing channel doesn't
  // vanish on a slow day — it just gets fewer visits. Dropping it hid TikTok /
  // YouTube from the list entirely.
  return CHANNELS.map((ch, i) => {
    return {
      ...ch,
      visits: Math.max(1, Math.round(ch.visits * scale)),
      orders: Math.max(1, Math.round(ch.orders * scale)),
      revenue: Math.max(1, Math.round(ch.revenue * scale)),
      cost: Math.round(ch.cost * scale),
    };
  });
}

/** กรองเฉพาะจุดที่เลือกบนกราฟ (web focusedLabel). */
export function focusChannels(list: Channel[], label: string, bucketVisits: number): Channel[] {
  if (bucketVisits <= 0 || list.length === 0) return [];
  const hash = Array.from(label).reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const rotateBy = hash % list.length;
  const take = Math.max(1, Math.min(list.length, Math.round(bucketVisits / 120)));
  return [...list.slice(rotateBy), ...list.slice(0, rotateBy)]
    .slice(0, take)
    .map((ch, i) => ({
      ...ch,
      visits: Math.max(1, Math.round(ch.visits * (1 - i * 0.08))),
      orders: Math.max(1, Math.round(ch.orders * (0.5 + (((hash + i) % 50) / 100)))),
      revenue: Math.max(1, Math.round(ch.revenue * (0.4 + (((hash + i) % 60) / 100)))),
    }));
}
