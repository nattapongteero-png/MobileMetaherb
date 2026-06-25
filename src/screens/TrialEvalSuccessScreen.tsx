import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Check, Coins, ClipboardCheck } from "lucide-react-native";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <Text style={{ fontSize: 13, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 14, color: "#0a0a0a", fontWeight: "600", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

export function TrialEvalSuccessScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { productName, points, completed } =
    useRoute<RouteProp<RootStackParamList, "TrialEvalSuccess">>().params;

  const goHome = () => nav.reset({ index: 0, routes: [{ name: "Main" }] });
  const goMyTrials = () =>
    nav.reset({ index: 1, routes: [{ name: "Main" }, { name: "MyTrials" }] });

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* Success mark */}
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
              {completed ? <Check size={46} color="#fff" strokeWidth={3} /> : <ClipboardCheck size={42} color="#fff" strokeWidth={2.6} />}
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#0a0a0a", marginTop: 16 }}>
              {completed ? "ทำแบบประเมินสำเร็จ" : "บันทึกแบบประเมินแล้ว"}
            </Text>
            <Text style={{ fontSize: 14, color: "#737373", marginTop: 6, textAlign: "center", lineHeight: 20 }}>
              {completed
                ? "ขอบคุณที่ร่วมทดสอบกับ METAHERB\nการทดสอบของคุณเสร็จสมบูรณ์แล้ว"
                : "บันทึกแบบประเมินก่อนใช้แล้ว\nเริ่มทดลองใช้งาน แล้วทำแบบประเมินหลังใช้"}
            </Text>
          </View>

          {/* Points reward card — premium gold gradient */}
          <View
            style={{
              marginTop: 24,
              borderRadius: 22,
              overflow: "hidden",
              shadowColor: "#d97706",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.28,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <LinearGradient colors={["#fcd34d", "#f59e0b", "#d97706"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 22, alignItems: "center" }}>
              {/* Decorative coin glow */}
              <View pointerEvents="none" style={{ position: "absolute", top: -36, right: -24, width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.14)" }} />
              <View pointerEvents="none" style={{ position: "absolute", bottom: -46, left: -16, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.10)" }} />

              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.25)", borderWidth: 1, borderColor: "rgba(255,255,255,0.45)", alignItems: "center", justifyContent: "center" }}>
                <Coins size={32} color="#fff" strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.92)", fontWeight: "600", marginTop: 12 }}>
                {completed ? "ได้รับคะแนนแล้ว" : "คะแนนที่จะได้รับเมื่อประเมินครบ"}
              </Text>
              <Text style={{ fontSize: 38, fontWeight: "800", color: "#fff", marginTop: 2 }}>
                +{points.toLocaleString()} <Text style={{ fontSize: 18, fontWeight: "700" }}>คะแนน</Text>
              </Text>
              {completed ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 }}>
                  <Check size={14} color="#fff" strokeWidth={3} />
                  <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#fff" }}>เข้าบัญชีคะแนนสะสมแล้ว</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.92)", marginTop: 8, textAlign: "center" }}>ทำแบบประเมินหลังใช้ให้ครบเพื่อรับคะแนน</Text>
              )}
            </LinearGradient>
          </View>

          {/* Summary */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#ececed", padding: 18, marginTop: 16, gap: 12 }}>
            <DetailRow label="สินค้าที่ทดสอบ" value={productName} />
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
            <DetailRow label="สถานะ" value={completed ? "เสร็จสิ้น" : "กำลังทดลอง"} />
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12, gap: 8 }}>
          <Pressable onPress={goMyTrials} className="active:opacity-80 items-center justify-center" style={{ height: 52, borderRadius: 999, backgroundColor: BRAND_GREEN }}>
            <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>ดูการทดลองของฉัน</Text>
          </Pressable>
          <Pressable onPress={goHome} className="active:opacity-70 items-center justify-center" style={{ height: 48 }}>
            <Text style={{ fontSize: 15, color: "#319754", fontWeight: "600" }}>กลับหน้าแรก</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
