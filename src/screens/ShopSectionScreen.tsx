/**
 * ShopSection — one generic pushed subpage for the remaining owner-console
 * sections (Flash Sale / ใบเสนอราคา / PR / PO / โปรโมชั่น / คูปอง / สินค้าทดลอง /
 * ติดตามสินค้าทดลอง). Mirrors ShopComplaints/ShopProducts/ShopOrders: white
 * SubPageHeader + slide-in, instead of swapping in-place inside MyShopScreen.
 * Renders the matching section component (all return parent-scroll <View>s) and
 * re-creates each section's floating "create/add" FAB.
 */
import { View, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Search } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { BottomFade } from "../components/BottomFade";
import {
  SECTION_LABEL,
  FlashSaleSection,
  QuotationSection,
  DocSection,
  type SectionId,
} from "./MyShopScreen";
import { TrialRegistryOwnerSection } from "./TrialRegistryView";
import { TrialTrackingOwnerSection } from "./TrialTrackingView";
import { PromotionsOwnerSection } from "./PromotionsView";
import { CouponsOwnerSection } from "./CouponsView";
import { BRAND_GREEN } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ShopSectionScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { section } = useRoute<RouteProp<RootStackParamList, "ShopSection">>().params;

  // Per-section floating "create/add" action (mirrors the old in-console FABs).
  const fabPress =
    section === "flash_sale" ? () => nav.navigate("FlashAddProduct")
    : section === "trials_products" ? () => nav.navigate("TrialAddProduct")
    : section === "promotions" ? () => nav.navigate("PromotionCreate")
    : section === "coupons" ? () => nav.navigate("CouponCreate")
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={SECTION_LABEL[section as SectionId] ?? ""}
        onBack={() => nav.goBack()}
        showSearch={false}
        rightSlot={
          section === "hm_quotations" ? (
            <GlassIconButton
              onPress={() => nav.navigate("ShopQuoteSearch")}
              accessibilityLabel="ค้นหาใบเสนอราคา"
            >
              <Search size={20} color="#1a1a1a" />
            </GlassIconButton>
          ) : section === "hm_pr" || section === "hm_po" ? (
            <GlassIconButton
              onPress={() => nav.navigate("ShopDocSearch", { kind: section === "hm_pr" ? "pr" : "po" })}
              accessibilityLabel="ค้นหาเอกสาร"
            >
              <Search size={20} color="#1a1a1a" />
            </GlassIconButton>
          ) : section === "coupons" ? (
            <GlassIconButton
              onPress={() => nav.navigate("ShopCouponSearch")}
              accessibilityLabel="ค้นหาคูปอง"
            >
              <Search size={20} color="#1a1a1a" />
            </GlassIconButton>
          ) : undefined
        }
      />
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + (fabPress ? 96 : 24) }}
        >
          {section === "flash_sale" ? <FlashSaleSection /> : null}
          {section === "hm_quotations" ? <QuotationSection showSearch={false} /> : null}
          {section === "hm_pr" ? <DocSection kind="pr" showSearch={false} /> : null}
          {section === "hm_po" ? <DocSection kind="po" showSearch={false} /> : null}
          {section === "trials_products" ? <TrialRegistryOwnerSection /> : null}
          {section === "trials_tracking" ? <TrialTrackingOwnerSection /> : null}
          {section === "promotions" ? <PromotionsOwnerSection /> : null}
          {section === "coupons" ? <CouponsOwnerSection showSearch={false} /> : null}
        </ScrollView>
        {/* Scroll fades — content dissolves into the header / bottom edge */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
        <BottomFade />
      </View>
      {fabPress ? (
        <Pressable
          onPress={fabPress}
          accessibilityLabel="สร้าง / เพิ่ม"
          className="items-center justify-center active:opacity-90"
          style={{ position: "absolute", right: 16, bottom: insets.bottom + 20, width: 56, height: 56, borderRadius: 28, backgroundColor: BRAND_GREEN, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
        >
          <Plus size={26} color="#fff" strokeWidth={2.6} />
        </Pressable>
      ) : null}
    </View>
  );
}
