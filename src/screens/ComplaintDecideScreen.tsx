import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ban, Check, PackageCheck, RotateCcw, X, type LucideIcon } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { showToast } from "../components/Toast";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { modalTopPad } from "../theme/layout";
import { STATUS_COLOR, type ComplaintStatus } from "../data/shopComplaints";
import { useComplaints } from "../context/ComplaintContext";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LABEL = "#6b7280";

const DECISIONS: Array<{ key: ComplaintStatus; label: string; Icon: LucideIcon }> = [
  { key: "acknowledged", label: "ยืนยันรับแจ้งปัญหา", Icon: Check },
  { key: "refund_full", label: "คืนเงินเต็มจำนวน", Icon: RotateCcw },
  { key: "refund_partial", label: "คืนเงินบางส่วน", Icon: PackageCheck },
  { key: "rejected", label: "ปฏิเสธ", Icon: Ban },
];

/**
 * ตัดสินคำร้องเรียน — slide-up modal form in the AddCard style (same shell as
 * the cancel-order modal): verdict options + partial-refund amount + note to
 * the customer, full-width bottom CTA.
 */
export function ComplaintDecideScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { complaintId } = useRoute<RouteProp<RootStackParamList, "ComplaintDecide">>().params;
  const { complaints, setDecision, setNote } = useComplaints();
  const c = complaints.find((x) => x.id === complaintId);

  const [decision, setDecisionState] = useState<ComplaintStatus | null>(null);
  const [partial, setPartial] = useState(String(c?.refundAmount ?? c?.amount ?? 0));
  const [note, setNoteState] = useState(c?.note ?? "");

  if (!c) return null;

  const canSubmit = !!decision;
  const submit = () => {
    if (!decision) return;
    const refundAmount =
      decision === "refund_partial"
        ? Math.min(c.amount, parseInt(partial || "0", 10) || 0)
        : decision === "refund_full"
        ? c.amount
        : undefined;
    setDecision(c.id, decision, { refundAmount });
    setNote(c.id, note);
    nav.goBack();
    showToast("บันทึกการตัดสินเรียบร้อย");
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
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>ตัดสินคำร้องเรียน</Text>
        {/* Spacer — balances the close button so the title stays centered. */}
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 18 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 13, color: LABEL }}>
          คำร้องเรียน <Text style={{ fontWeight: "700", color: "#0a0a0a" }}>{c.id}</Text>
        </Text>

        {/* Verdict options — pill rows, tinted by each status colour */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, color: LABEL, marginBottom: 2 }}>การตัดสิน</Text>
          {DECISIONS.map((o) => {
            const active = decision === o.key;
            const color = STATUS_COLOR[o.key];
            return (
              <Pressable
                key={o.key}
                onPress={() => setDecisionState(o.key)}
                className="flex-row items-center active:opacity-80"
                style={{
                  paddingHorizontal: 18,
                  height: 50,
                  borderRadius: 999,
                  borderWidth: 1,
                  gap: 10,
                  backgroundColor: active ? color + "1a" : "#f5f5f5",
                  borderColor: active ? color : "transparent",
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? color : "transparent",
                    borderWidth: active ? 0 : 1.5,
                    borderColor: "#d1d5db",
                  }}
                >
                  {active ? <Check size={11} color="#fff" strokeWidth={3.5} /> : null}
                </View>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: active ? "600" : "400", color: active ? color : "#374151" }}>{o.label}</Text>
                <o.Icon size={16} color={active ? color : "#9ca3af"} strokeWidth={2.2} />
              </Pressable>
            );
          })}
          {decision === "refund_partial" ? (
            <View className="flex-row items-center" style={{ gap: 8, backgroundColor: "#f5f5f5", borderRadius: 999, paddingHorizontal: 18, height: 50 }}>
              <Text style={{ fontSize: 15, color: "#737373" }}>฿</Text>
              <TextInput
                value={partial}
                onChangeText={(t) => setPartial(t.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                style={{ flex: 1, fontSize: 15, color: "#374151" }}
              />
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>ไม่เกิน ฿{c.amount.toLocaleString()}</Text>
            </View>
          ) : null}
        </View>

        {/* Note to the customer */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, color: LABEL }}>หมายเหตุถึงลูกค้า</Text>
          <TextInput
            value={note}
            onChangeText={setNoteState}
            multiline
            numberOfLines={3}
            placeholder="เขียนข้อความถึงลูกค้า..."
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
          เมื่อยืนยัน ลูกค้าจะได้รับแจ้งผลการตัดสินพร้อมหมายเหตุ
          และสถานะคำร้องเรียนจะอัปเดตทันที
        </Text>
      </ScrollView>

      {/* Bottom CTA — AddCard pattern */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={canSubmit ? submit : undefined}
          disabled={!canSubmit}
          className="active:opacity-80 items-center justify-center"
          style={{ height: 52, borderRadius: 999, backgroundColor: canSubmit ? BRAND_GREEN : "#d1d5db" }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>บันทึกการตัดสิน</Text>
        </Pressable>
      </View>
    </View>
  );
}
