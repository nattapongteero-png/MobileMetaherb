import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ban, Check, Clock, MoreHorizontal, Pencil, Percent, Ticket, Trash2, Truck, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { AppleMenu, AppleMenuItem } from "../components/AppleMenu";
import { GlassIconButton } from "../components/GlassIconButton";
import { EmptyState } from "../components/EmptyState";
import { BottomFade } from "../components/BottomFade";
import { showToast } from "../components/Toast";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  useAllCoupons,
  computedCouponStatus,
  fmtCouponDiscount,
  fmtCouponThaiDateTime,
  removeCoupon,
  toggleCoupon,
  type CouponStatus,
} from "../data/ownerCoupons";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CFG: Record<CouponStatus, { label: string; color: string; Icon: LucideIcon }> = {
  active: { label: "ใช้งานอยู่", color: BRAND_GREEN, Icon: Check },
  expired: { label: "หมดอายุ", color: "#dc2626", Icon: Clock },
  disabled: { label: "ปิดใช้งาน", color: "#737373", Icon: Ban },
};

const TYPE_LABEL = { percent: "ส่วนลดเปอร์เซ็นต์", baht: "ส่วนลดจำนวนเงิน", freeship: "ส่งฟรี" } as const;

// Same section / row language as the doc & order detail pages.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", marginBottom: 12 }}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 13.5, color: valueColor ?? "#0a0a0a", fontWeight: "500", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

/** รายละเอียดคูปอง — pushed from the coupon ticket card. Full data + actions. */
export function ShopCouponDetailScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { couponId } = useRoute<RouteProp<RootStackParamList, "ShopCouponDetail">>().params;
  const [menuOpen, setMenuOpen] = useState(false);
  // Subscribe to the store so toggle/edit updates re-render this page live.
  const c = useAllCoupons().find((x) => x.id === couponId);

  if (!c) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <StatusBar style="dark" />
        <SubPageHeader title="รายละเอียดคูปอง" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
        <EmptyState icon={<Ticket size={34} color={TEXT_MUTED} />} title="ไม่พบคูปอง" subtitle="คูปองนี้อาจถูกลบไปแล้ว" />
      </View>
    );
  }

  const status = computedCouponStatus(c);
  const st = STATUS_CFG[status];
  const dis = fmtCouponDiscount(c);
  const isFreeship = c.discountType === "freeship";

  const onDelete = () => {
    setMenuOpen(false);
    Alert.alert("ลบคูปอง", `ลบคูปอง "${c.code}"?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => {
          removeCoupon(c.id);
          showToast(`ลบ: ${c.code}`, "info");
          nav.goBack();
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={c.code}
        subtitle={c.name}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={
          menuOpen ? (
            // The button "becomes" the menu — keep a spacer so the layout holds.
            <View style={{ width: 44, height: 44 }} />
          ) : (
            <GlassIconButton onPress={() => setMenuOpen(true)} accessibilityLabel="เพิ่มเติม">
              <MoreHorizontal size={20} color="#1a1a1a" strokeWidth={2.2} />
            </GlassIconButton>
          )
        }
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {/* Status banner — same language as the other detail pages */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: st.color + "1a", alignItems: "center", justifyContent: "center" }}>
                {isFreeship ? <Truck size={18} color={st.color} strokeWidth={2.2} /> : <Percent size={18} color={st.color} strokeWidth={2.2} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>สถานะคูปอง</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: st.color, marginTop: 1 }}>{st.label}</Text>
              </View>
            </View>
          </View>

          {/* ข้อมูลคูปอง */}
          <Section title="ข้อมูลคูปอง">
            <InfoRow label="ชื่อคูปอง" value={c.name} />
            <InfoRow label="โค้ด" value={c.code} />
            <InfoRow label="ประเภท" value={TYPE_LABEL[c.discountType]} />
            <InfoRow label="มูลค่าส่วนลด" value={dis.label} valueColor={dis.color} />
            {c.discountType === "percent" && c.maxDiscount ? (
              <InfoRow label="ส่วนลดสูงสุด" value={`฿${c.maxDiscount.toLocaleString()}`} />
            ) : null}
            {c.description ? (
              <View style={{ paddingVertical: 6 }}>
                <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>รายละเอียด</Text>
                <Text style={{ fontSize: 13.5, color: "#0a0a0a", lineHeight: 20 }}>{c.description}</Text>
              </View>
            ) : null}
          </Section>

          {/* เงื่อนไขการใช้ */}
          <Section title="เงื่อนไขการใช้">
            <InfoRow label="ยอดสั่งซื้อขั้นต่ำ" value={c.minOrder && c.minOrder > 0 ? `฿${c.minOrder.toLocaleString()}` : "ไม่มีขั้นต่ำ"} />
            <InfoRow label="เฉพาะสมาชิก" value={c.membersOnly ? "ใช่" : "ไม่"} />
            <InfoRow label="เฉพาะออเดอร์แรก" value={c.firstOrderOnly ? "ใช่" : "ไม่"} />
            <InfoRow label="จำกัดต่อผู้ใช้" value={c.perUserLimit && c.perUserLimit > 0 ? `${c.perUserLimit} ครั้ง` : "ไม่จำกัด"} />
            <InfoRow label="จำกัดทั้งหมด" value={c.usageLimit && c.usageLimit > 0 ? `${c.usageLimit.toLocaleString()} ครั้ง` : "ไม่จำกัด"} />
            <InfoRow label="ใช้ไปแล้ว" value={`${c.used.toLocaleString()} ครั้ง`} />
          </Section>

          {/* ระยะเวลา */}
          <Section title="ระยะเวลา">
            <InfoRow label="เริ่มใช้ได้" value={fmtCouponThaiDateTime(c.startsAt)} />
            <InfoRow label="หมดอายุ" value={fmtCouponThaiDateTime(c.endsAt)} valueColor={status === "expired" ? "#dc2626" : undefined} />
          </Section>

          {/* ตั้งค่า — enable/disable switch (store-backed, page updates live) */}
          <Section title="ตั้งค่า">
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: "#0a0a0a" }}>เปิดใช้งานคูปอง</Text>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>
                  ปิดเพื่อหยุดให้ลูกค้าใช้คูปองนี้ชั่วคราว
                </Text>
              </View>
              <Switch
                value={c.status !== "disabled"}
                onValueChange={() => {
                  toggleCoupon(c.id);
                  showToast(c.status === "disabled" ? `เปิดใช้งาน: ${c.code}` : `ปิดใช้งาน: ${c.code}`);
                }}
                trackColor={{ false: "#d1d5db", true: BRAND_GREEN }}
                thumbColor="#fff"
              />
            </View>
          </Section>
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <BottomFade />
      </View>

      {/* More menu — the app-bar ⋯ button morphs into this options card */}
      <AppleMenu visible={menuOpen} onClose={() => setMenuOpen(false)} anchorTop={insets.top + 6}>
        <AppleMenuItem
          label="แก้ไข"
          Icon={Pencil}
          onPress={() => {
            setMenuOpen(false);
            nav.navigate("CouponCreate", { editId: c.id });
          }}
        />
        <AppleMenuItem label="ลบ" Icon={Trash2} danger onPress={onDelete} />
      </AppleMenu>
    </View>
  );
}

