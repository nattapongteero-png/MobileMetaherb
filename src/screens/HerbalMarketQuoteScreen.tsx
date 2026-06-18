import { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  Building2,
  Phone,
  Mail,
  Sparkles,
  ClipboardList,
  CircleCheckBig,
  MessageSquare,
  BadgeCheck,
  Package,
  Download,
  type LucideIcon,
} from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

// Route params are typed locally — the route isn't registered in RootStackParamList yet.
type Params = { id?: string };

// ── Mock data ported verbatim from the web HerbalMarketQuotePage / herbalMaterials ──
const UNITS = ["kg", "ตัน", "ลิตร", "ชิ้น"];
const CERT_OPTIONS = ["ทั่วไป", "Organic", "GAP", "GMP", "ISO", "HALAL"];

// Materials come from the canonical HerbalMarketScreen list (local photos) so
// the quote always matches the card/detail the user came from.
import { MATERIALS } from "./HerbalMarketScreen";

/** Resolve a local bundled image (require → number) or remote URL string. */
function imgSource(src: number | string | undefined): any {
  return typeof src === "number" ? src : { uri: src };
}

const PILL_INPUT = {
  backgroundColor: "#f5f5f5",
  height: 48,
  borderRadius: 999,
  paddingHorizontal: 18,
  fontSize: 14,
  color: "#374151",
} as const;

const CARD = {
  backgroundColor: "#fff",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#ececed",
  padding: 16,
} as const;

// ── Module-scope field components (keep TextInput out of the screen body to
//    avoid remount + focus loss on each keystroke). ──
function LabeledField({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  Icon,
  keyboardType,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  Icon?: LucideIcon;
  keyboardType?: "default" | "email-address" | "phone-pad";
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151" }}>
        {label}
        {required ? <Text style={{ color: "#ff3b30" }}> *</Text> : null}
      </Text>
      <View style={{ justifyContent: "center" }}>
        {Icon ? (
          <View style={{ position: "absolute", left: 16, zIndex: 1 }}>
            <Icon size={16} color="#9ca3af" strokeWidth={2.2} />
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#a3a3a3"
          keyboardType={keyboardType ?? "default"}
          autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
          style={{ ...PILL_INPUT, paddingLeft: Icon ? 42 : 18 }}
        />
      </View>
    </View>
  );
}

function MultilineField({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  Icon,
  optional,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  Icon?: LucideIcon;
  optional?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {Icon ? <Icon size={14} color="#9ca3af" strokeWidth={2.4} /> : null}
        <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151" }}>{label}</Text>
        {required ? <Text style={{ color: "#ff3b30" }}>*</Text> : null}
        {optional ? <Text style={{ fontSize: 12, color: "#9ca3af" }}>(optional)</Text> : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#a3a3a3"
        multiline
        style={{
          backgroundColor: "#f5f5f5",
          minHeight: 88,
          borderRadius: 20,
          paddingHorizontal: 18,
          paddingVertical: 14,
          fontSize: 14,
          color: "#374151",
          textAlignVertical: "top",
        }}
      />
    </View>
  );
}

function SectionHeader({ Icon, title, sub }: { Icon: LucideIcon; title: string; sub: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon size={16} color={BRAND_GREEN} strokeWidth={2.2} />
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a" }}>{title}</Text>
      </View>
      <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{sub}</Text>
    </View>
  );
}

export function HerbalMarketQuoteScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const { id } = (route.params as Params) ?? {};

  // Single-material RFQ mode — fall back to m-1 so it renders standalone.
  const material = MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];

  const [previewMode, setPreviewMode] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Company info
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");

  // Primary contact
  const [contactName, setContactName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [poReference, setPoReference] = useState("");

  // Material details
  const [materialDetail, setMaterialDetail] = useState(`${material.name} · เกรด ${material.grade}`);
  const [qty, setQty] = useState(String(material.moq || 100));
  const [unit, setUnit] = useState("kg");
  const [certPref, setCertPref] = useState("ทั่วไป");
  const [requiredBy, setRequiredBy] = useState("");
  const [note, setNote] = useState("");

  const rfqNumber = `RFQ-${new Date().getFullYear() + 543}-${String(
    (Math.abs(((companyName || "x") + email).split("").reduce((s, c) => s + c.charCodeAt(0), 0)) % 9000) + 1000,
  )}`;
  const todayStr = new Date().toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });

  const qtyNum = Number(qty) || 0;
  const lineTotal = qtyNum * material.pricePerKg;
  const beforeVat = (lineTotal * 100) / 107;
  const vatAmt = (lineTotal * 7) / 107;
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePreview = () => {
    if (!companyName.trim()) return Alert.alert("กรุณากรอกชื่อบริษัท");
    if (!companyAddress.trim()) return Alert.alert("กรุณากรอกที่อยู่บริษัท");
    if (!contactName.trim()) return Alert.alert("กรุณากรอกชื่อผู้ติดต่อ");
    if (!email.trim()) return Alert.alert("กรุณากรอกอีเมล");
    if (!materialDetail.trim()) return Alert.alert("กรุณาระบุวัตถุดิบ");
    if (qtyNum <= 0) return Alert.alert("กรุณาระบุปริมาณ");
    if (!requiredBy.trim()) return Alert.alert("กรุณาระบุวันที่ต้องการ");
    setPreviewMode(true);
  };

  // ───────────────────── Success state ─────────────────────
  if (submitted) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
        >
          <View style={{ alignItems: "center", paddingTop: 24 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "rgba(49,151,84,0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <CircleCheckBig size={40} color={BRAND_GREEN} strokeWidth={2.2} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "600", color: BRAND_GREEN, marginBottom: 8 }}>
              ส่ง RFQ เรียบร้อย!
            </Text>
            <Text style={{ fontSize: 14, color: TEXT_SECONDARY, textAlign: "center", lineHeight: 22 }}>
              ระบบจะกระจายคำขอไปยัง Supplier ที่ตรงกลุ่ม — รับ quote หลายเจ้าผ่านอีเมล{" "}
              <Text style={{ color: "#0a0a0a", fontWeight: "600" }}>{email || "บัญชีของคุณ"}</Text> ภายใน 24 ชม.
            </Text>
          </View>

          <View style={{ ...CARD, backgroundColor: "#fafaf7" }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: TEXT_MUTED, marginBottom: 10 }}>สิ่งที่จะได้รับ</Text>
            {[
              "Email confirmation พร้อมเลข RFQ",
              "Quote จาก Supplier 3-5 เจ้า เปรียบเทียบ ราคา/MOQ/lead time ได้",
              "COA + product spec sheet แนบใน quote",
            ].map((t) => (
              <View key={t} style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <Text style={{ color: BRAND_GREEN, fontWeight: "700" }}>✓</Text>
                <Text style={{ flex: 1, fontSize: 13, color: "#374151", lineHeight: 20 }}>{t}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => nav.navigate("HerbalMarket" as never)}
            className="items-center justify-center active:opacity-80"
            style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, height: 48 }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>ดู Herbal Market</Text>
          </Pressable>
          <Pressable
            onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate("HerbalMarket" as never))}
            className="items-center justify-center active:opacity-70"
            style={{ borderRadius: 999, height: 48, borderWidth: 1, borderColor: BRAND_GREEN }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: BRAND_GREEN }}>กลับสู่รายละเอียดวัตถุดิบ</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ───────────────────── Preview (Quotation document) ─────────────────────
  if (previewMode) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
        >
          <Pressable onPress={() => setPreviewMode(false)} hitSlop={8} className="active:opacity-70">
            <Text style={{ fontSize: 13, color: TEXT_MUTED }}>‹ แก้ไขข้อมูล</Text>
          </Pressable>

          {/* A4 document card — adapted to a single mobile column */}
          <View style={{ ...CARD, padding: 18 }}>
            {/* Issuer header */}
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>บริษัท เมต้าเฮิร์บ จำกัด</Text>
            <Text style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 2, lineHeight: 16 }}>
              เลขที่ 459/153 ถนนสุขสวัสดิ์ แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140
            </Text>
            <Text style={{ fontSize: 11, color: TEXT_SECONDARY }}>โทรศัพท์ 061-4213111</Text>
            <Text style={{ fontSize: 11, color: TEXT_SECONDARY }}>เลขประจำตัวผู้เสียภาษี: 0105565148242</Text>

            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a", textAlign: "center", marginTop: 14, marginBottom: 12 }}>
              ใบเสนอราคา / Quotation
            </Text>

            {/* Customer + doc meta */}
            <View style={{ gap: 6 }}>
              <MetaRow k="เรียน" v={companyName || "—"} bold />
              <MetaRow k="ที่อยู่" v={companyAddress || "—"} />
              {taxId ? <MetaRow k="เลขภาษี" v={taxId} /> : null}
              <MetaRow k="ผู้ติดต่อ" v={`${contactName}${position ? ` (${position})` : ""}`} />
              <MetaRow k="อีเมล" v={email} />
              <MetaRow k="โทรศัพท์" v={phone || "—"} />
              <View style={{ height: 1, backgroundColor: "#ececed", marginVertical: 4 }} />
              <MetaRow k="เลขที่" v={rfqNumber} />
              <MetaRow k="วันที่" v={todayStr} />
              <MetaRow k="อ้างถึง" v={poReference || "30"} />
              <MetaRow k="ยื่นราคา" v="30 วัน" />
            </View>

            <Text style={{ fontSize: 12, color: TEXT_SECONDARY, textAlign: "center", marginVertical: 12, lineHeight: 18 }}>
              ทาง <Text style={{ fontWeight: "600", color: "#0a0a0a" }}>{material.supplier}</Text> (ผ่านแพลตฟอร์ม Metaherb)
              มีความยินดีขอเสนอราคาดังรายการต่อไปนี้
            </Text>

            {/* Line item */}
            <View style={{ borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 12, padding: 12, gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }}>{materialDetail}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: TEXT_SECONDARY }}>จำนวน {qtyNum} {unit}</Text>
                <Text style={{ fontSize: 12, color: TEXT_SECONDARY }}>@ {fmt(material.pricePerKg)} บาท</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }}>ราคารวม</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#0a0a0a" }}>{fmt(lineTotal)} บาท</Text>
              </View>
            </View>

            {/* Totals */}
            <View style={{ borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 12, marginTop: 12 }}>
              {[
                ["ยอดรวม", fmt(lineTotal)],
                ["ราคาก่อนภาษีมูลค่าเพิ่ม 7%", fmt(beforeVat)],
                ["ภาษีมูลค่าเพิ่ม 7%", fmt(vatAmt)],
                ["รวมราคาสินค้าหลังหักส่วนลด", fmt(lineTotal)],
              ].map(([k, v], i, arr) => (
                <View
                  key={k}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                    borderBottomColor: "#ececed",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>{k}</Text>
                  <Text style={{ fontSize: 12, color: "#0a0a0a" }}>{v}</Text>
                </View>
              ))}
            </View>

            {note ? (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#0a0a0a" }}>หมายเหตุ</Text>
                <Text style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 2, lineHeight: 16 }}>{note}</Text>
              </View>
            ) : null}
            {certPref !== "ทั่วไป" || requiredBy ? (
              <Text style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 8, lineHeight: 16 }}>
                {certPref !== "ทั่วไป" ? `เกรด/Certificate: ${certPref}` : ""}
                {certPref !== "ทั่วไป" && requiredBy ? " · " : ""}
                {requiredBy ? `ต้องการภายใน: ${requiredBy}` : ""}
              </Text>
            ) : null}

            <Text style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 12, lineHeight: 15 }}>
              ** กรุณาลงลายมือชื่อเพื่อยืนยันใบเสนอราคาดังกล่าวและ Email : mataherb.herb@gmail.com
            </Text>
          </View>
        </ScrollView>

        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fafafa", borderTopWidth: 1, borderTopColor: "#ececed" }}>
          <View style={{ padding: 16, flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => Alert.alert("กำลังพัฒนา", "ดาวน์โหลด PDF จะเปิดให้ใช้งานเร็ว ๆ นี้")}
              className="flex-row items-center justify-center active:opacity-70"
              style={{ flex: 1, borderRadius: 999, height: 48, borderWidth: 2, borderColor: "#0088ff", gap: 6 }}
            >
              <Download size={16} color="#0088ff" strokeWidth={2.4} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#0088ff" }}>ดาวน์โหลด PDF</Text>
            </Pressable>
            <Pressable
              onPress={() => setSubmitted(true)}
              className="items-center justify-center active:opacity-80"
              style={{ flex: 1, backgroundColor: BRAND_GREEN, borderRadius: 999, height: 48 }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>ส่ง RFQ ใน ERP</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ───────────────────── Form ─────────────────────
  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
      >
        {/* Hero */}
        <View style={{ backgroundColor: "#eaf3ee", borderRadius: 16, padding: 18, alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "600", color: BRAND_GREEN, textAlign: "center" }}>
            ขอใบเสนอราคา (RFQ)
          </Text>
          <Text style={{ fontSize: 13, color: TEXT_SECONDARY, textAlign: "center", marginTop: 6, lineHeight: 20 }}>
            ส่งคำขอครั้งเดียว — รับ quote หลายเจ้าใน 24 ชม. เปรียบเทียบราคา MOQ และ lead time ก่อนตัดสินใจ
          </Text>
        </View>

        {/* Material preview */}
        <View style={{ ...CARD, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
            <Image source={imgSource(material.image)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }} numberOfLines={1}>
              {material.name}
            </Text>
            <Text style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: "italic" }} numberOfLines={1}>
              {material.scientificName}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Building2 size={12} color="#9ca3af" strokeWidth={2.2} />
              <Text style={{ fontSize: 11, color: TEXT_SECONDARY }} numberOfLines={1}>
                {material.supplier}
              </Text>
              {material.supplierVerified ? (
                <BadgeCheck size={13} color={BRAND_GREEN} fill={BRAND_GREEN} stroke="#fff" strokeWidth={2.5} />
              ) : null}
            </View>
          </View>
        </View>

        {/* Company info */}
        <View style={CARD}>
          <SectionHeader Icon={Building2} title="ข้อมูลบริษัท" sub="ใช้สำหรับออกใบเสนอราคาและใบกำกับภาษี" />
          <View style={{ gap: 14 }}>
            <LabeledField label="ชื่อบริษัท / นิติบุคคล" required value={companyName} onChangeText={setCompanyName} placeholder="เช่น บริษัท เฮอร์บาแบรนด์ จำกัด" />
            <LabeledField label="เลขประจำตัวผู้เสียภาษี" value={taxId} onChangeText={setTaxId} placeholder="13 หลัก" keyboardType="phone-pad" />
            <MultilineField label="ที่อยู่บริษัท" required value={companyAddress} onChangeText={setCompanyAddress} placeholder="เลขที่ / ซอย / ถนน / ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์" />
          </View>
        </View>

        {/* Contact */}
        <View style={CARD}>
          <SectionHeader Icon={Sparkles} title="ผู้ติดต่อ" sub="Supplier จะส่ง quote ไปที่ Email นี้" />
          <View style={{ gap: 14 }}>
            <LabeledField label="ชื่อ-นามสกุล" required value={contactName} onChangeText={setContactName} placeholder="ผู้ติดต่อหลัก" />
            <LabeledField label="ตำแหน่ง" value={position} onChangeText={setPosition} placeholder="เช่น ฝ่ายจัดซื้อ" />
            <LabeledField label="เบอร์โทร" value={phone} onChangeText={setPhone} placeholder="081-xxx-xxxx" Icon={Phone} keyboardType="phone-pad" />
            <LabeledField label="Email" required value={email} onChangeText={setEmail} placeholder="you@company.com" Icon={Mail} keyboardType="email-address" />
            <LabeledField label="เลขที่อ้างอิง / PO Reference" value={poReference} onChangeText={setPoReference} placeholder="optional — เลข PO ฝั่งคุณ (ถ้ามี)" />
          </View>
        </View>

        {/* Material details / conditions */}
        <View style={CARD}>
          <SectionHeader Icon={ClipboardList} title="รายละเอียดวัตถุดิบ" sub="ระบุละเอียดเท่าไหร่ ยิ่งได้ quote แม่นยำขึ้น" />
          <View style={{ gap: 14 }}>
            <LabeledField label="วัตถุดิบ" required value={materialDetail} onChangeText={setMaterialDetail} placeholder="เช่น ขมิ้นชันออร์แกนิก แห้ง บด 80 mesh" Icon={Package} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 2, gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151" }}>
                  ปริมาณ <Text style={{ color: "#ff3b30" }}>*</Text>
                </Text>
                <TextInput
                  value={qty}
                  onChangeText={setQty}
                  placeholder="100"
                  placeholderTextColor="#a3a3a3"
                  keyboardType="number-pad"
                  style={PILL_INPUT}
                />
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151" }}>หน่วย</Text>
                <Pressable
                  onPress={() => setUnit(UNITS[(UNITS.indexOf(unit) + 1) % UNITS.length])}
                  className="active:opacity-70"
                  style={{ ...PILL_INPUT, flexDirection: "row", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 14, color: "#374151" }}>{unit}</Text>
                </Pressable>
              </View>
            </View>

            {/* Cert preference pills */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151" }}>เกรด / Certificate ที่ต้องการ</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {CERT_OPTIONS.map((c) => {
                  const active = certPref === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCertPref(c)}
                      className="active:opacity-80"
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: active ? BRAND_GREEN : "#f3f4f6",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "500", color: active ? "#fff" : "#374151" }}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <LabeledField label="ต้องการภายใน" required value={requiredBy} onChangeText={setRequiredBy} placeholder="เช่น 30 มิ.ย. 2569" />

            <MultilineField
              label="หมายเหตุ"
              optional
              Icon={MessageSquare}
              value={note}
              onChangeText={setNote}
              placeholder="เช่น ต้องการแหล่งปลูกในไทย / ขอ COA แนบ / ส่งตัวอย่างก่อน"
            />
          </View>

          {/* Info banner */}
          <View
            style={{
              backgroundColor: "rgba(49,151,84,0.06)",
              borderRadius: 12,
              padding: 12,
              flexDirection: "row",
              gap: 8,
              marginTop: 14,
            }}
          >
            <Sparkles size={14} color={BRAND_GREEN} strokeWidth={2.4} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 11, color: "#374151", lineHeight: 17 }}>
              ระบบจะส่ง RFQ ไปยัง Supplier ที่ตรงกลุ่ม <Text style={{ fontWeight: "600" }}>โดยอัตโนมัติ</Text> —
              คุณจะได้รับ quote หลายเจ้าผ่านอีเมลภายใน 24 ชม.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom action (Fitts's Law: full-width pill anchored at thumb reach). */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fafafa", borderTopWidth: 1, borderTopColor: "#ececed" }}>
        <View style={{ padding: 16 }}>
          <Pressable
            onPress={handlePreview}
            className="items-center justify-center active:opacity-80"
            style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, height: 48 }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>ดูตัวอย่างใบขอเสนอราคา</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Two-column meta row used in the quotation preview.
function MetaRow({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Text style={{ width: 72, fontSize: 12, fontWeight: "600", color: "#374151" }}>{k} :</Text>
      <Text style={{ flex: 1, fontSize: 12, fontWeight: bold ? "600" : "400", color: "#0a0a0a", lineHeight: 18 }}>
        {v}
      </Text>
    </View>
  );
}
