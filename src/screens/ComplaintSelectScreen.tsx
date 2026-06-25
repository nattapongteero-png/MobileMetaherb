import type { ReactNode } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  PackageX,
  RefreshCw,
  Undo2,
  Wallet,
  ChevronRight,
  Package,
  type LucideIcon,
} from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { useOrders } from "../context/OrderContext";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SelectRoute = RouteProp<RootStackParamList, "ComplaintSelect">;
type ComplaintType = "damaged" | "wrong_item" | "return" | "refund";

// Problem types — labels/colors mirror the web ComplaintSelect flow.
const PROBLEM_TYPES: { id: ComplaintType; title: string; desc: string; color: string; Icon: LucideIcon }[] = [
  { id: "damaged", title: "สินค้าชำรุด/เสียหาย", desc: "สินค้าที่ได้รับชำรุด แตกหัก หรือเสียหายจากการขนส่ง", color: "#ef4444", Icon: PackageX },
  { id: "wrong_item", title: "ได้รับสินค้าผิด", desc: "ได้รับสินค้าไม่ตรงกับที่สั่งซื้อ", color: "#f59e0b", Icon: RefreshCw },
  { id: "return", title: "ขอคืนสินค้า", desc: "ส่งคืนสินค้าและรับเป็นเครดิตหรือสินค้าใหม่", color: "#9333ea", Icon: Undo2 },
  { id: "refund", title: "ขอเงินคืน", desc: "ต้องการขอเงินคืนโดยไม่ส่งคืนสินค้า", color: "#0ea5e9", Icon: Wallet },
];

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="bg-white" style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      {title ? <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a", marginBottom: 12 }}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function ComplaintSelectScreen() {
  const nav = useNavigation<Nav>();
  const params = useRoute<SelectRoute>().params;
  const orderId = params?.orderId ?? "ORD-20260218-03571";
  const { getOrder } = useOrders();
  const order = getOrder(orderId);
  const shopName = order?.shopName ?? params?.shopName ?? "METAHERB Store";
  const itemCount = order?.items.reduce((s, it) => s + it.quantity, 0);

  const select = (type: ComplaintType) => nav.navigate("ComplaintForm", { orderId, type });

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader
        title="แจ้งปัญหาคำสั่งซื้อ"
        subtitle={orderId}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Order summary */}
          <Section>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                <Package size={18} color="#fff" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>{shopName}</Text>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>
                  {orderId}{itemCount ? ` · ${itemCount} ชิ้น` : ""}
                </Text>
              </View>
            </View>
          </Section>

          {/* Problem types */}
          <Section title="เลือกปัญหาที่คุณพบ">
            <View style={{ gap: 10 }}>
              {PROBLEM_TYPES.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => select(t.id)}
                  className="active:opacity-80 flex-row items-center"
                  style={{ backgroundColor: "#f9fafb", borderRadius: 14, padding: 12, gap: 12 }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: t.color + "1a", alignItems: "center", justifyContent: "center" }}>
                    <t.Icon size={24} color={t.color} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#0a0a0a" }}>{t.title}</Text>
                    <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginTop: 2, lineHeight: 17 }}>{t.desc}</Text>
                  </View>
                  <ChevronRight size={18} color={TEXT_MUTED} />
                </Pressable>
              ))}
            </View>
          </Section>
        </ScrollView>

        {/* Top fade — cards dissolve into the header as they scroll up */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
      </View>
    </View>
  );
}
