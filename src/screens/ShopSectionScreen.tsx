/**
 * ShopSection — one generic pushed subpage for the remaining owner-console
 * sections (Flash Sale / ใบเสนอราคา / PR / PO / โปรโมชั่น / คูปอง / สินค้าทดลอง /
 * ติดตามสินค้าทดลอง). Mirrors ShopComplaints/ShopProducts/ShopOrders: white
 * SubPageHeader + slide-in, instead of swapping in-place inside MyShopScreen.
 * Renders the matching section component (all return parent-scroll <View>s) and
 * re-creates each section's floating "create/add" FAB.
 */
import { useState } from "react";
import { View, Pressable } from "react-native";
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
  FlashMonthPicker,
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
  const { section, initialFilter } = useRoute<RouteProp<RootStackParamList, "ShopSection">>().params;
  // Flash Sale เดือน/ปี filter — lives here so its pill can sit in the app bar
  // next to search; the section below re-scopes to it.
  const [flashMonth, setFlashMonth] = useState(7);
  const [flashYear, setFlashYear] = useState(2569);

  // Per-section floating "create/add" action (mirrors the old in-console FABs).
  const fabPress =
    // flash_sale: adding lives on the summary cards now (no FAB)
    section === "trials_products" ? () => nav.navigate("TrialAddProduct")
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
          ) : section === "promotions" ? (
            <GlassIconButton
              onPress={() => nav.navigate("ShopPromotionSearch")}
              accessibilityLabel="ค้นหาโปรโมชั่น"
            >
              <Search size={20} color="#1a1a1a" />
            </GlassIconButton>
          ) : section === "flash_sale" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <FlashMonthPicker
                month={flashMonth}
                year={flashYear}
                onChange={(m, y) => { setFlashMonth(m); setFlashYear(y); }}
              />
              <GlassIconButton
                onPress={() => nav.navigate("ShopFlashSearch")}
                accessibilityLabel="ค้นหาสินค้า Flash Sale"
              >
                <Search size={20} color="#1a1a1a" />
              </GlassIconButton>
            </View>
          ) : section === "trials_products" ? (
            <GlassIconButton
              onPress={() => nav.navigate("ShopTrialSearch")}
              accessibilityLabel="ค้นหาสินค้าทดลอง"
            >
              <Search size={20} color="#1a1a1a" />
            </GlassIconButton>
          ) : section === "trials_tracking" ? (
            <GlassIconButton
              onPress={() => nav.navigate("ShopTrialTrackingSearch")}
              accessibilityLabel="ค้นหาคำขอทดลอง"
            >
              <Search size={20} color="#1a1a1a" />
            </GlassIconButton>
          ) : undefined
        }
      />
      <View style={{ flex: 1 }}>
        {/* Every section owns its scroll (StickyFilterList: pinned filter bar +
            full-bleed pill rows) — no wrapper ScrollView, nothing clips. */}
        {(() => {
          const bottom = insets.bottom + (fabPress ? 96 : 24);
          switch (section) {
            case "flash_sale": return <FlashSaleSection insetsBottom={bottom} month={flashMonth} year={flashYear} />;
            case "hm_quotations": return <QuotationSection showSearch={false} initialFilter={initialFilter} insetsBottom={bottom} />;
            case "hm_pr": return <DocSection kind="pr" showSearch={false} insetsBottom={bottom} />;
            case "hm_po": return <DocSection kind="po" showSearch={false} insetsBottom={bottom} />;
            case "trials_products": return <TrialRegistryOwnerSection insetsBottom={bottom} showSearch={false} />;
            case "trials_tracking": return <TrialTrackingOwnerSection insetsBottom={bottom} showSearch={false} />;
            case "promotions": return <PromotionsOwnerSection showSearch={false} insetsBottom={bottom} />;
            case "coupons": return <CouponsOwnerSection showSearch={false} insetsBottom={bottom} />;
            default: return null;
          }
        })()}
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
          style={{ position: "absolute", right: 16, bottom: 18, width: 56, height: 56, borderRadius: 28, backgroundColor: BRAND_GREEN, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
        >
          <Plus size={26} color="#fff" strokeWidth={2.6} />
        </Pressable>
      ) : null}
    </View>
  );
}
