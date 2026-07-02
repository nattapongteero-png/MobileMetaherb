import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { View, Text, Pressable, Animated, Image, type ImageSourcePropType } from "react-native";
import { DollarSign, ShoppingCart, FileText, TrendingUp, BarChart3, LineChart, ArrowDownUp, CheckCircle2, type LucideIcon } from "lucide-react-native";
import { SalesChart } from "../components/SalesChart";
import { salesDateLabel, type DateSel } from "../components/SalesDatePicker";
import {
  PERIODS,
  REPORT_DATA,
  computeKpi,
  fmtBaht,
  REGULAR_PRODUCTS,
  MARKET_PRODUCTS,
  SORT_OPTIONS,
  sortProducts,
  GP_RATE,
  type Period,
  type ProductSort,
  type SalesProduct,
} from "../data/salesReport";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";

// Same KPI illustrations as the web: coin / box / cost / coin-up.
const COIN_INCOME = require("../../assets/coins/cion.png");
const COIN_ORDERS = require("../../assets/coins/box-in-caer.png");
const COIN_COST = require("../../assets/coins/cost.png");
const COIN_PROFIT = require("../../assets/coins/cion-up.png");

function Card({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececec", padding: 16 }}>{children}</View>;
}

function KpiCard({ label, value, sub, accent, Icon, SubIcon, art }: { label: string; value: string; sub: string; accent: string; Icon: LucideIcon; SubIcon: LucideIcon; art: ImageSourcePropType }) {
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, borderRadius: 16, overflow: "hidden", backgroundColor: accent + "0d", padding: 14 }}>
      <Image source={art} style={{ position: "absolute", right: -4, bottom: -10, width: 66, height: 66, opacity: 0.55 }} resizeMode="contain" />
      {/* Icon floats top-right so it doesn't affect the title/value/sub vertical rhythm */}
      <View style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30, borderRadius: 10, backgroundColor: accent + "1a", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={accent} strokeWidth={2} />
      </View>
      <View style={{ gap: 10 }}>
        <Text numberOfLines={1} style={{ fontSize: 12, color: "#6b7280", paddingRight: 36 }}>{label}</Text>
        <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: "700", color: accent, letterSpacing: -0.3 }}>{value}</Text>
        <View className="flex-row items-center" style={{ alignSelf: "flex-start", gap: 3, backgroundColor: accent + "15", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
          <SubIcon size={10} color={accent} strokeWidth={2.4} />
          <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: "600", color: accent }}>{sub}</Text>
        </View>
      </View>
    </View>
  );
}

// Capsule period switcher with a sliding green pill — same pattern as the
// Knowledge (สาระความรู้) tab bar.
export function PeriodTabs({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const idx = Math.max(0, PERIODS.findIndex((p) => p.id === period));
  const pos = useRef(new Animated.Value(idx)).current;
  const [segW, setSegW] = useState(0);
  useEffect(() => {
    Animated.timing(pos, { toValue: idx, duration: 100, useNativeDriver: true }).start();
  }, [idx, pos]);
  const translateX = pos.interpolate({ inputRange: [0, PERIODS.length - 1], outputRange: [0, segW * (PERIODS.length - 1)] });
  return (
    <View
      onLayout={(e) => setSegW((e.nativeEvent.layout.width - 8) / PERIODS.length)}
      style={{ height: 42, borderRadius: 999, backgroundColor: "#fff", padding: 4, borderWidth: 1, borderColor: "#ececec" }}
    >
      {segW > 0 ? (
        <Animated.View style={{ position: "absolute", top: 4, left: 4, width: segW, height: 34, borderRadius: 999, backgroundColor: BRAND_GREEN, transform: [{ translateX }] }} />
      ) : null}
      <View style={{ flex: 1, flexDirection: "row" }}>
        {PERIODS.map((p) => {
          const on = p.id === period;
          return (
            <Pressable key={p.id} onPress={() => onChange(p.id)} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: on ? "700" : "600", color: on ? "#fff" : "#6b7280" }}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Pill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="active:opacity-80" style={{ height: 32, paddingHorizontal: 14, borderRadius: 999, backgroundColor: active ? BRAND_GREEN : "#f2f2f2", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : "#525252" }}>{label}</Text>
    </Pressable>
  );
}

function ProductRow({ p }: { p: SalesProduct }) {
  const net = p.sales * (1 - GP_RATE);
  const profit = Math.round(net - p.cost);
  const margin = p.sales > 0 ? (profit / p.sales) * 100 : 0;
  const profitColor = margin >= 45 ? "#15803d" : profit > 0 ? "#b45309" : "#dc2626";
  return (
    <View className="flex-row items-center" style={{ gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f3f3" }}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: p.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 13, fontWeight: "800", color: p.fg }}>{p.initial}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>{p.name}</Text>
        <Text numberOfLines={1} style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{p.sku} · ขาย {p.qty.toLocaleString()} {p.unit}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN_DARK }}>{fmtBaht(p.sales)}</Text>
        <Text style={{ fontSize: 11, fontWeight: "600", color: profitColor, marginTop: 1 }}>กำไร {margin.toFixed(0)}%</Text>
      </View>
    </View>
  );
}

/** รายงานผลยอดขาย — period KPIs + chart (one card) + product-sales table. */
export function ShopSalesReportView({ period, setPeriod, dateSel }: { period: Period; setPeriod: (p: Period) => void; dateSel: DateSel }) {
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [cat, setCat] = useState<"regular" | "market">("regular");
  const [sort, setSort] = useState<ProductSort>("sales_desc");

  const data = REPORT_DATA[period];
  const kpi = useMemo(() => computeKpi(data), [data]);
  const scope = salesDateLabel(period, dateSel);
  const products = useMemo(() => sortProducts(cat === "regular" ? REGULAR_PRODUCTS : MARKET_PRODUCTS, sort), [cat, sort]);
  const sortLabel = SORT_OPTIONS.find((s) => s.id === sort)?.label ?? "";
  const cycleSort = () => {
    const i = SORT_OPTIONS.findIndex((s) => s.id === sort);
    setSort(SORT_OPTIONS[(i + 1) % SORT_OPTIONS.length].id);
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Period tabs — capsule switcher (สาระความรู้ style) */}
      <PeriodTabs period={period} onChange={setPeriod} />

      {/* KPI cards — white card, separate from the chart */}
      <Card>
        <View className="flex-row" style={{ flexWrap: "wrap", gap: 10 }}>
          <KpiCard label={`รายได้ ${scope}`} value={fmtBaht(kpi.sales)} sub={`เฉลี่ย ${fmtBaht(kpi.avgSales)}/ช่วง`} accent="#10b981" Icon={DollarSign} SubIcon={BarChart3} art={COIN_INCOME} />
          <KpiCard label={`คำสั่งซื้อ ${scope}`} value={`${kpi.orders.toLocaleString()} ออเดอร์`} sub={`เฉลี่ย ฿${kpi.aov.toLocaleString()}/ออเดอร์`} accent="#0ea5e9" Icon={ShoppingCart} SubIcon={BarChart3} art={COIN_ORDERS} />
          <KpiCard label={`ต้นทุน ${scope}`} value={fmtBaht(kpi.cost)} sub={`${kpi.costRatio}% ของรายได้`} accent="#6366f1" Icon={FileText} SubIcon={CheckCircle2} art={COIN_COST} />
          <KpiCard label={`กำไร ${scope}`} value={fmtBaht(kpi.profit)} sub={`มาร์จิ้น ${kpi.margin.toFixed(1)}%`} accent="#f59e0b" Icon={TrendingUp} SubIcon={TrendingUp} art={COIN_PROFIT} />
        </View>
      </Card>

      {/* Chart */}
      <Card>
        <View className="flex-row items-center justify-between" style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>กราฟยอดขาย</Text>
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
        <SalesChart data={data} type={chartType} />
      </Card>

      {/* Product sales table */}
      <Card>
        <View className="flex-row items-center justify-between" style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>รายงานการขายสินค้า</Text>
          <Pressable onPress={cycleSort} className="flex-row items-center active:opacity-70" style={{ gap: 3 }}>
            <ArrowDownUp size={13} color={TEXT_MUTED} />
            <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>{sortLabel}</Text>
          </Pressable>
        </View>

        <View className="flex-row" style={{ gap: 8, marginBottom: 6 }}>
          <Pill active={cat === "regular"} label="สินค้าปกติ" onPress={() => setCat("regular")} />
          <Pill active={cat === "market"} label="Herbal Market" onPress={() => setCat("market")} />
        </View>

        <View>
          {products.map((p) => <ProductRow key={p.sku} p={p} />)}
        </View>
      </Card>
    </View>
  );
}
