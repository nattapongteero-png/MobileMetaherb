import { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Coffee, Gift, Stamp } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassActionBar, PrimaryAction } from "../components/GlassActionBar";
import { BottomFade } from "../components/BottomFade";
import { HeaderFade } from "../components/HeaderFade";
import { EmptyState } from "../components/EmptyState";
import { StampRing } from "../components/StampRing";
import { BRAND_GREEN, BRAND_GREEN_DARK, DIVIDER_GRAY, TEXT_MUTED, cardShadow } from "../theme/tokens";
import { useAppWidth } from "../theme/layout";
import { useStore } from "../store/db";
import { showToast } from "../components/Toast";
import { addCafeMember, cafeMemberStore, cafePointRule, memberByPhone, memberForUser, memberTxns, usablePoints } from "../store/cafeMembers";
import { sessionStore, updateProfile } from "../store/session";
import { fmtMemberPhone } from "./CafeMembersScreen";
import type { RootStackParamList } from "../navigation/RootStack";

/** The page's 16pt margins on both sides. */
const PAGE_PAD = 32;
/**
 * The ring is drawn at a size, not stretched to fit, so it needs a ceiling:
 * on a tablet — or a rotated phone — a card the full width of the window would
 * put a 900pt coffee cup on screen. 398 is the widest phone (430) less the
 * margins, which is the canvas the card was designed on.
 */
const RING_MAX = 398;

const fmtDate = (t: number) => new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

/**
 * บัตรสะสมแต้ม METAHERB Café — the customer's own view.
 *
 * SPENDING a card still has to happen at the counter, where a barista actually
 * hands over the drink — a redeem button here would let anyone burn their points
 * by accident with nothing to show for it. JOINING is the opposite: it costs the
 * shop nothing, and making someone queue up just to say their phone number lost
 * the shop the points from every app order they placed before that.
 */
export function CafeStampCardScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const ringSize = Math.min(useAppWidth() - PAGE_PAD, RING_MAX);
  const state = useStore(cafeMemberStore);
  const session = useStore(sessionStore);
  const rule = cafePointRule(state);
  const phone = session.user?.phone ?? "";
  const member = memberForUser(session.user, state);

  const points = member ? usablePoints(member, rule) : 0;
  const txns = member ? memberTxns(member.id, state) : [];
  const full = points >= rule.redeemAt;

  // Joining from here — the phone is what the card is keyed by, so it is also
  // written back to the account: the counter and the app must look this member
  // up by the same number.
  const [joinPhone, setJoinPhone] = useState(phone.replace(/\D/g, ""));
  const join = () => {
    const p = joinPhone.replace(/\D/g, "");
    if (p.length !== 10) return Alert.alert("เบอร์โทรไม่ถูกต้อง", "กรุณากรอกเบอร์โทร 10 หลัก");
    // A number that already carries someone else's card is not ours to claim:
    // addCafeMember would hand this account that person's points, and their
    // phone would be written into this profile. Only the counter, with both
    // people in front of it, can sort that out.
    const taken = memberByPhone(p, state);
    if (taken && taken.userId && taken.userId !== session.user?.id) {
      return Alert.alert("เบอร์นี้ถูกใช้แล้ว", "เบอร์นี้ผูกกับบัญชีอื่นอยู่ กรุณาติดต่อพนักงานที่ร้าน");
    }
    // Joined from inside the app: the card carries the account from birth.
    addCafeMember({ phone: p, name: session.user?.name ?? "", userId: session.user?.id });
    if (p !== phone.replace(/\D/g, "")) updateProfile({ phone: p });
    showToast("สมัครสมาชิกเรียบร้อย เริ่มสะสมแต้มได้เลย");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="บัตรสะสมแต้ม"
        subtitle="METAHERB Café"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 30, paddingBottom: insets.bottom + 110 }}>
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
                  <StampRing size={ringSize} points={points} redeemAt={rule.redeemAt} />
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
            // Not a member yet — one field and one button, because the only
            // thing a stamp card needs is the phone number the counter will
            // read it back by. Prefilled from the account so the usual case is
            // a single tap (Fitts + Tesler: the shop keeps the complexity).
            <View style={{ marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 26, padding: 24, gap: 10, alignItems: "center", ...cardShadow(2) }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Stamp size={28} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: "800", color: "#0a0a0a" }}>ยังไม่ได้เป็นสมาชิกร้าน</Text>
              <Text style={{ fontSize: 13.5, color: TEXT_MUTED, textAlign: "center", lineHeight: 20 }}>
                สมัครฟรีด้วยเบอร์โทร แล้วเริ่มสะสมได้ทันที{"\n"}
                ซื้อครบ {rule.redeemAt} ครั้ง แลกเครื่องดื่มฟรี 1 แก้ว
              </Text>
              <View style={{ height: 1, alignSelf: "stretch", backgroundColor: DIVIDER_GRAY, marginVertical: 4 }} />
              <View style={{ alignSelf: "stretch", gap: 10 }}>
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>เบอร์โทรสำหรับสะสมแต้ม</Text>
                <TextInput
                  value={fmtMemberPhone(joinPhone)}
                  onChangeText={(t) => setJoinPhone(t.replace(/\D/g, "").slice(0, 10))}
                  placeholder="08X-XXX-XXXX"
                  placeholderTextColor="#c4c4c4"
                  keyboardType="number-pad"
                  style={{ backgroundColor: "#fafafa", borderRadius: 999, height: 48, paddingHorizontal: 20, fontSize: 14, color: "#0a0a0a" }}
                />
                <Pressable
                  onPress={join}
                  className="items-center justify-center active:opacity-80"
                  /* Darker than the floating bar's green: this is the card's own
                     commitment, and two identical pills on one screen would each
                     look like THE action (Von Restorff). */
                  style={{ height: 50, borderRadius: 999, backgroundColor: BRAND_GREEN_DARK }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#fff" }}>สมัครสมาชิก</Text>
                </Pressable>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED, textAlign: "center" }}>
                  หรือบอกเบอร์นี้กับพนักงานที่เคาน์เตอร์ก็ได้
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
        <HeaderFade />
        <BottomFade />
      </View>

      {/* A full card is a right the customer has to spend, and this page is
          where they find out they have it — so the way to use it is right here
          rather than back through the café landing. The label says which of the
          two it is (Goal-Gradient: the reward named at the moment it is due). */}
      <GlassActionBar>
        <PrimaryAction
          label={full ? "แลกฟรี 1 แก้ว · สั่งเลย" : "สั่งเครื่องดื่ม"}
          icon={<Coffee size={17} color="#fff" strokeWidth={2.4} />}
          onPress={() => nav.navigate("Cafe")}
        />
      </GlassActionBar>
    </View>
  );
}
