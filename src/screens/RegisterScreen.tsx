import { useRef, useState, type ReactNode } from "react";
import { View, Text, TextInput, Pressable, Alert, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Eye, EyeOff, Check, Store, ArrowRight, User, Lock, Mail, Phone } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { SocialRow } from "./LoginScreen";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const pillStyle = { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 999, paddingHorizontal: 16, gap: 10 } as const;
const inputStyle = { flex: 1, height: 50, fontSize: 14, color: "#374151" } as const;
const labelStyle = { fontSize: 13.5, fontWeight: "600", color: "#374151" } as const;

export function RegisterScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const clearErr = () => { if (error) setError(""); };

  // Top fade only appears once scrolled — fades back out at the very top.
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeOpacity = scrollY.interpolate({ inputRange: [0, 24], outputRange: [0, 1], extrapolate: "clamp" });

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
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="สมัครสมาชิก" subtitle="สร้างบัญชีใหม่กับ METAHERB" onBack={() => (nav.canGoBack() ? nav.goBack() : nav.navigate("Login"))} showSearch={false} />

      <View style={{ flex: 1 }}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        >
          {error ? (
            <View style={{ backgroundColor: "#fef2f2", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginHorizontal: 16, marginTop: 14 }}>
              <Text style={{ fontSize: 13, color: "#ef4444", textAlign: "center" }}>{error}</Text>
            </View>
          ) : null}

          {/* Account info */}
          <Section title="ข้อมูลบัญชี">
            <View style={{ gap: 7 }}>
              <Text style={labelStyle}>ชื่อผู้ใช้</Text>
              <View style={pillStyle}>
                <User size={18} color="#9ca3af" strokeWidth={2} />
                <TextInput value={username} onChangeText={(v) => { setUsername(v); clearErr(); }} placeholder="ตั้งชื่อผู้ใช้" placeholderTextColor="#a3a3a3" autoCapitalize="none" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => passwordRef.current?.focus()} style={inputStyle} />
              </View>
            </View>

            <View style={{ gap: 7 }}>
              <Text style={labelStyle}>รหัสผ่าน</Text>
              <View style={pillStyle}>
                <Lock size={18} color="#9ca3af" strokeWidth={2} />
                <TextInput ref={passwordRef} value={password} onChangeText={(v) => { setPassword(v); clearErr(); }} placeholder="อย่างน้อย 8 ตัวอักษร" placeholderTextColor="#a3a3a3" secureTextEntry={!showPassword} autoCapitalize="none" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => emailRef.current?.focus()} style={inputStyle} />
                <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8} className="active:opacity-60">
                  {showPassword ? <Eye size={20} color="#9ca3af" /> : <EyeOff size={20} color="#9ca3af" />}
                </Pressable>
              </View>
            </View>

            <View style={{ gap: 7 }}>
              <Text style={labelStyle}>อีเมล</Text>
              <View style={pillStyle}>
                <Mail size={18} color="#9ca3af" strokeWidth={2} />
                <TextInput ref={emailRef} value={email} onChangeText={(v) => { setEmail(v); clearErr(); }} placeholder="กรอกอีเมล" placeholderTextColor="#a3a3a3" autoCapitalize="none" keyboardType="email-address" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => phoneRef.current?.focus()} style={inputStyle} />
              </View>
            </View>

            <View style={{ gap: 7 }}>
              <Text style={labelStyle}>เบอร์โทรศัพท์</Text>
              <View style={pillStyle}>
                <Phone size={18} color="#9ca3af" strokeWidth={2} />
                <TextInput ref={phoneRef} value={phone} onChangeText={(v) => { setPhone(v); clearErr(); }} placeholder="08x-xxx-xxxx" placeholderTextColor="#a3a3a3" keyboardType="phone-pad" maxLength={10} returnKeyType="done" onSubmitEditing={handleRegister} style={inputStyle} />
              </View>
            </View>
          </Section>

          {/* Accept terms */}
          <Pressable onPress={() => { setAccepted((a) => !a); clearErr(); }} className="flex-row items-start active:opacity-70" style={{ gap: 10, marginHorizontal: 16, marginTop: 16 }}>
            <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: accepted ? BRAND_GREEN : "#cbd5d1", backgroundColor: accepted ? BRAND_GREEN : "transparent", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              {accepted ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
            </View>
            <Text style={{ flex: 1, fontSize: 12.5, color: "#374151", lineHeight: 19 }}>
              ฉันยอมรับ <Text style={{ color: BRAND_GREEN, fontWeight: "600" }} onPress={() => nav.navigate("TermsOfService")}>เงื่อนไขการใช้งาน</Text> และ <Text style={{ color: BRAND_GREEN, fontWeight: "600" }} onPress={() => nav.navigate("PrivacyPolicy")}>นโยบายความเป็นส่วนตัว</Text>
            </Text>
          </Pressable>

          {/* Register button */}
          <Pressable onPress={handleRegister} className="active:opacity-80 items-center justify-center" style={{ height: 52, borderRadius: 999, backgroundColor: BRAND_GREEN, marginHorizontal: 16, marginTop: 18 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>สมัครสมาชิก</Text>
          </Pressable>

          {/* Seller cross-link */}
          <Pressable
            onPress={() => nav.navigate("SellerRegister")}
            className="flex-row items-center active:opacity-80"
            style={{ backgroundColor: "rgba(49,151,84,0.08)", borderWidth: 1, borderColor: "rgba(49,151,84,0.2)", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 12, marginHorizontal: 16, marginTop: 14 }}
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginHorizontal: 16, marginVertical: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "#ececec" }} />
            <Text style={{ fontSize: 12, color: TEXT_MUTED }}>หรือสมัครด้วย</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "#ececec" }} />
          </View>

          <View style={{ marginHorizontal: 16 }}>
            <SocialRow onAuth={() => nav.navigate("Main")} />
          </View>

          {/* Login link */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 24 }}>
            <Text style={{ fontSize: 14, color: TEXT_SECONDARY }}>มีบัญชีแล้ว?</Text>
            <Pressable onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate("Login"))} hitSlop={6} className="active:opacity-60">
              <Text style={{ fontSize: 14, color: BRAND_GREEN, fontWeight: "700" }}>เข้าสู่ระบบ</Text>
            </Pressable>
          </View>
        </Animated.ScrollView>

        {/* Top scroll-edge fade — only while scrolled (fades out at the top) */}
        <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28, opacity: fadeOpacity }}>
          <LinearGradient colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ flex: 1 }} />
        </Animated.View>
      </View>
    </View>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", marginTop: 12, paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>
      {title ? <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{title}</Text> : null}
      {children}
    </View>
  );
}
