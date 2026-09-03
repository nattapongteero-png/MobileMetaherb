import { useState } from "react";
import { View, Text, ScrollView, Switch, Platform, TextInput, Modal, KeyboardAvoidingView, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";
import { Banknote, QrCode } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { showToast } from "../components/Toast";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { useStore } from "../store/db";
import {
  cafeAdminStore,
  setCafePayChannel,
  cafePayInfo,
  setCafePayInfo,
  isValidPromptPayId,
} from "../store/cafeAdmin";
import { promptPayPayload } from "../utils/promptpay";
import { Section, ViewRow, FieldLabel, EditIconButton, SheetHeader, PAYOUT_INPUT } from "./ShopPayoutScreen";

/** One channel row — icon, name, switch. */
function ChannelRow({ Icon, label, value, onValueChange, divider }: {
  Icon: typeof Banknote;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  divider?: boolean;
}) {
  return (
    <View
      className="flex-row items-center"
      style={{ gap: 12, paddingVertical: 12, borderTopWidth: divider ? StyleSheet.hairlineWidth : 0, borderTopColor: "rgba(60,60,67,0.12)" }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
        <Icon size={19} color={BRAND_GREEN} strokeWidth={2.2} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#0a0a0a" }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: BRAND_GREEN, false: "#d4d4d4" }}
        style={{ alignSelf: "center" }}
        {...(Platform.OS === "web" ? { activeThumbColor: "#fff" } : {})}
      />
    </View>
  );
}

/**
 * ช่องทางชำระเงิน (17.4) — laid out like บัญชีรับเงิน in the shop console
 * (ShopPayoutScreen): a hero card at the top, full-bleed white sections,
 * read-only values with a ✎ that opens a page-sheet.
 *
 * No bank account is stored: the POS pays by generating a PromptPay QR for the
 * order's amount, and which account sits behind that PromptPay id is between
 * the shop and its bank.
 */
export function CafePaySettingsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const state = useStore(cafeAdminStore);
  const info = cafePayInfo(state);
  const idOk = isValidPromptPayId(info.promptPayId);

  const toggle = (id: "cash" | "promptpay", label: string, on: boolean) => {
    if (!setCafePayChannel(id, on)) {
      showToast("ต้องเปิดช่องทางชำระเงินไว้อย่างน้อย 1 ช่องทาง", "error");
      return;
    }
    showToast(on ? `เปิดรับ${label}แล้ว` : `ปิดรับ${label}แล้ว`, "info");
  };

  const [editOpen, setEditOpen] = useState(false);
  const [dId, setDId] = useState(info.promptPayId);
  const [dName, setDName] = useState(info.merchantName);
  const openEdit = () => { setDId(info.promptPayId); setDName(info.merchantName); setEditOpen(true); };
  const saveEdit = () => { setCafePayInfo({ promptPayId: dId, merchantName: dName.trim() }); setEditOpen(false); };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="ช่องทางชำระเงิน"
        subtitle={`เปิดรับ ${[state.pay.cash, state.pay.promptpay].filter(Boolean).length} จาก 2 ช่องทาง`}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {/* Hero — the shop's own PromptPay code, in the passbook's place. The
              POS reissues it per order with the amount baked in; this one is the
              plain identity, so it can be checked at a glance. */}
          <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 18 }}>
            <View>
              <View style={{ position: "absolute", left: 16, right: 16, top: 12, bottom: -12, borderRadius: 18, backgroundColor: "#e9e9e9", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(0,0,0,0.07)" }} />
              <View style={{ position: "absolute", left: 8, right: 8, top: 6, bottom: -6, borderRadius: 19, backgroundColor: "#ffffff", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(0,0,0,0.07)" }} />
              <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(0,0,0,0.07)", paddingVertical: 22, alignItems: "center", gap: 10 }}>
                {idOk ? (
                  <QRCode value={promptPayPayload(info.promptPayId)} size={140} />
                ) : (
                  <View style={{ width: 140, height: 140, borderRadius: 16, backgroundColor: "#f5f5f5", alignItems: "center", justifyContent: "center" }}>
                    <QrCode size={40} color="#c4c4c4" strokeWidth={1.6} />
                  </View>
                )}
                <View style={{ alignItems: "center", gap: 2 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{info.merchantName || "—"}</Text>
                  <Text style={{ fontSize: 13, color: TEXT_MUTED, letterSpacing: 0.5 }}>{info.promptPayId || "ยังไม่ได้ตั้งค่า"}</Text>
                </View>
              </View>
            </View>
          </View>

          <Section title="ข้อมูลพร้อมเพย์" right={<EditIconButton onPress={openEdit} />}>
            <View style={{ gap: 14 }}>
              <ViewRow label="เบอร์พร้อมเพย์ / เลขผู้เสียภาษี" value={info.promptPayId || "—"} />
              <ViewRow label="ชื่อร้านที่ลูกค้าเห็นตอนสแกน" value={info.merchantName || "—"} />
            </View>
            {info.promptPayId && !idOk ? (
              <Text style={{ fontSize: 11.5, color: "#dc2626", marginTop: 12 }}>ต้องเป็น 10 หลัก (เบอร์) หรือ 13 หลัก (เลขผู้เสียภาษี)</Text>
            ) : null}
          </Section>

          <Section title="ช่องทางที่เปิดรับ">
            <ChannelRow Icon={Banknote} label="เงินสด" value={state.pay.cash} onValueChange={(v) => toggle("cash", "เงินสด", v)} />
            <ChannelRow Icon={QrCode} label="พร้อมเพย์" value={state.pay.promptpay} onValueChange={(v) => toggle("promptpay", "พร้อมเพย์", v)} divider />
          </Section>
        </ScrollView>
        <HeaderFade />
      </View>

      <Modal visible={editOpen} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="แก้ไขพร้อมเพย์" onClose={() => setEditOpen(false)} onSave={saveEdit} canSave={isValidPromptPayId(dId)} />
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 6 }}>
              <FieldLabel>เบอร์พร้อมเพย์ / เลขผู้เสียภาษี</FieldLabel>
              <TextInput value={dId} onChangeText={(t) => setDId(t.replace(/[^0-9]/g, ""))} placeholder="0958896299" placeholderTextColor="#a3a3a3" keyboardType="number-pad" maxLength={13} style={PAYOUT_INPUT} />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel>ชื่อร้านที่ลูกค้าเห็นตอนสแกน</FieldLabel>
              <TextInput value={dName} onChangeText={setDName} placeholder="METAHERB STORE" placeholderTextColor="#a3a3a3" autoCapitalize="characters" style={PAYOUT_INPUT} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
