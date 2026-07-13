import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { CheckCheck } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { NotifChip, NotifRow, EmptyNotifs } from "./NotificationScreen";
import { SHOP_TYPE_META, SHOP_FILTER_TABS, type ShopNotifType } from "../data/shopNotifications";
import {
  readAllNotifications,
  readNotification,
  useShopNotifications,
} from "../data/notificationView";
import { METAHERB_SHOP } from "../data/shopOrders";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";

type FilterTab = "all" | ShopNotifType;

export function ShopNotificationScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  // Live events (new order, low stock, complaint filed, RFQ…) ahead of the demo
  // rows. The seed list used to be the entire feed.
  const live = useShopNotifications(METAHERB_SHOP);
  // Seed rows have no backing event, so their read state stays local.
  const [readSeeds, setReadSeeds] = useState<Set<string>>(new Set());
  const notifs = useMemo(
    () => live.map((n) => (readSeeds.has(n.id) ? { ...n, read: true } : n)),
    [live, readSeeds],
  );
  const [filter, setFilter] = useState<FilterTab>("all");

  const unreadCount = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);
  const visible = useMemo(
    () => (filter === "all" ? notifs : notifs.filter((n) => n.type === filter)),
    [notifs, filter],
  );

  const markAsRead = (id: string) => {
    if (!readNotification(id, "shop")) setReadSeeds((prev) => new Set(prev).add(id));
  };
  const markAllRead = () => {
    readAllNotifications("shop", { shopName: METAHERB_SHOP });
    setReadSeeds(new Set(notifs.map((n) => n.id)));
  };

  const filterBar = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}>
      {SHOP_FILTER_TABS.map((tab) => (
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
        title="การแจ้งเตือนร้านค้า"
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
          visible.map((n) => (
            <NotifRow key={n.id} notif={n} meta={SHOP_TYPE_META[n.type]} onPress={() => markAsRead(n.id)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}
