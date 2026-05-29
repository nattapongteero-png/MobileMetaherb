import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  Bell,
  CheckCheck,
  Megaphone,
  MessageCircle,
  Monitor,
  Package,
} from "lucide-react-native";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";

// Same 4 types + colour scheme as the web NotificationDropdown so the look
// stays consistent across surfaces.
type NotifType = "order" | "promo" | "system" | "chat";

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
  system: { Icon: Monitor, solid: "#9333ea", chipBg: "#faf5ff", chipFg: "#7e22ce", label: "ระบบ" },
  chat: { Icon: MessageCircle, solid: "#059669", chipBg: "#ecfdf5", chipFg: "#15803d", label: "แชท" },
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
    type: "order",
    title: "ยืนยันการชำระเงินสำเร็จ",
    message:
      "คำสั่งซื้อ ORD-20260218-03572 ชำระเงินสำเร็จ กำลังจัดเตรียมสินค้า",
    time: "6 ชม. ที่แล้ว",
    read: true,
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

type FilterTab = "all" | "unread";

export function NotificationScreen() {
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState<Notif[]>(SEED_NOTIFS);
  const [filter, setFilter] = useState<FilterTab>("all");

  const unreadCount = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);

  const visible = useMemo(
    () => (filter === "unread" ? notifs.filter((n) => !n.read) : notifs),
    [notifs, filter],
  );

  const markAsRead = (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <PageHeader
        title="การแจ้งเตือน"
        subtitle={unreadCount > 0 ? `(${unreadCount} ยังไม่อ่าน)` : undefined}
        rightSlot={
          unreadCount > 0 ? (
            <Pressable
              onPress={markAllRead}
              hitSlop={8}
              className="flex-row items-center active:opacity-60"
              style={{ gap: 4, paddingHorizontal: 8, paddingVertical: 6 }}
            >
              <CheckCheck size={16} color="#319754" />
              <Text style={{ color: BRAND_GREEN_DARK, fontSize: 13, fontWeight: "500" }}>
                อ่านทั้งหมด
              </Text>
            </Pressable>
          ) : null
        }
      />

      {/* Filter tabs — rendered as a sibling of ScrollView (NOT a sticky
          header inside it) so iOS bounce/overscroll on the list doesn't
          drag the tabs along. They stay truly fixed below the header. */}
      <View
        className="flex-row"
        style={{
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: 10,
          gap: 8,
          backgroundColor: "#fafafa",
          borderBottomWidth: 1,
          borderBottomColor: "#f0f0f0",
        }}
      >
          {(
            [
              { key: "all", label: "ทั้งหมด", count: notifs.length },
              { key: "unread", label: "ยังไม่อ่าน", count: unreadCount },
            ] as const
          ).map((tab) => {
            const active = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setFilter(tab.key)}
                className="flex-row items-center active:opacity-70"
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: active ? "#319754" : "white",
                  borderWidth: 1,
                  borderColor: active ? "#319754" : "#e5e7eb",
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: active ? "600" : "500",
                    color: active ? "white" : "#525252",
                  }}
                >
                  {tab.label}
                </Text>
                <View
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    paddingHorizontal: 5,
                    backgroundColor: active ? "rgba(255,255,255,0.25)" : "#f5f5f5",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: active ? "white" : "#737373",
                      includeFontPadding: false,
                      lineHeight: 12,
                    }}
                  >
                    {tab.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 16 + insets.bottom,
        }}
      >
        {visible.length === 0 ? (
          <EmptyNotifs unreadFilter={filter === "unread"} />
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
        backgroundColor: unread ? "rgba(49,151,84,0.08)" : "white",
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
                backgroundColor: "#319754",
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

function EmptyNotifs({ unreadFilter }: { unreadFilter: boolean }) {
  return (
    <EmptyState
      icon={<Bell size={36} color="#d4d4d4" />}
      title={unreadFilter ? "อ่านครบทุกข้อความแล้ว" : "ยังไม่มีการแจ้งเตือน"}
      subtitle={
        unreadFilter
          ? "เรียบร้อย! เราจะแจ้งให้ทราบเมื่อมีอะไรใหม่"
          : "การแจ้งเตือนสำคัญจะปรากฏที่นี่"
      }
    />
  );
}
