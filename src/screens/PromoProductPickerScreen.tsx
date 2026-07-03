import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Boxes, Check, Search, X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { PROMO_PRODUCTS } from "../data/promotions";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * เลือกสินค้าเข้าร่วมโปรโมชั่น — slide-up modal in the AddCard style (same
 * shell as the cancel/ship/decide modals): search pill + multi-select rows
 * with check circles, full-width bottom CTA showing the picked count.
 */
export function PromoProductPickerScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { excludeIds, onDone } = useRoute<RouteProp<RootStackParamList, "PromoProductPicker">>().params;

  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const q = query.trim().toLowerCase();
  const available = useMemo(
    () => PROMO_PRODUCTS.filter((p) => !excludeIds.includes(p.id) && (q ? p.name.toLowerCase().includes(q) : true)),
    [excludeIds, q],
  );

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    if (!picked.length) return;
    nav.goBack();
    onDone?.(picked);
  };

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
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>เลือกสินค้าเข้าร่วม</Text>
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
            placeholder="ค้นหาสินค้า..."
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

      {/* Product list — multi-select rows with check circles */}
      <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {available.length === 0 ? (
          <Text style={{ textAlign: "center", paddingVertical: 32, fontSize: 13, color: "#8e8e93" }}>ไม่พบสินค้า</Text>
        ) : (
          available.map((p) => {
            const sel = picked.includes(p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => toggle(p.id)}
                className="flex-row items-center active:opacity-80"
                style={{
                  gap: 10,
                  padding: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: sel ? BRAND_GREEN : "transparent",
                  backgroundColor: sel ? "rgba(49,151,84,0.08)" : "#f7f7f7",
                }}
              >
                <Image source={p.image} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#f3f4f6" }} resizeMode="cover" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }}>{p.name}</Text>
                  <View className="flex-row items-center" style={{ gap: 8, marginTop: 3 }}>
                    <Text style={{ fontSize: 12, fontWeight: "500", color: BRAND_GREEN }}>{p.price}</Text>
                    <View className="flex-row items-center" style={{ gap: 3 }}>
                      <Boxes size={11} color="#9ca3af" strokeWidth={2.2} />
                      <Text style={{ fontSize: 10.5, color: TEXT_MUTED }}>{p.stock}</Text>
                    </View>
                  </View>
                </View>
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

      {/* Bottom CTA — AddCard pattern */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={picked.length ? submit : undefined}
          disabled={!picked.length}
          className="active:opacity-80 items-center justify-center"
          style={{ height: 52, borderRadius: 999, backgroundColor: picked.length ? BRAND_GREEN : "#d1d5db" }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
            {picked.length ? `เพิ่มสินค้า (${picked.length})` : "เลือกสินค้า"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
