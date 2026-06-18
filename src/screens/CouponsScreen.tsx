import { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronRight, Clock, Ticket, ShoppingCart } from "lucide-react-native";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { COUPONS, type Coupon } from "../data/coupons";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type FilterKey = "all" | "discount" | "free_shipping" | "used" | "expired";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "discount", label: "ส่วนลด" },
  { key: "free_shipping", label: "ส่งฟรี" },
  { key: "used", label: "ใช้แล้ว" },
  { key: "expired", label: "หมดอายุ" },
];

const matches = (c: Coupon, f: FilterKey) =>
  f === "all"
    ? true
    : f === "discount"
      ? (c.type === "MH" || c.type === "VIP") && c.status === "active"
      : f === "free_shipping"
        ? c.type === "FREE" && c.status === "active"
        : f === "used"
          ? c.status === "used"
          : c.status === "expired";

function CouponCard({ coupon, onUse }: { coupon: Coupon; onUse: () => void }) {
  const inactive = coupon.status !== "active";
  const badgeBg = inactive ? "#b4b4b4" : coupon.bgColor;

  return (
    <View style={{ flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#ececed", overflow: "hidden" }}>
      {/* Left colored badge with notch cutouts */}
      <View style={{ width: 84, backgroundColor: badgeBg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff" }}>{coupon.label}</Text>
        <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.95)", marginTop: 2 }}>{coupon.sublabel}</Text>
        {/* notch cutouts */}
        <View style={{ position: "absolute", right: -6, top: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: "#fafafa" }} />
        <View style={{ position: "absolute", right: -6, bottom: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: "#fafafa" }} />
      </View>

      {/* Content */}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, gap: 10 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: inactive ? "#9b9b9b" : "#222" }} numberOfLines={2}>
            {coupon.title}
          </Text>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>{coupon.minSpend}</Text>
          {coupon.tag ? (
            <View style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: inactive ? "#bdbdbd" : coupon.tagColor, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 1.5 }}>
              <Text style={{ fontSize: 10, color: inactive ? "#9b9b9b" : coupon.tagColor }}>{coupon.tag}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Clock size={11} color="#9b9b9b" strokeWidth={2.2} />
            <Text style={{ fontSize: 11, color: "#9b9b9b" }}>{coupon.expiry}</Text>
          </View>
        </View>

        {coupon.status === "active" ? (
          <Pressable onPress={onUse} className="active:opacity-70" style={{ borderWidth: 1, borderColor: BRAND_GREEN, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: BRAND_GREEN }}>ใช้เลย</Text>
          </Pressable>
        ) : (
          <View style={{ backgroundColor: "#f0f0f0", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
            <Text style={{ fontSize: 12, color: "#9b9b9b" }}>{coupon.status === "used" ? "ใช้แล้ว" : "หมดอายุ"}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function CouponsScreen() {
  const nav = useNavigation<Nav>();
  const [filter, setFilter] = useState<FilterKey>("all");

  const countFor = (f: FilterKey) => COUPONS.filter((c) => matches(c, f)).length;
  const filtered = COUPONS.filter((c) => matches(c, filter));

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        {/* Filter pills */}
        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count = countFor(f.key);
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  className="flex-row items-center active:opacity-80"
                  style={{ height: 32, paddingHorizontal: 13, borderRadius: 999, backgroundColor: active ? BRAND_GREEN : "#f0f0f0", gap: 5 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "#fff" : "#404040" }}>{f.label}</Text>
                  <View style={{ minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: active ? "rgba(255,255,255,0.25)" : "#d4d4d4", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 9.5, fontWeight: "700", color: active ? "#fff" : "#fff", lineHeight: 13 }}>{count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
          {/* Collect-more banner */}
          <Pressable
            onPress={() => nav.navigate("CouponCollect")}
            className="flex-row items-center justify-between active:opacity-90"
            style={{ backgroundColor: BRAND_GREEN, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)", borderStyle: "dashed", paddingHorizontal: 14, paddingVertical: 14 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" }}>
                <Ticket size={18} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>เก็บคูปองเพิ่ม</Text>
            </View>
            <ChevronRight size={20} color="#fff" />
          </Pressable>

          {filtered.length > 0 ? (
            filtered.map((c) => (
              <CouponCard key={c.id} coupon={c} onUse={() => { Alert.alert("ใช้คูปอง", `ใช้โค้ด ${c.code} แล้ว`); }} />
            ))
          ) : (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <ShoppingCart size={32} color="#ccc" strokeWidth={1.6} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#999", marginTop: 12 }}>ยังไม่มีคูปองในหมวดนี้</Text>
            </View>
          )}
        </ScrollView>
    </View>
  );
}
