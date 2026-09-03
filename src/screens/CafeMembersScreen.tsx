import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform, Switch, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Gift, Phone, Search, Stamp, UserPlus, X } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { GlassIconButton } from "../components/GlassIconButton";
import { EmptyState } from "../components/EmptyState";
import { showToast } from "../components/Toast";
import { PMAddFab } from "./MyShopScreen";
import { Section, ViewRow, FieldLabel, EditIconButton, SheetHeader, PAYOUT_INPUT } from "./ShopPayoutScreen";
import { BRAND_GREEN, DIVIDER_GRAY, TEXT_MUTED } from "../theme/tokens";
import { useStore } from "../store/db";
import {
  cafeMemberStore,
  cafeMembers,
  cafePointRule,
  setCafePointRule,
  addCafeMember,
  usablePoints,
  memberTxns,
  type CafeMember,
} from "../store/cafeMembers";

const fmtPhone = (p: string) => (p.length === 10 ? `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}` : p);

/** One member — name, phone, and how far along the card is. */
function MemberCard({ member, points, redeemAt, onPress }: {
  member: CafeMember;
  points: number;
  redeemAt: number;
  onPress: () => void;
}) {
  const full = points >= redeemAt;
  const pct = Math.min(1, redeemAt > 0 ? points / redeemAt : 0);
  return (
    <Pressable onPress={onPress} className="active:opacity-90" style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14, gap: 12 }}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: BRAND_GREEN }}>{member.name.trim().charAt(0) || "?"}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{member.name || "ไม่ระบุชื่อ"}</Text>
          <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 1 }}>{fmtPhone(member.phone)}</Text>
        </View>
        {full ? (
          <View className="flex-row items-center" style={{ gap: 4, backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Gift size={13} color={BRAND_GREEN} strokeWidth={2.4} />
            <Text style={{ fontSize: 11.5, fontWeight: "700", color: BRAND_GREEN }}>แลกได้</Text>
          </View>
        ) : null}
      </View>

      {/* Progress — a stamp card reads as "how many more", not as a number */}
      <View style={{ gap: 6 }}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: "#f0f0f0", overflow: "hidden" }}>
          <View style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 4, backgroundColor: BRAND_GREEN }} />
        </View>
        <Text style={{ fontSize: 12, color: TEXT_MUTED }}>
          {points} / {redeemAt} แต้ม{full ? "" : ` · อีก ${redeemAt - points} แก้ว`}
        </Text>
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
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const state = useStore(cafeMemberStore);
  const rule = cafePointRule(state);
  const members = cafeMembers(state);

  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.phone.includes(q.replace(/\D/g, "")) || m.name.toLowerCase().includes(q));
  }, [members, query]);

  // ── add member ──
  const [addOpen, setAddOpen] = useState(false);
  const [dPhone, setDPhone] = useState("");
  const [dName, setDName] = useState("");
  const openAdd = () => { setDPhone(""); setDName(""); setAddOpen(true); };
  const saveAdd = () => {
    const m = addCafeMember({ phone: dPhone, name: dName });
    setAddOpen(false);
    showToast(`เพิ่มสมาชิก ${m.name || fmtPhone(m.phone)} แล้ว`);
  };

  // ── rule ──
  const [ruleOpen, setRuleOpen] = useState(false);
  const [rEarn, setREarn] = useState(String(rule.earnPerCup));
  const [rRedeem, setRRedeem] = useState(String(rule.redeemAt));
  const [rMax, setRMax] = useState(String(rule.maxRedeemPrice));
  const [rExpiry, setRExpiry] = useState(String(rule.expiryMonths));
  const openRule = () => {
    setREarn(String(rule.earnPerCup)); setRRedeem(String(rule.redeemAt));
    setRMax(String(rule.maxRedeemPrice)); setRExpiry(String(rule.expiryMonths));
    setRuleOpen(true);
  };
  const saveRule = () => {
    setCafePointRule({
      earnPerCup: Math.max(1, Number(rEarn) || 1),
      redeemAt: Math.max(1, Number(rRedeem) || 1),
      maxRedeemPrice: Math.max(0, Number(rMax) || 0),
      expiryMonths: Math.max(0, Number(rExpiry) || 0),
    });
    setRuleOpen(false);
    showToast("บันทึกกติกาแต้มแล้ว");
  };

  // ── member detail ──
  const [detail, setDetail] = useState<CafeMember | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="สมาชิก & แต้ม"
        subtitle={`${members.length} สมาชิก · ครบ ${rule.redeemAt} แต้มแลกฟรี 1 แก้ว`}
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
          {/* กติกา — decides what every card below means */}
          <Section title="กติกาแต้ม" right={<EditIconButton onPress={openRule} />}>
            <View className="flex-row items-center" style={{ gap: 12, marginBottom: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Stamp size={20} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "600", color: "#0a0a0a" }}>
                ซื้อ {rule.redeemAt} แก้ว ฟรี 1 แก้ว
              </Text>
              <Switch
                value={rule.enabled}
                onValueChange={(v) => setCafePointRule({ enabled: v })}
                trackColor={{ true: BRAND_GREEN, false: "#d4d4d4" }}
                style={{ alignSelf: "center" }}
                {...(Platform.OS === "web" ? { activeThumbColor: "#fff" } : {})}
              />
            </View>
            <View style={{ gap: 14 }}>
              <ViewRow label="ได้แต้มต่อ 1 แก้ว" value={`${rule.earnPerCup} แต้ม`} />
              <ViewRow label="แลกฟรีเมื่อครบ" value={`${rule.redeemAt} แต้ม`} />
              <ViewRow label="แลกได้เมนูราคาไม่เกิน" value={`฿${rule.maxRedeemPrice.toLocaleString()}`} />
              <ViewRow label="แต้มหมดอายุเมื่อไม่มาใช้บริการ" value={rule.expiryMonths > 0 ? `${rule.expiryMonths} เดือน` : "ไม่หมดอายุ"} />
            </View>
          </Section>

          <View style={{ padding: 16, gap: 12 }}>
            {visible.length === 0 ? (
              <EmptyState
                icon={<Phone size={34} color="#9ca3af" />}
                title={query ? "ไม่พบสมาชิกที่ค้นหา" : "ยังไม่มีสมาชิก"}
                subtitle={query ? "ลองค้นด้วยเบอร์โทรอีกครั้ง" : "สมาชิกจะถูกเพิ่มอัตโนมัติเมื่อคิดเงินแล้วกรอกเบอร์ที่ POS"}
                iconBgSize={64}
              />
            ) : (
              visible.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  points={usablePoints(m, rule)}
                  redeemAt={rule.redeemAt}
                  onPress={() => setDetail(m)}
                />
              ))
            )}
          </View>
        </ScrollView>
        <HeaderFade />
      </View>

      <PMAddFab bottom={18} onPress={openAdd} />

      {/* เพิ่มสมาชิก */}
      <Modal visible={addOpen} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setAddOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="เพิ่มสมาชิก" onClose={() => setAddOpen(false)} onSave={saveAdd} canSave={dPhone.replace(/\D/g, "").length === 10} />
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 6 }}>
              <FieldLabel>เบอร์โทรศัพท์</FieldLabel>
              <TextInput value={dPhone} onChangeText={(t) => setDPhone(t.replace(/[^0-9]/g, ""))} placeholder="08xxxxxxxx" placeholderTextColor="#a3a3a3" keyboardType="number-pad" maxLength={10} style={PAYOUT_INPUT} />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel>ชื่อ</FieldLabel>
              <TextInput value={dName} onChangeText={setDName} placeholder="ชื่อที่ใช้เรียกลูกค้า" placeholderTextColor="#a3a3a3" style={PAYOUT_INPUT} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* แก้ไขกติกา */}
      <Modal visible={ruleOpen} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setRuleOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="แก้ไขกติกาแต้ม" onClose={() => setRuleOpen(false)} onSave={saveRule} canSave />
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 6 }}>
              <FieldLabel>ได้แต้มต่อ 1 แก้ว</FieldLabel>
              <TextInput value={rEarn} onChangeText={(t) => setREarn(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={2} style={PAYOUT_INPUT} />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel>แลกฟรีเมื่อครบกี่แต้ม</FieldLabel>
              <TextInput value={rRedeem} onChangeText={(t) => setRRedeem(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={3} style={PAYOUT_INPUT} />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel>แลกได้เมนูราคาไม่เกิน (บาท)</FieldLabel>
              <TextInput value={rMax} onChangeText={(t) => setRMax(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={4} style={PAYOUT_INPUT} />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel>แต้มหมดอายุเมื่อไม่มาใช้บริการ (เดือน · 0 = ไม่หมดอายุ)</FieldLabel>
              <TextInput value={rExpiry} onChangeText={(t) => setRExpiry(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={2} style={PAYOUT_INPUT} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ประวัติแต้มรายคน */}
      <Modal visible={detail !== null} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setDetail(null)}>
        <View style={{ flex: 1, backgroundColor: "white" }}>
          <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16 + insets.top / 2, paddingBottom: 12 }}>
            <GlassIconButton onPress={() => setDetail(null)} size={44} accessibilityLabel="ปิด">
              <X size={22} color="#1a1a1a" strokeWidth={2.6} />
            </GlassIconButton>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>{detail?.name || "สมาชิก"}</Text>
            <View style={{ width: 44 }} />
          </View>
          {detail ? (
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }}>
              <View style={{ alignItems: "center", gap: 4, backgroundColor: "#fafafa", borderRadius: 18, paddingVertical: 22 }}>
                <Text style={{ fontSize: 36, fontWeight: "800", color: BRAND_GREEN }}>{usablePoints(detail, rule)}</Text>
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>แต้มคงเหลือ · {fmtPhone(detail.phone)}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>ประวัติแต้ม</Text>
              {memberTxns(detail.id).length === 0 ? (
                <Text style={{ fontSize: 13, color: TEXT_MUTED }}>ยังไม่มีรายการ</Text>
              ) : (
                memberTxns(detail.id).map((t) => (
                  <View key={t.id} className="flex-row items-center" style={{ gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#f0f0f0" }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#0a0a0a" }}>
                        {t.reason === "earn" ? "สะสมแต้ม" : t.reason === "redeem" ? "แลกฟรี 1 แก้ว" : "ปรับแต้ม"}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>
                        {new Date(t.at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                        {t.orderId ? ` · ${t.orderId}` : ""}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: t.delta >= 0 ? BRAND_GREEN : "#dc2626" }}>
                      {t.delta >= 0 ? `+${t.delta}` : t.delta}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
