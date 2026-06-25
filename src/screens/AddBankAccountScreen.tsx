import { useState, type ReactNode } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { X, Search, ChevronDown, Landmark } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { useRefund } from "../context/RefundContext";
import { THAI_BANKS, bankByCode, bankLogo } from "../data/bankAccounts";
import { BRAND_GREEN } from "../theme/tokens";

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 14, color: "#1a1a1a", fontWeight: "600" }}>
        {label}
        {required ? <Text style={{ color: "#e11d48" }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

// Pill field on a gray fill — same as the add-address form.
const inputStyle = {
  minHeight: 50,
  backgroundColor: "#f5f5f5",
  borderRadius: 999,
  paddingHorizontal: 18,
  paddingVertical: 12,
  fontSize: 15,
  color: "#374151",
} as const;

const hintStyle = { fontSize: 12, color: "#9ca3af", marginTop: 2, marginLeft: 6 } as const;

export function AddBankAccountScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { addAccount, setSelectedId } = useRefund();

  const [bankCode, setBankCode] = useState("KTB");
  const [name, setName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [bankQuery, setBankQuery] = useState("");

  const bank = bankByCode(bankCode);
  const digits = accountNo.replace(/\D/g, "");
  const canSave = name.trim() !== "" && digits.length >= 10;

  const q = bankQuery.trim().toLowerCase();
  const bankResults = q
    ? THAI_BANKS.filter((b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q))
    : THAI_BANKS;

  const save = () => {
    if (!canSave) return;
    const acc = addAccount({ bankCode, accountName: name.trim(), accountNo: digits, isDefault });
    setSelectedId(acc.id);
    nav.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>เพิ่มบัญชีธนาคาร</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ธนาคาร — tappable, opens the bank search sheet */}
        <Field label="ธนาคาร" required>
          <Pressable onPress={() => setBankOpen(true)} className="flex-row items-center active:opacity-80" style={[inputStyle, { gap: 10 }]}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: bankLogo(bankCode) ? "#fff" : bank.color + "1a", borderWidth: bankLogo(bankCode) ? 1 : 0, borderColor: "#eee", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {bankLogo(bankCode) ? <Image source={bankLogo(bankCode)!} style={{ width: 22, height: 22 }} resizeMode="contain" /> : <Landmark size={15} color={bank.color} strokeWidth={2.2} />}
            </View>
            <Text style={{ flex: 1, fontSize: 15, color: "#374151" }}>{bank.name} ({bank.code})</Text>
            <ChevronDown size={18} color="#9ca3af" />
          </Pressable>
        </Field>

        <Field label="ชื่อบัญชี" required>
          <TextInput value={name} onChangeText={setName} placeholder="ชื่อ-นามสกุลตามที่ปรากฏในบัญชีธนาคาร" placeholderTextColor="#9ca3af" style={inputStyle} />
        </Field>

        <View style={{ gap: 0 }}>
          <Field label="เลขบัญชี" required>
            <TextInput
              value={accountNo}
              onChangeText={(t) => setAccountNo(t.replace(/[^0-9]/g, ""))}
              placeholder="ระบุเลขบัญชี"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={15}
              style={inputStyle}
            />
          </Field>
          <Text style={hintStyle}>กรอกชื่อบัญชีให้ตรงกับสมุดบัญชี เพื่อให้การคืนเงินสำเร็จ</Text>
        </View>

        <View className="flex-row items-center justify-between" style={{ paddingTop: 4 }}>
          <Text style={{ fontSize: 16, color: "#0a0a0a" }}>ตั้งเป็นบัญชีหลัก</Text>
          <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ false: "#d1d5db", true: BRAND_GREEN }} thumbColor="#fff" />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={save}
          disabled={!canSave}
          className="active:opacity-80 items-center justify-center"
          style={{ height: 52, borderRadius: 999, backgroundColor: canSave ? BRAND_GREEN : "#cbd5cb" }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>บันทึกบัญชี</Text>
        </Pressable>
      </View>

      {/* Bank search — page-sheet modal (same style as the postal-code search) */}
      <Modal visible={bankOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setBankOpen(false); setBankQuery(""); }}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
            <GlassIconButton onPress={() => { setBankOpen(false); setBankQuery(""); }} size={44} accessibilityLabel="ปิด">
              <X size={22} color="#1a1a1a" strokeWidth={2.6} />
            </GlassIconButton>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>เลือกธนาคาร</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View className="flex-row items-center" style={{ backgroundColor: "#f0f0f0", borderRadius: 999, paddingHorizontal: 14, height: 46, gap: 8 }}>
              <Search size={18} color="#8a8f8a" />
              <TextInput
                value={bankQuery}
                onChangeText={setBankQuery}
                placeholder="ค้นหาโดยชื่อธนาคาร"
                placeholderTextColor="#9ca3af"
                returnKeyType="search"
                style={{ flex: 1, fontSize: 15, color: "#1a1a1a", paddingVertical: 0 }}
              />
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
                  onPress={() => { setBankCode(b.code); setBankOpen(false); setBankQuery(""); }}
                  className="flex-row items-center active:opacity-60"
                  style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#f3f4f6" }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bankLogo(b.code) ? "#fff" : b.color + "1a", borderWidth: bankLogo(b.code) ? 1 : 0, borderColor: "#eee", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {bankLogo(b.code) ? <Image source={bankLogo(b.code)!} style={{ width: 30, height: 30 }} resizeMode="contain" /> : <Landmark size={20} color={b.color} strokeWidth={2.2} />}
                  </View>
                  <Text style={{ flex: 1, fontSize: 16, color: "#1a1a1a", fontWeight: "500" }}>{b.name} ({b.code})</Text>
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
  );
}
