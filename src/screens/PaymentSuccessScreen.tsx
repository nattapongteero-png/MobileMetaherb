import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Check } from "lucide-react-native";
import { usePayment } from "../context/PaymentContext";
import { SHIPPING_METHODS } from "../data/shippingMethods";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function DetailRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ fontSize: 12, color: "#8a8f8a" }}>{label}</Text>
      <Text style={{ fontSize: 15, color: "#0a0a0a", fontWeight: "600" }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 13, color: "#737373" }}>{sub}</Text> : null}
    </View>
  );
}

export function PaymentSuccessScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { orderId, total, methodLabel, methodDesc } =
    useRoute<RouteProp<RootStackParamList, "PaymentSuccess">>().params;
  const { selectedShipping, addresses, selectedAddressId } = usePayment();

  const carrier = SHIPPING_METHODS.find((s) => s.id === selectedShipping) ?? SHIPPING_METHODS[0];
  const address = addresses.find((a) => a.id === selectedAddressId) ?? addresses[0];

  const goHome = () => nav.reset({ index: 0, routes: [{ name: "Main" }] });
  const goOrders = () => nav.reset({ index: 1, routes: [{ name: "Main" }, { name: "Orders" }] });

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* Success mark */}
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
              <Check size={46} color="#fff" strokeWidth={3} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#0a0a0a", marginTop: 16 }}>ชำระเงินสำเร็จ</Text>
            <Text style={{ fontSize: 14, color: "#737373", marginTop: 6, textAlign: "center", lineHeight: 20 }}>
              ขอบคุณที่สั่งซื้อกับ METAHERB{"\n"}เราจะจัดส่งสินค้าให้เร็วที่สุด
            </Text>
            <Text style={{ fontSize: 34, fontWeight: "800", color: BRAND_GREEN_DARK, marginTop: 14 }}>
              ฿{total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </Text>
          </View>

          {/* Order details */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#ececed", padding: 18, marginTop: 24, gap: 14 }}>
            <DetailRow label="หมายเลขคำสั่งซื้อ" value={orderId} />
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
            <DetailRow label="ช่องทางชำระเงิน" value={methodLabel} sub={methodDesc} />
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
            <DetailRow label="การจัดส่ง" value={carrier.name} sub={carrier.desc} />
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
            <DetailRow label="จัดส่งถึง" value={address.name} sub={`${address.detail}\n${address.area}`} />
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12, gap: 8 }}>
          <Pressable onPress={goOrders} className="active:opacity-80 items-center justify-center" style={{ height: 52, borderRadius: 999, backgroundColor: BRAND_GREEN }}>
            <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>ดูคำสั่งซื้อของฉัน</Text>
          </Pressable>
          <Pressable onPress={goHome} className="active:opacity-70 items-center justify-center" style={{ height: 48 }}>
            <Text style={{ fontSize: 15, color: "#319754", fontWeight: "600" }}>กลับหน้าแรก</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
