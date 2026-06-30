import { useMemo, useState, type ReactNode } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  UserPlus, Repeat, Users, Store, Package, Boxes, AlertTriangle, Star,
  Eye, ShoppingCart, TrendingUp, Ticket, BarChart3, LineChart, type LucideIcon,
} from "lucide-react-native";
import { SalesChart } from "../components/SalesChart";
import { PeriodTabs, ShopSalesReportView } from "./ShopSalesReportView";
import { SubPageHeader } from "../components/SubPageHeader";
import { SalesDatePicker, salesDateLabel, type DateSel } from "../components/SalesDatePicker";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  REPORT_DATA, sumField, fmtBaht,
  CUSTOMERS, CUSTOMER_GROUP_COLOR, TOP_PRODUCTS, CHANNELS, CHANNEL_TYPE_COLOR, GP_RATE,
  type Period, type SeriesKey,
} from "../data/salesReport";
import { BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";

export type ReportKind = "customers" | "products" | "market";

type Ser = { key: SeriesKey; color: string; label: string };
const SERIES: Record<ReportKind, [Ser, Ser]> = {
  customers: [{ key: "newCust", color: "#3b82f6", label: "ลูกค้าใหม่" }, { key: "repeat", color: "#319754", label: "ซื้อซ้ำ" }],
  products: [{ key: "units", color: "#319754", label: "จำนวนขาย" }, { key: "sales", color: "#ec4899", label: "รายได้ (฿)" }],
  market: [{ key: "visits", color: "#7c3aed", label: "ผู้เข้าชม" }, { key: "orders", color: "#f59e0b", label: "ออเดอร์" }],
};
const CHART_TITLE: Record<ReportKind, string> = { customers: "ลูกค้าใหม่ & ซื้อซ้ำ", products: "จำนวนขาย & รายได้", market: "การเข้าชม & คอนเวิร์ต" };
const TABLE_TITLE: Record<ReportKind, string> = { customers: "ลูกค้าที่มียอดซื้อสูงสุด", products: "สินค้าขายดี", market: "ประสิทธิภาพช่องทาง" };

function Card({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececec", padding: 16 }}>{children}</View>;
}

type Kpi = { label: string; value: string; sub: string; accent: string; Icon: LucideIcon; SubIcon: LucideIcon };
function KpiCard({ k }: { k: Kpi }) {
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, borderRadius: 16, overflow: "hidden", backgroundColor: k.accent + "0d", padding: 14 }}>
      <View style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30, borderRadius: 10, backgroundColor: k.accent + "1a", alignItems: "center", justifyContent: "center" }}>
        <k.Icon size={16} color={k.accent} strokeWidth={2} />
      </View>
      <View style={{ gap: 10 }}>
        <Text numberOfLines={1} style={{ fontSize: 12, color: "#6b7280", paddingRight: 36 }}>{k.label}</Text>
        <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: "700", color: k.accent, letterSpacing: -0.3 }}>{k.value}</Text>
        <View className="flex-row items-center" style={{ alignSelf: "flex-start", gap: 3, backgroundColor: k.accent + "15", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
          <k.SubIcon size={10} color={k.accent} strokeWidth={2.4} />
          <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: "600", color: k.accent }}>{k.sub}</Text>
        </View>
      </View>
    </View>
  );
}

function Avatar({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: bg, borderWidth: 1, borderColor: "#eee", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 12.5, fontWeight: "800", color: fg }}>{text}</Text>
    </View>
  );
}

function TypePill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: bg, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, marginTop: 2 }}>
      <Text style={{ fontSize: 10, fontWeight: "600", color: fg }}>{label}</Text>
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <View className="flex-row items-center" style={{ gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f3f3" }}>{children}</View>;
}

/** รายงานข้อมูลลูกค้า / สินค้า / Market — KPIs + chart + table (ported from web). */
export function ShopReportView({ kind, period, setPeriod, dateSel }: { kind: ReportKind; period: Period; setPeriod: (p: Period) => void; dateSel: DateSel }) {
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const data = REPORT_DATA[period];
  const scope = salesDateLabel(period, dateSel);
  const days = Math.max(1, data.filter((d) => d.visits > 0).length);

  const kpis: Kpi[] = useMemo(() => {
    if (kind === "customers") {
      const nc = sumField(data, "newCust"), rp = sumField(data, "repeat"), tot = nc + rp;
      return [
        { label: `ลูกค้าใหม่ ${scope}`, value: `${nc.toLocaleString()} คน`, sub: `เฉลี่ย ${Math.round(nc / days)} คน/วัน`, accent: "#3b82f6", Icon: UserPlus, SubIcon: TrendingUp },
        { label: `ลูกค้าซื้อซ้ำ ${scope}`, value: `${rp.toLocaleString()} คน`, sub: `เฉลี่ย ${Math.round(rp / days)} คน/วัน`, accent: "#319754", Icon: Repeat, SubIcon: TrendingUp },
        { label: `ลูกค้าทั้งหมด ${scope}`, value: `${tot.toLocaleString()} คน`, sub: `เฉลี่ย ${Math.round(tot / days)} คน/วัน`, accent: "#0ea5e9", Icon: Users, SubIcon: TrendingUp },
        { label: "ลูกค้าทั้งหมดในร้าน", value: "1,247 คน", sub: `+${nc} คนใหม่`, accent: "#10b981", Icon: Store, SubIcon: UserPlus },
      ];
    }
    if (kind === "products") {
      const u = sumField(data, "units");
      return [
        { label: `จำนวนขาย ${scope}`, value: `${u.toLocaleString()} ชิ้น`, sub: `เฉลี่ย ${Math.round(u / days)} ชิ้น/วัน`, accent: "#319754", Icon: Package, SubIcon: TrendingUp },
        { label: "สินค้าทั้งหมดในร้าน", value: "247 รายการ", sub: "9 หมวดหมู่", accent: "#0ea5e9", Icon: Boxes, SubIcon: Boxes },
        { label: "สต็อกต่ำ / หมด", value: "4 รายการ", sub: "1 รายการสินค้าหมด", accent: "#dc2626", Icon: AlertTriangle, SubIcon: AlertTriangle },
        { label: "รีวิวเฉลี่ยร้าน", value: "4.6 ★", sub: "1,247 รีวิวรวม", accent: "#f59e0b", Icon: Star, SubIcon: Star },
      ];
    }
    const v = sumField(data, "visits"), o = sumField(data, "orders"), conv = v > 0 ? (o / v) * 100 : 0;
    return [
      { label: `ผู้เข้าชม ${scope}`, value: `${v.toLocaleString()} คน`, sub: `เฉลี่ย ${Math.round(v / days)} คน/วัน`, accent: "#7c3aed", Icon: Eye, SubIcon: TrendingUp },
      { label: `ออเดอร์ ${scope}`, value: `${o.toLocaleString()} รายการ`, sub: `เฉลี่ย ${Math.round(o / days)} /วัน`, accent: "#f59e0b", Icon: ShoppingCart, SubIcon: TrendingUp },
      { label: `อัตราคอนเวิร์ต ${scope}`, value: `${conv.toFixed(2)}%`, sub: `${o} จาก ${v.toLocaleString()} ครั้ง`, accent: "#10b981", Icon: TrendingUp, SubIcon: TrendingUp },
      { label: "คูปองที่ใช้", value: "32 ครั้ง", sub: "8 คูปองล่าสุด", accent: "#ec4899", Icon: Ticket, SubIcon: Ticket },
    ];
  }, [kind, data, scope, days]);

  return (
    <View style={{ gap: 12 }}>
      <PeriodTabs period={period} onChange={setPeriod} />

      {/* KPI cards — white card, separate from the chart */}
      <Card>
        <View className="flex-row" style={{ flexWrap: "wrap", gap: 10 }}>
          {kpis.map((k) => <KpiCard key={k.label} k={k} />)}
        </View>
      </Card>

      {/* Chart */}
      <Card>
        <View className="flex-row items-center justify-between" style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>{CHART_TITLE[kind]}</Text>
          <View className="flex-row" style={{ backgroundColor: "#f2f2f2", borderRadius: 999, padding: 3, gap: 2 }}>
            {([["line", LineChart], ["bar", BarChart3]] as const).map(([t, Icon]) => {
              const on = chartType === t;
              return (
                <Pressable key={t} onPress={() => setChartType(t)} className="active:opacity-80" style={{ width: 34, height: 26, borderRadius: 999, backgroundColor: on ? "#fff" : "transparent", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} color={on ? BRAND_GREEN_DARK : "#9ca3af"} strokeWidth={2.2} />
                </Pressable>
              );
            })}
          </View>
        </View>
        <SalesChart data={data} type={chartType} series={SERIES[kind]} />
      </Card>

      {/* Table */}
      <Card>
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 6 }}>{TABLE_TITLE[kind]}</Text>

        {kind === "customers" && [...CUSTOMERS].sort((a, b) => b.total - a.total).map((c) => {
          const g = CUSTOMER_GROUP_COLOR[c.group] ?? { bg: "#f3f4f6", fg: "#525252" };
          return (
            <Row key={c.id}>
              <Avatar text={c.initial} bg={c.bg} fg={c.fg} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>{c.name}</Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{c.orders} ออเดอร์ · {c.fav}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN_DARK }}>{fmtBaht(c.total)}</Text>
                <TypePill label={c.group} bg={g.bg} fg={g.fg} />
              </View>
            </Row>
          );
        })}

        {kind === "products" && [...TOP_PRODUCTS].sort((a, b) => b.sold - a.sold).map((p, i) => (
          <Row key={p.name}>
            <View style={{ width: 26, alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: i < 3 ? "#b45309" : "#a3a3a3" }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>{p.name}</Text>
              <Text numberOfLines={1} style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{p.category} · ★ {p.rating} ({p.reviews})</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN_DARK }}>{fmtBaht(p.revenue)}</Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>ขาย {p.sold} ชิ้น</Text>
            </View>
          </Row>
        ))}

        {kind === "market" && [...CHANNELS].sort((a, b) => b.revenue - a.revenue).map((ch) => {
          const t = CHANNEL_TYPE_COLOR[ch.type] ?? { bg: "#f3f4f6", fg: "#525252" };
          const conv = ch.visits > 0 ? (ch.orders / ch.visits) * 100 : 0;
          const roas = ch.cost > 0 ? ch.revenue / ch.cost : 0;
          return (
            <Row key={ch.name}>
              <Avatar text={ch.initial} bg={ch.bg} fg={ch.fg} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>{ch.name}</Text>
                <TypePill label={ch.type} bg={t.bg} fg={t.fg} />
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN_DARK }}>{fmtBaht(ch.revenue)}</Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>Conv {conv.toFixed(1)}% · {ch.cost > 0 ? `ROAS ${roas.toFixed(1)}x` : "Organic"}</Text>
              </View>
            </Row>
          );
        })}
      </Card>
    </View>
  );
}

const REPORT_TITLE: Record<string, string> = {
  sales: "รายงานผลยอดขาย",
  customers: "รายงานข้อมูลลูกค้า",
  products: "รายงานข้อมูลสินค้า",
  market: "รายงานการตลาด",
};

/** รายงาน — standalone subpage (header + date picker) hosting the matching report view. */
export function ShopReportScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { kind } = useRoute<RouteProp<RootStackParamList, "ShopReport">>().params;
  const [period, setPeriod] = useState<Period>("daily");
  const [dateSel, setDateSel] = useState<DateSel>(() => {
    const d = new Date();
    return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() + 543 };
  });
  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={REPORT_TITLE[kind]}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={<SalesDatePicker period={period} sel={dateSel} onChange={setDateSel} />}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        {kind === "sales" ? (
          <ShopSalesReportView period={period} setPeriod={setPeriod} dateSel={dateSel} />
        ) : (
          <ShopReportView kind={kind} period={period} setPeriod={setPeriod} dateSel={dateSel} />
        )}
      </ScrollView>
    </View>
  );
}
