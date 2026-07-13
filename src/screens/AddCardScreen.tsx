import { modalTopPad } from "../theme/layout";
import { useState, type ReactNode } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { X, Info } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { useRefund } from "../context/RefundContext";
import type { CardBrand } from "../data/bankAccounts";
import { BRAND_GREEN } from "../theme/tokens";

const LABEL = "#6b7280";

/** Detect the card brand from the number (same prefixes the networks use). */
function detectBrand(digits: string): CardBrand {
  if (/^3[47]/.test(digits)) return "amex";
  if (/^35/.test(digits)) return "jcb";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  return "visa";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8, flex: 1 }}>
      <Text style={{ fontSize: 14, color: LABEL }}>{label}</Text>
      {children}
    </View>
  );
}

// Pill field on a gray fill — matches the app theme (Login screen inputs).
const inputStyle = {
  height: 50,
  backgroundColor: "#f5f5f5",
  borderRadius: 999,
  paddingHorizontal: 18,
  fontSize: 15,
  color: "#374151",
} as const;

/** Add a credit / debit card — slide-up modal form (mock; "บันทึกบัตร" just closes). */
export function AddCardScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { addCard } = useRefund();
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [primary, setPrimary] = useState(true);

  const save = () => {
    const digits = number.replace(/\D/g, "");
    const [mm, yy] = expiry.split(/[/\s]+/);
    if (digits.length < 13) { Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกหมายเลขบัตรให้ถูกต้อง"); return; }
    if (!mm || !yy) { Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกวันหมดอายุ (ดด/ปป)"); return; }
    addCard({
      brand: detectBrand(digits),
      last4: digits.slice(-4),
      expMonth: parseInt(mm, 10) || 1,
      expYear: parseInt(yy, 10) || 0,
      isDefault: primary,
    });
    nav.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header — same style as the payment-method picker (circular close /
          centered title / right spacer). */}
      <View
        className="flex-row items-center justify-between"
        style={{ paddingHorizontal: 16, paddingTop: 16 + modalTopPad(insets.top), paddingBottom: 12 }}
      >
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>เพิ่มบัตร</Text>
        {/* Spacer — balances the close button so the title stays centered. */}
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} showsVerticalScrollIndicator={false}>
        <Field label="หมายเลขบัตร">
          <TextInput
            value={number}
            onChangeText={setNumber}
            placeholder="•••• •••• •••• ••••"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            maxLength={19}
            style={inputStyle}
          />
        </Field>

        <View className="flex-row" style={{ gap: 12 }}>
          <Field label="วันหมดอายุ">
            <View style={{ justifyContent: "center" }}>
              <TextInput
                value={expiry}
                onChangeText={setExpiry}
                placeholder="MM/YY"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={5}
                style={inputStyle}
              />
              <Info size={18} color="#bcbcc0" style={{ position: "absolute", right: 14 }} />
            </View>
          </Field>
          <Field label="CVV">
            <View style={{ justifyContent: "center" }}>
              <TextInput
                value={cvv}
                onChangeText={setCvv}
                placeholder="•••"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                style={inputStyle}
              />
              <Info size={18} color="#bcbcc0" style={{ position: "absolute", right: 14 }} />
            </View>
          </Field>
        </View>

        <Field label="ชื่อบนบัตร">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="ใส่ชื่อผู้ถือบัตร (ภาษาอังกฤษ)"
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
            style={inputStyle}
          />
        </Field>

        <Field label="ชื่อเล่นบัตร (ไม่บังคับ)">
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="ใส่ชื่อเล่นบัตร"
            placeholderTextColor="#9ca3af"
            style={inputStyle}
          />
        </Field>

        <View className="flex-row items-center justify-between" style={{ paddingTop: 4 }}>
          <Text style={{ fontSize: 16, color: "#0a0a0a" }}>ตั้งค่าเป็นบัตรหลัก</Text>
          <Switch
            value={primary}
            onValueChange={setPrimary}
            trackColor={{ false: "#d1d5db", true: BRAND_GREEN }}
            thumbColor="#fff"
          />
        </View>

        <Text style={{ fontSize: 13, color: "#6b7280", lineHeight: 21, marginTop: 4 }}>
          เมื่อดำเนินการต่อ จะถือว่าคุณได้รับทราบและตกลงให้ข้อมูลดังกล่าวเพื่อใช้ในการชำระเงิน
          ระบบอาจหักเงินจากบัตรของคุณเพื่อยืนยันว่าบัตรใช้งานได้จริง และจะคืนเงินเข้าบัตรให้อัตโนมัติ
          ภายหลังได้รับการยืนยัน
        </Text>
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={save}
          className="active:opacity-80 items-center justify-center"
          style={{ height: 52, borderRadius: 999, backgroundColor: BRAND_GREEN }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>บันทึกบัตร</Text>
        </Pressable>
      </View>
    </View>
  );
}
