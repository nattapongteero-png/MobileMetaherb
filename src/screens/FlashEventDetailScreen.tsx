/**
 * FlashEventDetailScreen — full page shown after pressing "เข้าร่วม" on a Flash
 * Sale event's terms sheet. Ported from the web FlashEventDetail (isNewJoin):
 * countdown + empty state ("ยังไม่มีสินค้าเข้าร่วม") + a button to add products.
 */
import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { Package, Plus, Calendar } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { FlashProductCard, FlashActionSheet, FLASH_PRODUCTS, type FlashProduct } from "./MyShopScreen";
import { showToast } from "../components/Toast";
import type { RootStackParamList } from "../navigation/RootStack";
import { BRAND_GREEN, DIVIDER_GRAY, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function FlashEventDetailScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "FlashEventDetail">>();
  const cd = [0, 0, 0]; // newly-joined event hasn't started → 00:00:00

  // Already-joined events open with their products; a fresh join starts empty.
  const [products, setProducts] = useState<FlashProduct[]>(() => (params.joined ? FLASH_PRODUCTS.slice(0, 3) : []));
  const [menuFor, setMenuFor] = useState<FlashProduct | null>(null);
  const openAdd = () =>
    nav.navigate("FlashAddProduct", { onDone: (p) => setProducts((prev) => [p, ...prev.filter((x) => x.id !== p.id)]) });
  const removeProduct = (p: FlashProduct) => {
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
    showToast("นำสินค้าออกแล้ว", "info");
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={params.name}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + (products.length > 0 ? 110 : 24), gap: 16 }}>
        {/* Event info card — date + countdown on one row */}
        <View style={{ backgroundColor: "white", borderRadius: 20, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 16 }}>
          <View className="flex-row items-center justify-between" style={{ gap: 10 }}>
            <View className="flex-row items-center" style={{ gap: 10, flexShrink: 1 }}>
              <Calendar size={24} color={BRAND_GREEN} strokeWidth={2} />
              <View style={{ flexShrink: 1, gap: 1 }}>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>ระยะเวลากิจกรรม</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY }} numberOfLines={1}>{params.dateRange}</Text>
              </View>
            </View>
            <View className="flex-row items-center" style={{ gap: 5 }}>
              {cd.map((n, i) => (
                <View key={i} className="flex-row items-center" style={{ gap: 5 }}>
                  <LinearGradient colors={["#e62e05", "#bc1b06"]} style={{ width: 38, paddingVertical: 6, borderRadius: 8, alignItems: "center" }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>{String(n).padStart(2, "0")}</Text>
                  </LinearGradient>
                  {i < 2 ? <Text style={{ fontSize: 15, fontWeight: "400", color: "#0a0a0a" }}>:</Text> : null}
                </View>
              ))}
            </View>
          </View>
        </View>

        {products.length > 0 ? (
          <>
            {/* Header: count */}
            <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY, marginTop: 4 }}>สินค้าที่เข้าร่วม ({products.length})</Text>

            {/* Joined product cards (same style as the Flash Sale store) */}
            {products.map((p) => (
              <FlashProductCard key={p.id} p={p} onMenu={() => setMenuFor(p)} dateText={params.dateRange} />
            ))}
          </>
        ) : (
          /* Empty state — no container, sits directly on the page */
          <View style={{ paddingVertical: 48, paddingHorizontal: 24, alignItems: "center", gap: 8 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Package size={40} color={BRAND_GREEN} strokeWidth={1.6} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a" }}>ยังไม่มีสินค้าเข้าร่วม Flash Sale</Text>
            <Text style={{ fontSize: 13, color: "#8e8e93", textAlign: "center", lineHeight: 20, marginBottom: 8 }}>เลือกสินค้าจากร้านของคุณเข้าร่วมกิจกรรม{"\n"}พร้อมตั้งราคาส่วนลดและจำนวนที่ต้องการขาย</Text>
            <Pressable onPress={openAdd} className="flex-row items-center active:opacity-90" style={{ backgroundColor: BRAND_GREEN, height: 44, paddingLeft: 8, paddingRight: 16, borderRadius: 999, gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
                <Plus size={15} color="white" strokeWidth={2.6} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "white" }}>เพิ่มสินค้าเข้าร่วม Flash Sale</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Footer — floating Liquid Glass bar (same style as AddProductScreen) */}
      {products.length > 0 ? (
        <>
          <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 130 }} />
          <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: insets.bottom + 10 }}>
            <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
              <GlassView glassEffectStyle="regular" colorScheme="light" style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
                <Pressable onPress={openAdd} className="flex-row items-center justify-center active:opacity-90" style={{ flex: 1, height: 50, borderRadius: 999, backgroundColor: BRAND_GREEN, gap: 8 }}>
                  <Plus size={18} color="#fff" strokeWidth={2.6} />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>เพิ่มสินค้าเข้าร่วม Flash Sale</Text>
                </Pressable>
              </GlassView>
            </View>
          </View>
        </>
      ) : null}

      {/* 3-dot menu — same bottom sheet as the Flash Sale store */}
      <FlashActionSheet product={menuFor} onClose={() => setMenuFor(null)} onRemove={removeProduct} />
    </View>
  );
}
