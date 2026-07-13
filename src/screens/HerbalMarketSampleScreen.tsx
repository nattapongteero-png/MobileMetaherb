import { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SubPageHeader } from "../components/SubPageHeader";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  User,
  MapPin,
  Briefcase,
  MessageSquare,
  Truck,
  FileText,
  Package,
  Clock,
  ShieldCheck,
  BadgeCheck,
  Check,
  Phone,
  Mail,
  Building2,
  type LucideIcon,
} from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";

// Route params — typed locally so the screen renders standalone before the
// route is registered. Falls back to the first material when no id is passed.
type Params = { id?: string };

// ---- Mock data ported verbatim from the web HerbalMarketSamplePage ----

const PURPOSES = [
  { id: "rd", emoji: "🧪", label: "R&D / สูตรใหม่", desc: "ทดสอบสูตร / ปรับปรุงผลิตภัณฑ์" },
  { id: "qc", emoji: "🔬", label: "QC / ทดสอบคุณภาพ", desc: "Lab test / QA / QC" },
  { id: "compare", emoji: "⚖️", label: "เปรียบเทียบ Supplier", desc: "เทียบคุณภาพ/ราคา หลายเจ้า" },
  { id: "test", emoji: "📦", label: "ทดลองตลาด", desc: "ทดสอบรับฟีดแบ็คจากลูกค้า" },
];

const SAMPLE_SIZES = [50, 100, 250, 500];

const BIZ_TYPES = [
  "โรงงานผลิต",
  "ส่งออก / นำเข้า",
  "ร้านชา / คาเฟ่",
  "เครื่องสำอาง / สปา",
  "อาหารเสริม",
  "เภสัชกรรม",
  "อื่นๆ",
];

const TIMELINES = [
  { id: "immediate", label: "ทันที (ภายใน 1 เดือน)" },
  { id: "1-3-months", label: "1-3 เดือน" },
  { id: "3-6-months", label: "3-6 เดือน" },
  { id: "6-months-plus", label: "6 เดือนขึ้นไป" },
  { id: "undecided", label: "ยังไม่แน่ใจ" },
];

// Materials come from the canonical HerbalMarketScreen list (local photos) so
// the sample request always matches the card/detail the user came from.
import { MATERIALS } from "./HerbalMarketScreen";

/** Resolve a local bundled image (require → number) or remote URL string. */
function imgSource(src: number | string | undefined): any {
  return typeof src === "number" ? src : { uri: src };
}

// Grade pill solid colors. The web used metallic gradients; RN has no linear
// gradient without a dep, so we collapse each tier to a representative solid.
const GRADE_COLOR: Record<string, string> = {
  พรีเมียม: "#b45309",
  คัดสรร: "#475569",
  มาตรฐาน: "#c2410c",
  ทั่วไป: "#047857",
  ประหยัด: "#334155",
};

// ---- Module-scope field components (declared outside the screen component so
// the TextInput isn't remounted / refocused on every keystroke) ----

const INPUT_STYLE = {
  backgroundColor: "#f5f5f5",
  height: 48,
  borderRadius: 999,
  paddingHorizontal: 18,
  fontSize: 14,
  color: "#374151",
} as const;

function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  icon: Icon,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  required?: boolean;
  icon?: LucideIcon;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, color: TEXT_MUTED }}>
        {label}
        {required ? <Text style={{ color: "#e62e05" }}> *</Text> : null}
      </Text>
      <View style={{ justifyContent: "center" }}>
        {Icon ? (
          <View style={{ position: "absolute", left: 16, zIndex: 1 }}>
            <Icon size={16} color="#a3a3a3" strokeWidth={2.2} />
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#a3a3a3"
          keyboardType={keyboardType ?? "default"}
          autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
          style={{ ...INPUT_STYLE, paddingLeft: Icon ? 42 : 18 }}
        />
      </View>
    </View>
  );
}

function NoteField({ value, onChangeText }: { value: string; onChangeText: (s: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="เช่น ขอตัวอย่างแบบบดละเอียด 80 mesh / มี Certificate of Analysis แนบ"
      placeholderTextColor="#a3a3a3"
      multiline
      style={{
        minHeight: 110,
        backgroundColor: "#f5f5f5",
        borderRadius: 14,
        padding: 14,
        fontSize: 14,
        color: "#374151",
        textAlignVertical: "top",
      }}
    />
  );
}

// Card header: brand-tinted lucide icon + title + sub-caption, like the web.
function CardHeader({ Icon, title, sub }: { Icon: LucideIcon; title: string; sub: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon size={20} color={BRAND_GREEN} strokeWidth={2.2} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a" }}>{title}</Text>
      </View>
      <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>{sub}</Text>
    </View>
  );
}

const CARD = {
  backgroundColor: "#fff",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#ececed",
  padding: 16,
} as const;

const DIVIDER = { height: 1, backgroundColor: "#ececed" } as const;

export function HerbalMarketSampleScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const { id } = (route.params as Params) ?? {};

  const material = MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];

  // Contact
  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Shipping address
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [postcode, setPostcode] = useState("");
  const [shippingNote, setShippingNote] = useState("");

  // Purpose & business
  const [bizType, setBizType] = useState("");
  const [purpose, setPurpose] = useState("rd");
  const [sampleSize, setSampleSize] = useState(100);
  const [estimatedVolume, setEstimatedVolume] = useState("");
  const [timeline, setTimeline] = useState("1-3-months");
  const [note, setNote] = useState("");

  const SAMPLE_FEE = 0;
  const SHIPPING_FEE = sampleSize <= 100 ? 80 : sampleSize <= 250 ? 120 : 180;
  const TOTAL = SAMPLE_FEE + SHIPPING_FEE;

  const gradeColor = GRADE_COLOR[material.grade] ?? "#475569";

  const handleSubmit = () => {
    if (!contactName.trim()) return Alert.alert("กรุณากรอกชื่อผู้ติดต่อ");
    if (!phone.trim() || !email.trim()) return Alert.alert("กรุณากรอกเบอร์โทรและอีเมล");
    if (!address.trim() || !province.trim() || !postcode.trim())
      return Alert.alert("กรุณากรอกที่อยู่จัดส่ง");
    if (!bizType) return Alert.alert("กรุณาเลือกประเภทธุรกิจ");

    Alert.alert(
      `ส่งคำขอตัวอย่าง "${material.name}" เรียบร้อย`,
      'Supplier จะติดต่อกลับภายใน 24 ชม. — ติดตามสถานะได้ที่หน้า "คำขอตัวอย่าง"',
      [{ text: "ตกลง", onPress: () => nav.canGoBack() && nav.goBack() }],
    );
  };

  const INCLUDED: { Icon: LucideIcon; label: string; sub: string }[] = [
    { Icon: Package, label: `วัตถุดิบ ${sampleSize} กรัม`, sub: "แพ็คสุญญากาศ" },
    { Icon: FileText, label: "Certificate of Analysis", sub: "เลข lot + ผล lab" },
    { Icon: ShieldCheck, label: "ใบรับรองคุณภาพ", sub: material.certifications.slice(0, 2).join(" / ") },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <SubPageHeader
        title="ขอตัวอย่างสินค้า"
        subtitle="ขอตัวอย่างก่อนสั่งซื้อจริง"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
      >
        {/* Hero intro */}
        <View style={{ backgroundColor: "#eaf3ee", borderRadius: 16, padding: 18, gap: 6 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: BRAND_GREEN }}>ขอตัวอย่างวัตถุดิบ</Text>
          <Text style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 19 }}>
            กรอกข้อมูลเพื่อให้ Supplier จัดส่งตัวอย่างให้คุณ — รับตัวอย่างเล็กก่อนตัดสินใจสั่งจริง
          </Text>
        </View>

        {/* Contact info */}
        <View style={CARD}>
          <CardHeader Icon={User} title="ข้อมูลผู้ติดต่อ" sub="Supplier จะใช้ข้อมูลนี้ในการติดต่อกลับ" />
          <View style={{ gap: 12 }}>
            <TextField label="ชื่อ-นามสกุล" required value={contactName} onChangeText={setContactName} placeholder="ชื่อจริง" />
            <TextField label="ชื่อบริษัท / ร้าน" value={companyName} onChangeText={setCompanyName} placeholder="ชื่อนิติบุคคล (ถ้ามี)" />
            <TextField label="ตำแหน่ง" value={position} onChangeText={setPosition} placeholder="เช่น เจ้าของกิจการ / ฝ่ายจัดซื้อ" />
            <TextField label="เบอร์โทร" required value={phone} onChangeText={setPhone} placeholder="0XX-XXX-XXXX" icon={Phone} keyboardType="phone-pad" />
            <TextField label="อีเมล" required value={email} onChangeText={setEmail} placeholder="email@company.com" icon={Mail} keyboardType="email-address" />
          </View>
        </View>

        {/* Shipping address */}
        <View style={CARD}>
          <CardHeader Icon={MapPin} title="ที่อยู่จัดส่งตัวอย่าง" sub="ระบุที่อยู่ที่ Supplier จะส่งตัวอย่างไป" />
          <View style={{ gap: 12 }}>
            <TextField label="ที่อยู่ (เลขที่ / ซอย / ถนน)" required value={address} onChangeText={setAddress} placeholder="เช่น 123 ถ.สุขุมวิท 45" />
            <TextField label="ตำบล / แขวง" value={district} onChangeText={setDistrict} />
            <TextField label="จังหวัด" required value={province} onChangeText={setProvince} />
            <TextField label="รหัสไปรษณีย์" required value={postcode} onChangeText={setPostcode} placeholder="5 หลัก" keyboardType="numeric" />
            <TextField label="หมายเหตุการจัดส่ง" value={shippingNote} onChangeText={setShippingNote} placeholder="เช่น ส่งวันธรรมดา 9-17 น." />
          </View>
        </View>

        {/* Purpose & business */}
        <View style={CARD}>
          <CardHeader Icon={Briefcase} title="วัตถุประสงค์การใช้งาน" sub="ช่วย Supplier เตรียมตัวอย่างที่ตรงตามความต้องการ" />

          {/* Business type pills */}
          <Text style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 8 }}>
            ประเภทธุรกิจ <Text style={{ color: "#e62e05" }}>*</Text>
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {BIZ_TYPES.map((b) => {
              const active = bizType === b;
              return (
                <Pressable
                  key={b}
                  onPress={() => setBizType(b)}
                  className="active:opacity-80"
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? BRAND_GREEN : "#f5f5f5",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "500", color: active ? "#fff" : "#374151" }}>{b}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Purpose grid (2 columns on mobile) */}
          <Text style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 8 }}>วัตถุประสงค์</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {PURPOSES.map((p) => {
              const active = purpose === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPurpose(p.id)}
                  className="active:opacity-80"
                  style={{
                    flexGrow: 1,
                    flexBasis: "47%",
                    alignItems: "center",
                    gap: 4,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: active ? BRAND_GREEN : "#e5e7eb",
                    backgroundColor: active ? "rgba(49,151,84,0.05)" : "#fff",
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                  <Text
                    style={{ fontSize: 12, fontWeight: active ? "600" : "500", color: "#0a0a0a", textAlign: "center" }}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Sample size */}
          <Text style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 8 }}>ขนาดตัวอย่างที่ต้องการ</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {SAMPLE_SIZES.map((sz) => {
              const active = sampleSize === sz;
              return (
                <Pressable
                  key={sz}
                  onPress={() => setSampleSize(sz)}
                  className="active:opacity-80"
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 999,
                    borderWidth: 2,
                    alignItems: "center",
                    justifyContent: "center",
                    borderColor: active ? BRAND_GREEN : "#e5e7eb",
                    backgroundColor: active ? BRAND_GREEN : "#fff",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : "#374151" }}>{sz} g</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ fontSize: 11, color: "#a3a3a3", marginTop: 6, marginBottom: 16 }}>
            ค่าจัดส่งจะปรับตามขนาด ({sampleSize} g = ฿{SHIPPING_FEE})
          </Text>

          {/* Estimated volume */}
          <View style={{ marginBottom: 16 }}>
            <TextField
              label="ปริมาณคาดว่าจะสั่งจริง (กก./เดือน)"
              value={estimatedVolume}
              onChangeText={setEstimatedVolume}
              placeholder="เช่น 100"
              keyboardType="numeric"
            />
          </View>

          {/* Timeline (pill selector replacing the web <select>) */}
          <Text style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 8 }}>คาดว่าจะสั่ง bulk เมื่อใด</Text>
          <View style={{ gap: 8 }}>
            {TIMELINES.map((t) => {
              const active = timeline === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTimeline(t.id)}
                  className="active:opacity-80"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: active ? BRAND_GREEN : "#e5e7eb",
                    backgroundColor: active ? "rgba(49,151,84,0.05)" : "#fff",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: active ? "600" : "400", color: "#374151" }}>{t.label}</Text>
                  {active ? <Check size={16} color={BRAND_GREEN} strokeWidth={2.6} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Note to supplier */}
        <View style={CARD}>
          <CardHeader
            Icon={MessageSquare}
            title="ข้อความถึง Supplier"
            sub="คำขอเฉพาะ เช่น สเปคการบด ขนาดแพ็ค หรือคำถามอื่นๆ"
          />
          <NoteField value={note} onChangeText={setNote} />
        </View>

        {/* Summary */}
        <View style={[CARD, { gap: 14 }]}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#0a0a0a" }}>สรุปคำขอตัวอย่าง</Text>
          <View style={DIVIDER} />

          {/* Material info */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", backgroundColor: "#f5f5f5" }}>
              <Image source={imgSource(material.image)} style={{ width: "100%", height: "100%" }} resizeMode="cover"
          resizeMethod="resize" />
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  left: 4,
                  backgroundColor: gradeColor,
                  borderRadius: 999,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}>{material.grade}</Text>
              </View>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }} numberOfLines={1}>
                {material.name}
              </Text>
              <Text style={{ fontSize: 11, fontStyle: "italic", color: TEXT_MUTED }} numberOfLines={1}>
                {material.scientificName}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Building2 size={12} color="#a3a3a3" strokeWidth={2.2} />
                <Text style={{ fontSize: 11, color: TEXT_MUTED, flexShrink: 1 }} numberOfLines={1}>
                  {material.supplier}
                </Text>
                {material.supplierVerified ? (
                  <BadgeCheck size={12} color={BRAND_GREEN} strokeWidth={2.5} />
                ) : null}
              </View>
            </View>
          </View>

          <View style={DIVIDER} />

          {/* What's included */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: TEXT_MUTED }}>ตัวอย่างประกอบด้วย</Text>
            {INCLUDED.map((it) => (
              <View key={it.label} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: "rgba(49,151,84,0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <it.Icon size={14} color={BRAND_GREEN} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: "#0a0a0a" }}>{it.label}</Text>
                  <Text style={{ fontSize: 10, color: TEXT_MUTED }}>{it.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={DIVIDER} />

          {/* Cost breakdown */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, color: TEXT_MUTED }}>ค่าตัวอย่าง</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: BRAND_GREEN }}>
                {SAMPLE_FEE === 0 ? "ฟรี" : `฿${SAMPLE_FEE}`}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Truck size={12} color="#a3a3a3" strokeWidth={2.2} />
                <Text style={{ fontSize: 13, color: TEXT_MUTED }}>ค่าจัดส่ง</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#0a0a0a" }}>฿{SHIPPING_FEE}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 2 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>รวมทั้งสิ้น</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: BRAND_GREEN }}>฿{TOTAL.toLocaleString()}</Text>
            </View>
          </View>

          {/* ETA */}
          <View
            style={{
              backgroundColor: "rgba(49,151,84,0.05)",
              borderRadius: 12,
              padding: 12,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <Clock size={14} color={BRAND_GREEN} strokeWidth={2.2} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: BRAND_GREEN_DARK }}>ระยะเวลาจัดส่ง</Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 16 }}>
                Supplier จะตอบกลับใน 24 ชม. และจัดส่งภายใน 3-5 วันทำการ
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom confirm — primary action, full-width pill (Fitts's Law). */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fafafa", borderTopWidth: 1, borderTopColor: "#ececed" }}>
        <View style={{ padding: 16 }}>
          <Pressable
            onPress={handleSubmit}
            className="active:opacity-80"
            style={{
              backgroundColor: BRAND_GREEN,
              borderRadius: 999,
              height: 48,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Check size={18} color="#fff" strokeWidth={2.4} />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>ยืนยันส่งคำขอตัวอย่าง</Text>
          </Pressable>
          <Text style={{ fontSize: 10, color: "#a3a3a3", textAlign: "center", marginTop: 8 }}>
            กดยืนยัน = ยอมรับข้อตกลงการขอตัวอย่าง
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
