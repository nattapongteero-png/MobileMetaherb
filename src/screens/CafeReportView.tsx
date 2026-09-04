/**
 * รายงานยอดขาย Meta Cafe (17.5) — an embedded section of the café console
 * (it used to be its own page; the numbers belong right under the ยอดขาย card).
 *
 * Everything here follows the console's ช่วงเวลา + วันที่ selection, the same
 * Period / DateRange pair the shop's report views use — so the card on top and
 * the figures below always describe the same window. Figures derive live from
 * the shared café order store, so POS and customer-app sales count alike.
 */
import { useMemo } from "react";
import { View, Text } from "react-native";
import { BarChart3, Coffee } from "lucide-react-native";
import { SalesChart } from "../components/SalesChart";
import { EmptyState } from "../components/EmptyState";
import { TH_SHORT, type DateRange, type DateSel } from "../components/SalesDatePicker";
import { BRAND_GREEN, DIVIDER_GRAY, TEXT_MUTED } from "../theme/tokens";
import { useStore } from "../store/db";
import { cafeStore, type CafeOrder } from "../store/cafe";
import { cafeAdminStore, cafeHours, type CafeDayId } from "../store/cafeAdmin";
import { adminCafeMenu } from "../data/cafeAdminMenu";
import { CafeMenuCard } from "./CafeMenuManageScreen";
import type { Period } from "../data/salesReport";

const TH_DAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
/** Sunday-first, to index cafeHours by JS getDay(). */
const DAY_IDS: CafeDayId[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** พ.ศ. → ค.ศ. — DateSel carries Buddhist years. */
const gy = (s: DateSel) => s.year - 543;
const dayStart = (s: DateSel) => new Date(gy(s), s.month, s.day).getTime();

type Bucket = { label: string; from: number; to: number };

/**
 * How the selected window is sliced into bars — the same rule the shop's
 * รายงานผลยอดขาย follows (see reportBuckets in ShopSalesReportView): a single
 * point shows that period's own breakdown, a range fans out one bar per unit.
 *
 *   วัน      จุดเดียว → ชั่วโมงของวันนั้น   ช่วง → รายวัน
 *   สัปดาห์  สัปดาห์ที่ 1–5 ของเดือนนั้น (ไม่มีช่วง — picker locks it to a month)
 *   เดือน    จุดเดียว → 12 เดือนของปีนั้น  ช่วง → รายเดือน
 *   ปี       จุดเดียว → 5 ปีล่าสุด          ช่วง → รายปี
 *
 * The one café-specific tweak: the hourly breakdown covers the shop's own
 * opening hours rather than the shop console's fixed 4-hour blocks — a café
 * that opens 08:00–17:00 would otherwise read as three bars.
 */
export function cafeBuckets(period: Period, r: DateRange): Bucket[] {
  const single = JSON.stringify(r.start) === JSON.stringify(r.end);
  const out: Bucket[] = [];

  if (period === "daily") {
    // จุดเดียว → ชั่วโมงของวันนั้น
    if (single) {
      const y = gy(r.start), m = r.start.month, d = r.start.day;
      const hours = cafeHours()[DAY_IDS[new Date(y, m, d).getDay()]];
      const openH = Number(hours.open.slice(0, 2));
      const closeH = Number(hours.close.slice(0, 2));
      for (let h = openH; h <= closeH; h++) {
        out.push({
          label: `${String(h).padStart(2, "0")}:00`,
          from: new Date(y, m, d, h).getTime(),
          to: new Date(y, m, d, h + 1).getTime(),
        });
      }
      return out;
    }
    // ช่วง → รายวัน
    let cur = new Date(gy(r.start), r.start.month, r.start.day);
    const last = dayStart(r.end);
    while (cur.getTime() <= last && out.length < 366) {
      const next = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      out.push({ label: `${TH_DAY[cur.getDay()]} ${cur.getDate()}`, from: cur.getTime(), to: next.getTime() });
      cur = next;
    }
    return out;
  }

  if (period === "weekly") {
    const y = gy(r.start), m = r.start.month;
    const dim = new Date(y, m + 1, 0).getDate();
    let n = 0;
    for (let start = 1; start <= dim; start += 7) {
      const stop = Math.min(start + 6, dim);
      n += 1;
      out.push({ label: `สัปดาห์ ${n}`, from: new Date(y, m, start).getTime(), to: new Date(y, m, stop + 1).getTime() });
    }
    return out;
  }

  if (period === "monthly") {
    // จุดเดียว → ทั้งปีนั้น; ช่วง → เฉพาะเดือนในช่วง
    const from: DateSel = single ? { day: 1, month: 0, year: r.start.year } : r.start;
    const to: DateSel = single ? { day: 1, month: 11, year: r.start.year } : r.end;
    const crossYear = from.year !== to.year;
    let y = gy(from), m = from.month;
    while ((y < gy(to) || (y === gy(to) && m <= to.month)) && out.length < 60) {
      out.push({
        label: crossYear ? `${TH_SHORT[m]} ${String(y + 543).slice(-2)}` : TH_SHORT[m],
        from: new Date(y, m, 1).getTime(),
        to: new Date(y, m + 1, 1).getTime(),
      });
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return out;
  }

  // ปี — จุดเดียว → 5 ปีล่าสุดถึงปีที่เลือก; ช่วง → ปีต่อปี
  const firstY = single ? gy(r.start) - 4 : gy(r.start);
  for (let y = firstY; y <= gy(r.end) && out.length < 20; y++) {
    out.push({ label: String(y + 543), from: new Date(y, 0, 1).getTime(), to: new Date(y + 1, 0, 1).getTime() });
  }
  return out;
}

/**
 * The window every figure shares — the exact span the chart draws, so the card's
 * ยอดขาย and เมนูขายดี can never disagree with the bars (the shop's report
 * computes its KPIs off the same buckets).
 */
export function cafeRangeMs(period: Period, r: DateRange): { from: number; to: number } {
  const b = cafeBuckets(period, r);
  return { from: b[0]?.from ?? 0, to: b[b.length - 1]?.to ?? 0 };
}

const inWindow = (o: CafeOrder, from: number, to: number) => o.readyAt >= from && o.readyAt < to;

/** Total baht in the window — the headline the ยอดขาย card shows. */
export const cafeSalesIn = (orders: CafeOrder[], from: number, to: number): number =>
  orders.reduce((s, o) => (inWindow(o, from, to) ? s + o.total : s), 0);

export function CafeReportSection({ period, range }: { period: Period; range: DateRange }) {
  useStore(cafeStore);
  const adminState = useStore(cafeAdminStore);
  const orders = cafeStore.get();
  const { from, to } = cafeRangeMs(period, range);

  const points = useMemo(
    () =>
      cafeBuckets(period, range).map((b) => {
        const p = { label: b.label, sales: 0, orders: 0, visits: 0, newCust: 0, repeat: 0, units: 0, topProduct: "-" };
        for (const o of orders) {
          if (!inWindow(o, b.from, b.to)) continue;
          p.sales += o.total;
          p.orders += 1;
          p.units += o.items.reduce((s, it) => s + it.qty, 0);
        }
        return p;
      }),
    [orders, period, range],
  );

  // เมนูขายดี — top sellers inside the selected window, matched back to the
  // menu so each one renders as its own จัดการเมนู card (read-only here).
  const menu = adminCafeMenu(adminState);
  const topItems = useMemo(() => {
    const byName = new Map<string, { qty: number; total: number }>();
    for (const o of orders) {
      if (!inWindow(o, from, to)) continue;
      for (const it of o.items) {
        const cur = byName.get(it.name) ?? { qty: 0, total: 0 };
        byName.set(it.name, { qty: cur.qty + it.qty, total: cur.total + it.total });
      }
    }
    return [...byName.entries()]
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 5)
      .map(([name, v]) => ({ name, ...v, item: menu.find((m) => m.name === name) }));
  }, [orders, from, to, menu]);

  const single = JSON.stringify(range.start) === JSON.stringify(range.end);
  const chartTitle =
    period === "daily" ? (single ? "ยอดขายรายชั่วโมง" : "ยอดขายรายวัน")
    : period === "weekly" ? "ยอดขายรายสัปดาห์"
    : period === "monthly" ? "ยอดขายรายเดือน"
    : "ยอดขายรายปี";

  return (
    <>
      {/* ยอดขาย — the shared dual-series chart (ยอดขาย · ออเดอร์) */}
      <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 12, gap: 4 }}>
        <View className="flex-row items-center" style={{ gap: 8, paddingHorizontal: 4 }}>
          <BarChart3 size={15} color={BRAND_GREEN} strokeWidth={2.2} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{chartTitle}</Text>
        </View>
        <SalesChart data={points} type="bar" />
      </View>

      {/* เมนูขายดี — the จัดการเมนู card, read-only, with this period's numbers */}
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a", marginBottom: -6 }}>เมนูขายดี</Text>
      {topItems.length === 0 ? (
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 16 }}>
          <EmptyState icon={<Coffee size={30} color="#9ca3af" />} title="ยังไม่มียอดขายในช่วงนี้" subtitle="ลองเลือกช่วงเวลาอื่น หรือรอออเดอร์แรกของวัน" iconBgSize={56} />
        </View>
      ) : (
        topItems.map((t) =>
          t.item ? (
            <CafeMenuCard key={t.name} item={t.item} stats={{ sold: t.qty, revenue: t.total }} showStatus={false} />
          ) : (
            /* Menu deleted since it sold — keep the sales visible, plainly. */
            <View key={t.name} className="flex-row items-center" style={{ gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 14 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 13.5, fontWeight: "600", color: "#0a0a0a" }}>{t.name}</Text>
              <Text style={{ fontSize: 12, color: TEXT_MUTED }}>{t.qty} แก้ว</Text>
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#0a0a0a" }}>฿{t.total.toLocaleString()}</Text>
            </View>
          ),
        )
      )}
    </>
  );
}
