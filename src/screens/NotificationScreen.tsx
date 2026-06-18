import { useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { useNavigation } from "@react-navigation/native";
import {
  Bell,
  CheckCheck,
  Megaphone,
  MessageCircle,
  Sparkles,
  Package,
  Wallet,
} from "lucide-react-native";
import { EmptyState } from "../components/EmptyState";
import { SubPageHeader } from "../components/SubPageHeader";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";

type NotifType = "order" | "promo" | "chat" | "system" | "payment";

type Notif = {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const TYPE_META: Record<
  NotifType,
  {
    Icon: typeof Package;
    /** Solid color for the round icon circle (used with white icon, ≥3:1). */
    solid: string;
    /** Tint bg for the chip pill. */
    chipBg: string;
    /** Text color for the chip label (≥4.5:1 on chipBg). */
    chipFg: string;
    label: string;
  }
> = {
  // solid = Tailwind 600-shade (clear UI affordance with white icon: ≥3:1).
  // chipBg = 50-shade tint + chipFg = 700-shade for AA-passing chip text.
  order: { Icon: Package, solid: "#2563eb", chipBg: "#eff6ff", chipFg: "#1d4ed8", label: "คำสั่งซื้อ" },
  promo: { Icon: Megaphone, solid: "#ea580c", chipBg: "#fff7ed", chipFg: "#c2410c", label: "โปรโมชั่น" },
  chat: { Icon: MessageCircle, solid: "#059669", chipBg: "#ecfdf5", chipFg: "#15803d", label: "ข้อความ" },
  system: { Icon: Sparkles, solid: "#9333ea", chipBg: "#faf5ff", chipFg: "#7e22ce", label: "อัพเดทจากเมต้า" },
  payment: { Icon: Wallet, solid: "#0d9488", chipBg: "#f0fdfa", chipFg: "#0f766e", label: "การเงิน" },
};

// Mirrors the seed data in the web's NotificationContext.
const SEED_NOTIFS: Notif[] = [
  {
    id: "n1",
    type: "order",
    title: "คำสั่งซื้อจัดส่งแล้ว",
    message:
      "คำสั่งซื้อ ORD-20260218-03573 ถูกจัดส่งแล้ว หมายเลขพัสดุ TH123456789",
    time: "5 นาทีที่แล้ว",
    read: false,
  },
  {
    id: "n2",
    type: "promo",
    title: "🔥 Flash Sale เริ่มแล้ว!",
    message: "ลดสูงสุด 70% สินค้าสมุนไพรคุณภาพ วันนี้เท่านั้น!",
    time: "1 ชม. ที่แล้ว",
    read: false,
  },
  {
    id: "n3",
    type: "promo",
    title: "คูปองส่วนลดพิเศษ",
    message: "คุณได้รับคูปองลด 100 บาท ใช้ได้ถึง 31 มี.ค. 2569",
    time: "3 ชม. ที่แล้ว",
    read: false,
  },
  {
    id: "n4",
    type: "payment",
    title: "ยืนยันการชำระเงินสำเร็จ",
    message:
      "คำสั่งซื้อ ORD-20260218-03572 ชำระเงินสำเร็จ กำลังจัดเตรียมสินค้า",
    time: "6 ชม. ที่แล้ว",
    read: true,
  },
  {
    id: "n7",
    type: "payment",
    title: "คืนเงินสำเร็จ",
    message: "คืนเงิน ฿250 เข้าบัญชีของคุณแล้ว จากการยกเลิกคำสั่งซื้อ ORD-20260215-02901",
    time: "3 วันที่แล้ว",
    read: false,
  },
  {
    id: "n5",
    type: "chat",
    title: "ข้อความจาก METAHERB Store",
    message: "สินค้าจัดเตรียมเรียบร้อยแล้วค่ะ จะจัดส่งภายในวันนี้",
    time: "1 วันที่แล้ว",
    read: true,
  },
  {
    id: "n6",
    type: "system",
    title: "ยินดีต้อนรับสู่ MetaHerb!",
    message: "ขอบคุณที่สมัครสมาชิก รับส่วนลด 50 บาทสำหรับการสั่งซื้อครั้งแรก",
    time: "2 วันที่แล้ว",
    read: true,
  },
];

type FilterTab = "all" | NotifType;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "order", label: "คำสั่งซื้อ" },
  { key: "promo", label: "โปรโมชั่น" },
  { key: "chat", label: "ข้อความ" },
  { key: "system", label: "อัพเดทจากเมต้า" },
  { key: "payment", label: "การเงิน" },
];

// Liquid Glass category chip — same look/feel as the Products page chips.
function NotifChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, friction: 5, tension: 220 }).start();
  return (
    <Pressable onPress={onPress} hitSlop={4} onPressIn={() => spring(0.92)} onPressOut={() => spring(1)}>
      <Animated.View style={{ transform: [{ scale }] }}>
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
            borderWidth: 1,
            borderColor: active ? "rgba(49,151,84,0.45)" : "rgba(0,0,0,0.06)",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? BRAND_GREEN_DARK : "#374151" }}>
            {label}
          </Text>
        </GlassView>
      </Animated.View>
    </Pressable>
  );
}

export function NotificationScreen() {
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState<Notif[]>(SEED_NOTIFS);
  const [filter, setFilter] = useState<FilterTab>("all");

  const unreadCount = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);

  const visible = useMemo(
    () => (filter === "all" ? notifs : notifs.filter((n) => n.type === filter)),
    [notifs, filter],
  );

  const nav = useNavigation();

  const markAsRead = (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Horizontal category chips, fixed under the header (same role as the
  // product-kind chips on the Products page).
  const filterBar = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 8 }}
    >
      {FILTER_TABS.map((tab) => (
        <NotifChip
          key={tab.key}
          label={tab.label}
          active={filter === tab.key}
          onPress={() => setFilter(tab.key)}
        />
      ))}
    </ScrollView>
  );

  // "Mark all read" replaces the cart action in the header's right slot.
  const markAllSlot =
    unreadCount > 0 ? (
      <Pressable
        onPress={markAllRead}
        hitSlop={8}
        className="flex-row items-center active:opacity-60"
        style={{ gap: 4 }}
      >
        <CheckCheck size={16} color={BRAND_GREEN} />
        <Text style={{ color: BRAND_GREEN_DARK, fontSize: 13, fontWeight: "600" }}>อ่านทั้งหมด</Text>
      </Pressable>
    ) : (
      <View />
    );

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader
        title="การแจ้งเตือน"
        subtitle={unreadCount > 0 ? `มี ${unreadCount} รายการที่ยังไม่อ่าน` : "อ่านครบทุกรายการแล้ว"}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={markAllSlot}
        bottomSlot={filterBar}
      />

      {/* List */}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 16 + insets.bottom,
        }}
      >
        {visible.length === 0 ? (
          <EmptyNotifs filtered={filter !== "all"} />
        ) : (
          visible.map((n) => (
            <NotifRow key={n.id} notif={n} onPress={() => markAsRead(n.id)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function NotifRow({ notif, onPress }: { notif: Notif; onPress: () => void }) {
  const meta = TYPE_META[notif.type];
  const { Icon } = meta;
  const unread = !notif.read;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row active:bg-gray-100"
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
        backgroundColor: "transparent",
        borderBottomWidth: 1,
        borderBottomColor: "#f5f5f5",
      }}
    >
      {/* Type icon — solid colored circle with white icon for a vibrant,
          immediately-readable type signal (≥3:1 against the white icon). */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: meta.solid,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={18} color="white" strokeWidth={2.4} />
      </View>

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View className="flex-row items-start" style={{ gap: 8 }}>
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              // Stronger weight contrast between unread/read so visual hierarchy
              // is felt at a glance (700 vs 400 — was 600 vs 500).
              fontWeight: unread ? "700" : "400",
              color: unread ? "#0a0a0a" : "#525252",
              lineHeight: 20,
            }}
            numberOfLines={2}
          >
            {notif.title}
          </Text>
          {unread ? (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#ef4444",
                marginTop: 6,
              }}
            />
          ) : null}
        </View>

        <Text
          style={{
            fontSize: 13,
            color: "#737373",
            marginTop: 2,
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {notif.message}
        </Text>

        <View
          className="flex-row items-center"
          style={{ marginTop: 6, gap: 8 }}
        >
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: meta.chipBg,
            }}
          >
            <Text style={{ fontSize: 10, color: meta.chipFg, fontWeight: "600" }}>
              {meta.label}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{notif.time}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyNotifs({ filtered }: { filtered: boolean }) {
  return (
    <EmptyState
      icon={<Bell size={36} color="#d4d4d4" />}
      title={filtered ? "ไม่มีการแจ้งเตือนในหมวดนี้" : "ยังไม่มีการแจ้งเตือน"}
      subtitle={
        filtered
          ? "ลองเลือกหมวดอื่น หรือกลับมาดูใหม่ภายหลัง"
          : "การแจ้งเตือนสำคัญจะปรากฏที่นี่"
      }
    />
  );
}
