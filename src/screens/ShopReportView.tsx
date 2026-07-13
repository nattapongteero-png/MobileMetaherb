import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { View, Text, Pressable, ScrollView, Modal, Dimensions, Animated, LayoutAnimation, Image, type ImageSourcePropType } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  UserPlus, Repeat, Users, Store, Package, Boxes, AlertTriangle, Star,
  Eye, ShoppingCart, TrendingUp, TrendingDown, Ticket, Download, ChevronDown,
  FileSpreadsheet, FileText, Check, CalendarDays, Clock, Heart, X, Link, type LucideIcon,
} from "lucide-react-native";
import { AppleMenu } from "../components/AppleMenu";
import { SalesChart } from "../components/SalesChart";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { PeriodTabs, SalesDonut, ShopSalesReportView } from "./ShopSalesReportView";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassView } from "expo-glass-effect";
import { isTablet } from "../theme/layout";
import { showToast } from "../components/Toast";
import { SalesDatePicker, salesDateLabel, type DateRange } from "../components/SalesDatePicker";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  REPORT_DATA, sumField, fmtBaht,
  sortCustomers, customerStats, rankColor, rankTextColor, customersForPeriod, focusCustomers,
  CUSTOMER_SORT_OPTIONS,
  sortTopProducts, sortRatingProducts, productsForPeriod, focusProducts, avgPerUnit, productDiscount,
  sortChannels, channelsForPeriod, focusChannels, channelStats, channelColor, channelGradient, CHANNEL_SORT_OPTIONS,
  PRODUCT_SORT_OPTIONS, RATING_SORT_OPTIONS,
  TOP_PRODUCTS, CHANNELS, CHANNEL_TYPE_COLOR,
  type Period, type SeriesKey, type Customer, type CustomerSort, type TopProduct, type TopProductSort, type RatingSort, type Channel, type ChannelSort,
} from "../data/salesReport";
import { CHANNEL_LOGO, CHANNEL_LOGO_VIEWBOX } from "../data/channelLogos";
import { exportCustomerReportPDF, exportCustomerReportExcel, type CustomerExportData } from "../utils/reportExport";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";

export type ReportKind = "customers" | "products" | "market";

type Ser = { key: SeriesKey; color: string; label: string };
const SERIES: Record<ReportKind, [Ser, Ser]> = {
  customers: [{ key: "newCust", color: "#3b82f6", label: "ลูกค้าใหม่" }, { key: "repeat", color: "#319754", label: "ซื้อซ้ำ" }],
  products: [{ key: "units", color: "#319754", label: "จำนวนขาย" }, { key: "sales", color: "#ec4899", label: "รายได้ (฿)" }],
  market: [{ key: "visits", color: "#7c3aed", label: "ผู้เข้าชม" }, { key: "orders", color: "#f59e0b", label: "ออเดอร์" }],
};
// Chart heading = the report's own name (web parity: the h3 above the chart is
// "รายงานข้อมูลลูกค้า", not a series description).
const CHART_TITLE: Record<ReportKind, string> = { customers: "รายงานข้อมูลลูกค้า", products: "รายงานข้อมูลสินค้า", market: "รายงานการตลาด" };
const TABLE_TITLE: Record<ReportKind, string> = { customers: "ลูกค้าที่มียอดซื้อสูงสุด", products: "สินค้าขายดี", market: "ประสิทธิภาพช่องทาง" };

function Card({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececec", padding: 16 }}>{children}</View>;
}

// Same KPI illustrations as the web (bgArt). The picture IS the card's visual
// anchor, so there's no corner icon — it would double-signal the same metric.
const ART = {
  newCustomer: require("../../assets/kpi/new-customer.png"),
  repeatCustomers: require("../../assets/kpi/repeat-customers.png"),
  groupCustomer: require("../../assets/kpi/gourp-customer.png"),
  member: require("../../assets/kpi/member.png"),
  productsSold: require("../../assets/kpi/products-sold.png"),
  productsStore: require("../../assets/kpi/products-store.png"),
  stock: require("../../assets/kpi/stock.png"),
  rating: require("../../assets/kpi/rating.png"),
  visitors: require("../../assets/kpi/visitors.png"),
  bagInCart: require("../../assets/kpi/bag-in-cart.png"),
  convert: require("../../assets/kpi/convert.png"),
  coupon: require("../../assets/kpi/coupon.png"),
};

// Web scales the KPI art 64px → 110px at its sm breakpoint; iPad cards are the
// wide ones here, so they get the big art (and a deeper bleed off the corner).
const ART_SIZE = isTablet() ? 110 : 72;
const ART_INSET = isTablet() ? -8 : -4;

type Kpi = { label: string; value: string; sub: string; accent: string; SubIcon: LucideIcon; art: ImageSourcePropType };
function KpiCard({ k }: { k: Kpi }) {
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, borderRadius: 16, overflow: "hidden", backgroundColor: k.accent + "0d", padding: 14 }}>
      {/* iPad cards are ~2× wider, so the art scales with them (web does the
          same: 64px → 110px at the sm breakpoint) */}
      <Image source={k.art} style={{ position: "absolute", right: ART_INSET, bottom: ART_INSET - 6, width: ART_SIZE, height: ART_SIZE, opacity: 0.9 }} resizeMode="contain" />
      <View style={{ gap: 10 }}>
        <Text numberOfLines={1} style={{ fontSize: 12, color: "#6b7280", paddingRight: 24 }}>{k.label}</Text>
        <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: "700", color: k.accent, letterSpacing: -0.3 }}>{k.value}</Text>
        <View className="flex-row items-center" style={{ alignSelf: "flex-start", gap: 3, backgroundColor: k.accent + "15", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
          <k.SubIcon size={10} color={k.accent} strokeWidth={2.4} />
          <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: "600", color: k.accent }}>{k.sub}</Text>
        </View>
      </View>
    </View>
  );
}

/* ---------- Customer table — web columns, Flash-Sale card shell ----------
 * The web's "ลูกค้าที่มียอดซื้อสูงสุด" is a FLAT ranked table:
 *   # · ลูกค้า(ชื่อ+อีเมล) · ออเดอร์ · ยอดรวม · AOV · อัตราซื้อซ้ำ · ซื้อล่าสุด · สินค้าที่ชอบ
 * Mobile keeps every column but wraps each customer in the Flash Sale card
 * shell: shadow wrapper → tinted gradient frame → white body (identity + stats)
 * → gradient "peek" strip carrying the status line.
 */

// Stat block — same rhythm as the flash card's FSStat (label / value + unit).
// `width` is the shared column width so ออเดอร์ / AOV / อัตราซื้อซ้ำ line up.
function CStat({ label, value, unit, width, dot, flex, compact, labelSize }: {
  label: string; value: string; unit: string; width?: number; dot?: string;
  /** true = equal column; a number = weighted column (Conv./ROAS need less room). */
  flex?: boolean | number; compact?: boolean;
  /** Latin caps (ROAS) read a size larger than Thai at the same px — nudge down. */
  labelSize?: number;
}) {
  const flexAmount = typeof flex === "number" ? flex : flex ? 1 : undefined;
  // compact = four columns in one row (product cards). The unit moves up into
  // the label so the value gets the whole column — a 7-digit ฿ (หลักล้าน) needs
  // it — and the value shrinks a step rather than truncating.
  if (compact) {
    return (
      <View style={{ gap: 6, flex: flexAmount, width, minWidth: 0 }}>
        {/* Fixed label-row height: Thai labels (ผู้เข้าชม) have taller line boxes
            than Latin ones (ROAS), which pushed each column's value to a
            different y. Locking the row makes every value start level. */}
        {/* Bottom-aligned so a smaller label (ROAS at 10.5) still sits on the same
            baseline. lineHeight is 1.5× the font — Thai tone marks and upper
            vowels (ผู้ / ออเดอร์) live ABOVE the cap line and get clipped if the
            line box only fits the font size. */}
        <View className="flex-row items-end" style={{ gap: 5, height: 18 }}>
          {dot ? <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: dot, marginBottom: 3 }} /> : null}
          <Text numberOfLines={1} style={{ flex: 1, fontSize: labelSize ?? 11.5, lineHeight: (labelSize ?? 11.5) * 1.5, color: "rgba(0,0,0,0.5)", includeFontPadding: false }}>
            {unit ? `${label} (${unit})` : label}
          </Text>
        </View>
        {/* Fixed line box + bottom-aligned: adjustsFontSizeToFit shrinks long
            values (หลักล้าน) but a shrunk glyph would otherwise float mid-box and
            sit off the baseline its neighbours share. */}
        <View style={{ height: 20, justifyContent: "flex-end" }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={{ fontSize: 15, lineHeight: 18, fontWeight: "700", color: "#0a0a0a", includeFontPadding: false }}
          >
            {value}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 8, width, flex: flexAmount, minWidth: 0 }}>
      <View className="flex-row items-center" style={{ gap: 7 }}>
        {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /> : null}
        <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)" }} numberOfLines={1}>{label}</Text>
      </View>
      <View className="flex-row items-baseline" style={{ gap: 6 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>{value}</Text>
        <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)" }} numberOfLines={1}>{unit}</Text>
      </View>
    </View>
  );
}

// Worst-case AOV (หลักล้าน) sets ONE column width for all three stats — the
// numbers stay left-aligned and never reflow when a value grows.
const STAT_SAMPLE = "9,999,999";

function CustomerCard({ c, rank }: { c: Customer; rank: number }) {
  const { aov, repeatRate, stale } = customerStats(c);
  const medal = rankColor(rank);
  // Measure the widest possible AOV ("9,999,999 บาท") once, then give all three
  // stats that same width — equal columns, left-aligned, no reflow when a value
  // grows (Law of Common Region: the trio reads as one block).
  const [statW, setStatW] = useState(0);
  // Frame tint follows the RANK, not the customer — the web table has no avatar
  // and no segment colour, only the ranked rows. Flash card tints its frame the
  // same way (colour = the card's one status signal).
  const tint = rank < 3 ? medal : "#94a3b8";
  return (
    <View style={{ borderRadius: 24, boxShadow: "0px 2px 4px rgba(0,0,0,0.15), 0px 6px 12px rgba(0,0,0,0.08)", elevation: 3 }}>
      <LinearGradient colors={[tint + "26", tint + "12"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 24 }}>
        <View style={{ backgroundColor: "white", borderRadius: 24, padding: 14, gap: 12 }}>
          {/* Header — อันดับ (ทอง/เงิน/ทองแดง 3 อันดับแรก, web rankBg) + ชื่อ/อีเมล + ยอดรวม.
              No avatar: the web table doesn't show one. */}
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: rank < 3 ? medal : "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: rankTextColor(rank) }}>{rank + 1}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a" }}>{c.name}</Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{c.email}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a" }}>{fmtBaht(c.total)}</Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>ยอดรวม</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

          {/* Stats — ออเดอร์ / AOV / อัตราซื้อซ้ำ (web columns 3, 5, 6).
              Three equal columns, packed left (no justify-between). */}
          <View className="flex-row items-start" style={{ gap: 12 }}>
            <CStat label="ออเดอร์" value={c.orders.toLocaleString()} unit="ครั้ง" width={statW || undefined} />
            <CStat label="อัตราซื้อซ้ำ" value={`${repeatRate}`} unit="%" width={statW || undefined} />
            <CStat label="AOV" value={aov.toLocaleString()} unit="฿" width={statW || undefined} />
          </View>

          {/* Hidden measurer — worst-case AOV row sets the shared column width */}
          <View style={{ position: "absolute", opacity: 0 }} pointerEvents="none">
            <View
              className="flex-row items-baseline"
              style={{ gap: 6 }}
              onLayout={(e) => setStatW(Math.ceil(e.nativeEvent.layout.width))}
            >
              <Text style={{ fontSize: 16, fontWeight: "700" }}>{STAT_SAMPLE}</Text>
              <Text style={{ fontSize: 14 }}>บาท</Text>
            </View>
          </View>
        </View>

        {/* Base peek — ซื้อล่าสุด · สินค้าที่ชอบ (web columns 7, 8). No segment
            label: the web table has no such column. Stale (>30 วัน) turns the
            date warm, exactly like the web row. */}
        <View className="flex-row items-center" style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 10 }}>
          <View className="flex-row items-center" style={{ gap: 5, flexShrink: 0 }}>
            <CalendarDays size={13} color={stale ? "#c2410c" : tint} strokeWidth={2.2} />
            <Text style={{ fontSize: 12, fontWeight: stale ? "700" : "600", color: stale ? "#c2410c" : tint }} numberOfLines={1}>{c.lastBuy}</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 5, flexShrink: 1, minWidth: 0 }}>
            <Heart size={13} color={tint} strokeWidth={2.2} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: tint, flexShrink: 1 }} numberOfLines={1}>{c.fav}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

/* ---------- สรุปรวม — Flash Sale summary-card shell ----------
 * Same two-deck shell as FlashSummaryCard: green gradient head (label +
 * heading + headline figure + illustration) over a white stats strip whose
 * ring visualises the headline ratio. Here the ring is อัตราซื้อซ้ำ.
 */

// Same art as the "ลูกค้าทั้งหมดในร้าน" KPI (storefront + customers).
const SUMMARY_ART = require("../../assets/kpi/member.png");

// Ring track colour — also the dot for ออเดอร์ (the whole the arc cuts into).
const RING_TRACK = "#e3e6e3";

// Progress ring — same geometry as the flash card's FlashRing (stroke 6).
function StatRing({ pct, size, color }: { pct: number; size: number; color: string }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={RING_TRACK} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - clamped)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

// รายได้ = สุทธิ + ส่วนลด — the one whole the lower stats form, so the donut can
// honestly split it. Centre carries the total; the arcs carry the split.
function SplitDonut({ total, part, partColor, restColor, size = 40 }: {
  total: number; part: number; partColor: string; restColor: string; size?: number;
}) {
  // Same 40px / stroke 6 geometry as StatRing on the Rating card.
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pad = (4 / 360) * c;
  const frac = total > 0 ? Math.max(0, Math.min(1, part / total)) : 0;
  const arc = (f: number, offset: number, color: string) => {
    const drawn = Math.max(0, f * c - pad);
    return (
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={`${drawn} ${c - drawn}`}
        strokeDashoffset={-(offset * c + pad / 2)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    );
  };
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={RING_TRACK} strokeWidth={stroke} fill="none" />
        {total > 0 ? arc(1 - frac, 0, restColor) : null}
        {total > 0 ? arc(frac, 1 - frac, partColor) : null}
      </Svg>
    </View>
  );
}

// สินค้าแบ่งตามช่วงคะแนน — a real whole (จำนวนสินค้าทั้งหมด) split into three
// bands, so the donut says something the headline doesn't: how many products
// actually delight, and how many drag the average down.
const RATING_BANDS = [
  { key: "great", label: "4.5★ ขึ้นไป", color: "#16a34a", test: (r: number) => r >= 4.5 },
  { key: "ok", label: "4.0–4.4★", color: "#f59e0b", test: (r: number) => r >= 4.0 },
  { key: "weak", label: "ต่ำกว่า 4.0★", color: "#dc2626", test: () => true },
];

const bandOf = (r: number) => RATING_BANDS.find((b) => b.test(r)) ?? RATING_BANDS[2];

function RatingBandDonut({ items, size = 40 }: { items: TopProduct[]; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pad = (4 / 360) * c;
  const total = items.length;
  const counts = RATING_BANDS.map((b) => items.filter((p) => bandOf(p.rating).key === b.key).length);
  let acc = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={RING_TRACK} strokeWidth={stroke} fill="none" />
        {total > 0
          ? RATING_BANDS.map((b, i) => {
              const frac = counts[i] / total;
              const offset = acc;
              acc += frac;
              if (frac <= 0) return null;
              const drawn = Math.max(0, frac * c - pad);
              return (
                <Circle
                  key={b.key}
                  cx={size / 2} cy={size / 2} r={r}
                  stroke={b.color} strokeWidth={stroke} fill="none"
                  strokeDasharray={`${drawn} ${c - drawn}`}
                  strokeDashoffset={-(offset * c + pad / 2)}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
            })
          : null}
      </Svg>
    </View>
  );
}

function CustomerTotals({ list, all, scope }: { list: Customer[]; all: Customer[]; scope: string }) {
  const orders = list.reduce((s, c) => s + c.orders, 0);
  const total = list.reduce((s, c) => s + c.total, 0);
  const repeatOrders = list.reduce((s, c) => s + Math.max(0, c.orders - 1), 0);
  const avgRepeat = orders > 0 ? Math.round((repeatOrders / orders) * 100) : 0;
  const aov = orders > 0 ? Math.round(total / orders) : 0;
  // The ring IS the two stats beside it: the gray track = ออเดอร์ทั้งหมด, the
  // green arc = the slice of them that are repeat purchases. The dots reuse
  // those exact two colours, so the chart needs no separate legend.
  return (
    <View style={{ borderRadius: 24, backgroundColor: "#fff", boxShadow: "0px 2px 4px rgba(0,0,0,0.15), 0px 6px 12px rgba(0,0,0,0.08)", elevation: 3 }}>
      <LinearGradient colors={[BRAND_GREEN_DARK, BRAND_GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 24, padding: 14, gap: 8, overflow: "hidden" }}>
        <Image source={SUMMARY_ART} style={{ position: "absolute", right: -14, bottom: -20, width: 130, height: 130, opacity: 0.95 }} resizeMode="contain" />
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }} numberOfLines={1}>ข้อมูลของ {scope}</Text>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "rgba(255,255,255,0.95)" }} numberOfLines={1}>ลูกค้า {all.length} คน</Text>
        </View>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>ยอดซื้อรวม</Text>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>฿{total.toLocaleString()}</Text>
      </LinearGradient>

      {/* Stats strip — ring track (เทา) = ออเดอร์, ring arc (เขียว) = อัตราซื้อซ้ำ */}
      <View className="flex-row items-center" style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 14 }}>
        <StatRing pct={avgRepeat / 100} size={40} color={BRAND_GREEN} />
        <View className="flex-row items-center" style={{ flex: 1, flexWrap: "wrap", rowGap: 8, columnGap: 16 }}>
          <CStat dot={RING_TRACK} label="ออเดอร์" value={orders.toLocaleString()} unit="ครั้ง" />
          <CStat dot={BRAND_GREEN} label="อัตราซื้อซ้ำ" value={`${avgRepeat}`} unit="%" />
          <CStat label="AOV เฉลี่ย" value={aov.toLocaleString()} unit="฿" />
        </View>
      </View>
    </View>
  );
}

/* ---------- Product table — web "Top Product" columns, same card shell ---------- */

const PRODUCT_ART = require("../../assets/kpi/products-sold.png");
const RATING_ART = require("../../assets/kpi/rating.png");

type ProductMode = "top" | "rating";

// ดาว 5 ดวง (เต็ม/เทา) — the web's คะแนน cell renders the rating as stars.
function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  const filled = Math.round(rating);
  return (
    <View className="flex-row items-center" style={{ gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} color={i < filled ? "#f59e0b" : "#e5e7eb"} fill={i < filled ? "#f59e0b" : "#e5e7eb"} strokeWidth={0} />
      ))}
    </View>
  );
}

// ยอดส่วนลด uses the web's warm copper (#a16207); คะแนน uses #c2410c.
const DISCOUNT_TONE = "#a16207";
const RATING_TONE = "#c2410c";

// Rating card columns — equal width so คะแนน and รีวิว line up on both rows.
// Auto-width (undefined): the คะแนน column hugs its stars, so รีวิว sits right
// beside it instead of after a fixed 112px slot with dead space at the end.
const RATING_COL = undefined;

function ProductCard({ p, rank, mode }: { p: TopProduct; rank: number; mode: ProductMode }) {
  const medal = rankColor(rank);
  const tint = rank < 3 ? medal : "#94a3b8";
  const rating = mode === "rating";
  const avg = avgPerUnit(p);
  const discount = productDiscount(p);
  // No tinted peek strip: everything it could carry (หมวดหมู่, รีวิว) already
  // sits in the card body, so it was pure repetition.
  return (
    <View style={{ backgroundColor: "white", borderRadius: 24, boxShadow: "0px 2px 4px rgba(0,0,0,0.15), 0px 6px 12px rgba(0,0,0,0.08)", elevation: 3 }}>
        <View style={{ padding: 14, gap: 12 }}>
          {/* Header — อันดับ + ชื่อ/หมวดหมู่ + รายได้ (Top) / คะแนน (Rating) */}
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: rank < 3 ? medal : "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: rankTextColor(rank) }}>{rank + 1}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a" }}>{p.name}</Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{p.category}</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

          {/* marginTop pulls the row back up: each column's label box is 18px tall
              with the text bottom-aligned, so it carries ~5px of empty space on
              top that read as extra distance from the divider. */}
          {/* Stats — ALL in one row (flex: 1 each, no wrap), ordered as the story
              the numbers tell:
              Top:    ขายกี่ชิ้น → ได้เงินเท่าไร → เสียส่วนลดไปเท่าไร → เหลือเฉลี่ยชิ้นละเท่าไร
              Rating: คะแนนเท่าไร → จากกี่รีวิว (ความน่าเชื่อถือ) → ขายกี่ชิ้น → เป็นเงินเท่าไร */}
          <View className="flex-row items-start" style={{ gap: 8, marginTop: -5 }}>
            {rating ? (
              /* Rating Product — web has ONLY คะแนน (ดาว + ตัวเลข) และ รีวิว.
                 Two columns only, so they sit packed left with a 16px gap
                 instead of stretching across the card. */
              <View className="flex-row items-start" style={{ gap: 20 }}>
                {/* Built with the SAME label/value boxes as CStat compact (label row
                    18px bottom-aligned, value row 20px) so คะแนน and รีวิว share one
                    vertical rhythm instead of drifting apart. */}
                <View style={{ gap: 6, width: RATING_COL }}>
                  {/* label box: identical to CStat compact — height 18, bottom-aligned,
                      lineHeight 1.5× so Thai tone marks aren't clipped */}
                  <View className="flex-row items-end" style={{ height: 18 }}>
                    <Text numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 11.5 * 1.5, color: "rgba(0,0,0,0.5)", includeFontPadding: false }}>คะแนน</Text>
                  </View>
                  {/* value box: also identical — height 20, contents bottom-aligned,
                      so the number sits on the same baseline as รีวิว's */}
                  <View style={{ height: 20, justifyContent: "flex-end" }}>
                    <View className="flex-row items-end" style={{ gap: 6 }}>
                      <Text style={{ fontSize: 15, lineHeight: 18, fontWeight: "700", color: RATING_TONE, includeFontPadding: false }}>{p.rating.toFixed(1)}</Text>
                      <Stars rating={p.rating} size={15} />
                    </View>
                  </View>
                </View>
                {/* unit left blank: "รีวิว (รีวิว)" would just repeat the label */}
                <CStat compact width={RATING_COL} label="รีวิว" value={p.reviews.toLocaleString()} unit="" />
              </View>
            ) : (
              <>
                <CStat compact flex label="ยอดขาย" value={p.sold.toLocaleString()} unit="ชิ้น" />
                <CStat compact flex label="รายได้" value={p.revenue.toLocaleString()} unit="฿" />
                <CStat compact flex label="ส่วนลด" value={discount > 0 ? `−${discount.toLocaleString()}` : "–"} unit="฿" />
                <CStat compact flex label="เฉลี่ย/ชิ้น" value={avg.toLocaleString()} unit="" />
              </>
            )}
          </View>

        </View>
    </View>
  );
}

// Skeleton mirroring ProductCard — shown for a beat while the swiped table
// (Top ⇄ Rating) re-scopes, so the swap reads as "loading" not "glitching".
function ProductCardSkeleton() {
  const bar = (w: number | string, h: number) => (
    <View style={{ width: w as any, height: h, borderRadius: 6, backgroundColor: "#eef1ef" }} />
  );
  return (
    <View style={{ backgroundColor: "white", borderRadius: 24, boxShadow: "0px 2px 4px rgba(0,0,0,0.15), 0px 6px 12px rgba(0,0,0,0.08)", elevation: 3 }}>
      <View style={{ padding: 14, gap: 12 }}>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#eef1ef" }} />
          <View style={{ flex: 1, gap: 6 }}>
            {bar("70%", 14)}
            {bar("40%", 10)}
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
        <View className="flex-row" style={{ gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flex: 1, gap: 6 }}>
              {bar("80%", 10)}
              {bar("60%", 14)}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ---------- Market table — ประสิทธิภาพช่องทาง ----------
 * Each channel gets the SUMMARY-card shell (gradient head + white stats strip),
 * tinted with that channel's own brand colour, so the list reads as a stack of
 * per-channel summaries. The ring is อัตราคอนเวิร์ต — the one real ratio a
 * channel has (ออเดอร์ ÷ ผู้เข้าชม).
 */

const MARKET_ART = require("../../assets/kpi/visitors.png");

// Column widths sized to each metric's WORST CASE, not to whatever this card
// happens to hold — so the columns line up down the whole stack.
//   Conv. ≤ "100.0%" · ผู้เข้าชม ≤ 5 หลัก · ออเดอร์ ≤ 4 หลัก · ROAS ≤ "99.9x"
const CH_COL = { conv: 48, visits: 58, orders: 50, roas: 44 };

// Per-logo vertical nudge — the Gmail envelope sits high in its 24×24 box, so it
// needs to drop further than the glyphs that fill their box.
const LOGO_BOTTOM: Record<string, number> = { "Email Marketing": -20, YouTube: -22, "Line OA": -18 };

// โลโก้บางตัวเส้นบาง/คอนทราสต์ต่ำกับพื้นของมันเอง — ดันความทึบขึ้นเป็นรายตัว
const LOGO_OPACITY: Record<string, number> = { YouTube: 0.3 };

// Channels with no brand mark get a lucide glyph instead (ISC, no attribution —
// Flaticon's CC-BY would force a credit line inside the app).
const CHANNEL_FALLBACK_ICON: Record<string, LucideIcon> = {
  "Direct (URL)": Link,
};

function ChannelCard({ ch }: { ch: Channel }) {
  const { conv, roas } = channelStats(ch);
  const tint = channelColor(ch);
  // Web columns, nothing more: ช่องทาง (โลโก้ + ชื่อ) · ผู้เข้าชม · ออเดอร์ ·
  // Conv. Rate · รายได้ · ROAS. No rank, no type tag.
  return (
    <View style={{ borderRadius: 24, backgroundColor: "#fff", boxShadow: "0px 2px 4px rgba(0,0,0,0.15), 0px 6px 12px rgba(0,0,0,0.08)", elevation: 3 }}>
      {/* Head wears the platform's real brand gradient (TikTok ดำ→ฟ้านีออน, IG ม่วง→แดง …) */}
      <LinearGradient colors={channelGradient(ch)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 24, padding: 14, gap: 8, overflow: "hidden" }}>
        {/* Same head rhythm as the summary card: small label (ประเภทช่องทาง) →
            heading (ชื่อช่องทาง) → metric label → big value. No logo mark. */}
        {/* Real brand mark, watermarked off the corner — same trick the summary
            cards use with their illustration. Channels with no logo (Direct /
            Affiliate / Email) simply show none. */}
        {CHANNEL_LOGO[ch.name] ? (
          <View pointerEvents="none" style={{ position: "absolute", right: -14, bottom: LOGO_BOTTOM[ch.name] ?? -10, opacity: LOGO_OPACITY[ch.name] ?? 0.18 }}>
            <Svg width={104} height={104} viewBox={CHANNEL_LOGO_VIEWBOX[ch.name] ?? "0 0 24 24"}>
              <Path d={CHANNEL_LOGO[ch.name]} fill="#fff" />
            </Svg>
          </View>
        ) : CHANNEL_FALLBACK_ICON[ch.name] ? (
          (() => {
            const Icon = CHANNEL_FALLBACK_ICON[ch.name];
            return (
              <View pointerEvents="none" style={{ position: "absolute", right: -10, bottom: -8, opacity: 0.18 }}>
                {/* stroke icon ต้องหนากว่าปกติ เพราะขยายเป็น 96px แล้วเส้นจะดูบางกว่า solid logo ตัวอื่น */}
                <Icon size={96} color="#fff" strokeWidth={2.6} />
              </View>
            );
          })()
        ) : null}
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }} numberOfLines={1}>{ch.type}</Text>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "rgba(255,255,255,0.95)" }} numberOfLines={1}>{ch.name}</Text>
        </View>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>รายได้</Text>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>฿{ch.revenue.toLocaleString()}</Text>
      </LinearGradient>

      {/* Ring = Conv. Rate (ออเดอร์ ÷ ผู้เข้าชม) — the one real ratio a channel has */}
      <View className="flex-row items-center" style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 14 }}>
        {/* Columns take only the width their content needs and pack LEFT with a
            16px gap — stretching them across the card left Conv. floating in
            dead space. One row, no wrap, so every card is the same height. */}
        <StatRing pct={conv / 100} size={40} color={tint} />
        <View className="flex-row items-start" style={{ flex: 1, gap: 16 }}>
          <CStat compact width={CH_COL.conv} dot={tint} label="Conv." value={`${conv.toFixed(1)}%`} unit="" />
          {/* จุดเทา = วง track ของกราฟ (ผู้เข้าชมทั้งหมด = ตัวหารของ Conv.) */}
          <CStat compact width={CH_COL.visits} dot={RING_TRACK} label="ผู้เข้าชม" value={ch.visits.toLocaleString()} unit="" />
          <CStat compact width={CH_COL.orders} label="ออเดอร์" value={ch.orders.toLocaleString()} unit="" />
          {/* No ad spend → ROAS undefined; the web prints an em dash */}
          <CStat compact width={CH_COL.roas} labelSize={10.5} label="ROAS" value={roas != null ? `${roas.toFixed(1)}x` : "—"} unit="" />
        </View>
      </View>
    </View>
  );
}

function ChannelTotals({ list, all, scope }: { list: Channel[]; all: Channel[]; scope: string }) {
  const visits = list.reduce((s, c) => s + c.visits, 0);
  const orders = list.reduce((s, c) => s + c.orders, 0);
  const revenue = list.reduce((s, c) => s + c.revenue, 0);
  const cost = list.reduce((s, c) => s + c.cost, 0);
  const conv = visits > 0 ? (orders / visits) * 100 : 0;
  const roas = cost > 0 ? revenue / cost : null;
  return (
    <View style={{ borderRadius: 24, backgroundColor: "#fff", boxShadow: "0px 2px 4px rgba(0,0,0,0.15), 0px 6px 12px rgba(0,0,0,0.08)", elevation: 3 }}>
      <LinearGradient colors={[BRAND_GREEN_DARK, BRAND_GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 24, padding: 14, gap: 8, overflow: "hidden" }}>
        <Image source={MARKET_ART} style={{ position: "absolute", right: -14, bottom: -20, width: 130, height: 130, opacity: 0.95 }} resizeMode="contain" />
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }} numberOfLines={1}>ข้อมูลของ {scope}</Text>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "rgba(255,255,255,0.95)" }} numberOfLines={1}>{all.length} ช่องทาง</Text>
        </View>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>รายได้รวม</Text>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>฿{revenue.toLocaleString()}</Text>
      </LinearGradient>

      <View className="flex-row items-center" style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 14 }}>
        <StatRing pct={conv / 100} size={40} color={BRAND_GREEN} />
        <View className="flex-row items-start" style={{ flex: 1, gap: 16 }}>
          <CStat compact width={CH_COL.conv} dot={BRAND_GREEN} label="Conv." value={`${conv.toFixed(1)}%`} unit="" />
          <CStat compact width={CH_COL.visits} dot={RING_TRACK} label="ผู้เข้าชม" value={visits.toLocaleString()} unit="" />
          <CStat compact width={CH_COL.orders} label="ออเดอร์" value={orders.toLocaleString()} unit="" />
          <CStat compact width={CH_COL.roas} labelSize={10.5} label="ROAS" value={roas != null ? `${roas.toFixed(1)}x` : "—"} unit="" />
        </View>
      </View>
    </View>
  );
}

// Two summary pages — Top Product (รายได้) and Rating Product (คะแนน). Swiping
// between them switches WHAT the table below ranks, exactly like the Flash Sale
// summary carousel rescopes its product list.
const PRODUCT_PAGES: { key: ProductMode; heading: string }[] = [
  { key: "top", heading: "Top Product" },
  { key: "rating", heading: "Rating Product" },
];

// Rating card wears the star's gold; Top Product keeps the brand green — the
// colour IS the signal for which table the list below is showing.
const RATING_GOLD_DARK = "#b45309";
const RATING_GOLD = "#f59e0b";

function ProductTotals({ list, all, scope, mode, onMode }: {
  list: TopProduct[]; all: TopProduct[]; scope: string; mode: ProductMode; onMode: (m: ProductMode) => void;
}) {
  const [w, setW] = useState(0);
  const ref = useRef<ScrollView>(null);
  const sold = list.reduce((s, p) => s + p.sold, 0);
  const revenue = list.reduce((s, p) => s + p.revenue, 0);
  const reviews = list.reduce((s, p) => s + p.reviews, 0);
  const discount = list.reduce((s, p) => s + productDiscount(p), 0);
  const avg = sold > 0 ? Math.round(revenue / sold) : 0;
  const rating = list.length > 0 ? list.reduce((s, p) => s + p.rating, 0) / list.length : 0;
  // Top ring = ส่วนลด ÷ รายได้ — the one real 0–100% ratio in this table, and both
  // its numerator and denominator are already on the card. Rating ring = ★ ÷ 5.
  const discountPct = revenue > 0 ? Math.round((discount / revenue) * 100) : 0;


  // Peek geometry — the next card's edge stays visible so the swipe advertises
  // itself. Full-bleed (marginHorizontal -16) + padded content gives the card
  // shadows room instead of clipping them at the scroll bounds; the per-card
  // paddingVertical does the same vertically (a horizontal ScrollView ignores
  // contentContainer paddingVertical).
  const GAP = 10;
  const cardW = Math.max(0, w - 28);
  const step = cardW + GAP;
  // Centre the focused card in the full-bleed viewport (w + 32, since the
  // scroller bleeds out by 16 on each side). Equal side padding = equal peek
  // from both edges; without it the card sat flush against the left margin.
  const SIDE = Math.max(0, (w + 32 - cardW) / 2);

  useEffect(() => {
    const i = PRODUCT_PAGES.findIndex((p) => p.key === mode);
    if (w > 0 && i >= 0) ref.current?.scrollTo({ x: i * step, animated: true });
  }, [mode, w, step]);

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <ScrollView
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          decelerationRate="fast"
          style={{ marginHorizontal: -16, marginVertical: -12 }}
          contentContainerStyle={{ gap: GAP, paddingHorizontal: SIDE }}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / step);
            const next = PRODUCT_PAGES[Math.max(0, Math.min(PRODUCT_PAGES.length - 1, i))].key;
            if (next !== mode) { Haptics.selectionAsync(); onMode(next); }
          }}
        >
          {PRODUCT_PAGES.map((pg) => {
            const isRating = pg.key === "rating";
            return (
              <View key={pg.key} style={{ paddingVertical: 12 }}>
              <View style={{ width: cardW, borderRadius: 24, backgroundColor: "#fff", boxShadow: "0px 2px 4px rgba(0,0,0,0.15), 0px 6px 12px rgba(0,0,0,0.08)", elevation: 3 }}>
                <LinearGradient colors={isRating ? [RATING_GOLD_DARK, RATING_GOLD] : [BRAND_GREEN_DARK, BRAND_GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 24, padding: 14, gap: 8, overflow: "hidden" }}>
                  <Image source={isRating ? RATING_ART : PRODUCT_ART} style={{ position: "absolute", right: -14, bottom: -20, width: 130, height: 130, opacity: 0.95 }} resizeMode="contain" />
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }} numberOfLines={1}>{pg.heading} · ข้อมูลของ {scope}</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "rgba(255,255,255,0.95)" }} numberOfLines={1}>สินค้า {all.length} รายการ</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{isRating ? "คะแนนเฉลี่ยทั้งร้าน" : "รายได้รวม"}</Text>
                  {isRating ? (
                    <View className="flex-row items-center" style={{ gap: 10 }}>
                      <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>{rating.toFixed(1)}</Text>
                      <Stars rating={rating} size={16} />
                    </View>
                  ) : (
                    <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>฿{revenue.toLocaleString()}</Text>
                  )}
                </LinearGradient>

                {/* Ring — Top: คะแนนเฉลี่ย/5 · Rating: คะแนนเฉลี่ย/5 (the only true ratio) */}
                {/* Chart — Top: รายได้ ตัดเป็น สุทธิ (เขียว) / ส่วนลด (ทองแดง); the two
                    arcs sum to the ฿ headline above. Rating: คะแนนเฉลี่ย ÷ 5 ★. */}
                <View className="flex-row items-center" style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 14 }}>
                  {isRating ? (
                    <RatingBandDonut items={list} />
                  ) : (
                    <SplitDonut total={revenue} part={discount} partColor={DISCOUNT_TONE} restColor={BRAND_GREEN} />
                  )}
                  <View className="flex-row items-center" style={{ flex: 1, flexWrap: "wrap", rowGap: 8, columnGap: 16 }}>
                    {isRating ? (
                      <>
                        {/* The donut splits สินค้า by rating band; these name its arcs
                            (คะแนนเฉลี่ยไม่ซ้ำที่นี่ — มันคือพาดหัวข้างบนแล้ว). */}
                        <CStat dot="#16a34a" label="4.5 ขึ้นไป" value={`${list.filter((p) => p.rating >= 4.5).length}`} unit="รายการ" />
                        <CStat dot="#dc2626" label="ต่ำกว่า 4.0" value={`${list.filter((p) => p.rating < 4).length}`} unit="รายการ" />
                        <CStat label="รีวิวรวม" value={reviews.toLocaleString()} unit="รีวิว" />
                      </>
                    ) : (
                      <>
                        {/* รายได้สุทธิ isn't repeated here — it IS the ฿ headline above;
                            the donut's green arc already stands for it. */}
                        <CStat dot={DISCOUNT_TONE} label={`ส่วนลด (${discountPct}%)`} value={discount > 0 ? `−${discount.toLocaleString()}` : "–"} unit={discount > 0 ? "฿" : ""} />
                        <CStat label="ยอดขาย" value={sold.toLocaleString()} unit="ชิ้น" />
                        <CStat label="เฉลี่ย/ชิ้น" value={avg.toLocaleString()} unit="฿" />
                      </>
                    )}
                  </View>
                </View>
              </View>
              </View>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

/** รายงานข้อมูลลูกค้า / สินค้า / Market — KPIs + chart + table (ported from web). */
export function ShopReportView({ kind, period, setPeriod, dateSel, exportRef }: { kind: ReportKind; period: Period; setPeriod: (p: Period) => void; dateSel: DateRange; exportRef?: { current: ((kind: "excel" | "pdf") => void) | null } }) {
  // Customers get the web's three chart tabs (เส้น/แท่ง/วงกลม); the other
  // reports keep line/bar only, matching their web tabs.
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line");
  const hasPie = true; // all three reports have the web's 3 chart tabs
  const data = REPORT_DATA[period];
  const scope = salesDateLabel(period, dateSel);
  const days = Math.max(1, data.filter((d) => d.visits > 0).length);

  const kpis: Kpi[] = useMemo(() => {
    if (kind === "customers") {
      const nc = sumField(data, "newCust"), rp = sumField(data, "repeat"), tot = nc + rp;
      return [
        { label: `ลูกค้าใหม่ ${scope}`, value: `${nc.toLocaleString()} คน`, sub: `เฉลี่ย ${Math.round(nc / days)} คน/วัน`, accent: "#3b82f6", SubIcon: TrendingUp, art: ART.newCustomer },
        { label: `ลูกค้าซื้อซ้ำ ${scope}`, value: `${rp.toLocaleString()} คน`, sub: `เฉลี่ย ${Math.round(rp / days)} คน/วัน`, accent: "#319754", SubIcon: TrendingUp, art: ART.repeatCustomers },
        { label: `ลูกค้าทั้งหมด ${scope}`, value: `${tot.toLocaleString()} คน`, sub: `เฉลี่ย ${Math.round(tot / days)} คน/วัน`, accent: "#0ea5e9", SubIcon: TrendingUp, art: ART.groupCustomer },
        { label: "ลูกค้าทั้งหมดในร้าน", value: "1,247 คน", sub: `+${nc} คนใหม่`, accent: "#10b981", SubIcon: UserPlus, art: ART.member },
      ];
    }
    if (kind === "products") {
      const u = sumField(data, "units");
      return [
        { label: `จำนวนขาย ${scope}`, value: `${u.toLocaleString()} ชิ้น`, sub: `เฉลี่ย ${Math.round(u / days)} ชิ้น/วัน`, accent: "#319754", SubIcon: TrendingUp, art: ART.productsSold },
        { label: "สินค้าทั้งหมดในร้าน", value: "247 รายการ", sub: "9 หมวดหมู่", accent: "#0ea5e9", SubIcon: Boxes, art: ART.productsStore },
        { label: "สต็อกต่ำ / หมด", value: "4 รายการ", sub: "1 รายการสินค้าหมด", accent: "#dc2626", SubIcon: AlertTriangle, art: ART.stock },
        { label: "รีวิวเฉลี่ยร้าน", value: "4.6 ★", sub: "1,247 รีวิวรวม", accent: "#f59e0b", SubIcon: Star, art: ART.rating },
      ];
    }
    const v = sumField(data, "visits"), o = sumField(data, "orders"), conv = v > 0 ? (o / v) * 100 : 0;
    return [
      { label: `ผู้เข้าชม ${scope}`, value: `${v.toLocaleString()} คน`, sub: `เฉลี่ย ${Math.round(v / days)} คน/วัน`, accent: "#7c3aed", SubIcon: TrendingUp, art: ART.visitors },
      { label: `ออเดอร์ ${scope}`, value: `${o.toLocaleString()} รายการ`, sub: `เฉลี่ย ${Math.round(o / days)} /วัน`, accent: "#f59e0b", SubIcon: TrendingUp, art: ART.bagInCart },
      { label: `อัตราคอนเวิร์ต ${scope}`, value: `${conv.toFixed(2)}%`, sub: `${o} จาก ${v.toLocaleString()} ครั้ง`, accent: "#10b981", SubIcon: TrendingUp, art: ART.convert },
      { label: "คูปองที่ใช้", value: "32 ครั้ง", sub: "8 คูปองล่าสุด", accent: "#ec4899", SubIcon: Ticket, art: ART.coupon },
    ];
  }, [kind, data, scope, days]);

  /* ---- Customer table — flat ranked list (web parity), sort + export like ยอดขาย ----
   * Web has five filters stacked on this table: ช่วงเวลา (period tabs) → วันที่
   * (date picker) → จุดบนกราฟที่กด (focusedLabel) → เรียงลำดับ → จำนวนต่อหน้า. */
  // One sort state serves both ranked tables (customers / products) — their key
  // sets don't overlap, so the visual map and the option list just switch by kind.
  // Products have TWO tables (web: Top Product / Rating Product) — swiping the
  // summary carousel switches which one the list below shows, and the sort
  // options switch with it.
  const [pMode, setPMode] = useState<ProductMode>("top");
  const sortOptions =
    kind === "products" ? (pMode === "rating" ? RATING_SORT_OPTIONS : PRODUCT_SORT_OPTIONS)
    : kind === "market" ? CHANNEL_SORT_OPTIONS
    : CUSTOMER_SORT_OPTIONS;
  const [sort, setSort] = useState<string>(
    kind === "products" ? "sold_desc" : kind === "market" ? "revenue_desc" : "total_desc",
  );
  // Switching table resets the sort to that table's default key.
  useEffect(() => {
    if (kind === "products") setSort(pMode === "rating" ? "rating_desc" : "sold_desc");
  }, [pMode, kind]);
  const [focused, setFocused] = useState<string | null>(null); // bucket tapped on the chart

  // period + date → scaled list; then narrow to the focused chart bucket.
  const scoped = useMemo(() => {
    const base = customersForPeriod(period, dateSel.start.month);
    if (!focused) return base;
    const row = data.find((d) => d.label === focused);
    return focusCustomers(base, focused, row ? row.newCust + row.repeat : 0);
  }, [period, dateSel, focused, data]);
  const ranked = useMemo(() => sortCustomers(scoped, sort as CustomerSort), [scoped, sort]);

  const pScoped = useMemo(() => {
    const base = productsForPeriod(period, dateSel.start.month);
    if (!focused) return base;
    const row = data.find((d) => d.label === focused);
    return focusProducts(base, focused, row ? row.units : 0);
  }, [period, dateSel, focused, data]);
  const chScoped = useMemo(() => {
    const base = channelsForPeriod(period, dateSel.start.month);
    if (!focused) return base;
    const row = data.find((d) => d.label === focused);
    return focusChannels(base, focused, row ? row.visits : 0);
  }, [period, dateSel, focused, data]);
  const chRanked = useMemo(() => sortChannels(chScoped, sort as ChannelSort), [chScoped, sort]);

  const pRanked = useMemo(
    () => (pMode === "rating"
      ? sortRatingProducts(pScoped, sort as RatingSort)
      : sortTopProducts(pScoped, sort as TopProductSort)),
    [pScoped, sort, pMode],
  );

  // Paging follows the app's own pattern (Flash Sale list): reveal 10, then a
  // "ดูเพิ่มเติม" beat that loads the next 10 after a 350ms skeleton — NOT the
  // web's numbered pages, which don't belong on a scrolling mobile list.
  const PAGE = 10;
  const [shownCount, setShownCount] = useState(PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => setShownCount(PAGE), [sort, focused, period, dateSel, pMode]);
  // ANY re-scope of the list (sort, period, date, chart focus, or swiping the
  // product summary) flashes skeletons for a beat — same 400ms feedback the
  // Flash Sale list gives, so a data swap never reads as a glitch.
  const [modeLoading, setModeLoading] = useState(false);
  const firstMode = useRef(true);
  useEffect(() => {
    if (firstMode.current) { firstMode.current = false; return; }
    setModeLoading(true);
    const t = setTimeout(() => setModeLoading(false), 400);
    return () => clearTimeout(t);
  }, [pMode, sort, period, dateSel, focused]);

  const pageItems = ranked.slice(0, shownCount);
  const pPageItems = pRanked.slice(0, shownCount);
  const chPageItems = chRanked.slice(0, shownCount);
  const moreLeft =
    kind === "products" ? pRanked.length - pPageItems.length
    : kind === "market" ? chRanked.length - chPageItems.length
    : ranked.length - pageItems.length;
  const loadMore = () => {
    if (loadingMore || moreLeft <= 0) return;
    setLoadingMore(true);
    setTimeout(() => { setShownCount((n) => n + PAGE); setLoadingMore(false); }, 350);
  };

  const runExport = async (fileKind: "excel" | "pdf") => {
    try {
      showToast(`กำลังสร้างไฟล์ ${fileKind === "excel" ? "Excel" : "PDF"}…`, "info");
      const d: CustomerExportData = {
        scope,
        groups: [{
          title: "ลูกค้าที่มียอดซื้อสูงสุด",
          total: ranked.reduce((s, c) => s + c.total, 0),
          orders: ranked.reduce((s, c) => s + c.orders, 0),
          rows: ranked.map((c) => ({
            name: c.name, email: c.email, orders: c.orders, total: c.total, lastBuy: c.lastBuy, fav: c.fav,
          })),
        }],
      };
      if (fileKind === "excel") await exportCustomerReportExcel(d);
      else await exportCustomerReportPDF(d);
    } catch {
      showToast("ส่งออกไม่สำเร็จ", "error");
    }
  };
  // Reassigned each render so the file always matches the visible sort.
  if (exportRef && kind === "customers") exportRef.current = runExport;

  // Sort pill + AppleMenu morph — the app-wide pattern (identical to ยอดขาย);
  // the five keys mirror the web <select> exactly.
  const SORT_VISUAL: Record<string, { Icon: LucideIcon; color: string }> = {
    // customers
    total_desc: { Icon: TrendingUp, color: "#10b981" },
    total_asc: { Icon: TrendingDown, color: "#f59e0b" },
    orders_desc: { Icon: ShoppingCart, color: "#0ea5e9" },
    recent: { Icon: CalendarDays, color: "#ec4899" },
    oldest: { Icon: Clock, color: "#6366f1" },
    // products
    sold_desc: { Icon: TrendingUp, color: "#10b981" },
    sold_asc: { Icon: TrendingDown, color: "#f59e0b" },
    revenue_desc: { Icon: Package, color: "#0ea5e9" },
    // rating table
    rating_desc: { Icon: Star, color: "#f59e0b" },
    rating_asc: { Icon: TrendingDown, color: "#6366f1" },
    reviews_desc: { Icon: Users, color: "#ec4899" },
    // market table
    conv_desc: { Icon: TrendingUp, color: "#10b981" },
    visits_desc: { Icon: Eye, color: "#7c3aed" },
    roas_desc: { Icon: Ticket, color: "#ec4899" },
  };
  const sortVisual = SORT_VISUAL[sort];
  const sortLabel = sortOptions.find((s) => s.id === sort)?.label ?? "";
  const sortAnim = useRef(new Animated.Value(1)).current;
  const sortBtnRef = useRef<View>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortMounted, setSortMounted] = useState(false);
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
    setSortOpen(false);
    setTimeout(() => setSortMounted(false), 200);
  };
  const pickSort = (id: string) => {
    closeSort();
    if (id === sort) return;
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setSort(id);
    sortAnim.setValue(0);
    Animated.spring(sortAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 160 }).start();
  };

  return (
    <View style={{ gap: 12 }}>
      <PeriodTabs period={period} onChange={setPeriod} />

      {/* KPI + chart — ONE card, exactly like the sales report (and the web,
          where both live in the same white panel and read the same period). */}
      <Card>
        <View className="flex-row" style={{ flexWrap: "wrap", gap: 10 }}>
          {kpis.map((k) => <KpiCard key={k.label} k={k} />)}
        </View>

        <View className="flex-row items-center justify-between" style={{ marginTop: 18, marginBottom: 10, gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>{CHART_TITLE[kind]}</Text>
          <SegmentedTabs
            size="compact"
            style={{ width: isTablet() ? (hasPie ? 250 : 170) : (hasPie ? 172 : 118) }}
            tabs={
              hasPie
                ? [
                    { id: "line" as const, label: "เส้น" },
                    { id: "bar" as const, label: "แท่ง" },
                    { id: "pie" as const, label: "วงกลม" },
                  ]
                : [
                    { id: "line" as const, label: "เส้น" },
                    { id: "bar" as const, label: "แท่ง" },
                  ]
            }
            active={chartType}
            onChange={setChartType}
          />
        </View>
        {chartType === "pie" ? (
          /* Donut per report (web pieData) — same donut the sales report uses,
             pointed at that report's series. */
          kind === "products"
            ? <SalesDonut data={data} valueKey="units" centerLabel="จำนวนขายรวม" format={(n) => `${n.toLocaleString()} ชิ้น`} />
            : kind === "market"
            ? <SalesDonut data={data} valueKey="visits" centerLabel="ผู้เข้าชมรวม" format={(n) => `${n.toLocaleString()} คน`} />
            : <SalesDonut data={data} valueKey="newCust" centerLabel="ลูกค้าใหม่รวม" format={(n) => `${n.toLocaleString()} คน`} />
        ) : (
          /* Tapping a bucket drills the table into it (web: chart click → focusedLabel) */
          <SalesChart data={data} type={chartType} series={SERIES[kind]} onSelect={hasPie ? setFocused : undefined} />
        )}
      </Card>

      {/* Ranked tables (ลูกค้า / สินค้า) — flash-style cards, NOT wrapped in a
          Card: the cards ARE the card layer (same as the sales report). */}
      <View style={{ marginTop: 6 }}>
          {/* No section title: the สรุปรวม card names the scope and now carries
              the sort filter, so a heading above it would just repeat itself. */}
          {focused ? (
            <Pressable
              onPress={() => setFocused(null)}
              className="flex-row items-center active:opacity-70"
              style={{ alignSelf: "flex-start", gap: 4, marginBottom: 8, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: "#fff7ed" }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#c2410c" }} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#c2410c" }}>เฉพาะ {focused}</Text>
              <X size={11} color="#c2410c" strokeWidth={2.8} />
            </Pressable>
          ) : null}

          <View style={{ marginBottom: 12 }}>
            {kind === "products"
              ? <ProductTotals list={pPageItems} all={pRanked} scope={scope} mode={pMode} onMode={setPMode} />
              : kind === "market"
              ? <ChannelTotals list={chPageItems} all={chRanked} scope={scope} />
              : <CustomerTotals list={pageItems} all={ranked} scope={scope} />}
          </View>

          {/* Sort — tinted pill outside the card, right-aligned above the list
              (the app-wide pattern; same control the sales report uses). */}
          <View className="flex-row items-center justify-end" style={{ marginBottom: 8 }}>
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

          <Modal visible={sortMounted} transparent animationType="none" onRequestClose={closeSort} statusBarTranslucent>
            <AppleMenu
              visible={sortOpen}
              onClose={closeSort}
              anchorTop={sortAnchor.top}
              anchorBottom={sortAnchor.bottom}
              right={sortAnchor.right}
              originSize={26}
              menuHeight={sortOptions.length * 48 + 16}
            >
              {sortOptions.map((opt) => {
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

          {/* iPad: two cards per row — the cards are ~430px-wide designs, so on a
              tablet column one-per-row leaves half the width empty. */}
          <View style={{ gap: 14, flexDirection: isTablet() ? "row" : "column", flexWrap: isTablet() ? "wrap" : "nowrap" }}>
            {(modeLoading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={`sk${i}`} />)
              : kind === "products"
              ? pPageItems.map((p, i) => <ProductCard key={p.name} p={p} rank={i} mode={pMode} />)
              : kind === "market"
              ? chPageItems.map((ch) => <ChannelCard key={ch.name} ch={ch} />)
              : pageItems.map((c, i) => <CustomerCard key={c.id} c={c} rank={i} />)
            ).map((el, i) => (
              <View key={`cell${i}`} style={{ width: isTablet() ? "48.7%" : "100%" }}>{el}</View>
            ))}
            {!modeLoading && (kind === "products" ? pPageItems : kind === "market" ? chPageItems : pageItems).length === 0 ? (
              <Card><Text style={{ textAlign: "center", paddingVertical: 24, fontSize: 13, color: TEXT_MUTED }}>ไม่พบข้อมูลที่ตรงกับเงื่อนไข</Text></Card>
            ) : null}
          </View>

          {/* ดูเพิ่มเติม — the app's load-more pattern (Flash Sale list): reveal
              the next 10 after a short skeleton beat, no numbered pages. */}
          {moreLeft > 0 ? (
            <Pressable
              onPress={loadMore}
              disabled={loadingMore}
              className="flex-row items-center justify-center active:opacity-70"
              style={{ marginTop: 14, height: 44, borderRadius: 999, gap: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e3ebe6" }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN_DARK }}>
                {loadingMore ? "กำลังโหลด…" : `ดูเพิ่มเติม (${moreLeft})`}
              </Text>
              {loadingMore ? null : <ChevronDown size={15} color={BRAND_GREEN_DARK} strokeWidth={2.6} />}
            </Pressable>
          ) : null}
      </View>
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
  const [dateSel, setDateSel] = useState<DateRange>(() => {
    const d = new Date();
    const today = { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() + 543 };
    return { start: today, end: today }; // start === end → single-point scope
  });
  // The sales report exposes its export action here (its data lives in the
  // child); the ส่งออก button sits in the app bar next to the date and opens
  // an Excel/PDF morph menu (same AppleMenu pattern as the sort picker).
  const exportRef = useRef<((kind: "excel" | "pdf") => void) | null>(null);
  const tablet = isTablet();
  const exportBtnRef = useRef<View>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMounted, setExportMounted] = useState(false);
  const [exportAnchor, setExportAnchor] = useState<{ top?: number; bottom?: number; right: number }>({ top: 0, right: 12 });
  const openExportMenu = () => {
    exportBtnRef.current?.measureInWindow((x, y, w, h) => {
      const { width: ww, height: wh } = Dimensions.get("window");
      const right = Math.max(12, ww - (x + w));
      if (y > wh * 0.55) setExportAnchor({ bottom: wh - y + 6, right });
      else setExportAnchor({ top: y + h + 6, right });
      setExportMounted(true);
      setExportOpen(true);
    });
  };
  const closeExport = () => {
    setExportOpen(false);
    setTimeout(() => setExportMounted(false), 200);
  };
  const pickExport = (kind: "excel" | "pdf") => {
    closeExport();
    exportRef.current?.(kind);
  };
  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={REPORT_TITLE[kind]}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <SalesDatePicker period={period} sel={dateSel} onChange={setDateSel} />
            {kind === "sales" || kind === "customers" ? (
              /* Liquid Glass capsule — same material/size as the date button */
              <Pressable ref={exportBtnRef} onPress={openExportMenu} hitSlop={8}>
                <GlassView
                  glassEffectStyle="regular"
                  colorScheme="light"
                  isInteractive
                  style={{ height: tablet ? 50 : 44, paddingHorizontal: 14, gap: 6, borderRadius: 999, flexDirection: "row", alignItems: "center" }}
                >
                  <Download size={tablet ? 17 : 16} color="#1a1a1a" strokeWidth={2.3} />
                  <Text style={{ fontSize: tablet ? 14.5 : 13, fontWeight: "700", color: "#1a1a1a" }}>ส่งออก</Text>
                  <ChevronDown size={tablet ? 16 : 15} color="#1a1a1a" strokeWidth={2.4} style={{ transform: [{ rotate: exportOpen ? "180deg" : "0deg" }] }} />
                </GlassView>
              </Pressable>
            ) : null}
          </View>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, alignItems: isTablet() ? "center" : "stretch" }}
      >
        {/* iPad: clamp the data-dense report to a readable, centered column
            (same isTablet() gate the teammate's pages use); phones stretch. */}
        <View style={{ width: "100%", maxWidth: isTablet() ? 820 : undefined }}>
          {kind === "sales" ? (
            <ShopSalesReportView period={period} setPeriod={setPeriod} dateSel={dateSel} exportRef={exportRef} />
          ) : (
            <ShopReportView kind={kind} period={period} setPeriod={setPeriod} dateSel={dateSel} exportRef={exportRef} />
          )}
        </View>
      </ScrollView>

      {/* Export morph menu — same AppleMenu pattern as the sort picker: the
          card scales out of the ส่งออก button. Excel / PDF rows (web parity). */}
      <Modal visible={exportMounted} transparent animationType="none" onRequestClose={closeExport} statusBarTranslucent>
        <AppleMenu
          visible={exportOpen}
          onClose={closeExport}
          anchorTop={exportAnchor.top}
          anchorBottom={exportAnchor.bottom}
          right={exportAnchor.right}
          originSize={tablet ? 50 : 44}
          menuHeight={112}
        >
          {([
            { kind: "excel" as const, label: "Excel (.csv)", Icon: FileSpreadsheet, color: "#0f7a3a" },
            { kind: "pdf" as const, label: "PDF (.pdf)", Icon: FileText, color: "#dc2626" },
          ]).map((o) => (
            <Pressable
              key={o.kind}
              onPress={() => pickExport(o.kind)}
              className="flex-row items-center active:opacity-60"
              style={{ height: 48, paddingHorizontal: 18, gap: 12 }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: o.color + "1a", alignItems: "center", justifyContent: "center" }}>
                <o.Icon size={15} color={o.color} strokeWidth={2.3} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: "#1a1a1a", fontWeight: "500" }}>{o.label}</Text>
            </Pressable>
          ))}
        </AppleMenu>
      </Modal>
    </View>
  );
}
