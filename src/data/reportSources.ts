/**
 * The report cards, fed from the orders table.
 *
 * The card UI was built against the mock rows in `salesReport.ts`; the reports
 * now read what the shop has actually sold (`store/analytics`). This module is
 * the seam: it projects real orders into the shapes the cards already render,
 * and it is explicit about the three things an order simply cannot tell us.
 *
 *   REAL   — ยอดขาย, รายได้, ออเดอร์, ลูกค้า, ซื้อล่าสุด, สินค้าที่ซื้อบ่อย, AOV
 *   REAL   — คะแนนสินค้า, หมวดหมู่  (from the catalog row the order line points at)
 *   MOCK   — ผู้เข้าชม / Conv. Rate / ROAS: no analytics pipeline exists, so the
 *            marketing report keeps `CHANNELS`. Same call the teammate made.
 *   MOCK   — จำนวนรีวิว: nobody stores reviews yet. The rating table shows the
 *            product's order count instead, which is real.
 */
import { useMemo } from "react";
import { useShopOrderRows } from "./shopOrderView";
import { METAHERB_SHOP } from "./shopOrders";
import { REAL_PRODUCTS } from "./realProducts";
import { customerStats, topProducts, totals, unitsOf, countsAsRevenue } from "../store/analytics";
import { CATEGORIES } from "./catalog";
import type { Customer, TopProduct } from "./salesReport";

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const thDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]}`;
};
const daysSince = (ts: number) => Math.max(0, Math.floor((Date.now() - ts) / 86_400_000));

/** Avatar tints, keyed off the buyer's segment (kept from the mock palette). */
const GROUP_TINT: Record<string, { bg: string; fg: string }> = {
  VIP: { bg: "#fef3c7", fg: "#b45309" },
  ประจำ: { bg: "#dcfce7", fg: "#15803d" },
  ใหม่: { bg: "#dbeafe", fg: "#1e40af" },
};

/** ลูกค้าจริงของร้าน — projected into the Customer shape the cards render. */
export function useReportCustomers(): Customer[] {
  const orders = useShopOrderRows(METAHERB_SHOP);
  return useMemo(() => {
    const live = orders.filter(countsAsRevenue);
    const lastAt = new Map<string, number>();
    for (const o of live) lastAt.set(o.userId, Math.max(lastAt.get(o.userId) ?? 0, o.createdAt));

    return customerStats(orders).map((c) => {
      // Segment from behaviour, not from a stored label: ≥3 orders = VIP, 2 = ประจำ,
      // 1 = ใหม่ — the same buckets the teammate's version used.
      const group = c.orders >= 3 ? "VIP" : c.orders === 2 ? "ประจำ" : "ใหม่";
      const tint = GROUP_TINT[group];
      const last = lastAt.get(c.userId) ?? c.firstAt;
      const fav = topProducts(live.filter((o) => o.userId === c.userId), 1)[0]?.name ?? "—";
      const contact = live.find((o) => o.userId === c.userId)?.recipient.phone ?? "";
      return {
        id: c.userId,
        name: c.name,
        // Orders carry a phone, not an email — show what we actually have.
        email: contact,
        group,
        initial: c.name.replace(/^คุณ\s*/, "").trim().charAt(0) || "?",
        bg: tint.bg,
        fg: tint.fg,
        orders: c.orders,
        total: c.total,
        lastBuy: thDate(last),
        daysAgo: daysSince(last),
        fav,
      };
    });
  }, [orders]);
}

const CAT_LABEL = new Map(CATEGORIES.map((c) => [c.key, c.label]));
const CATALOG_BY_ID = new Map(REAL_PRODUCTS.map((p) => [p.id, p]));

/** สินค้าที่ขายได้จริง — units/revenue from the order lines, rating/category from
 *  the catalog row each line points at. `reviews` carries the product's ORDER
 *  COUNT (there is no review store), which the rating card labels as such. */
export function useReportProducts(): TopProduct[] {
  const orders = useShopOrderRows(METAHERB_SHOP);
  return useMemo(
    () =>
      topProducts(orders, 100).map((p) => {
        const cat = CATALOG_BY_ID.get(p.productId);
        return {
          name: p.name,
          category: (cat && CAT_LABEL.get(cat.category)) || "ไม่ระบุหมวดหมู่",
          sold: p.units,
          revenue: p.sales,
          rating: cat?.rating ?? 0,
          reviews: p.orders,
        };
      }),
    [orders],
  );
}

/** ตัวเลขหัวรายงาน — คิดจากออเดอร์จริงทั้งหมดของร้าน. */
export function useReportKpis() {
  const orders = useShopOrderRows(METAHERB_SHOP);
  return useMemo(() => {
    const t = totals(orders);
    const buyers = customerStats(orders);
    const newCust = buyers.filter((b) => b.orders === 1).length;
    const repeat = buyers.filter((b) => b.orders > 1).length;
    const sold = topProducts(orders, 999);
    const lifetime = buyers.reduce((s, b) => s + b.total, 0);
    return {
      ...t,
      newCust,
      repeat,
      buyers: buyers.length,
      lifetimeAvg: buyers.length ? Math.round(lifetime / buyers.length) : 0,
      distinctProducts: sold.length,
      units: orders.filter(countsAsRevenue).reduce((s, o) => s + unitsOf(o), 0),
      avgRating: sold.length
        ? sold.reduce((s, p) => s + (CATALOG_BY_ID.get(p.productId)?.rating ?? 0), 0) / sold.length
        : 0,
    };
  }, [orders]);
}
