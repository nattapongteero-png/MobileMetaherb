import { modalTopPad } from "../theme/layout";
import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { usePayment } from "../context/PaymentContext";
import { BRAND_GREEN } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

const TRUEMONEY_LOGO = require("../../assets/payment/truemoney.jpg");
const OTP_LEN = 6;

/** Mask a Thai mobile number for display: 0812345678 → 081-xxx-xx78. */
export function maskPhone(p: string) {
  return p.length >= 10 ? `${p.slice(0, 3)}-xxx-xx${p.slice(8)}` : p;
}

/**
 * Link a TrueMoney Wallet before it can be used — two steps in one modal:
 * enter phone number → confirm a 6-digit OTP. On success it reports the phone
 * back to the Payment screen by navigating there with a param, which also pops
 * the picker + this modal off the stack (mock: any 6 digits are accepted).
 */
export function TrueMoneyLinkScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { setSelectedPayment, setTrueMoneyPhone } = usePayment();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const otpRef = useRef<TextInput>(null);

  const phoneOk = phone.length >= 10;
  const otpOk = otp.length === OTP_LEN;

  const confirm = () => {
    // Commit to shared context, then pop the link screen + the picker to land
    // back on the existing Payment screen (no params/callbacks across modals).
    setTrueMoneyPhone(phone);
    setSelectedPayment("truemoney");
    nav.pop(2);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "white" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header — circular close / centered title / right spacer (app style). */}
      <View
        className="flex-row items-center justify-between"
        style={{ paddingHorizontal: 16, paddingTop: 16 + modalTopPad(insets.top), paddingBottom: 12 }}
      >
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>ผูกบัญชี TrueMoney</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, alignItems: "center" }} showsVerticalScrollIndicator={false}>
        <Image source={TRUEMONEY_LOGO} style={{ width: 72, height: 72, borderRadius: 18 }} resizeMode="cover"
          resizeMethod="resize" />

        {step === "phone" ? (
          <>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#0a0a0a", marginTop: 18 }}>
              ผูกบัญชี TrueMoney Wallet
            </Text>
            <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 21, marginTop: 6 }}>
              กรอกเบอร์โทรศัพท์ที่ลงทะเบียนกับ TrueMoney Wallet เพื่อรับรหัส OTP
            </Text>
            <TextInput
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 10))}
              placeholder="เบอร์โทรศัพท์ 10 หลัก"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              maxLength={10}
              style={{
                width: "100%",
                height: 52,
                backgroundColor: "#f5f5f5",
                borderRadius: 999,
                paddingHorizontal: 20,
                fontSize: 16,
                color: "#374151",
                marginTop: 24,
                textAlign: "center",
                letterSpacing: 1,
              }}
            />
          </>
        ) : (
          <>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#0a0a0a", marginTop: 18 }}>
              ยืนยันรหัส OTP
            </Text>
            <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 21, marginTop: 6 }}>
              กรอกรหัส 6 หลักที่ส่งไปยัง {maskPhone(phone)}
            </Text>

            {/* 6 boxes backed by one hidden input — tap anywhere to focus. */}
            <Pressable
              onPress={() => otpRef.current?.focus()}
              style={{ flexDirection: "row", gap: 8, marginTop: 28 }}
            >
              {Array.from({ length: OTP_LEN }).map((_, i) => {
                const focused = i === otp.length;
                return (
                  <View
                    key={i}
                    style={{
                      width: 46,
                      height: 56,
                      borderRadius: 14,
                      backgroundColor: "#f5f5f5",
                      borderWidth: focused ? 2 : 0,
                      borderColor: BRAND_GREEN,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 22, fontWeight: "700", color: "#0a0a0a" }}>{otp[i] ?? ""}</Text>
                  </View>
                );
              })}
              <TextInput
                ref={otpRef}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, OTP_LEN))}
                keyboardType="number-pad"
                maxLength={OTP_LEN}
                autoFocus
                style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
              />
            </Pressable>

            <View className="flex-row items-center" style={{ marginTop: 22, gap: 4 }}>
              <Text style={{ fontSize: 13, color: "#9ca3af" }}>ไม่ได้รับรหัส?</Text>
              <Pressable hitSlop={8} className="active:opacity-60">
                <Text style={{ fontSize: 13, color: BRAND_GREEN, fontWeight: "600" }}>ส่งรหัสอีกครั้ง</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => { setStep("phone"); setOtp(""); }} hitSlop={8} className="active:opacity-60" style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, color: "#6b7280" }}>เปลี่ยนเบอร์โทรศัพท์</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        {step === "phone" ? (
          <Pressable
            onPress={() => phoneOk && setStep("otp")}
            disabled={!phoneOk}
            className="active:opacity-80 items-center justify-center"
            style={{ height: 52, borderRadius: 999, backgroundColor: phoneOk ? BRAND_GREEN : "#cbd5cb" }}
          >
            <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>ขอรหัส OTP</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => otpOk && confirm()}
            disabled={!otpOk}
            className="active:opacity-80 items-center justify-center"
            style={{ height: 52, borderRadius: 999, backgroundColor: otpOk ? BRAND_GREEN : "#cbd5cb" }}
          >
            <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>ยืนยันและผูกบัญชี</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
