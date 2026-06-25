import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Image, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Eye, EyeOff, Mail, Lock } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LOGO = require("../../assets/logo.png");
const LEAF_IMGS = {
  a: require("../../assets/herb-leaf-a.png"),
  b: require("../../assets/herb-leaf-b.png"),
  c: require("../../assets/herb-leaf-c.png"),
  d: require("../../assets/herb-leaf-d.png"),
};

const SOCIALS = [
  { label: "Google", color: "#ea4335" },
  { label: "Facebook", color: "#1877f2" },
  { label: "LINE", color: "#06c755" },
];

// Real tea-leaf photos scattered on the green hero.
const DECO_LEAVES: { img: number; size: number; rot: string; opacity: number; top?: number; bottom?: number; left?: number; right?: number }[] = [
  { img: LEAF_IMGS.a, size: 158, rot: "16deg", opacity: 0.82, top: -32, right: -40 },
  { img: LEAF_IMGS.b, size: 126, rot: "-26deg", opacity: 0.7, bottom: -32, left: -38 },
  { img: LEAF_IMGS.c, size: 74, rot: "-28deg", opacity: 0.85, top: 70, right: 22 },
  { img: LEAF_IMGS.d, size: 56, rot: "22deg", opacity: 0.75, bottom: 36, right: 92 },
  { img: LEAF_IMGS.c, size: 46, rot: "200deg", opacity: 0.6, top: 104, left: 16 },
];

export function SocialRow({ onAuth }: { onAuth?: (provider: string) => void }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePress = (label: string) => {
    if (loading) return;
    setLoading(label);
    // Mock OAuth round-trip. Swap this timeout for expo-auth-session
    // (Google / Facebook / LINE) when wiring real providers.
    setTimeout(() => {
      setLoading(null);
      onAuth?.(label);
    }, 1100);
  };

  return (
    <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
      {SOCIALS.map((s) => {
        const busy = loading === s.label;
        return (
          <Pressable
            key={s.label}
            onPress={() => handlePress(s.label)}
            disabled={!!loading}
            className="flex-1 flex-row items-center justify-center active:opacity-70"
            style={{ height: 46, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 999, gap: 7, backgroundColor: "#fff", opacity: loading && !busy ? 0.5 : 1 }}
          >
            {busy ? (
              <ActivityIndicator size="small" color={s.color} />
            ) : (
              <>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: s.color, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>{s.label[0]}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: "500", color: TEXT_SECONDARY }} numberOfLines={1}>
                  {s.label}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Real tea-leaf photos scattered over a green hero — shared by Login & Register. */
export function HeroLeaves() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      {DECO_LEAVES.map((d, i) => (
        <View key={i} style={{ position: "absolute", top: d.top, bottom: d.bottom, left: d.left, right: d.right, opacity: d.opacity, transform: [{ rotate: d.rot }] }}>
          <Image source={d.img} style={{ width: d.size, height: d.size }} resizeMode="contain" />
        </View>
      ))}
    </View>
  );
}

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = () => {
    if (!email.trim() || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    nav.navigate("Main");
  };

  return (
    <View style={{ flex: 1, backgroundColor: BRAND_GREEN_DARK }}>
      <StatusBar style="light" />
      <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bounces={false}
        >
          {/* Hero */}
          <LinearGradient
            colors={[BRAND_GREEN, BRAND_GREEN_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 10, paddingBottom: 46, paddingHorizontal: 22, overflow: "hidden" }}
          >
            <HeroLeaves />

            <GlassIconButton onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate("Main"))} accessibilityLabel="ย้อนกลับ">
              <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
            </GlassIconButton>

            <View style={{ alignItems: "center", marginTop: 14 }}>
              <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 }}>
                <Image source={LOGO} style={{ width: 74, height: 74 }} resizeMode="contain" />
              </View>
              <Text style={{ fontSize: 23, fontWeight: "800", color: "#fff", marginTop: 16 }}>ยินดีต้อนรับกลับ</Text>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", textAlign: "center", lineHeight: 19, marginTop: 6 }}>
                เข้าสู่ระบบเพื่อช้อปสมุนไพรไทย{"\n"}คุณภาพจาก METAHERB
              </Text>
            </View>
          </LinearGradient>

          {/* Form sheet — rises over the hero */}
          <View style={{ flexGrow: 1, backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -22, paddingHorizontal: 22, paddingTop: 26, paddingBottom: insets.bottom + 22 }}>
            {error ? (
              <View style={{ backgroundColor: "#fef2f2", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: "#ef4444", textAlign: "center" }}>{error}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={{ gap: 7, marginBottom: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>อีเมล</Text>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 999, paddingHorizontal: 16, gap: 10 }}>
                <Mail size={18} color="#9ca3af" strokeWidth={2} />
                <TextInput
                  value={email}
                  onChangeText={(v) => { setEmail(v); if (error) setError(""); }}
                  placeholder="กรอกอีเมลของคุณ"
                  placeholderTextColor="#a3a3a3"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  style={{ flex: 1, height: 50, fontSize: 14, color: "#374151" }}
                />
              </View>
            </View>

            {/* Password */}
            <View style={{ gap: 7 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>รหัสผ่าน</Text>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 999, paddingHorizontal: 16, gap: 10 }}>
                <Lock size={18} color="#9ca3af" strokeWidth={2} />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(v) => { setPassword(v); if (error) setError(""); }}
                  placeholder="กรอกรหัสผ่าน"
                  placeholderTextColor="#a3a3a3"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  style={{ flex: 1, height: 50, fontSize: 14, color: "#374151" }}
                />
                <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8} className="active:opacity-60">
                  {showPassword ? <Eye size={20} color="#9ca3af" /> : <EyeOff size={20} color="#9ca3af" />}
                </Pressable>
              </View>
            </View>

            <Pressable hitSlop={6} className="self-end active:opacity-60" style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 12.5, color: BRAND_GREEN, fontWeight: "600" }}>ลืมรหัสผ่าน?</Text>
            </Pressable>

            {/* Demo account */}
            <Pressable
              onPress={() => { setEmail("ethan.walker@gmail.com"); setPassword("12345678"); setError(""); }}
              className="active:opacity-80"
              style={{ backgroundColor: "#f0fdf4", borderRadius: 12, padding: 12, marginTop: 14 }}
            >
              <Text style={{ fontSize: 11.5, color: BRAND_GREEN, fontWeight: "600" }}>บัญชีทดลอง (แตะเพื่อกรอกอัตโนมัติ)</Text>
              <Text style={{ fontSize: 11.5, color: TEXT_SECONDARY, marginTop: 2 }}>User: ethan.walker@gmail.com / 12345678</Text>
            </Pressable>

            {/* Login button */}
            <Pressable onPress={handleLogin} className="active:opacity-80 items-center justify-center" style={{ height: 52, borderRadius: 999, backgroundColor: BRAND_GREEN, marginTop: 18, shadowColor: BRAND_GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>เข้าสู่ระบบ</Text>
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginVertical: 20 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#ececec" }} />
              <Text style={{ fontSize: 12, color: TEXT_MUTED }}>หรือเข้าสู่ระบบด้วย</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#ececec" }} />
            </View>

            <SocialRow onAuth={() => nav.navigate("Main")} />

            {/* Register */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 24 }}>
              <Text style={{ fontSize: 14, color: TEXT_SECONDARY }}>ยังไม่มีบัญชี?</Text>
              <Pressable onPress={() => nav.navigate("Register")} hitSlop={6} className="active:opacity-60">
                <Text style={{ fontSize: 14, color: BRAND_GREEN, fontWeight: "700" }}>สมัครสมาชิก</Text>
              </Pressable>
            </View>
          </View>
      </ScrollView>
    </View>
  );
}
