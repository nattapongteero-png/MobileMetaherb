/**
 * META Caffe — order history.
 * Top section: orders in progress (tap → live detail). Bottom section: past
 * (picked-up) orders, each with service + taste star ratings. Reads from
 * CafeCartContext (activeOrders / orderHistory).
 */
import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Clock, Check, ShoppingBag } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { useCafeCart } from "../context/CafeCartContext";
import type { CafeOrder, CafeHistoryOrder } from "../data/cafePayment";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const baht = (n: number) => "฿" + n.toLocaleString();
const summarize = (o: CafeOrder) =>
  o.items.map((it) => (it.qty > 1 ? `${it.name} ×${it.qty}` : it.name)).join(", ");

function Card({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  const style = { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16 } as const;
  return onPress ? (
    <Pressable onPress={onPress} className="active:opacity-90" style={style}>{children}</Pressable>
  ) : (
    <View style={style}>{children}</View>
  );
}

export function CafeHistoryScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { activeOrders, orderHistory } = useCafeCart();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const empty = activeOrders.length === 0 && orderHistory.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="ประวัติคำสั่งซื้อ" subtitle="META Caffe" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      {empty ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
            <ShoppingBag size={36} color={BRAND_GREEN} strokeWidth={1.8} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_PRIMARY }}>ยังไม่มีคำสั่งซื้อ</Text>
          <Text style={{ fontSize: 13, color: TEXT_SECONDARY, textAlign: "center", lineHeight: 19 }}>เมื่อสั่งเมนูจาก META Caffe รายการจะมาแสดงที่นี่ครับ</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 22 }}>
            {/* In progress — only when there are orders being prepared */}
            {activeOrders.length > 0 ? (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_PRIMARY }}>กำลังทำ</Text>
                {activeOrders.map((o) => {
                  const done = o.readyAt <= now;
                  const summary = summarize(o);
                  return (
                    <Card key={o.orderId} onPress={() => nav.navigate("CafeOrderDetail", { orderId: o.orderId })}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_PRIMARY }}>คิว #{o.queueNo}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(49,151,84,0.1)", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
                            {done ? <Check size={12} color={BRAND_GREEN} strokeWidth={2.8} /> : <Clock size={12} color={BRAND_GREEN} strokeWidth={2.4} />}
                            <Text style={{ fontSize: 11.5, fontWeight: "700", color: BRAND_GREEN_DARK }}>{done ? "พร้อมรับแล้ว" : "กำลังเตรียม"}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: "800", color: BRAND_GREEN }}>{baht(o.total)}</Text>
                      </View>
                      {summary ? <Text numberOfLines={1} style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 6 }}>{summary}</Text> : null}
                    </Card>
                  );
                })}
              </View>
            ) : null}

            {/* History — only when there are past orders */}
            {orderHistory.length > 0 ? (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_PRIMARY }}>ประวัติ</Text>
                {orderHistory.map((o: CafeHistoryOrder) => {
                  const summary = summarize(o);
                  return (
                    <Card key={o.orderId} onPress={() => nav.navigate("CafeOrderDetail", { orderId: o.orderId })}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: "700", color: TEXT_PRIMARY }}>{o.orderId}</Text>
                        <Text style={{ fontSize: 15, fontWeight: "800", color: BRAND_GREEN }}>{baht(o.total)}</Text>
                      </View>
                      {summary ? <Text numberOfLines={1} style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 4 }}>{summary}</Text> : null}
                    </Card>
                  );
                })}
              </View>
            ) : null}
          </ScrollView>
          {/* Edge fades */}
          <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 }} />
          <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 36 }} />
        </View>
      )}
    </View>
  );
}
