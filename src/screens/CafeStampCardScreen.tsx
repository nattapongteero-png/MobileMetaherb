import { View, Text, ScrollView, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Coffee, Gift, Stamp } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { EmptyState } from "../components/EmptyState";
import { StampRing } from "../components/StampRing";
import { BRAND_GREEN, DIVIDER_GRAY, TEXT_MUTED, cardShadow } from "../theme/tokens";
import { useStore } from "../store/db";
import { cafeMemberStore, cafePointRule, memberByPhone, memberTxns, usablePoints } from "../store/cafeMembers";
import { sessionStore } from "../store/session";

/** Card width: the page's 16pt margins on both sides. */
const CARD_W = Dimensions.get("window").width - 32;

const fmtDate = (t: number) => new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

/**
 * บัตรสะสมแต้ม Meta Cafe — the customer's own view.
 *
 * Read-only on purpose: spending a card has to happen at the counter, where a
 * barista actually hands over the drink. A redeem button here would let anyone
 * burn their points by accident with nothing to show for it.
 */
export function CafeStampCardScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const state = useStore(cafeMemberStore);
  const session = useStore(sessionStore);
  const rule = cafePointRule(state);
  const phone = session.user?.phone ?? "";
  const member = phone ? memberByPhone(phone, state) : undefined;

  const points = member ? usablePoints(member, rule) : 0;
  const txns = member ? memberTxns(member.id, state) : [];
  const full = points >= rule.redeemAt;

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="บัตรสะสมแต้ม"
        subtitle="Meta Cafe"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 30, paddingBottom: insets.bottom + 32 }}>
          {member ? (
            <>
              <View style={{ marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 26, paddingTop: 20, paddingHorizontal: 20, overflow: "hidden", ...cardShadow(2) }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#0a0a0a" }}>
                  {full ? "แลกฟรีได้ 1 แก้ว" : `อีก ${rule.redeemAt - points} ครั้ง แลกฟรี 1 แก้ว`}
                </Text>
                <Text style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>
                  ซื้อ 1 ครั้ง ได้ {rule.earnPerVisit} แต้ม
                </Text>
                {/* Runs to the card's bottom edge — the card's own crop finishes
                    the ring, so no strip of white is left under it. */}
                <View style={{ alignItems: "center", marginTop: 18, marginHorizontal: -20 }}>
                  <StampRing size={CARD_W} points={points} redeemAt={rule.redeemAt} />
                </View>
              </View>

              <View style={{ paddingHorizontal: 16, marginTop: 20, gap: 10 }}>
                <Text style={{ fontSize: 17, fontWeight: "800", color: "#0a0a0a" }}>ประวัติแต้ม</Text>
                {txns.length === 0 ? (
                  <View style={{ backgroundColor: "#fff", borderRadius: 20, paddingVertical: 8, ...cardShadow(1) }}>
                    <EmptyState icon={<Stamp size={30} color="#9ca3af" />} title="ยังไม่มีรายการ" subtitle="แต้มจะขึ้นที่นี่หลังซื้อครั้งแรก" iconBgSize={56} />
                  </View>
                ) : (
                  txns.map((t) => {
                    const earn = t.delta >= 0;
                    return (
                      <View key={t.id} className="flex-row items-center" style={{ backgroundColor: "#fff", borderRadius: 18, padding: 14, gap: 12, ...cardShadow(1) }}>
                        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: earn ? "rgba(49,151,84,0.1)" : "rgba(220,38,38,0.08)", alignItems: "center", justifyContent: "center" }}>
                          {earn ? <Coffee size={17} color={BRAND_GREEN} strokeWidth={2.2} /> : <Gift size={17} color="#dc2626" strokeWidth={2.2} />}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#0a0a0a" }}>{earn ? "ซื้อ" : "แลกฟรี 1 แก้ว"}</Text>
                          <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>{fmtDate(t.at)}</Text>
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: "800", color: earn ? BRAND_GREEN : "#dc2626" }}>
                          {earn ? `+${t.delta}` : t.delta}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            </>
          ) : (
            // Not a member yet — membership is created at the counter, so the
            // page says how rather than pretending to sign anyone up here.
            <View style={{ marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 26, padding: 24, gap: 10, alignItems: "center", ...cardShadow(2) }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Stamp size={28} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: "800", color: "#0a0a0a" }}>ยังไม่ได้เป็นสมาชิกร้าน</Text>
              <Text style={{ fontSize: 13.5, color: TEXT_MUTED, textAlign: "center", lineHeight: 20 }}>
                บอกเบอร์โทรกับพนักงานตอนสั่งครั้งถัดไป แล้วเริ่มสะสมได้เลย{"\n"}
                ซื้อครบ {rule.redeemAt} ครั้ง แลกเครื่องดื่มฟรี 1 แก้ว
              </Text>
              <View style={{ height: 1, alignSelf: "stretch", backgroundColor: DIVIDER_GRAY, marginVertical: 4 }} />
              <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>เบอร์ในบัญชีของคุณ: {phone || "ยังไม่ได้ระบุ"}</Text>
            </View>
          )}
        </ScrollView>
        <HeaderFade />
      </View>
    </View>
  );
}
