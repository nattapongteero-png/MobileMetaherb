import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CalendarDays, Gift, Phone, Search, X } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { EmptyState } from "../components/EmptyState";
import { StampRing } from "../components/StampRing";
import { PMAddFab } from "./MyShopScreen";
import { BRAND_GREEN, BRAND_GREEN_DARK, DIVIDER_GRAY, TEXT_MUTED, cardShadow } from "../theme/tokens";
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
export function MemberCard({ member, points, redeemAt, onPress, note, pending, filled, shadow, freeCup }: {
  member: CafeMember;
  points: number;
  redeemAt: number;
  onPress: () => void;
  /** Replaces the joined date. The POS bill says where the card lands once the
   *  bill is settled, which matters more there than when they signed up. */
  note?: string;
  /** Points this bill will add: the green tail on the ring, and the "+n" pill
   *  on the line below the phone. Kept together so the two always agree. */
  pending?: number;
  /** The tile treatment the POS bill uses — a grey fill, no border, matching
   *  the payment card beside it. The list and the picker keep the white card,
   *  because there it sits on grey and the border is what separates it. */
  filled?: boolean;
  /** This bill spends the card, so it earns nothing — the pill says what the
   *  customer gets instead of what they gain. */
  freeCup?: boolean;
  /** Lifts the card off the page — the success screen shows it on its own,
   *  with nothing around it to give it an edge. */
  shadow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:opacity-90"
      style={{
        // The shadow first: on Android cardShadow backs the view in white for a
        // correct outline, and the fill has to win over that.
        ...(shadow ? cardShadow(2) : null),
        backgroundColor: filled ? "#f9fafb" : "#fff",
        borderRadius: filled ? 24 : 18,
        borderWidth: filled ? 0 : 1,
        borderColor: "#ececed",
        paddingLeft: 14,
        paddingVertical: 14,
        paddingRight: 6,
        gap: 12,
        overflow: "hidden",
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <View>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{member.name || "ไม่ระบุชื่อ"}</Text>
          <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>{fmtMemberPhone(member.phone)}</Text>
          {/* The joining date is a fact about the member and takes an icon; a
              note passed in is about the bill and reads as a sentence, so it
              does not. */}
          {pending || freeCup || points >= redeemAt ? (
            /* Where the card stands, then what this bill adds. Wrapping is
               allowed because a long name can squeeze this column. */
            <View className="flex-row items-center" style={{ flexWrap: "wrap", gap: 5, marginTop: 8 }}>
              {/* Two facts of unequal weight: where the card was is context,
                  what this bill adds is the news — so only one of them is
                  filled in. Same-coloured pills side by side read as a pair of
                  equals, which is what made the gain easy to skim past. */}
              {/* A full card has nothing to say about where it started — it is
                  simply ready, and one pill says that better than two. */}
              {points < redeemAt ? (
                <View style={{ backgroundColor: "#f2f3f2", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: "600", color: TEXT_MUTED }}>แต้มเดิม {points}/{redeemAt}</Text>
                </View>
              ) : null}
              {points >= redeemAt || freeCup ? (
                <View className="flex-row items-center" style={{ gap: 4, backgroundColor: BRAND_GREEN_DARK, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3.5 }}>
                  <Gift size={12} color="#fff" strokeWidth={2.6} />
                  <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#fff" }}>แลกฟรีได้</Text>
                </View>
              ) : pending ? (
                <View style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3.5 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#fff" }}>+{pending} แต้ม</Text>
                </View>
              ) : null}
            </View>
          ) : note ? (
            <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 8 }}>{note}</Text>
          ) : (
            <View className="flex-row items-center" style={{ gap: 5, marginTop: 8 }}>
              <CalendarDays size={12} color="#9ca3af" strokeWidth={2.2} />
              <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED }}>
                เป็นสมาชิกตั้งแต่ {fmtJoined(member.joinedAt)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Flush to the card's bottom-right: the negative margins cancel the
          card's own padding, and the card's overflow crops the ring. */}
      <View style={{ alignSelf: "flex-end", marginBottom: -14, marginRight: -6 }}>
        <StampRing size={138} points={points} redeemAt={redeemAt} pending={pending} />
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
