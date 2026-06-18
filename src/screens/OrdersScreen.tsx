import { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Modal, TextInput, Alert, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ChevronLeft,
  Package,
  ChevronDown,
  ChevronUp,
  Star,
  MessageCircle,
  Copy,
  CreditCard,
  Eye,
  Truck,
  Home,
  Check,
  ShoppingCart,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react-native";
import { IconButton } from "../components/IconButton";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import { MOCK_ORDERS, STATUS_LABEL, STATUS_COLOR, type Order, type OrderStatus } from "../data/orders";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type OrdersRoute = RouteProp<RootStackParamList, "Orders">;
type TabKey = OrderStatus | "all" | "pending_group";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending_group", label: "ที่ต้องชำระ" },
  { key: "preparing", label: "กำลังเตรียม" },
  { key: "shipped", label: "ที่ต้องได้รับ" },
  { key: "delivered", label: "ส่งถึงแล้ว" },
  { key: "completed", label: "สำเร็จ" },
  { key: "cancelled", label: "ยกเลิก" },
];

const matchesTab = (o: Order, tab: TabKey) =>
  tab === "all"
    ? true
    : tab === "pending_group"
      ? o.status === "pending_payment" || o.status === "pending_verify"
      : o.status === tab;

// ---- Timeline ----------------------------------------------------------------

const TIMELINE: { status: OrderStatus; label: string; Icon: LucideIcon }[] = [
  { status: "pending_payment", label: "ชำระเงิน", Icon: CreditCard },
  { status: "pending_verify", label: "ตรวจสอบ", Icon: Eye },
  { status: "preparing", label: "เตรียมของ", Icon: Package },
  { status: "shipped", label: "จัดส่ง", Icon: Truck },
  { status: "delivered", label: "ถึงปลายทาง", Icon: Home },
  { status: "completed", label: "สำเร็จ", Icon: Star },
];
const TIMELINE_ORDER = TIMELINE.map((s) => s.status);

function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <View style={{ alignItems: "center", paddingVertical: 10 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 20, color: "#ef4444" }}>✕</Text>
        </View>
        <Text style={{ fontSize: 13, color: "#ef4444", fontWeight: "600", marginTop: 6 }}>คำสั่งซื้อถูกยกเลิก</Text>
      </View>
    );
  }

  const currentIndex = TIMELINE_ORDER.indexOf(status);
  const edge = 100 / (TIMELINE.length * 2); // half-cell — aligns line ends to circle centers
  const progress = (currentIndex / (TIMELINE.length - 1)) * (100 - edge * 2);

  return (
    <View style={{ paddingVertical: 6 }}>
      {/* base + progress lines, behind the circles */}
      <View style={{ position: "absolute", top: 6 + 16 - 1, left: `${edge}%`, right: `${edge}%`, height: 2, backgroundColor: "#e5e5e5" }} />
      <View style={{ position: "absolute", top: 6 + 16 - 1, left: `${edge}%`, width: `${progress}%`, height: 2, backgroundColor: BRAND_GREEN }} />

      <View style={{ flexDirection: "row" }}>
        {TIMELINE.map((step, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          const active = done || current;
          return (
            <View key={step.status} style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? BRAND_GREEN : "#f0f0f0",
                  borderWidth: current ? 3 : 0,
                  borderColor: "rgba(49,151,84,0.25)",
                }}
              >
                {done ? <Check size={16} color="#fff" strokeWidth={2.6} /> : <step.Icon size={15} color={active ? "#fff" : "#a3a3a3"} strokeWidth={2.2} />}
              </View>
              <Text
                style={{ fontSize: 9.5, marginTop: 5, textAlign: "center", color: active ? BRAND_GREEN : "#a3a3a3", fontWeight: current ? "700" : "400" }}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---- Order card --------------------------------------------------------------

function OrderCard({
  order,
  expanded,
  onToggle,
  onAction,
}: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onAction: (a: "pay" | "cancel" | "received" | "review" | "rebuy" | "edit" | "contact" | "complaint") => void;
}) {
  const accent = STATUS_COLOR[order.status];
  const shownItems = expanded ? order.items : order.items.slice(0, 2);
  const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0);

  const Btn = ({
    label,
    onPress,
    variant,
    Icon,
  }: {
    label: string;
    onPress: () => void;
    variant: "primary" | "outline" | "danger" | "amber";
    Icon?: LucideIcon;
  }) => {
    const styles = {
      primary: { bg: BRAND_GREEN, border: BRAND_GREEN, text: "#fff" },
      amber: { bg: "#f7931d", border: "#f7931d", text: "#fff" },
      outline: { bg: "transparent", border: BRAND_GREEN, text: BRAND_GREEN },
      danger: { bg: "transparent", border: "#ef4444", text: "#ef4444" },
    }[variant];
    return (
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-center active:opacity-80"
        style={{ height: 38, paddingHorizontal: 16, borderRadius: 999, backgroundColor: styles.bg, borderWidth: 1, borderColor: styles.border, gap: 5 }}
      >
        {Icon ? <Icon size={15} color={styles.text} strokeWidth={2.2} /> : null}
        <Text style={{ fontSize: 13, fontWeight: "600", color: styles.text }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}>
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

      {/* Order id · date + detail toggle */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED, flex: 1 }} numberOfLines={1}>
          {order.id}  ·  {order.date}
        </Text>
        <Pressable onPress={onToggle} hitSlop={6} className="flex-row items-center active:opacity-60" style={{ gap: 2 }}>
          <Text style={{ fontSize: 12, color: BRAND_GREEN, fontWeight: "500" }}>{expanded ? "ย่อ" : "รายละเอียด"}</Text>
          {expanded ? <ChevronUp size={14} color={BRAND_GREEN} strokeWidth={2.4} /> : <ChevronDown size={14} color={BRAND_GREEN} strokeWidth={2.4} />}
        </Pressable>
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Items — compact, uniform rows; price & qty aligned right */}
      <View style={{ gap: 14 }}>
        {shownItems.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image source={{ uri: item.image }} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
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
        {order.items.length > 2 && !expanded ? (
          <Pressable
            onPress={onToggle}
            className="flex-row items-center justify-center active:opacity-70"
            style={{ gap: 4, paddingVertical: 7, backgroundColor: "#f6f6f6", borderRadius: 10 }}
          >
            <Text style={{ fontSize: 12, color: TEXT_SECONDARY, fontWeight: "500" }}>ดูอีก {order.items.length - 2} รายการ</Text>
            <ChevronDown size={14} color={TEXT_SECONDARY} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>

      {/* Timeline (expanded) */}
      {expanded ? (
        <View style={{ borderTopWidth: 1, borderTopColor: "#f0f0f0", marginTop: 12, paddingTop: 12 }}>
          <Text style={{ fontSize: 13, color: TEXT_SECONDARY, fontWeight: "600", marginBottom: 4 }}>สถานะการจัดส่ง</Text>
          <OrderTimeline status={order.status} />
          {order.trackingNumber && (order.status === "shipped" || order.status === "delivered") ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#eff6ff", borderRadius: 12, padding: 10, marginTop: 8 }}>
              <Truck size={18} color="#3b82f6" />
              <Text style={{ flex: 1, fontSize: 12, color: "#1d4ed8", fontWeight: "500" }}>เลขพัสดุ {order.trackingNumber}</Text>
              <Pressable onPress={() => Alert.alert("คัดลอกเลขพัสดุแล้ว", order.trackingNumber)} hitSlop={8} className="active:opacity-60">
                <Copy size={15} color="#3b82f6" />
              </Pressable>
            </View>
          ) : null}
          {order.review ? (
            <View style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: 10, marginTop: 8 }}>
              <View style={{ flexDirection: "row", gap: 2, marginBottom: 4 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={13} color="#f7931d" fill={s <= order.review!.rating ? "#f7931d" : "transparent"} />
                ))}
              </View>
              <Text style={{ fontSize: 12, color: "#92400e" }}>{order.review.comment}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Total + actions */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <View>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>รวม {totalQty} ชิ้น</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#ef4444", marginTop: 1 }}>฿{order.total.toLocaleString()}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {order.status === "pending_payment" ? (
            <>
              <Btn label="ยกเลิก" variant="danger" onPress={() => onAction("cancel")} />
              <Btn label="ชำระเงิน" variant="primary" onPress={() => onAction("pay")} />
            </>
          ) : null}
          {order.status === "pending_verify" ? <Btn label="แก้ไขสลิป" variant="outline" onPress={() => onAction("edit")} /> : null}
          {order.status === "preparing" ? <Btn label="ติดต่อร้าน" variant="outline" Icon={MessageCircle} onPress={() => onAction("contact")} /> : null}
          {order.status === "shipped" ? <Btn label="ได้รับสินค้าแล้ว" variant="primary" onPress={() => onAction("received")} /> : null}
          {order.status === "delivered" && !order.review ? (
            <>
              <Btn label="ร้องเรียน" variant="outline" onPress={() => onAction("complaint")} />
              <Btn label="รีวิว" variant="amber" Icon={Star} onPress={() => onAction("review")} />
            </>
          ) : null}
          {order.status === "completed" ? <Btn label="ซื้ออีกครั้ง" variant="primary" Icon={ShoppingCart} onPress={() => onAction("rebuy")} /> : null}
          {order.status === "cancelled" ? <Btn label="สั่งซื้อใหม่" variant="primary" onPress={() => onAction("rebuy")} /> : null}
        </View>
      </View>
    </View>
  );
}

// ---- Status tabs (capsule + sliding white pill, like the Knowledge tabs) -----

function StatusTabs({
  tab,
  setTab,
  countFor,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  countFor: (k: TabKey) => number;
}) {
  const layouts = useRef<Record<string, { x: number; width: number }>>({}).current;
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);

  // Slide the white pill to the active tab (spring, same feel as Knowledge).
  useEffect(() => {
    const l = layouts[tab];
    if (!l) return;
    Animated.parallel([
      Animated.spring(pillX, { toValue: l.x, useNativeDriver: false, friction: 13, tension: 100 }),
      Animated.spring(pillW, { toValue: l.width, useNativeDriver: false, friction: 13, tension: 100 }),
    ]).start();
  }, [tab, ready, layouts, pillW, pillX]);

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 2, paddingBottom: 12 }}>
      <View style={{ borderRadius: 999, backgroundColor: "rgba(0,0,0,0.25)", padding: 4, overflow: "hidden" }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2 }}>
          <View>
            {/* Sliding white pill — sits behind the labels */}
            <Animated.View
              style={{
                position: "absolute",
                top: 0,
                left: pillX,
                width: pillW,
                height: 34,
                borderRadius: 999,
                backgroundColor: "#ffffff",
                opacity: ready ? 1 : 0,
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            />
            <View style={{ flexDirection: "row", gap: 2 }}>
              {TABS.map((tb) => {
                const active = tab === tb.key;
                const count = countFor(tb.key);
                return (
                  <Pressable
                    key={tb.key}
                    onPress={() => setTab(tb.key)}
                    onLayout={(e) => {
                      const { x, width } = e.nativeEvent.layout;
                      layouts[tb.key] = { x, width };
                      if (tb.key === tab) {
                        pillX.setValue(x);
                        pillW.setValue(width);
                        if (!ready) setReady(true);
                      }
                    }}
                    className="flex-row items-center justify-center active:opacity-80"
                    style={{ height: 34, paddingHorizontal: 16, gap: 6 }}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: active ? "700" : "600", color: active ? BRAND_GREEN : "#ffffff" }}>{tb.label}</Text>
                    {count > 0 ? (
                      <View style={{ minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: active ? BRAND_GREEN : "rgba(255,255,255,0.28)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff", lineHeight: 13 }}>{count}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ---- Screen ------------------------------------------------------------------

const REVIEW_TAGS = ["สินค้าดี", "ส่งเร็ว", "แพ็คดี", "คุ้มค่า", "ตรงปก"];

export function OrdersScreen() {
  const nav = useNavigation<Nav>();
  const initialTab = useRoute<OrdersRoute>().params?.initialTab ?? "all";

  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Review modal
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const filtered = orders.filter((o) => matchesTab(o, tab));
  const countFor = (key: TabKey) => orders.filter((o) => matchesTab(o, key)).length;

  const setStatus = (id: string, status: OrderStatus) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

  const submitReview = () => {
    if (!reviewId) return;
    setOrders((prev) => prev.map((o) => (o.id === reviewId ? { ...o, status: "completed", review: { rating, comment: comment.trim() || "สินค้าดี" } } : o)));
    setReviewId(null);
    setComment("");
    setRating(5);
  };

  const handleAction = (order: Order, a: Parameters<Parameters<typeof OrderCard>[0]["onAction"]>[0]) => {
    switch (a) {
      case "pay":
        nav.navigate("VerifyPayment");
        break;
      case "cancel":
        Alert.alert("ยกเลิกคำสั่งซื้อ", `ต้องการยกเลิก ${order.id}?`, [
          { text: "ไม่", style: "cancel" },
          { text: "ยกเลิกเลย", style: "destructive", onPress: () => setStatus(order.id, "cancelled") },
        ]);
        break;
      case "received":
        Alert.alert("ยืนยันรับสินค้า", "ได้รับสินค้าครบถ้วนแล้วใช่ไหม?", [
          { text: "ยังไม่ได้รับ", style: "cancel" },
          { text: "ได้รับแล้ว", onPress: () => setStatus(order.id, "delivered") },
        ]);
        break;
      case "review":
        setRating(5);
        setComment("");
        setReviewId(order.id);
        break;
      case "rebuy":
        nav.navigate("Products" as never);
        break;
      case "complaint":
        nav.navigate("ComplaintSelect", { orderId: order.id });
        break;
      case "edit":
      case "contact":
        Alert.alert("กำลังพัฒนา", "ฟีเจอร์นี้อยู่ระหว่างพัฒนา");
        break;
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND_GREEN }}>
      <StatusBar style="light" />

      {/* Green header — title + status tabs (Knowledge-style capsule) */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: BRAND_GREEN }}>
        <View className="flex-row items-center" style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8, gap: 8 }}>
          <IconButton onPress={() => nav.canGoBack() && nav.goBack()} variant="translucentDark" accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={22} color="white" />
          </IconButton>
          <Text style={{ fontSize: 19, fontWeight: "700", color: "#fff" }}>คำสั่งซื้อของฉัน</Text>
        </View>
        <StatusTabs tab={tab} setTab={setTab} countFor={countFor} />
      </SafeAreaView>

      {/* White surface */}
      <View style={{ flex: 1, backgroundColor: "#fafafa", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" }}>
        {/* Orders list */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 130, gap: 14 }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 70 }}>
              <Package size={56} color="#d4d4d4" strokeWidth={1.5} />
              <Text style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>ยังไม่มีคำสั่งซื้อในหมวดนี้</Text>
              <Pressable onPress={() => nav.navigate("Products" as never)} hitSlop={8} className="active:opacity-60" style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 13, color: BRAND_GREEN, fontWeight: "600" }}>เลือกซื้อสินค้า</Text>
              </Pressable>
            </View>
          ) : (
            filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expandedId === order.id}
                onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                onAction={(a) => handleAction(order, a)}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* Review modal */}
      <Modal visible={reviewId !== null} transparent animationType="fade" onRequestClose={() => setReviewId(null)}>
        <Pressable
          onPress={() => setReviewId(null)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 24 }}
        >
          <Pressable onPress={() => {}} style={{ backgroundColor: "#fff", borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#0a0a0a", textAlign: "center" }}>ให้คะแนนสินค้า</Text>
            <Text style={{ fontSize: 12, color: TEXT_MUTED, textAlign: "center", marginTop: 4 }}>แตะดาวเพื่อให้คะแนน</Text>

            <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 14 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} onPress={() => setRating(s)} hitSlop={4} className="active:opacity-70">
                  <Star size={36} color="#f7931d" fill={s <= rating ? "#f7931d" : "transparent"} strokeWidth={1.8} />
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
              {REVIEW_TAGS.map((tg) => (
                <Pressable
                  key={tg}
                  onPress={() => setComment((p) => (p.includes(tg) ? p : (p ? p + " " : "") + tg))}
                  className="active:opacity-70"
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#e5e5e5" }}
                >
                  <Text style={{ fontSize: 12, color: TEXT_SECONDARY }}>{tg}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="เขียนรีวิวของคุณ..."
              placeholderTextColor="#a3a3a3"
              multiline
              style={{ height: 90, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, padding: 12, marginTop: 14, fontSize: 14, color: "#0a0a0a", textAlignVertical: "top" }}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pressable onPress={() => setReviewId(null)} className="flex-1 items-center justify-center active:opacity-70" style={{ height: 46, borderRadius: 999, borderWidth: 1, borderColor: "#e5e5e5" }}>
                <Text style={{ fontSize: 14, color: TEXT_SECONDARY, fontWeight: "600" }}>ยกเลิก</Text>
              </Pressable>
              <Pressable onPress={submitReview} className="flex-1 flex-row items-center justify-center active:opacity-80" style={{ height: 46, borderRadius: 999, backgroundColor: BRAND_GREEN, gap: 6 }}>
                <CheckCircle2 size={17} color="#fff" />
                <Text style={{ fontSize: 14, color: "#fff", fontWeight: "700" }}>ส่งรีวิว</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
