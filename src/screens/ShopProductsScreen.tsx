/**
 * จัดการสินค้า — owner product management as its OWN pushed subpage (mirrors
 * ShopComplaints), so it slides in with the standard white SubPageHeader chrome
 * instead of swapping in-place inside MyShopScreen. Reuses ProductsManageSection
 * + PMAddMenuFab from MyShopScreen; the FAB morphs into an add menu
 * (ผลิตภัณฑ์ / วัตถุดิบ). Search lives behind the app-bar button →
 * ShopProductManageSearch page (same pattern as the other list pages).
 */
import { useState } from "react";
import { View, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { BottomFade } from "../components/BottomFade";
import { ProductsManageSection, PMAddMenuFab } from "./MyShopScreen";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ShopProductsScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<"regular" | "material">("regular");

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="จัดการสินค้า"
        onBack={() => nav.goBack()}
        showSearch={false}
        rightSlot={
          <GlassIconButton onPress={() => nav.navigate("ShopProductManageSearch")} accessibilityLabel="ค้นหาสินค้า">
            <Search size={20} color="#1a1a1a" />
          </GlassIconButton>
        }
      />
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        >
          <ProductsManageSection type={type} setType={setType} showSearch={false} />
        </ScrollView>
        {/* Scroll fades — content dissolves into the header / bottom edge */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
        <BottomFade />
      </View>
      <PMAddMenuFab bottom={18} onAdd={(mode) => nav.navigate("AddProduct", { mode })} />
    </View>
  );
}
