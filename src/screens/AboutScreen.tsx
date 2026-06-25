import { useRef, useState } from "react";
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
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { requireOptionalNativeModule } from "expo-modules-core";
import { GlassIconButton } from "../components/GlassIconButton";
import {
  Leaf,
  Clock,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Send,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
} from "lucide-react-native";
import { BRAND_GREEN, TEXT_SECONDARY } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Local assets in place of the web figma:asset imports.
const IMG_HERB = require("../../assets/banner/banner_6_1772117418.jpg");
const IMG_TEA = require("../../assets/banner/banner_10_1773194888.jpg");
const IMG_MISSION = require("../../assets/banner/banner_14_1773319227.jpg");
const LOGO = require("../../assets/logo.png");

// Section background tones (ported from the web AboutPage).
const CREAM = "#f5f0e8";
const DARK = "#1a2e1a";

// Hero background video — the same Cloudinary clip the web uses. Guarded with the
// optional native module so the screen falls back to a still image on builds that
// don't yet bundle expo-video (rebuild via Xcode to enable the video).
const HERO_VIDEO =
  "https://res.cloudinary.com/dujq74ght/video/upload/" +
  encodeURIComponent("ท่องโลกสมุนไพร_EP._6_ตะลุยต่างแดน_ตอน__ชาซีลอน_ศรีลังกา__1_1_xvtgqw") +
  ".mp4";
const hasVideo = !!requireOptionalNativeModule("ExpoVideo");
const ExpoVideoMod: any = hasVideo ? require("expo-video") : null;

function HeroVideo({ height }: { height: number }) {
  const player = ExpoVideoMod.useVideoPlayer(HERO_VIDEO, (p: any) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const VideoView = ExpoVideoMod.VideoView;
  return <VideoView player={player} style={{ width: "100%", height }} contentFit="cover" nativeControls={false} />;
}

// ── Copy ported 1:1 from the web (LanguageContext about_* — Thai) ─────────────

const STORY_FEATURES = [
  {
    icon: Leaf,
    title: "ต้นกำเนิดจากธรรมชาติแท้",
    desc: "สมุนไพรทุกชนิดของเราได้รับการปลูกและดูแลโดยเกษตรกรท้องถิ่น บนพื้นที่กว่า 120 ไร่ที่ดอยแม่สลอง เชียงราย ภายใต้มาตรฐานเกษตรอินทรีย์ที่เคร่งครัด",
  },
  {
    icon: Clock,
    title: "ภูมิปัญญาดั้งเดิมสู่นวัตกรรมใหม่",
    desc: "เราผสมผสานองค์ความรู้สมุนไพรไทยโบราณที่สืบทอดมากว่า 200 ปี เข้ากับเทคโนโลยีการผลิตสมัยใหม่ เพื่อให้ได้ผลิตภัณฑ์ที่มีประสิทธิภาพสูงสุดและปลอดภัย",
  },
  {
    icon: ShieldCheck,
    title: "การรับรองมาตรฐานระดับสากล",
    desc: "ผลิตภัณฑ์ทุกชิ้นผ่านการตรวจสอบคุณภาพและได้รับการรับรองจาก อย. Thailand, Organic Thailand และ ISO 22000 ก่อนส่งถึงมือลูกค้า",
  },
];

const TRUST_PRODUCTS = [
  { tag: "ขายดีอันดับ 1", tagColor: "#ff8a65", title: "ชาสมุนไพร 7 ชนิด", desc: "ผสมจากตะไคร้ ขิง ขมิ้น กระชาย ใบเตย มะตูม และดอกอัญชัน" },
  { tag: "สินค้าใหม่", tagColor: "#7db870", title: "ชาสมุนไพร 7 ชนิด", desc: "ผสมจากตะไคร้ ขิง ขมิ้น กระชาย ใบเตย มะตูม และดอกอัญชัน" },
  { tag: "ยอดนิยม", tagColor: "#5b8dee", title: "ชาสมุนไพร 7 ชนิด", desc: "ผสมจากตะไคร้ ขิง ขมิ้น กระชาย ใบเตย มะตูม และดอกอัญชัน" },
];

const CERTS = ["✓ อย. ไทย", "✓ Organic Thailand", "✓ ISO 22000", "✓ GMP"];

const STATS = [
  { value: "3+", label: "ปีแห่งประสบการณ์" },
  { value: "120", label: "ไร่แปลงเกษตรอินทรีย์" },
  { value: "50+", label: "ผลิตภัณฑ์สมุนไพร" },
  { value: "2,400+", label: "ลูกค้าทั่วไทย" },
];

const CONTACTS = [
  { icon: Phone, label: "โทรศัพท์", value: "098-765-4321", sub: "จันทร์-ศุกร์: 08.30 - 17.30" },
  { icon: Mail, label: "อีเมล", value: "mataherb.herb@gmail.com", sub: "ตอบกลับภายใน 24 ชั่วโมง" },
  { icon: MapPin, label: "ที่อยู่", value: "เลขที่ 459/153 หมู่บ้านนิวไฮบ์ ถนนสุขสวัสดิ์", sub: "แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ กรุงเทพฯ 10140" },
];

const SOCIALS = [
  { name: "Facebook", handle: "METAHERB Official" },
  { name: "Line", handle: "@metaherb" },
  { name: "YouTube", handle: "METAHERB" },
  { name: "Instagram", handle: "@metaherb.th" },
];

const FIELD_INPUT = {
  backgroundColor: "#f5f5f5",
  borderRadius: 14,
  paddingHorizontal: 16,
  fontSize: 14,
  color: "#374151",
} as const;

function Field({ label, multiline, ...inputProps }: { label: string; multiline?: boolean } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#333" }}>{label}</Text>
      <TextInput
        placeholderTextColor="#a3a3a3"
        multiline={multiline}
        style={[FIELD_INPUT, multiline ? { minHeight: 110, paddingVertical: 12, textAlignVertical: "top" } : { height: 48 }]}
        {...inputProps}
      />
    </View>
  );
}

function GreenBadge({ label, onDark }: { label: string; onDark?: boolean }) {
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
      <Leaf size={14} color={onDark ? "#a8d5a0" : BRAND_GREEN} />
      <Text style={{ color: onDark ? "#a8d5a0" : BRAND_GREEN, fontSize: 11, letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}

export function AboutScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [missionY, setMissionY] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกชื่อ อีเมล และข้อความ");
      return;
    }
    Alert.alert("ส่งข้อความเรียบร้อยแล้ว!", "ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง");
    setName(""); setEmail(""); setSubject(""); setMessage("");
  };

  return (
    <View className="flex-1" style={{ backgroundColor: CREAM }}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{ paddingBottom: 0 }}
      >
        {/* ===== HERO (full-bleed, behind the status bar) ===== */}
        <View style={{ backgroundColor: DARK }}>
          {hasVideo ? (
            <HeroVideo height={insets.top + 420} />
          ) : (
            <Image source={IMG_HERB} style={{ width: "100%", height: insets.top + 420 }} resizeMode="cover" />
          )}
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(13,31,13,0.6)" }} />
          <View style={{ position: "absolute", left: 20, right: 20, bottom: 28, gap: 12 }}>
            <View
              style={{
                flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6,
                backgroundColor: "rgba(125,184,112,0.2)", borderWidth: 1, borderColor: "rgba(125,184,112,0.4)",
                borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
              }}
            >
              <Leaf size={13} color="#a8d5a0" />
              <Text style={{ color: "#a8d5a0", fontSize: 11, letterSpacing: 1.2 }}>ยินดีต้อนรับ</Text>
            </View>
            <Text style={{ fontSize: 34, fontWeight: "800", lineHeight: 42 }}>
              <Text style={{ color: "#fff" }}>จากพืชพรรณ{"\n"}</Text>
              <Text style={{ color: "#a8d5a0" }}>สู่ผลิตภัณฑ์{"\n"}</Text>
              <Text style={{ color: "#fff" }}>เมต้าเฮิร์บ</Text>
            </Text>
            <Text style={{ fontSize: 14.5, color: "rgba(255,255,255,0.8)", lineHeight: 22 }}>
              แม้เป็นสมุนไพรที่หายากแต่เมต้าเฮิร์บ{"\n"}สามารถคัดสรรและจัดหาให้คุณได้
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => nav.navigate("Shop")}
                className="active:opacity-85"
                style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: BRAND_GREEN, borderRadius: 999, paddingLeft: 18, paddingRight: 6, paddingVertical: 6 }}
              >
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>เลือกซื้อได้ที่</Text>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}>
                  <ArrowRight size={18} color="#fff" strokeWidth={2.6} />
                </View>
              </Pressable>
              <Pressable
                onPress={() => scrollRef.current?.scrollTo({ y: missionY - 12, animated: true })}
                className="active:opacity-80"
                style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 48, paddingHorizontal: 18, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" }}
              >
                <Text style={{ color: "#fff", fontSize: 14.5, fontWeight: "500" }}>พันธกิจของเรา</Text>
                <ChevronDown size={16} color="#fff" strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ===== STORY (cream) ===== */}
        <View style={{ backgroundColor: CREAM, paddingHorizontal: 20, paddingVertical: 32, gap: 16 }}>
          <GreenBadge label="เรื่องราวของเรา" />
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#4e4e4e", textAlign: "center" }}>ผลผลิตจากเกษตรกร</Text>
            <Text style={{ fontSize: 26, fontWeight: "700", fontStyle: "italic", color: "#4e4e4e", textAlign: "center" }}>สู่ทุกบ้านทั่วไทย</Text>
            <Text style={{ fontSize: 14, color: "#333", textAlign: "center", lineHeight: 24, marginTop: 8 }}>
              เราเป็นผู้นำด้านสมุนไพรคุณภาพ เพื่อสุขภาพที่ยั่งยืนที่เมต้าเฮิร์บ
            </Text>
          </View>

          <Image source={IMG_TEA} style={{ width: "100%", height: 200, borderRadius: 24 }} resizeMode="cover" />

          <View style={{ gap: 14, marginTop: 4 }}>
            {STORY_FEATURES.map((item) => (
              <View key={item.title} style={{ flexDirection: "row", gap: 14 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#e7cfbc", alignItems: "center", justifyContent: "center" }}>
                  <item.icon size={24} color="#9D5400" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#333" }}>{item.title}</Text>
                  <Text style={{ fontSize: 13.5, color: "#4a6741", lineHeight: 22, marginTop: 2 }}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ===== TRUST / PRODUCTS (dark) ===== */}
        <View style={{ backgroundColor: DARK, paddingHorizontal: 20, paddingVertical: 32, gap: 16, overflow: "hidden" }}>
          <View pointerEvents="none" style={{ position: "absolute", right: -50, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(125,184,112,0.1)" }} />
          <Text style={{ fontSize: 26, fontWeight: "800", lineHeight: 34 }}>
            <Text style={{ color: "#fff" }}>ความไว้วางใจที่{"\n"}</Text>
            <Text style={{ color: "#7db870" }}>สร้างมาจากมาตรฐาน</Text>
          </Text>
          <View style={{ gap: 10 }}>
            {TRUST_PRODUCTS.map((card, i) => (
              <View key={i} style={{ backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 14 }}>
                <Text style={{ alignSelf: "flex-start", color: "#fff", fontSize: 12, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 999, backgroundColor: card.tagColor, overflow: "hidden" }}>{card.tag}</Text>
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 8 }}>{card.title}</Text>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 2, lineHeight: 21 }}>{card.desc}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CERTS.map((cert) => (
              <Text key={cert} style={{ backgroundColor: "rgba(125,184,112,0.2)", borderWidth: 1, borderColor: "rgba(125,184,112,0.4)", color: "#a8d5a0", fontSize: 13, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, overflow: "hidden" }}>{cert}</Text>
            ))}
          </View>
        </View>

        {/* ===== MISSION (white) ===== */}
        <View onLayout={(e) => setMissionY(e.nativeEvent.layout.y)} style={{ backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 32, gap: 16 }}>
          <View style={{ borderRadius: 24, overflow: "hidden", backgroundColor: DARK }}>
            <Image source={IMG_MISSION} style={{ width: "100%", height: 320 }} resizeMode="cover" />
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(13,31,13,0.55)" }} />
            <View style={{ position: "absolute", top: 16, left: 16 }}>
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>พันธกิจและวิสัยทัศน์</Text>
              <Text style={{ fontSize: 22, fontWeight: "700", color: "rgba(255,255,255,0.7)" }}>เราทำงานเพื่ออะไร ?</Text>
            </View>
            <View style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff", lineHeight: 30 }}>"เป็นผู้นำสมุนไพรไทยสู่ตลาดโลก"</Text>
              <Text style={{ fontSize: 14.5, color: "rgba(255,255,255,0.75)", marginTop: 8, lineHeight: 22 }}>
                มุ่งมั่นที่จะเป็นผู้นำในการนำเสนอสมุนไพรไทยคุณภาพสู่ผู้บริโภค เพื่อสุขภาพที่ดีและยั่งยืน
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {STATS.map((stat) => (
              <View key={stat.label} style={{ flexGrow: 1, flexBasis: "47%", backgroundColor: CREAM, borderWidth: 1, borderColor: "#e0d5c5", borderRadius: 16, padding: 16 }}>
                <Text style={{ color: "#333", fontSize: 28, fontWeight: "800" }}>{stat.value}</Text>
                <Text style={{ color: "#4a6741", fontSize: 13, fontWeight: "600" }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ===== CONTACT (cream) ===== */}
        <View style={{ backgroundColor: CREAM, paddingHorizontal: 20, paddingVertical: 32, gap: 16 }}>
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#1a2e1a" }}>พูดคุยกับเรา</Text>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#7db870" }}>ได้ทุกช่องทาง</Text>
            <Text style={{ fontSize: 14, color: "#4a6741", textAlign: "center", marginTop: 6, lineHeight: 21 }}>
              เราพร้อมให้คำปรึกษาเรื่องสมุนไพรและผลิตภัณฑ์ทุกชนิด ติดต่อเราได้ผ่านช่องทางที่คุณสะดวก
            </Text>
          </View>

          <Text style={{ fontSize: 18, fontWeight: "700", color: "#333", marginTop: 4 }}>ข้อมูลการติดต่อ</Text>
          <View style={{ gap: 12 }}>
            {CONTACTS.map((c) => (
              <View key={c.label} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0d5c5", borderRadius: 16, padding: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#e8f5e2", alignItems: "center", justifyContent: "center" }}>
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

          <Text style={{ fontSize: 18, fontWeight: "700", color: "#333", marginTop: 4 }}>ติดตามเราบนโซเชียล</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {SOCIALS.map((s) => (
              <View key={s.name} style={{ flexGrow: 1, flexBasis: "47%", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0d5c5", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#e7cfbc", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#9D5400", fontSize: 13, fontWeight: "700" }}>{s.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#1a2e1a", fontSize: 14, fontWeight: "600" }}>{s.name}</Text>
                  <Text style={{ color: "#4a6741", fontSize: 12 }} numberOfLines={1}>{s.handle}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
            <Image source={LOGO} style={{ width: 44, height: 44 }} resizeMode="contain" />
            <Text style={{ fontSize: 20, fontWeight: "700" }}>
              <Text style={{ color: "#ed1c24" }}>META</Text>
              <Text style={{ color: "#f7931d" }}>HERB</Text>
            </Text>
          </View>

          {/* Contact form */}
          <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0d5c5", borderRadius: 16, padding: 16, gap: 14, marginTop: 4 }}>
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#333" }}>ส่งข้อความถึงเรา</Text>
              <Text style={{ fontSize: 13, color: "#4a6741" }}>กรอกแบบฟอร์มด้านล่าง</Text>
            </View>
            <Field label="ชื่อ-นามสกุล" value={name} onChangeText={setName} placeholder="ชื่อของคุณ" />
            <Field label="อีเมล" value={email} onChangeText={setEmail} placeholder="อีเมลของคุณ" keyboardType="email-address" autoCapitalize="none" />
            <Field label="หัวข้อ" value={subject} onChangeText={setSubject} placeholder="หัวข้อการติดต่อ" />
            <Field label="ข้อความ" value={message} onChangeText={setMessage} placeholder="พิมพ์ข้อความของคุณ..." multiline />
            <Pressable
              onPress={handleSubmit}
              className="active:opacity-85"
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: BRAND_GREEN, borderRadius: 14, height: 48 }}
            >
              <Send size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>ส่งข้อความ</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Floating glass back button overlaid on the hero — same as other pages */}
      <View style={{ position: "absolute", top: insets.top + 6, left: 12 }}>
        <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel="ย้อนกลับ">
          <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
        </GlassIconButton>
      </View>
    </View>
  );
}
