import { startTransition, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { View, Text, Pressable, Animated, Image, LayoutAnimation, Dimensions, Modal, useWindowDimensions, type ImageSourcePropType } from "react-native";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { DollarSign, ShoppingCart, FileText, TrendingUp, TrendingDown, BarChart3, Package, Percent, CheckCircle2, ChevronDown, Check, CalendarDays, type LucideIcon } from "lucide-react-native";
import { AppleMenu } from "../components/AppleMenu";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { SalesChart, LegendPill, CHART_BLOCK_H } from "../components/SalesChart";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { salesDateLabel, weekRangeLabel, type DateRange } from "../components/SalesDatePicker";
import {
  PERIODS,
  REPORT_DATA,
  computeKpi,
  fmtBaht,
  REGULAR_PRODUCTS,
  MARKET_PRODUCTS,
  SORT_OPTIONS,
  groupedSales,
  sortLines,
  type SalesGroup,
  type SaleLine,
  type Period,
  type ProductSort,
  type Point,
  type SeriesKey,
} from "../data/salesReport";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import { isTablet } from "../theme/layout";
import { showToast } from "../components/Toast";
import { exportSalesReportPDF, exportSalesReportExcel, type ReportExportData } from "../utils/reportExport";

// Same KPI illustrations as the web: coin / box / cost / coin-up.
const COIN_INCOME = require("../../assets/coins/cion.png");
const COIN_ORDERS = require("../../assets/coins/box-in-caer.png");
const COIN_COST = require("../../assets/coins/cost.png");
const COIN_PROFIT = require("../../assets/coins/cion-up.png");

function Card({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececec", padding: 16 }}>{children}</View>;
}

// Web scales the KPI art 64px → 110px at its sm breakpoint; iPad cards are the
// wide ones here, so they get the big art (and a deeper bleed off the corner).
const ART_SIZE = isTablet() ? 110 : 72;
const ART_INSET = isTablet() ? -8 : -4;

// The illustration IS the card's visual anchor — no corner icon (it would be a
// second, redundant signal for the same metric).
function KpiCard({ label, value, sub, accent, SubIcon, art }: { label: string; value: string; sub: string; accent: string; SubIcon: LucideIcon; art: ImageSourcePropType }) {
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, borderRadius: 16, overflow: "hidden", backgroundColor: accent + "0d", padding: 14 }}>
      {/* iPad cards are ~2× wider, so the art scales with them (web does the
          same: 64px → 110px at the sm breakpoint) */}
      <Image source={art} style={{ position: "absolute", right: ART_INSET, bottom: ART_INSET - 6, width: ART_SIZE, height: ART_SIZE, opacity: 0.9 }} resizeMode="contain" />
      <View style={{ gap: 10 }}>
        <Text numberOfLines={1} style={{ fontSize: 12, color: "#6b7280", paddingRight: 24 }}>{label}</Text>
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
// Knowledge (สาระความรู้) tab bar. The pill answers the tap INSTANTLY from
// local state (same spring as SegmentedTabs) while the heavy report re-render
// (KPIs + chart + grouped table) is deferred via startTransition so it can't
// stutter the animation.
export function PeriodTabs({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const [local, setLocal] = useState(period);
  useEffect(() => setLocal(period), [period]); // external changes still sync in
  const idx = Math.max(0, PERIODS.findIndex((p) => p.id === local));
  const pos = useRef(new Animated.Value(idx)).current;
  const [segW, setSegW] = useState(0);
  useEffect(() => {
    Animated.spring(pos, { toValue: idx, useNativeDriver: true, friction: 9, tension: 90 }).start();
  }, [idx, pos]);
  const translateX = pos.interpolate({ inputRange: [0, PERIODS.length - 1], outputRange: [0, segW * (PERIODS.length - 1)] });
  // iPad: match the enlarged SegmentedTabs so all the period/tab controls read
  // at the same, iPad-appropriate size; phones keep the original 42/32/12.5.
  const tablet = isTablet();
  const H = tablet ? 50 : 42;
  const pillH = tablet ? 40 : 32;
  return (
    <View
      onLayout={(e) => setSegW((e.nativeEvent.layout.width - 10) / PERIODS.length)}
      style={{ height: H, borderRadius: 999, backgroundColor: "#fff", padding: 4, borderWidth: 1, borderColor: "#ececec" }}
    >
      {segW > 0 ? (
        <Animated.View style={{ position: "absolute", top: 4, left: 4, width: segW, height: pillH, borderRadius: 999, backgroundColor: BRAND_GREEN, transform: [{ translateX }] }} />
      ) : null}
      <View style={{ flex: 1, flexDirection: "row" }}>
        {PERIODS.map((p) => {
          const on = p.id === local;
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                setLocal(p.id);
                startTransition(() => onChange(p.id));
              }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            >
              <Text numberOfLines={1} style={{ fontSize: tablet ? 14.5 : 12.5, fontWeight: on ? "700" : "600", color: on ? "#fff" : "#6b7280" }}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Sales-share donut (web parity) — each time bucket's cut of the period's total
// sales. Web spec: PIE_COLORS palette, thick ring (inner 72/outer 120), 2°
// white padding between slices, % on slices ≥6%, total in the center,
// tinted legend pills.
const PIE_COLORS = ["#319754", "#46A165", "#7bc290", "#aedab8", "#f7931d", "#fbbf24"];

export function SalesDonut({
  data,
  valueKey = "sales",
  centerLabel = "ยอดขายรวม",
  format = fmtBaht,
}: {
  data: Point[];
  valueKey?: SeriesKey;      // which series the slices measure
  centerLabel?: string;
  format?: (n: number) => string;
}) {
  const val = (p: Point) => p[valueKey] as number;
  const pts = data.filter((p) => val(p) > 0);
  const total = pts.reduce((s, p) => s + val(p), 0) || 1;
  const segs = pts.map((p, i) => ({ label: p.label, value: val(p), color: PIE_COLORS[i % PIE_COLORS.length] }));

  // Web ring: inner 72 / outer 120 → scaled down to a 176px box so the whole
  // block (donut + legend) matches the line/bar chart height — switching chart
  // tabs never shifts the layout below.
  const size = 176, r = 70, stroke = 36, C = 2 * Math.PI * r, cx = size / 2;
  const padArc = (2 / 360) * C; // 2° white gap between slices (web paddingAngle)

  // ---- Press-and-drag: tooltip for the slice under the finger ----
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null); // finger pos, donut-local
  const [boxW, setBoxW] = useState(0); // block width — clamps the tooltip inside the card
  const lastIdx = useRef<number | null>(null);
  const idxFromPoint = (x: number, y: number) => {
    const dx = x - cx, dy = y - cx;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < r - stroke / 2 - 14 || dist > r + stroke / 2 + 14) return null; // off the ring
    const fromTop = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360; // 0 = top, clockwise
    let acc = 0;
    for (let i = 0; i < segs.length; i++) {
      const sweep = (segs[i].value / total) * 360;
      if (fromTop < acc + sweep) return i;
      acc += sweep;
    }
    return segs.length - 1;
  };
  const scrub = (x: number, y: number) => {
    const i = idxFromPoint(x, y);
    setTip({ x, y });
    if (lastIdx.current !== i) {
      lastIdx.current = i;
      if (i != null) Haptics.selectionAsync();
      setActiveIdx(i);
    }
  };
  const clear = () => { lastIdx.current = null; setActiveIdx(null); setTip(null); };
  const scrubGesture = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(180)
    .onStart((e) => scrub(e.x, e.y))
    .onUpdate((e) => scrub(e.x, e.y))
    .onEnd(clear)
    .onFinalize(clear);

  const active = activeIdx != null ? segs[activeIdx] : null;

  // Tooltip follows the finger (donut-local coords): centered above the touch,
  // clamped so it never leaves the card; flips below when near the top edge.
  const TIP_W = 150, TIP_H = 64;
  const sidePad = boxW > 0 ? (boxW - size) / 2 - 6 : 60; // room outside the 176px donut
  const tipLeft = tip ? Math.min(Math.max(tip.x - TIP_W / 2, -sidePad), size + sidePad - TIP_W) : 0;
  const tipTop = tip ? (tip.y - TIP_H - 14 < -34 ? tip.y + 18 : tip.y - TIP_H - 14) : 0;

  return (
    <View
      onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}
      style={{ height: CHART_BLOCK_H, alignItems: "center", justifyContent: "center", gap: 14 }}
    >
      <GestureDetector gesture={scrubGesture}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Arcs — each shortened by the padding so white shows between slices */}
          {(() => { let a = 0; return segs.map((s, i) => {
            const arc = (s.value / total) * C;
            const drawn = Math.max(0, arc - padArc);
            const el = (
              <Circle key={`a${i}`} cx={cx} cy={cx} r={r} stroke={s.color} strokeWidth={stroke} fill="none"
                opacity={activeIdx == null || activeIdx === i ? 1 : 0.35}
                strokeDasharray={`${drawn} ${C - drawn}`} strokeDashoffset={-(a + padArc / 2)} transform={`rotate(-90 ${cx} ${cx})`} />
            );
            a += arc;
            return el;
          }); })()}
          {/* % labels on slices ≥6% — pulled slightly INSIDE the band (45%) so
              text on horizontal slices never crosses the outer edge.
              (Manual dy: alignmentBaseline is unreliable across platforms.) */}
          {(() => { let a = 0; const rLabel = r; return segs.map((s, i) => {
            const frac = s.value / total;
            const mid = ((a + (frac * C) / 2) / C) * 360 - 90;
            a += frac * C;
            if (frac < 0.06) return null;
            const rad = (mid * Math.PI) / 180;
            return (
              <SvgText
                key={`t${i}`}
                x={cx + rLabel * Math.cos(rad)}
                y={cx + rLabel * Math.sin(rad) + 3.5}
                fill="#fff"
                fontSize={10}
                fontWeight="700"
                textAnchor="middle"
              >
                {Math.round(frac * 100)}%
              </SvgText>
            );
          }); })()}
        </Svg>
        {/* Center — total sales (web: 11 gray label + 20 bold value) */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 10.5, color: "#9ca3af" }}>{centerLabel}</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#1a1a1a" }}>{format(total)}</Text>
        </View>
      {/* Tooltip — web pie style: dot + label, ฿value + share %.
          Lives inside the donut wrapper so it tracks the finger (gesture coords). */}
      {active && tip ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: tipLeft,
            top: tipTop,
            width: TIP_W,
            backgroundColor: "#fff",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#f3f4f6",
            padding: 10,
            boxShadow: "0px 8px 28px rgba(0,0,0,0.12)",
            elevation: 6,
          }}
        >
          <View className="flex-row items-center" style={{ gap: 6, marginBottom: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active.color }} />
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#4b5563" }}>{active.label}</Text>
          </View>
          <View className="flex-row items-baseline justify-between" style={{ gap: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: active.color }}>{format(active.value)}</Text>
            <Text style={{ fontSize: 11, color: "#9ca3af" }}>{((active.value / total) * 100).toFixed(1)}%</Text>
          </View>
        </View>
      ) : null}
      </View>
      </GestureDetector>

      {/* Legend — tinted pills, series-colored text (web style) */}
      <View className="flex-row" style={{ flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
        {segs.map((s, i) => (
          <LegendPill key={i} color={s.color} label={s.label} />
        ))}
      </View>
    </View>
  );
}

/* ---------- Grouped product-sales table (web parity, mobile/tablet layouts) ---------- */

// Deductions (ส่วนลด / GP) use the web table's warm negative tone — not the
// urgency red, which Guidelines reserve for flash-sale/discount CTAs.
const NEG = "#c2410c";

// Money summary stat — the PRIMARY content of a collapsed group card, so the
// value uses the Guidelines price class (14+/600–700), label stays meta (10–11).
// `onDark` = white-on-green variant for the card header.
function MiniStat({ label, value, color, onDark }: { label: string; value: string; color?: string; onDark?: boolean }) {
  return (
    <View>
      <Text style={{ fontSize: 11, color: onDark ? "rgba(255,255,255,0.72)" : TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 14.5, fontWeight: "700", color: onDark ? "#fff" : color ?? "#1a1a1a", marginTop: 4 }}>{value}</Text>
    </View>
  );
}

function LineTag({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: color + "12", paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 }}>
      <Text style={{ fontSize: 10.5, fontWeight: "600", color }}>{text}</Text>
    </View>
  );
}

// Phone layout — two-deck row: identity + headline figures, then a strip of
// tinted tags for the money trail (ส่วนลด → GP → สุทธิ → ต้นทุน). Progressive
// disclosure keeps 9 web columns readable on a 430px screen.
function LineRow({ l, last }: { l: SaleLine; last: boolean }) {
  return (
    <View style={{ paddingVertical: 10, gap: 7, borderBottomWidth: last ? 0 : 1, borderBottomColor: "#f3f3f3" }}>
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{l.p.name}</Text>
          <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>
            {l.p.sku} · {l.qty.toLocaleString()} {l.p.unit} × {fmtBaht(l.price)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>{fmtBaht(l.sales)}</Text>
          <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#15803d", marginTop: 1 }}>
            +{fmtBaht(l.profit)} · {l.margin.toFixed(1)}%
          </Text>
        </View>
      </View>
      <View className="flex-row" style={{ flexWrap: "wrap", gap: 6 }}>
        {l.discount > 0 ? <LineTag text={`ส่วนลด −${fmtBaht(l.discount)}`} color={NEG} /> : null}
        <LineTag text={`GP −${fmtBaht(l.gp)}`} color={NEG} />
        <LineTag text={`สุทธิ ${fmtBaht(l.net)}`} color={BRAND_GREEN_DARK} />
        <LineTag text={`ต้นทุน ${fmtBaht(l.cost)}`} color="#64748b" />
      </View>
    </View>
  );
}

// Tablet layout (≥640px) — real columns like the web table.
const COLS: { key: string; label: string; flex: number }[] = [
  { key: "name", label: "สินค้า", flex: 2.4 },
  { key: "qty", label: "จำนวน", flex: 0.8 },
  { key: "price", label: "ราคาขาย", flex: 1 },
  { key: "discount", label: "ส่วนลด", flex: 0.9 },
  { key: "sales", label: "ยอดขาย", flex: 1 },
  { key: "gp", label: "GP", flex: 0.9 },
  { key: "net", label: "สุทธิ", flex: 1 },
  { key: "cost", label: "ต้นทุน", flex: 1 },
  { key: "profit", label: "กำไร", flex: 1.1 },
];

function WideHeadRow() {
  return (
    <View className="flex-row items-center" style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", gap: 8 }}>
      {COLS.map((c) => (
        <Text key={c.key} style={{ flex: c.flex, fontSize: 10.5, color: TEXT_MUTED, textAlign: c.key === "name" ? "left" : "right" }}>{c.label}</Text>
      ))}
    </View>
  );
}

function WideLineRow({ l, last }: { l: SaleLine; last: boolean }) {
  const num = (v: string, color = "#1a1a1a", bold = false) => (
    <Text style={{ fontSize: 12.5, fontWeight: bold ? "700" : "500", color, textAlign: "right" }}>{v}</Text>
  );
  return (
    <View className="flex-row items-center" style={{ paddingVertical: 9, gap: 8, borderBottomWidth: last ? 0 : 1, borderBottomColor: "#f3f3f3" }}>
      <View className="flex-row items-center" style={{ flex: 2.4, gap: 8, minWidth: 0 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>{l.p.name}</Text>
          <Text numberOfLines={1} style={{ fontSize: 10.5, color: TEXT_MUTED }}>{l.p.sku}</Text>
        </View>
      </View>
      <View style={{ flex: 0.8 }}>{num(`${l.qty.toLocaleString()} ${l.p.unit}`)}</View>
      <View style={{ flex: 1 }}>{num(fmtBaht(l.price))}</View>
      <View style={{ flex: 0.9 }}>{l.discount > 0 ? num(`−${fmtBaht(l.discount)}`, NEG) : num("–", "#c4c4c4")}</View>
      <View style={{ flex: 1 }}>{num(fmtBaht(l.sales), "#1a1a1a", true)}</View>
      <View style={{ flex: 0.9 }}>{num(`−${fmtBaht(l.gp)}`, NEG)}</View>
      <View style={{ flex: 1 }}>{num(fmtBaht(l.net), BRAND_GREEN_DARK, true)}</View>
      <View style={{ flex: 1 }}>{num(fmtBaht(l.cost))}</View>
      <View style={{ flex: 1.1, alignItems: "flex-end" }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#15803d" }}>{fmtBaht(l.profit)}</Text>
        <Text style={{ fontSize: 10, fontWeight: "600", color: "#15803d", opacity: 0.75 }}>{l.margin.toFixed(1)}%</Text>
      </View>
    </View>
  );
}

// One time-bucket group: tinted header (bucket label + n รายการ + money summary)
// over its sale lines — the web's sticky left column folded into a header row.
// Flash-card visual language adapted for a report group: soft shadow + tinted
// gradient frame (brand green) + white rounded-24 card, with the group's
// identity (bucket label + counts) on the gradient "peek" strip — flipped to
// the TOP since it's a header, not a status footer.
function SalesGroupBlock({ g, sort, wide, title }: { g: SalesGroup; sort: ProductSort; wide: boolean; title?: string }) {
  const lines = sortLines(g.lines, sort);
  const unit = g.lines[0]?.p.unit ?? "ชิ้น";
  // Progressive disclosure — collapsed cards show ONLY the money summary;
  // the sale lines hide behind "ดูรายการสินค้า (n)".
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? lines : [];
  // Chevron rotates in step with the unfold.
  const chevAnim = useRef(new Animated.Value(0)).current;
  const toggle = () => {
    Haptics.selectionAsync();
    // Slow-ish ease with a gentle scale-in on the new rows — reads as the card
    // unfolding rather than popping open.
    LayoutAnimation.configureNext({
      duration: 340,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.scaleY, duration: 300, delay: 40 },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity, duration: 160 },
    });
    Animated.timing(chevAnim, { toValue: expanded ? 0 : 1, duration: 300, useNativeDriver: true }).start();
    setExpanded((v) => !v);
  };
  return (
    <Pressable
      onPress={toggle}
      className="active:opacity-95"
      style={{ backgroundColor: "white", borderRadius: 24, boxShadow: "0px 2px 4px rgba(0,0,0,0.15), 0px 6px 12px rgba(0,0,0,0.08)", elevation: 3 }}
    >
      {/* White card is the BASE layer; the green header (info + money summary)
          sits on top of it, white peeking below with the sale lines. */}
      <LinearGradient colors={[BRAND_GREEN_DARK, BRAND_GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 24 }}>
        <View className="flex-row items-center" style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
          <View className="flex-row items-center" style={{ gap: 5, flex: 1 }}>
            <CalendarDays size={13} color="#fff" strokeWidth={2.4} />
            <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#fff" }} numberOfLines={1}>{title ?? g.label}</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>{g.lines.length} รายการ · {g.units.toLocaleString()} {unit}</Text>
        </View>

        {/* Money summary — white-on-green, inside the header */}
        <View className="flex-row" style={{ flexWrap: "wrap", columnGap: 18, rowGap: 6, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
          <MiniStat onDark label="ยอดขาย" value={fmtBaht(g.sales)} />
          <MiniStat onDark label="GP" value={`−${fmtBaht(g.gp)}`} />
          <MiniStat onDark label="สุทธิ" value={fmtBaht(g.net)} />
          <MiniStat onDark label="กำไร" value={`${fmtBaht(g.profit)} (${g.margin.toFixed(1)}%)`} />
        </View>

      </LinearGradient>

      {/* White base peeking below — sale lines + ดูรายการสินค้า */}
      <View style={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 6 }}>
          {expanded && wide ? <WideHeadRow /> : null}
          {shown.map((l, i) =>
            wide
              ? <WideLineRow key={l.p.sku} l={l} last={i === shown.length - 1} />
              : <LineRow key={l.p.sku} l={l} last={i === shown.length - 1} />
          )}
          <Pressable
            onPress={toggle}
            className="flex-row items-center justify-center active:opacity-60"
            style={{ paddingVertical: 10, gap: 5, borderTopWidth: expanded ? 1 : 0, borderTopColor: "#f3f3f3" }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: BRAND_GREEN_DARK }}>
              {expanded ? "แสดงน้อยลง" : `ดูรายการสินค้า (${lines.length})`}
            </Text>
            <Animated.View style={{ transform: [{ rotate: chevAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
              <ChevronDown size={14} color={BRAND_GREEN_DARK} strokeWidth={2.6} />
            </Animated.View>
          </Pressable>
      </View>
    </Pressable>
  );
}

/** รายงานผลยอดขาย — period KPIs + chart (one card) + product-sales table. */
export function ShopSalesReportView({ period, setPeriod, dateSel, exportRef }: { period: Period; setPeriod: (p: Period) => void; dateSel: DateRange; exportRef?: { current: ((kind: "excel" | "pdf") => void) | null } }) {
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line");
  const [cat, setCat] = useState<"regular" | "market">("regular");
  const [sort, setSort] = useState<ProductSort>("sales_desc");

  // Chart swap feedback — slide+fade in from the side of the tab you moved to
  // (same directional pattern as the date-picker month swipe).
  const CHART_ORDER = ["line", "bar", "pie"] as const;
  const chartAnim = useRef(new Animated.Value(1)).current;
  const chartDir = useRef(0);
  const prevChart = useRef(chartType);
  useEffect(() => {
    if (prevChart.current === chartType) return;
    chartDir.current = CHART_ORDER.indexOf(chartType) > CHART_ORDER.indexOf(prevChart.current) ? 1 : -1;
    prevChart.current = chartType;
    chartAnim.setValue(0);
    Animated.timing(chartAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]);

  const data = REPORT_DATA[period];
  const kpi = useMemo(() => computeKpi(data), [data]);
  const scope = salesDateLabel(period, dateSel);
  // Groups follow the period tab: day → hours, month → weeks, year → months …
  const groups = useMemo(() => groupedSales(period, cat === "regular" ? REGULAR_PRODUCTS : MARKET_PRODUCTS), [period, cat]);
  const lineCount = groups.reduce((s, g) => s + g.lines.length, 0);
  // The sort filter also orders the GROUP CARDS by their totals — otherwise
  // changing it has no visible effect while cards are collapsed. Titles are
  // stamped from the CHRONOLOGICAL index first (สัปดาห์ที่ 1 stays week 1).
  const displayGroups = useMemo(() => {
    const withTitle = groups.map((g, i) => ({
      g,
      title:
        period === "weekly" ? `สัปดาห์ที่ ${i + 1} (${weekRangeLabel(i, dateSel.start)})`
        : period === "monthly" ? `${g.label} ${dateSel.start.year}`
        : undefined,
    }));
    // "ล่าสุด" — groups arrive chronological (oldest→newest); reverse to put
    // the most recent period date first, down to the oldest in range.
    if (sort === "latest") return [...withTitle].reverse();
    const metric = (x: { g: SalesGroup }) =>
      sort === "qty_desc" ? x.g.units : sort === "margin_desc" ? x.g.margin : x.g.sales;
    return [...withTitle].sort((a, b) => (sort === "sales_asc" ? metric(a) - metric(b) : metric(b) - metric(a)));
  }, [groups, sort, period, dateSel]);
  // Export (web-parity ส่งออก popover) — build the flat data once, then hand it
  // to the PDF/CSV writers. Uses the visible sort so the file matches the screen.
  const buildExportData = (): ReportExportData => ({
    scope,
    catLabel: cat === "regular" ? "สินค้าปกติ" : "Herbal Market",
    groups: displayGroups.map(({ g, title }) => ({
      title: title ?? g.label,
      sales: g.sales,
      profit: g.profit,
      lines: sortLines(g.lines, sort).map((l) => ({
        name: l.p.name, qty: l.qty, sales: l.sales, cost: l.cost, profit: l.profit, margin: l.margin,
      })),
    })),
  });
  const runExport = async (kind: "excel" | "pdf") => {
    try {
      showToast(`กำลังสร้างไฟล์ ${kind === "excel" ? "Excel" : "PDF"}…`, "info");
      const data = buildExportData();
      if (kind === "excel") await exportSalesReportExcel(data);
      else await exportSalesReportPDF(data);
    } catch (e) {
      showToast("ส่งออกไม่สำเร็จ", "error");
    }
  };
  // Expose the export action to the parent header (the ส่งออก button + its
  // Excel/PDF morph menu live in the app bar next to the date). Reassigned each
  // render so it always closes over the current sort/cat/period.
  if (exportRef) exportRef.current = runExport;

  // Tablet gets real table columns; phones get the stacked two-deck rows.
  const isWide = useWindowDimensions().width >= 640;
  const sortLabel = SORT_OPTIONS.find((s) => s.id === sort)?.label ?? "";
  // Each sort mode gets its own icon + accent (Von Restorff: distinct states
  // read at a glance) — reusing the KPI accent hues from this screen.
  const SORT_VISUAL: Record<ProductSort, { Icon: LucideIcon; color: string }> = {
    sales_desc: { Icon: TrendingUp, color: "#10b981" },
    sales_asc: { Icon: TrendingDown, color: "#f59e0b" },
    qty_desc: { Icon: Package, color: "#0ea5e9" },
    margin_desc: { Icon: Percent, color: "#6366f1" },
    latest: { Icon: CalendarDays, color: "#ec4899" },
  };
  const sortVisual = SORT_VISUAL[sort];
  // Sort feedback — haptic + label fade + the rows animate into their new order.
  const sortAnim = useRef(new Animated.Value(1)).current;
  // ⋯-style morph menu (app-wide AppleMenu pattern) — the card scales out of
  // the pill, right-aligned to it; flips upward when the pill sits low on
  // screen. Hosted in a transparent Modal because this view lives inside a
  // ScrollView; sortMounted keeps the Modal up through the 160ms close morph.
  const [sortOpen, setSortOpen] = useState(false);
  const [sortMounted, setSortMounted] = useState(false);
  const sortBtnRef = useRef<View>(null);
  const [sortAnchor, setSortAnchor] = useState<{ top?: number; bottom?: number; right: number }>({ top: 0, right: 12 });
  const openSortMenu = () => {
    sortBtnRef.current?.measureInWindow((x, y, w, h) => {
      const { width: ww, height: wh } = Dimensions.get("window");
      const right = Math.max(12, ww - (x + w));
      if (y > wh * 0.55) setSortAnchor({ bottom: wh - y + 6, right });
      else setSortAnchor({ top: y + h + 6, right });
      setSortMounted(true);
      setSortOpen(true);
    });
  };
  const closeSort = () => {
    setSortOpen(false); // AppleMenu plays its collapse…
    setTimeout(() => setSortMounted(false), 200); // …then the Modal unmounts
  };
  const pickSort = (id: ProductSort) => {
    closeSort();
    if (id === sort) return;
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setSort(id);
    sortAnim.setValue(0);
    // Spring (not timing) so the incoming icon pops with a little overshoot.
    Animated.spring(sortAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 160 }).start();
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Period tabs — capsule switcher (ส่งออก button lives in the app-bar
          header next to the date, wired via exportRef). */}
      <PeriodTabs period={period} onChange={setPeriod} />

      {/* KPI + chart — ONE card (web parity): the chart reads the same
          REPORT_DATA[period] as the KPIs, so changing the period/date updates both. */}
      <Card>
        <View className="flex-row" style={{ flexWrap: "wrap", gap: 10 }}>
          <KpiCard label={`รายได้ ${scope}`} value={fmtBaht(kpi.sales)} sub={`เฉลี่ย ${fmtBaht(kpi.avgSales)}/ช่วง`} accent="#10b981" SubIcon={BarChart3} art={COIN_INCOME} />
          <KpiCard label={`คำสั่งซื้อ ${scope}`} value={`${kpi.orders.toLocaleString()} ออเดอร์`} sub={`เฉลี่ย ฿${kpi.aov.toLocaleString()}/ออเดอร์`} accent="#0ea5e9" SubIcon={BarChart3} art={COIN_ORDERS} />
          <KpiCard label={`ต้นทุน ${scope}`} value={fmtBaht(kpi.cost)} sub={`${kpi.costRatio}% ของรายได้`} accent="#6366f1" SubIcon={CheckCircle2} art={COIN_COST} />
          <KpiCard label={`กำไร ${scope}`} value={fmtBaht(kpi.profit)} sub={`มาร์จิ้น ${kpi.margin.toFixed(1)}%`} accent="#f59e0b" SubIcon={TrendingUp} art={COIN_PROFIT} />
        </View>

        {/* Section heading + chart-type tabs on one row. Tabs reuse the app-wide
            SegmentedTabs (sliding green pill) in its compact variant. */}
        <View className="flex-row items-center justify-between" style={{ marginTop: 18, marginBottom: 10, gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>รายงานผลยอดขาย</Text>
          <SegmentedTabs
            size="compact"
            style={{ width: isTablet() ? 250 : 172 }}
            tabs={[
              { id: "line" as const, label: "เส้น" },
              { id: "bar" as const, label: "แท่ง" },
              { id: "pie" as const, label: "วงกลม" },
            ]}
            active={chartType}
            onChange={setChartType}
          />
        </View>

        <Animated.View
          style={{
            opacity: chartAnim,
            transform: [{ translateX: chartAnim.interpolate({ inputRange: [0, 1], outputRange: [chartDir.current * 36, 0] }) }],
          }}
        >
          {chartType === "pie" ? <SalesDonut data={data} /> : <SalesChart data={data} type={chartType} />}
        </Animated.View>
      </Card>

      {/* Product sales table — NOT wrapped in a Card: the flash-style group
          cards are the card layer; headers sit on the page background like the
          Flash Sale section (avoids card-in-card). */}
      <View style={{ marginTop: 6 }}>
        {/* Title + category tabs on one row (same look as the chart section) */}
        <View className="flex-row items-center justify-between" style={{ marginBottom: 10, gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>รายงานการขายสินค้า</Text>
          {/* marginRight -3 = optical alignment: the track's 3px inner padding
              would otherwise make the tab text look inset vs. the sort filter */}
          <SegmentedTabs
            size="compact"
            style={{ width: isTablet() ? 270 : 176, marginRight: -3 }}
            tabs={[
              { id: "regular" as const, label: "สินค้าปกติ" },
              { id: "market" as const, label: "Herbal Market" },
            ]}
            active={cat}
            onChange={setCat}
          />
        </View>

        {/* Meta line (scope + counts, web parity) + sort pill on one row */}
        <View className="flex-row items-center justify-between" style={{ marginBottom: 8, gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 11.5, color: TEXT_MUTED }}>
            ข้อมูลของ {scope} · {groups.length} กลุ่ม ({lineCount} รายการ)
          </Text>
        {/* Sort — tinted pill, per-mode icon+accent; opens an anchored popover.
            The chevron signals "tap to choose" (affordance, not a cycle button). */}
        <Pressable
          ref={sortBtnRef}
          onPress={openSortMenu}
          className="flex-row items-center active:opacity-70"
          style={{ gap: isTablet() ? 8 : 6, paddingVertical: isTablet() ? 10 : 7, paddingHorizontal: isTablet() ? 16 : 12, borderRadius: 999, backgroundColor: sortVisual.color + "14" }}
        >
          <Animated.View
            style={{
              opacity: sortAnim,
              transform: [
                { scale: sortAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                { rotate: sortAnim.interpolate({ inputRange: [0, 1], outputRange: ["-90deg", "0deg"] }) },
              ],
            }}
          >
            <sortVisual.Icon size={isTablet() ? 17 : 15} color={sortVisual.color} strokeWidth={2.4} />
          </Animated.View>
          <Animated.Text style={{ fontSize: isTablet() ? 15 : 13, fontWeight: "700", color: sortVisual.color, opacity: sortAnim }}>{sortLabel}</Animated.Text>
          <ChevronDown size={isTablet() ? 16 : 14} color={sortVisual.color} strokeWidth={2.6} style={{ transform: [{ rotate: sortOpen ? "180deg" : "0deg" }] }} />
        </Pressable>
        </View>

        {/* Sort picker — the app-wide AppleMenu morph (same as every ⋯ menu):
            the card scales out of the pill. Rows keep each mode's icon +
            accent, with a green ✓ on the active one. */}
        <Modal visible={sortMounted} transparent animationType="none" onRequestClose={closeSort} statusBarTranslucent>
          <AppleMenu
            visible={sortOpen}
            onClose={closeSort}
            anchorTop={sortAnchor.top}
            anchorBottom={sortAnchor.bottom}
            right={sortAnchor.right}
            originSize={26}
            menuHeight={256}
          >
            {SORT_OPTIONS.map((opt) => {
              const v = SORT_VISUAL[opt.id];
              const active = sort === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => pickSort(opt.id)}
                  className="flex-row items-center active:opacity-60"
                  style={{ height: 48, paddingHorizontal: 18, gap: 12 }}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: v.color + "1a", alignItems: "center", justifyContent: "center" }}>
                    <v.Icon size={14} color={v.color} strokeWidth={2.4} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, color: "#1a1a1a", fontWeight: active ? "600" : "400" }}>{opt.label}</Text>
                  {active ? <Check size={18} color={BRAND_GREEN} strokeWidth={2.8} /> : null}
                </Pressable>
              );
            })}
          </AppleMenu>
        </Modal>

        <View style={{ gap: 14 }}>
          {displayGroups.map(({ g, title }) => (
            <SalesGroupBlock key={g.label} g={g} sort={sort} wide={isWide} title={title} />
          ))}
        </View>
      </View>
    </View>
  );
}


