import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { X, Check, Clock, ChevronUp, ChevronDown, Ban } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { usePayment } from "../context/PaymentContext";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { CHECKOUT_COUPONS, couponEligible, type CheckoutCoupon } from "../data/checkoutCoupons";
import { useCart } from "../context/CartContext";
import type { RootStackParamList } from "../navigation/RootStack";

const GROUPED_BG = "#f2f2f7";
const LABEL = "#1c1c1e";

/** Selection indicator — green check when active, empty ring otherwise. */
function SelectMark({ active }: { active: boolean }) {
  return active ? (
    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
      <Check size={15} color="white" strokeWidth={3} />
    </View>
  ) : (
    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#cbd0cb" }} />
  );
}

/** Ticket-style coupon card (same look as the My-Coupons screen), selectable.
 *  Coupons under their minimum spend render grayed out and aren't tappable. */
function CouponTicket({
  coupon,
  active,
  eligible,
  shortfall,
  onPress,
}: {
  coupon: CheckoutCoupon;
  active: boolean;
  eligible: boolean;
  shortfall: number;
  onPress: () => void;
}) {
  const stubBg = eligible ? coupon.bgColor : "#b4b4b4";
  const titleColor = eligible ? "#222" : "#9b9b9b";
  const tagColor = eligible ? coupon.tagColor : "#bdbdbd";
  return (
    <Pressable
      onPress={onPress}
      disabled={!eligible}
      className={eligible ? "active:opacity-80" : undefined}
      style={{
        flexDirection: "row",
        height: 112,
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#ececed",
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {/* Left colored stub with notch cutouts */}
      <View style={{ width: 84, backgroundColor: stubBg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff" }}>{coupon.label}</Text>
        <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.95)", marginTop: 2 }}>{coupon.sublabel}</Text>
        <View style={{ position: "absolute", right: -6, top: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: GROUPED_BG }} />
        <View style={{ position: "absolute", right: -6, bottom: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: GROUPED_BG }} />
      </View>

      {/* Body */}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, gap: 10 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: titleColor }} numberOfLines={2}>
            {coupon.title}
          </Text>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>{coupon.minSpend}</Text>
          {coupon.tag ? (
            <View style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: tagColor, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 1.5 }}>
              <Text style={{ fontSize: 10, color: tagColor }}>{coupon.tag}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Clock size={11} color="#9b9b9b" strokeWidth={2.2} />
            <Text style={{ fontSize: 11, color: "#9b9b9b" }}>{coupon.expiry}</Text>
          </View>
        </View>
        {eligible ? (
          <SelectMark active={active} />
        ) : (
          <View style={{ alignItems: "center", width: 54 }}>
            <Text style={{ fontSize: 10, color: "#9b9b9b" }}>ซื้อเพิ่ม</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#9b9b9b" }}>฿{shortfall}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** Coupon picker — ticket cards grouped into collapsible sections (matches the web). */
export function CouponSelectScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { selectedCouponIdx, setSelectedCouponIdx } = usePayment();

  // Coupon eligibility must reflect what is actually being bought — this used
  // to compare against CHECKOUT_SUBTOTAL, the total of a hardcoded 2-item array.
  const { items, checkoutItems } = useCart();
  const lines = checkoutItems.length ? checkoutItems : items.filter((i) => i.inStock);
  const subtotal = lines.reduce((s, i) => s + i.price * i.quantity, 0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const choose = (idx: number | null) => {
    setSelectedCouponIdx(idx);
    nav.goBack();
  };

  // Group coupons by `group`, keeping each one's original index.
  const groups: { group: string; items: { coupon: CheckoutCoupon; idx: number }[] }[] = [];
  CHECKOUT_COUPONS.forEach((coupon, idx) => {
    const last = groups[groups.length - 1];
    if (last && last.group === coupon.group) last.items.push({ coupon, idx });
    else groups.push({ group: coupon.group, items: [{ coupon, idx }] });
  });

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: LABEL }}>เลือกคูปอง</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* No-coupon option */}
        <Pressable
          onPress={() => choose(null)}
          className="flex-row items-center active:opacity-80"
          style={{
            backgroundColor: "#fff",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#ececed",
            paddingHorizontal: 14,
            paddingVertical: 14,
            marginBottom: 4,
            gap: 12,
          }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#f1f1f3", alignItems: "center", justifyContent: "center" }}>
            <Ban size={18} color="#9ca3af" />
          </View>
          <Text style={{ flex: 1, fontSize: 15, color: LABEL, fontWeight: selectedCouponIdx === null ? "600" : "400" }}>
            ไม่ใช้คูปอง
          </Text>
          <SelectMark active={selectedCouponIdx === null} />
        </Pressable>

        {groups.map((g) => {
          const isCollapsed = collapsed[g.group];
          return (
            <View key={g.group}>
              <Pressable
                onPress={() => setCollapsed((c) => ({ ...c, [g.group]: !c[g.group] }))}
                className="flex-row items-center justify-between active:opacity-70"
                style={{ paddingTop: 16, paddingBottom: 8 }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: LABEL }}>{g.group}</Text>
                {isCollapsed ? <ChevronDown size={20} color="#8a8f8a" /> : <ChevronUp size={20} color="#8a8f8a" />}
              </Pressable>
              {!isCollapsed
                ? g.items.map(({ coupon, idx }) => (
                    <CouponTicket
                      key={coupon.code}
                      coupon={coupon}
                      active={selectedCouponIdx === idx}
                      eligible={couponEligible(coupon, subtotal)}
                      shortfall={coupon.minSpendValue - subtotal}
                      onPress={() => choose(idx)}
                    />
                  ))
                : null}
            </View>
          );
        })}

        <Text style={{ fontSize: 12, color: "#8a8f8a", marginTop: 8, marginHorizontal: 4 }}>
          ใช้ได้ครั้งละ 1 คูปองต่อคำสั่งซื้อ
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
});
