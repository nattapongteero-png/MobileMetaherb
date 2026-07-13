/**
 * FlashEventDetailScreen — full page shown after pressing "เข้าร่วม" on a Flash
 * Sale event's terms sheet. Ported from the web FlashEventDetail (isNewJoin):
 * countdown + empty state ("ยังไม่มีสินค้าเข้าร่วม") + a button to add products.
 */
import { useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, type GestureResponderEvent } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { Package, Plus } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { FlashProductCard, FlashCardMenu, FlashSummaryCard, FLASH_PRODUCTS, type FlashProduct } from "./MyShopScreen";
import { cardMenuAnchor, type CardMenuAnchor } from "../components/AppleMenu";
import { showToast } from "../components/Toast";
import { removeFlash } from "../store/promotions";
import type { RootStackParamList } from "../navigation/RootStack";
import { BRAND_GREEN, TEXT_PRIMARY, GLASS_BAR_TINT } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function FlashEventDetailScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "FlashEventDetail">>();

  // Already-joined events open with their products; a fresh join starts empty.
  const [products, setProducts] = useState<FlashProduct[]>(() => (params.joined ? FLASH_PRODUCTS.slice(0, 5) : []));
  const [menuFor, setMenuFor] = useState<FlashProduct | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<CardMenuAnchor | null>(null);
  const rootRef = useRef<View>(null);
  const openMenu = (p: FlashProduct, e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    rootRef.current?.measureInWindow((rx, ry, rw, rh) => {
      setMenuAnchor(cardMenuAnchor(pageX, pageY, rx, ry, rw, rh));
      setMenuFor(p);
    });
  };
  const openAdd = () =>
    nav.navigate("FlashAddProduct", {
      eventDate: params.dateRange, // event period is fixed — no date inputs on the add page
      onDone: (p) => setProducts((prev) => [p, ...prev.filter((x) => x.id !== p.id)]),
    });
  const removeProduct = (p: FlashProduct) => {
    // Drop the round from the shared store too, or the storefront keeps selling
    // it at the flash price after the owner pulled it.
    removeFlash(p.id);
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
    showToast("นำสินค้าออกแล้ว", "info");
  };

  return (
    <View ref={rootRef} className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={params.name}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + (products.length > 0 ? 110 : 24), gap: 16 }}>
        {/* Sales-summary card — totals of this event's products */}
        {products.length > 0 ? <FlashSummaryCard products={products} /> : null}

        {products.length > 0 ? (
          <>
            {/* Header: count */}
            <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY, marginTop: 4 }}>สินค้าที่เข้าร่วม ({products.length})</Text>

            {/* Joined product cards (same style as the Flash Sale store) */}
            {products.map((p) => (
              <FlashProductCard key={p.id} p={p} onMenu={(e) => openMenu(p, e)} dateText={params.dateRange} />
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
              <GlassView glassEffectStyle="regular" colorScheme="light" tintColor={GLASS_BAR_TINT} style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
                <Pressable onPress={openAdd} className="flex-row items-center justify-center active:opacity-90" style={{ flex: 1, height: 50, borderRadius: 999, backgroundColor: BRAND_GREEN, gap: 8 }}>
                  <Plus size={18} color="#fff" strokeWidth={2.6} />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>เพิ่มสินค้าเข้าร่วม Flash Sale</Text>
                </Pressable>
              </GlassView>
            </View>
          </View>
        </>
      ) : null}

      {/* 3-dot menu — same anchored morph card as the Flash Sale store */}
      <FlashCardMenu
        product={menuFor}
        anchor={menuAnchor}
        onClose={() => setMenuFor(null)}
        onRemove={removeProduct}
        onEdit={(p) =>
          nav.navigate("FlashAddProduct", {
            edit: p,
            eventDate: params.dateRange,
            onDone: (np) => setProducts((prev) => prev.map((x) => (x.id === np.id ? np : x))),
          })
        }
      />
    </View>
  );
}
