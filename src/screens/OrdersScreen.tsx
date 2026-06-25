import { useState } from "react";
import { View, Text, Image, Pressable, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Package } from "lucide-react-native";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { SubPageHeader } from "../components/SubPageHeader";
import { PressableScale } from "../components/PressableScale";
import { BottomFade } from "../components/BottomFade";
import { OrderActionButtons, type OrderAction } from "../components/OrderActionButtons";
import { useOrders } from "../context/OrderContext";
import { useOrderActions } from "./useOrderActions";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import { STATUS_LABEL, STATUS_COLOR, type Order, type OrderStatus } from "../data/orders";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type OrdersRoute = RouteProp<RootStackParamList, "Orders">;
type TabKey = OrderStatus | "all" | "pending_group";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending_group", label: "รอชำระเงิน" },
  { key: "preparing", label: "กำลังจัดเตรียม" },
  { key: "shipped", label: "จัดส่งแล้ว" },
  { key: "delivered", label: "ได้รับสินค้าแล้ว" },
  { key: "completed", label: "สำเร็จ" },
  { key: "cancelled", label: "ยกเลิก" },
];

const matchesTab = (o: Order, tab: TabKey) =>
  tab === "all"
    ? true
    : tab === "pending_group"
      ? o.status === "pending_payment" || o.status === "pending_verify"
      : o.status === tab;

// ---- Order card (summary — taps through to the detail screen) -----------------

function OrderCard({
  order,
  onPress,
  onAction,
}: {
  order: Order;
  onPress: () => void;
  onAction: (a: OrderAction) => void;
}) {
  const accent = STATUS_COLOR[order.status];
  const shownItems = order.items.slice(0, 2);

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-90"
      style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}
    >
      {/* Shop + status badge (prominent, top-right) */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
            <Package size={14} color="#fff" strokeWidth={2.4} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>{order.shopName}</Text>
        </View>
        <View style={{ backgroundColor: accent + "1a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: accent }}>{STATUS_LABEL[order.status]}</Text>
        </View>
      </View>

      {/* Order id (left) + date (flush right); whole card is tappable → detail */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED, flex: 1 }} numberOfLines={1}>{order.id}</Text>
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED }} numberOfLines={1}>{order.date}</Text>
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Items — first two, compact rows */}
      <View style={{ gap: 14 }}>
        {shownItems.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image source={item.image} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 3 }} numberOfLines={1}>
                {item.option}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>฿{(item.price * item.quantity).toLocaleString()}</Text>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>x{item.quantity}</Text>
            </View>
          </View>
        ))}
        {order.items.length > 2 ? (
          <Text style={{ fontSize: 12, color: TEXT_SECONDARY, textAlign: "center" }}>
            + อีก {order.items.length - 2} รายการ
          </Text>
        ) : null}
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Total + actions */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <View>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>รวมการสั่งซื้อ</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#ef4444", marginTop: 1 }}>฿{order.total.toLocaleString()}</Text>
        </View>
        <OrderActionButtons order={order} onAction={onAction} />
      </View>
    </Pressable>
  );
}

// ---- Status tabs (glass chips matching the Notification filter bar) -----------

function StatusTabs({
  tab,
  setTab,
  countFor,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  countFor: (k: TabKey) => number;
}) {
  // Horizontal chip row — Liquid Glass chips matching the NotificationScreen
  // filter bar (both live in the SubPageHeader glass bar, so per the Guidelines
  // header chips are glass-outlined, not solid-fill; Jakob's Law — filter bars
  // should look identical across screens). Active = green glass tint, the rest a
  // translucent white outline. The count badge is kept and tinted to suit.
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
      {TABS.map((tb) => {
        const active = tab === tb.key;
        const count = countFor(tb.key);
        return (
          <PressableScale key={tb.key} onPress={() => setTab(tb.key)} scaleTo={0.92}>
            <GlassView
              glassEffectStyle="regular"
              colorScheme="light"
              tintColor={active ? "rgba(49,151,84,0.22)" : "rgba(255,255,255,0.5)"}
              isInteractive
              style={{
                height: 34,
                paddingHorizontal: 16,
                borderRadius: 999,
                overflow: "hidden",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                borderWidth: 1,
                borderColor: active ? "rgba(49,151,84,0.45)" : "rgba(0,0,0,0.06)",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? BRAND_GREEN_DARK : "#374151" }}>{tb.label}</Text>
              {count > 0 ? (
                <View style={{ minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: active ? "rgba(38,122,67,0.16)" : "rgba(0,0,0,0.07)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: active ? BRAND_GREEN_DARK : "#374151", lineHeight: 13 }}>{count}</Text>
                </View>
              ) : null}
            </GlassView>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

// ---- Screen ------------------------------------------------------------------

export function OrdersScreen() {
  const nav = useNavigation<Nav>();
  const initialTab = useRoute<OrdersRoute>().params?.initialTab ?? "all";

  const { orders } = useOrders();
  const { handleAction } = useOrderActions();
  const [tab, setTab] = useState<TabKey>(initialTab);

  const filtered = orders.filter((o) => matchesTab(o, tab));
  const countFor = (key: TabKey) => orders.filter((o) => matchesTab(o, key)).length;

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      {/* Subpage app bar (white minimal) — status tabs ride in the bottom slot */}
      <SubPageHeader
        title="คำสั่งซื้อของฉัน"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        bottomSlot={<StatusTabs tab={tab} setTab={setTab} countFor={countFor} />}
      />

      {/* Orders list */}
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 130, gap: 14 }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 70 }}>
              <Package size={56} color="#d4d4d4" strokeWidth={1.5} />
              <Text style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>ยังไม่มีคำสั่งซื้อในหมวดนี้</Text>
              <Pressable onPress={() => nav.navigate("Products")} hitSlop={8} className="active:opacity-60" style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 13, color: BRAND_GREEN, fontWeight: "600" }}>เลือกซื้อสินค้า</Text>
              </Pressable>
            </View>
          ) : (
            filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() => nav.navigate("OrderDetail", { orderId: order.id })}
                onAction={(a) => handleAction(order, a)}
              />
            ))
          )}
        </ScrollView>

        {/* Top fade — cards dissolve into the header as they scroll up */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
        {/* Black scroll-edge shade at the very bottom of the screen. */}
        <BottomFade />
      </View>
    </View>
  );
}
