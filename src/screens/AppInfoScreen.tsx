import { View, Text, Pressable, ScrollView, Alert, Image, Linking, Share } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Star, Share2, ChevronRight, ShoppingBag, Sprout, FlaskConical, Sparkles,
  Mail, Globe, Phone, type LucideIcon,
} from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BRAND_GREEN, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const LOGO = require("../../assets/logo.png");
// Wordmark colours sampled from the logo — "META" red, "HERB" orange.
const META_RED = "#e2342b";
const HERB_ORANGE = "#f4901e";

const FEATURES: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: ShoppingBag, title: "ช้อปสมุนไพร & สุขภาพ", desc: "ผลิตภัณฑ์สมุนไพร อาหาร เครื่องดื่ม และของขวัญเพื่อสุขภาพคัดสรร" },
  { Icon: Sprout, title: "Herbal Market (B2B)", desc: "ตลาดวัตถุดิบสมุนไพรขายส่ง พร้อมใบเสนอราคา/สั่งซื้อสำหรับธุรกิจ" },
  { Icon: FlaskConical, title: "ทดลองใช้สินค้า", desc: "ขอตัวอย่างไปทดลองก่อนตัดสินใจ พร้อมแบบประเมินผล" },
  { Icon: Sparkles, title: "ผู้ช่วย AI เมต้า", desc: "ช่วยค้นหา แนะนำ และเปรียบเทียบสินค้าตามที่คุณต้องการ" },
];

export function AppInfoScreen() {
  const nav = useNavigation<Nav>();

  const contact: { Icon: LucideIcon; label: string; onPress: () => void }[] = [
    { Icon: Mail, label: "mataherb.herb@gmail.com", onPress: () => Linking.openURL("mailto:mataherb.herb@gmail.com") },
    { Icon: Globe, label: "www.metaherb.co.th", onPress: () => Linking.openURL("https://www.metaherb.co.th") },
    { Icon: Phone, label: "02-123-4567", onPress: () => Linking.openURL("tel:021234567") },
  ];

  const moreRows: { label: string; Icon: LucideIcon; onPress: () => void }[] = [
    { label: "ให้คะแนนแอป", Icon: Star, onPress: () => Alert.alert("ขอบคุณ", "ฟีเจอร์ให้คะแนนแอปกำลังพัฒนา") },
    { label: "แชร์แอปให้เพื่อน", Icon: Share2, onPress: () => Share.share({ message: "METAHERB — แพลตฟอร์มสมุนไพรและผลิตภัณฑ์เพื่อสุขภาพ 🌿" }).catch(() => {}) },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="เกี่ยวกับแอปพลิเคชัน" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* App mark — real logo + brand-coloured wordmark */}
          <View style={{ alignItems: "center", paddingTop: 28, paddingBottom: 10 }}>
            <Image source={LOGO} style={{ width: 108, height: 108 }} resizeMode="contain" />
            <Text style={{ fontSize: 24, fontWeight: "800", marginTop: 12, letterSpacing: 0.5 }}>
              <Text style={{ color: META_RED }}>META</Text>
              <Text style={{ color: HERB_ORANGE }}>HERB</Text>
            </Text>
            <Text style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>เวอร์ชัน 1.0.0 (build 1)</Text>
          </View>

          {/* About */}
          <SectionLabel>เกี่ยวกับเรา</SectionLabel>
          <View style={cardStyle}>
            <Text style={{ fontSize: 13.5, color: "#374151", lineHeight: 22 }}>
              METAHERB คือแพลตฟอร์มสมุนไพรและผลิตภัณฑ์เพื่อสุขภาพครบวงจร — ตั้งแต่ค้าปลีกถึงตลาดวัตถุดิบขายส่ง
              เราคัดสรรสินค้าคุณภาพจากผู้ผลิตและเกษตรกรไทย เพื่อให้ทุกคนเข้าถึงสมุนไพรที่ดีได้ง่ายขึ้น
            </Text>
            <Text style={{ fontSize: 13.5, color: "#374151", lineHeight: 22, marginTop: 12 }}>
              นอกจากการช้อปปิ้ง เรายังมีตลาดวัตถุดิบ B2B การทดลองใช้สินค้า และผู้ช่วย AI ที่ช่วยให้การเลือกซื้อสะดวกและมั่นใจยิ่งขึ้น
            </Text>
          </View>

          {/* Features */}
          <SectionLabel>จุดเด่นของแอป</SectionLabel>
          <View style={cardStyle0}>
            {FEATURES.map((f, i) => (
              <View key={f.title}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                    <f.Icon size={20} color={BRAND_GREEN} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#0a0a0a" }}>{f.title}</Text>
                    <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2, lineHeight: 18 }}>{f.desc}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Contact */}
          <SectionLabel>ติดต่อเรา</SectionLabel>
          <View style={cardStyle0}>
            {contact.map((c, i) => (
              <View key={c.label}>
                {i > 0 ? <Divider /> : null}
                <Pressable onPress={c.onPress} className="flex-row items-center active:opacity-60" style={{ height: 52, paddingHorizontal: 16, gap: 12 }}>
                  <c.Icon size={19} color={BRAND_GREEN} strokeWidth={2} />
                  <Text style={{ flex: 1, fontSize: 14, color: "#0a0a0a" }}>{c.label}</Text>
                  <ChevronRight size={18} color="#c4c4c6" strokeWidth={2.2} />
                </Pressable>
              </View>
            ))}
          </View>

          {/* More */}
          <SectionLabel>เพิ่มเติม</SectionLabel>
          <View style={cardStyle0}>
            {moreRows.map((r, i) => (
              <View key={r.label}>
                {i > 0 ? <Divider /> : null}
                <Pressable onPress={r.onPress} className="flex-row items-center active:opacity-60" style={{ height: 54, paddingHorizontal: 16, gap: 12 }}>
                  <r.Icon size={20} color={BRAND_GREEN} strokeWidth={2} />
                  <Text style={{ flex: 1, fontSize: 15, color: "#0a0a0a" }}>{r.label}</Text>
                  <ChevronRight size={18} color="#c4c4c6" strokeWidth={2.2} />
                </Pressable>
              </View>
            ))}
          </View>

          <Text style={{ fontSize: 12, color: TEXT_SECONDARY, textAlign: "center", marginTop: 22, lineHeight: 18 }}>
            อัปเดตล่าสุด 1 มิ.ย. 2569 · พัฒนาโดยทีม METAHERB
          </Text>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED, textAlign: "center", marginTop: 6 }}>© 2569 METAHERB · สงวนลิขสิทธิ์</Text>
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontSize: 12.5, fontWeight: "700", color: TEXT_MUTED, marginTop: 22, marginBottom: 6, marginLeft: 16 }}>{children}</Text>;
}
function Divider() {
  return <View style={{ height: 1, backgroundColor: "#f0f0f0", marginLeft: 52 }} />;
}
const cardStyle = { backgroundColor: "#fff", marginHorizontal: 16, borderRadius: 16, padding: 16 } as const;
const cardStyle0 = { backgroundColor: "#fff", marginHorizontal: 16, borderRadius: 16, overflow: "hidden" } as const;
