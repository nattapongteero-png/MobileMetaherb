import { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Dimensions, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Heart, Star, ShoppingCart } from "lucide-react-native";
import { IconButton } from "../components/IconButton";
import { ALL_PRODUCTS } from "../data/catalog";
import { BRAND_GREEN, STAR_YELLOW, TEXT_MUTED } from "../theme/tokens";
import type { Product } from "../types/Product";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH =
  Platform.OS === "web" ? Math.min(Dimensions.get("window").width, 430) : Dimensions.get("window").width;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 12) / 2);

function WishCard({ product, onRemove, onAdd, onOpen }: { product: Product; onRemove: () => void; onAdd: () => void; onOpen: () => void }) {
  return (
    <View style={{ width: CARD_WIDTH, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#ececed", overflow: "hidden" }}>
      <Pressable onPress={onOpen} className="active:opacity-90" style={{ width: "100%", height: CARD_WIDTH, backgroundColor: "#f5f5f5" }}>
        <Image source={product.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        {product.discountPercent ? (
          <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#e62e05", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>-{product.discountPercent}%</Text>
          </View>
        ) : null}
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          className="items-center justify-center active:opacity-70"
          style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.92)" }}
        >
          <Heart size={16} color="#ff383c" fill="#ff383c" />
        </Pressable>
      </Pressable>

      <View style={{ padding: 10 }}>
        <Text style={{ fontSize: 13, color: "#0a0a0a" }} numberOfLines={1}>
          {product.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: BRAND_GREEN }}>฿{product.price.toLocaleString()}</Text>
          {product.originalPrice ? (
            <Text style={{ fontSize: 11, color: TEXT_MUTED, textDecorationLine: "line-through" }}>฿{product.originalPrice.toLocaleString()}</Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Star size={11} color={STAR_YELLOW} fill={STAR_YELLOW} />
            <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{product.rating}</Text>
          </View>
          <Text style={{ fontSize: 11, color: TEXT_MUTED }} numberOfLines={1}>{product.sold}</Text>
        </View>
        <Pressable
          onPress={onAdd}
          className="flex-row items-center justify-center active:opacity-80"
          style={{ marginTop: 8, height: 32, borderRadius: 999, backgroundColor: BRAND_GREEN, gap: 5 }}
        >
          <ShoppingCart size={14} color="#fff" strokeWidth={2.2} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>เพิ่มลงตะกร้า</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function WishlistScreen() {
  const nav = useNavigation<Nav>();
  const [favIds, setFavIds] = useState<Set<string>>(() => new Set(ALL_PRODUCTS.slice(0, 8).map((p) => p.id)));

  const products = ALL_PRODUCTS.filter((p) => favIds.has(p.id));
  const remove = (id: string) => setFavIds((prev) => { const next = new Set(prev); next.delete(id); return next; });

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND_GREEN }}>
      <StatusBar style="light" />

      <SafeAreaView edges={["top"]} style={{ backgroundColor: BRAND_GREEN }}>
        <View className="flex-row items-center" style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10, gap: 8 }}>
          <IconButton onPress={() => nav.canGoBack() && nav.goBack()} variant="translucentDark" accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={22} color="white" />
          </IconButton>
          <Text style={{ fontSize: 19, fontWeight: "700", color: "#fff" }}>สินค้าที่ชอบ</Text>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1, backgroundColor: "#fafafa", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" }}>
        {products.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 80 }}>
            <Heart size={60} color="#e0e0e0" strokeWidth={1.5} />
            <Text style={{ fontSize: 15, color: TEXT_MUTED, marginTop: 14 }}>ยังไม่มีสินค้าที่ถูกใจ</Text>
            <Pressable onPress={() => nav.navigate("Main", { screen: "Products" } as never)} className="active:opacity-80" style={{ marginTop: 16, backgroundColor: BRAND_GREEN, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 9 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>เลือกซื้อสินค้า</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 130 }}>
            <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 12 }}>{products.length} รายการ</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {products.map((p) => (
                <WishCard
                  key={p.id}
                  product={p}
                  onRemove={() => remove(p.id)}
                  onAdd={() => nav.navigate("Cart")}
                  onOpen={() => nav.navigate("ProductDetail", { product: p })}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
