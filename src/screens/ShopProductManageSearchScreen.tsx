import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, type GestureResponderEvent } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, PackageX, Search, X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { cardMenuAnchor, type CardMenuAnchor } from "../components/AppleMenu";
import { EmptyState } from "../components/EmptyState";
import { BottomFade } from "../components/BottomFade";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  PMCardMenu,
  PMCard,
  PM_STATUS_COLOR,
  usePMProducts,
  setPMStatus,
  deletePMProduct,
  type PMProduct,
  type PMStatus,
} from "./MyShopScreen";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Product-management search — pushed from จัดการสินค้า's app-bar search button.
// One box covers both product types (ผลิตภัณฑ์ + วัตถุดิบ), sectioned results;
// same match rule as the old inline box: product name or category.
export function ShopProductManageSearchScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  // Store-backed lists — toggle/delete here updates the list + detail pages too.
  const regular = usePMProducts("regular");
  const material = usePMProducts("material");
  const [menuFor, setMenuFor] = useState<{ p: PMProduct; type: "regular" | "material" } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<CardMenuAnchor | null>(null);
  const rootRef = useRef<View>(null);
  const openMenu = (p: PMProduct, type: "regular" | "material", e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    rootRef.current?.measureInWindow((rx, ry, rw, rh) => {
      setMenuAnchor(cardMenuAnchor(pageX, pageY, rx, ry, rw, rh));
      setMenuFor({ p, type });
    });
  };

  const q = query.trim().toLowerCase();
  const match = (p: PMProduct) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  const regularResults = useMemo(() => regular.filter(match), [regular, q]);
  const materialResults = useMemo(() => material.filter(match), [material, q]);
  const totalFound = regularResults.length + materialResults.length;

  const openDetail = (p: PMProduct, type: "regular" | "material") =>
    nav.navigate("ShopProductDetail", { productId: p.id, type });

  return (
    <View ref={rootRef} className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={["top"]}>
        {/* App bar — back button + search pill */}
        <View className="flex-row items-center" style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}>
          <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
          </GlassIconButton>
          <View
            className="flex-row items-center rounded-full px-4"
            style={{
              flex: 1,
              height: 46,
              backgroundColor: "#ffffff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Search size={18} color="#319754" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ค้นหาชื่อสินค้า หรือหมวดหมู่"
              placeholderTextColor="#a3a3a3"
              returnKeyType="search"
              autoFocus
              style={{ flex: 1, marginLeft: 10, fontSize: 13.5, color: "#374151" }}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8} className="active:opacity-60">
                <X size={16} color="#a3a3a3" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 24 }}
      >
        <Text style={{ paddingHorizontal: 16, marginBottom: 10, fontSize: 12, color: "#737373" }}>
          {q ? `พบ ${totalFound} รายการ` : `สินค้าทั้งหมด ${regular.length + material.length} รายการ`}
        </Text>

        {totalFound === 0 ? (
          <EmptyState
            icon={<PackageX size={36} color="#d4d4d4" />}
            title="ไม่พบสินค้า"
            subtitle="ลองค้นด้วยชื่อสินค้าหรือหมวดหมู่"
          />
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {regularResults.length > 0 ? (
              <>
                <SectionHeader label="ผลิตภัณฑ์" count={regularResults.length} />
                {regularResults.map((p) => (
                  <PMCard key={p.id} p={p} onMenu={(e) => openMenu(p, "regular", e)} onPreview={() => openDetail(p, "regular")} />
                ))}
              </>
            ) : null}
            {materialResults.length > 0 ? (
              <>
                <SectionHeader label="วัตถุดิบ Herbal" count={materialResults.length} topGap={regularResults.length > 0 ? 10 : 0} />
                {materialResults.map((p) => (
                  <PMCard key={p.id} p={p} onMenu={(e) => openMenu(p, "material", e)} onPreview={() => openDetail(p, "material")} />
                ))}
              </>
            ) : null}
          </View>
        )}
      </ScrollView>
      {/* Scroll fades — content dissolves into the app bar / bottom edge */}
      <LinearGradient
        pointerEvents="none"
        colors={["#fafafa", "rgba(250,250,250,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
      />
      <BottomFade />
      </View>

      {/* Long-press ⋯ menu — same anchored morph card as the จัดการสินค้า list */}
      <PMCardMenu
        product={menuFor?.p ?? null}
        anchor={menuAnchor}
        onClose={() => setMenuFor(null)}
        onToggle={(prod) => {
          if (!menuFor) return;
          const next: PMStatus = prod.status === "เปิดขาย" ? "ปิดขาย" : "เปิดขาย";
          setPMStatus(prod.id, next);
          setMenuFor({ ...menuFor, p: { ...prod, status: next, statusColor: PM_STATUS_COLOR[next] } });
        }}
        onDelete={(prod) => {
          deletePMProduct(prod.id);
          setMenuFor(null);
        }}
      />
    </View>
  );
}

function SectionHeader({ label, count, topGap = 0 }: { label: string; count: number; topGap?: number }) {
  return (
    <View className="flex-row items-center" style={{ marginTop: topGap, gap: 6 }}>
      <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#1a1a1a" }}>{label}</Text>
      <Text style={{ fontSize: 12, color: "#737373" }}>({count})</Text>
    </View>
  );
}
