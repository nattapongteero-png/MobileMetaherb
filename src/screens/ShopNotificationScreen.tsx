import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { CheckCheck } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { NotifChip, NotifRow, EmptyNotifs } from "./NotificationScreen";
import { SHOP_NOTIF_SEED, SHOP_TYPE_META, SHOP_FILTER_TABS, type ShopNotif, type ShopNotifType } from "../data/shopNotifications";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";

type FilterTab = "all" | ShopNotifType;

export function ShopNotificationScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const [notifs, setNotifs] = useState<ShopNotif[]>(SHOP_NOTIF_SEED);
  const [filter, setFilter] = useState<FilterTab>("all");

  const unreadCount = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);
  const visible = useMemo(
    () => (filter === "all" ? notifs : notifs.filter((n) => n.type === filter)),
    [notifs, filter],
  );

  const markAsRead = (id: string) => setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));

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
