import { useState } from "react";
import { Alert, Image, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ban, Clock, Megaphone, MoreHorizontal, Pencil, Trash2, Zap, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { AppleMenu, AppleMenuItem } from "../components/AppleMenu";
import { GlassIconButton } from "../components/GlassIconButton";
import { EmptyState } from "../components/EmptyState";
import { BottomFade } from "../components/BottomFade";
import { showToast } from "../components/Toast";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  useAllPromotions,
  computedStatus,
  fmtPromoThaiDateTime,
  removePromotion,
  togglePromotion,
  PROMO_PRODUCTS,
  type PromoStatus,
} from "../data/promotions";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CFG: Record<PromoStatus, { label: string; color: string; Icon: LucideIcon }> = {
  active: { label: "กำลังดำเนินการ", color: BRAND_GREEN, Icon: Zap },
  scheduled: { label: "กำหนดไว้", color: "#f59e0b", Icon: Clock },
  ended: { label: "สิ้นสุดแล้ว", color: "#737373", Icon: Ban },
};

// Same section / row language as the coupon detail page.
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

/** รายละเอียดโปรโมชั่น — pushed from the promotion card. Same shell as the
 *  coupon detail: sections + ตั้งค่า switch + app-bar ⋯ morph menu (แก้ไข/ลบ). */
export function ShopPromotionDetailScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { promotionId } = useRoute<RouteProp<RootStackParamList, "ShopPromotionDetail">>().params;
  const [menuOpen, setMenuOpen] = useState(false);
  // Subscribe to the store so toggle/edit updates re-render this page live.
  const p = useAllPromotions().find((x) => x.id === promotionId);

  if (!p) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <StatusBar style="dark" />
        <SubPageHeader title="รายละเอียดโปรโมชั่น" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
        <EmptyState icon={<Megaphone size={34} color={TEXT_MUTED} />} title="ไม่พบโปรโมชั่น" subtitle="โปรโมชั่นนี้อาจถูกลบไปแล้ว" />
      </View>
    );
  }

  const status = computedStatus(p);
  const st = STATUS_CFG[status];
  const discountLabel = p.discountType === "percent" ? `${p.discountValue}%` : `฿${p.discountValue.toLocaleString()}`;

  // Discounted price for a product price string ("฿ 89.00" or "฿ 150.00 - 280.00"):
  // percent → cut capped by maxDiscount; baht → flat cut, floored at 0.
  const applyDiscount = (n: number) => {
    if (p.discountType === "percent") {
      let cut = (n * p.discountValue) / 100;
      if (p.maxDiscount) cut = Math.min(cut, p.maxDiscount);
      return Math.max(0, n - cut);
    }
    return Math.max(0, n - p.discountValue);
  };
  const fmtBaht = (n: number) => `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const discountedLabel = (price: string): string | null => {
    const nums = price.match(/[\d,]+(?:\.\d+)?/g)?.map((s) => parseFloat(s.replace(/,/g, "")));
    if (!nums || nums.length === 0) return null;
    const vals = nums.map(applyDiscount);
    return vals.length > 1 ? `${fmtBaht(vals[0])} - ${fmtBaht(vals[1])}` : fmtBaht(vals[0]);
  };

  const onDelete = () => {
    setMenuOpen(false);
    Alert.alert("ลบโปรโมชั่น", `ลบโปรโมชั่น "${p.name}"?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => {
          removePromotion(p.id);
          showToast(`ลบ: ${p.name}`, "info");
          nav.goBack();
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={p.name}
        subtitle={`ส่วนลด ${discountLabel}`}
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
          {/* Status banner — normal-size box; the promotion-card illustration
              is oversized and pops out of the bottom corner, clipped by the
              box (same trick as the promo card's watermark). */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16, overflow: "hidden" }}>
            <View pointerEvents="none" style={{ position: "absolute", bottom: -30, right: -10 }}>
              <Image
                source={require("../../assets/promotioncard.png")}
                resizeMode="contain"
                style={{ width: 132, height: 104, opacity: status === "ended" ? 0.5 : 0.95 }}
              />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: st.color + "1a", alignItems: "center", justifyContent: "center" }}>
                <st.Icon size={18} color={st.color} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, paddingRight: 110 }}>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>สถานะโปรโมชั่น</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: st.color, marginTop: 1 }}>{st.label}</Text>
              </View>
            </View>
          </View>

          {/* ข้อมูลโปรโมชั่น */}
          <Section title="ข้อมูลโปรโมชั่น">
            <InfoRow label="ชื่อโปรโมชั่น" value={p.name} />
            <InfoRow label="ประเภทส่วนลด" value={p.discountType === "percent" ? "ส่วนลดเปอร์เซ็นต์" : "ส่วนลดจำนวนเงิน"} />
            <InfoRow label="มูลค่าส่วนลด" value={discountLabel} valueColor={BRAND_GREEN} />
            {p.discountType === "percent" && p.maxDiscount ? (
              <InfoRow label="ส่วนลดสูงสุด" value={`฿${p.maxDiscount.toLocaleString()}`} />
            ) : null}
            <InfoRow
              label="ขอบเขต"
              value={p.scope === "all" ? "สินค้าทั้งร้าน" : `สินค้าที่เลือก (${p.products.length} รายการ)`}
            />
            {p.description ? (
              <View style={{ paddingVertical: 6 }}>
                <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>รายละเอียด</Text>
                <Text style={{ fontSize: 13.5, color: "#0a0a0a", lineHeight: 20 }}>{p.description}</Text>
              </View>
            ) : null}
          </Section>

          {/* สินค้าที่เข้าร่วมโปรโมชั่น */}
          <Section title={p.scope === "all" ? "สินค้าที่เข้าร่วม" : `สินค้าที่เข้าร่วม (${p.products.length})`}>
            {p.scope === "all" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                  <Megaphone size={18} color={BRAND_GREEN} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>สินค้าทั้งร้าน</Text>
                  <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>ส่วนลดนี้ใช้ได้กับทุกสินค้าในร้าน</Text>
                </View>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {p.products.map((pl) => {
                  const item = PROMO_PRODUCTS.find((x) => x.id === pl.productId);
                  if (!item) return null;
                  return (
                    <View key={pl.productId} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Image source={item.image} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover"
          resizeMethod="resize" />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }}>{item.name}</Text>
                        {/* Promo price + struck-through normal price */}
                        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "700", color: "#e62e05" }}>
                            {discountedLabel(item.price) ?? item.price}
                          </Text>
                          <Text numberOfLines={1} style={{ fontSize: 11, color: "#a3a3a3", textDecorationLine: "line-through" }}>
                            {item.price}
                          </Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: pl.limit === "unlimited" ? "rgba(49,151,84,0.1)" : "#f5f5f5", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: "600", color: pl.limit === "unlimited" ? BRAND_GREEN : "#525252" }}>
                          {pl.limit === "unlimited" ? "ไม่จำกัด" : `จำกัด ${pl.limit} ชิ้น`}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Section>

          {/* ระยะเวลา */}
          <Section title="ระยะเวลา">
            <InfoRow label="เริ่ม" value={fmtPromoThaiDateTime(p.startsAt)} />
            <InfoRow
              label="สิ้นสุด"
              value={p.noExpiry || !p.endsAt ? "ไม่หมดอายุ" : fmtPromoThaiDateTime(p.endsAt)}
              valueColor={status === "ended" ? "#dc2626" : undefined}
            />
          </Section>

          {/* ตั้งค่า — enable/disable switch (store-backed, page updates live) */}
          <Section title="ตั้งค่า">
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: "#0a0a0a" }}>เปิดใช้งานโปรโมชั่น</Text>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>
                  ปิดเพื่อหยุดใช้ส่วนลดนี้ชั่วคราว
                </Text>
              </View>
              <Switch
                value={p.enabled}
                onValueChange={() => {
                  togglePromotion(p.id);
                  showToast(p.enabled ? `ปิดใช้งาน: ${p.name}` : `เปิดใช้งาน: ${p.name}`);
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
            nav.navigate("PromotionCreate", { editId: p.id });
          }}
        />
        <AppleMenuItem label="ลบ" Icon={Trash2} danger onPress={onDelete} />
      </AppleMenu>
    </View>
  );
}
