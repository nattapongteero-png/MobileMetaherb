import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  Pressable,
  Alert,
  type TextInputProps,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Leaf,
  Clock,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Send,
  ArrowRight,
} from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Local assets that ship with the app — used in place of the web figma:asset imports.
const IMG_HERB = require("../../assets/banner/banner_6_1772117418.jpg");
const IMG_TEA = require("../../assets/banner/banner_10_1773194888.jpg");
const IMG_MISSION = require("../../assets/banner/banner_14_1773319227.jpg");
const LOGO = require("../../assets/logo.png");

// ── Mock data ported verbatim from AboutPage.tsx ──────────────────────────────

const STORY_FEATURES = [
  {
    icon: Leaf,
    title: "วัตถุดิบจากธรรมชาติ 100%",
    desc: "คัดสรรสมุนไพรคุณภาพจากเกษตรกรไทย ปลูกแบบออร์แกนิกปลอดสารเคมี",
  },
  {
    icon: Clock,
    title: "ภูมิปัญญาที่สืบทอด",
    desc: "ผสานตำรับยาโบราณกับกระบวนการผลิตที่ทันสมัยและได้มาตรฐาน",
  },
  {
    icon: ShieldCheck,
    title: "ปลอดภัยและได้มาตรฐาน",
    desc: "ผ่านการรับรองจาก อย. และมาตรฐานสากล มั่นใจได้ในทุกผลิตภัณฑ์",
  },
];

const TRUST_PRODUCTS = [
  {
    tag: "ขายดีอันดับ 1",
    tagColor: "#ff8a65",
    title: "ชาสมุนไพร 7 ชนิด",
    desc: "ผสมจากตะไคร้ ขิง ขม้น กระชาย ใบเตย มะตูม และดอกอัญชัน",
  },
  {
    tag: "สินค้าใหม่",
    tagColor: "#7db870",
    title: "ชาสมุนไพร 7 ชนิด",
    desc: "ผสมจากตะไคร้ ขิง ขมิ้น กระชาย ใบเตย มะตูม และดอกอัญชัน",
  },
  {
    tag: "ยอดนิยม",
    tagColor: "#5b8dee",
    title: "ชาสมุนไพร 7 ชนิด",
    desc: "ผสมจากตะไคร้ ขิง ขมิ้น กระชาย ใบเตย มะตูม และดอกอัญชัน",
  },
];

const CERTS = ["✓ อย. ไทย", "✓ Organic Thailand", "✓ ISO 22000", "✓ GMP"];

const STATS = [
  { value: "3+", label: "ปีแห่งประสบการณ์" },
  { value: "120", label: "เกษตรกรพันธมิตร" },
  { value: "50+", label: "ผลิตภัณฑ์คุณภาพ" },
  { value: "2,400+", label: "ลูกค้าที่ไว้วางใจ" },
];

const CONTACTS = [
  {
    icon: Phone,
    label: "โทรศัพท์",
    value: "098-765-4321",
    sub: "จันทร์–เสาร์ 09:00–18:00 น.",
  },
  {
    icon: Mail,
    label: "อีเมล",
    value: "hello@siamherb.co.th",
    sub: "ตอบกลับภายใน 24 ชั่วโมง",
  },
  {
    icon: MapPin,
    label: "ที่อยู่",
    value: "บ้านเลขที่ 459/153 หมู่บ้านนิวไฮบ์ สุขสวัสดิ์",
    sub: "แขวงราษฎรบูรณะ เขตราษฎร์บรณะ กรุงเทพฯ 10140",
  },
];

const SOCIALS = [
  { name: "Facebook", handle: "SiamHerbOfficial" },
  { name: "Line", handle: "@siamherb" },
  { name: "YouTube", handle: "SiamHerbTV" },
  { name: "Instagram", handle: "@siamherb.th" },
];

// ── Shared style constants ────────────────────────────────────────────────────

const CARD = {
  backgroundColor: "#fff",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#ececed",
  padding: 16,
} as const;

const FIELD_INPUT = {
  backgroundColor: "#f5f5f5",
  borderRadius: 14,
  paddingHorizontal: 16,
  fontSize: 14,
  color: "#374151",
} as const;

// ── Module-scoped field wrapper (declared outside the screen to avoid focus loss) ─

function Field({
  label,
  multiline,
  ...inputProps
}: { label: string; multiline?: boolean } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#333" }}>{label}</Text>
      <TextInput
        placeholderTextColor="#a3a3a3"
        multiline={multiline}
        style={[
          FIELD_INPUT,
          multiline
            ? { minHeight: 110, paddingVertical: 12, textAlignVertical: "top" }
            : { height: 48 },
        ]}
        {...inputProps}
      />
    </View>
  );
}

function SectionBadge({ label }: { label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center",
        gap: 6,
        backgroundColor: "rgba(125,184,112,0.2)",
        borderWidth: 1,
        borderColor: "rgba(125,184,112,0.4)",
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 6,
      }}
    >
      <Leaf size={14} color={BRAND_GREEN} />
      <Text style={{ color: BRAND_GREEN, fontSize: 11, letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}

export function AboutScreen() {
  const nav = useNavigation<Nav>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    // Postel's Law — trim user input before validating.
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกชื่อ อีเมล และข้อความ");
      return;
    }
    Alert.alert("ส่งข้อความสำเร็จ", "ขอบคุณที่ติดต่อเรา ทีมงานจะตอบกลับโดยเร็วที่สุด");
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
      >
        {/* ── HERO ── */}
        <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "#1a2e1a" }}>
          <Image source={IMG_HERB} style={{ width: "100%", height: 240 }} resizeMode="cover" />
          <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(13,31,13,0.55)" }} />
          <View style={{ position: "absolute", left: 18, right: 18, bottom: 18, gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                gap: 6,
                backgroundColor: "rgba(125,184,112,0.2)",
                borderWidth: 1,
                borderColor: "rgba(125,184,112,0.4)",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 5,
              }}
            >
              <Leaf size={13} color="#a8d5a0" />
              <Text style={{ color: "#a8d5a0", fontSize: 11, letterSpacing: 1 }}>ยินดีต้อนรับ</Text>
            </View>
            <Text style={{ fontSize: 30, fontWeight: "700", lineHeight: 38 }}>
              <Text style={{ color: "#fff" }}>ธรรมชาติ{"\n"}</Text>
              <Text style={{ color: "#a8d5a0" }}>คือคำตอบ{"\n"}</Text>
              <Text style={{ color: "#fff" }}>ของการดูแลตัวเอง</Text>
            </Text>
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 21 }}>
              สมุนไพรไทยคุณภาพ ผ่านการคัดสรรอย่างพิถีพิถัน{"\n"}เพื่อสุขภาพที่ดีของคุณและคนที่คุณรัก
            </Text>
            <Pressable
              onPress={() => nav.navigate("Shop")}
              className="active:opacity-85"
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                gap: 12,
                backgroundColor: BRAND_GREEN,
                borderRadius: 999,
                paddingLeft: 20,
                paddingRight: 8,
                paddingVertical: 7,
                marginTop: 4,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>เลือกซื้อสินค้า</Text>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.25)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowRight size={18} color="#fff" strokeWidth={2.6} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── STORY ── */}
        <View style={{ gap: 14 }}>
          <SectionBadge label="เรื่องราวของเรา" />
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#4e4e4e", textAlign: "center" }}>
              จากผืนดินไทย
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "700", fontStyle: "italic", color: "#4e4e4e", textAlign: "center" }}>
              สู่สุขภาพของคุณ
            </Text>
            <Text style={{ fontSize: 14, color: "#333", textAlign: "center", lineHeight: 24, marginTop: 6 }}>
              เราเชื่อว่าพลังของธรรมชาติคือกุญแจสำคัญสู่สุขภาพที่ดีอย่างยั่งยืน
            </Text>
          </View>

          <Image
            source={IMG_TEA}
            style={{ width: "100%", height: 200, borderRadius: 20 }}
            resizeMode="cover"
          />

          <View style={{ gap: 12 }}>
            {STORY_FEATURES.map((item) => (
              <View key={item.title} style={[CARD, { flexDirection: "row", gap: 14 }]}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#e7cfbc",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <item.icon size={24} color="#9D5400" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#333" }}>{item.title}</Text>
                  <Text style={{ fontSize: 14, color: "#4a6741", lineHeight: 22, marginTop: 2 }}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── TRUST / PRODUCTS ── */}
        <View style={{ backgroundColor: "#1a2e1a", borderRadius: 20, padding: 16, gap: 14 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", lineHeight: 32 }}>
            <Text style={{ color: "#fff" }}>ผลิตภัณฑ์ที่คุณ{"\n"}</Text>
            <Text style={{ color: "#7db870" }}>ไว้วางใจได้</Text>
          </Text>

          <View style={{ gap: 10 }}>
            {TRUST_PRODUCTS.map((card, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <Text
                  style={{
                    alignSelf: "flex-start",
                    color: "#fff",
                    fontSize: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 3,
                    borderRadius: 999,
                    backgroundColor: card.tagColor,
                    overflow: "hidden",
                  }}
                >
                  {card.tag}
                </Text>
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 8 }}>
                  {card.title}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 2, lineHeight: 21 }}>
                  {card.desc}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CERTS.map((cert) => (
              <Text
                key={cert}
                style={{
                  backgroundColor: "rgba(125,184,112,0.2)",
                  borderWidth: 1,
                  borderColor: "rgba(125,184,112,0.4)",
                  color: "#a8d5a0",
                  fontSize: 13,
                  paddingHorizontal: 14,
                  paddingVertical: 5,
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                {cert}
              </Text>
            ))}
          </View>
        </View>

        {/* ── MISSION ── */}
        <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "#1a2e1a" }}>
          <Image source={IMG_MISSION} style={{ width: "100%", height: 260 }} resizeMode="cover" />
          <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(13,31,13,0.6)" }} />
          <View style={{ position: "absolute", top: 16, left: 16 }}>
            <Text style={{ fontSize: 30, fontWeight: "700", color: "#fff" }}>OUR</Text>
            <Text style={{ fontSize: 30, fontWeight: "700", color: "rgba(255,255,255,0.7)" }}>MISSION</Text>
          </View>
          <View style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#fff", lineHeight: 30 }}>
              "ส่งมอบสุขภาพดีจากธรรมชาติ สู่ทุกครอบครัวไทย"
            </Text>
            <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", marginTop: 8, lineHeight: 22 }}>
              เรามุ่งมั่นนำภูมิปัญญาสมุนไพรไทยมาสร้างสรรค์ผลิตภัณฑ์ที่มีคุณภาพ
            </Text>
          </View>
        </View>

        {/* Stats — 2-column grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {STATS.map((stat) => (
            <View
              key={stat.label}
              style={{
                flexGrow: 1,
                flexBasis: "47%",
                backgroundColor: "#f5f0e8",
                borderWidth: 1,
                borderColor: "#e0d5c5",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <Text style={{ color: "#333", fontSize: 28, fontWeight: "700" }}>{stat.value}</Text>
              <Text style={{ color: "#4a6741", fontSize: 13, fontWeight: "600" }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── CONTACT ── */}
        <View style={{ alignItems: "center", gap: 4, marginTop: 6 }}>
          <Text style={{ fontSize: 26, fontWeight: "700", color: "#1a2e1a" }}>ติดต่อเรา</Text>
          <Text style={{ fontSize: 26, fontWeight: "700", color: "#7db870" }}>พร้อมดูแลคุณ</Text>
          <Text style={{ fontSize: 14, color: "#4a6741", textAlign: "center", marginTop: 4, lineHeight: 21 }}>
            มีคำถามหรือต้องการคำแนะนำ ทีมงานของเรายินดีให้บริการ
          </Text>
        </View>

        {/* Contact cards */}
        <View style={{ gap: 12 }}>
          {CONTACTS.map((c) => (
            <View key={c.label} style={[CARD, { flexDirection: "row", gap: 14, alignItems: "flex-start" }]}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "#e8f5e2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <c.icon size={20} color="#7db870" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#4a6741", fontSize: 13 }}>{c.label}</Text>
                <Text style={{ color: "#1a2e1a", fontSize: 15, fontWeight: "600", marginTop: 1 }}>{c.value}</Text>
                <Text style={{ color: TEXT_SECONDARY, fontSize: 12, marginTop: 1 }}>{c.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Follow us */}
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#333", marginTop: 4 }}>ติดตามเรา</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {SOCIALS.map((s) => (
            <View
              key={s.name}
              style={{
                flexGrow: 1,
                flexBasis: "47%",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#e0d5c5",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: "#e7cfbc",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#9D5400", fontSize: 13, fontWeight: "700" }}>{s.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#1a2e1a", fontSize: 14, fontWeight: "600" }}>{s.name}</Text>
                <Text style={{ color: "#4a6741", fontSize: 12 }} numberOfLines={1}>{s.handle}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Logo */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
          <Image source={LOGO} style={{ width: 44, height: 44 }} resizeMode="contain" />
          <Text style={{ fontSize: 20, fontWeight: "700" }}>
            <Text style={{ color: "#ed1c24" }}>META</Text>
            <Text style={{ color: "#f7931d" }}>HERB</Text>
          </Text>
        </View>

        {/* Contact form */}
        <View style={[CARD, { gap: 14, marginTop: 4 }]}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#333" }}>ส่งข้อความถึงเรา</Text>
            <Text style={{ fontSize: 13, color: "#4a6741" }}>กรอกแบบฟอร์มด้านล่าง เราจะติดต่อกลับโดยเร็ว</Text>
          </View>

          <Field label="ชื่อของคุณ" value={name} onChangeText={setName} placeholder="กรอกชื่อของคุณ" />
          <Field
            label="อีเมล"
            value={email}
            onChangeText={setEmail}
            placeholder="กรอกอีเมลของคุณ"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field label="หัวข้อ" value={subject} onChangeText={setSubject} placeholder="หัวข้อที่ต้องการสอบถาม" />
          <Field
            label="ข้อความ"
            value={message}
            onChangeText={setMessage}
            placeholder="พิมพ์ข้อความของคุณ"
            multiline
          />

          <Pressable
            onPress={handleSubmit}
            className="active:opacity-85"
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: BRAND_GREEN,
              borderRadius: 999,
              height: 48,
            }}
          >
            <Send size={16} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>ส่งข้อความ</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
