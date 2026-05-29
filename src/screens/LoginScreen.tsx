import { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { CheckCircle2, ChevronLeft, Eye, EyeOff } from "lucide-react-native";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList, "Login">;

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleLogin = () => {
    // Postel's Law: be liberal in what we accept — trim spaces, lowercase email.
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    setError("");
    // Peak-End Rule: brief positive feedback before navigating.
    setSuccess(true);
    setTimeout(() => nav.replace("Home"), 450);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#fafafa]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="bg-white rounded-2xl w-full self-center max-w-[500px] overflow-hidden">
            {/* Back button */}
            <View className="p-4">
              <Pressable
                onPress={() => nav.canGoBack() && nav.goBack()}
                className="bg-[#319754]/10 flex-row items-center self-start px-4 py-1.5 rounded-full"
              >
                <ChevronLeft size={14} color="#319754" />
                <Text className="text-[12px] text-[#319754] font-medium ml-1">ย้อนกลับ</Text>
              </Pressable>
            </View>

            {/* Logo + Title */}
            <View className="items-center px-4 pt-2">
              <Image
                source={require("../../assets/logo.png")}
                style={{ width: 76, height: 76, marginBottom: 16 }}
                resizeMode="contain"
              />
              <Text className="text-[20px] text-black font-medium">ยินดีต้อนรับสู่ METAHERB</Text>
              <Text className="text-[12px] text-black text-center mt-2">
                ลงชื่อเข้าใช้เพื่อรับประสบการณ์{"\n"}การช้อปสมุนไพรที่ดีที่สุด
              </Text>
            </View>

            {error ? (
              <Text className="text-[13px] text-red-500 text-center mt-3">{error}</Text>
            ) : null}

            {/* Form */}
            <View className="px-4 py-4 gap-4">
              <View className="gap-2">
                <Text className="text-[14px] text-black font-medium">อีเมล</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="กรอกอีเมลของคุณ"
                  placeholderTextColor="#a3a3a3"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="bg-[#fafafa] h-[48px] rounded-full px-6 text-[14px] text-gray-700"
                />
              </View>

              <View className="gap-2">
                <Text className="text-[14px] text-black font-medium">รหัสผ่าน</Text>
                <View className="relative justify-center">
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="กรอกรหัสผ่านของคุณ"
                    placeholderTextColor="#a3a3a3"
                    secureTextEntry={!showPassword}
                    className="bg-[#fafafa] h-[48px] rounded-full px-6 pr-12 text-[14px] text-gray-700"
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    className="absolute right-4"
                    hitSlop={8}
                  >
                    {showPassword ? (
                      <Eye size={20} color="#9ca3af" />
                    ) : (
                      <EyeOff size={20} color="#9ca3af" />
                    )}
                  </Pressable>
                </View>
              </View>

              <Pressable className="self-end">
                <Text className="text-[12px] text-[#297a4e]">ลืมรหัสผ่าน?</Text>
              </Pressable>

              {/* Demo account chip */}
              <Pressable
                onPress={() => {
                  setEmail("user@test.com");
                  setPassword("12345678");
                  setError("");
                }}
                className="bg-green-50 rounded-lg p-3"
              >
                <Text className="text-[11px] text-[#319754] font-medium">บัญชีทดลอง (แตะเพื่อกรอก)</Text>
                <Text className="text-[11px] text-gray-600 mt-0.5">
                  User: user@test.com / 12345678
                </Text>
              </Pressable>

              {/* Sign in — switches to success state for ~450ms before navigating */}
              <Pressable
                onPress={handleLogin}
                disabled={success}
                className={`${
                  success
                    ? "bg-[#16a34a]"
                    : "bg-[#008c45] active:bg-[#007a3b]"
                } h-[49px] rounded-full flex-row items-center justify-center`}
                style={{ gap: 8 }}
              >
                {success ? (
                  <>
                    <CheckCircle2 size={20} color="white" />
                    <Text className="text-white text-[14px] font-medium">
                      เข้าสู่ระบบสำเร็จ
                    </Text>
                  </>
                ) : (
                  <Text className="text-white text-[14px] font-medium">เข้าสู่ระบบ</Text>
                )}
              </Pressable>

              {/* Divider */}
              <View className="flex-row items-center gap-4 mt-1">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="text-[12px] text-black">หรือ</Text>
                <View className="flex-1 h-px bg-gray-200" />
              </View>

              {/* Social */}
              <View className="flex-row gap-2">
                {[
                  { icon: "logo-google", label: "Google", color: "#ea4335" },
                  { icon: "logo-facebook", label: "Facebook", color: "#1877f2" },
                  { icon: "chatbubble", label: "Line", color: "#06c755" },
                ].map((s) => (
                  <Pressable
                    key={s.label}
                    className="flex-1 border border-[#d4d4d4] flex-row items-center justify-center h-10 rounded-full active:bg-gray-50"
                  >
                    <Ionicons name={s.icon as any} size={16} color={s.color} />
                    <Text className="text-[11px] text-[#525252] font-medium ml-1.5">{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Register */}
            <View className="flex-row items-center justify-center p-4 gap-2">
              <Text className="text-[14px] text-[#0a0a0a]">ยังไม่มีบัญชี?</Text>
              <Pressable>
                <Text className="text-[14px] text-[#297a4e] underline">ลงทะเบียน</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
