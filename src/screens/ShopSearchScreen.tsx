import { useMemo, useState } from "react";
import { Dimensions, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Search, X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { EmptyState } from "../components/EmptyState";
import type { RootStackParamList } from "../navigation/RootStack";
import { REAL_PRODUCTS } from "../data/realProducts";
import { MATERIALS, MaterialCard } from "./HerbalMarketScreen";
import { ProductsGrid } from "./ShopScreen";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH =
  Platform.OS === "web"
    ? Math.min(Dimensions.get("window").width, 430)
    : Dimensions.get("window").width;

// In-shop search — pushed from the shop profile's app-bar search button.
// One box covers everything the shop sells: regular products AND Herbal
// Market materials (sectioned results, live filtering as you type).
export function ShopSearchScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "ShopSearch">>();
  const shopName = route.params?.shopName ?? "METAHERB Store";
  const [query, setQuery] = useState("");

  const shopProducts = useMemo(
    () => REAL_PRODUCTS.filter((p) => p.shop === shopName),
    [shopName],
  );
  const shopMaterials = useMemo(
    () => MATERIALS.filter((m) => m.supplier === shopName),
    [shopName],
  );
  const hasHerbal = shopMaterials.length > 0;

  const q = query.trim().toLowerCase();
  const productResults = useMemo(
    () => (q ? shopProducts.filter((p) => p.name.toLowerCase().includes(q)) : shopProducts),
    [shopProducts, q],
  );
  // Same match rule as the Herbal Market: Thai name OR scientific name.
  const herbalResults = useMemo(
    () =>
      q
        ? shopMaterials.filter(
            (m) => m.name.toLowerCase().includes(q) || m.scientificName.toLowerCase().includes(q),
          )
        : shopMaterials,
    [shopMaterials, q],
  );
  const totalFound = productResults.length + herbalResults.length;

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={["top"]}>
        {/* App bar — back button + the search pill that used to live in the page */}
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
              placeholder={hasHerbal ? "ค้นหาสินค้าและวัตถุดิบในร้านนี้" : "ค้นหาสินค้าในร้านนี้"}
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

      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
      >
        <Text style={{ paddingHorizontal: 16, marginBottom: 10, fontSize: 12, color: "#737373" }}>
          {q ? `พบ ${totalFound} รายการใน ${shopName}` : `ทั้งหมดของ ${shopName}`}
        </Text>

        {totalFound === 0 ? (
          <EmptyState
            icon={<Search size={36} color="#d4d4d4" />}
            title="ไม่พบผลลัพธ์"
            subtitle="ลองเปลี่ยนคำค้นหาดู"
          />
        ) : (
          <>
            {productResults.length > 0 ? (
              <>
                {hasHerbal ? <SectionHeader label="สินค้า" count={productResults.length} /> : null}
                <ProductsGrid products={productResults} />
              </>
            ) : null}

            {herbalResults.length > 0 ? (
              <>
                <SectionHeader
                  label="วัตถุดิบ Herbal"
                  count={herbalResults.length}
                  topGap={productResults.length > 0 ? 22 : 6}
                />
                <View className="flex-row flex-wrap" style={{ paddingHorizontal: 16, gap: 14 }}>
                  {herbalResults.map((m) => (
                    <MaterialCard
                      key={m.id}
                      m={m}
                      width={(SCREEN_WIDTH - 16 * 2 - 14) / 2}
                      onPress={() => nav.navigate("HerbalMarketDetail", { id: m.id })}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ label, count, topGap = 6 }: { label: string; count: number; topGap?: number }) {
  return (
    <View className="flex-row items-center" style={{ paddingHorizontal: 16, marginTop: topGap, marginBottom: 10, gap: 6 }}>
      <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#1a1a1a" }}>{label}</Text>
      <Text style={{ fontSize: 12, color: "#737373" }}>({count})</Text>
    </View>
  );
}
