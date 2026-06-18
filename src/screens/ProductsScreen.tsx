import { useCallback, useRef, useState } from "react";
import { View, Text, Animated, Dimensions, Platform, Pressable, ScrollView, RefreshControl } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SearchX, SlidersHorizontal } from "lucide-react-native";
import { ProductCard } from "../components/ProductCard";
import { BottomFade } from "../components/BottomFade";
import { SubPageHeader } from "../components/SubPageHeader";
import { EmptyState } from "../components/EmptyState";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { useProductFilter, type KindFilter } from "../context/ProductFilterContext";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH =
  Platform.OS === "web"
    ? Math.min(Dimensions.get("window").width, 430)
    : Dimensions.get("window").width;

// Always floor so two cards + the 12px gap never overflow and break the grid.
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 12) / 2);

// Product-kind chips (filter by product flags, not catalog category).
const KIND_CHIPS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "flash", label: "สินค้า Flash Sale" },
  { key: "promo", label: "สินค้าโปรโมชัน" },
  { key: "recommended", label: "สินค้าแนะนำ" },
];

// Category chip with a springy press animation (scale down on press, bounce
// back on release) — same feel as the product-detail option pills.
function KindChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, friction: 5, tension: 220 }).start();
  return (
    <Pressable onPress={onPress} hitSlop={4} onPressIn={() => spring(0.92)} onPressOut={() => spring(1)}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <GlassView
          glassEffectStyle="regular"
          colorScheme="light"
          tintColor={active ? "rgba(49,151,84,0.22)" : "rgba(255,255,255,0.45)"}
          isInteractive
          style={{
            height: 34,
            paddingHorizontal: 16,
            borderRadius: 999,
            overflow: "hidden",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: active ? "rgba(49,151,84,0.45)" : "rgba(255,255,255,0.6)",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? BRAND_GREEN_DARK : "#374151" }}>
            {label}
          </Text>
        </GlassView>
      </Animated.View>
    </Pressable>
  );
}

export function ProductsScreen() {
  const nav = useNavigation<Nav>();
  const scrollY = useRef(new Animated.Value(0)).current;
  const f = useProductFilter();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Mock data refresh — spin briefly then settle.
    setTimeout(() => setRefreshing(false), 1100);
  }, []);
  const filterScale = useRef(new Animated.Value(1)).current;
  const springFilter = (to: number) =>
    Animated.spring(filterScale, { toValue: to, useNativeDriver: true, friction: 5, tension: 220 }).start();

  // kind + all other filters live in the shared context (synced with the sheet).
  const products = f.products;

  // Filter button + horizontal category chips — sits below the search bar.
  const filterBar = (
    <View className="flex-row items-center" style={{ gap: 10 }}>
      <Pressable
        onPress={() => nav.navigate("ProductFilter")}
        hitSlop={6}
        accessibilityLabel="ตัวกรอง"
        onPressIn={() => springFilter(0.9)}
        onPressOut={() => springFilter(1)}
      >
        <Animated.View style={{ transform: [{ scale: filterScale }] }}>
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            tintColor="rgba(255,255,255,0.45)"
            isInteractive
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.6)",
            }}
          >
            <SlidersHorizontal size={18} color="#374151" strokeWidth={2.2} />
          </GlassView>
        </Animated.View>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {KIND_CHIPS.map((c) => (
          <KindChip key={c.key} label={c.label} active={f.kind === c.key} onPress={() => f.setKind(c.key)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader
        title="ผลิตภัณฑ์"
        subtitle="เลือกซื้อสมุนไพรคุณภาพ"
        query={f.query}
        onChangeQuery={f.setQuery}
        onBack={() => nav.canGoBack() && nav.goBack()}
        onCart={() => nav.navigate("Cart")}
        bottomSlot={filterBar}
      />

      <View style={{ flex: 1 }}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BRAND_GREEN}
              colors={[BRAND_GREEN]}
            />
          }
        >
          <Text
            style={{ fontSize: 13, color: TEXT_MUTED, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}
          >
            พบ {products.length} รายการ
          </Text>

          {products.length === 0 ? (
            <EmptyState
              icon={<SearchX size={34} color={TEXT_MUTED} />}
              title="ไม่พบสินค้า"
              subtitle="ลองเปลี่ยนคำค้นหาหรือตัวกรอง"
            />
          ) : (
            <View className="flex-row flex-wrap" style={{ paddingHorizontal: 16, gap: 12 }}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} width={CARD_WIDTH} />
              ))}
            </View>
          )}
        </Animated.ScrollView>

        {/* Top fade — items dissolve into the header as they scroll up */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
        {/* Black scroll-edge shade at the very bottom of the screen. */}
        <BottomFade />
      </View>
    </View>
  );
}
