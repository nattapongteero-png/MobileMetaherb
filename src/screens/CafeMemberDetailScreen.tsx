import { View, Text, ScrollView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronsRight, Coffee, Gift, Stamp } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { EmptyState } from "../components/EmptyState";
import { BRAND_GREEN, TEXT_MUTED, cardShadow } from "../theme/tokens";
import { useStore } from "../store/db";
import {
  cafeMemberStore,
  canRedeem,
  cafePointRule,
  memberById,
  memberTxns,
  usablePoints,
} from "../store/cafeMembers";
import { StampRing } from "../components/StampRing";
import { useAppWidth } from "../theme/layout";
import { fmtMemberPhone } from "./CafeMembersScreen";
import type { RootStackParamList } from "../navigation/RootStack";

/** The ring, inset from the card's sides so it never touches the edge. */
const PAGE_PAD = 32;
const RING_INSET = 20;
/**
 * The ring is drawn at a size rather than stretched, so it needs a ceiling —
 * see CafeStampCardScreen. 358 is the widest phone (430) less the page margins
 * and the ring's own inset.
 */
const RING_MAX = 358;

const fmtDate = (t: number) => new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });


/**
 * บัตรสะสมแต้มรายคน (17.7) — the ring first, because the balance is what the
 * counter asks for, then the facts as three cards: who they are, since when,
 * and the free cups with the swipe that spends the next one.
 */
export function CafeMemberDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const ringSize = Math.min(useAppWidth() - PAGE_PAD - RING_INSET * 2, RING_MAX);
  const { memberId } = useRoute<RouteProp<RootStackParamList, "CafeMemberDetail">>().params;
  const state = useStore(cafeMemberStore);
  const rule = cafePointRule(state);
  const member = memberById(memberId, state);

  const points = member ? usablePoints(member, rule) : 0;
  const txns = member ? memberTxns(member.id, state) : [];
  const redeemCount = txns.filter((t) => t.reason === "redeem").length;
  const redeemable = member != null && canRedeem(member, rule);

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="ข้อมูลสมาชิก"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 30, paddingBottom: insets.bottom + 32 }}>
          {/* The ring fades out exactly where it is cropped, so the cut never
              shows, and the card's own white carries on from there — one sheet,
              with the summary and the swipe reading as part of the same block. */}
          <View style={{ marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 26, paddingTop: 14, overflow: "hidden", ...cardShadow(2) }}>
            {/* Who the card belongs to, top-left; when they joined, top-right —
                the two facts that used to sit in their own cards below. */}
            <View className="flex-row items-start" style={{ paddingHorizontal: 16, gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "800", color: "#0a0a0a", lineHeight: 22 }}>
                  {member?.name || "ไม่ระบุชื่อ"}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>
                  {member ? fmtMemberPhone(member.phone) : "—"}
                </Text>
              </View>
              {/* Same two sizes as the left, and the date on the first line so
                  the two headings sit on one baseline. */}
              <View style={{ alignItems: "flex-end" }}>
                <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "800", color: "#0a0a0a", lineHeight: 22 }}>
                  {member ? fmtDate(member.joinedAt) : "—"}
                </Text>
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>วันที่เป็นสมาชิก</Text>
              </View>
            </View>

            <View style={{ alignItems: "center", marginTop: 6 }}>
              <StampRing size={ringSize} points={points} redeemAt={rule.redeemAt} crop={0.56} />
            </View>


            {/* The summary and the swipe are one tinted block running to the
                card's own edges: its bottom corners are the card's, so only the
                top two are rounded. */}
            <View
              style={{
                backgroundColor: "#eef6f1",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingHorizontal: 14,
                paddingTop: 12,
                paddingBottom: 14,
                gap: 10,
                // Cast upwards: the block sits on the card's bottom edge, so a
                // downward shadow would be clipped away by the card's own crop.
                ...(Platform.OS === "ios"
                  ? { boxShadow: "0px -4px 12px rgba(10,61,34,0.10)" }
                  : { elevation: 6, shadowColor: "#0a3d22" }),
              }}
            >
              <View className="flex-row items-center justify-center" style={{ gap: 8 }}>
                <Gift size={15} color={BRAND_GREEN} strokeWidth={2.3} />
                <Text style={{ fontSize: 13, color: TEXT_MUTED }}>แลกฟรีไปแล้ว</Text>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#0a0a0a" }}>{redeemCount} แก้ว</Text>
              </View>

              {/* Where redeeming happens, stated rather than offered. This page
                  is a record — it answers "how does this member stand", and the
                  free cup is taken off a bill, which only the till has. */}
              <Text style={{ fontSize: 12.5, color: "#0a0a0a", textAlign: "center", fontWeight: redeemable ? "700" : "400" }}>
                {redeemable
                  ? `แลกฟรีได้ 1 แก้ว ผูกสมาชิกในบิลที่หน้าขาย แล้วติ๊กใช้แต้ม`
                  : `อีก ${rule.redeemAt - points} ครั้ง แลกฟรี 1 แก้ว`}
              </Text>
            </View>
          </View>

          {/* ประวัติแต้ม — on the page's own grey, one card per bill, so each
              row is a thing you can point at instead of a stripe in a slab. */}
          <View style={{ paddingHorizontal: 16, marginTop: 22, gap: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#0a0a0a" }}>ประวัติแต้ม</Text>

            {txns.length === 0 ? (
              <View style={{ backgroundColor: "#fff", borderRadius: 20, paddingVertical: 8, ...cardShadow(1) }}>
                <EmptyState
                  icon={<Stamp size={30} color="#9ca3af" />}
                  title="ยังไม่มีรายการ"
                  subtitle="แต้มจะขึ้นที่นี่เมื่อซื้อครั้งแรก"
                  iconBgSize={56}
                />
              </View>
            ) : (
              txns.map((t) => {
                const earn = t.delta >= 0;
                return (
                  <View
                    key={t.id}
                    className="flex-row items-center"
                    style={{ backgroundColor: "#fff", borderRadius: 18, padding: 14, gap: 12, ...cardShadow(1) }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: earn ? "rgba(49,151,84,0.1)" : "rgba(220,38,38,0.08)", alignItems: "center", justifyContent: "center" }}>
                      {earn ? <Coffee size={17} color={BRAND_GREEN} strokeWidth={2.2} /> : <Gift size={17} color="#dc2626" strokeWidth={2.2} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#0a0a0a" }}>
                        {t.reason === "earn" ? "ซื้อ" : t.reason === "redeem" ? "แลกฟรี 1 แก้ว" : "ปรับแต้ม"}
                      </Text>
                      <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>
                        {new Date(t.at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                        {t.orderId ? ` · บิล ${t.orderId}` : ""}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: earn ? BRAND_GREEN : "#dc2626" }}>
                      {earn ? `+${t.delta}` : t.delta}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
        <HeaderFade />
      </View>
    </View>
  );
}
