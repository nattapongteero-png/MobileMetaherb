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
import { View, Text, TextInput, ScrollView, Pressable } from "react-native";
import {
  ClipboardList,
  Check,
  Clock,
  Ban,
  Search,
  Calendar,
  Percent,
  Truck,
  Ticket,
  type LucideIcon,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SearchBar } from "../components/SearchBar";
import { StickyFilterList } from "../components/StickyFilterList";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  useAllCoupons,
  computedCouponStatus,
  fmtCouponThaiDateTime,
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

// Standard filter chip — same pill language as the orders / quotations /
// PR pages (white pill + border, count badge; active = solid green).
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
        height: 36,
        paddingHorizontal: 14,
        borderRadius: 999,
        gap: 6,
        backgroundColor: active ? BRAND_GREEN : "white",
        borderWidth: 1,
        borderColor: active ? BRAND_GREEN : DIVIDER_GRAY,
      }}
    >
      <Icon size={14} color={active ? "white" : TEXT_MUTED} />
      <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "white" : TEXT_SECONDARY }}>
        {label}
      </Text>
      <View
        style={{
          minWidth: 18,
          height: 18,
          paddingHorizontal: 5,
          borderRadius: 9,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? "rgba(255,255,255,0.25)" : "#f5f5f5",
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "white" : TEXT_MUTED }}>{count}</Text>
      </View>
    </Pressable>
  );
}

/** Coupon ticket — the web desktop ticket widget: colored 80px stub (icon +
 *  โค้ดส่วนลด/โค้ดส่งฟรี) | notched perforation + dashed seam | white body with
 *  name / conditions / expiry only. Tap opens the coupon detail page. */
export function CouponCard({ c, onPress }: { c: Coupon; onPress: () => void }) {
  const isFreeship = c.discountType === "freeship";
  const status = computedCouponStatus(c);
  const st = statusConfig(status);
  // Expired / disabled tickets go gray (stub + seam follow stubColor).
  const isInactive = status !== "active";
  const stubColor = isInactive ? "#9ca3af" : isFreeship ? "#3b82f6" : BRAND_GREEN;

  // Conditions line — web logic: min order (or "ไม่มีขั้นต่ำ") + member/first-order flags.
  const conds: string[] = [c.minOrder && c.minOrder > 0 ? `ขั้นต่ำ ฿${c.minOrder.toLocaleString()}` : "ไม่มีขั้นต่ำ"];
  if (c.membersOnly) conds.push("สมาชิก");
  if (c.firstOrderOnly) conds.push("ออเดอร์แรก");
  const metaLine = conds.join(" · ");

  return (
    <Pressable
      onPress={onPress}
      className="flex-row active:opacity-90"
      style={{
        borderRadius: 12,
        minHeight: 88,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      {/* Left stub — 80px, colored per coupon type */}
      <View
        style={{
          width: 80,
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
          backgroundColor: stubColor,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 16,
          paddingHorizontal: 12,
          gap: 6,
        }}
      >
        {isFreeship ? <Truck size={24} color="#fff" strokeWidth={2.4} /> : <Percent size={24} color="#fff" strokeWidth={2.4} />}
        <Text style={{ fontSize: 10, fontWeight: "500", color: "#fff" }}>{isFreeship ? "โค้ดส่งฟรี" : "โค้ดส่วนลด"}</Text>
      </View>

      {/* Body — name / conditions / expiry (per the approved reference) */}
      <View style={{ flex: 1, minWidth: 0, justifyContent: "center", gap: 7, paddingLeft: 20, paddingRight: 16, paddingVertical: 12 }}>
        {/* Dashed perforation seam */}
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 10, bottom: 10, borderLeftWidth: 2, borderStyle: "dashed", borderColor: stubColor + "40" }} />
        {/* Title + status pill (same row, pill flush right) */}
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{c.name}</Text>
          <View
            className="flex-row items-center"
            style={{ gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: st.color + "1a" }}
          >
            <st.Icon size={10} color={st.color} strokeWidth={2.4} />
            <Text style={{ fontSize: 10.5, fontWeight: "600", color: st.color }}>{st.label}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={{ fontSize: 11, color: "#6b7280" }}>{metaLine}</Text>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <Calendar size={14} color="#6b7280" strokeWidth={2.2} />
          <Text style={{ fontSize: 11, color: "#6b7280" }}>หมดอายุ {fmtCouponThaiDateTime(c.endsAt)}</Text>
        </View>
      </View>

      {/* Perforation notches — punched at the stub boundary (page bg circles) */}
      <View pointerEvents="none" style={{ position: "absolute", left: 73, top: -7, width: 14, height: 14, borderRadius: 7, backgroundColor: "#fafafa" }} />
      <View pointerEvents="none" style={{ position: "absolute", left: 73, bottom: -7, width: 14, height: 14, borderRadius: 7, backgroundColor: "#fafafa" }} />
    </Pressable>
  );
}

export function CouponsOwnerSection({ showSearch = true, insetsBottom = 24 }: { showSearch?: boolean; insetsBottom?: number }) {
  const nav = useNavigation<Nav>();
  const coupons = useAllCoupons();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

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

  return (
    <StickyFilterList
      filterKey={filter}
      insetsBottom={insetsBottom}
      header={
        showSearch ? <SearchBar value={search} onChangeText={setSearch} placeholder="ค้นหาโค้ด, ชื่อคูปอง..." /> : undefined
      }
      filters={pills.map((p) => (
        <FilterPill key={p.key} label={p.label} count={p.count} Icon={p.Icon} active={filter === p.key} onPress={() => setFilter(p.key)} />
      ))}
    >
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
            <CouponCard key={c.id} c={c} onPress={() => nav.navigate("ShopCouponDetail", { couponId: c.id })} />
          ))}
        </View>
      )}
    </StickyFilterList>
  );
}
