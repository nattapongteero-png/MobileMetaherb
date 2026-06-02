import type { ReactNode } from "react";
import { View, Text, Image, Pressable, Dimensions } from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  User,
  Wallet,
  ClipboardCheck,
  Package,
  Truck,
  MapPin,
  Heart,
  Ticket,
  ChevronRight,
  LogOut,
  Store,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react-native";
import { BRAND_GREEN, TEXT_SECONDARY } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// The profile collapses to 0 on scroll, but the green safe-area strip stays
// (status bar keeps its green backing); the FIXED white sheet pins right below
// it and grows up to fill the rest — only the cards inside it scroll.
const PROFILE_BLOCK = 178;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const LEAF_B = require("../../assets/herb-leaf-b.png");
const LEAF_C = require("../../assets/herb-leaf-c.png");
const LEAF_D = require("../../assets/herb-leaf-d.png");

const ORDER_STATUS: { label: string; Icon: LucideIcon; count: number; tint: string; bg: string }[] = [
  { label: "รอชำระเงิน", Icon: Wallet, count: 2, tint: "#f97316", bg: "rgba(249,115,22,0.12)" },
  { label: "รอตรวจสอบ", Icon: ClipboardCheck, count: 1, tint: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
  { label: "รอจัดส่ง", Icon: Package, count: 12, tint: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  { label: "จัดส่งแล้ว", Icon: Truck, count: 1, tint: BRAND_GREEN, bg: "rgba(49,151,84,0.12)" },
];

const MENU: { label: string; Icon: LucideIcon }[] = [
  { label: "บัญชีของฉัน", Icon: User },
  { label: "ที่อยู่จัดส่ง", Icon: MapPin },
  { label: "สินค้าที่ชอบ", Icon: Heart },
  { label: "คูปองของฉัน", Icon: Ticket },
];

const VIEW_SWITCH: { label: string; Icon: LucideIcon }[] = [
  { label: "ร้านค้าของฉัน", Icon: Store },
  { label: "ตั้งค่าบนเว็บไซต์", Icon: ShieldCheck },
];

function Card({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View
      style={[
        { backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function MenuList({ items }: { items: { label: string; Icon: LucideIcon }[] }) {
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {items.map((m, i) => (
        <View key={m.label}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0", marginLeft: 52 }} /> : null}
          <Pressable className="flex-row items-center active:opacity-60" style={{ height: 54, paddingHorizontal: 16, gap: 12 }}>
            <m.Icon size={20} color={BRAND_GREEN} strokeWidth={2} />
            <Text style={{ flex: 1, fontSize: 15, color: "#0a0a0a" }}>{m.label}</Text>
            <ChevronRight size={18} color="#c4c4c6" strokeWidth={2.2} />
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

export function AccountScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const COLLAPSE = PROFILE_BLOCK; // scroll distance to fully hide the profile

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Profile shrinks to 0 + fades; the safe-area strip above it never collapses.
  const profileStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, COLLAPSE], [PROFILE_BLOCK, 0], Extrapolation.CLAMP),
    opacity: interpolate(scrollY.value, [0, COLLAPSE * 0.7], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND_GREEN }}>
      <StatusBar style="light" />

      {/* Green header — safe-area strip stays, profile collapses to nothing */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: BRAND_GREEN }}>
        {/* Leaf watermark, clipped to the header */}
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
          <Image source={LEAF_D} style={{ position: "absolute", top: 2, right: 8, width: 96, height: 96, opacity: 0.4, transform: [{ rotate: "28deg" }] }} resizeMode="contain" />
          <Image source={LEAF_B} style={{ position: "absolute", top: 36, left: 18, width: 44, height: 44, opacity: 0.32, transform: [{ rotate: "-22deg" }] }} resizeMode="contain" />
          <Image source={LEAF_C} style={{ position: "absolute", top: 78, left: "42%", width: 52, height: 52, opacity: 0.22, transform: [{ rotate: "60deg" }] }} resizeMode="contain" />
        </View>

        <Reanimated.View style={[{ overflow: "hidden" }, profileStyle]}>
          <View style={{ alignItems: "center", paddingTop: 4, paddingHorizontal: 16 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#ffffff",
                borderWidth: 3,
                borderColor: "rgba(255,255,255,0.5)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={36} color={BRAND_GREEN} strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 19, fontWeight: "700", color: "#ffffff", marginTop: 8 }} numberOfLines={1}>
              user01
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 }} numberOfLines={1}>
              user@test.com
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginTop: 8,
                backgroundColor: "rgba(255,255,255,0.2)",
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 999,
              }}
            >
              <User size={12} color="#ffffff" strokeWidth={2.4} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#ffffff" }}>สมาชิก</Text>
            </View>
          </View>
        </Reanimated.View>
      </SafeAreaView>

      {/* White sheet — FIXED & pinned; grows up to fill the screen as the profile
          collapses. Only the cards inside scroll. Green peeks through the
          rounded corners, exactly like Home / Products / Knowledge. */}
      <View
        style={{
          flex: 1,
          backgroundColor: "#fafafa",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        }}
      >
        <Reanimated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14, minHeight: SCREEN_HEIGHT - insets.top + PROFILE_BLOCK }}
        >
          {/* Orders */}
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>การสั่งซื้อของฉัน</Text>
              <Pressable hitSlop={8} className="flex-row items-center active:opacity-60" style={{ gap: 2 }}>
                <Text style={{ fontSize: 13, color: BRAND_GREEN }}>ดูทั้งหมด</Text>
                <ChevronRight size={14} color={BRAND_GREEN} strokeWidth={2.4} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {ORDER_STATUS.map((s) => (
                <Pressable key={s.label} className="items-center active:opacity-70" style={{ flex: 1, gap: 7 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: s.bg, alignItems: "center", justifyContent: "center" }}>
                    <s.Icon size={22} color={s.tint} strokeWidth={2} />
                    {s.count > 0 ? (
                      <View
                        style={{
                          position: "absolute",
                          top: -5,
                          right: -5,
                          minWidth: 18,
                          height: 18,
                          borderRadius: 9,
                          paddingHorizontal: 4,
                          backgroundColor: "#ef4444",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", lineHeight: 14, includeFontPadding: false }}>
                          {s.count}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 11, color: TEXT_SECONDARY }} numberOfLines={1}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* Menu */}
          <MenuList items={MENU} />

          {/* Switch view */}
          <View>
            <Text style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 8, marginLeft: 4 }}>สลับมุมมอง</Text>
            <MenuList items={VIEW_SWITCH} />
          </View>

          {/* Logout */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <Pressable className="flex-row items-center justify-center active:opacity-60" style={{ height: 52, gap: 8 }}>
              <LogOut size={18} color="#ef4444" strokeWidth={2.2} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#ef4444" }}>ออกจากระบบ</Text>
            </Pressable>
          </Card>
        </Reanimated.ScrollView>
      </View>
    </View>
  );
}
