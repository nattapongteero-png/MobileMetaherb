/* ============================================================================
 *  สร้างคูปอง / แก้ไขคูปอง — full-screen port of the web CreateCouponModal
 *  (OwnerDashboard.tsx L13745-14000).
 *
 *  The web renders sections in a grid with datetime-local inputs. On a phone we
 *  keep the SAME sections stacked in one scroll column, use the shared
 *  NumberStepper for all numeric fields, and adapt the two datetime inputs to the
 *  compact inline RangeCalendar (start → end tap) borrowed from
 *  PromotionCreateScreen.
 *
 *  On save: build the Coupon and add/update the coupons store, toast, back.
 *  ========================================================================== */
import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Switch } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Ticket,
  Megaphone,
  Settings,
  Calendar as CalendarIcon,
  Star,
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
  addCoupon,
  updateCoupon,
  getCouponById,
  type Coupon,
  type CouponDiscountType,
} from "../data/ownerCoupons";
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
function SectionHeader({ Icon, tint, title, sub, required }: { Icon: typeof Ticket; tint: string; title: string; sub: string; required?: boolean }) {
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        gap: 14,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
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

function DateBox({ label, date }: { label: string; date: Date | null }) {
  return (
    <View style={{ flex: 1, alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#eee" }}>
      <Text style={{ fontSize: 9, fontWeight: "600", letterSpacing: 0.5, color: "#9ca3af" }}>{label}</Text>
      {date ? (
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

/** Aligned toggle row (matches PromotionCreateScreen's fixed styling). */
function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between" style={{ backgroundColor: FAFAFA, borderRadius: 14, paddingHorizontal: 16, height: 52, alignItems: "center" }}>
      <Text style={{ fontSize: 13.5, fontWeight: "500", color: TEXT_PRIMARY, lineHeight: 18, includeFontPadding: false }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#d4d4d4", true: BRAND_GREEN }} thumbColor="#fff" style={{ alignSelf: "center" }} />
    </View>
  );
}

export function CouponCreateScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "CouponCreate">>();
  const editId = route.params?.editId;
  const editing = useMemo(() => (editId ? getCouponById(editId) ?? null : null), [editId]);

  const [code, setCode] = useState(() => editing?.code ?? "");
  const [name, setName] = useState(() => editing?.name ?? "");
  const [description, setDescription] = useState(() => editing?.description ?? "");
  const [discountType, setDiscountType] = useState<CouponDiscountType>(() => editing?.discountType ?? "percent");
  const [discountValue, setDiscountValue] = useState(() => editing?.discountValue ?? 0);
  const [maxDiscount, setMaxDiscount] = useState(() => editing?.maxDiscount ?? 0);
  const [minOrder, setMinOrder] = useState(() => editing?.minOrder ?? 0);
  const [usageLimit, setUsageLimit] = useState(() => editing?.usageLimit ?? 0);
  const [perUserLimit, setPerUserLimit] = useState(() => editing?.perUserLimit ?? 1);

  const [from, setFrom] = useState<Date | null>(() => (editing ? startOfDay(new Date(editing.startsAt)) : startOfDay(new Date())));
  const [to, setTo] = useState<Date | null>(() => {
    if (editing) return startOfDay(new Date(editing.endsAt));
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return startOfDay(d);
  });
  const [membersOnly, setMembersOnly] = useState(() => editing?.membersOnly ?? false);
  const [firstOrderOnly, setFirstOrderOnly] = useState(() => editing?.firstOrderOnly ?? false);

  const isFreeship = discountType === "freeship";
  const canSubmit = !!code.trim() && !!name.trim() && (isFreeship || discountValue > 0) && !!from && !!to;

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
    if (!from || !to) return 0;
    return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
  }, [from, to]);

  const submit = () => {
    if (!canSubmit || !from || !to) return;
    const coupon: Coupon = {
      id: editing ? editing.id : `coupon-${Date.now()}`,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() || undefined,
      discountType,
      discountValue: isFreeship ? 0 : discountValue,
      maxDiscount: !isFreeship && discountType === "percent" && maxDiscount > 0 ? maxDiscount : undefined,
      minOrder: minOrder > 0 ? minOrder : undefined,
      usageLimit,
      perUserLimit,
      startsAt: startOfDay(from).toISOString(),
      endsAt: endOfDay(to).toISOString(),
      membersOnly,
      firstOrderOnly,
      used: editing ? editing.used : 0,
      status: editing ? editing.status : "active",
    };
    if (editing) {
      updateCoupon(coupon);
      showToast("บันทึกการแก้ไข");
    } else {
      addCoupon(coupon);
      showToast("สร้างคูปองเรียบร้อย");
    }
    nav.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={editId ? "แก้ไขคูปอง" : "สร้างคูปอง"}
        subtitle="กำหนดรหัส ส่วนลด เงื่อนไข และระยะเวลา"
        onBack={() => nav.goBack()}
        showSearch={false}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {/* ── ข้อมูลคูปอง ── */}
        <Card>
          <SectionHeader Icon={Ticket} tint={BRAND_GREEN} title="ข้อมูลคูปอง" sub="รหัส ชื่อ และคำอธิบายของคูปอง" />
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>รหัสคูปอง <Text style={{ color: RED }}>*</Text></Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              placeholder="เช่น MYSHOP10"
              placeholderTextColor={PLACEHOLDER}
              style={{ backgroundColor: FAFAFA, borderRadius: 999, paddingHorizontal: 18, height: 46, fontSize: 14, color: TEXT_PRIMARY, letterSpacing: 1 }}
            />
          </View>
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>ชื่อคูปอง <Text style={{ color: RED }}>*</Text></Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="เช่น ลด 10% เฉพาะร้านเรา"
              placeholderTextColor={PLACEHOLDER}
              style={{ backgroundColor: FAFAFA, borderRadius: 999, paddingHorizontal: 18, height: 46, fontSize: 14, color: TEXT_PRIMARY }}
            />
          </View>
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>คำอธิบาย</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="รายละเอียดคูปอง (ไม่บังคับ)"
              placeholderTextColor={PLACEHOLDER}
              multiline
              style={{ backgroundColor: FAFAFA, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, fontSize: 14, color: TEXT_PRIMARY, minHeight: 72, textAlignVertical: "top" }}
            />
          </View>
        </Card>

        {/* ── ส่วนลด ── */}
        <Card>
          <SectionHeader Icon={Megaphone} tint={RED} title="ส่วนลด" sub="เลือกประเภทและมูลค่าส่วนลด" required />
          {/* percent / baht / freeship */}
          <View className="flex-row" style={{ gap: 8 }}>
            {([
              { key: "percent", label: "เปอร์เซ็นต์ (%)" },
              { key: "baht", label: "บาท (฿)" },
              { key: "freeship", label: "ส่งฟรี" },
            ] as const).map((opt) => {
              const active = discountType === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setDiscountType(opt.key)}
                  className="active:opacity-80"
                  style={{ flex: 1, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: active ? BRAND_GREEN : "#fff", borderWidth: active ? 0 : 1, borderColor: "#e5e7eb" }}
                >
                  <Text style={{ fontSize: 12, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {/* discountValue — hidden/disabled for freeship */}
          <View style={{ gap: 7, opacity: isFreeship ? 0.4 : 1 }} pointerEvents={isFreeship ? "none" : "auto"}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>
              มูลค่าส่วนลด {!isFreeship ? <Text style={{ color: RED }}>*</Text> : null}
            </Text>
            <NumberStepper
              value={discountValue}
              onChange={setDiscountValue}
              min={0}
              max={discountType === "percent" ? 100 : undefined}
              step={discountType === "percent" ? 1 : 10}
              placeholder="0"
            />
          </View>
          {/* maxDiscount — percent only */}
          <View style={{ gap: 7, opacity: discountType === "percent" ? 1 : 0.4 }} pointerEvents={discountType === "percent" ? "auto" : "none"}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>ส่วนลดสูงสุด (฿)</Text>
            <NumberStepper value={maxDiscount} onChange={setMaxDiscount} min={0} step={10} placeholder="ไม่จำกัด" />
            <Text style={{ fontSize: 11, color: "#9ca3af" }}>0 = ไม่จำกัด</Text>
          </View>
        </Card>

        {/* ── เงื่อนไขการใช้ ── */}
        <Card>
          <SectionHeader Icon={Settings} tint="#3b82f6" title="เงื่อนไขการใช้" sub="กำหนดยอดขั้นต่ำและจำนวนครั้งที่ใช้ได้" />
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>ยอดสั่งซื้อขั้นต่ำ (฿)</Text>
            <NumberStepper value={minOrder} onChange={setMinOrder} min={0} step={50} placeholder="ไม่กำหนด" />
            <Text style={{ fontSize: 11, color: "#9ca3af" }}>0 = ไม่กำหนด</Text>
          </View>
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>จำกัดการใช้</Text>
            <NumberStepper value={usageLimit} onChange={setUsageLimit} min={0} step={10} placeholder="ไม่จำกัด" />
            <Text style={{ fontSize: 11, color: "#9ca3af" }}>0 = ไม่จำกัด</Text>
          </View>
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}>จำกัดต่อผู้ใช้</Text>
            <NumberStepper value={perUserLimit} onChange={setPerUserLimit} min={1} step={1} placeholder="1" />
          </View>
        </Card>

        {/* ── ระยะเวลา ── */}
        <Card>
          <SectionHeader Icon={CalendarIcon} tint="#f59e0b" title="ระยะเวลา" sub="ช่วงเวลาที่ลูกค้าใช้คูปองได้" required />

          {/* Range summary */}
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <DateBox label="เริ่มต้น" date={from} />
            <View style={{ alignItems: "center", gap: 2, width: 48 }}>
              <ArrowRight size={18} color="#9ca3af" strokeWidth={2.4} />
              {totalDays > 0 ? <Text style={{ fontSize: 9, fontWeight: "600", color: "#6b7280" }}>{totalDays} วัน</Text> : null}
            </View>
            <DateBox label="สิ้นสุด" date={to} />
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 12 }}>
            <RangeCalendar from={from} to={to} onPick={onPickDate} />
            <Text style={{ fontSize: 11, color: TEXT_DISABLED, marginTop: 8, textAlign: "center" }}>แตะวันเริ่ม แล้วแตะวันสิ้นสุด</Text>
          </View>
        </Card>

        {/* ── เงื่อนไขพิเศษ ── */}
        <Card>
          <SectionHeader Icon={Star} tint="#8b5cf6" title="เงื่อนไขพิเศษ" sub="จำกัดเฉพาะกลุ่มผู้ใช้" />
          <ToggleRow label="เฉพาะสมาชิก" value={membersOnly} onValueChange={setMembersOnly} />
          <ToggleRow label="คำสั่งซื้อแรกเท่านั้น" value={firstOrderOnly} onValueChange={setFirstOrderOnly} />
        </Card>
      </ScrollView>

      {/* Sticky footer — centered save button */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: DIVIDER_GRAY }}>
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          className="flex-row items-center justify-center active:opacity-90"
          style={{ height: 50, borderRadius: 999, gap: 8, backgroundColor: canSubmit ? BRAND_GREEN : "#d4d4d4" }}
        >
          <Save size={17} color="#fff" strokeWidth={2.6} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{editId ? "บันทึกการแก้ไข" : "สร้างคูปอง"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
