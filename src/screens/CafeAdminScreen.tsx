import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Clock,
  Coffee,
  Images,
  CreditCard,
  ListOrdered,
  MapPin,
  Stamp,
  Calculator,
  ListPlus,
  Users,
  UtensilsCrossed,
} from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { CafeReportSection, cafeRangeMs, cafeSalesIn } from "./CafeReportView";
import { SalesDatePicker, type DateRange } from "../components/SalesDatePicker";
// Same four periods (and labels) every other report in the app filters by.
import { PERIODS, type Period } from "../data/salesReport";
import { GlassIconButton } from "../components/GlassIconButton";
import { CountBadge } from "../components/CountBadge";
import { showToast } from "../components/Toast";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED, TEXT_SECONDARY, cardShadow } from "../theme/tokens";
import { useStore } from "../store/db";
import { cafeStore, cafeQueue, flagLateCafeOrders } from "../store/cafe";
import { cafeAdminStore, cafeHours, type CafeDayId } from "../store/cafeAdmin";
import { eventsStore, eventsFor, isRead } from "../store/events";
import { METAHERB_SHOP } from "../data/shopOrders";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── quick-menu grid (ตาราง 17.1–17.10) ─────────────────────────
// Same tile geometry as MyShopScreen's ShopMenuGrid (circle 52, 4 per row);
// unbuilt features carry the amber "กำลังพัฒนา" sublabel per convention.
type GridItem = { id: string; label: string; Icon: typeof Coffee; route?: keyof RootStackParamList; dev?: boolean };

const GRID: GridItem[] = [
  { id: "pos", label: "POS ขายหน้าร้าน", Icon: Calculator, route: "CafePos" },        // 17.2
  { id: "queue", label: "คิวออเดอร์", Icon: ListOrdered, route: "CafeQueue" },        // 17.3
  { id: "menu", label: "จัดการเมนู", Icon: UtensilsCrossed, route: "CafeMenuManage" }, // 17.1
  { id: "options", label: "คลังตัวเลือก", Icon: ListPlus, route: "CafeOptions" },      // 17.1 — ตัวเลือกเพิ่มเติมที่ใช้ร่วมทุกเมนู
  { id: "pay", label: "ช่องทางชำระเงิน", Icon: CreditCard, route: "CafePaySettings" }, // 17.4
  { id: "hours", label: "เวลาเปิด-ปิดร้าน", Icon: Clock, route: "CafeHours" },        // เวลาขาย + เวลารับสินค้า (web parity)
  { id: "banner", label: "แบนเนอร์หน้าร้าน", Icon: Images, route: "CafeBanners" },    // web parity: อัพโหลด Banner
  { id: "member", label: "สมาชิก", Icon: Users, route: "CafeMembers" },              // 17.7
  { id: "points", label: "แต้มสะสม", Icon: Stamp, route: "CafePoints" },             // 17.7 — กติกา + ภาพรวมโปรแกรม
  { id: "area", label: "พื้นที่ขาย", Icon: MapPin, route: "CafeArea" },              // 17.9
];

// 4 per row × 2 rows = one page; the rest swipes in from the right.
const GRID_PAGE_SIZE = 8;
const GRID_PAGES: GridItem[][] = [];
for (let i = 0; i < GRID.length; i += GRID_PAGE_SIZE) GRID_PAGES.push(GRID.slice(i, i + GRID_PAGE_SIZE));

function MenuGridTile({ item, onPress }: { item: GridItem; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="active:opacity-60" style={{ width: "25%", alignItems: "center", paddingVertical: 10 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center", opacity: item.dev ? 0.55 : 1 }}>
        <item.Icon size={22} color={BRAND_GREEN_DARK} strokeWidth={2} />
      </View>
      <Text numberOfLines={1} style={{ fontSize: 10.5, color: TEXT_SECONDARY, textAlign: "center", marginTop: 6, maxWidth: "98%" }}>
        {item.label}
      </Text>
      {item.dev ? (
        <Text style={{ fontSize: 8, color: "#f59e0b", marginTop: 1 }}>กำลังพัฒนา</Text>
      ) : null}
    </Pressable>
  );
}

// Queue statuses get their own hues, kept clear of the report's palette below
// (green = ยอดขาย, orange = ออเดอร์/ยอดขายต่อเมนู, gray = คงเหลือ) — the same
// colour meaning two different things on one card is how a reader gets misled.
export const QUEUE_PREP = "#007aff";  // กำลังทำ — the blue this app already uses for
                               // an order being worked on (ORDER_STATUS_CFG.preparing)
export const QUEUE_WAIT = "#8b5cf6";  // รอลูกค้ารับ — made, parked at the counter: a
                               // waiting state, not a finished one
const QUEUE_DONE = "#94a3b8";  // เสร็จแล้ว — slate: done, nothing to act on

/**
 * Today's orders as a donut — one arc per status, in the order work moves
 * through the counter: กำลังทำ → รอลูกค้ารับ → เสร็จแล้ว. The finished slice
 * stays neutral gray so the two that still need a barista keep the colour.
 */
function QueueRing({ preparing, waiting, delivered, size = 40 }: { preparing: number; waiting: number; delivered: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = preparing + waiting + delivered;
  const arc = (n: number) => (total > 0 ? (n / total) * c : 0);
  const angle = (n: number) => (total > 0 ? (n / total) * 360 : 0);
  const segments = [
    { len: arc(preparing), color: QUEUE_PREP, from: -90 },
    { len: arc(waiting), color: QUEUE_WAIT, from: -90 + angle(preparing) },
    { len: arc(delivered), color: QUEUE_DONE, from: -90 + angle(preparing + waiting) },
  ];
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="#e3e6e3" strokeWidth={stroke} fill="none" />
      {segments.map((seg, i) =>
        seg.len > 0 ? (
          <Circle
            key={i}
            cx={size / 2} cy={size / 2} r={r} stroke={seg.color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${seg.len} ${c}`} transform={`rotate(${seg.from} ${size / 2} ${size / 2})`}
          />
        ) : null,
      )}
    </Svg>
  );
}

// ── ภาพรวมวันนี้ card (the flash-sale summary card, café edition) ──
// Same wallet artwork the shop-run flash summary card uses.
const CAFE_ART = require("../../assets/wallet-illust.png");
/** The status pill sits 12 from the right; the art lines up under its centre. */
const STATUS_PILL_RIGHT = 12;
/** A shade deeper than the card gradient, like the countdown blocks on the
 *  flash card (#bc1b06 under its #e62e05 header). */
const STATUS_PILL_BG = "#1b5e35";
/** Sunday-first, to index cafeHours by JS getDay(). */
const DAY_IDS: CafeDayId[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const hhmm = (d: Date): string => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/**
 * หลังบ้าน Meta Cafe — the café admin console (ตาราง 17: งานหลังบ้าน META Caffe).
 *
 * META Caffe is run by Metaherb centrally (not by individual shops — see the
 * SHOP_MENU_GRID comment in MyShopScreen), so the back office lives outside the
 * seller console. This hub gives the barista/admin: live queue status +
 * new-order alerts (17.10), today's numbers, and the quick-menu grid into the
 * POS (17.2), queue (17.3), menu manager (17.1) and payment channels (17.4).
 */
export function CafeAdminScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  useStore(cafeStore); // live: new orders bump the queue card + KPIs instantly
  const adminState = useStore(cafeAdminStore);
  useStore(eventsStore);
  const queue = cafeQueue(METAHERB_SHOP);
  const preparing = queue.filter((o) => o.status === "preparing").length;
  const waiting = queue.length - preparing;

  // ช่วงเวลาที่กำลังดู — the card and everything under it read from this one
  // pair, so switching period moves the whole console together.
  const [period, setPeriod] = useState<Period>("daily");
  const [range, setRange] = useState<DateRange>(() => {
    const d = new Date();
    const today = { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() + 543 };
    return { start: today, end: today };
  });
  const { from: rangeFrom, to: rangeTo } = cafeRangeMs(period, range);

  // 17.10 — in-app new-order alert: toast + haptic the moment an order lands
  // while the console is open (the push/Live-Activity path already covers the
  // customer side; this is the shop side of the same event).
  const orderCount = cafeStore.get().length;
  const prevCount = useRef(orderCount);
  useEffect(() => {
    if (orderCount > prevCount.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast("ออเดอร์คาเฟ่เข้าใหม่ ☕", "info");
    }
    prevCount.current = orderCount;
  }, [orderCount]);

  // ยอดขายของช่วงที่เลือก, derived from the shared order store (no report DB).
  const periodSales = useMemo(
    () => cafeSalesIn(cafeStore.get(), rangeFrom, rangeTo),
    [orderCount, queue, rangeFrom, rangeTo],
  );

  // เสร็จแล้ววันนี้ — cafeQueue drops picked_up orders, so count them here.
  const delivered = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return cafeStore.get().filter((o) => o.shopName === METAHERB_SHOP && o.status === "picked_up" && o.readyAt >= start.getTime()).length;
  }, [orderCount, queue]);

  // ร้านเปิดอยู่ไหม — from ตั้งค่าเวลาเปิด-ปิดร้าน, shown on the summary card.
  const now = new Date();
  const todayHours = cafeHours(adminState)[DAY_IDS[now.getDay()]];
  const nowHM = hhmm(now);
  const shopOpen = todayHours.enabled && nowHM >= todayHours.open && nowHM < todayHours.close;

  // Paged quick-menu — width measured once so each page is exactly one screen.
  const [gridW, setGridW] = useState(0);
  const [gridPage, setGridPage] = useState(0);

  // Café events for the shop audience — the badge behind the header bell.
  // The feed itself (17.10) is a full page, CafeNotification, so it reads the
  // same as every other notification screen in the app.
  // Raise late-order flags before counting, so the badge is honest even if the
  // feed has never been opened.
  useEffect(() => {
    flagLateCafeOrders();
    const t = setInterval(() => flagLateCafeOrders(), 60_000);
    return () => clearInterval(t);
  }, []);
  const cafeEvents = eventsFor("shop", { shopName: METAHERB_SHOP })
    .filter((e) => e.type.startsWith("cafe_"))
    .slice(0, 20);
  const unreadCafe = cafeEvents.filter((e) => !isRead(e, "shop")).length;

  const openGridItem = (item: GridItem) => {
    if (item.dev || !item.route) {
      showToast("ฟีเจอร์นี้กำลังพัฒนา", "info");
      return;
    }
    nav.navigate(item.route as never);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="หลังบ้าน Meta Cafe"
        subtitle={shopOpen ? `เปิดอยู่ · ปิด ${todayHours.close} น.` : todayHours.enabled ? `ปิดอยู่ · เปิด ${todayHours.open} น.` : "วันนี้ร้านปิด"}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={
          <View>
            <GlassIconButton onPress={() => nav.navigate("CafeNotification")} accessibilityLabel="แจ้งเตือน">
              <Bell size={20} color="#1a1a1a" strokeWidth={2.2} />
            </GlassIconButton>
            {unreadCafe > 0 ? (
              <View pointerEvents="none" style={{ position: "absolute", top: -3, right: -3 }}>
                <CountBadge count={unreadCafe} />
              </View>
            ) : null}
          </View>
        }
      />

      <View style={{ flex: 1 }}>
      {/* paddingTop clears the 28pt header fade below — otherwise the first
            card starts under it and its top edge reads washed-out. */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 30, paddingBottom: 32 + insets.bottom, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* Quick menu — every ตาราง-17 job, 2 rows per page, swiped sideways
            (the same paged grid + dots as MyShop's ShopMenuGrid) */}
        <View style={{ paddingVertical: 2, marginHorizontal: -4 }}>
          <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
            {gridW > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setGridPage(Math.round(e.nativeEvent.contentOffset.x / gridW))}
              >
                {GRID_PAGES.map((pg, pi) => (
                  <View key={pi} style={{ width: gridW, flexDirection: "row", flexWrap: "wrap" }}>
                    {pg.map((item) => (
                      <MenuGridTile key={item.id} item={item} onPress={() => openGridItem(item)} />
                    ))}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={{ height: 168 }} />
            )}
          </View>
          {GRID_PAGES.length > 1 ? (
            <View className="flex-row items-center justify-center" style={{ gap: 6, marginTop: 6, marginBottom: 2 }}>
              {GRID_PAGES.map((_, i) => (
                <View key={i} style={{ width: i === gridPage ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === gridPage ? BRAND_GREEN : "#d4d4d4" }} />
              ))}
            </View>
          ) : null}
        </View>

        {/* ภาพรวมวันนี้ — the flash-sale summary card, reused verbatim: green
            gradient head (art bottom-right, status pill top-right, ยอดขาย in
            26pt) over a white half that carries the live queue (its own tap
            target → the barista queue). */}
        <View style={{ borderRadius: 24, backgroundColor: "#fff", ...cardShadow(3) }}>
          <LinearGradient colors={[BRAND_GREEN_DARK, BRAND_GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 24, padding: 14, gap: 8, overflow: "hidden" }}>
            {/* Placed exactly as on the flash summary card — the wallet PNG
                carries transparent padding, so it renders larger and lower for
                its VISIBLE size to match. */}
            <Image source={CAFE_ART} style={{ position: "absolute", right: -2, bottom: -14, width: 136, height: 136, opacity: 0.95 }} resizeMode="contain" />
            <View style={{ gap: 2, alignItems: "flex-start" }}>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }} numberOfLines={1}>ภาพรวม{PERIODS.find((p) => p.id === period)?.label}</Text>
              {/* The scope IS the control — tapping the date opens the app's
                  wheel range picker, and the whole console follows it. */}
              <SalesDatePicker
                period={period}
                sel={range}
                onChange={setRange}
                renderTrigger={(label, open) => (
                  <Pressable onPress={open} hitSlop={8} className="flex-row items-center active:opacity-70" style={{ gap: 6 }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "rgba(255,255,255,0.95)" }}>{label}</Text>
                    <ChevronDown size={16} color="rgba(255,255,255,0.9)" strokeWidth={2.6} />
                  </Pressable>
                )}
              />
            </View>
            {/* Top-right = ช่วงเวลา. Same deep-green capsule the status pill
                used to sit in; the chosen segment flips to white so it reads as
                selected against it. */}
            <View className="flex-row" style={{ position: "absolute", top: 12, right: STATUS_PILL_RIGHT, backgroundColor: STATUS_PILL_BG, borderRadius: 999, padding: 3, gap: 2 }}>
              {PERIODS.map(({ id, label }) => {
                const active = period === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setPeriod(id)}
                    hitSlop={4}
                    className="items-center justify-center active:opacity-80"
                    style={{ paddingHorizontal: 9, height: 22, borderRadius: 999, backgroundColor: active ? "#fff" : "transparent" }}
                  >
                    {/* The shared labels read "รายวัน / รายเดือน"; on a segment
                        this small the prefix is noise, so it's trimmed here
                        while the list itself stays the app-wide one. */}
                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: active ? STATUS_PILL_BG : "rgba(255,255,255,0.75)" }}>{label.replace("ราย", "")}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>ยอดขาย</Text>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>฿{periodSales.toLocaleString()}</Text>
          </LinearGradient>

          {/* คิวออเดอร์ — the live queue rides in the card's white half, so the
              day's money and the work still on the counter read as one thing.
              Its own tap target: straight to the barista queue (17.3). */}
          <Pressable
            onPress={() => nav.navigate("CafeQueue")}
            className="flex-row items-center active:opacity-70"
            style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 12 }}
          >
            <QueueRing preparing={preparing} waiting={waiting} delivered={delivered} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#0a0a0a" }}>
                {queue.length > 0 ? `คิวออเดอร์ ${queue.length} รายการ` : delivered > 0 ? `เสร็จแล้ว ${delivered} รายการ` : "คิวว่าง"}
              </Text>
              {queue.length > 0 || delivered > 0 ? (
                <View className="flex-row items-center" style={{ gap: 10, marginTop: 3, flexWrap: "wrap", rowGap: 2 }}>
                  <View className="flex-row items-center" style={{ gap: 5 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: QUEUE_PREP }} />
                    <Text style={{ fontSize: 12.5, lineHeight: 15, includeFontPadding: false, color: TEXT_MUTED }}>กำลังทำ {preparing}</Text>
                  </View>
                  <View className="flex-row items-center" style={{ gap: 5 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: QUEUE_WAIT }} />
                    <Text style={{ fontSize: 12.5, lineHeight: 15, includeFontPadding: false, color: TEXT_MUTED }}>รอลูกค้ารับ {waiting}</Text>
                  </View>
                  {delivered > 0 ? (
                    <View className="flex-row items-center" style={{ gap: 5 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: QUEUE_DONE }} />
                      <Text style={{ fontSize: 12.5, lineHeight: 15, includeFontPadding: false, color: TEXT_MUTED }}>เสร็จแล้ว {delivered}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }} numberOfLines={1}>ยังไม่มีออเดอร์เข้ามาวันนี้</Text>
              )}
            </View>
            <ChevronRight size={20} color="#c4c4c4" strokeWidth={2.4} />
          </Pressable>
        </View>

        {/* รายงานยอดขาย (17.5) — inline, straight under the ยอดขาย card */}
        <CafeReportSection period={period} range={range} />


      </ScrollView>
      <HeaderFade />
      </View>

    </View>
  );
}
