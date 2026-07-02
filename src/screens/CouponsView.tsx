/**
 * CouponsView — "คูปอง" owner-console section.
 *
 * Ported 1:1 from the web CouponsTab (OwnerDashboard.tsx L14001-14366):
 *   - filter pills (ทั้งหมด / ใช้งานอยู่ / หมดอายุ / ปิดใช้งาน) with live counts +
 *     a search box (same white-pill + red-badge styling as PromotionsView),
 *   - coupon cards in a 2-col grid: a colored discount badge + code chip, name,
 *     description, meta (min order, usage, date range), a status pill, and the
 *     whole card is Pressable to open a BottomSheet (แก้ไข / เปิด-ปิดใช้งาน / ลบ),
 *   - "ไม่พบคูปอง" empty state.
 *
 * Header-less (MyShopScreen renders the section label + a floating FAB); the web
 * Popover / ticket-mask are dropped for plain View/Pressable + BottomSheet.
 */
import { useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, Alert } from "react-native";
import {
  ClipboardList,
  Check,
  Clock,
  Ban,
  Search,
  Calendar,
  Percent,
  Truck,
  Pencil,
  Ticket,
  Trash2,
  type LucideIcon,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomSheet } from "../components/BottomSheet";
import { showToast } from "../components/Toast";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  useAllCoupons,
  computedCouponStatus,
  removeCoupon,
  toggleCoupon,
  fmtCouponThaiDateTime,
  fmtCouponDiscount,
  type Coupon,
  type CouponStatus,
} from "../data/ownerCoupons";
import { BRAND_GREEN, DIVIDER_GRAY, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

type FilterKey = "all" | CouponStatus;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const RED = "#ff3b30";

/** Status pill config — colors match the web card 1:1. */
function statusConfig(status: CouponStatus): { label: string; color: string; Icon: LucideIcon } {
  if (status === "active") return { label: "ใช้งานอยู่", color: BRAND_GREEN, Icon: Check };
  if (status === "expired") return { label: "หมดอายุ", color: "#dc2626", Icon: Clock };
  return { label: "ปิดใช้งาน", color: "#737373", Icon: Ban };
}

function FilterPill({
  label,
  count,
  Icon,
  active,
  onPress,
}: {
  label: string;
  count: number;
  Icon: LucideIcon;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:opacity-80"
      style={{
        height: 32,
        paddingLeft: 6,
        paddingRight: 10,
        borderRadius: 999,
        gap: 6,
        backgroundColor: active ? BRAND_GREEN : "transparent",
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: active ? "rgba(255,255,255,0.22)" : "#d6eadd",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={12} color={active ? "#fff" : BRAND_GREEN} strokeWidth={2.4} />
      </View>
      <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>
        {label}
      </Text>
      <View
        style={{
          minWidth: 18,
          height: 18,
          paddingHorizontal: 5,
          borderRadius: 9,
          backgroundColor: active ? "rgba(255,255,255,0.25)" : RED,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{count}</Text>
      </View>
    </Pressable>
  );
}

/** Full-width ticket card — green stub (icon + "โค้ดส่วนลด") | perforated seam | details. */
function CouponCard({ c, onMenu }: { c: Coupon; onMenu: () => void }) {
  const status = computedCouponStatus(c);
  const isInactive = status !== "active";
  const st = statusConfig(status);
  const dis = fmtCouponDiscount(c);
  const STUB_W = 104;

  const conds: string[] = [];
  if (c.minOrder && c.minOrder > 0) conds.push(`ขั้นต่ำ ฿${c.minOrder.toLocaleString()}`);
  if (c.membersOnly) conds.push("สมาชิก");
  if (c.firstOrderOnly) conds.push("ออเดอร์แรก");
  const metaLine = conds.join(" · ") || "ไม่มีเงื่อนไข";

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: "#fff",
        opacity: isInactive ? 0.85 : 1,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
    >
    <Pressable
      onPress={onMenu}
      className="flex-row active:opacity-90"
      style={{
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      {/* Left green stub */}
      <View style={{ width: STUB_W, backgroundColor: dis.color, alignItems: "center", justifyContent: "center", paddingVertical: 18, gap: 8 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
          {c.discountType === "baht" ? (
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff" }}>฿</Text>
          ) : c.discountType === "freeship" ? (
            <Truck size={24} color="#fff" strokeWidth={2.4} />
          ) : (
            <Percent size={24} color="#fff" strokeWidth={2.6} />
          )}
        </View>
        <Text style={{ fontSize: 11, fontWeight: "600", color: "#fff" }}>{c.discountType === "freeship" ? "โค้ดส่งฟรี" : "โค้ดส่วนลด"}</Text>
      </View>

      {/* Perforated seam — dashed line + top/bottom notches punched out */}
      <View style={{ position: "absolute", left: STUB_W - 8, top: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: "#fafafa" }} />
      <View style={{ position: "absolute", left: STUB_W - 8, bottom: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: "#fafafa" }} />
      <View style={{ position: "absolute", left: STUB_W, top: 12, bottom: 12, borderLeftWidth: 1, borderColor: "rgba(255,255,255,0.5)", borderStyle: "dashed" }} />

      {/* Status badge — top-left corner (over the green stub) */}
      <View
        className="flex-row items-center"
        style={{ position: "absolute", top: 8, left: 8, zIndex: 10, gap: 3, paddingLeft: 6, paddingRight: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "#fff" }}
      >
        <st.Icon size={10} color={st.color} strokeWidth={2.4} />
        <Text style={{ fontSize: 10, fontWeight: "600", color: st.color }}>{st.label}</Text>
      </View>

      {/* Right details */}
      <View style={{ flex: 1, padding: 14, justifyContent: "center", gap: 6 }}>
        <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", lineHeight: 20 }}>{c.name}</Text>
        {/* Code chip — dashed, tabular so the coupon code is always visible */}
        <View
          className="flex-row items-center"
          style={{ alignSelf: "flex-start", gap: 5, paddingLeft: 8, paddingRight: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", borderColor: `${dis.color}66` }}
        >
          <Ticket size={11} color={dis.color} strokeWidth={2.4} />
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1, color: "#1a1a1a", fontVariant: ["tabular-nums"] }}>{c.code}</Text>
        </View>
        {/* discount value + used/limit */}
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: dis.color }}>{c.discountType === "freeship" ? dis.label : `ลด ${dis.label}`}</Text>
          <Text style={{ fontSize: 11.5, color: "#9ca3af" }}>·</Text>
          <Text style={{ fontSize: 11.5, color: "#4b5563" }}>
            ใช้แล้ว {c.used}
            {c.usageLimit && c.usageLimit > 0 ? `/${c.usageLimit}` : " · ไม่จำกัด"}
          </Text>
        </View>
        <Text numberOfLines={1} style={{ fontSize: 12.5, color: "#4b5563" }}>{metaLine}</Text>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Calendar size={13} color="#9ca3af" strokeWidth={2.2} />
          <Text style={{ fontSize: 12, color: "#4b5563" }}>หมดอายุ {fmtCouponThaiDateTime(c.endsAt)}</Text>
        </View>
      </View>
    </Pressable>
    </View>
  );
}

function SheetAction({ Icon, label, onPress, danger }: { Icon: LucideIcon; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center active:opacity-60" style={{ paddingVertical: 13, gap: 12 }}>
      <Icon size={18} color={danger ? RED : TEXT_MUTED} strokeWidth={2.2} />
      <Text style={{ fontSize: 14, fontWeight: "500", color: danger ? RED : TEXT_PRIMARY }}>{label}</Text>
    </Pressable>
  );
}

export function CouponsOwnerSection() {
  const nav = useNavigation<Nav>();
  const coupons = useAllCoupons();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [sheetFor, setSheetFor] = useState<Coupon | null>(null);

  const countBy = (s: CouponStatus) => coupons.filter((c) => computedCouponStatus(c) === s).length;

  const filtered = useMemo(() => {
    let result = coupons;
    if (filter !== "all") result = result.filter((c) => computedCouponStatus(c) === filter);
    const q = search.trim().toLowerCase();
    if (q) result = result.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    return result;
  }, [coupons, filter, search]);

  const pills: { key: FilterKey; label: string; count: number; Icon: LucideIcon }[] = [
    { key: "all", label: "ทั้งหมด", count: coupons.length, Icon: ClipboardList },
    { key: "active", label: "ใช้งานอยู่", count: countBy("active"), Icon: Check },
    { key: "expired", label: "หมดอายุ", count: countBy("expired"), Icon: Clock },
    { key: "disabled", label: "ปิดใช้งาน", count: countBy("disabled"), Icon: Ban },
  ];

  const onDelete = (c: Coupon) => {
    setSheetFor(null);
    Alert.alert("ลบคูปอง", `ลบคูปอง "${c.code}"?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => {
          removeCoupon(c.id);
          showToast(`ลบ: ${c.code}`, "info");
        },
      },
    ]);
  };

  const onToggle = (c: Coupon) => {
    setSheetFor(null);
    toggleCoupon(c.id);
    showToast(c.status === "disabled" ? `เปิดใช้งาน: ${c.code}` : `ปิดใช้งาน: ${c.code}`);
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Filter pills — white rounded container; scroller clipped to the pill shape */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 999,
          padding: 4,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
          elevation: 1,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ borderRadius: 999, overflow: "hidden" }}
          contentContainerStyle={{ gap: 4, alignItems: "center" }}
        >
          {pills.map((p) => (
            <FilterPill key={p.key} label={p.label} count={p.count} Icon={p.Icon} active={filter === p.key} onPress={() => setFilter(p.key)} />
          ))}
        </ScrollView>
      </View>

      {/* Search box */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
          borderRadius: 999,
          paddingLeft: 16,
          paddingRight: 4,
          height: 36,
        }}
      >
        <TextInput
          style={{ flex: 1, fontSize: 13, color: TEXT_PRIMARY, paddingVertical: 0 }}
          placeholder="ค้นหาโค้ด, ชื่อคูปอง..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        <View style={{ backgroundColor: BRAND_GREEN, width: 28, height: 28, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
          <Search size={16} color="#fff" />
        </View>
      </View>

      {/* Card grid / empty state */}
      {filtered.length === 0 ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#f3f4f6",
            paddingVertical: 64,
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ticket size={40} color="#d1d5db" strokeWidth={1.5} />
          <Text style={{ fontSize: 14, color: "#9ca3af" }}>ไม่พบคูปอง</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((c) => (
            <CouponCard key={c.id} c={c} onMenu={() => setSheetFor(c)} />
          ))}
        </View>
      )}

      {/* Per-coupon action sheet */}
      <BottomSheet visible={!!sheetFor} onClose={() => setSheetFor(null)} centerTitle title={sheetFor?.code ?? ""} minHeightRatio={0.32} maxHeightRatio={0.55}>
        {sheetFor ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 2 }}>
            <SheetAction
              Icon={Pencil}
              label="แก้ไข"
              onPress={() => {
                const id = sheetFor.id;
                setSheetFor(null);
                nav.navigate("CouponCreate", { editId: id });
              }}
            />
            <SheetAction Icon={Ban} label={sheetFor.status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"} onPress={() => onToggle(sheetFor)} />
            <View style={{ height: 1, backgroundColor: DIVIDER_GRAY, marginVertical: 4 }} />
            <SheetAction Icon={Trash2} label="ลบ" danger onPress={() => onDelete(sheetFor)} />
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}
