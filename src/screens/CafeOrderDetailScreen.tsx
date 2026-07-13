/**
 * META Caffe — order detail / status (opened by tapping a queue banner).
 * Plain full-bleed sections: order status (queue + estimated ready time, live),
 * ordered items, and order info. Once ready, "รับออเดอร์แล้ว" clears the order.
 * Reads the order from CafeCartContext by id (same source as the queue banners).
 */
import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Check, Clock } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { StarRow } from "../components/StarRow";
import { useCafeCart } from "../context/CafeCartContext";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, GLASS_BAR_TINT } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

const DRIP_GIF = require("../../assets/drepcoffee.gif"); // animated "brewing"
const READY_IMG = require("../../assets/herocafe.png"); // finished cup when ready
type Nav = NativeStackNavigationProp<RootStackParamList>;
const baht = (n: number) => "฿" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });
const fmtTime = (d: Date) =>
  `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

function SectionTitle({ children }: { children: string }) {
  return <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_PRIMARY, marginBottom: 12 }}>{children}</Text>;
}

function KV({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ fontSize: strong ? 14.5 : 13.5, color: strong ? TEXT_PRIMARY : TEXT_SECONDARY, fontWeight: strong ? "800" : "400" }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: "right", fontSize: strong ? 18 : 14, fontWeight: strong ? "800" : "600", color: strong ? BRAND_GREEN : TEXT_PRIMARY }}>{value}</Text>
    </View>
  );
}

/** Standard app floating action bar — glass shell + full-width green button. */
function FloatingBar({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 18 }}>
      <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
        <GlassView glassEffectStyle="regular" colorScheme="light" tintColor={GLASS_BAR_TINT} style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
          <Pressable onPress={onPress} className="active:opacity-80" style={{ flex: 1, height: 50, borderRadius: 999, overflow: "hidden" }}>
            <LinearGradient colors={["#0b3d2e", "#1a7a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{label}</Text>
            </LinearGradient>
          </Pressable>
        </GlassView>
      </View>
    </View>
  );
}

export function CafeOrderDetailScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { activeOrders, orderHistory, completeOrder } = useCafeCart();
  const orderId = useRoute<RouteProp<RootStackParamList, "CafeOrderDetail">>().params?.orderId;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Resolve from active orders or, if already picked up, from history.
  const active = activeOrders.find((o) => o.orderId === orderId);
  const past = orderHistory.find((o) => o.orderId === orderId);
  const order = active ?? past;
  if (!order) return null; // dismissed / not found
  const isHistory = !active;

  const remainMs = active ? Math.max(0, active.readyAt - now) : 0;
  const minutesLeft = Math.ceil(remainMs / 60000);
  const done = isHistory || remainMs <= 0; // history orders are already picked up
  const showReady = isHistory || done;
  const ready = active ? fmtTime(new Date(active.readyAt)) : "";
  const reviewed = !!past && (past.ratingService > 0 || past.ratingTaste > 0);

  const received = () => {
    // Stay on the detail screen: completeOrder moves the order into history, so
    // the screen re-renders as a picked-up order and shows the "ให้คะแนนรีวิว"
    // bar — letting the user rate right away instead of bouncing back.
    completeOrder(order.orderId);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="รายละเอียดออเดอร์" subtitle="META Caffe" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + ((active && done) || (isHistory && !reviewed) ? 96 : 24) }}>
        {/* Top-centre order art — brewing animation, or the finished cup once ready */}
        <View style={{ alignItems: "center", paddingBottom: 20 }}>
          <Image source={showReady ? READY_IMG : DRIP_GIF} style={{ width: 150, height: 150 }} resizeMode="contain" />
        </View>

        {/* Status */}
        <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <SectionTitle>สถานะออเดอร์</SectionTitle>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(49,151,84,0.1)", paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 }}>
              {done ? <Check size={14} color={BRAND_GREEN} strokeWidth={2.8} /> : <Clock size={14} color={BRAND_GREEN} strokeWidth={2.4} />}
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: BRAND_GREEN_DARK }}>{isHistory ? "รับแล้ว" : done ? "พร้อมรับแล้ว" : "กำลังเตรียม"}</Text>
            </View>
          </View>

          <View style={{ gap: 14 }}>
            <KV label="คิวของคุณ" value={`#${order.queueNo}`} />
            {!done ? <KV label="รออีก" value={`${order.queueAhead} คิว`} /> : null}
            <KV
              label={done ? "สถานะ" : "พร้อมโดยประมาณ"}
              value={isHistory ? "รับสินค้าแล้ว" : done ? "รับได้ที่เคาน์เตอร์" : `${ready} น. · อีก ~${minutesLeft} นาที`}
            />
          </View>
        </View>

        {/* Review — shown once the customer has reviewed (read-only) */}
        {isHistory && reviewed && past ? (
          <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}>
            <SectionTitle>รีวิวของคุณ</SectionTitle>
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13.5, color: TEXT_SECONDARY }}>การบริการ</Text>
                <StarRow value={past.ratingService} size={18} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13.5, color: TEXT_SECONDARY }}>รสชาติ</Text>
                <StarRow value={past.ratingTaste} size={18} />
              </View>
              {past.comment ? (
                <>
                  <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
                  <Text style={{ fontSize: 13.5, color: TEXT_SECONDARY, lineHeight: 20 }}>{past.comment}</Text>
                </>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Ordered items (no images) */}
        {order.items.length > 0 ? (
          <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}>
            <SectionTitle>รายการที่สั่ง</SectionTitle>
            <View style={{ gap: 12 }}>
              {order.items.map((it, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: "800", color: BRAND_GREEN, minWidth: 26 }}>×{it.qty}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY }}>{it.name}</Text>
                    {it.summary ? <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>{it.summary}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 13.5, fontWeight: "700", color: TEXT_PRIMARY }}>{baht(it.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Order info */}
        <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8, gap: 14 }}>
          <KV label="หมายเลขออเดอร์" value={order.orderId} />
          <KV label="ช่องทางชำระเงิน" value={order.payLabel} />
          <KV label="รับสินค้า" value={order.receiveLabel} />
          <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
          <KV label="ยอดชำระทั้งหมด" value={baht(order.total)} strong />
        </View>
      </ScrollView>
        {/* Edge fades while scrolling */}
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 }} />
        <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 36 }} />
      </View>

      {/* Bottom action — pick up (active+ready) or write review (history) */}
      {active && done ? (
        <FloatingBar label="รับออเดอร์แล้ว" onPress={received} />
      ) : isHistory && !reviewed ? (
        <FloatingBar label="ให้คะแนนรีวิว" onPress={() => nav.navigate("CafeReview", { orderId: order.orderId })} />
      ) : null}
    </View>
  );
}
