import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Animated, Image, Easing } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Bell,
  CheckCheck,
  Megaphone,
  MessageCircle,
  Sparkles,
  Package,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { EmptyState } from "../components/EmptyState";
import { SubPageHeader } from "../components/SubPageHeader";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import { SHOP_TYPE_META, type NotifMeta } from "../data/shopNotifications";
import {
  readAllNotifications,
  readNotification,
  useCustomerNotifications,
  useShopNotifications,
  type CustomerNotif,
  type CustomerNotifType,
} from "../data/notificationView";
import { METAHERB_SHOP } from "../data/shopOrders";
import { currentUserId } from "../store/session";
import type { RootStackParamList } from "../navigation/RootStack";
import { isTablet } from "../theme/layout";

const SHOP_OPEN = require("../../assets/shop-open.png");

type Nav = NativeStackNavigationProp<RootStackParamList>;
type NotifType = CustomerNotifType;
type Notif = CustomerNotif;

const TYPE_META: Record<NotifType, NotifMeta> = {
  // solid = Tailwind 600-shade (clear UI affordance with white icon: ≥3:1).
  // chipBg = 50-shade tint + chipFg = 700-shade for AA-passing chip text.
  order: { Icon: Package, solid: "#2563eb", chipBg: "#eff6ff", chipFg: "#1d4ed8", label: "คำสั่งซื้อ" },
  promo: { Icon: Megaphone, solid: "#ea580c", chipBg: "#fff7ed", chipFg: "#c2410c", label: "โปรโมชั่น" },
  chat: { Icon: MessageCircle, solid: "#059669", chipBg: "#ecfdf5", chipFg: "#15803d", label: "ข้อความ" },
  system: { Icon: Sparkles, solid: "#9333ea", chipBg: "#faf5ff", chipFg: "#7e22ce", label: "อัพเดทจากเมต้า" },
  payment: { Icon: Wallet, solid: "#0d9488", chipBg: "#f0fdfa", chipFg: "#0f766e", label: "การเงิน" },
};

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
export function NotifChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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

/** Card entry (above the filter chips) linking to the shop-side notifications. */
function ShopNotifCard({ count, items, onPress }: { count: number; items: TickerItem[]; onPress: () => void }) {
  // iPad gets a taller banner + bigger storefront art; phones keep the original.
  const tablet = isTablet();
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-90"
      style={{ borderRadius: 16, overflow: "hidden", shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 }}
    >
      <LinearGradient
        colors={[BRAND_GREEN, BRAND_GREEN_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          minHeight: tablet ? 104 : 80,
          justifyContent: "center",
          paddingVertical: tablet ? 16 : 12,
          paddingLeft: 16,
          paddingRight: tablet ? 118 : 96,
        }}
      >
        {/* Storefront art — bleeds off the bottom-right */}
        <Image
          source={SHOP_OPEN}
          style={
            tablet
              ? { position: "absolute", right: 4, bottom: -14, width: 116, height: 116 }
              : { position: "absolute", right: 2, bottom: -12, width: 92, height: 92 }
          }
          resizeMode="contain"
        />
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Text style={{ fontSize: tablet ? 17 : 15, fontWeight: "800", color: "#fff" }}>การแจ้งเตือนร้านค้า</Text>
          {count > 0 ? (
            <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff", lineHeight: 15 }}>{count > 99 ? "99+" : count}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ marginTop: 12 }}>
          {items.length > 0 ? (
            <VerticalTicker items={items} />
          ) : (
            <Text numberOfLines={1} style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>อ่านครบทุกรายการแล้ว</Text>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const TICKER_LINE = 18;
type TickerItem = { Icon: LucideIcon; text: string };

// Drop any leading emoji/symbols (the ticker already shows a category icon).
const stripLeadingEmoji = (s: string) =>
  s.replace(/^[^\p{L}\p{N}]+/u, "");

function TickerLine({ item }: { item: TickerItem }) {
  return (
    <View style={{ height: TICKER_LINE, flexDirection: "row", alignItems: "center", gap: 6 }}>
      <item.Icon size={13} color="#fff" strokeWidth={2.4} />
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.92)", lineHeight: TICKER_LINE }}>{item.text}</Text>
    </View>
  );
}

/** Vertical run-loop ticker — one Animated value scrolls through every line and
 *  wraps seamlessly (a duplicate of the first line sits at the end), driven on
 *  the native thread with no per-step React re-render → no stutter. Each line
 *  shows the category's white icon. */
function VerticalTicker({ items }: { items: TickerItem[] }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (items.length <= 1) return;
    anim.setValue(0);
    // Hold each line, then slide to the next; the last slide lands on the
    // duplicated first line so the loop reset back to 0 is invisible.
    const steps = items.map((_, k) =>
      Animated.sequence([
        Animated.delay(2200),
        Animated.timing(anim, {
          toValue: -TICKER_LINE * (k + 1),
          duration: 480,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    const loop = Animated.loop(Animated.sequence(steps), { resetBeforeIteration: true });
    loop.start();
    return () => loop.stop();
  }, [items, anim]);

  if (items.length === 0) return null;
  if (items.length === 1) return <TickerLine item={items[0]} />;

  const lines = [...items, items[0]];
  return (
    <View style={{ height: TICKER_LINE, overflow: "hidden" }}>
      <Animated.View style={{ transform: [{ translateY: anim }] }}>
        {lines.map((m, i) => (
          <TickerLine key={i} item={m} />
        ))}
      </Animated.View>
    </View>
  );
}

export function NotificationScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  // Real events first (order shipped, refund decided, trial approved…), then the
  // demo rows. Nothing here is invented: every live row had a domain action behind it.
  const live = useCustomerNotifications();
  const shopNotifs = useShopNotifications(METAHERB_SHOP);
  // Seed rows have no backing event, so their read state stays local.
  const [readSeeds, setReadSeeds] = useState<Set<string>>(new Set());
  const notifs = useMemo(
    () => live.map((n) => (readSeeds.has(n.id) ? { ...n, read: true } : n)),
    [live, readSeeds],
  );
  const [filter, setFilter] = useState<FilterTab>("all");

  const unreadCount = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);
  const shopUnreadItems = useMemo(() => shopNotifs.filter((n) => !n.read), [shopNotifs]);
  const shopTickerItems = useMemo(
    () => shopUnreadItems.map((n) => ({ Icon: SHOP_TYPE_META[n.type].Icon, text: stripLeadingEmoji(n.title) })),
    [shopUnreadItems],
  );

  const visible = useMemo(
    () => (filter === "all" ? notifs : notifs.filter((n) => n.type === filter)),
    [notifs, filter],
  );

  const markAsRead = (id: string) => {
    if (!readNotification(id, "customer")) setReadSeeds((prev) => new Set(prev).add(id));
  };
  const markAllRead = () => {
    readAllNotifications("customer", { userId: currentUserId() });
    setReadSeeds(new Set(notifs.map((n) => n.id)));
  };

  // Shop-notifications card sits ABOVE the category chips, both fixed under the header.
  const headerBottom = (
    <View style={{ gap: 12 }}>
      <ShopNotifCard count={shopUnreadItems.length} items={shopTickerItems} onPress={() => nav.navigate("ShopNotification")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}>
        {FILTER_TABS.map((tab) => (
          <NotifChip key={tab.key} label={tab.label} active={filter === tab.key} onPress={() => setFilter(tab.key)} />
        ))}
      </ScrollView>
    </View>
  );

  // "Mark all read" replaces the cart action in the header's right slot.
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
        title="การแจ้งเตือน"
        subtitle={unreadCount > 0 ? `มี ${unreadCount} รายการที่ยังไม่อ่าน` : "อ่านครบทุกรายการแล้ว"}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={markAllSlot}
        bottomSlot={headerBottom}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}>
        {visible.length === 0 ? (
          <EmptyNotifs filtered={filter !== "all"} />
        ) : (
          visible.map((n) => (
            <NotifRow key={n.id} notif={n} meta={TYPE_META[n.type]} onPress={() => markAsRead(n.id)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

export function NotifRow({ notif, meta, onPress }: { notif: { title: string; message: string; time: string; read: boolean }; meta: NotifMeta; onPress: () => void }) {
  const { Icon } = meta;
  const unread = !notif.read;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row active:bg-gray-100"
      style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12, backgroundColor: "transparent", borderBottomWidth: 1, borderBottomColor: "#f5f5f5" }}
    >
      {/* Type icon — solid colored circle with white icon (≥3:1 against white). */}
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: meta.solid, alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color="white" strokeWidth={2.4} />
      </View>

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View className="flex-row items-start" style={{ gap: 8 }}>
          <Text
            style={{ flex: 1, fontSize: 14, fontWeight: unread ? "700" : "400", color: unread ? "#0a0a0a" : "#525252", lineHeight: 20 }}
            numberOfLines={2}
          >
            {notif.title}
          </Text>
          {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444", marginTop: 6 }} /> : null}
        </View>

        <Text style={{ fontSize: 13, color: "#737373", marginTop: 2, lineHeight: 18 }} numberOfLines={2}>
          {notif.message}
        </Text>

        <View className="flex-row items-center" style={{ marginTop: 6, gap: 8 }}>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: meta.chipBg }}>
            <Text style={{ fontSize: 10, color: meta.chipFg, fontWeight: "600" }}>{meta.label}</Text>
          </View>
          <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{notif.time}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function EmptyNotifs({ filtered }: { filtered: boolean }) {
  return (
    <EmptyState
      icon={<Bell size={36} color="#d4d4d4" />}
      title={filtered ? "ไม่มีการแจ้งเตือนในหมวดนี้" : "ยังไม่มีการแจ้งเตือน"}
      subtitle={filtered ? "ลองเลือกหมวดอื่น หรือกลับมาดูใหม่ภายหลัง" : "การแจ้งเตือนสำคัญจะปรากฏที่นี่"}
    />
  );
}
