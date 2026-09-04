import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { CheckCheck, Clock, Coffee, Gift, ShoppingBag, Star } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { NotifChip, NotifRow, EmptyNotifs } from "./NotificationScreen";
import type { NotifMeta } from "../data/shopNotifications";
import {
  eventsStore,
  eventsFor,
  isRead,
  markEventRead,
  markAllEventsRead,
  timeAgo,
  type AppEvent,
} from "../store/events";
import { useStore } from "../store/db";
import { flagLateCafeOrders } from "../store/cafe";
import { METAHERB_SHOP } from "../data/shopOrders";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";

/** The café slice of the shop feed — one row style, same as every other feed. */
type CafeNotifType =
  | "cafe_order_placed"
  | "cafe_order_ready"
  | "cafe_order_rated"
  | "cafe_order_late"
  | "cafe_points_redeemed";

// Same shape as TYPE_META/SHOP_TYPE_META: solid = 600-shade (white icon ≥3:1),
// chipBg 50-shade + chipFg 700-shade so the chip label passes AA.
const CAFE_TYPE_META: Record<CafeNotifType, NotifMeta> = {
  cafe_order_placed: { Icon: ShoppingBag, solid: "#2563eb", chipBg: "#eff6ff", chipFg: "#1d4ed8", label: "ออเดอร์ใหม่" },
  cafe_order_ready: { Icon: Coffee, solid: "#059669", chipBg: "#ecfdf5", chipFg: "#15803d", label: "พร้อมเสิร์ฟ" },
  cafe_order_rated: { Icon: Star, solid: "#ea580c", chipBg: "#fff7ed", chipFg: "#c2410c", label: "รีวิว" },
  // Red is the app's urgency colour and this is the one row that is a problem.
  cafe_order_late: { Icon: Clock, solid: "#dc2626", chipBg: "#fef2f2", chipFg: "#b91c1c", label: "เกินเวลา" },
  cafe_points_redeemed: { Icon: Gift, solid: "#9333ea", chipBg: "#faf5ff", chipFg: "#7e22ce", label: "แลกแต้ม" },
};

type FilterTab = "all" | CafeNotifType;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "cafe_order_placed", label: "ออเดอร์ใหม่" },
  { key: "cafe_order_ready", label: "พร้อมเสิร์ฟ" },
  { key: "cafe_order_late", label: "เกินเวลา" },
  { key: "cafe_order_rated", label: "รีวิว" },
  { key: "cafe_points_redeemed", label: "แลกแต้ม" },
];

const isCafeType = (t: AppEvent["type"]): t is CafeNotifType => t in CAFE_TYPE_META;

export function CafeNotificationScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  useStore(eventsStore); // live: a new café order lands in the list instantly
  // Nothing else notices an order running past its promised time, so the feed
  // checks on open and every minute it stays open.
  useEffect(() => {
    flagLateCafeOrders();
    const t = setInterval(() => flagLateCafeOrders(), 60_000);
    return () => clearInterval(t);
  }, []);

  // useStore above re-renders on every log change, so reading the snapshot
  // straight through keeps the list live without a memo to invalidate.
  const events = eventsFor("shop", { shopName: METAHERB_SHOP })
    .filter((e) => isCafeType(e.type))
    .slice(0, 50);

  const [filter, setFilter] = useState<FilterTab>("all");
  const unreadCount = events.filter((e) => !isRead(e, "shop")).length;
  const visible = filter === "all" ? events : events.filter((e) => e.type === filter);

  const markAllRead = () => markAllEventsRead("shop", { shopName: METAHERB_SHOP });

  const filterBar = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}>
      {FILTER_TABS.map((tab) => (
        <NotifChip key={tab.key} label={tab.label} active={filter === tab.key} onPress={() => setFilter(tab.key)} />
      ))}
    </ScrollView>
  );

  const markAllSlot =
    unreadCount > 0 ? (
      <Pressable onPress={markAllRead} hitSlop={8} className="flex-row items-center active:opacity-60" style={{ gap: 4 }}>
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
        title="แจ้งเตือน Meta Cafe"
        subtitle={unreadCount > 0 ? `มี ${unreadCount} รายการที่ยังไม่อ่าน` : "อ่านครบทุกรายการแล้ว"}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={markAllSlot}
        bottomSlot={filterBar}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}>
        {visible.length === 0 ? (
          <EmptyNotifs filtered={filter !== "all"} />
        ) : (
          visible.map((e) => (
            <NotifRow
              key={e.id}
              notif={{ title: e.title, message: e.body, time: timeAgo(e.at), read: isRead(e, "shop") }}
              meta={CAFE_TYPE_META[e.type as CafeNotifType]}
              onPress={() => markEventRead(e.id, "shop")}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
