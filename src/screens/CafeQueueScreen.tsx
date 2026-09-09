import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Check, Clock, Coffee, Gift, HandPlatter } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { CountBadge } from "../components/CountBadge";
import { EmptyState } from "../components/EmptyState";
import { showToast } from "../components/Toast";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { QUEUE_PREP, QUEUE_WAIT } from "./CafeAdminScreen";
import { useStore } from "../store/db";
import { cafeQueue, cafeStore, completeCafeOrder, markCafeReady, type CafeOrder } from "../store/cafe";
import { METAHERB_SHOP } from "../data/shopOrders";

type FilterTab = "all" | "preparing" | "ready";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "preparing", label: "กำลังทำ" },
  { key: "ready", label: "พร้อมรับ" },
];

const minutesLeft = (readyAt: number): number => Math.max(0, Math.round((readyAt - Date.now()) / 60000));

const CHIP_H = 34;
/** Badge diameter, and where it sits so the chip's edge runs through its
 *  middle. Derived, not eyeballed, so both stay right if either changes. */
const BADGE = 18;
const BADGE_OFFSET = CHIP_H / 2 - CHIP_H / 2 / Math.SQRT2 - BADGE / 2;

function Chip({ label, count, active, onPress }: {
  label: string;
  /** How many orders this tab holds — a barista wants to know before tapping. */
  count?: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    /* The badge rides the chip's corner, the way it rides the queue icon in the
       POS header — same shape, same red, so "there is something here" reads the
       same wherever it appears. */
    <View>
      <Pressable
        onPress={onPress}
        className="active:opacity-70"
        style={{
          paddingHorizontal: 14,
          height: CHIP_H,
          borderRadius: 999,
          justifyContent: "center",
          backgroundColor: active ? BRAND_GREEN : "#fff",
          borderWidth: 1,
          borderColor: active ? BRAND_GREEN : "#e5e7eb",
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : "#525252" }}>{label}</Text>
      </Pressable>
      {count ? (
        /* Centred on the chip's own curved edge, not on its bounding-box
           corner: the chip is a pill, so its edge at 45° sits r − r/√2 inside
           the corner, and the badge is pulled back by that much less its own
           radius. Sitting it on the corner point left it floating in space. */
        <View pointerEvents="none" style={{ position: "absolute", top: BADGE_OFFSET, right: BADGE_OFFSET }}>
          <CountBadge count={count} size={BADGE} />
        </View>
      ) : null}
    </View>
  );
}

function QueueCard({ order }: { order: CafeOrder }) {
  const ready = order.status === "ready";
  const late = !ready && minutesLeft(order.readyAt) === 0;

  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: "#f0f0f0" }}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        {/* Queue number — the one thing a barista scans for */}
        <View
          style={{
            width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center",
            backgroundColor: ready ? "rgba(139,92,246,0.12)" : "rgba(0,122,255,0.12)",
          }}
        >
          {/* One colour per status across the console: กำลังทำ = น้ำเงิน,
              รอลูกค้ารับ = ม่วง (see the queue ring on CafeAdmin). */}
          <Text style={{ fontSize: 18, fontWeight: "800", color: ready ? QUEUE_WAIT : QUEUE_PREP }}>#{order.queueNo}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{order.orderId}</Text>
          <View className="flex-row items-center" style={{ gap: 5, marginTop: 3 }}>
            <Clock size={13} color={late ? "#dc2626" : TEXT_MUTED} strokeWidth={2.2} />
            <Text style={{ fontSize: 12.5, color: late ? "#dc2626" : TEXT_MUTED }}>
              {ready ? "รอลูกค้ามารับ" : late ? "เลยเวลาแล้ว" : `เหลือ ~${minutesLeft(order.readyAt)} นาที`}
            </Text>
            <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>· {order.receiveLabel}</Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end", gap: 3 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>฿{order.total.toLocaleString()}</Text>
          {/* A redeemed bill is one the barista is handing a free cup on, so it
              is worth seeing here rather than only on the receipt. */}
          {order.redeemDiscount ? (
            <View className="flex-row items-center" style={{ gap: 3, backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Gift size={10} color={BRAND_GREEN} strokeWidth={2.6} />
              <Text style={{ fontSize: 10, fontWeight: "800", color: BRAND_GREEN }}>แลกฟรี</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Lines the barista has to make */}
      <View style={{ backgroundColor: "#fafafa", borderRadius: 12, padding: 12, gap: 6 }}>
        {order.items.map((it, i) => (
          <View key={i} className="flex-row" style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: BRAND_GREEN, minWidth: 22 }}>×{it.qty}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, color: "#0a0a0a" }}>{it.name}</Text>
              {it.summary ? <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }}>{it.summary}</Text> : null}
            </View>
          </View>
        ))}
      </View>

      {ready ? (
        <Pressable
          onPress={() => {
            completeCafeOrder(order.orderId);
            showToast(`ส่งมอบคิว #${order.queueNo} แล้ว`);
          }}
          className="flex-row items-center justify-center active:opacity-80"
          style={{ height: 46, borderRadius: 999, borderWidth: 1, borderColor: BRAND_GREEN, gap: 6 }}
        >
          <HandPlatter size={16} color={BRAND_GREEN} strokeWidth={2.2} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: BRAND_GREEN }}>ส่งมอบให้ลูกค้า</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => {
            markCafeReady(order.orderId);
            showToast(`แจ้งลูกค้าคิว #${order.queueNo} แล้ว`);
          }}
          className="flex-row items-center justify-center active:opacity-80"
          style={{ height: 46, borderRadius: 999, backgroundColor: BRAND_GREEN, gap: 6 }}
        >
          <Check size={16} color="#fff" strokeWidth={2.6} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>ทำเสร็จแล้ว — แจ้งลูกค้า</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * คิวคาเฟ่ (ฝั่งร้าน) — the barista's view of METAHERB Café.
 *
 * The café had no shop-side surface at all: orders lived in the customer's
 * CafeCartContext and never left the device. Both sides now read the shared
 * queue (src/store/cafe.ts); "ทำเสร็จแล้ว" flips the customer's banner to
 * "รับได้เลย" and notifies them.
 */
export function CafeQueueScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterTab>("all");

  useStore(cafeStore); // live: a new order appears the moment it is placed
  const queue = cafeQueue(METAHERB_SHOP);

  const visible = useMemo(
    () => (filter === "all" ? queue : queue.filter((o) => o.status === filter)),
    [queue, filter],
  );
  const preparing = queue.filter((o) => o.status === "preparing").length;
  /** Per-tab counts for the chips. */
  const counts: Record<FilterTab, number> = {
    all: queue.length,
    preparing,
    ready: queue.filter((o) => o.status === "ready").length,
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="คิวคาเฟ่"
        subtitle={queue.length === 0 ? "ไม่มีออเดอร์ในคิว" : `กำลังทำ ${preparing} · รอรับ ${queue.length - preparing}`}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        bottomSlot={
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -14 }}
            /* Room at the top and the right end for the badges, which sit
               outside the chips' own bounds. */
            contentContainerStyle={{ gap: 12, paddingHorizontal: 14, paddingRight: 20, paddingTop: BADGE / 2 }}
          >
            {TABS.map((t) => (
              <Chip
                key={t.key}
                label={t.label}
                count={counts[t.key]}
                active={filter === t.key}
                onPress={() => setFilter(t.key)}
              />
            ))}
          </ScrollView>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<Coffee size={36} color="#9ca3af" />}
          title="ยังไม่มีออเดอร์"
          subtitle="ออเดอร์ที่ลูกค้าสั่งจะขึ้นที่นี่ทันที"
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom, gap: 14 }}>
          {visible.map((o) => (
            <QueueCard key={o.orderId} order={o} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
