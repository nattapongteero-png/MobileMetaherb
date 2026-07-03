import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Animated, Image, Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  AlertCircle,
  Ban,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  MapPin,
  MessageCircle,
  Package,
  Printer,
  Star,
  Store,
  Truck,
  User,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BottomFade } from "../components/BottomFade";
import { EmptyState } from "../components/EmptyState";
import { showToast } from "../components/Toast";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";
import { ORDERS, ORDER_STATUS_CFG, orderTotal, fmtTHB, type ShopOrder } from "./MyShopScreen";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * รายละเอียดคำสั่งซื้อ (ฝั่งร้านค้า) — same shell as the buyer OrderDetailScreen
 * (Jakob's Law: status banner → shipping info → items → finance → review →
 * timeline, floating glass action bar), with the seller-side content ported
 * from the web OwnerDashboard OrderDetailTab (order metadata grid, GP 7%
 * payout, cancellation card, status-specific actions).
 */

// Full-bleed white section — same language as the buyer detail / checkout.
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

export function ShopOrderDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "ShopOrderDetail">>();
  const baseOrder = ORDERS.find((o) => o.id === route.params?.orderId);

  // Status flow is mocked locally (ORDERS isn't persisted): พร้อมจัดส่ง →
  // ready_ship, ยืนยันการจัดส่ง (+tracking) → shipping, ยกเลิก → cancelled,
  // ยินยอม/ไม่ยินยอมคำขอยกเลิกของลูกค้า → approved / revert to previousStatus.
  const [localStatus, setLocalStatus] = useState<ShopOrder["status"] | null>(null);
  const [localTracking, setLocalTracking] = useState<string | null>(null);
  const [localCancel, setLocalCancel] = useState<{ reason: string; note: string } | null>(null);
  const [localCancelStatus, setLocalCancelStatus] = useState<"approved" | "denied" | null>(null);
  const openCancel = (orderId: string) =>
    nav.navigate("CancelOrder", { orderId, onConfirm: (reason, note) => setLocalCancel({ reason, note }) });
  const openConfirmShip = (orderId: string) =>
    nav.navigate("ConfirmShip", {
      orderId,
      onConfirm: (tracking) => {
        setLocalStatus("shipping");
        setLocalTracking(tracking);
      },
    });

  const order: ShopOrder | undefined = baseOrder
    ? {
        ...baseOrder,
        ...(localStatus ? { status: localStatus } : null),
        ...(localTracking ? { trackingNumber: localTracking } : null),
        ...(localCancel
          ? {
              status: "cancelled" as const,
              cancelledBy: "shop" as const,
              cancelReason: localCancel.reason,
              cancelNote: localCancel.note || undefined,
              cancellationStatus: "approved" as const,
            }
          : null),
        ...(localCancelStatus ? { cancellationStatus: localCancelStatus } : null),
      }
    : undefined;

  if (!order) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <StatusBar style="dark" />
        <SubPageHeader title="รายละเอียดคำสั่งซื้อ" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
        <EmptyState
          icon={<ClipboardList size={34} color={TEXT_MUTED} />}
          title="ไม่พบคำสั่งซื้อ"
          subtitle="คำสั่งซื้อนี้อาจถูกลบหรือไม่มีอยู่"
        />
      </View>
    );
  }

  const cfg = ORDER_STATUS_CFG[order.status];
  const accent = cfg.pillBg;
  const total = orderTotal(order);
  const totalQty = order.items.reduce((s, it) => s + it.qty, 0);

  // Finance — same derivation as the web (GP 7%, payout after fee).
  const shippingFee = 0;
  const grossTotal = total + shippingFee;
  const gp = Math.round(grossTotal * 0.07 * 100) / 100;
  const payout = Math.round((grossTotal - gp) * 100) / 100;
  const paymentPaid = order.status !== "pending_payment";
  const isPaid =
    order.status !== "pending_payment" && order.status !== "pending_verify" && order.status !== "cancelled";

  // Order metadata (web derives these from the id/date).
  const orderDateText = order.date.replace(/ น\.$/, "");
  const skuId = "MHB-" + order.id.replace(/[^\d]/g, "").slice(0, 12);
  const warehouseId = "75086249" + order.id.replace(/[^\d]/g, "").slice(0, 8);
  const META_FIELDS: { label: string; value: string; mono?: boolean; warn?: boolean }[] = [
    { label: "ตำแหน่ง", value: "TH (ประเทศไทย)" },
    { label: "เวลาที่สร้าง", value: orderDateText, mono: true },
    { label: "ตัวเลือกในการจัดส่ง", value: "การจัดส่งมาตรฐาน" },
    { label: "รหัสคลังสินค้า", value: warehouseId, mono: true },
    { label: "ชื่อคลังสินค้า", value: "METAHERB Store" },
    { label: "วิธีการจัดส่ง", value: order.shippingMethod === "รับที่ร้าน" ? "รับที่ร้าน" : "จัดส่งผ่านแพลตฟอร์ม" },
    { label: "SKU ID", value: skuId, mono: true },
    { label: "จัดส่งคำสั่งซื้อภายใน", value: "ภายใน 24 ชม. หลังลูกค้าชำระ", warn: true },
    { label: "ยกเลิกอัตโนมัติเมื่อ", value: "5 วันหลังสร้างคำสั่งซื้อ", warn: true },
  ];

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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Order status banner — same as buyer detail */}
          <Section>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: accent + "1a", alignItems: "center", justifyContent: "center" }}>
                <Package size={18} color={accent} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>สถานะคำสั่งซื้อ</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: accent, marginTop: 1 }}>{cfg.label}</Text>
              </View>
            </View>
          </Section>

          {/* Shipping info — customer / method+tracking / address (+customer note) */}
          <Section title="ข้อมูลการจัดส่ง" Icon={MapPin}>
            <View style={{ gap: 16 }}>
              <InfoRow Icon={User}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{order.customer}</Text>
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>{order.phone}</Text>
              </InfoRow>

              <InfoRow Icon={order.shippingMethod === "รับที่ร้าน" ? Store : Truck}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{order.shippingMethod}</Text>
                {order.trackingNumber ? (
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

              <InfoRow Icon={MapPin}>
                <Text style={{ fontSize: 13, color: "#404040", lineHeight: 19 }}>{order.address}</Text>
              </InfoRow>
            </View>

            {order.note ? (
              <View style={{ marginTop: 14, backgroundColor: "rgba(242,242,247,0.7)", borderRadius: 14, padding: 12 }}>
                <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#0a0a0a" }}>หมายเหตุจากลูกค้า</Text>
                <Text style={{ fontSize: 12.5, color: "#404040", marginTop: 3, lineHeight: 18 }}>{order.note}</Text>
              </View>
            ) : null}
          </Section>

          {/* Items — buyer-style rows */}
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
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>฿{item.price.toLocaleString()}</Text>
                    <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>x{item.qty}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Section>

          {/* Finance — buyer-style rows + the seller GP payout card */}
          <Section
            title="ข้อมูลการเงิน"
            Icon={Wallet}
            rightSlot={
              <View style={{ backgroundColor: paymentPaid ? BRAND_GREEN : "#ff8d28", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
                <Text style={{ fontSize: 11, fontWeight: "500", color: "#fff" }}>{paymentPaid ? "ชำระแล้ว" : "รอชำระเงิน"}</Text>
              </View>
            }
          >
            <View style={{ gap: 8 }}>
              <MoneyRow label="วิธีชำระเงิน" value={order.paymentMethod ?? "พร้อมเพย์ PromptPay"} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 2 }} />
              <MoneyRow label={`ยอดรวมสินค้า (${totalQty} ชิ้น)`} value={fmtTHB(total)} />
              <MoneyRow label="ค่าจัดส่ง" value="ฟรี" valueColor={BRAND_GREEN} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 2 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>ยอดสุทธิ</Text>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#ef4444" }}>{fmtTHB(grossTotal)}</Text>
              </View>
            </View>

            {/* ยอดที่ร้านได้รับ (หัก GP 7%) — seller-only, from the web */}
            <View style={{ marginTop: 14, backgroundColor: "rgba(49,151,84,0.08)", borderWidth: 1, borderColor: "rgba(49,151,84,0.15)", borderRadius: 16, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#1d5b32" }}>ยอดที่คุณได้รับ</Text>
                <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(49,151,84,0.2)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                  <Text style={{ fontSize: 10, fontWeight: "500", color: BRAND_GREEN }}>{isPaid ? "ยืนยันแล้ว" : "รอชำระ"}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#1d5b32", marginTop: 6, fontVariant: ["tabular-nums"] }}>{fmtTHB(payout)}</Text>
              <Text style={{ fontSize: 10.5, color: "rgba(29,91,50,0.7)", marginTop: 6, lineHeight: 15 }}>
                หักค่าธรรมเนียม GP 7% ({fmtTHB(gp)}){isPaid ? "\n→ ปล่อยเข้ากระเป๋าหลังลูกค้ารับสินค้า 7 วัน" : ""}
              </Text>
            </View>
          </Section>

          {/* Order metadata — seller-only, laid out as label/value rows so it
              reads like the finance section (consistent visual language) */}
          <Section title="ข้อมูลคำสั่งซื้อ" Icon={ClipboardList}>
            <View style={{ gap: 10 }}>
              {META_FIELDS.map((f, i) => (
                <View key={f.label}>
                  {i > 0 ? <View style={{ height: 1, backgroundColor: "#f5f5f5", marginBottom: 10 }} /> : null}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <Text style={{ fontSize: 13, color: TEXT_SECONDARY }}>{f.label}</Text>
                    <Text
                      style={{
                        flex: 1,
                        textAlign: "right",
                        fontSize: 13,
                        fontWeight: "500",
                        color: f.warn ? "#ff8d28" : "#0a0a0a",
                        ...(f.mono ? { fontVariant: ["tabular-nums"] as const } : null),
                      }}
                    >
                      {f.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Section>

          {/* Customer review (if any) — tap opens the full review (web ReviewModal) */}
          {order.reviewScore ? (
            <Section title="รีวิวจากลูกค้า" Icon={Star}>
              <Pressable
                onPress={() => nav.navigate("ShopOrderReview", { orderId: order.id })}
                className="flex-row items-center active:opacity-70"
                hitSlop={6}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flexDirection: "row", gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={16} color="#f7931d" fill={s <= (order.reviewScore ?? 0) ? "#f7931d" : "transparent"} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }}>{order.reviewScore}/5</Text>
                  </View>
                  <Text style={{ fontSize: 12.5, color: "#525252", marginTop: 6 }}>กดเพื่อดูคำวิจารณ์</Text>
                </View>
                <ChevronRight size={16} color="#9ca3af" />
              </Pressable>
            </Section>
          ) : null}

          {/* Delivery status — stepper (or cancellation card) kept last, like buyer */}
          {order.status === "cancelled" ? (
            <CancellationSection
              order={order}
              onApprove={() => {
                setLocalCancelStatus("approved");
                showToast("ยินยอมการยกเลิก — คำสั่งซื้อถูกยกเลิกเรียบร้อย");
              }}
              onDeny={() => {
                const prev = baseOrder?.previousStatus ?? "pending_verify";
                Alert.alert(
                  "ไม่ยินยอมให้ลูกค้ายกเลิก?",
                  "ออเดอร์จะกลับสู่สถานะเดิมและลูกค้าจะไม่สามารถยกเลิกได้อีก",
                  [
                    { text: "ปิด", style: "cancel" },
                    {
                      text: "ยืนยัน",
                      onPress: () => {
                        setLocalCancelStatus("denied");
                        setLocalStatus(prev);
                        showToast(`ไม่ยินยอม — ออเดอร์กลับสู่สถานะ "${ORDER_STATUS_CFG[prev].label}"`);
                      },
                    },
                  ],
                );
              }}
            />
          ) : (
            <Section title="สถานะการจัดส่ง" Icon={Truck}>
              <ShippingStepper status={order.status} date={order.date} />
            </Section>
          )}

          {/* Actions — own section, one full-width button per row: contact
              always, cancel while still cancellable. (The floating bar keeps
              only the primary forward CTA.) */}
          <Section>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row" }}>
                <ActionButton
                  label="ติดต่อลูกค้า"
                  variant="outline"
                  Icon={MessageCircle}
                  onPress={() => showToast(`เปิดแชทกับ ${order.customer} (${order.phone})`)}
                />
              </View>
              {order.status === "pending_payment" || order.status === "pending_verify" ? (
                <View style={{ flexDirection: "row" }}>
                  <ActionButton label="ยกเลิกคำสั่งซื้อ" variant="danger" onPress={() => openCancel(order.id)} />
                </View>
              ) : null}
              {order.status === "cancelled" ? (
                <View style={{ flexDirection: "row" }}>
                  <ActionButton
                    label="บล็อกลูกค้า"
                    variant="danger"
                    Icon={Ban}
                    onPress={() => showToast(`บล็อก ${order.customer} แล้ว`, "error")}
                  />
                </View>
              ) : null}
            </View>
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

      {/* Floating Liquid Glass action bar — primary forward CTA only (contact
          + cancel live in the inline actions section). Hidden when the status
          has no forward action. */}
      {order.status === "pending_verify" || order.status === "ready_ship" ? (
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}
      >
        <View
          style={{
            borderRadius: 34,
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
            style={{ borderRadius: 34, overflow: "hidden", height: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}
          >
            {order.status === "pending_verify" ? (
              <>
                <ActionButton label="พิมพ์ใบปะหน้า" variant="outline" Icon={Printer} onPress={() => showToast("กำลังเตรียมพิมพ์ใบปะหน้า...")} />
                <ActionButton
                  label="พร้อมจัดส่ง"
                  variant="primary"
                  onPress={() => {
                    setLocalStatus("ready_ship");
                    showToast("เปลี่ยนสถานะเป็นพร้อมจัดส่ง");
                  }}
                />
              </>
            ) : null}
            {order.status === "ready_ship" ? (
              <ActionButton label="ยืนยันการจัดส่ง" variant="primary" Icon={Truck} onPress={() => openConfirmShip(order.id)} />
            ) : null}
          </GlassView>
        </View>
      </View>
      ) : null}
    </View>
  );
}


/* ============================ building blocks ============================ */

// Vertical 6-step shipping progress — done / current (pulsing halo) / upcoming.
const STEPS = ["คำสั่งซื้อ", "รอการชำระ", "ตรวจสอบการชำระ", "กำลังจัดเตรียม", "กำลังจัดส่ง", "จัดส่งสำเร็จ"];
const STEP_MAP: Record<string, number> = { pending_payment: 1, pending_verify: 2, ready_ship: 3, shipping: 4, shipped: 6 };

function ShippingStepper({ status, date }: { status: ShopOrder["status"]; date: string }) {
  const currentStep = STEP_MAP[status] ?? 0;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ paddingHorizontal: 4 }}>
      {STEPS.map((label, i) => {
        const done = i < currentStep;
        const current = i === currentStep;
        const last = i === STEPS.length - 1;
        return (
          <View key={label} style={{ flexDirection: "row" }}>
            {/* Rail: numbered circle + connector */}
            <View style={{ width: 24, alignItems: "center" }}>
              <Animated.View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done ? BRAND_GREEN : "#fff",
                  borderWidth: done ? 0 : 2,
                  borderColor: current ? BRAND_GREEN : "#d1d5db",
                  ...(current ? { transform: [{ scale: pulse }], shadowColor: BRAND_GREEN, shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } } : null),
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: done ? "#fff" : current ? BRAND_GREEN : "#9ca3af", includeFontPadding: false }}>
                  {i + 1}
                </Text>
              </Animated.View>
              {!last ? <View style={{ width: 2, flex: 1, minHeight: 26, marginVertical: 4, borderRadius: 1, backgroundColor: done ? BRAND_GREEN : "#e5e7eb" }} /> : null}
            </View>
            {/* Labels */}
            <View style={{ flex: 1, paddingLeft: 12, paddingBottom: last ? 0 : 18, paddingTop: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: done || current ? "600" : "500", color: done || current ? BRAND_GREEN : "#374151" }}>
                {label}
              </Text>
              <Text style={{ fontSize: 12, color: done || current ? "#374151" : "#9ca3af", marginTop: 1 }}>
                {done || current ? date : "-"}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Cancellation card — replaces the stepper when the order is cancelled (web).
// Two variants: shop-cancelled / approved → red "ยกเลิกแล้ว" with full details;
// customer-requested (pending) → orange "รอร้านค้าอนุมัติ" + approve/deny actions.
function CancellationSection({
  order,
  onApprove,
  onDeny,
}: {
  order: ShopOrder;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const byCustomer = order.cancelledBy === "customer";
  const isPending = order.cancellationStatus === "pending";
  const accent = isPending ? "#ff9500" : "#ff3b30";
  return (
    <Section
      title="การยกเลิกคำสั่งซื้อ"
      Icon={X}
      rightSlot={
        <View
          className="flex-row items-center"
          style={{ gap: 4, backgroundColor: accent, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 999 }}
        >
          {isPending ? <Clock size={12} color="#fff" strokeWidth={2.4} /> : null}
          <Text style={{ fontSize: 11, fontWeight: "500", color: "#fff" }}>{isPending ? "รอร้านค้าอนุมัติ" : "ยกเลิกแล้ว"}</Text>
        </View>
      }
    >
      <View style={{ gap: 12 }}>
        {/* Alert banner — one tinted block groups icon + headline + date */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: accent + "14",
            borderRadius: 16,
            padding: 14,
          }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: accent + "1f", alignItems: "center", justifyContent: "center" }}>
            {isPending ? (
              <AlertCircle size={18} color={accent} strokeWidth={2.4} />
            ) : (
              <X size={18} color={accent} strokeWidth={2.6} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: accent, lineHeight: 20 }}>
              {isPending ? "ลูกค้าขอยกเลิกคำสั่งซื้อ" : "คำสั่งซื้อนี้ถูกยกเลิก"}
            </Text>
            <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
              {isPending ? `รอร้านค้าตัดสินใจ · ${order.date}` : order.date}
            </Text>
          </View>
        </View>

        {/* Details — stacked label-over-value pairs in the standard gray box */}
        <View style={{ backgroundColor: "#f5f5f5", borderRadius: 16, padding: 14, gap: 12 }}>
          <View>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>ยกเลิกโดย</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
              {byCustomer ? <User size={14} color="#3b82f6" strokeWidth={2.4} /> : <Store size={14} color="#ff9500" strokeWidth={2.4} />}
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>
                {byCustomer ? "ลูกค้าเป็นผู้ยกเลิก" : "ร้านค้ายกเลิก"}
              </Text>
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>เหตุผลที่ยกเลิก</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a", marginTop: 3, lineHeight: 20 }}>
              {order.cancelReason || "—"}
            </Text>
          </View>
          {order.cancelNote ? (
            <View>
              <Text style={{ fontSize: 12, color: "#6b7280" }}>หมายเหตุเพิ่มเติม</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a", marginTop: 3, lineHeight: 20 }}>
                {order.cancelNote}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Approve / deny — full-width rows while the request awaits the shop */}
        {isPending ? (
          <View style={{ gap: 10, marginTop: 2 }}>
            <Pressable
              onPress={onApprove}
              className="flex-row items-center justify-center active:opacity-80"
              style={{
                height: 46,
                borderRadius: 999,
                backgroundColor: "#ff3b30",
                gap: 6,
                shadowColor: "#ff3b30",
                shadowOpacity: 0.25,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <Check size={16} color="#fff" strokeWidth={2.6} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>ยินยอมยกเลิก</Text>
            </Pressable>
            <Pressable
              onPress={onDeny}
              className="flex-row items-center justify-center active:opacity-80"
              style={{ height: 46, borderRadius: 999, borderWidth: 1, borderColor: BRAND_GREEN, gap: 6 }}
            >
              <X size={16} color={BRAND_GREEN} strokeWidth={2.4} />
              <Text style={{ fontSize: 14, fontWeight: "500", color: BRAND_GREEN }}>ไม่ยินยอม</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Section>
  );
}

// Full-width action button for the floating glass bar.
function ActionButton({
  label,
  variant,
  Icon,
  onPress,
}: {
  label: string;
  variant: "primary" | "outline" | "danger" | "amber";
  Icon?: LucideIcon;
  onPress: () => void;
}) {
  const s = {
    primary: { bg: BRAND_GREEN, border: BRAND_GREEN, text: "#fff" },
    outline: { bg: "transparent", border: BRAND_GREEN, text: BRAND_GREEN },
    danger: { bg: "transparent", border: "#ff3b30", text: "#ff3b30" },
    amber: { bg: "transparent", border: "#f59e0b", text: "#f59e0b" },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center active:opacity-80"
      style={{ flex: 1, height: 50, borderRadius: 999, backgroundColor: s.bg, borderWidth: 1, borderColor: s.border, gap: 6 }}
    >
      {Icon ? <Icon size={16} color={s.text} strokeWidth={2.2} {...(variant === "amber" ? { fill: "#f59e0b" } : {})} /> : null}
      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: variant === "primary" ? "600" : "500", color: s.text }}>{label}</Text>
    </Pressable>
  );
}
