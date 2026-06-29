import { View, Text } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { Download } from "lucide-react-native";
import { ChevronLeft } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { DocDetailView } from "./MyShopScreen";
import type { RootStackParamList } from "../navigation/RootStack";
import { BRAND_GREEN } from "../theme/tokens";

// Full PR / PO / Quotation detail — its own page (pushed from the doc card).
export function ShopDocDetailScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { doc, kind } = useRoute<RouteProp<RootStackParamList, "ShopDocDetail">>().params;

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      {/* Header — light green → white gradient, big doc-id title + status dot */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#fafafa", zIndex: 10 }}>
        <LinearGradient
          colors={["#d9f0e1", "#eaf6ee", "#fafafa"]}
          locations={[0, 0.55, 1]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 14 }}>
          {/* Top row: back + download */}
          <View className="flex-row items-center justify-between">
            <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel="ย้อนกลับ">
              <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
            </GlassIconButton>
            <GlassIconButton onPress={() => {}} accessibilityLabel="โหลดเอกสาร">
              <Download size={20} color={BRAND_GREEN} strokeWidth={2.2} />
            </GlassIconButton>
          </View>

          {/* Title + status-dot date */}
          <View style={{ paddingHorizontal: 4, marginTop: 10 }}>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#0a0a0a", letterSpacing: 0.2 }} numberOfLines={1}>
              {doc.id}
            </Text>
            <View className="flex-row items-center" style={{ gap: 6, marginTop: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: BRAND_GREEN }} />
              <Text style={{ fontSize: 12.5, color: "#8a8f8a" }}>{doc.date}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <DocDetailView doc={doc} kind={kind} insetsBottom={insets.bottom} />
    </View>
  );
}
