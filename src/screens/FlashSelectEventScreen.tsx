/**
 * FlashSelectEvent — pushed from a not-joined product's ⋯ "เพิ่มเข้า Flash Sale".
 * Two destinations, mirroring the summary carousel's two card types:
 *  - Flash Sale ร้านค้า (green) — the shop's OWN round, dates chosen freely.
 *  - the app's rounds (red FlashEventCards) — dates locked to the round.
 * Picking one continues into FlashAddProduct (nav.replace so "back" from the
 * add page returns to the Flash Sale list).
 */
import { View, Text, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Zap, ChevronRight } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BottomFade } from "../components/BottomFade";
import { FLASH_EVENTS, FlashEventCard } from "./MyShopScreen";
import type { RootStackParamList } from "../navigation/RootStack";
import { BRAND_GREEN, TEXT_MUTED, TEXT_SECONDARY, DIVIDER_GRAY } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function FlashSelectEventScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "FlashSelectEvent">>();

  const rounds = FLASH_EVENTS.filter((ev) => ev.status !== "ended");

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="เลือกรอบ Flash Sale" onBack={() => nav.goBack()} showSearch={false} />
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 32 }}
        >
          <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginBottom: 2 }}>
            เลือกรอบที่ต้องการเพิ่มสินค้าเข้าร่วม
          </Text>

          {/* Shop's OWN flash — green, dates editable in the next step */}
          <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MUTED }}>จัดโดยร้านค้า</Text>
          <Pressable
            onPress={() =>
              nav.replace("FlashAddProduct", {
                preselect: params?.preselect,
                onDone: (np) => params?.onPicked?.(np, undefined, true),
              })
            }
            className="flex-row items-center active:opacity-80"
            style={{ backgroundColor: "white", borderRadius: 20, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 14, gap: 12 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(49,151,84,0.12)", alignItems: "center", justifyContent: "center" }}>
              <Zap size={20} color={BRAND_GREEN} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#1a1a1a" }}>Flash Sale ร้านค้า</Text>
              <Text style={{ fontSize: 12, color: TEXT_SECONDARY }}>ร้านจัดรอบเอง · กำหนดวันเวลาได้เอง</Text>
            </View>
            <ChevronRight size={18} color={TEXT_MUTED} strokeWidth={2.2} />
          </Pressable>

          {/* The app's rounds — dates come locked from the round */}
          <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MUTED, marginTop: 6 }}>จัดโดย METAHERB</Text>
          {rounds.map((ev) => (
            <FlashEventCard
              key={ev.id}
              ev={ev}
              width="100%"
              onPress={() =>
                nav.replace("FlashAddProduct", {
                  eventDate: ev.dateRange,
                  preselect: params?.preselect,
                  onDone: (np) => params?.onPicked?.(np, ev.id, ev.status === "active"),
                })
              }
            />
          ))}
        </ScrollView>
        <BottomFade />
      </View>
    </View>
  );
}
