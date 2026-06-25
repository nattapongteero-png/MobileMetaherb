import { useState, type ReactNode } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, Image, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Camera, FileText, Upload, Check, Lock, Sprout, FlaskConical, Sun, Truck, Factory, MoreHorizontal, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { Chip } from "../components/Chip";
import { GlassDatePicker } from "../components/GlassDatePicker";
import { getImagePicker } from "../utils/imagePicker";
import { useSeller } from "../context/SellerContext";
import { BRAND_GREEN, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Ported from the web SupplierRegisterPage.
const BUSINESS_TYPES: { id: string; Icon: LucideIcon; label: string; desc: string }[] = [
  { id: "farmer", Icon: Sprout, label: "เกษตรกร / ฟาร์ม", desc: "ปลูกและขายวัตถุดิบเอง" },
  { id: "extract", Icon: FlaskConical, label: "โรงสกัด", desc: "สกัด / Functional ingredient" },
  { id: "dry", Icon: Sun, label: "โรงอบ / แปรรูป", desc: "อบแห้ง บด คั่ว" },
  { id: "wholesaler", Icon: Truck, label: "พ่อค้าส่ง / Trader", desc: "รวบรวม / จัดจำหน่าย" },
  { id: "oem", Icon: Factory, label: "OEM", desc: "รับจ้างผลิต / Contract" },
  { id: "other", Icon: MoreHorizontal, label: "อื่นๆ", desc: "สหกรณ์ / วิสาหกิจชุมชน" },
];
const EMPLOYEE_OPTIONS = ["1-5 คน", "6-20 คน", "21-50 คน", "51-100 คน", "100+ คน"];
const CERT_OPTIONS: { id: string; label: string; desc: string }[] = [
  { id: "fda", label: "อย. (FDA)", desc: "ใบอนุญาตจากสำนักงานคณะกรรมการอาหารและยา" },
  { id: "gap", label: "GAP — มาตรฐานเกษตรปลอดภัย", desc: "Good Agricultural Practices — ใบรับรองการเพาะปลูก" },
  { id: "gmp", label: "GMP — มาตรฐานการผลิตที่ดี", desc: "Good Manufacturing Practice — ใบรับรองโรงงานผลิต" },
  { id: "organic-th", label: "Organic Thailand", desc: "มาตรฐานเกษตรอินทรีย์ไทย (มกอช.)" },
  { id: "irradiation", label: "ใบรับรองการฉายรังสี", desc: "Certificate of Irradiation — รับรองการฆ่าเชื้อด้วยรังสี" },
  { id: "coa", label: "ผลทดสอบคุณภาพวัตถุดิบ (COA)", desc: "Certificate of Analysis — รายงานผลตรวจวิเคราะห์คุณภาพ" },
];
const LEGAL_DOCS: { id: string; label: string; required?: boolean; hint?: string }[] = [
  { id: "companyReg", label: "หนังสือรับรองบริษัท / ทะเบียนพาณิชย์", required: true },
  { id: "vat", label: "ภ.พ.20 (ผู้ประกอบการ VAT)", hint: "หากไม่จด VAT ข้ามได้" },
  { id: "idCard", label: "สำเนาบัตรประชาชนผู้มีอำนาจลงนาม", required: true },
  { id: "farmCert", label: "หนังสือรับรองโรงเรือน / สถานที่ผลิต", hint: "ถ้ามี — เสริม trust" },
];

const labelStyle = { fontSize: 13.5, fontWeight: "600", color: "#374151" } as const;
const pillStyle = { backgroundColor: "#f5f5f5", height: 48, borderRadius: 999, paddingHorizontal: 18, fontSize: 14, color: "#1a1a1a" } as const;
const areaStyle = { backgroundColor: "#f5f5f5", minHeight: 88, borderRadius: 16, paddingHorizontal: 16, paddingTop: 12, fontSize: 14, color: "#1a1a1a", textAlignVertical: "top" } as const;

function Field({ label, required, value, onChange, placeholder, keyboardType, maxLength, multiline, locked }: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad" | "url"; maxLength?: number; multiline?: boolean; locked?: boolean;
}) {
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={labelStyle}>{label}{required ? <Text style={{ color: "#ef4444" }}> *</Text> : null}</Text>
        {locked ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Lock size={10} color={TEXT_MUTED} strokeWidth={2.4} />
            <Text style={{ fontSize: 10.5, color: TEXT_MUTED }}>จากข้อมูลร้านค้า</Text>
          </View>
        ) : null}
      </View>
      <View>
        <TextInput
          value={value}
          onChangeText={onChange}
          editable={!locked}
          placeholder={placeholder}
          placeholderTextColor="#a3a3a3"
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          autoCapitalize="none"
          style={[multiline ? areaStyle : pillStyle, locked ? { backgroundColor: "#edefed", color: "#6b7280", paddingRight: 42 } : null]}
        />
        {locked ? (
          <View pointerEvents="none" style={{ position: "absolute", right: 15, top: multiline ? 13 : 0, bottom: multiline ? undefined : 0, justifyContent: "center" }}>
            <Lock size={15} color="#9ca3af" strokeWidth={2.2} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", marginTop: 12, paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{title}</Text>
      {children}
    </View>
  );
}

function RequiredBadge() {
  return (
    <View style={{ backgroundColor: "rgba(255,59,48,0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>
      <Text style={{ fontSize: 9, fontWeight: "700", color: "#ff3b30" }}>บังคับ</Text>
    </View>
  );
}

/** Legal-document upload row (ported from the web DocUploadRow). */
function DocUploadRow({ label, hint, required, uploaded, onUpload }: { label: string; hint?: string; required?: boolean; uploaded: boolean; onUpload: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 12, borderRadius: 14, borderWidth: 2, borderColor: uploaded ? BRAND_GREEN : "#e5e7eb", backgroundColor: uploaded ? "rgba(49,151,84,0.05)" : "#fff" }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 9, flex: 1 }}>
        <FileText size={16} color={uploaded ? BRAND_GREEN : "#9ca3af"} strokeWidth={2.2} style={{ marginTop: 1 }} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: "#0a0a0a" }}>{label}</Text>
            {required ? <RequiredBadge /> : null}
          </View>
          {hint ? <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{hint}</Text> : null}
        </View>
      </View>
      <Pressable onPress={onUpload} className="active:opacity-80" style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 36, paddingHorizontal: 13, borderRadius: 999, backgroundColor: uploaded ? "rgba(49,151,84,0.12)" : "#fff", borderWidth: uploaded ? 0 : 1, borderColor: "#e5e7eb" }}>
        {uploaded ? <Check size={14} color={BRAND_GREEN} strokeWidth={2.6} /> : <Upload size={14} color="#6b7280" strokeWidth={2.2} />}
        <Text style={{ fontSize: 12, fontWeight: "500", color: uploaded ? BRAND_GREEN : "#6b7280" }}>{uploaded ? "อัปโหลดแล้ว" : "อัปโหลด"}</Text>
      </Pressable>
    </View>
  );
}

export function SupplierRegisterScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { setIsSupplier, shopLogoUri, shopProfile } = useSeller();

  // Business
  const [bizType, setBizType] = useState("");
  const [companyName, setCompanyName] = useState(shopProfile?.shopName ?? "");
  const [brandName, setBrandName] = useState(shopProfile?.shopName ?? "");
  const [registrationNo, setRegistrationNo] = useState("");
  const [taxId, setTaxId] = useState(shopProfile?.taxId ?? "");
  const [foundedYear, setFoundedYear] = useState("");
  const [employees, setEmployees] = useState("");
  const [description, setDescription] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(shopLogoUri ?? null);
  // Contact
  const [contactName, setContactName] = useState(shopProfile?.ownerName ?? "");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState(shopProfile?.phone ?? "");
  const [email, setEmail] = useState(shopProfile?.email ?? "");
  const [website, setWebsite] = useState("");
  const [lineId, setLineId] = useState("");
  // Address
  const [regAddress, setRegAddress] = useState(shopProfile?.address ?? "");
  const [regProvince, setRegProvince] = useState("");
  const [regPostcode, setRegPostcode] = useState("");
  // Standards & docs
  const [certs, setCerts] = useState<Record<string, { enabled: boolean; certNo: string; expiry: string; uploaded: boolean }>>({});
  const [docs, setDocs] = useState<Record<string, boolean>>({});
  // Capacity & bank
  const [capacity, setCapacity] = useState("");
  const [moq, setMoq] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [accepted, setAccepted] = useState(false);

  const toggleCert = (id: string) => setCerts((prev) => {
    const cur = prev[id];
    if (cur?.enabled) return { ...prev, [id]: { ...cur, enabled: false } };
    return { ...prev, [id]: { enabled: true, certNo: cur?.certNo ?? "", expiry: cur?.expiry ?? "", uploaded: cur?.uploaded ?? false } };
  });
  const updateCert = (id: string, field: "certNo" | "expiry" | "uploaded", value: string | boolean) =>
    setCerts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { enabled: true, certNo: "", expiry: "", uploaded: false }), [field]: value } }));

  const pickImage = async (onPick: (uri: string) => void) => {
    const P = getImagePicker();
    if (!P) { Alert.alert("กำลังพัฒนา", "การแนบรูป/ไฟล์ต้องอัปเดตแอปก่อน"); return; }
    const res = await P.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) onPick(res.assets[0].uri);
  };

  const isValid = !!(bizType && companyName.trim() && brandName.trim() && contactName.trim() && phone.trim() && email.trim() && accepted);

  const submit = () => {
    if (!isValid) return;
    setIsSupplier(true);
    nav.replace("SupplierSuccess");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="สมัครเป็น Supplier" subtitle="ขายวัตถุดิบสมุนไพรใน Herbal Market (B2B)" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
          {/* Logo */}
          <View style={{ alignItems: "center", paddingTop: 18, paddingBottom: 6 }}>
            <Pressable onPress={() => pickImage(setLogoUri)} className="active:opacity-80" style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : (
                <View style={{ alignItems: "center", gap: 5 }}>
                  <Camera size={24} color={BRAND_GREEN} strokeWidth={2} />
                  <Text style={{ fontSize: 11, color: TEXT_MUTED }}>โลโก้แบรนด์</Text>
                </View>
              )}
            </Pressable>
            <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 8 }}>แตะเพื่ออัปโหลดโลโก้ (ทางเลือก)</Text>
          </View>

          {/* Business */}
          <Section title="ข้อมูลกิจการ">
            <View style={{ gap: 8 }}>
              <Text style={labelStyle}>ประเภทธุรกิจ <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {BUSINESS_TYPES.map((b) => {
                  const active = bizType === b.id;
                  return (
                    <Pressable
                      key={b.id}
                      onPress={() => setBizType(b.id)}
                      className="active:opacity-80"
                      style={{ width: "48%", flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 11, paddingHorizontal: 11, borderRadius: 14, borderWidth: 2, borderColor: active ? BRAND_GREEN : "#e5e7eb", backgroundColor: active ? "rgba(49,151,84,0.06)" : "#fff" }}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: active ? BRAND_GREEN : "#f3f4f6" }}>
                        <b.Icon size={18} color={active ? "#fff" : "#6b7280"} strokeWidth={2.2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: active ? "700" : "600", color: "#0a0a0a", lineHeight: 17 }}>{b.label}</Text>
                        <Text style={{ fontSize: 10.5, color: TEXT_MUTED, marginTop: 1, lineHeight: 14 }}>{b.desc}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Field label="ชื่อกิจการ / นิติบุคคล" required value={companyName} onChange={setCompanyName} placeholder="เช่น บริษัท เมต้าเฮิร์บ จำกัด" />
            <Field label="ชื่อแบรนด์ที่แสดงบนแพลตฟอร์ม" required value={brandName} onChange={setBrandName} placeholder="เช่น Metaherb Farm" />
            <Field label="เลขทะเบียน / ภ.พ.20" value={registrationNo} onChange={setRegistrationNo} placeholder="0XXXXXXXXXXXX (ถ้ามี)" keyboardType="number-pad" />
            <Field label="เลขผู้เสียภาษี" value={taxId} onChange={setTaxId} placeholder="13 หลัก" keyboardType="number-pad" maxLength={13} />
            <Field label="ปีที่ก่อตั้ง" value={foundedYear} onChange={setFoundedYear} placeholder="เช่น 2562" keyboardType="number-pad" maxLength={4} />
            <View style={{ gap: 8 }}>
              <Text style={labelStyle}>จำนวนพนักงาน</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {EMPLOYEE_OPTIONS.map((e) => <Chip key={e} label={e} active={employees === e} onPress={() => setEmployees(e)} />)}
              </View>
            </View>
            <Field label="คำอธิบายกิจการ" value={description} onChange={setDescription} placeholder="แนะนำกิจการ จุดเด่น และวัตถุดิบที่จำหน่าย" multiline />
          </Section>

          {/* Contact */}
          <Section title="ผู้ติดต่อ">
            <Field label="ชื่อผู้ติดต่อ" required value={contactName} onChange={setContactName} placeholder="ชื่อ-นามสกุล" />
            <Field label="ตำแหน่ง" value={position} onChange={setPosition} placeholder="เช่น เจ้าของกิจการ, ฝ่ายขาย" />
            <Field label="เบอร์โทร" required value={phone} onChange={setPhone} placeholder="08X-XXX-XXXX" keyboardType="phone-pad" maxLength={10} />
            <Field label="อีเมล" required value={email} onChange={setEmail} placeholder="example@email.com" keyboardType="email-address" />
            <Field label="เว็บไซต์" value={website} onChange={setWebsite} placeholder="https://" keyboardType="url" />
            <Field label="LINE ID" value={lineId} onChange={setLineId} placeholder="@metaherb" />
          </Section>

          {/* Address */}
          <Section title="ที่อยู่จดทะเบียน">
            <Field label="ที่อยู่" value={regAddress} onChange={setRegAddress} placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ" multiline />
            <Field label="จังหวัด" value={regProvince} onChange={setRegProvince} placeholder="เช่น เชียงใหม่" />
            <Field label="รหัสไปรษณีย์" value={regPostcode} onChange={setRegPostcode} placeholder="5 หลัก" keyboardType="number-pad" maxLength={5} />
          </Section>

          {/* Step 4 — Certifications & documents (ported from web) */}
          <Section title="ใบรับรอง & เอกสาร">
            {/* Legal documents */}
            <View style={{ gap: 8 }}>
              <Text style={labelStyle}>เอกสารทางกฎหมาย <Text style={{ color: "#ef4444" }}>*</Text></Text>
              {LEGAL_DOCS.map((d) => (
                <DocUploadRow
                  key={d.id}
                  label={d.label}
                  hint={d.hint}
                  required={d.required}
                  uploaded={!!docs[d.id]}
                  onUpload={() => pickImage(() => setDocs((p) => ({ ...p, [d.id]: true })))}
                />
              ))}
            </View>

            {/* Standard certifications */}
            <View style={{ gap: 8 }}>
              <Text style={labelStyle}>ใบรับรองมาตรฐาน</Text>
              <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: -3, lineHeight: 16 }}>เลือกเฉพาะใบรับรองที่มี + กรอกเลขที่ + วันหมดอายุ + อัปโหลดไฟล์ (ไม่บังคับ)</Text>
              {CERT_OPTIONS.map((c) => {
                const v = certs[c.id];
                const enabled = v?.enabled ?? false;
                return (
                  <View key={c.id} style={{ borderRadius: 14, borderWidth: 2, borderColor: "#e5e7eb", backgroundColor: "#fff", overflow: "hidden" }}>
                    <Pressable onPress={() => toggleCert(c.id)} className="active:opacity-80" style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12 }}>
                      <View style={{ width: 19, height: 19, borderRadius: 6, marginTop: 1, borderWidth: 2, borderColor: enabled ? BRAND_GREEN : "#cbd5cb", backgroundColor: enabled ? BRAND_GREEN : "transparent", alignItems: "center", justifyContent: "center" }}>
                        {enabled ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: enabled ? "700" : "500", color: "#0a0a0a" }}>{c.label}</Text>
                        <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1, lineHeight: 15 }}>{c.desc}</Text>
                      </View>
                    </Pressable>
                    {enabled ? (
                      <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
                        <TextInput
                          value={v?.certNo ?? ""}
                          onChangeText={(t) => updateCert(c.id, "certNo", t)}
                          placeholder="เลขที่ใบรับรอง"
                          placeholderTextColor="#a3a3a3"
                          style={pillStyle}
                        />
                        <GlassDatePicker value={v?.expiry ?? ""} onChange={(dt) => updateCert(c.id, "expiry", dt)} placeholder="วันหมดอายุ" minToday={false} />
                        <Pressable
                          onPress={() => pickImage(() => updateCert(c.id, "uploaded", true))}
                          className="active:opacity-80"
                          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 48, borderRadius: 999, backgroundColor: v?.uploaded ? "rgba(49,151,84,0.12)" : "#fff", borderWidth: v?.uploaded ? 0 : 1, borderColor: "#e5e7eb" }}
                        >
                          {v?.uploaded ? <Check size={15} color={BRAND_GREEN} strokeWidth={2.6} /> : <Upload size={15} color="#6b7280" strokeWidth={2.2} />}
                          <Text style={{ fontSize: 12.5, fontWeight: "500", color: v?.uploaded ? BRAND_GREEN : "#6b7280" }}>{v?.uploaded ? "อัปโหลดแล้ว" : "อัปโหลดไฟล์"}</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Section>

          {/* Capacity & bank */}
          <Section title="กำลังผลิต & บัญชีรับเงิน">
            <Field label="กำลังการผลิต/จัดส่ง ต่อเดือน" value={capacity} onChange={setCapacity} placeholder="เช่น 2 ตัน/เดือน" />
            <Field label="ยอดสั่งซื้อขั้นต่ำ (MOQ)" value={moq} onChange={setMoq} placeholder="เช่น 50 กก." />
            <Field label="ธนาคาร" value={bankName} onChange={setBankName} placeholder="เช่น กสิกรไทย" />
            <Field label="ชื่อบัญชี" value={bankAccountName} onChange={setBankAccountName} placeholder="ชื่อบัญชีรับเงิน" />
            <Field label="เลขที่บัญชี" value={bankAccountNumber} onChange={setBankAccountNumber} placeholder="เลขบัญชี" keyboardType="number-pad" />
          </Section>

          {/* Accept */}
          <Pressable onPress={() => setAccepted((v) => !v)} className="flex-row items-start active:opacity-70" style={{ gap: 10, marginHorizontal: 16, marginTop: 16 }}>
            <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: accepted ? BRAND_GREEN : "#cbd0cb", backgroundColor: accepted ? BRAND_GREEN : "transparent", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              {accepted ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
            </View>
            <Text style={{ flex: 1, fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 19 }}>
              ยอมรับ <Text style={{ color: BRAND_GREEN, fontWeight: "600" }} onPress={() => nav.navigate("TermsOfService")}>ข้อกำหนด Supplier</Text> และ <Text style={{ color: BRAND_GREEN, fontWeight: "600" }} onPress={() => nav.navigate("PrivacyPolicy")}>นโยบายความเป็นส่วนตัว</Text>
            </Text>
          </Pressable>
        </ScrollView>

        {/* Top scroll-edge fade */}
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />

        {/* Floating submit bar */}
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
            <GlassView glassEffectStyle="regular" colorScheme="light" style={{ borderRadius: 34, overflow: "hidden", padding: 9 }}>
              <Pressable onPress={submit} disabled={!isValid} className="active:opacity-90" style={{ height: 50, borderRadius: 999, backgroundColor: isValid ? BRAND_GREEN : "#cfd4d1", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>ส่งใบสมัคร Supplier</Text>
              </Pressable>
            </GlassView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
