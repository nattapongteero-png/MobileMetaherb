import { glassTint } from "../theme/tokens";
import { useState, useMemo, type ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Landmark, Check, X, Pencil, ShieldCheck, ChevronDown, Search } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { modalTopPad } from "../theme/layout";
import { THAI_BANKS, bankByCode, bankLogo } from "../data/bankAccounts";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// View-only by default; the pencil opens a native page-sheet to edit (same pattern as ShopAccount).
export const PAYOUT_INPUT = { minHeight: 50, backgroundColor: "#f5f5f5", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: "#374151" } as const;

export function FieldLabel({ children }: { children: string }) {
  return <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>{children}</Text>;
}

export function Section({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View className="bg-white" style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      {title ? (
        <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function EditIconButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel="แก้ไข" className="items-center justify-center active:opacity-60" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#f3f3f3" }}>
      <Pencil size={16} color={TEXT_SECONDARY} strokeWidth={2.2} />
    </Pressable>
  );
}

export function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 3 }}>
      <FieldLabel>{label}</FieldLabel>
      <Text style={{ fontSize: 14.5, fontWeight: "500", color: "#0a0a0a", lineHeight: 21 }}>{value}</Text>
    </View>
  );
}

export function SheetHeader({ title, onClose, onSave, canSave }: { title: string; onClose: () => void; onSave: () => void; canSave: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    // Android: clear the status bar (iOS modal card already starts below it)
    <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16 + modalTopPad(insets.top), paddingBottom: 12 }}>
      <GlassIconButton onPress={onClose} size={44} accessibilityLabel="ปิด">
        <X size={22} color="#1a1a1a" strokeWidth={2.6} />
      </GlassIconButton>
      <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>{title}</Text>
      <GlassIconButton onPress={onSave} disabled={!canSave} size={44} accessibilityLabel="บันทึก" tintColor={glassTint("rgba(49,151,84,0.22)", "#d2e8d9")}>
        <Check size={22} color={BRAND_GREEN_DARK} strokeWidth={3} />
      </GlassIconButton>
    </View>
  );
}

// Bank badge — real logo on white (from data/bankAccounts), or the colored fallback badge.
export function BankBadge({ code, size }: { code: string; size: number }) {
  const b = bankByCode(code);
  const logo = bankLogo(code);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: logo ? "#fff" : b.color + "1a", borderWidth: logo ? 1 : 0, borderColor: "#eee", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {logo ? <Image source={logo} style={{ width: size * 0.74, height: size * 0.74 }} resizeMode="contain" /> : <Landmark size={size * 0.44} color={b.color} strokeWidth={2.2} />}
    </View>
  );
}

// Lighten (amt>0) / darken (amt<0) a hex color toward white / black.
function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "").padStart(6, "0");
  const n = parseInt(h, 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Gold EMV chip.
function CardChip() {
  return (
    <View style={{ width: 38, height: 28, borderRadius: 6, backgroundColor: "#e9c46a", overflow: "hidden", justifyContent: "center", paddingHorizontal: 3 }}>
      <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.2)", marginVertical: 2.5 }} />
      <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.2)", marginVertical: 2.5 }} />
      <View style={{ position: "absolute", left: "50%", top: 4, bottom: 4, width: 1, backgroundColor: "rgba(0,0,0,0.2)" }} />
    </View>
  );
}

// Bankbook / passbook visual — bank-color gradient card (mirrors the web owner console).
export function BankCard({ code, accountNo, accountName, verified = true }: { code: string; accountNo: string; accountName: string; verified?: boolean }) {
  const b = bankByCode(code);
  const logo = bankLogo(code);
  return (
    <LinearGradient
      colors={[shade(b.color, 0.2), b.color, shade(b.color, -0.34)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 20, padding: 18, minHeight: 196, justifyContent: "space-between", overflow: "hidden", shadowColor: b.color, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 }}
    >
      <View pointerEvents="none" style={{ position: "absolute", top: -44, right: -34, width: 156, height: 156, borderRadius: 78, backgroundColor: "rgba(255,255,255,0.1)" }} />
      <View pointerEvents="none" style={{ position: "absolute", bottom: -54, left: -22, width: 134, height: 134, borderRadius: 67, backgroundColor: "rgba(255,255,255,0.06)" }} />

      <View className="flex-row items-start justify-between">
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, letterSpacing: 1.5, color: "rgba(255,255,255,0.72)", fontWeight: "700" }}>BANK</Text>
          <Text numberOfLines={1} style={{ fontSize: 16, color: "#fff", fontWeight: "700", marginTop: 2 }}>{b.name}</Text>
        </View>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden", marginLeft: 10 }}>
          {logo ? <Image source={logo} style={{ width: 28, height: 28 }} resizeMode="contain" /> : <Landmark size={18} color={b.color} strokeWidth={2.2} />}
        </View>
      </View>

      <View>
        <CardChip />
        <Text style={{ fontSize: 22, color: "#fff", fontWeight: "700", letterSpacing: 3, marginTop: 10 }}>{accountNo}</Text>
      </View>

      <View className="flex-row items-end justify-between">
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.72)", fontWeight: "700" }}>ACCOUNT HOLDER</Text>
          <Text numberOfLines={1} style={{ fontSize: 14, color: "#fff", fontWeight: "600", marginTop: 2 }}>{accountName}</Text>
        </View>
        <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
          <Text style={{ fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.72)", fontWeight: "700" }}>STATUS</Text>
          <View className="flex-row items-center" style={{ gap: 3, marginTop: 2 }}>
            <Check size={12} color="#fff" strokeWidth={3} />
            <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>{verified ? "ยืนยันแล้ว" : "รอตรวจสอบ"}</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

/** บัญชีรับเงิน — payout bank account only (view + page-sheet edit). */
export function ShopPayoutScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  // Defaults mirror the bank shown in SupplierInfoScreen so the identity stays consistent.
  const [bankCode, setBankCode] = useState("KTB");
  const [accountName, setAccountName] = useState("บริษัท เมต้าเฮิร์บ จำกัด");
  const [accountNo, setAccountNo] = useState("1730746497");
  const [branch, setBranch] = useState("สำนักงานใหญ่");

  // Edit page-sheet drafts
  const [editing, setEditing] = useState(false);
  const [dBankCode, setDBankCode] = useState(bankCode);
  const [dName, setDName] = useState(accountName);
  const [dNo, setDNo] = useState(accountNo);
  const [dBranch, setDBranch] = useState(branch);
  const openEdit = () => { setDBankCode(bankCode); setDName(accountName); setDNo(accountNo); setDBranch(branch); setEditing(true); };
  const saveEdit = () => {
    setBankCode(dBankCode); setAccountName(dName.trim()); setAccountNo(dNo.trim()); setBranch(dBranch.trim());
    setEditing(false);
  };
  const canSave = dName.trim().length > 0 && dNo.trim().length >= 6;

  // Bank search sheet (mirrors AddBankAccountScreen)
  const [bankOpen, setBankOpen] = useState(false);
  const [bankQuery, setBankQuery] = useState("");
  const bankResults = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    return q ? THAI_BANKS.filter((b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)) : THAI_BANKS;
  }, [bankQuery]);

  const bank = bankByCode(bankCode);
  const dBank = bankByCode(dBankCode);

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="บัญชีรับเงิน" subtitle="บัญชีธนาคารสำหรับรับเงินจากการขาย" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {/* Bankbook / passbook visual — floats on the page bg (no card chrome) */}
          <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 18 }}>
            <View>
              {/* stacked white sheets peeking below the card → passbook (เล่มสมุด) look */}
              <View style={{ position: "absolute", left: 16, right: 16, top: 12, bottom: -12, borderRadius: 18, backgroundColor: "#e9e9e9", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(0,0,0,0.07)" }} />
              <View style={{ position: "absolute", left: 8, right: 8, top: 6, bottom: -6, borderRadius: 19, backgroundColor: "#ffffff", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(0,0,0,0.07)" }} />
              <BankCard code={bankCode} accountNo={accountNo} accountName={accountName} />
            </View>
          </View>

          {/* Bank account — view + edit */}
          <Section title="บัญชีธนาคารรับเงิน" right={<EditIconButton onPress={openEdit} />}>
            <View className="flex-row items-center" style={{ gap: 12, marginBottom: 16 }}>
              <BankBadge code={bankCode} size={46} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{`${bank.name} (${bank.code})`}</Text>
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 1 }}>บัญชีหลักสำหรับรับเงิน</Text>
              </View>
              <View className="flex-row items-center" style={{ gap: 3, backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                <ShieldCheck size={11} color={BRAND_GREEN} strokeWidth={2.4} />
                <Text style={{ fontSize: 10.5, fontWeight: "600", color: BRAND_GREEN }}>ยืนยันแล้ว</Text>
              </View>
            </View>
            <View style={{ gap: 14 }}>
              <ViewRow label="ชื่อบัญชี" value={accountName} />
              <ViewRow label="เลขที่บัญชี" value={accountNo} />
              <ViewRow label="สาขา" value={branch} />
            </View>
          </Section>

          <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 14, marginHorizontal: 16, lineHeight: 17 }}>
            กรุณาตรวจสอบชื่อบัญชีให้ตรงกับชื่อร้าน/นิติบุคคล เพื่อป้องกันปัญหาในการรับเงิน
          </Text>
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>

      {/* Edit page-sheet */}
      <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setEditing(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="แก้ไขบัญชีรับเงิน" onClose={() => setEditing(false)} onSave={saveEdit} canSave={canSave} />
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 6 }}>
              <FieldLabel>ธนาคาร</FieldLabel>
              <Pressable onPress={() => setBankOpen(true)} className="flex-row items-center active:opacity-80" style={[PAYOUT_INPUT, { gap: 10 }]}>
                <BankBadge code={dBankCode} size={28} />
                <Text style={{ flex: 1, fontSize: 15, color: "#374151" }}>{`${dBank.name} (${dBank.code})`}</Text>
                <ChevronDown size={18} color="#9ca3af" />
              </Pressable>
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel>ชื่อบัญชี</FieldLabel>
              <TextInput value={dName} onChangeText={setDName} placeholder="ชื่อตามสมุดบัญชี" placeholderTextColor="#a3a3a3" style={PAYOUT_INPUT} />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel>เลขที่บัญชี</FieldLabel>
              <TextInput value={dNo} onChangeText={(t) => setDNo(t.replace(/[^0-9]/g, ""))} placeholder="ระบุเลขบัญชี" placeholderTextColor="#a3a3a3" keyboardType="number-pad" maxLength={15} style={PAYOUT_INPUT} />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel>สาขา</FieldLabel>
              <TextInput value={dBranch} onChangeText={setDBranch} placeholder="เช่น สำนักงานใหญ่" placeholderTextColor="#a3a3a3" style={PAYOUT_INPUT} />
            </View>
          </ScrollView>

          {/* Bank search — page-sheet (mirrors AddBankAccountScreen) */}
          <Modal visible={bankOpen} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={() => { setBankOpen(false); setBankQuery(""); }}>
            <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16 + modalTopPad(insets.top), paddingBottom: 12 }}>
                <GlassIconButton onPress={() => { setBankOpen(false); setBankQuery(""); }} size={44} accessibilityLabel="ปิด">
                  <X size={22} color="#1a1a1a" strokeWidth={2.6} />
                </GlassIconButton>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>เลือกธนาคาร</Text>
                <View style={{ width: 44 }} />
              </View>

              <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                <View className="flex-row items-center" style={{ backgroundColor: "#f0f0f0", borderRadius: 999, paddingHorizontal: 14, height: 46, gap: 8 }}>
                  <Search size={18} color="#8a8f8a" />
                  <TextInput value={bankQuery} onChangeText={setBankQuery} placeholder="ค้นหาโดยชื่อธนาคาร" placeholderTextColor="#9ca3af" returnKeyType="search" style={{ flex: 1, fontSize: 15, color: "#1a1a1a", paddingVertical: 0 }} />
                  {bankQuery ? (
                    <Pressable onPress={() => setBankQuery("")} hitSlop={8} className="active:opacity-60">
                      <X size={16} color="#8a8f8a" />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
                {bankResults.length > 0 ? (
                  bankResults.map((b) => (
                    <Pressable
                      key={b.code}
                      onPress={() => { setDBankCode(b.code); setBankOpen(false); setBankQuery(""); }}
                      className="flex-row items-center active:opacity-60"
                      style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#f3f4f6" }}
                    >
                      <BankBadge code={b.code} size={40} />
                      <Text style={{ flex: 1, fontSize: 16, color: "#1a1a1a", fontWeight: "500" }}>{`${b.name} (${b.code})`}</Text>
                      {b.code === dBankCode ? <Check size={20} color={BRAND_GREEN} strokeWidth={2.6} /> : null}
                    </Pressable>
                  ))
                ) : (
                  <View style={{ alignItems: "center", paddingTop: 60 }}>
                    <Text style={{ fontSize: 14, color: "#9ca3af" }}>ไม่พบธนาคารที่ค้นหา</Text>
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
