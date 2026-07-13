import { GLASS_BAR_TINT } from "../theme/tokens";
import { useState, type ReactNode } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, Image, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Camera, Paperclip, Check } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { Chip } from "../components/Chip";
import { getImagePicker } from "../utils/imagePicker";
import { useSeller } from "../context/SellerContext";
import { BRAND_GREEN, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";
import { setShopName as setSessionShopName } from "../store/session";
import { METAHERB_SHOP } from "../data/shopOrders";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const labelStyle = { fontSize: 13.5, fontWeight: "600", color: "#374151" } as const;

function Field({ label, required, value, onChange, placeholder, keyboardType, maxLength, multiline }: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad"; maxLength?: number; multiline?: boolean;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={labelStyle}>{label}{required ? <Text style={{ color: "#ef4444" }}> *</Text> : null}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#a3a3a3"
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        style={[
          { backgroundColor: "#f5f5f5", paddingHorizontal: 18, fontSize: 14, color: "#1a1a1a" },
          multiline ? { minHeight: 92, borderRadius: 16, paddingTop: 12, textAlignVertical: "top" } : { height: 48, borderRadius: 999 },
        ]}
      />
    </View>
  );
}

export function SellerRegisterScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { setIsSeller, setShopLogoUri, setShopProfile } = useSeller();

  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [bizType, setBizType] = useState<"personal" | "company">("personal");
  const [address, setAddress] = useState("");
  const [docName, setDocName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [accepted, setAccepted] = useState(false);

  const pickImage = async (onPick: (uri: string) => void) => {
    const P = getImagePicker();
    if (!P) { Alert.alert("กำลังพัฒนา", "การแนบรูป/ไฟล์ต้องอัปเดตแอปก่อน"); return; }
    const res = await P.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) onPick(res.assets[0].uri);
  };

  const isValid = !!(shopName.trim() && ownerName.trim() && email.trim() && phone.trim() && accepted);

  const submit = () => {
    if (!isValid) return;
    if (logoUri) setShopLogoUri(logoUri);
    setShopProfile({
      shopName: shopName.trim(),
      ownerName: ownerName.trim(),
      taxId: taxId.trim(),
      address: address.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
    setIsSeller(true);
    // The session now knows which shop this account owns — the console's data
    // is scoped by shop name, not by a global constant.
    setSessionShopName(shopName.trim() || METAHERB_SHOP);
    nav.replace("SellerSuccess");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="เปิดร้านค้ากับ METAHERB" subtitle="กรอกข้อมูลร้านเพื่อเริ่มขาย" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
          {/* Logo */}
          <View style={{ alignItems: "center", paddingTop: 18, paddingBottom: 6 }}>
            <Pressable onPress={() => pickImage(setLogoUri)} className="active:opacity-80" style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover"
          resizeMethod="resize" />
              ) : (
                <View style={{ alignItems: "center", gap: 5 }}>
                  <Camera size={24} color={BRAND_GREEN} strokeWidth={2} />
                  <Text style={{ fontSize: 11, color: TEXT_MUTED }}>โลโก้ร้าน</Text>
                </View>
              )}
            </Pressable>
            <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 8 }}>แตะเพื่ออัปโหลดโลโก้ (ทางเลือก)</Text>
          </View>

          {/* Shop info */}
          <Section title="ข้อมูลร้านค้า">
            <Field label="ชื่อร้าน" required value={shopName} onChange={setShopName} placeholder="เช่น เมต้าเฮิร์บ สโตร์" />
            <Field label="ชื่อเจ้าของ / ผู้ติดต่อ" required value={ownerName} onChange={setOwnerName} placeholder="ชื่อ-นามสกุล" />
            <Field label="เลขประจำตัวผู้เสียภาษี" value={taxId} onChange={setTaxId} placeholder="13 หลัก" keyboardType="number-pad" maxLength={13} />

            <View style={{ gap: 8 }}>
              <Text style={labelStyle}>ประเภทธุรกิจ <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Chip label="บุคคลธรรมดา" active={bizType === "personal"} onPress={() => setBizType("personal")} />
                <Chip label="นิติบุคคล" active={bizType === "company"} onPress={() => setBizType("company")} />
              </View>
            </View>

            <Field label="ที่อยู่จดทะเบียน" value={address} onChange={setAddress} placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์" multiline />

            {/* Document */}
            <View style={{ gap: 7 }}>
              <Text style={labelStyle}>เอกสารยืนยัน <Text style={{ color: TEXT_MUTED, fontWeight: "400" }}>(บัตรประชาชน/ทะเบียนพาณิชย์)</Text></Text>
              <Pressable onPress={() => pickImage(() => setDocName("แนบเอกสารแล้ว"))} className="active:opacity-70" style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 48, borderRadius: 16, borderWidth: 1, borderColor: "#dcdcdc", borderStyle: "dashed", paddingHorizontal: 16, backgroundColor: "#fff" }}>
                <Paperclip size={18} color={docName ? BRAND_GREEN : "#9ca3af"} strokeWidth={2} />
                <Text style={{ fontSize: 13.5, color: docName ? BRAND_GREEN : "#9ca3af", fontWeight: docName ? "600" : "400" }}>{docName ?? "คลิกเพื่อแนบเอกสาร"}</Text>
              </Pressable>
            </View>
          </Section>

          {/* Contact */}
          <Section title="ข้อมูลติดต่อ">
            <Field label="อีเมล" required value={email} onChange={setEmail} placeholder="example@email.com" keyboardType="email-address" />
            <Field label="เบอร์โทร" required value={phone} onChange={setPhone} placeholder="08X-XXX-XXXX" keyboardType="phone-pad" maxLength={10} />
          </Section>

          {/* Accept terms */}
          <Pressable onPress={() => setAccepted((v) => !v)} className="active:opacity-70" style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginHorizontal: 16, marginTop: 18 }}>
            <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: accepted ? BRAND_GREEN : "#cbd0cb", backgroundColor: accepted ? BRAND_GREEN : "transparent", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              {accepted ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
            </View>
            <Text style={{ flex: 1, fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 19 }}>
              ยอมรับ <Text style={{ color: BRAND_GREEN, fontWeight: "600" }} onPress={() => nav.navigate("TermsOfService")}>ข้อกำหนดร้านค้า</Text> และ <Text style={{ color: BRAND_GREEN, fontWeight: "600" }} onPress={() => nav.navigate("PrivacyPolicy")}>นโยบายความเป็นส่วนตัว</Text>
            </Text>
          </Pressable>
        </ScrollView>

        {/* Top scroll-edge fade — content dissolves under the header */}
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />

        {/* Floating Liquid Glass submit bar — same as the app's other action bars */}
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
            <GlassView glassEffectStyle="regular" colorScheme="light"
              tintColor={GLASS_BAR_TINT} style={{ borderRadius: 34, overflow: "hidden", padding: 9 }}>
              <Pressable onPress={submit} disabled={!isValid} className="active:opacity-90" style={{ height: 50, borderRadius: 999, backgroundColor: isValid ? BRAND_GREEN : "#cfd4d1", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>สมัครเปิดร้านค้า</Text>
              </Pressable>
            </GlassView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", marginTop: 12, paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{title}</Text>
      {children}
    </View>
  );
}
