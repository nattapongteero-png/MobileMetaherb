import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ShieldCheck, Sprout, Package } from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const SUPPLIER_IMG = require("../../assets/regissupplier.png");

const STEPS: { Icon: typeof Sprout; title: string; desc: string }[] = [
  { Icon: ShieldCheck, title: "ตรวจสอบเอกสาร", desc: "ทีมงานตรวจสอบใบรับรอง/เอกสารภายใน 3 วันทำการ" },
  { Icon: Sprout, title: "ตั้งค่าโปรไฟล์ Supplier", desc: "เพิ่มข้อมูลกิจการและช่องทางรับเงิน" },
  { Icon: Package, title: "ลงขายวัตถุดิบ B2B", desc: "เพิ่มวัตถุดิบและรับคำสั่งซื้อใน Herbal Market" },
];

export function SupplierSuccessScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const goShop = () => nav.canGoBack() && nav.goBack(); // back to Account (now showing the Herbal Market menu)
  const goHome = () => nav.reset({ index: 0, routes: [{ name: "Main" }] });

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* Success mark — supplier illustration instead of a check icon */}
          <View style={{ alignItems: "center", marginTop: 20 }}>
            <View style={{ width: 148, height: 148, borderRadius: 74, backgroundColor: "#eef6f0", alignItems: "center", justifyContent: "center" }}>
              <Image source={SUPPLIER_IMG} style={{ width: 126, height: 126 }} resizeMode="contain" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#0a0a0a", marginTop: 18 }}>ส่งใบสมัคร Supplier สำเร็จ</Text>
            <Text style={{ fontSize: 14, color: "#737373", marginTop: 6, textAlign: "center", lineHeight: 21 }}>
              ยินดีต้อนรับสู่ Herbal Market (B2B) 🎉{"\n"}ทีมงานจะตรวจสอบและเปิดสิทธิ์ให้เร็วที่สุด
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
