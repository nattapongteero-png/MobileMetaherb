import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { X, Check } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { showToast } from "../components/Toast";
import { BRAND_GREEN } from "../theme/tokens";
import { modalTopPad } from "../theme/layout";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LABEL = "#6b7280";

// Web's CANCEL_REASONS — same labels, same order.
const CANCEL_REASONS = [
  "สินค้าหมดสต็อก",
  "ลูกค้าให้ที่อยู่ผิด",
  "ลูกค้าไม่ตอบกลับ",
  "ปัญหาในการชำระเงิน",
  "ลูกค้าเปลี่ยนใจ",
  "อื่นๆ (ระบุในหมายเหตุ)",
];

/**
 * ยกเลิกคำสั่งซื้อ (ฝั่งร้านค้า) — slide-up modal form in the AddCard style
 * (glass close-X / centered title / gray-fill fields / full-width bottom CTA).
 * Content ports the web CancelOrderModal: reason radios + note (required for
 * "อื่นๆ"), red confirm disabled until valid.
 */
export function CancelOrderScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, "CancelOrder">>();
  const { orderId, onConfirm } = route.params;

  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const needsNote = reason === "อื่นๆ (ระบุในหมายเหตุ)";
  const canSubmit = !!reason && (!needsNote || note.trim().length > 0);

  const submit = () => {
    if (!reason) return;
    nav.goBack();
    onConfirm?.(reason, note.trim());
    showToast(`ยกเลิกคำสั่งซื้อแล้ว — เหตุผล: ${reason}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header — same style as AddCard (circular close / centered title / spacer) */}
      <View
        className="flex-row items-center justify-between"
        // Android: clear the status bar (iOS modal card already starts below it)
        style={{ paddingHorizontal: 16, paddingTop: 16 + modalTopPad(insets.top), paddingBottom: 12 }}
      >
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>ยกเลิกคำสั่งซื้อ</Text>
        {/* Spacer — balances the close button so the title stays centered. */}
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 18 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 13, color: LABEL }}>
          คำสั่งซื้อ <Text style={{ fontWeight: "700", color: "#0a0a0a" }}>{orderId}</Text>
        </Text>

        {/* Reason radios — web CancelOrderModal list */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, color: LABEL, marginBottom: 2 }}>เหตุผลในการยกเลิก</Text>
          {CANCEL_REASONS.map((r) => {
            const active = reason === r;
            return (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                className="flex-row items-center active:opacity-80"
                style={{
                  paddingHorizontal: 18,
                  height: 50,
                  borderRadius: 999,
                  borderWidth: 1,
                  gap: 10,
                  backgroundColor: active ? "rgba(49,151,84,0.1)" : "#f5f5f5",
                  borderColor: active ? BRAND_GREEN : "transparent",
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? BRAND_GREEN : "transparent",
                    borderWidth: active ? 0 : 1.5,
                    borderColor: "#d1d5db",
                  }}
                >
                  {active ? <Check size={11} color="#fff" strokeWidth={3.5} /> : null}
                </View>
                <Text style={{ fontSize: 15, fontWeight: active ? "600" : "400", color: active ? BRAND_GREEN : "#374151" }}>{r}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Note */}
        <View style={{ gap: 8 }}>
          <View className="flex-row items-center" style={{ gap: 3 }}>
            <Text style={{ fontSize: 14, color: LABEL }}>หมายเหตุเพิ่มเติม</Text>
            {needsNote ? <Text style={{ fontSize: 14, color: "#ff3b30" }}>*</Text> : null}
          </View>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            placeholder={needsNote ? "กรุณาระบุเหตุผล..." : "ระบุรายละเอียดเพิ่มเติม (ไม่บังคับ)"}
            placeholderTextColor="#9ca3af"
            style={{
              backgroundColor: "#f5f5f5",
              borderRadius: 24,
              paddingHorizontal: 18,
              paddingVertical: 14,
              fontSize: 15,
              color: "#374151",
              minHeight: 100,
              textAlignVertical: "top",
            }}
          />
        </View>

        <Text style={{ fontSize: 13, color: LABEL, lineHeight: 21 }}>
          เมื่อยืนยัน ลูกค้าจะได้รับแจ้งเตือนการยกเลิกพร้อมเหตุผล
          และคำสั่งซื้อจะเปลี่ยนสถานะเป็น "ยกเลิก" ทันที
        </Text>
      </ScrollView>

      {/* Bottom CTA — AddCard pattern; red for the destructive confirm */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={canSubmit ? submit : undefined}
          disabled={!canSubmit}
          className="active:opacity-80 items-center justify-center"
          style={{ height: 52, borderRadius: 999, backgroundColor: canSubmit ? "#ff3b30" : "#d1d5db" }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>ยืนยันการยกเลิก</Text>
        </Pressable>
      </View>
    </View>
  );
}
