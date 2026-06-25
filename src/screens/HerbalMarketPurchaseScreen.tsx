import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SubPageHeader } from "../components/SubPageHeader";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  Calendar,
  ClipboardCheck,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Minus,
  Package,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

const URGENCY_RED = "#e62e05";
const AMBER_DARK = "#a86a00";

// Local route params — typed locally so the screen renders standalone.
type Params = { id?: string; qty?: number };

// Materials come from the canonical HerbalMarketScreen list (local photos) so
// this flow always matches the card/detail the user came from.
import { MATERIALS } from "./HerbalMarketScreen";

/** Resolve a local bundled image (require → number) or remote URL string. */
function imgSource(src: number | string | undefined): any {
  return typeof src === "number" ? src : { uri: src };
}

const PACKAGING_OPTIONS = [
  { id: "1kg-bag", label: "ถุงสุญญากาศ 1 กก." },
  { id: "5kg-bag", label: "ถุง 5 กก." },
  { id: "10kg-bag", label: "ถุง 10 กก." },
  { id: "25kg-bag", label: "กระสอบ 25 กก." },
  { id: "custom", label: "กำหนดเอง (ระบุในหมายเหตุ)" },
];

const DELIVERY_OPTIONS = [
  {
    id: "supplier-deliver",
    label: "Supplier จัดส่งให้",
    desc: "ผู้ขายรับผิดชอบขนส่งถึงคลังผู้ซื้อ",
    fee: 800,
  },
  {
    id: "self-pickup",
    label: "ผู้ซื้อรับเอง (EXW)",
    desc: "ไปรับที่คลัง Supplier",
    fee: 0,
  },
  {
    id: "third-party",
    label: "ใช้บริการขนส่งบุคคลที่ 3",
    desc: "เลือกขนส่งเอง — Supplier จัดเตรียมพร้อมส่ง",
    fee: 0,
  },
];

const PAYMENT_TERMS = [
  { id: "full", label: "ชำระเต็มจำนวน", desc: "ชำระ 100% ก่อนจัดส่ง", icon: "💵" },
  { id: "50-50", label: "มัดจำ 50% + ปลายทาง 50%", desc: "มัดจำเริ่มงาน + ชำระส่วนที่เหลือก่อนรับสินค้า", icon: "🤝" },
  { id: "net-30", label: "เครดิต 30 วัน", desc: "ชำระภายใน 30 วันหลังรับสินค้า", icon: "📅" },
  { id: "net-60", label: "เครดิต 60 วัน", desc: "ชำระภายใน 60 วันหลังรับสินค้า", icon: "🗓️" },
];

const PO_STEPS = [
  { Icon: ClipboardCheck, label: "ระบบสร้างเลข PO ทันทีหลังยืนยัน" },
  { Icon: FileText, label: "Supplier ตอบยืนยันใน 24 ชม." },
  { Icon: ShieldCheck, label: "คุ้มครอง escrow ก่อน Supplier ยืนยัน" },
];

const CARD = {
  backgroundColor: "#fff",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#ececed",
  padding: 16,
} as const;

const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;

// ---- Module-scope field component (declared OUTSIDE the screen to avoid focus loss) ----
function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address" | "number-pad";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, color: TEXT_SECONDARY }}>
        {label}
        {required ? <Text style={{ color: URGENCY_RED }}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="none"
        style={{
          backgroundColor: "#f5f5f5",
          height: 48,
          borderRadius: 999,
          paddingHorizontal: 18,
          fontSize: 14,
          color: "#374151",
        }}
      />
    </View>
  );
}

function SectionHeader({
  Icon,
  title,
  subtitle,
}: {
  Icon: typeof Package;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ marginBottom: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon size={20} color={BRAND_GREEN} strokeWidth={2.2} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a" }}>{title}</Text>
      </View>
      {subtitle ? (
        <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function HerbalMarketPurchaseScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const params = (route.params ?? {}) as Params;

  const material = MATERIALS.find((m) => m.id === params.id) ?? MATERIALS[0];
  const initialQty = Math.max(material.moq, Number(params.qty ?? material.moq));

  // Buyer info
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Shipping
  const [shipAddress, setShipAddress] = useState("");
  const [shipDistrict, setShipDistrict] = useState("");
  const [shipProvince, setShipProvince] = useState("");
  const [shipPostcode, setShipPostcode] = useState("");
  const [shipNote, setShipNote] = useState("");

  // Order
  const [quantity, setQuantity] = useState(initialQty);
  const decQty = () => setQuantity((q) => Math.max(material.moq, q - 5));
  const incQty = () => setQuantity((q) => q + 5);
  const [packaging, setPackaging] = useState("25kg-bag");
  const [meshSize, setMeshSize] = useState("");

  // Terms
  const [deliveryOption, setDeliveryOption] = useState("supplier-deliver");
  const [paymentTerm, setPaymentTerm] = useState("50-50");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [note, setNote] = useState("");

  const belowMoq = quantity < material.moq;
  const subtotal = quantity * material.pricePerKg;
  const deliveryFee = DELIVERY_OPTIONS.find((d) => d.id === deliveryOption)?.fee ?? 0;
  const vat = subtotal * 0.07;
  const grandTotal = subtotal + deliveryFee + vat;
  const depositRate = paymentTerm === "50-50" ? 0.5 : paymentTerm === "full" ? 1 : 0;
  const depositAmount = grandTotal * depositRate;

  const handleConfirm = () => {
    if (belowMoq) return Alert.alert("จำนวนไม่ถึงขั้นต่ำ", `จำนวนต่ำกว่า MOQ — ขั้นต่ำ ${material.moq} กก.`);
    if (!companyName.trim()) return Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกชื่อบริษัท/นิติบุคคล");
    if (!contactName.trim() || !phone.trim() || !email.trim())
      return Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลผู้ติดต่อให้ครบ");
    if (!shipAddress.trim() || !shipProvince.trim() || !shipPostcode.trim())
      return Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกที่อยู่จัดส่ง");
    if (!acceptTerms) return Alert.alert("ยังไม่ยอมรับเงื่อนไข", "กรุณายอมรับเงื่อนไขก่อนยืนยัน");

    const poNumber = `PO-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 90000) + 10000,
    )}`;
    Alert.alert(
      `สร้างใบสั่งซื้อ ${poNumber} สำเร็จ`,
      `Supplier "${material.supplier}" จะตอบกลับยืนยันภายใน 24 ชม.`,
      [{ text: "ตกลง", onPress: () => nav.goBack() }],
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <SubPageHeader
        title="สั่งซื้อสมุนไพร"
        subtitle="ยืนยันคำสั่งซื้อวัตถุดิบ"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
      >
        {/* Intro */}
        <View style={{ alignItems: "center", gap: 6, paddingVertical: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: "600", color: BRAND_GREEN }}>
            สร้างใบสั่งซื้อ (PO)
          </Text>
          <Text style={{ fontSize: 12, color: TEXT_SECONDARY, textAlign: "center", lineHeight: 18 }}>
            ตรวจสอบรายละเอียดและกรอกข้อมูลการสั่งซื้อ — เมื่อยืนยัน ระบบจะสร้างเลข PO และส่งให้ Supplier ตอบกลับยืนยันภายใน 24 ชม.
          </Text>
        </View>

        {/* Order details */}
        <SectionHeader
          Icon={Package}
          title="รายละเอียดคำสั่งซื้อ"
          subtitle="ปรับจำนวนได้โดยตรง — ขั้นต่ำตาม MOQ ของ Supplier"
        />
        <View style={[CARD, { padding: 0, overflow: "hidden" }]}>
          {/* Supplier header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: "#f7f7f8",
              borderBottomWidth: 1,
              borderBottomColor: "#f0f0f0",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: BRAND_GREEN,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                  {material.supplier.charAt(0)}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a", flexShrink: 1 }}
              >
                {material.supplier}
              </Text>
              {material.supplierVerified ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 2,
                    backgroundColor: BRAND_GREEN,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <BadgeCheck size={10} color="#fff" strokeWidth={2.6} />
                  <Text style={{ color: "#fff", fontSize: 9, fontWeight: "500" }}>Verified</Text>
                </View>
              ) : null}
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => (nav.navigate as (route: string) => void)("Chat")}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <MessageSquare size={14} color={BRAND_GREEN} strokeWidth={2.2} />
              <Text style={{ fontSize: 12, color: BRAND_GREEN }}>แชท</Text>
            </Pressable>
          </View>

          {/* Item row */}
          <View style={{ flexDirection: "row", gap: 12, padding: 16 }}>
            <View style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", backgroundColor: "#f1f1f1" }}>
              <Image source={imgSource(material.image)} style={{ width: 72, height: 72 }} />
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  left: 4,
                  backgroundColor: "#b45309",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 999,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}>{material.grade}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a" }}>
                {material.name}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>
                {material.scientificName}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 8,
                  }}
                >
                  <Pressable
                    hitSlop={6}
                    onPress={decQty}
                    style={{
                      width: 32,
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRightWidth: 1,
                      borderRightColor: "#e5e7eb",
                    }}
                  >
                    <Minus size={14} color="#374151" strokeWidth={2.4} />
                  </Pressable>
                  <Text style={{ width: 52, textAlign: "center", fontSize: 14, fontWeight: "500", color: "#0a0a0a" }}>
                    {quantity}
                  </Text>
                  <Pressable
                    hitSlop={6}
                    onPress={incQty}
                    style={{
                      width: 32,
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                      borderLeftWidth: 1,
                      borderLeftColor: "#e5e7eb",
                    }}
                  >
                    <Plus size={14} color="#374151" strokeWidth={2.4} />
                  </Pressable>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 11, color: "#9ca3af" }}>{baht(material.pricePerKg)} / กก.</Text>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: BRAND_GREEN }}>{baht(subtotal)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Footer strip */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderTopWidth: 1,
              borderTopColor: "#f0f0f0",
              backgroundColor: "#fafaf7",
            }}
          >
            <Package size={12} color={BRAND_GREEN} strokeWidth={2.4} />
            <Text style={{ fontSize: 11, color: TEXT_SECONDARY }}>
              MOQ ขั้นต่ำ{" "}
              <Text style={{ color: BRAND_GREEN, fontWeight: "600" }}>{material.moq} กก.</Text>
            </Text>
            <Text style={{ color: "#d1d5db" }}>·</Text>
            <Text style={{ fontSize: 11, color: TEXT_SECONDARY }}>
              คงคลัง{" "}
              <Text style={{ color: "#374151", fontWeight: "600" }}>
                {material.stock.toLocaleString()} กก.
              </Text>
            </Text>
          </View>
        </View>

        {belowMoq ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: -6 }}>
            <AlertCircle size={12} color={URGENCY_RED} strokeWidth={2.4} />
            <Text style={{ fontSize: 11, color: URGENCY_RED }}>
              จำนวนต่ำกว่า MOQ ขั้นต่ำ {material.moq} กก.
            </Text>
          </View>
        ) : null}

        {/* Spec & delivery date */}
        <View style={CARD}>
          <SectionHeader Icon={Calendar} title="สเปคและกำหนดส่ง" />
          <Text style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 8 }}>รูปแบบบรรจุภัณฑ์</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {PACKAGING_OPTIONS.map((p) => {
              const active = packaging === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPackaging(p.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: active ? BRAND_GREEN : "#e5e7eb",
                    backgroundColor: active ? "rgba(49,151,84,0.06)" : "#fff",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: active ? "600" : "500",
                      color: active ? BRAND_GREEN : "#374151",
                    }}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: 14 }}>
            <TextField
              label="ขนาดผง / mesh"
              value={meshSize}
              onChange={setMeshSize}
              placeholder="เช่น 80 mesh"
            />
          </View>
        </View>

        {/* Buyer / Tax info */}
        <View style={CARD}>
          <SectionHeader
            Icon={Building2}
            title="ข้อมูลผู้ซื้อ / ออกใบกำกับภาษี"
            subtitle="ใช้สำหรับออกใบกำกับภาษีและ PO ฉบับสมบูรณ์"
          />
          <View style={{ gap: 12, marginTop: 8 }}>
            <TextField label="ชื่อบริษัท / นิติบุคคล" required value={companyName} onChange={setCompanyName} placeholder="เช่น บริษัท เมต้าเฮิร์บ จำกัด" />
            <TextField label="เลขประจำตัวผู้เสียภาษี" value={taxId} onChange={setTaxId} placeholder="13 หลัก" keyboardType="number-pad" />
            <TextField label="ที่อยู่ออกใบกำกับภาษี" value={billingAddress} onChange={setBillingAddress} placeholder="ที่อยู่ตามทะเบียนพาณิชย์" />
            <TextField label="ผู้ติดต่อ" required value={contactName} onChange={setContactName} placeholder="ชื่อ-นามสกุล" />
            <TextField label="ตำแหน่ง" value={position} onChange={setPosition} placeholder="เช่น ฝ่ายจัดซื้อ" />
            <TextField label="เบอร์โทร" required value={phone} onChange={setPhone} placeholder="0XX-XXX-XXXX" keyboardType="phone-pad" />
            <TextField label="อีเมล" required value={email} onChange={setEmail} placeholder="email@company.com" keyboardType="email-address" />
          </View>
        </View>

        {/* Shipping address */}
        <View style={CARD}>
          <SectionHeader
            Icon={MapPin}
            title="ที่อยู่จัดส่ง"
            subtitle="คลังสินค้า หรือสถานที่รับวัตถุดิบ"
          />
          <View style={{ gap: 12, marginTop: 8 }}>
            <TextField label="ที่อยู่ (เลขที่ / ซอย / ถนน)" required value={shipAddress} onChange={setShipAddress} placeholder="เช่น 123 ถ.พระราม 2" />
            <TextField label="ตำบล / แขวง" value={shipDistrict} onChange={setShipDistrict} placeholder="" />
            <TextField label="จังหวัด" required value={shipProvince} onChange={setShipProvince} placeholder="" />
            <TextField label="รหัสไปรษณีย์" required value={shipPostcode} onChange={setShipPostcode} placeholder="5 หลัก" keyboardType="number-pad" />
            <TextField label="หมายเหตุการจัดส่ง" value={shipNote} onChange={setShipNote} placeholder="เช่น โหลดที่ประตู 3 / มีรถยก" />
          </View>
        </View>

        {/* Delivery option */}
        <View style={CARD}>
          <SectionHeader Icon={Truck} title="รูปแบบการจัดส่ง" subtitle="เลือกผู้รับผิดชอบขนส่ง" />
          <View style={{ gap: 8, marginTop: 8 }}>
            {DELIVERY_OPTIONS.map((d) => {
              const active = deliveryOption === d.id;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setDeliveryOption(d.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: active ? BRAND_GREEN : "#e5e7eb",
                    backgroundColor: active ? "rgba(49,151,84,0.06)" : "#fff",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 }}>
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 2,
                        borderColor: active ? BRAND_GREEN : "#d1d5db",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 2,
                      }}
                    >
                      {active ? (
                        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: BRAND_GREEN }} />
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: active ? "600" : "500", color: "#0a0a0a" }}>{d.label}</Text>
                      <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{d.desc}</Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      marginLeft: 8,
                      color: d.fee === 0 ? BRAND_GREEN : "#374151",
                    }}
                  >
                    {d.fee === 0 ? "ฟรี" : baht(d.fee)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Payment terms */}
        <View style={CARD}>
          <SectionHeader
            Icon={Wallet}
            title="เงื่อนไขการชำระเงิน"
            subtitle="เลือกแผนการชำระเงิน — เงื่อนไขสุดท้ายขึ้นกับการตอบกลับของ Supplier"
          />
          <View style={{ gap: 8, marginTop: 8 }}>
            {PAYMENT_TERMS.map((p) => {
              const active = paymentTerm === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPaymentTerm(p.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: active ? BRAND_GREEN : "#e5e7eb",
                    backgroundColor: active ? "rgba(49,151,84,0.06)" : "#fff",
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{p.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: active ? "600" : "500", color: "#0a0a0a" }}>{p.label}</Text>
                    <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{p.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Note */}
        <View style={CARD}>
          <SectionHeader
            Icon={MessageSquare}
            title="หมายเหตุเพิ่มเติม"
            subtitle="คำขอเฉพาะ, ข้อตกลงพิเศษ, หรือเอกสารเพิ่มเติม"
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="เช่น ต้องการ COA ทุก lot / ป้ายระบุ batch / ส่งสำเนา invoice ทาง email"
            placeholderTextColor="#9ca3af"
            multiline
            style={{
              marginTop: 8,
              minHeight: 88,
              backgroundColor: "#f5f5f5",
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 14,
              color: "#374151",
              textAlignVertical: "top",
            }}
          />
        </View>

        {/* PO process info */}
        <View
          style={{
            backgroundColor: "rgba(49,151,84,0.06)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(49,151,84,0.2)",
            padding: 14,
            gap: 8,
          }}
        >
          {PO_STEPS.map((s) => (
            <View key={s.label} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <s.Icon size={14} color={BRAND_GREEN} strokeWidth={2.4} style={{ marginTop: 2 }} />
              <Text style={{ fontSize: 12, color: TEXT_SECONDARY, flex: 1 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Accept terms */}
        <Pressable
          onPress={() => setAcceptTerms((v) => !v)}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            backgroundColor: "rgba(49,151,84,0.06)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(49,151,84,0.2)",
            padding: 14,
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: acceptTerms ? BRAND_GREEN : "#d1d5db",
              backgroundColor: acceptTerms ? BRAND_GREEN : "#fff",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            {acceptTerms ? <ClipboardCheck size={12} color="#fff" strokeWidth={3} /> : null}
          </View>
          <Text style={{ fontSize: 12, color: TEXT_SECONDARY, flex: 1, lineHeight: 18 }}>
            ฉันยอมรับ <Text style={{ color: BRAND_GREEN }}>เงื่อนไขการสั่งซื้อ B2B</Text> และเข้าใจว่า PO นี้จะมีผลผูกพันเมื่อ Supplier ตอบกลับยืนยันภายใน 24 ชม. — สามารถยกเลิก/แก้ไข PO ได้ก่อน Supplier ยืนยัน
          </Text>
        </Pressable>

        {/* Cost breakdown */}
        <View style={CARD}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a", marginBottom: 10 }}>
            สรุปใบสั่งซื้อ
          </Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, color: TEXT_SECONDARY }}>ราคาวัตถุดิบ</Text>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#0a0a0a" }}>{baht(subtotal)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Truck size={12} color="#9ca3af" strokeWidth={2.2} />
                <Text style={{ fontSize: 13, color: TEXT_SECONDARY }}>ค่าจัดส่ง</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#0a0a0a" }}>
                {deliveryFee === 0 ? "ฟรี" : baht(deliveryFee)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, color: TEXT_SECONDARY }}>VAT 7%</Text>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#0a0a0a" }}>{baht(vat)}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 4 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>รวมทั้งสิ้น</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: BRAND_GREEN }}>{baht(grandTotal)}</Text>
            </View>
            {depositAmount > 0 && depositRate < 1 ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: "#fff8e6",
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: AMBER_DARK }}>
                  มัดจำเริ่มงาน ({depositRate * 100}%)
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: AMBER_DARK }}>{baht(depositAmount)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom confirm bar */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fff" }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            borderTopWidth: 1,
            borderTopColor: "#ececed",
          }}
        >
          <Pressable
            onPress={handleConfirm}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: pressed ? BRAND_GREEN_DARK : BRAND_GREEN,
              borderRadius: 999,
              height: 48,
            })}
          >
            <ShoppingCart size={16} color="#fff" strokeWidth={2.4} />
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>ยืนยันสร้างใบสั่งซื้อ</Text>
          </Pressable>
          <Text style={{ fontSize: 10, color: TEXT_MUTED, textAlign: "center", marginTop: 6 }}>
            PO จะถูกบันทึกในระบบและส่งสำเนา PDF ทางอีเมล
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
