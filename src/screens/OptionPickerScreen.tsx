import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Check, Search, X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { BRAND_GREEN } from "../theme/tokens";
import { modalTopPad } from "../theme/layout";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * ตัวเลือกแบบ single-select — slide-up modal in the AddCard style (same shell
 * as the PromoProductPicker): glass X + centered title, search pill, check-circle
 * rows with white scroll fades. Tapping a row picks it and dismisses immediately
 * (no confirm step). Generic — the caller passes title/options/value and
 * receives the pick via onSelect.
 */
export function OptionPickerScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { title, options, value, searchPlaceholder, onSelect } =
    useRoute<RouteProp<RootStackParamList, "OptionPicker">>().params;

  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (q ? options.filter((o) => o.toLowerCase().includes(q)) : options), [options, q]);

  // Tap = pick & dismiss — no confirm step.
  const pick = (opt: string) => {
    nav.goBack();
    onSelect?.(opt);
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
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>{title}</Text>
        {/* Spacer — balances the close button so the title stays centered. */}
        <View style={{ width: 44 }} />
      </View>

      {/* Search — gray pill field (AddCard input look) */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View className="flex-row items-center" style={{ backgroundColor: "#f5f5f5", borderRadius: 999, paddingHorizontal: 18, height: 46, gap: 8 }}>
          <Search size={16} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder ?? "ค้นหา..."}
            placeholderTextColor="#9ca3af"
            style={{ flex: 1, fontSize: 14, color: "#374151", paddingVertical: 0 }}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8} className="active:opacity-60">
              <X size={15} color="#a3a3a3" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Option list — single-select rows with check circles */}
      <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {visible.length === 0 ? (
          <Text style={{ textAlign: "center", paddingVertical: 32, fontSize: 13, color: "#8e8e93" }}>ไม่พบตัวเลือก</Text>
        ) : (
          visible.map((opt) => {
            const sel = value === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => pick(opt)}
                className="flex-row items-center active:opacity-80"
                style={{
                  gap: 10,
                  paddingHorizontal: 16,
                  minHeight: 52,
                  paddingVertical: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: sel ? BRAND_GREEN : "transparent",
                  backgroundColor: sel ? "rgba(49,151,84,0.08)" : "#f7f7f7",
                }}
              >
                <Text style={{ flex: 1, fontSize: 14, fontWeight: sel ? "600" : "500", color: "#0a0a0a" }}>{opt}</Text>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: sel ? BRAND_GREEN : "transparent",
                    borderWidth: sel ? 0 : 1.5,
                    borderColor: "#d1d5db",
                  }}
                >
                  {sel ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
      {/* Scroll fades — rows dissolve into the search bar / bottom CTA (white bg) */}
      <LinearGradient
        pointerEvents="none"
        colors={["#ffffff", "rgba(255,255,255,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0)", "#ffffff"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 28 }}
      />
      </View>
    </View>
  );
}
