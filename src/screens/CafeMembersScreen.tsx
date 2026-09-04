import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CalendarDays, Phone, Search, X } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { EmptyState } from "../components/EmptyState";
import { StampRing } from "../components/StampRing";
import { PMAddFab } from "./MyShopScreen";
import { BRAND_GREEN, DIVIDER_GRAY, TEXT_MUTED } from "../theme/tokens";
import { useStore } from "../store/db";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  cafeMemberStore,
  cafeMembers,
  cafePointRule,
  usablePoints,
  type CafeMember,
} from "../store/cafeMembers";

/** Name or phone, dashes and spaces ignored — the counter types either. */
export const matchesMember = (m: { name: string; phone: string }, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return m.phone.includes(q.replace(/\D/g, "")) || m.name.toLowerCase().includes(q);
};

const fmtJoined = (t: number) =>
  new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

/** 081-234-5678 — the shape a cashier reads a number back in. */
export const fmtMemberPhone = (p: string) => (p.length === 10 ? `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}` : p);

/**
 * One member — PMCard's layout language (คลังตัวเลือก / จัดการเมนู): flat white
 * card, header row (avatar tile + name + status chip), divider, then the stamp
 * card's progress as the footer.
 */
export function MemberCard({ member, points, redeemAt, onPress }: {
  member: CafeMember;
  points: number;
  redeemAt: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center active:opacity-90" style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", paddingLeft: 14, paddingVertical: 14, paddingRight: 6, gap: 12, overflow: "hidden" }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{member.name || "ไม่ระบุชื่อ"}</Text>
          <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>{fmtMemberPhone(member.phone)}</Text>
          <View className="flex-row items-center" style={{ gap: 5, marginTop: 8 }}>
            <CalendarDays size={12} color="#9ca3af" strokeWidth={2.2} />
            <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED }}>
              เป็นสมาชิกตั้งแต่ {fmtJoined(member.joinedAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Flush to the card's bottom-right: the negative margins cancel the
          card's own padding, and the card's overflow crops the ring. */}
      <View style={{ alignSelf: "flex-end", marginBottom: -14, marginRight: -6 }}>
        <StampRing size={138} points={points} redeemAt={redeemAt} />
      </View>
    </Pressable>
  );
}

/**
 * สมาชิก & แต้ม (17.7) — a stamp card the counter can run from a phone number.
 *
 * The rule sits at the top because it decides what every card below means; the
 * member list is the day-to-day surface. Adding a member here is for walk-ins
 * who join at the counter — the POS registers them automatically when it takes
 * a phone number at checkout.
 */
export function CafeMembersScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const state = useStore(cafeMemberStore);
  const rule = cafePointRule(state);
  const members = cafeMembers(state);

  // How many members could walk in and claim a free cup today.
  const readyCount = members.filter((m) => usablePoints(m, rule) >= rule.redeemAt).length;

  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => matchesMember(m, q));
  }, [members, query]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="สมาชิก"
        subtitle={members.length === 0 ? "ยังไม่มีสมาชิก" : `${members.length} คน · แลกฟรีได้แล้ว ${readyCount} คน`}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        bottomSlot={
          <View className="flex-row items-center" style={{ backgroundColor: "white", borderWidth: 1, borderColor: DIVIDER_GRAY, borderRadius: 999, height: 44, paddingLeft: 16, paddingRight: 6, gap: 8 }}>
            <TextInput
              style={{ flex: 1, fontSize: 13, color: "#0a0a0a", padding: 0 }}
              placeholder="ค้นหาเบอร์โทร หรือชื่อสมาชิก"
              placeholderTextColor="#c4c4c4"
              value={query}
              onChangeText={setQuery}
              keyboardType="numbers-and-punctuation"
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8} className="active:opacity-60">
                <X size={16} color="#8a8f8a" strokeWidth={2.4} />
              </Pressable>
            ) : null}
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
              <Search size={16} color="white" />
            </View>
          </View>
        }
      />

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ padding: 16, paddingTop: 30, gap: 12 }}>
            {visible.length === 0 ? (
              <EmptyState
                icon={<Phone size={34} color="#9ca3af" />}
                title={query ? "ไม่พบสมาชิกที่ค้นหา" : "ยังไม่มีสมาชิก"}
                subtitle={query ? "ลองพิมพ์เบอร์ใหม่" : "กด + เพื่อเพิ่มสมาชิก"}
                iconBgSize={64}
              />
            ) : (
              visible.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  points={usablePoints(m, rule)}
                  redeemAt={rule.redeemAt}
                  onPress={() => nav.navigate("CafeMemberDetail", { memberId: m.id })}
                />
              ))
            )}
          </View>
        </ScrollView>
        <HeaderFade />
      </View>

      <PMAddFab bottom={18} onPress={() => nav.navigate("CafeMemberAdd")} />

    </View>
  );
}
