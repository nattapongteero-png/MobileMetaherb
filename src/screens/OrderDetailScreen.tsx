import type { ReactNode } from "react";
import { View, Text, Image, ScrollView, Pressable, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Package, Truck, Copy, Star, PackageX, User, MapPin, Wallet, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BottomFade } from "../components/BottomFade";
import { EmptyState } from "../components/EmptyState";
import { OrderTimeline } from "../components/OrderTimeline";
import { OrderActionButtons, hasOrderActions } from "../components/OrderActionButtons";
import { useOrderActions } from "./useOrderActions";
import { useOrders } from "../context/OrderContext";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import { STATUS_LABEL, STATUS_COLOR } from "../data/orders";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, "OrderDetail">;

// Full-bleed white section — same language as the checkout (PaymentScreen):
// edge-to-edge white blocks separated by a thin gray gap, green icon + title.
function Section({
  title,
  Icon,
  rightSlot,
  children,
}: {
  title?: string;
  Icon?: LucideIcon;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="bg-white" style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      {title ? (
        <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            {Icon ? <Icon size={18} color={BRAND_GREEN} /> : null}
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a", lineHeight: 20 }}>{title}</Text>
          </View>
          {rightSlot ?? null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// Icon + content row used in the shipping-info card.
function InfoRow({ Icon, children }: { Icon: LucideIcon; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        <Icon size={17} color={BRAND_GREEN} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

// One label/value line in the payment-info card.
function MoneyRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 13, color: TEXT_SECONDARY }}>{label}</Text>
      <Text style={{ fontSize: 13, color: valueColor ?? "#0a0a0a", fontWeight: "500" }}>{value}</Text>
    </View>
  );
}

export function OrderDetailScreen() {
  const nav = useNavigation<Nav>();
  const orderId = useRoute<DetailRoute>().params.orderId;
  const { getOrder } = useOrders();
  const order = getOrder(orderId);
  const { handleAction } = useOrderActions();

  if (!order) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <StatusBar style="dark" />
        <SubPageHeader title="รายละเอียดคำสั่งซื้อ" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
        <EmptyState
          icon={<PackageX size={34} color={TEXT_MUTED} />}
          title="ไม่พบคำสั่งซื้อ"
          subtitle="คำสั่งซื้อนี้อาจถูกลบหรือไม่มีอยู่"
        />
      </View>
    );
  }

  const accent = STATUS_COLOR[order.status];
  const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = order.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const shippingFee = Math.max(0, order.total - subtotal); // baked into the mock total
  const discount = Math.max(0, subtotal - order.total);
  const showTracking = order.trackingNumber && (order.status === "shipped" || order.status === "delivered");
  // Only the awaiting-payment state shows the amount in the floating bar — the
  // total is action-relevant only when you're about to pay.
  const showBarTotal = order.status === "pending_payment";
  // Single-row bar is a full capsule (like other screens); the taller two-row
  // bar (with the total) uses a softer rounded-rect radius.
  const barRadius = showBarTotal ? 28 : 34;

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader
        title={order.id}
        subtitle={order.date}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: showBarTotal ? 140 : 100 }}>
          {/* Order status banner */}
          <Section>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: accent + "1a", alignItems: "center", justifyContent: "center" }}>
                <Package size={18} color={accent} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>สถานะคำสั่งซื้อ</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: accent, marginTop: 1 }}>{STATUS_LABEL[order.status]}</Text>
              </View>
            </View>
          </Section>

          {/* Shipping info */}
          <Section title="ข้อมูลการจัดส่ง" Icon={MapPin}>
            <View style={{ gap: 16 }}>
              {order.recipient ? (
                <InfoRow Icon={User}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{order.recipient.name}</Text>
                  <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>{order.recipient.phone}</Text>
                </InfoRow>
              ) : null}

              <InfoRow Icon={Truck}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{order.shippingMethod ?? "จัดส่งมาตรฐาน"}</Text>
                {showTracking ? (
                  <Pressable
                    onPress={() => Alert.alert("คัดลอกเลขพัสดุแล้ว", order.trackingNumber!)}
                    hitSlop={6}
                    className="flex-row items-center active:opacity-60"
                    style={{ gap: 4, marginTop: 2 }}
                  >
                    <Text style={{ fontSize: 12.5, color: BRAND_GREEN, fontWeight: "600" }}>{order.trackingNumber}</Text>
                    <Copy size={12} color={BRAND_GREEN} />
                  </Pressable>
                ) : (
                  <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>ยังไม่มีเลขพัสดุ</Text>
                )}
              </InfoRow>

              {order.recipient ? (
                <InfoRow Icon={MapPin}>
                  <Text style={{ fontSize: 13, color: "#404040", lineHeight: 19 }}>{order.recipient.address}</Text>
                </InfoRow>
              ) : null}
            </View>
          </Section>

          {/* Items */}
          <Section title={`รายการสินค้า (${order.items.length})`} Icon={Package}>
            <View style={{ gap: 14 }}>
              {order.items.map((item, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Image source={item.image} style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }} numberOfLines={2}>{item.name}</Text>
                    <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 3 }} numberOfLines={1}>{item.option}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>฿{(item.price * item.quantity).toLocaleString()}</Text>
                    <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>x{item.quantity}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Section>

          {/* Payment info */}
          <Section title="ข้อมูลการเงิน" Icon={Wallet}>
            <View style={{ gap: 8 }}>
              <MoneyRow label="วิธีชำระเงิน" value={order.paymentMethod ?? "PromptPay"} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 2 }} />
              <MoneyRow label={`ยอดรวมสินค้า (${totalQty} ชิ้น)`} value={`฿${subtotal.toLocaleString()}`} />
              <MoneyRow label="ค่าจัดส่ง" value={shippingFee > 0 ? `฿${shippingFee.toLocaleString()}` : "ฟรี"} valueColor={shippingFee > 0 ? undefined : BRAND_GREEN} />
              {discount > 0 ? <MoneyRow label="ส่วนลด" value={`-฿${discount.toLocaleString()}`} valueColor={BRAND_GREEN} /> : null}
              <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 2 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>ยอดสุทธิ</Text>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#ef4444" }}>฿{order.total.toLocaleString()}</Text>
              </View>
            </View>
          </Section>

          {/* Review (if any) */}
          {order.review ? (
            <Section title="รีวิวของคุณ" Icon={Star}>
              <View style={{ flexDirection: "row", gap: 2, marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} color="#f7931d" fill={s <= order.review!.rating ? "#f7931d" : "transparent"} />
                ))}
              </View>
              <Text style={{ fontSize: 13, color: "#525252", lineHeight: 19 }}>{order.review.comment}</Text>
            </Section>
          ) : null}

          {/* Delivery status timeline (vertical) — kept last */}
          <Section title="สถานะการจัดส่ง" Icon={Truck}>
            <OrderTimeline status={order.status} date={order.date} />
          </Section>
        </ScrollView>

        {/* Top fade — content dissolves into the header as it scrolls up */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
        <BottomFade />
      </View>

      {/* Floating Liquid Glass action bar — same language as the cart / payment
          screens (hovers above the bottom over the BottomFade shade). Hidden for
          statuses with no action (e.g. awaiting verification). */}
      {hasOrderActions(order) ? (
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}
        >
          <View
            style={{
              borderRadius: barRadius,
              shadowColor: "#0a3d22",
              shadowOffset: { width: 0, height: 9 },
              shadowOpacity: 0.18,
              shadowRadius: 16,
              elevation: 14,
            }}
          >
            <GlassView
              glassEffectStyle="regular"
              colorScheme="light"
              style={
                showBarTotal
                  ? { borderRadius: barRadius, overflow: "hidden", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 10 }
                  : { borderRadius: barRadius, overflow: "hidden", height: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }
              }
            >
              {/* Total row — only while awaiting payment (two-row layout) */}
              {showBarTotal ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 13, color: "#737373", lineHeight: 18 }}>ยอดสุทธิ</Text>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: "#ef4444", lineHeight: 24 }}>฿{order.total.toLocaleString()}</Text>
                </View>
              ) : null}
              {/* Full-width action buttons */}
              <OrderActionButtons order={order} onAction={(a) => handleAction(order, a)} buttonHeight={50} fill />
            </GlassView>
          </View>
        </View>
      ) : null}
    </View>
  );
}
