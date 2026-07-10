import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { showToast } from "../components/Toast";
import { BRAND_GREEN } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";
import { useShopOrder } from "../data/shopOrderView";
import { METAHERB_SHOP } from "../data/shopOrders";
import { shipOrder } from "../store/orders";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LABEL = "#6b7280";

/**
 * ยืนยันการจัดส่ง — slide-up modal in the AddCard style, porting the web's
 * ship-confirm modal: order summary box + required tracking-number input.
 * Confirm writes the tracking number to the shared order, which flips it to
 * "กำลังจัดส่ง" and notifies the buyer.
 */
export function ConfirmShipScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, "ConfirmShip">>();
  const { orderId, onConfirm } = route.params;
  const order = useShopOrder(METAHERB_SHOP, orderId);

  const [tracking, setTracking] = useState("");
  const canSubmit = tracking.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    nav.goBack();
    shipOrder(orderId, tracking.trim());
    onConfirm?.(tracking.trim());
    showToast("อัปเดตสถานะการจัดส่งเรียบร้อย — ลูกค้าจะติดตามพัสดุได้");
  };

  const SUMMARY: { label: string; value: string }[] = order
    ? [
        { label: "คำสั่งซื้อ", value: order.id },
        { label: "ผู้รับ", value: `${order.customer} · ${order.phone}` },
        { label: "วิธีจัดส่ง", value: order.shippingMethod },
        { label: "ที่อยู่", value: order.address },
      ]
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header — same style as AddCard (circular close / centered title / spacer) */}
      <View
        className="flex-row items-center justify-between"
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}
      >
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>ยืนยันการจัดส่ง</Text>
        {/* Spacer — balances the close button so the title stays centered. */}
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 18 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Order summary box — stacked label-over-value pairs, exactly like the
            web ship-confirm modal's gray recap card */}
        <View style={{ backgroundColor: "#f5f5f5", borderRadius: 20, padding: 16, gap: 14 }}>
          {SUMMARY.map((row) => (
            <View key={row.label}>
              <Text style={{ fontSize: 12, color: LABEL }}>{row.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a", marginTop: 3, lineHeight: 20 }}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Tracking number */}
        <View style={{ gap: 8 }}>
          <View className="flex-row items-center" style={{ gap: 3 }}>
            <Text style={{ fontSize: 14, color: LABEL }}>หมายเลขพัสดุ</Text>
            <Text style={{ fontSize: 14, color: "#ff3b30" }}>*</Text>
          </View>
          <TextInput
            value={tracking}
            onChangeText={setTracking}
            placeholder="เช่น TH1234567890"
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
            autoFocus
            style={{
              height: 50,
              backgroundColor: "#f5f5f5",
              borderRadius: 999,
              paddingHorizontal: 18,
              fontSize: 15,
              color: "#374151",
            }}
          />
        </View>

        <Text style={{ fontSize: 13, color: LABEL, lineHeight: 21 }}>
          ลูกค้าจะได้รับแจ้งเตือนเพื่อติดตามพัสดุ และสถานะออเดอร์จะเปลี่ยนเป็น "กำลังจัดส่ง"
        </Text>
      </ScrollView>

      {/* Bottom CTA — AddCard pattern; green forward action */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={canSubmit ? submit : undefined}
          disabled={!canSubmit}
          className="active:opacity-80 items-center justify-center"
          style={{ height: 52, borderRadius: 999, backgroundColor: canSubmit ? BRAND_GREEN : "#d1d5db" }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>ยืนยันการจัดส่ง</Text>
        </Pressable>
      </View>
    </View>
  );
}
