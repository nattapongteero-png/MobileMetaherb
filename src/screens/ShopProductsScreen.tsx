/**
 * จัดการสินค้า — owner product management as its OWN pushed subpage (mirrors
 * ShopComplaints), so it slides in with the standard white SubPageHeader chrome
 * instead of swapping in-place inside MyShopScreen. Reuses ProductsManageSection
 * + PMAddFab from MyShopScreen; keeps the regular/material tab state here so the
 * add-FAB targets the right product type.
 */
import { useState } from "react";
import { View, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SubPageHeader } from "../components/SubPageHeader";
import { ProductsManageSection, PMAddFab } from "./MyShopScreen";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ShopProductsScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<"regular" | "material">("regular");

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="จัดการสินค้า" onBack={() => nav.goBack()} showSearch={false} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
      >
        <ProductsManageSection type={type} setType={setType} />
      </ScrollView>
      <PMAddFab bottom={insets.bottom + 20} onPress={() => nav.navigate("AddProduct", { mode: type })} />
    </View>
  );
}
