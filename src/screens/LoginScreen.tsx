import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Eye, EyeOff } from "lucide-react-native";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LOGO = require("../../assets/logo.png");

const SOCIALS = [
  { label: "Google", color: "#ea4335" },
  { label: "Facebook", color: "#1877f2" },
  { label: "LINE", color: "#06c755" },
];

export function SocialRow() {
  return (
    <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
      {SOCIALS.map((s) => (
        <Pressable
          key={s.label}
          className="flex-1 flex-row items-center justify-center active:opacity-70"
          style={{ height: 42, borderWidth: 1, borderColor: "#d4d4d4", borderRadius: 999, gap: 7 }}
        >
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: s.color, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>{s.label[0]}</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: "500", color: TEXT_SECONDARY }} numberOfLines={1}>
            {s.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!email.trim() || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    nav.navigate("Main");
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
                onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate("Main"))}
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
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#0a0a0a" }}>ยินดีต้อนรับกลับ</Text>
                <Text style={{ fontSize: 12, color: TEXT_SECONDARY, textAlign: "center", lineHeight: 18 }}>
                  เข้าสู่ระบบเพื่อช้อปสมุนไพรไทย{"\n"}คุณภาพจาก METAHERB
                </Text>
              </View>

              {error ? <Text style={{ fontSize: 13, color: "#ef4444" }}>{error}</Text> : null}

              {/* Form */}
              <View style={{ width: "100%", gap: 14 }}>
                <View style={{ gap: 7 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>อีเมล</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="กรอกอีเมลของคุณ"
                    placeholderTextColor="#a3a3a3"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={{ backgroundColor: "#f5f5f5", height: 48, borderRadius: 999, paddingHorizontal: 18, fontSize: 14, color: "#374151" }}
                  />
                </View>
                <View style={{ gap: 7 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>รหัสผ่าน</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 999, paddingRight: 14 }}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="กรอกรหัสผ่าน"
                      placeholderTextColor="#a3a3a3"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      style={{ flex: 1, height: 48, paddingHorizontal: 18, fontSize: 14, color: "#374151" }}
                    />
                    <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8} className="active:opacity-60">
                      {showPassword ? <Eye size={20} color="#9ca3af" /> : <EyeOff size={20} color="#9ca3af" />}
                    </Pressable>
                  </View>
                </View>
                <Pressable hitSlop={6} className="self-end active:opacity-60">
                  <Text style={{ fontSize: 12, color: "#297a4e" }}>ลืมรหัสผ่าน?</Text>
                </Pressable>
              </View>

              {/* Demo account */}
              <Pressable
                onPress={() => { setEmail("user@test.com"); setPassword("12345678"); setError(""); }}
                className="active:opacity-80"
                style={{ width: "100%", backgroundColor: "#f0fdf4", borderRadius: 12, padding: 12 }}
              >
                <Text style={{ fontSize: 11.5, color: BRAND_GREEN, fontWeight: "600" }}>บัญชีทดลอง (แตะเพื่อกรอกอัตโนมัติ)</Text>
                <Text style={{ fontSize: 11.5, color: TEXT_SECONDARY, marginTop: 2 }}>User: user@test.com / 12345678</Text>
              </Pressable>

              {/* Login button */}
              <Pressable onPress={handleLogin} className="active:opacity-80 items-center justify-center" style={{ width: "100%", height: 49, borderRadius: 999, backgroundColor: "#008c45" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>เข้าสู่ระบบ</Text>
              </Pressable>

              {/* Divider */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, width: "100%" }}>
                <View style={{ flex: 1, height: 1, backgroundColor: "#e5e5e5" }} />
                <Text style={{ fontSize: 12, color: TEXT_MUTED }}>หรือ</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "#e5e5e5" }} />
              </View>

              <SocialRow />
            </View>

            {/* Bottom register link */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 16 }}>
              <Text style={{ fontSize: 14, color: "#0a0a0a" }}>ยังไม่มีบัญชี?</Text>
              <Pressable onPress={() => nav.navigate("Register")} hitSlop={6} className="active:opacity-60">
                <Text style={{ fontSize: 14, color: "#297a4e", textDecorationLine: "underline", fontWeight: "600" }}>สมัครสมาชิก</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
