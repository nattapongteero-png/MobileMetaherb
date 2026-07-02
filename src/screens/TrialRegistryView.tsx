import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Switch,
  Alert,
} from "react-native";
import {
  FlaskConical,
  Check,
  Clock,
  Ban,
  Search,
  Coins,
  MoreHorizontal,
  Pencil,
  Eye,
  Trash2,
  Users,
  AlertCircle,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomSheet } from "../components/BottomSheet";
import { TRIAL_PRODUCTS, type TrialProduct } from "./TrialProductsScreen";
import { useAddedTrials } from "../data/trialDrafts";
import { MOCK_REGISTRATIONS, getRegistrationStatus } from "../data/ownerTrialRegistrations";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  BRAND_GREEN,
  BRAND_GREEN_DARK,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  TEXT_DISABLED,
  DIVIDER_GRAY,
  SURFACE_GRAY,
  RATING_BAR_FILL,
} from "../theme/tokens";

// Owner-console "ทะเบียนสินค้าทดลอง" — ported from the web OwnerTrialTabs registry
// tab. The web table becomes a card list on mobile (per Guidelines: tables →
// stacked cards on phone). Seats/status/reward logic mirrors the web 1:1.

type Filter = "all" | "active" | "ending_soon" | "closed";

const seatsTaken = (p: TrialProduct) => p.spotsTaken;
const seatsLeft = (p: TrialProduct) => Math.max(0, p.spotsTotal - seatsTaken(p));
const isClosedAuto = (p: TrialProduct) => p.endsInDays <= 0 || seatsLeft(p) <= 0;

// Status palette — same three buckets + colors as the web registry table.
function statusMeta(closed: boolean, endingSoon: boolean) {
  if (closed) return { label: "ปิดรับ", color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" };
  if (endingSoon) return { label: "เกือบเต็ม", color: "#b45309", bg: "#fef3c7", dot: "#f59e0b" };
  return { label: "เปิดรับ", color: "#287745", bg: "#dcfce7", dot: "#16a34a" };
}

function KpiCard({
  label,
  value,
  suffix,
  Icon,
  accent,
}: {
  label: string;
  value: string;
  suffix: string;
  Icon: typeof FlaskConical;
  accent: string;
}) {
  return (
    <View
      style={{
        width: "48%",
        backgroundColor: "white",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: DIVIDER_GRAY,
        padding: 14,
        gap: 6,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED, fontWeight: "500" }}>{label}</Text>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: accent + "15", alignItems: "center", justifyContent: "center" }}>
          <Icon size={14} color={accent} strokeWidth={2.4} />
        </View>
      </View>
      <Text style={{ fontSize: 20, fontWeight: "700", color: "#1a1a1a" }}>
        {value}
        <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: "500" }}> {suffix}</Text>
      </Text>
    </View>
  );
}

function SeatBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "#dc2626" : pct >= 60 ? "#f59e0b" : BRAND_GREEN;
  return (
    <View style={{ height: 5, borderRadius: 999, backgroundColor: "#f3f4f6", overflow: "hidden", marginTop: 6 }}>
      <View style={{ height: "100%", borderRadius: 999, width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
    </View>
  );
}

function ProductCard({
  p,
  closed,
  onMenu,
  onOpen,
}: {
  p: TrialProduct;
  closed: boolean;
  onMenu: () => void;
  onOpen: () => void;
}) {
  const taken = seatsTaken(p);
  const left = seatsLeft(p);
  const pct = (taken / p.spotsTotal) * 100;
  const endingSoon = !closed && (left <= 10 || p.endsInDays <= 7);
  const st = statusMeta(closed, endingSoon);
  const source = p.imageSrc ? p.imageSrc : { uri: p.image };

  return (
    <Pressable
      onPress={onOpen}
      className="active:opacity-90"
      style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14, gap: 12 }}
    >
      {/* Product identity + action menu */}
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <Image
          source={source}
          style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#f3f4f6", opacity: closed ? 0.55 : 1 }}
          resizeMode="cover"
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY }}>{p.name}</Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{p.tagline}</Text>
        </View>
        <Pressable
          onPress={onMenu}
          hitSlop={8}
          className="active:opacity-70"
          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(120,120,128,0.12)", alignItems: "center", justifyContent: "center" }}
        >
          <MoreHorizontal size={16} color={TEXT_SECONDARY} />
        </Pressable>
      </View>

      {/* Category + status */}
      <View className="flex-row items-center justify-between">
        <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY }}>{p.category}</Text>
        <View className="flex-row items-center" style={{ gap: 5, backgroundColor: st.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: st.dot }} />
          <Text style={{ fontSize: 11, fontWeight: "600", color: st.color }}>{st.label}</Text>
        </View>
      </View>

      {/* Seats + progress */}
      <View>
        <View className="flex-row items-baseline justify-between">
          <Text style={{ fontSize: 12.5, color: TEXT_PRIMARY }}>
            <Text style={{ fontWeight: "700" }}>{taken}</Text>
            <Text style={{ color: TEXT_DISABLED }}>/{p.spotsTotal}</Text>
            <Text style={{ color: TEXT_MUTED }}> ที่นั่ง</Text>
          </Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: pct >= 90 ? "#dc2626" : pct >= 60 ? "#b45309" : "#287745" }}>
            {left > 0 ? `เหลือ ${left}` : "เต็ม"}
          </Text>
        </View>
        <SeatBar pct={pct} />
      </View>

      {/* Footer: time left + reward */}
      <View className="flex-row items-center justify-between" style={{ borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 10 }}>
        <View className="flex-row items-center" style={{ gap: 5 }}>
          <Clock size={14} color={p.endsInDays <= 0 ? "#dc2626" : p.endsInDays <= 7 ? "#d97706" : TEXT_MUTED} strokeWidth={2.2} />
          <Text style={{ fontSize: 12.5, fontWeight: "500", color: p.endsInDays <= 0 ? "#dc2626" : p.endsInDays <= 7 ? "#b45309" : TEXT_SECONDARY }}>
            {p.endsInDays <= 0 ? "หมดเวลา" : `เหลือ ${p.endsInDays} วัน`}
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <Coins size={14} color={RATING_BAR_FILL} strokeWidth={2.4} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: RATING_BAR_FILL }}>+{p.rewardPoints.toLocaleString("th-TH")}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function TrialRegistryOwnerSection() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  // Local mutable copy so the mockup can delete + toggle open/closed.
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [manualClosed, setManualClosed] = useState<Record<string, boolean>>({});
  const [sheetFor, setSheetFor] = useState<TrialProduct | null>(null);

  const added = useAddedTrials();
  const list = useMemo(
    () => [...added, ...TRIAL_PRODUCTS.filter((p) => !added.some((a) => a.id === p.id))].filter((p) => !removed.has(p.id)),
    [removed, added],
  );

  // Global registration aggregates — same source/computation as the web KPI strip.
  const regStats = useMemo(() => ({
    total: MOCK_REGISTRATIONS.length,
    pending: MOCK_REGISTRATIONS.filter((r) => getRegistrationStatus(r) === "pending_approval").length,
    approved: MOCK_REGISTRATIONS.filter((r) => getRegistrationStatus(r) === "approved").length,
    evaluated: MOCK_REGISTRATIONS.filter((r) => getRegistrationStatus(r) === "evaluated").length,
  }), []);
  const STAT_CARDS = [
    { label: "สินค้าทดลอง", value: String(list.length), suffix: "รายการ", Icon: FlaskConical, accent: "#319754" },
    { label: "ผู้ทดลองรวม", value: String(regStats.total), suffix: "คน", Icon: Users, accent: "#0088ff" },
    { label: "รออนุมัติ", value: String(regStats.pending), suffix: "คน", Icon: AlertCircle, accent: "#ef4444" },
    { label: "กำลังทดสอบ", value: String(regStats.approved), suffix: "คน", Icon: Clock, accent: "#f59e0b" },
    { label: "ประเมินแล้ว", value: String(regStats.evaluated), suffix: "คน", Icon: Check, accent: "#319754" },
  ];
  const isClosed = (p: TrialProduct) => manualClosed[p.id] ?? isClosedAuto(p);
  const isEndingSoon = (p: TrialProduct) => !isClosed(p) && (seatsLeft(p) <= 10 || p.endsInDays <= 7);

  const counts = {
    all: list.length,
    active: list.filter((p) => !isClosed(p)).length,
    ending_soon: list.filter(isEndingSoon).length,
    closed: list.filter(isClosed).length,
  };

  const filtered = list.filter((p) => {
    if (filter === "active" && isClosed(p)) return false;
    if (filter === "ending_soon" && !isEndingSoon(p)) return false;
    if (filter === "closed" && !isClosed(p)) return false;
    const q = search.trim().toLowerCase();
    if (q) return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    return true;
  });

  const totalApplicants = list.reduce((s, p) => s + seatsTaken(p), 0);

  const FILTERS: { key: Filter; label: string; Icon: typeof FlaskConical; count: number }[] = [
    { key: "all", label: "ทั้งหมด", Icon: FlaskConical, count: counts.all },
    { key: "active", label: "เปิดรับ", Icon: Check, count: counts.active },
    { key: "ending_soon", label: "เกือบเต็ม", Icon: Clock, count: counts.ending_soon },
    { key: "closed", label: "ปิดรับ", Icon: Ban, count: counts.closed },
  ];

  const wip = (title: string) => Alert.alert(title, "ส่วนนี้กำลังพัฒนา");
  const removeProduct = (p: TrialProduct) => {
    setSheetFor(null);
    Alert.alert("ลบสินค้าทดลอง", `ลบ "${p.name}" ออกจากทะเบียน?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => setRemoved((s) => new Set(s).add(p.id)) },
    ]);
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Subtitle (add button moved to a floating FAB in MyShopScreen). The big
          "สินค้าทดลอง" title is rendered by OverviewTab. */}
      <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>จัดการสินค้าทดลอง รับสมัคร และติดตามคำตอบจาก Tester</Text>

      {/* Stat cards — 5 metrics, horizontal scroll (web KPI strip parity).
          Full-bleed (negative margin cancels the parent's 16px padding) so the
          next card peeks at the screen edge — a visible "scroll for more" hint. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
        {STAT_CARDS.map((s) => (
          <View key={s.label} style={{ width: 150, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 14, gap: 6 }}>
            <View className="flex-row items-center justify-between">
              <Text style={{ fontSize: 11.5, color: "#6b7280", fontWeight: "500" }}>{s.label}</Text>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${s.accent}15`, alignItems: "center", justifyContent: "center" }}>
                <s.Icon size={14} color={s.accent} strokeWidth={2.4} />
              </View>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#1a1a1a" }}>
              {s.value}
              <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "500" }}> {s.suffix}</Text>
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Filter chips — full-bleed so the last chip peeks at the screen edge. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {FILTERS.map((t) => {
          const active = filter === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setFilter(t.key)}
              className="flex-row items-center active:opacity-80"
              style={{ height: 36, paddingLeft: 6, paddingRight: 12, borderRadius: 999, gap: 6, backgroundColor: active ? BRAND_GREEN : "white", borderWidth: 1, borderColor: active ? BRAND_GREEN : DIVIDER_GRAY }}
            >
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: active ? "rgba(255,255,255,0.22)" : "#d6eadd", alignItems: "center", justifyContent: "center" }}>
                <t.Icon size={13} color={active ? "#fff" : BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>{t.label}</Text>
              <View style={{ minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: active ? "rgba(255,255,255,0.25)" : "#ff3b30", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{t.count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Search */}
      <View className="flex-row items-center" style={{ backgroundColor: "white", borderWidth: 1, borderColor: DIVIDER_GRAY, borderRadius: 999, height: 44, paddingLeft: 16, paddingRight: 6, gap: 8 }}>
        <TextInput
          style={{ flex: 1, fontSize: 13, color: TEXT_PRIMARY, padding: 0 }}
          placeholder="ค้นหาชื่อสินค้า, หมวดหมู่..."
          placeholderTextColor={TEXT_DISABLED}
          value={search}
          onChangeText={setSearch}
        />
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
          <Search size={16} color="white" />
        </View>
      </View>

      {/* Card list / empty state */}
      {filtered.length === 0 ? (
        <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, paddingVertical: 44, alignItems: "center", gap: 10 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: SURFACE_GRAY, alignItems: "center", justifyContent: "center" }}>
            <FlaskConical size={20} color="#9ca3af" strokeWidth={2.2} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: "600", color: TEXT_SECONDARY }}>
            {list.length === 0 ? "ยังไม่มีสินค้าทดลอง" : "ไม่พบรายการที่ตรงกับเงื่อนไข"}
          </Text>
          <Text style={{ fontSize: 12, color: TEXT_MUTED, textAlign: "center", maxWidth: 280 }}>
            {list.length === 0 ? "เริ่มต้นโดยเพิ่มสินค้าทดลองแรก แล้วเปิดรับ Tester มาประเมิน" : "ลองเปลี่ยน filter หรือค้นหาด้วยคำอื่น"}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} closed={isClosed(p)} onMenu={() => setSheetFor(p)} onOpen={() => nav.navigate("TrialRegistryDetail", { id: p.id })} />
          ))}
        </View>
      )}

      {/* Per-product action sheet (replaces the web row "⋯" popover) */}
      <BottomSheet visible={!!sheetFor} onClose={() => setSheetFor(null)} centerTitle title={sheetFor?.name ?? ""} minHeightRatio={0.1} maxHeightRatio={0.6}>
        {sheetFor ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 4 }}>
            {/* เปิดรับสมัคร toggle */}
            <View className="flex-row items-center justify-between" style={{ paddingVertical: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: TEXT_PRIMARY }}>เปิดรับสมัคร</Text>
              <Switch
                value={!isClosed(sheetFor)}
                onValueChange={(on) => setManualClosed((m) => ({ ...m, [sheetFor.id]: !on }))}
                trackColor={{ false: "#e9e9ea", true: BRAND_GREEN }}
                thumbColor="#fff"
                ios_backgroundColor="#e9e9ea"
              />
            </View>
            <View style={{ height: 1, backgroundColor: DIVIDER_GRAY }} />
            <SheetAction Icon={Pencil} label="แก้ไข" onPress={() => { const id = sheetFor.id; setSheetFor(null); nav.navigate("TrialAddProduct", { editId: id }); }} />
            <SheetAction Icon={Eye} label="ดูรายละเอียด" onPress={() => { const id = sheetFor.id; setSheetFor(null); nav.navigate("TrialRegistryDetail", { id }); }} />
            <View style={{ height: 1, backgroundColor: DIVIDER_GRAY }} />
            <SheetAction Icon={Trash2} label="ลบ" danger onPress={() => removeProduct(sheetFor)} />
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

function SheetAction({
  Icon,
  label,
  onPress,
  danger,
}: {
  Icon: typeof Pencil;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger ? "#ff3b30" : TEXT_PRIMARY;
  return (
    <Pressable onPress={onPress} className="flex-row items-center active:opacity-60" style={{ paddingVertical: 13, gap: 12 }}>
      <Icon size={18} color={danger ? "#ff3b30" : TEXT_MUTED} strokeWidth={2.2} />
      <Text style={{ fontSize: 14, fontWeight: "500", color }}>{label}</Text>
    </Pressable>
  );
}
