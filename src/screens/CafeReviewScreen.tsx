/**
 * META Caffe — write-a-review sheet (slide-up modal).
 * Rate service + taste with stars, add an optional comment, then "ส่งรีวิว".
 * Saves onto the history order via CafeCartContext.rateOrder.
 */
import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { StarRow } from "../components/StarRow";
import { useCafeCart } from "../context/CafeCartContext";
import { BRAND_GREEN, TEXT_PRIMARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function RatingBlock({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY }}>{label}</Text>
      <StarRow value={value} onChange={onChange} size={40} />
    </View>
  );
}

export function CafeReviewScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { orderHistory, rateOrder, fireCelebration } = useCafeCart();
  const orderId = useRoute<RouteProp<RootStackParamList, "CafeReview">>().params.orderId;
  const order = orderHistory.find((o) => o.orderId === orderId);

  const [service, setService] = useState(order?.ratingService ?? 0);
  const [taste, setTaste] = useState(order?.ratingTaste ?? 0);
  const [comment, setComment] = useState(order?.comment ?? "");

  const canSubmit = service > 0 && taste > 0;
  const submit = () => {
    if (!canSubmit) return;
    rateOrder(orderId, service, taste, comment.trim());
    // Close this sheet first, then let the root overlay rain stars over the
    // order detail that reappears behind it.
    if (nav.canGoBack()) nav.goBack();
    setTimeout(fireCelebration, 350);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>ให้คะแนนรีวิว</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {order ? (
          <Text style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center" }}>ออเดอร์ {order.orderId}</Text>
        ) : null}

        <RatingBlock label="การบริการ" value={service} onChange={setService} />
        <RatingBlock label="รสชาติ" value={taste} onChange={setTaste} />

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY }}>ความคิดเห็นเพิ่มเติม</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="บอกเราหน่อยว่าประทับใจอะไร หรืออยากให้ปรับปรุงตรงไหน"
            placeholderTextColor="#9ca3af"
            multiline
            style={{ minHeight: 110, backgroundColor: "#f5f5f5", borderRadius: 14, padding: 14, fontSize: 15, color: "#374151", textAlignVertical: "top" }}
          />
        </View>
      </ScrollView>

      {/* Submit */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          className="active:opacity-80 items-center justify-center"
          style={{ height: 52, borderRadius: 999, backgroundColor: canSubmit ? BRAND_GREEN : "#cbd5cb" }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>ส่งรีวิว</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
