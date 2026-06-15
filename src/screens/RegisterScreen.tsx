import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Eye, EyeOff, Check, Store, ArrowRight } from "lucide-react-native";
import { SocialRow } from "./LoginScreen";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LOGO = require("../../assets/logo.png");
const INPUT = { backgroundColor: "#f5f5f5", height: 48, borderRadius: 999, paddingHorizontal: 18, fontSize: 14, color: "#374151" } as const;

export function RegisterScreen() {
  const nav = useNavigation<Nav>();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = () => {
    if (!username.trim() || !password || !email.trim() || !phone.trim()) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (!accepted) {
      setError("กรุณายอมรับเงื่อนไขการใช้งาน");
      return;
    }
    Alert.alert("สมัครสมาชิกสำเร็จ", "ยินดีต้อนรับสู่ METAHERB", [{ text: "ตกลง", onPress: () => nav.navigate("Main") }]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#eef2ef" }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ backgroundColor: "#fff", borderRadius: 22, overflow: "hidden", paddingBottom: 8 }}>
            {/* Back */}
            <View style={{ padding: 14 }}>
              <Pressable
                onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate("Login"))}
                hitSlop={8}
                className="flex-row items-center self-start active:opacity-70"
                style={{ backgroundColor: "rgba(49,151,84,0.1)", paddingLeft: 10, paddingRight: 14, paddingVertical: 7, borderRadius: 999, gap: 4 }}
              >
                <ChevronLeft size={15} color={BRAND_GREEN} strokeWidth={2.5} />
                <Text style={{ fontSize: 12, color: BRAND_GREEN, fontWeight: "500" }}>ย้อนกลับ</Text>
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 24, paddingBottom: 16, gap: 16, alignItems: "center" }}>
              <Image source={LOGO} style={{ width: 58, height: 58 }} resizeMode="contain" />
              <View style={{ alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#0a0a0a" }}>สร้างบัญชีใหม่</Text>
                <Text style={{ fontSize: 12, color: TEXT_SECONDARY, textAlign: "center", lineHeight: 18 }}>
                  สมัครสมาชิกเพื่อเริ่มช้อป{"\n"}สมุนไพรไทยคุณภาพจาก METAHERB
                </Text>
              </View>

              {error ? <Text style={{ fontSize: 13, color: "#ef4444" }}>{error}</Text> : null}

              {/* Form */}
              <View style={{ width: "100%", gap: 14 }}>
                <View style={{ gap: 7 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>ชื่อผู้ใช้</Text>
                  <TextInput value={username} onChangeText={setUsername} placeholder="ตั้งชื่อผู้ใช้" placeholderTextColor="#a3a3a3" autoCapitalize="none" style={INPUT} />
                </View>
                <View style={{ gap: 7 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>รหัสผ่าน</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 999, paddingRight: 14 }}>
                    <TextInput value={password} onChangeText={setPassword} placeholder="อย่างน้อย 8 ตัวอักษร" placeholderTextColor="#a3a3a3" secureTextEntry={!showPassword} autoCapitalize="none" style={{ flex: 1, height: 48, paddingHorizontal: 18, fontSize: 14, color: "#374151" }} />
                    <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8} className="active:opacity-60">
                      {showPassword ? <Eye size={20} color="#9ca3af" /> : <EyeOff size={20} color="#9ca3af" />}
                    </Pressable>
                  </View>
                </View>
                <View style={{ gap: 7 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>อีเมล</Text>
                  <TextInput value={email} onChangeText={setEmail} placeholder="กรอกอีเมล" placeholderTextColor="#a3a3a3" autoCapitalize="none" keyboardType="email-address" style={INPUT} />
                </View>
                <View style={{ gap: 7 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>เบอร์โทรศัพท์</Text>
                  <TextInput value={phone} onChangeText={setPhone} placeholder="08x-xxx-xxxx" placeholderTextColor="#a3a3a3" keyboardType="phone-pad" style={INPUT} />
                </View>

                {/* Accept terms */}
                <Pressable onPress={() => setAccepted((a) => !a)} className="flex-row items-start active:opacity-70" style={{ gap: 10 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: accepted ? BRAND_GREEN : "#cbd5d1", backgroundColor: accepted ? BRAND_GREEN : "transparent", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    {accepted ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
                  </View>
                  <Text style={{ flex: 1, fontSize: 12, color: "#374151", lineHeight: 19 }}>
                    ฉันยอมรับ <Text style={{ color: "#297a4e", textDecorationLine: "underline" }}>เงื่อนไขการใช้งาน</Text> และ <Text style={{ color: "#297a4e", textDecorationLine: "underline" }}>นโยบายความเป็นส่วนตัว</Text>
                  </Text>
                </Pressable>
              </View>

              {/* Register button */}
              <Pressable onPress={handleRegister} className="active:opacity-80 items-center justify-center" style={{ width: "100%", height: 49, borderRadius: 999, backgroundColor: "#008c45" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>สมัครสมาชิก</Text>
              </Pressable>

              {/* Seller cross-link */}
              <Pressable
                onPress={() => Alert.alert("เปิดร้านค้า", "การสมัครร้านค้าอยู่ระหว่างพัฒนา")}
                className="flex-row items-center active:opacity-80"
                style={{ width: "100%", backgroundColor: "rgba(49,151,84,0.08)", borderWidth: 1, borderColor: "rgba(49,151,84,0.2)", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 12 }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                  <Store size={17} color={BRAND_GREEN} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#1d5b32" }}>อยากเปิดร้านค้าบน METAHERB?</Text>
                  <Text style={{ fontSize: 11.5, color: TEXT_SECONDARY, marginTop: 1 }}>สมัครเป็นร้านค้า แล้วลงขายสินค้าได้ทันที</Text>
                </View>
                <ArrowRight size={17} color={BRAND_GREEN} strokeWidth={2.2} />
              </Pressable>

              {/* Divider */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, width: "100%" }}>
                <View style={{ flex: 1, height: 1, backgroundColor: "#e5e5e5" }} />
                <Text style={{ fontSize: 12, color: TEXT_MUTED }}>หรือ</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "#e5e5e5" }} />
              </View>

              <SocialRow />
            </View>

            {/* Bottom login link */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 16 }}>
              <Text style={{ fontSize: 14, color: "#0a0a0a" }}>มีบัญชีแล้ว?</Text>
              <Pressable onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate("Login"))} hitSlop={6} className="active:opacity-60">
                <Text style={{ fontSize: 14, color: "#297a4e", textDecorationLine: "underline", fontWeight: "600" }}>เข้าสู่ระบบ</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
