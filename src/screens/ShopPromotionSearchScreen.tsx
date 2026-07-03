import { useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Megaphone, Search, X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { EmptyState } from "../components/EmptyState";
import { BottomFade } from "../components/BottomFade";
import type { RootStackParamList } from "../navigation/RootStack";
import { PromoCard } from "./PromotionsView";
import { useAllPromotions } from "../data/promotions";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Promotion search — pushed from โปรโมชั่น's app-bar search button. Same match
// rule as the inline box: promotion name or description; same action sheet.
export function ShopPromotionSearchScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const promotions = useAllPromotions();
  const [query, setQuery] = useState("");

  // 2-col grid: floor to avoid flex-wrap breakage (per project convention).
  const cardWidth = useMemo(() => Math.floor((Dimensions.get("window").width - 32 - 12) / 2), []);

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      q
        ? promotions.filter(
            (p) => p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q) ?? false),
          )
        : promotions,
    [promotions, q],
  );

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={["top"]}>
        {/* App bar — back button + search pill */}
        <View className="flex-row items-center" style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}>
          <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
          </GlassIconButton>
          <View
            className="flex-row items-center rounded-full px-4"
            style={{
              flex: 1,
              height: 46,
              backgroundColor: "#ffffff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Search size={18} color="#319754" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ค้นหาชื่อโปรโมชั่น..."
              placeholderTextColor="#a3a3a3"
              returnKeyType="search"
              autoFocus
              style={{ flex: 1, marginLeft: 10, fontSize: 13.5, color: "#374151" }}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8} className="active:opacity-60">
                <X size={16} color="#a3a3a3" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 24 }}
      >
        <Text style={{ paddingHorizontal: 16, marginBottom: 10, fontSize: 12, color: "#737373" }}>
          {q ? `พบ ${results.length} โปรโมชั่น` : `โปรโมชั่นทั้งหมด ${promotions.length} รายการ`}
        </Text>

        {results.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={36} color="#d4d4d4" />}
            title="ไม่พบโปรโมชั่น"
            subtitle="ลองค้นด้วยชื่อหรือรายละเอียดโปรโมชั่น"
          />
        ) : (
          <View className="flex-row flex-wrap" style={{ paddingHorizontal: 16, gap: 12 }}>
            {results.map((p) => (
              <PromoCard key={p.id} p={p} width={cardWidth} onPress={() => nav.navigate("ShopPromotionDetail", { promotionId: p.id })} />
            ))}
          </View>
        )}
      </ScrollView>
      {/* Scroll fades — content dissolves into the app bar / bottom edge */}
      <LinearGradient
        pointerEvents="none"
        colors={["#fafafa", "rgba(250,250,250,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
      />
      <BottomFade />
      </View>

    </View>
  );
}

