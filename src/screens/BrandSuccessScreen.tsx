import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ShieldCheck, FlaskConical, Package } from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const BRAND_IMG = require("../../assets/test-product.png");

const STEPS: { Icon: typeof Package; title: string; desc: string }[] = [
  { Icon: ShieldCheck, title: "ตรวจสอบใบสมัคร", desc: "ทีมงานพิจารณาภายใน 3–5 วันทำการ" },
  { Icon: FlaskConical, title: "ตั้งค่าแบรนด์ทดสอบ", desc: "ปรับแต่งโปรไฟล์แบรนด์และข้อมูลติดต่อ" },
  { Icon: Package, title: "ลงสินค้าให้ทดลอง", desc: "เพิ่มสินค้าให้ผู้ใช้ทดลองและรับ feedback" },
];

export function BrandSuccessScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const goShop = () => nav.canGoBack() && nav.goBack(); // back to Account (now showing the trial-brand menu)
  const goHome = () => nav.reset({ index: 0, routes: [{ name: "Main" }] });

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* Success mark — brand illustration instead of a check icon */}
          <View style={{ alignItems: "center", marginTop: 20 }}>
            <View style={{ width: 148, height: 148, borderRadius: 74, backgroundColor: "#eef6f0", alignItems: "center", justifyContent: "center" }}>
              <Image source={BRAND_IMG} style={{ width: 124, height: 124 }} resizeMode="contain" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#0a0a0a", marginTop: 18 }}>ส่งใบสมัครแบรนด์ทดสอบสำเร็จ</Text>
            <Text style={{ fontSize: 14, color: "#737373", marginTop: 6, textAlign: "center", lineHeight: 21 }}>
              ยินดีต้อนรับสู่โปรแกรมแบรนด์ทดสอบ 🎉{"\n"}ทีมงานจะพิจารณาและแจ้งผลผ่านอีเมล
            </Text>
          </View>

          {/* Next steps */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#ececed", padding: 16, marginTop: 26, gap: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a", marginBottom: 6 }}>ขั้นตอนถัดไป</Text>
            {STEPS.map((s, i) => (
              <View key={s.title} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#f3f3f3" }}>
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                  <s.Icon size={19} color={BRAND_GREEN} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>{s.title}</Text>
                  <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }}>{s.desc}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: "700", color: BRAND_GREEN_DARK }}>{i + 1}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12, gap: 8 }}>
          <Pressable onPress={goShop} className="active:opacity-80 items-center justify-center" style={{ height: 52, borderRadius: 999, backgroundColor: BRAND_GREEN }}>
            <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>ไปที่ร้านค้าของฉัน</Text>
          </Pressable>
          <Pressable onPress={goHome} className="active:opacity-70 items-center justify-center" style={{ height: 48 }}>
            <Text style={{ fontSize: 15, color: BRAND_GREEN, fontWeight: "600" }}>กลับหน้าแรก</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
