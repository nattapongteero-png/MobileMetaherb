import { useState } from "react";
import { View, Text, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, Switch } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Coffee, Gift, Stamp, Users } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { showToast } from "../components/Toast";
import { Section, FieldLabel, EditIconButton, SheetHeader, PAYOUT_INPUT } from "./ShopPayoutScreen";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { useStore } from "../store/db";
import {
  cafeMemberStore,
  cafeMembers,
  cafePointRule,
  setCafePointRule,
  usablePoints,
} from "../store/cafeMembers";

/** One number — small label on top, the value doing the talking. */
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: "22%", backgroundColor: "#fafafa", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 10.5, color: TEXT_MUTED }}>{label}</Text>
      <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "800", color: "#0a0a0a" }}>{value}</Text>
    </View>
  );
}

/** A headline number with an icon — how the programme is actually doing. */
function OverviewRow({ Icon, label, value }: { Icon: typeof Gift; label: string; value: string }) {
  return (
    <View className="flex-row items-center" style={{ gap: 12, paddingVertical: 10 }}>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
        <Icon size={17} color={BRAND_GREEN} strokeWidth={2.2} />
      </View>
      <Text style={{ flex: 1, fontSize: 13.5, color: "#0a0a0a" }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: "800", color: "#0a0a0a" }}>{value}</Text>
    </View>
  );
}

/**
 * แต้มสะสม (17.7) — the programme itself: the rule, and whether it is working.
 *
 * Split out from สมาชิก on purpose. The rule is set once when the shop opens
 * and then barely touched, while the member list is a daily lookup; keeping the
 * settings on top of the list pushed the everyday surface below the fold.
 */
export function CafePointsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const state = useStore(cafeMemberStore);
  const rule = cafePointRule(state);
  const members = cafeMembers(state);
  const txns = state.txns ?? [];

  // Who could walk in and claim a free cup right now.
  const readyCount = members.filter((m) => usablePoints(m, rule) >= rule.redeemAt).length;
  // Points the shop still owes — the liability the expiry rule exists to cap.
  const outstanding = members.reduce((n, m) => n + usablePoints(m, rule), 0);
  // This calendar month, so it lines up with how the sales report is read.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonth = txns.filter((t) => t.at >= monthStart.getTime());
  const redeemedThisMonth = thisMonth.filter((t) => t.reason === "redeem").length;
  const earnedThisMonth = thisMonth.filter((t) => t.reason === "earn").length;

  // ── แก้ไขกติกา ──
  const [ruleOpen, setRuleOpen] = useState(false);
  const [rEarn, setREarn] = useState(String(rule.earnPerVisit));
  const [rRedeem, setRRedeem] = useState(String(rule.redeemAt));
  const [rMax, setRMax] = useState(String(rule.maxRedeemPrice));
  const [rExpiry, setRExpiry] = useState(String(rule.expiryMonths));
  const openRule = () => {
    setREarn(String(rule.earnPerVisit)); setRRedeem(String(rule.redeemAt));
    setRMax(String(rule.maxRedeemPrice)); setRExpiry(String(rule.expiryMonths));
    setRuleOpen(true);
  };
  const saveRule = () => {
    setCafePointRule({
      earnPerVisit: Math.max(1, Number(rEarn) || 1),
      redeemAt: Math.max(1, Number(rRedeem) || 1),
      maxRedeemPrice: Math.max(0, Number(rMax) || 0),
      expiryMonths: Math.max(0, Number(rExpiry) || 0),
    });
    setRuleOpen(false);
    showToast("บันทึกกติกาสะสมแต้มแล้ว");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="แต้มสะสม"
        subtitle={rule.enabled ? `ซื้อครบ ${rule.redeemAt} ครั้ง ฟรี 1 แก้ว` : "ปิดใช้งานอยู่"}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {/* The power switch is not one of the rule's numbers, so it lives
              outside the card the pencil governs — a toggle you can flip on the
              spot next to fields that need แก้ไข first read as a contradiction. */}
          <Section>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Stamp size={20} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>เปิดใช้งานสะสมแต้ม</Text>
                <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                  {rule.enabled ? "ลูกค้าสะสมแต้มได้ตามปกติ" : "ปิดอยู่ · ซื้อแล้วไม่ได้แต้ม"}
                </Text>
              </View>
              <Switch
                value={rule.enabled}
                onValueChange={(v) => setCafePointRule({ enabled: v })}
                trackColor={{ true: BRAND_GREEN, false: "#d4d4d4" }}
                {...(Platform.OS === "web" ? { activeThumbColor: "#fff" } : {})}
              />
            </View>
          </Section>

          {/* กติกา — read here, change behind the pencil. Dimmed while the
              programme is off, because none of it is in force. */}
          <Section title="กติกา" right={<EditIconButton onPress={openRule} />}>
            <View style={{ opacity: rule.enabled ? 1 : 0.45 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", marginBottom: 12 }}>
                ซื้อครบ {rule.redeemAt} ครั้ง ฟรี 1 แก้ว
              </Text>
              <View className="flex-row" style={{ flexWrap: "wrap", gap: 8 }}>
                <StatTile label="ได้แต้ม" value={`${rule.earnPerVisit}/ครั้ง`} />
                <StatTile label="แลกฟรี" value={`${rule.redeemAt} แต้ม`} />
                <StatTile label="เมนูไม่เกิน" value={`฿${rule.maxRedeemPrice.toLocaleString()}`} />
                <StatTile label="แต้มหมดอายุ" value={rule.expiryMonths > 0 ? `${rule.expiryMonths} เดือน` : "ไม่หมด"} />
              </View>
            </View>
          </Section>

          {/* ภาพรวม — the question a shop owner actually has: is this working? */}
          <Section title="ภาพรวม">
            <OverviewRow Icon={Users} label="สมาชิกทั้งหมด" value={`${members.length} คน`} />
            <OverviewRow Icon={Gift} label="แลกฟรีได้แล้ว" value={`${readyCount} คน`} />
            <OverviewRow Icon={Stamp} label="แต้มค้างในระบบ" value={`${outstanding.toLocaleString()} แต้ม`} />
            <OverviewRow Icon={Coffee} label="เดือนนี้ · แจกแต้ม / แลกฟรี" value={`${earnedThisMonth} / ${redeemedThisMonth}`} />
          </Section>
        </ScrollView>
        <HeaderFade />
      </View>

      {/* แก้ไขกติกา */}
      <Modal visible={ruleOpen} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setRuleOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="แก้ไขกติกาสะสมแต้ม" onClose={() => setRuleOpen(false)} onSave={saveRule} canSave />
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 6 }}>
              <FieldLabel>ซื้อ 1 ครั้ง ได้กี่แต้ม</FieldLabel>
              <TextInput value={rEarn} onChangeText={(t) => setREarn(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={2} style={PAYOUT_INPUT} />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel>ต้องมีกี่แต้มถึงแลกฟรีได้ 1 แก้ว</FieldLabel>
              <TextInput value={rRedeem} onChangeText={(t) => setRRedeem(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={3} style={PAYOUT_INPUT} />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel>แลกฟรีได้เฉพาะเมนูราคาไม่เกิน (บาท)</FieldLabel>
              <TextInput value={rMax} onChangeText={(t) => setRMax(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={4} style={PAYOUT_INPUT} />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel>ไม่มาซื้อกี่เดือนแล้วแต้มหมดอายุ (ใส่ 0 = ไม่หมดอายุ)</FieldLabel>
              <TextInput value={rExpiry} onChangeText={(t) => setRExpiry(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={2} style={PAYOUT_INPUT} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
