import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Lock } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { useSeller } from "../context/SellerContext";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const labelStyle = { fontSize: 13.5, fontWeight: "600", color: "#374151" } as const;
const pillStyle = { backgroundColor: "#f5f5f5", height: 48, borderRadius: 999, paddingHorizontal: 18, fontSize: 14, color: "#1a1a1a" } as const;

function Field({ label, required, value, onChange, placeholder, keyboardType, maxLength, locked }: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad" | "url"; maxLength?: number; locked?: boolean;
}) {
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={labelStyle}>{label}{required ? <Text style={{ color: "#ef4444" }}> *</Text> : null}</Text>
        {locked ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Lock size={10} color={TEXT_MUTED} strokeWidth={2.4} />
            <Text style={{ fontSize: 10.5, color: TEXT_MUTED }}>จากข้อมูลร้านค้า</Text>
          </View>
        ) : null}
      </View>
      <View>
        <TextInput
          value={value}
          onChangeText={onChange}
          editable={!locked}
          placeholder={placeholder}
          placeholderTextColor="#a3a3a3"
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize="none"
          style={[pillStyle, locked ? { backgroundColor: "#edefed", color: "#6b7280", paddingRight: 42 } : null]}
        />
        {locked ? (
          <View pointerEvents="none" style={{ position: "absolute", right: 15, top: 0, bottom: 0, justifyContent: "center" }}>
            <Lock size={15} color="#9ca3af" strokeWidth={2.2} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function BrandRegisterScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { setIsTrialBrand, shopProfile } = useSeller();

  const [brandName, setBrandName] = useState(shopProfile?.shopName ?? "");
  const [tradeRegNo, setTradeRegNo] = useState(shopProfile?.taxId ?? "");
  const [contactName, setContactName] = useState(shopProfile?.ownerName ?? "");
  const [email, setEmail] = useState(shopProfile?.email ?? "");
  const [phone, setPhone] = useState(shopProfile?.phone ?? "");
  const [website, setWebsite] = useState("");

  const isValid = !!(brandName.trim() && tradeRegNo.trim() && contactName.trim() && email.trim() && phone.trim());

  const submit = () => {
    if (!isValid) return;
    setIsTrialBrand(true);
    nav.replace("BrandSuccess");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="สมัครเป็นแบรนด์ทดสอบ" subtitle="ลงสินค้าให้ผู้ใช้ทดลองก่อนวางขายจริง" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
          {/* Brand info */}
          <View style={{ backgroundColor: "#fff", marginTop: 12, paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>ข้อมูลแบรนด์</Text>
            <Field label="ชื่อแบรนด์ / บริษัท" required value={brandName} onChange={setBrandName} placeholder="เช่น Herbal Lab Co., Ltd." />
            <Field label="เลขทะเบียนการค้า" required value={tradeRegNo} onChange={setTradeRegNo} placeholder="13 หลัก" keyboardType="number-pad" maxLength={13} />
            <Field label="ชื่อ-นามสกุลผู้ติดต่อหลัก" required value={contactName} onChange={setContactName} placeholder="ชื่อ-นามสกุล" />
            <Field label="อีเมล" required value={email} onChange={setEmail} placeholder="example@brand.com" keyboardType="email-address" />
            <Field label="เบอร์โทร" required value={phone} onChange={setPhone} placeholder="08X-XXX-XXXX" keyboardType="phone-pad" maxLength={10} />
            <Field label="เว็บไซต์แบรนด์" value={website} onChange={setWebsite} placeholder="https://www.brand.com" keyboardType="url" />
          </View>

          <Text style={{ fontSize: 11.5, color: TEXT_MUTED, textAlign: "center", marginTop: 14, marginHorizontal: 32, lineHeight: 17 }}>
            ทีมงานจะตรวจสอบใบสมัครภายใน 3–5 วันทำการ และแจ้งผลผ่านอีเมล
          </Text>
        </ScrollView>

        {/* Top scroll-edge fade */}
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />

        {/* Floating submit bar */}
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
            <GlassView glassEffectStyle="regular" colorScheme="light" style={{ borderRadius: 34, overflow: "hidden", padding: 9 }}>
              <Pressable onPress={submit} disabled={!isValid} className="active:opacity-90" style={{ height: 50, borderRadius: 999, backgroundColor: isValid ? BRAND_GREEN : "#cfd4d1", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>ส่งใบสมัครแบรนด์ทดสอบ</Text>
              </Pressable>
            </GlassView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
