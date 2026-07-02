/**
 * META Caffe — order-placed / success screen.
 * Confirms the café order and surfaces the barista queue: the customer's queue
 * number, how many orders are ahead, and an estimated ready time. Reads the
 * active order from CafeCartContext (the same source as the queue banner).
 */
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Clock, ListOrdered } from "lucide-react-native";
import { useCafeCart } from "../context/CafeCartContext";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const baht = (n: number) => "฿" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });
const fmtTime = (d: Date) =>
  `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

function DetailRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ fontSize: 12, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 15, color: TEXT_PRIMARY, fontWeight: "600" }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 13, color: TEXT_SECONDARY }}>{sub}</Text> : null}
    </View>
  );
}

export function CafeSuccessScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { activeOrders } = useCafeCart();
  const paramOrderId = useRoute<RouteProp<RootStackParamList, "CafeSuccess">>().params?.orderId;

  const goCafe = () =>
    nav.reset({ index: 1, routes: [{ name: "Main" }, { name: "Cafe" }] });

  // Show the requested order (fallback to the most recently placed); guard stale visits.
  const order = activeOrders.find((o) => o.orderId === paramOrderId) ?? activeOrders[activeOrders.length - 1];
  if (!order) return null;
  const { orderId, total, payLabel, receiveLabel, items, queueNo, queueAhead, waitMinutes, readyAt } = order;

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* Success mark */}
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
              <Check size={46} color="#fff" strokeWidth={3} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: TEXT_PRIMARY, marginTop: 16 }}>สั่งซื้อสำเร็จ ☕</Text>
            <Text style={{ fontSize: 14, color: TEXT_SECONDARY, marginTop: 6, textAlign: "center", lineHeight: 20 }}>
              ขอบคุณที่สั่งกับ META Caffe{"\n"}บาริสต้ากำลังเตรียมออเดอร์ให้คุณ
            </Text>
            <Text style={{ fontSize: 34, fontWeight: "800", color: BRAND_GREEN_DARK, marginTop: 14 }}>{baht(total)}</Text>
          </View>

          {/* Queue highlight */}
          <View style={{ borderRadius: 24, marginTop: 24, overflow: "hidden", shadowColor: "#0a3d22", shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}>
            <LinearGradient colors={["#0b3d2e", "#1a7a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 22, alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "600", letterSpacing: 0.4 }}>คิวของคุณ</Text>
              <Text style={{ fontSize: 52, fontWeight: "900", color: "#fff", marginTop: 2, lineHeight: 58 }}>#{queueNo}</Text>

              <View style={{ flexDirection: "row", alignItems: "stretch", marginTop: 16, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 16, overflow: "hidden" }}>
                <View style={{ flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 18, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <ListOrdered size={16} color="#c8f0d6" strokeWidth={2.4} />
                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff" }}>{queueAhead}</Text>
                  </View>
                  <Text style={{ fontSize: 11.5, color: "rgba(255,255,255,0.8)" }}>รออีก (คิว)</Text>
                </View>
                <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
                <View style={{ flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 18, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Clock size={16} color="#c8f0d6" strokeWidth={2.4} />
                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff" }}>~{waitMinutes}</Text>
                  </View>
                  <Text style={{ fontSize: 11.5, color: "rgba(255,255,255,0.8)" }}>รอประมาณ (นาที)</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 7, marginTop: 16 }}>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>พร้อมรับประมาณ</Text>
                <Text style={{ fontSize: 19, fontWeight: "800", color: "#fff" }}>{fmtTime(new Date(readyAt))} น.</Text>
              </View>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 8, textAlign: "center" }}>
                จะแจ้งเตือนเมื่อออเดอร์ของคุณพร้อม
              </Text>
            </LinearGradient>
          </View>

          {/* Ordered items (no images) */}
          {items.length > 0 ? (
            <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#ececed", padding: 18, marginTop: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_PRIMARY, marginBottom: 12 }}>รายการที่สั่ง</Text>
              <View style={{ gap: 12 }}>
                {items.map((it, i) => (
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

          {/* Order details */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#ececed", padding: 18, marginTop: 16, gap: 14 }}>
            <DetailRow label="หมายเลขออเดอร์" value={orderId} />
            <DetailRow label="ช่องทางชำระเงิน" value={payLabel} />
            <DetailRow label="รับสินค้า" value={receiveLabel} />
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12, gap: 8 }}>
          <Pressable onPress={goCafe} className="active:opacity-80 items-center justify-center" style={{ height: 52, borderRadius: 999, overflow: "hidden" }}>
            <LinearGradient colors={["#0b3d2e", "#1a7a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>สั่งเพิ่มที่ META Caffe</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
