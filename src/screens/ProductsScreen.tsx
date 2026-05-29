import { useMemo, useRef, useState } from "react";
import { View, Text, Animated, Dimensions, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SearchX } from "lucide-react-native";
import { ProductCard } from "../components/ProductCard";
import { BrandHeader } from "../components/BrandHeader";
import { EmptyState } from "../components/EmptyState";
import { ALL_PRODUCTS } from "../data/catalog";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH =
  Platform.OS === "web"
    ? Math.min(Dimensions.get("window").width, 430)
    : Dimensions.get("window").width;

// Always floor so two cards + the 12px gap never overflow and break the grid.
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 12) / 2);

export function ProductsScreen() {
  const nav = useNavigation<Nav>();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [query, setQuery] = useState("");

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = ALL_PRODUCTS.filter((p) => q.length === 0 || p.name.toLowerCase().includes(q));
    return [...list].sort((a, b) => b.rating - a.rating);
  }, [query]);

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND_GREEN }}>
      <StatusBar style="light" />

      <BrandHeader
        title="ผลิตภัณฑ์"
        subtitle="เลือกซื้อสมุนไพรคุณภาพ"
        titleSize={20}
        showLogo={false}
        showBell={false}
        query={query}
        onChangeQuery={setQuery}
        onBell={() => nav.navigate("Notification")}
        onCart={() => nav.navigate("Cart")}
        scrollY={scrollY}
      />

      {/* White surface */}
      <View
        style={{
          flex: 1,
          backgroundColor: "#fafafa",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        }}
      >
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
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
              subtitle="ลองเปลี่ยนคำค้นหา"
            />
          ) : (
            <View className="flex-row flex-wrap" style={{ paddingHorizontal: 16, gap: 12 }}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} width={CARD_WIDTH} />
              ))}
            </View>
          )}
        </Animated.ScrollView>
      </View>
    </View>
  );
}
