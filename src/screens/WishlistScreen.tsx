import { View, Text, Pressable, ScrollView, Dimensions, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Heart } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { ProductCard } from "../components/ProductCard";
import { useWishlist } from "../context/WishlistContext";
import { ALL_PRODUCTS } from "../data/catalog";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH =
  Platform.OS === "web" ? Math.min(Dimensions.get("window").width, 430) : Dimensions.get("window").width;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 12) / 2);

export function WishlistScreen() {
  const nav = useNavigation<Nav>();
  const { ids } = useWishlist();

  const products = ALL_PRODUCTS.filter((p) => ids.has(p.id));

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader title="สินค้าที่ชอบ" subtitle={`${products.length} รายการ`} onBack={() => nav.canGoBack() && nav.goBack()} onCart={() => nav.navigate("Cart")} showSearch={false} />

      {products.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 }}>
          <Heart size={60} color="#e0e0e0" strokeWidth={1.5} />
          <Text style={{ fontSize: 15, color: TEXT_MUTED, marginTop: 14 }}>ยังไม่มีสินค้าที่ถูกใจ</Text>
          <Pressable onPress={() => nav.navigate("Products")} className="active:opacity-80" style={{ marginTop: 16, backgroundColor: BRAND_GREEN, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 9 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>เลือกซื้อสินค้า</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} width={CARD_WIDTH} />
              ))}
            </View>
          </ScrollView>

          <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
          <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 24 }} />
        </View>
      )}
    </View>
  );
}
