/**
 * PromotionsView — "โปรโมชั่น" owner-console section.
 *
 * Ported 1:1 from the web PromotionsTab (OwnerDashboard.tsx L14993-15234):
 *   - filter pills (ทั้งหมด / กำลังดำเนินการ / กำหนดไว้ / สิ้นสุดแล้ว) with live
 *     counts + a search box (same white-pill + red-badge styling as
 *     TrialTrackingView), full-bleed pill scroller,
 *   - promo cards in a 2-col grid: gradient header (ended=gray / scheduled=amber
 *     / active=orange) with the big discount value + status pill, body with name,
 *     description, product-count + date-range meta, and a ⋯ menu opening a
 *     BottomSheet (แก้ไข / เปิด-ปิดใช้งาน / ลบ),
 *   - "ไม่พบโปรโมชั่น" empty state.
 *
 * Header-less (MyShopScreen renders the section label + a floating "สร้าง" FAB);
 * framer-motion / Popover are dropped for plain View/Pressable + BottomSheet.
 */
import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ClipboardList,
  Zap,
  Clock,
  Ban,
  Boxes,
  Calendar,
  Megaphone,
  type LucideIcon,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SearchBar } from "../components/SearchBar";
import { StickyFilterList } from "../components/StickyFilterList";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  useAllPromotions,
  computedStatus,
  fmtPromoThaiDateTime,
  type Promotion,
  type PromoStatus,
} from "../data/promotions";
import { BRAND_GREEN, DIVIDER_GRAY, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import { gridCardWidth, isTablet } from "../theme/layout";

type FilterKey = "all" | PromoStatus;
type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Status pill / gradient config — colors match the web card 1:1. */
function statusConfig(status: PromoStatus): { label: string; color: string; Icon: LucideIcon } {
  if (status === "active") return { label: "กำลังดำเนินการ", color: BRAND_GREEN, Icon: Zap };
  if (status === "scheduled") return { label: "กำหนดไว้", color: "#f59e0b", Icon: Clock };
  return { label: "สิ้นสุดแล้ว", color: "#737373", Icon: Ban };
}

function headerGradient(status: PromoStatus): [string, string] {
  if (status === "ended") return ["#f5f5f5", "#e5e5e5"];
  if (status === "scheduled") return ["#fef3c7", "#fde68a"];
  return ["rgba(255,107,53,0.95)", "rgba(230,46,5,0.95)"];
}

// Standard filter chip — same pill language as the orders / quotations /
// coupons pages (white pill + border, count badge; active = solid green).
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

export function PromoCard({ p, width, onPress }: { p: Promotion; width: number; onPress: () => void }) {
  const status = computedStatus(p);
  const isEnded = status === "ended";
  const st = statusConfig(status);
  const headerText = isEnded ? "#374151" : status === "scheduled" ? "#92400e" : "#ffffff";
  const labelText = isEnded ? "#6b7280" : status === "scheduled" ? "#92400e" : "rgba(255,255,255,0.85)";
  const productCount = p.scope === "all" ? "ทุกสินค้า" : `${p.products.length} รายการ`;
  const discountLabel = p.discountType === "percent" ? `${p.discountValue}%` : `฿${p.discountValue}`;

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-90"
      style={{
        width,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#f3f4f6",
        backgroundColor: "#fff",
        opacity: isEnded ? 0.85 : 1,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
    >
      {/* Header — gradient bg + discount + status */}
      <LinearGradient colors={headerGradient(status)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14, overflow: "hidden" }}>
        {/* Decorative promotion-card watermark (web imgPromoCard) */}
        <View pointerEvents="none" style={{ position: "absolute", bottom: -12, right: -12 }}>
          <Image
            source={require("../../assets/promotioncard.png")}
            resizeMode="contain"
            style={{ width: 112, height: 112, opacity: isEnded ? 0.5 : 0.9 }}
          />
        </View>
        <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.5, color: labelText, marginBottom: 2 }}>ส่วนลด</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 26, lineHeight: 30, fontWeight: "800", color: headerText }}>{discountLabel}</Text>
          </View>
          <View
            className="flex-row items-center"
            style={{ gap: 4, paddingLeft: 7, paddingRight: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: isEnded ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.95)" }}
          >
            <st.Icon size={11} color={st.color} strokeWidth={2.4} />
            <Text style={{ fontSize: 10.5, fontWeight: "600", color: st.color }}>{st.label}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Body — name + description + meta */}
      <View style={{ padding: 14, gap: 10 }}>
        <View>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{p.name}</Text>
          {p.description ? (
            <Text numberOfLines={2} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 3, lineHeight: 16 }}>{p.description}</Text>
          ) : null}
        </View>

        <View style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0" }}>
          <View className="flex-row items-center" style={{ gap: 7 }}>
            <Boxes size={13} color="#9ca3af" strokeWidth={2.2} />
            <Text style={{ fontSize: 11.5, color: "#4b5563" }}>{productCount}</Text>
          </View>
          <View className="flex-row items-start" style={{ gap: 7 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <View className="flex-row items-baseline" style={{ gap: 4 }}>
                <Text style={{ fontSize: 10.5, color: "#9ca3af" }}>เริ่ม</Text>
                <Text style={{ flex: 1, fontSize: 11, color: "#4b5563" }}>{fmtPromoThaiDateTime(p.startsAt)}</Text>
              </View>
              <View className="flex-row items-baseline" style={{ gap: 4 }}>
                <Text style={{ fontSize: 10.5, color: "#9ca3af" }}>สิ้นสุด</Text>
                <Text style={{ flex: 1, fontSize: 11, color: "#4b5563" }}>{p.endsAt ? fmtPromoThaiDateTime(p.endsAt) : "ไม่หมดอายุ"}</Text>
              </View>
            </View>
          </View>
        </View>

      </View>
    </Pressable>
  );
}

export function PromotionsOwnerSection({ showSearch = true, insetsBottom = 24 }: { showSearch?: boolean; insetsBottom?: number }) {
  const nav = useNavigation<Nav>();
  const promotions = useAllPromotions();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  // Floor to avoid flex-wrap breakage (per project convention).
  // iPad shows 3 promo cards per row (they're wider than product cards).
  const cardWidth = useMemo(() => gridCardWidth(isTablet() ? 3 : 2), []);

  const countBy = (s: PromoStatus) => promotions.filter((p) => computedStatus(p) === s).length;

  const filtered = useMemo(() => {
    let result = promotions;
    if (filter !== "all") result = result.filter((p) => computedStatus(p) === filter);
    const q = search.trim().toLowerCase();
    if (q) result = result.filter((p) => p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q) ?? false));
    return result;
  }, [promotions, filter, search]);

  const pills: { key: FilterKey; label: string; count: number; Icon: LucideIcon }[] = [
    { key: "all", label: "ทั้งหมด", count: promotions.length, Icon: ClipboardList },
    { key: "active", label: "กำลังดำเนินการ", count: countBy("active"), Icon: Zap },
    { key: "scheduled", label: "กำหนดไว้", count: countBy("scheduled"), Icon: Clock },
    { key: "ended", label: "สิ้นสุดแล้ว", count: countBy("ended"), Icon: Ban },
  ];

  return (
    <StickyFilterList
      filterKey={filter}
      insetsBottom={insetsBottom}
      header={
        showSearch ? <SearchBar value={search} onChangeText={setSearch} placeholder="ค้นหาชื่อโปรโมชั่น..." /> : undefined
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
          <Megaphone size={40} color="#d1d5db" strokeWidth={1.5} />
          <Text style={{ fontSize: 14, color: "#9ca3af" }}>ไม่พบโปรโมชั่น</Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {filtered.map((p) => (
            <PromoCard key={p.id} p={p} width={cardWidth} onPress={() => nav.navigate("ShopPromotionDetail", { promotionId: p.id })} />
          ))}
        </View>
      )}
    </StickyFilterList>
  );
}
