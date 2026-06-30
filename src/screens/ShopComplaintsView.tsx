import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Inbox } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { COMPLAINT_TYPES } from "../data/complaintTypes";
import {
  STATUS_LABEL,
  STATUS_COLOR,
  TYPE_LABEL,
  TYPE_COLOR,
  type Complaint,
  type ComplaintStatus,
} from "../data/shopComplaints";
import { useComplaints } from "../context/ComplaintContext";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_ORDER: ComplaintStatus[] = ["pending", "acknowledged", "refund_full", "refund_partial", "rejected"];

export function StatusPill({ status }: { status: ComplaintStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <View className="flex-row items-center" style={{ gap: 4, backgroundColor: color + "1a", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 10.5, fontWeight: "700", color }}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

function ComplaintRow({ c, onPress }: { c: Complaint; onPress: () => void }) {
  const TypeIcon = COMPLAINT_TYPES[c.type].Icon;
  const tc = TYPE_COLOR[c.type];
  return (
    <Pressable onPress={onPress} className="active:opacity-70" style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#ececec", padding: 14 }}>
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: tc + "1a", alignItems: "center", justifyContent: "center" }}>
          <TypeIcon size={18} color={tc} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#1a1a1a" }}>{c.id}</Text>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>{c.orderId} · {c.createdAt}</Text>
        </View>
        <StatusPill status={c.status} />
      </View>
      <View style={{ height: 1, backgroundColor: "#f3f3f3", marginVertical: 10 }} />
      <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 13, color: "#262626", fontWeight: "500" }}>{c.customer}</Text>
          <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>{TYPE_LABEL[c.type]} · {c.product}</Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: "700", color: BRAND_GREEN_DARK }}>฿{(c.refundAmount ?? c.amount).toLocaleString()}</Text>
      </View>
    </Pressable>
  );
}

/** Owner complaints list. Tapping a row opens the ShopComplaintDetail subpage. */
export function ShopComplaintsView() {
  const nav = useNavigation<Nav>();
  const { complaints } = useComplaints();
  const [filter, setFilter] = useState<"all" | ComplaintStatus>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: complaints.length };
    STATUS_ORDER.forEach((s) => { c[s] = complaints.filter((x) => x.status === s).length; });
    return c;
  }, [complaints]);
  const list = filter === "all" ? complaints : complaints.filter((c) => c.status === filter);
  const chips: Array<{ key: "all" | ComplaintStatus; label: string }> = [
    { key: "all", label: "ทั้งหมด" },
    ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS_LABEL[s] })),
  ];

  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingRight: 8 }}>
        {chips.map((ch) => {
          const active = filter === ch.key;
          return (
            <Pressable
              key={ch.key}
              onPress={() => setFilter(ch.key)}
              className="flex-row items-center active:opacity-80"
              style={{ gap: 6, height: 34, paddingHorizontal: 13, borderRadius: 999, backgroundColor: active ? BRAND_GREEN : "#fff", borderWidth: 1, borderColor: active ? BRAND_GREEN : "#e8e8e8" }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? "#fff" : "#525252" }}>{ch.label}</Text>
              <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: active ? "rgba(255,255,255,0.25)" : "#f0f0f0", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 10.5, fontWeight: "700", color: active ? "#fff" : "#737373" }}>{counts[ch.key] ?? 0}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {list.length === 0 ? (
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececec", paddingVertical: 44, alignItems: "center" }}>
          <Inbox size={30} color="#d4d4d4" />
          <Text style={{ marginTop: 10, fontSize: 13, color: TEXT_MUTED }}>ไม่มีเรื่องร้องเรียนในสถานะนี้</Text>
        </View>
      ) : (
        list.map((c) => <ComplaintRow key={c.id} c={c} onPress={() => nav.navigate("ShopComplaintDetail", { id: c.id })} />)
      )}
    </View>
  );
}

/** เรื่องร้องเรียน — list as a standalone subpage (header + back). */
export function ShopComplaintsScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="เรื่องร้องเรียน" subtitle="คำร้องจากลูกค้า" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <ShopComplaintsView />
      </ScrollView>
    </View>
  );
}
