import { GLASS_BAR_TINT } from "../theme/tokens";
/* ============================================================================
 *  สร้างโปรโมชั่น / แก้ไขโปรโมชั่น — full-screen port of the web CreatePromotionView
 *  (OwnerDashboard.tsx L14490-14991).
 *
 *  The web renders all sections in a 2-column grid with a react-day-picker range
 *  calendar. On a phone we keep the SAME sections stacked in one scroll column,
 *  and adapt the range calendar to a compact inline month grid (start → end tap
 *  selection) plus a "ไม่มีวันหมดอายุ" toggle. The product picker (web sub-modal)
 *  opens the PromoProductPicker modal (AddCard shell, multi-select); picked
 *  products show as removable rows with a per-product limit stepper.
 *
 *  On save: build the Promotion and add/update the promotions store, toast, back.
 *  ========================================================================== */
import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Image, Switch } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { BottomFade } from "../components/BottomFade";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Megaphone,
  Percent,
  Calendar as CalendarIcon,
  Settings,
  Boxes,
  Plus,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Save,
} from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { NumberStepper } from "../components/NumberStepper";
import { showToast } from "../components/Toast";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  addPromotion,
  updatePromotion,
  getPromotionById,
  PROMO_PRODUCTS,
  promoProductById,
  type Promotion,
  type PromoDiscountType,
  type PromoScope,
  type PromoProductLimit,
} from "../data/promotions";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, TEXT_DISABLED, DIVIDER_GRAY } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RED = "#ff3b30";
const FAFAFA = "#fafafa";
const PLACEHOLDER = "#a3a3a3";

const TH_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const TH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const DOW = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 0);
  return x;
};
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Section header — colored icon tile + title + sub, matching the web cards. */
function SectionHeader({ Icon, tint, title, sub, required }: { Icon: typeof Percent; tint: string; title: string; sub: string; required?: boolean }) {
  return (
    <View className="flex-row items-center" style={{ gap: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${tint}1a`, alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={tint} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#000" }}>
          {title} {required ? <Text style={{ color: RED }}>*</Text> : null}
        </Text>
        <Text style={{ fontSize: 11, color: "#8e8e93", marginTop: 1 }}>{sub}</Text>
      </View>
    </View>
  );
}

// Full-bleed white section — edge-to-edge blocks separated by the gray gap,
// same shell as the coupon create / detail pages.
function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 14,
      }}
    >
      {children}
    </View>
  );
}

/** Compact inline month grid for range selection (adapts the web day-picker). */
function RangeCalendar({ from, to, onPick }: { from: Date | null; to: Date | null; onPick: (d: Date) => void }) {
  const [navDate, setNavDate] = useState(() => startOfDay(from ?? new Date()));
  const year = navDate.getFullYear();
  const month = navDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: number[] = [...Array(startOffset).fill(0), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(0);
  const prev = () => setNavDate(new Date(year, month - 1, 1));
  const next = () => setNavDate(new Date(year, month + 1, 1));

  const inRange = (d: Date) => (from && to ? d.getTime() > startOfDay(from).getTime() && d.getTime() < startOfDay(to).getTime() : false);

  return (
    <View>
      <View className="flex-row items-center justify-between" style={{ marginBottom: 10 }}>
        <Pressable onPress={prev} hitSlop={8} className="active:opacity-60"><ChevronLeft size={20} color={BRAND_GREEN_DARK} /></Pressable>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>{TH_FULL[month]} {year + 543}</Text>
        <Pressable onPress={next} hitSlop={8} className="active:opacity-60"><ChevronRight size={20} color={BRAND_GREEN_DARK} /></Pressable>
      </View>
      <View className="flex-row" style={{ marginBottom: 4 }}>
        {DOW.map((d) => <Text key={d} style={{ flex: 1, textAlign: "center", fontSize: 10.5, color: TEXT_MUTED }}>{d}</Text>)}
      </View>
      <View className="flex-row" style={{ flexWrap: "wrap" }}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: "14.28%", height: 38 }} />;
          const cellDate = new Date(year, month, d);
          const isStart = from && sameDay(cellDate, from);
          const isEnd = to && sameDay(cellDate, to);
          const endpoint = isStart || isEnd;
          const mid = inRange(cellDate);
          return (
            <View key={i} style={{ width: "14.28%", alignItems: "center", paddingVertical: 2 }}>
              <Pressable
                onPress={() => onPick(cellDate)}
                className="active:opacity-70"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: endpoint ? BRAND_GREEN : mid ? "rgba(49,151,84,0.12)" : "transparent",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: endpoint ? "700" : mid ? "600" : "500", color: endpoint ? "#fff" : mid ? BRAND_GREEN_DARK : "#1a1a1a" }}>{d}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DateBox({ label, date, noExpiry, placeholder }: { label: string; date: Date | null; noExpiry?: boolean; placeholder?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#eee" }}>
      <Text style={{ fontSize: 9, fontWeight: "600", letterSpacing: 0.5, color: "#9ca3af" }}>{label}</Text>
      {noExpiry ? (
        <>
          <Text style={{ fontSize: 26, lineHeight: 30, fontWeight: "800", color: "#1a1a1a", marginTop: 4 }}>∞</Text>
          <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#4b5563", marginTop: 2 }}>ลดราคาตลอด</Text>
        </>
      ) : date ? (
        <>
          <Text style={{ fontSize: 26, lineHeight: 30, fontWeight: "800", color: "#1a1a1a", marginTop: 4 }}>{date.getDate()}</Text>
          <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#4b5563", marginTop: 2 }}>{TH_SHORT[date.getMonth()]} {date.getFullYear() + 543}</Text>
        </>
      ) : (
        <Text style={{ fontSize: 12, color: "#d1d5db", marginTop: 8 }}>—</Text>
      )}
    </View>
  );
}

export function PromotionCreateScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "PromotionCreate">>();
  const editId = route.params?.editId;
  const editing = useMemo(() => (editId ? getPromotionById(editId) ?? null : null), [editId]);

  const [name, setName] = useState(() => editing?.name ?? "");
  const [description, setDescription] = useState(() => editing?.description ?? "");
  const [discountType, setDiscountType] = useState<PromoDiscountType>(() => editing?.discountType ?? "percent");
  const [discountValue, setDiscountValue] = useState(() => editing?.discountValue ?? 20);
  const [maxDiscount, setMaxDiscount] = useState(() => editing?.maxDiscount ?? 0);

  const [from, setFrom] = useState<Date | null>(() => (editing ? startOfDay(new Date(editing.startsAt)) : startOfDay(new Date())));
  const [to, setTo] = useState<Date | null>(() => {
    if (editing) return editing.endsAt ? startOfDay(new Date(editing.endsAt)) : null;
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return startOfDay(d);
  });
  const [noExpiry, setNoExpiry] = useState(() => editing?.noExpiry ?? false);
  const [enabled, setEnabled] = useState(() => editing?.enabled ?? true);
  const [scope, setScope] = useState<PromoScope>(() => editing?.scope ?? "products");
  const [selectedProducts, setSelectedProducts] = useState<PromoProductLimit[]>(() => editing?.products ?? []);


  const num = (s: string) => Number(s.replace(/[^0-9]/g, "")) || 0;
  const canSubmit = !!name.trim() && discountValue > 0 && (scope === "all" || selectedProducts.length > 0);

  // Range selection: first tap sets start (clears end); second tap sets end (or
  // resets to a new start if before the current start).
  const onPickDate = (d: Date) => {
    const day = startOfDay(d);
    if (!from || (from && to)) {
      setFrom(day);
      setTo(null);
    } else if (day.getTime() < from.getTime()) {
      setFrom(day);
      setTo(null);
    } else {
      setTo(day);
    }
  };

  const totalDays = useMemo(() => {
    if (!from || !to || noExpiry) return 0;
    return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
  }, [from, to, noExpiry]);


  const submit = () => {
    if (!canSubmit) return;
    const promo: Promotion = {
      id: editing ? editing.id : `promo-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      discountType,
      discountValue,
      maxDiscount: discountType === "percent" && maxDiscount > 0 ? maxDiscount : undefined,
      startsAt: from ? startOfDay(from).toISOString() : new Date().toISOString(),
      endsAt: noExpiry || !to ? undefined : endOfDay(to).toISOString(),
      noExpiry,
      enabled,
      scope,
      products: scope === "all" ? [] : selectedProducts,
    };
    if (editing) {
      updatePromotion(promo);
      showToast("บันทึกการแก้ไข");
    } else {
      addPromotion(promo);
      showToast("สร้างโปรโมชั่นเรียบร้อย");
    }
    nav.goBack();
  };

  const setLimit = (productId: string, n: number) => {
    const next: number | "unlimited" = n <= 0 ? "unlimited" : n;
    setSelectedProducts((prev) => prev.map((x) => (x.productId === productId ? { ...x, limit: next } : x)));
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={editId ? "แก้ไขโปรโมชั่น" : "สร้างโปรโมชั่น"}
        subtitle="กำหนดส่วนลด ระยะเวลา และสินค้าที่เข้าร่วม"
        onBack={() => nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {/* ── ข้อมูลโปรโมชั่น ── */}
        <Card>
          <SectionHeader Icon={Megaphone} tint={BRAND_GREEN} title="ข้อมูลโปรโมชั่น" sub="ชื่อและรายละเอียด" />
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>ชื่อโปรโมชั่น <Text style={{ color: RED }}>*</Text></Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="เช่น ลด 20% สินค้าสมุนไพร"
              placeholderTextColor={PLACEHOLDER}
              style={{ backgroundColor: FAFAFA, borderRadius: 999, paddingHorizontal: 18, height: 46, fontSize: 14, color: TEXT_PRIMARY }}
            />
          </View>
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>รายละเอียด</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
              placeholderTextColor={PLACEHOLDER}
              multiline
              style={{ backgroundColor: FAFAFA, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, fontSize: 14, color: TEXT_PRIMARY, minHeight: 72, textAlignVertical: "top" }}
            />
          </View>
        </Card>

        {/* ── ประเภทส่วนลด ── */}
        <Card>
          <SectionHeader Icon={Percent} tint={RED} title="การลดราคา" sub="ประเภทและมูลค่าส่วนลด" required />
          {/* percent / baht toggle */}
          <View className="flex-row" style={{ gap: 8 }}>
            {([
              { key: "percent", label: "ลดเปอร์เซ็นต์ (%)" },
              { key: "baht", label: "ลดเป็นบาท (฿)" },
            ] as const).map((opt) => {
              const active = discountType === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setDiscountType(opt.key)}
                  className="active:opacity-80"
                  style={{ flex: 1, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: active ? BRAND_GREEN : "#fff", borderWidth: active ? 0 : 1, borderColor: "#e5e7eb" }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>{discountType === "percent" ? "เปอร์เซ็นต์" : "มูลค่า (฿)"} <Text style={{ color: RED }}>*</Text></Text>
            <NumberStepper
              value={discountValue}
              onChange={setDiscountValue}
              min={0}
              max={discountType === "percent" ? 100 : undefined}
              step={discountType === "percent" ? 1 : 10}
              placeholder="0"
            />
          </View>
          {/* maxDiscount — only meaningful for percent */}
          <View style={{ gap: 7, opacity: discountType === "baht" ? 0.4 : 1 }} pointerEvents={discountType === "baht" ? "none" : "auto"}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>ส่วนลดสูงสุด (฿)</Text>
            <NumberStepper
              value={maxDiscount}
              onChange={setMaxDiscount}
              min={0}
              step={10}
              placeholder="ไม่จำกัด"
            />
          </View>
        </Card>

        {/* ── ระยะเวลา ── */}
        <Card>
          <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SectionHeader Icon={CalendarIcon} tint="#f59e0b" title="ระยะเวลา" sub="เลือกช่วงเวลาที่โปรโมชั่นใช้งานได้" required />
            </View>
          </View>

          {/* noExpiry toggle */}
          <View className="flex-row items-center justify-between" style={{ backgroundColor: FAFAFA, borderRadius: 14, paddingHorizontal: 16, height: 52, alignItems: "center" }}>
            <Text style={{ fontSize: 13.5, fontWeight: "500", color: TEXT_PRIMARY, lineHeight: 18, includeFontPadding: false }}>ไม่มีวันหมดอายุ</Text>
            <Switch value={noExpiry} onValueChange={setNoExpiry} trackColor={{ false: "#d4d4d4", true: BRAND_GREEN }} thumbColor="#fff" style={{ alignSelf: "center" }} />
          </View>

          {/* Range summary */}
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <DateBox label="เริ่มต้น" date={from} />
            <View style={{ alignItems: "center", gap: 2, width: 48 }}>
              <ArrowRight size={18} color="#9ca3af" strokeWidth={2.4} />
              {totalDays > 0 ? <Text style={{ fontSize: 9, fontWeight: "600", color: "#6b7280" }}>{totalDays} วัน</Text> : null}
            </View>
            <DateBox label="สิ้นสุด" date={to} noExpiry={noExpiry} />
          </View>

          {/* Calendar (hidden when noExpiry only affects the end — keep it so the
              user can still pick a start date) */}
          <View style={{ borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 12 }}>
            <RangeCalendar from={from} to={noExpiry ? null : to} onPick={onPickDate} />
            {!noExpiry ? (
              <Text style={{ fontSize: 11, color: TEXT_DISABLED, marginTop: 8, textAlign: "center" }}>แตะวันเริ่ม แล้วแตะวันสิ้นสุด</Text>
            ) : null}
          </View>
        </Card>

        {/* ── เปิดใช้งาน ── */}
        <Card>
          <SectionHeader Icon={Settings} tint="#8b5cf6" title="ตั้งค่า" sub="การตั้งค่าโปรโมชั่น" />
          <View className="flex-row items-center justify-between" style={{ backgroundColor: FAFAFA, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, alignItems: "center" }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: "#000", includeFontPadding: false }}>เปิดใช้งานโปรโมชั่น</Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2, includeFontPadding: false }}>{enabled ? "โปรโมชั่นจะแสดงและใช้งานได้" : "โปรโมชั่นถูกซ่อน ไม่ใช้งาน"}</Text>
            </View>
            <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: "#d4d4d4", true: BRAND_GREEN }} thumbColor="#fff" style={{ alignSelf: "center" }} />
          </View>
        </Card>

        {/* ── ขอบเขตโปรโมชั่น ── */}
        <Card>
          <SectionHeader Icon={Boxes} tint="#3b82f6" title="ขอบเขตโปรโมชั่น" sub="เลือกสินค้าที่เข้าร่วม" />
          <View className="flex-row" style={{ gap: 8 }}>
            {([
              { key: "products", label: "เฉพาะสินค้า" },
              { key: "all", label: "สินค้าทั้งหมด" },
            ] as const).map((opt) => {
              const active = scope === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setScope(opt.key)}
                  className="active:opacity-80"
                  style={{ flex: 1, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: active ? BRAND_GREEN : "#fff", borderWidth: active ? 0 : 1, borderColor: "#e5e7eb" }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ fontSize: 11, color: "#9ca3af" }}>
            {scope === "all" ? "ลดราคาสินค้าทั้งหมด (รวมทุกตัวเลือก)" : "ลดเฉพาะสินค้าที่เลือกด้านล่าง"}
          </Text>

          {scope === "products" ? (
            <View style={{ gap: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#f0f0f0" }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>สินค้าในโปรโมชั่น</Text>
                  {selectedProducts.length > 0 ? (
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#fff" }}>{selectedProducts.length}</Text>
                    </View>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => nav.navigate("PromoProductPicker", { excludeIds: selectedProducts.map((x) => x.productId), onDone: (ids) => setSelectedProducts((prev) => [...prev, ...ids.map((id) => ({ productId: id, limit: "unlimited" as const }))]) })}
                  className="flex-row items-center active:opacity-80"
                  hitSlop={6}
                  style={{ gap: 6, paddingHorizontal: 16, height: 40, borderRadius: 999, backgroundColor: BRAND_GREEN }}
                >
                  <Plus size={16} color="#fff" strokeWidth={2.4} />
                  <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#fff" }}>เพิ่มสินค้า</Text>
                </Pressable>
              </View>

              {selectedProducts.length === 0 ? (
                <Pressable
                  onPress={() => nav.navigate("PromoProductPicker", { excludeIds: selectedProducts.map((x) => x.productId), onDone: (ids) => setSelectedProducts((prev) => [...prev, ...ids.map((id) => ({ productId: id, limit: "unlimited" as const }))]) })}
                  className="items-center justify-center active:opacity-80"
                  style={{ borderWidth: 2, borderStyle: "dashed", borderColor: "#e5e7eb", borderRadius: 16, paddingVertical: 24, gap: 8 }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
                    <Plus size={16} color="#9ca3af" strokeWidth={2.4} />
                  </View>
                  <Text style={{ fontSize: 13, color: TEXT_MUTED }}>เพิ่มเลือกสินค้าเข้าร่วม</Text>
                </Pressable>
              ) : (
                <View style={{ gap: 8 }}>
                  {selectedProducts.map((sp) => {
                    const p = promoProductById(sp.productId);
                    if (!p) return null;
                    const numericLimit = sp.limit === "unlimited" ? 0 : sp.limit;
                    // Cap the promo limit at the product's remaining stock.
                    const stockMax = parseInt(p.stock.replace(/[^0-9]/g, ""), 10) || 0;
                    return (
                      <View key={sp.productId} style={{ gap: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 10 }}>
                        {/* Top: image + info + remove */}
                        <View className="flex-row items-start" style={{ gap: 10 }}>
                          <Image source={p.image} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#f3f4f6" }} resizeMode="cover"
          resizeMethod="resize" />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "500", color: "#000", lineHeight: 18 }}>{p.name}</Text>
                            <Text style={{ fontSize: 12, fontWeight: "500", color: BRAND_GREEN, marginTop: 2 }}>{p.price}</Text>
                            <View className="flex-row items-center" style={{ gap: 4, marginTop: 2 }}>
                              <Boxes size={11} color="#9ca3af" strokeWidth={2.2} />
                              <Text style={{ fontSize: 10.5, color: TEXT_MUTED }}>คงเหลือ {p.stock}</Text>
                            </View>
                          </View>
                          <Pressable
                            onPress={() => setSelectedProducts((prev) => prev.filter((x) => x.productId !== sp.productId))}
                            hitSlop={6}
                            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}
                          >
                            <X size={15} color="#9ca3af" strokeWidth={2.4} />
                          </Pressable>
                        </View>
                        {/* Bottom: full-width limit stepper */}
                        <View className="flex-row items-center" style={{ gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0" }}>
                          <Text style={{ fontSize: 12, color: TEXT_MUTED }}>จำกัดจำนวน</Text>
                          <View style={{ flex: 1 }}>
                            <NumberStepper
                              value={numericLimit}
                              onChange={(n) => setLimit(sp.productId, n)}
                              min={0}
                              max={stockMax}
                              step={1}
                              placeholder="ไม่จำกัด"
                            />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}
        </Card>
      </ScrollView>

      {/* Top fade + bottom fade — same language as the detail pages */}
      <LinearGradient
        pointerEvents="none"
        colors={["#fafafa", "rgba(250,250,250,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
      />
      <BottomFade />
      </View>

      {/* Floating Liquid Glass save bar — same as the coupon create page */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
        <View
          style={{
            borderRadius: 34,
            shadowColor: "#0a3d22",
            shadowOffset: { width: 0, height: 9 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 14,
          }}
        >
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            tintColor={GLASS_BAR_TINT}
            style={{ borderRadius: 34, overflow: "hidden", height: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}
          >
            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              className="flex-row items-center justify-center active:opacity-90"
              style={{ flex: 1, height: 50, borderRadius: 999, gap: 8, backgroundColor: canSubmit ? BRAND_GREEN : "#d4d4d4" }}
            >
              <Save size={17} color="#fff" strokeWidth={2.6} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{editId ? "บันทึกการแก้ไข" : "สร้างโปรโมชั่น"}</Text>
            </Pressable>
          </GlassView>
        </View>
      </View>

    </View>
  );
}
