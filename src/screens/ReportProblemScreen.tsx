import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation } from "@react-navigation/native";
import { Send } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BottomFade } from "../components/BottomFade";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";

const TYPES = [
  "การใช้งานแอป",
  "คำสั่งซื้อและชำระเงิน",
  "การจัดส่ง",
  "สินค้า",
  "บัญชีและความปลอดภัย",
  "อื่น ๆ",
];

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{title}</Text>
      {sub ? <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>{sub}</Text> : null}
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

export function ReportProblemScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [email, setEmail] = useState("");

  const canSubmit = !!type && detail.trim().length >= 10;

  const handleSubmit = () => {
    if (!type) {
      Alert.alert("เลือกประเภทปัญหา", "กรุณาเลือกประเภทปัญหาที่พบ");
      return;
    }
    if (detail.trim().length < 10) {
      Alert.alert("กรอกรายละเอียด", "กรุณาอธิบายปัญหาอย่างน้อย 10 ตัวอักษร");
      return;
    }
    Alert.alert("ส่งรายงานเรียบร้อย", "ขอบคุณสำหรับการแจ้งปัญหา ทีมงานจะตรวจสอบและดำเนินการโดยเร็ว", [
      { text: "ตกลง", onPress: () => nav.canGoBack() && nav.goBack() },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="รายงานปัญหา" subtitle="แจ้งปัญหาการใช้งานให้ทีมงาน" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
          {/* Type */}
          <Section title="ประเภทปัญหา" sub="เลือกหมวดที่ตรงกับปัญหามากที่สุด">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {TYPES.map((t) => {
                const active = type === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setType(t)}
                    className="active:opacity-80"
                    style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: active ? BRAND_GREEN : "#f3f4f6" }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "#fff" : "#374151" }}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          {/* Detail */}
          <Section title="รายละเอียดปัญหา" sub="อธิบายสิ่งที่เกิดขึ้น ขั้นตอนที่ทำ และผลที่คาดหวัง">
            <TextInput
              value={detail}
              onChangeText={setDetail}
              placeholder="เล่าปัญหาที่พบให้เราทราบ — อย่างน้อย 10 ตัวอักษร"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              style={{ minHeight: 120, backgroundColor: "#f5f5f5", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1a1a1a", lineHeight: 21 }}
            />
            <Text style={{ fontSize: 11, color: detail.trim().length >= 10 ? BRAND_GREEN : "#9ca3af", textAlign: "right", marginTop: 6 }}>
              {detail.trim().length} / 10 ขั้นต่ำ
            </Text>
          </Section>

          {/* Contact */}
          <Section title="อีเมลติดต่อกลับ" sub="ไม่บังคับ — กรอกหากต้องการให้ทีมงานติดต่อกลับ">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ height: 46, backgroundColor: "#f5f5f5", borderRadius: 14, paddingHorizontal: 14, fontSize: 14, color: "#1a1a1a" }}
            />
          </Section>
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <BottomFade />

        {/* Floating submit */}
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
            <GlassView glassEffectStyle="regular" colorScheme="light" style={{ borderRadius: 34, overflow: "hidden", padding: 9 }}>
              <Pressable
                onPress={handleSubmit}
                className="active:opacity-90"
                style={{ height: 50, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, backgroundColor: canSubmit ? BRAND_GREEN : "#9ca3af" }}
              >
                <Send size={17} color="#fff" strokeWidth={2.4} />
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>ส่งรายงาน</Text>
              </Pressable>
            </GlassView>
          </View>
        </View>
      </View>
    </View>
  );
}
