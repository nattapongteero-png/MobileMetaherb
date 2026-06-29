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

export type Point = { label: string; sales: number; orders: number; topProduct: string };

const DAILY: Point[] = [
  { label: "00:00", sales: 0, orders: 0, topProduct: "-" },
  { label: "04:00", sales: 120, orders: 1, topProduct: "ใบบัวบกแคปซูล" },
  { label: "08:00", sales: 480, orders: 3, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "12:00", sales: 980, orders: 5, topProduct: "ฟ้าทะลายโจร" },
  { label: "16:00", sales: 1200, orders: 9, topProduct: "น้ำผึ้งดอกลำไย" },
  { label: "20:00", sales: 720, orders: 5, topProduct: "ชาเก๊กฮวยออร์แกนิก" },
];

const WEEKLY: Point[] = [
  { label: "สัปดาห์ 1", sales: 6420, orders: 38, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "สัปดาห์ 2", sales: 8950, orders: 54, topProduct: "ฟ้าทะลายโจร" },
  { label: "สัปดาห์ 3", sales: 11240, orders: 68, topProduct: "น้ำผึ้งดอกลำไย" },
  { label: "สัปดาห์ 4", sales: 9780, orders: 59, topProduct: "ชาเก๊กฮวยออร์แกนิก" },
  { label: "สัปดาห์ 5", sales: 4380, orders: 26, topProduct: "น้ำมันมะพร้าวสกัดเย็น" },
];

const MONTHLY: Point[] = [
  { label: "ม.ค.", sales: 18200, orders: 124, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "ก.พ.", sales: 16800, orders: 108, topProduct: "ฟ้าทะลายโจร" },
  { label: "มี.ค.", sales: 22400, orders: 151, topProduct: "น้ำผึ้งดอกลำไย" },
  { label: "เม.ย.", sales: 19600, orders: 132, topProduct: "ชาเก๊กฮวยออร์แกนิก" },
  { label: "พ.ค.", sales: 25800, orders: 173, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "มิ.ย.", sales: 28950, orders: 196, topProduct: "ฟ้าทะลายโจร" },
  { label: "ก.ค.", sales: 24100, orders: 162, topProduct: "น้ำผึ้งดอกลำไย" },
  { label: "ส.ค.", sales: 26700, orders: 181, topProduct: "ชามะรุม" },
  { label: "ก.ย.", sales: 21300, orders: 144, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "ต.ค.", sales: 23950, orders: 159, topProduct: "ฟ้าทะลายโจร" },
  { label: "พ.ย.", sales: 30200, orders: 205, topProduct: "น้ำผึ้งดอกลำไย" },
  { label: "ธ.ค.", sales: 32600, orders: 221, topProduct: "ชุดของขวัญสมุนไพร" },
];

const YEARLY: Point[] = [
  { label: "2565", sales: 124800, orders: 845, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "2566", sales: 168450, orders: 1124, topProduct: "น้ำผึ้งดอกลำไย" },
  { label: "2567", sales: 215300, orders: 1486, topProduct: "ฟ้าทะลายโจร" },
  { label: "2568", sales: 248920, orders: 1672, topProduct: "ขมิ้นชันแคปซูล" },
  { label: "2569", sales: 86420, orders: 542, topProduct: "ชาเก๊กฮวยออร์แกนิก" },
];

export const REPORT_DATA: Record<Period, Point[]> = { daily: DAILY, weekly: WEEKLY, monthly: MONTHLY, yearly: YEARLY };

export const PERIOD_SCOPE: Record<Period, string> = {
  daily: "วันนี้",
  weekly: "เดือนนี้",
  monthly: "ปีนี้",
  yearly: "5 ปีล่าสุด",
};

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

export type ProductSort = "sales_desc" | "sales_asc" | "qty_desc" | "margin_desc";

export const SORT_OPTIONS: { id: ProductSort; label: string }[] = [
  { id: "sales_desc", label: "ยอดขายสูงสุด" },
  { id: "sales_asc", label: "ยอดขายต่ำสุด" },
  { id: "qty_desc", label: "จำนวนขายสูงสุด" },
  { id: "margin_desc", label: "มาร์จิ้นสูงสุด" },
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
