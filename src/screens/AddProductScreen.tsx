import { useMemo, useState, type ReactNode } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image, Switch, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ImagePlus, X, Package, FileText, Beaker, Banknote, Settings2, Plus, Minus, Trash2, MapPin,
  Check, Star, Zap, Eye, AlertCircle, ChevronDown, Boxes, Save, Search,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BottomFade } from "../components/BottomFade";
import * as Haptics from "expo-haptics";
import { GlassView } from "expo-glass-effect";
import { SubPageHeader } from "../components/SubPageHeader";
import { getImagePicker } from "../utils/imagePicker";
import { showToast } from "../components/Toast";
import type { RootStackParamList } from "../navigation/RootStack";
import { BRAND_GREEN, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const GRAY = "#8e8e93";

// Thousands separators for number fields — display commas, store raw digits.
const withCommas = (s: string) => {
  if (!s) return s;
  const [int, dec] = s.split(".");
  const i = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${i}.${dec}` : i;
};
const stripCommas = (s: string) => s.replace(/,/g, "");
const INPUT = { backgroundColor: "#fafafa", borderRadius: 999, paddingHorizontal: 20, height: 48, fontSize: 14, color: "#0a0a0a" } as const;
const AFFIX = { flexDirection: "row", alignItems: "center", backgroundColor: "#fafafa", borderRadius: 999, paddingHorizontal: 18, height: 48, gap: 8 } as const;

const REGULAR_CATEGORIES = ["ผลิตภัณฑ์สมุนไพร", "เครื่องหอม & อโรม่า", "อาหารและเครื่องดื่ม", "ผลิตภัณฑ์สุขภาพ", "ชุดของชำร่วย/ของขวัญ"];
const MATERIAL_CATEGORIES = ["ราก/หัว", "ใบ", "ดอก", "เปลือก", "ผล/เมล็ด", "เห็ด", "สมุนไพรรวม"];
const UNITS = ["ชิ้น", "กล่อง", "ซอง", "ขวด"];
const FORMATS = ["ผง", "แคปซูล", "เม็ด", "ชา / ชงดื่ม", "น้ำมันหอมระเหย", "ครีม / เจล", "ของเหลว", "แห้ง (ทั้งใบ/ชิ้น)", "อื่นๆ"];
const PROCESSING = ["อบแห้ง", "สับ / ฝาน", "บด (ผง)", "คั่ว", "สกัด", "น้ำมันหอมระเหย", "อื่นๆ"];
const PACKAGING = ["ถุงสุญญากาศ 1 กก.", "ถุง 5 กก.", "ถุง 10 กก.", "กระสอบ 25 กก.", "ตามที่ลูกค้ากำหนด"];
const GRADES = ["พรีเมียม", "คัดสรร", "มาตรฐาน", "ทั่วไป", "ประหยัด"];
const CERTS = ["อย.", "Organic Thailand", "GAP", "GMP"];

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <Text style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a", marginBottom: 8 }}>
      {children}
      {required ? <Text style={{ color: "#ff3b30" }}> *</Text> : null}
    </Text>
  );
}

// Full-bleed white section — colored icon tile + title + sub header, same
// language as the coupon / promotion create pages.
function Section({ Icon, tint = BRAND_GREEN, title, subtitle, right, children }: { Icon: typeof Package; tint?: string; title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${tint}1a`, alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={tint} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#000" }}>{title}</Text>
          {subtitle ? <Text style={{ fontSize: 11, color: "#8e8e93", marginTop: 1 }}>{subtitle}</Text> : null}
        </View>
        {right ?? null}
      </View>
      <View style={{ gap: 16 }}>{children}</View>
    </View>
  );
}

// Number field with − / + steppers — same look as the shared NumberStepper
// (promotion / coupon / shipping forms), plus optional prefix (฿) / suffix (กก.).
function Stepper({ value, onChange, prefix, suffix, placeholder = "0", step = 1 }: { value: string; onChange: (v: string) => void; prefix?: string; suffix?: string; placeholder?: string; step?: number }) {
  const bump = (d: number) => {
    const n = Math.max(0, (parseFloat(value) || 0) + d);
    onChange(String(n));
    Haptics.selectionAsync().catch(() => {}); // tactile tick on each step
  };
  return (
    <View className="flex-row items-center" style={{ backgroundColor: "#fafafa", borderRadius: 999, height: 46, paddingLeft: 18, paddingRight: 6, gap: 6 }}>
      {prefix ? <Text style={{ fontSize: 14, color: GRAY }}>{prefix}</Text> : null}
      <TextInput value={withCommas(value)} onChangeText={(t) => onChange(stripCommas(t))} placeholder={placeholder} placeholderTextColor="#a3a3a3" keyboardType="numeric" style={{ flex: 1, fontSize: 14, color: "#0a0a0a", minWidth: 0, paddingVertical: 0 }} />
      {suffix ? <Text style={{ fontSize: 12, color: GRAY }}>{suffix}</Text> : null}
      <View className="flex-row items-center" style={{ backgroundColor: "#fff", borderRadius: 999, height: 34, overflow: "hidden" }}>
        <Pressable onPress={() => bump(-step)} hitSlop={6} className="items-center justify-center active:opacity-70" style={{ width: 44, height: 34 }}>
          <Minus size={16} color="#0a0a0a" strokeWidth={2.6} />
        </Pressable>
        <View style={{ width: 1, height: 18, backgroundColor: "#e5e7eb" }} />
        <Pressable onPress={() => bump(step)} hitSlop={6} className="items-center justify-center active:opacity-70" style={{ width: 44, height: 34 }}>
          <Plus size={16} color="#0a0a0a" strokeWidth={2.6} />
        </Pressable>
      </View>
    </View>
  );
}

// Dropdown trigger — gray form pill; tapping opens the OptionPicker modal
// (AddCard-style slide-up sheet, same shell as the promo product picker).
function SelectField({ value, placeholder, onPress }: { value: string; placeholder: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between active:opacity-80"
      style={{ backgroundColor: "#f5f5f5", borderRadius: 999, paddingHorizontal: 18, height: 48 }}>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: value ? "#374151" : "#9ca3af" }} numberOfLines={1}>{value || placeholder}</Text>
      <ChevronDown size={18} color="#9ca3af" strokeWidth={2.4} />
    </Pressable>
  );
}

function ChipSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View className="flex-row" style={{ gap: 8, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable key={opt} onPress={() => onChange(opt)} className="active:opacity-80"
            style={{ paddingHorizontal: 14, height: 38, justifyContent: "center", borderRadius: 999, backgroundColor: active ? BRAND_GREEN : "#fafafa", borderWidth: 1, borderColor: active ? BRAND_GREEN : "#ececec" }}>
            <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MultiChip({ options, values, onToggle }: { options: string[]; values: string[]; onToggle: (v: string) => void }) {
  return (
    <View className="flex-row" style={{ gap: 8, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const active = values.includes(opt);
        return (
          <Pressable key={opt} onPress={() => onToggle(opt)} className="flex-row items-center active:opacity-80"
            style={{ paddingHorizontal: 14, height: 38, gap: 5, borderRadius: 999, backgroundColor: active ? "rgba(49,151,84,0.12)" : "#fafafa", borderWidth: 1, borderColor: active ? BRAND_GREEN : "#ececec" }}>
            {active ? <Check size={13} color={BRAND_GREEN} strokeWidth={3} /> : null}
            <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? BRAND_GREEN : TEXT_SECONDARY }}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Settings card — gradient + icon circle + toggle + decorative image (web parity).
export function SettingCard({ Icon, label, subtitle, value, onValueChange, accent, image }: { Icon: typeof Package; label: string; subtitle: string; value: boolean; onValueChange: (v: boolean) => void; accent: string; image?: number }) {
  return (
    <View style={{ borderRadius: 20, padding: 18, overflow: "hidden", borderWidth: 1, borderColor: value ? accent + "33" : "#f0f0f0", backgroundColor: value ? undefined : "#fafafa" }}>
      {value ? (
        <LinearGradient colors={[accent + "16", accent + "08"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      ) : null}
      {/* Decorative illustration — bottom-right */}
      {image ? (
        <Image source={image} style={{ position: "absolute", right: -8, bottom: -8, width: 90, height: 90, opacity: value ? 1 : 0.5 }} resizeMode="contain" />
      ) : null}
      <View className="flex-row items-center justify-between" style={{ gap: 10 }}>
        <View className="flex-row items-center" style={{ gap: 10, flex: 1 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: value ? accent + "26" : "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
            <Icon size={16} color={value ? accent : "#8e8e93"} strokeWidth={2.2} fill={value && label.includes("แนะนำ") ? accent : "transparent"} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a" }}>{label}</Text>
        </View>
        <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#e9e9ea", true: "#34c759" }} thumbColor="#fff" ios_backgroundColor="#e9e9ea" />
      </View>
      <View className="flex-row items-start" style={{ gap: 5, marginTop: 10, paddingRight: 78 }}>
        <AlertCircle size={13} color="#bdbdbd" strokeWidth={2.2} style={{ marginTop: 1 }} />
        <Text style={{ flex: 1, fontSize: 12, color: GRAY, lineHeight: 17 }}>{subtitle}</Text>
      </View>
    </View>
  );
}

// Same artwork as the web's ตั้งค่าสินค้า cards (selling-products / recommended-products).
export const IMG_SELL = require("../../assets/selling-products.png");
export const IMG_RECOMMEND = require("../../assets/recommended-products.png");

export function AddProductScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { mode } = useRoute<RouteProp<RootStackParamList, "AddProduct">>().params;
  const isMaterial = mode === "material";

  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("ชิ้น");
  const [format, setFormat] = useState("");
  const [brand, setBrand] = useState("");
  const [scientific, setScientific] = useState("");
  const [description, setDescription] = useState("");

  const [location, setLocation] = useState("");
  const [processing, setProcessing] = useState("");
  const [packaging, setPackaging] = useState("");
  const [shelfLife, setShelfLife] = useState("");
  const [grade, setGrade] = useState("");
  const [certs, setCerts] = useState<string[]>([]);

  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [weight, setWeight] = useState("");
  // ตั้งค่า SEO (web parity) — toggle reveals the title/keywords fields.
  const [seoEnabled, setSeoEnabled] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  // Variants (ตัวเลือกสินค้า) — regular products only.
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<{ image: string | null; name: string; price: string; stock: string; weight: string }[]>([
    { image: null, name: "", price: "", stock: "", weight: "" },
  ]);
  const addVariant = () => setVariants((p) => [...p, { image: null, name: "", price: "", stock: "", weight: "" }]);
  const removeVariant = (i: number) => setVariants((p) => p.filter((_, x) => x !== i));
  const setVar = (i: number, k: "name" | "price" | "stock" | "weight", v: string) => setVariants((p) => p.map((t, x) => (x === i ? { ...t, [k]: v } : t)));
  const pickVarImage = async (i: number) => {
    const ImagePicker = getImagePicker();
    if (!ImagePicker) { Alert.alert("ไม่รองรับการเลือกรูป", "อุปกรณ์นี้ยังไม่รองรับการเลือกรูปภาพในโหมดนี้"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) setVariants((p) => p.map((t, x) => (x === i ? { ...t, image: res.assets[0].uri } : t)));
  };
  const [basePrice, setBasePrice] = useState("");
  const [moq, setMoq] = useState("");
  const [matStock, setMatStock] = useState("");
  const [tiers, setTiers] = useState<{ minQty: string; price: string }[]>([{ minQty: "", price: "" }]);

  const [active, setActive] = useState(true);
  const [recommended, setRecommended] = useState(false);
  const [flash, setFlash] = useState(false);


  const sku = useMemo(() => `${isMaterial ? "MAT" : "PRD"}-${String(Date.now()).slice(-4)}`, [isMaterial]);
  const title = isMaterial ? "เพิ่มวัตถุดิบ" : "เพิ่มผลิตภัณฑ์";

  const pickImage = async (idx: number) => {
    const ImagePicker = getImagePicker();
    if (!ImagePicker) { Alert.alert("ไม่รองรับการเลือกรูป", "อุปกรณ์นี้ยังไม่รองรับการเลือกรูปภาพในโหมดนี้"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) setImages((p) => { const n = [...p]; n[idx] = res.assets[0].uri; return n; });
  };

  const toggleCert = (c: string) => setCerts((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const addTier = () => setTiers((p) => [...p, { minQty: "", price: "" }]);
  const removeTier = (i: number) => setTiers((p) => p.filter((_, x) => x !== i));
  const setTier = (i: number, k: "minQty" | "price", v: string) => setTiers((p) => p.map((t, x) => (x === i ? { ...t, [k]: v } : t)));

  const onSave = () => {
    if (!name.trim()) return Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกชื่อสินค้า");
    if (!category) return Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณาเลือกหมวดหมู่");
    if (isMaterial) {
      if (!scientific.trim()) return Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกชื่อวิทยาศาสตร์");
      if (!location.trim()) return Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกแหล่งผลิต / จังหวัด");
      if (!basePrice.trim() || !moq.trim() || !matStock.trim()) return Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกราคาฐาน / MOQ / คงเหลือ");
    } else if (hasVariants) {
      if (variants.some((v) => !v.name.trim() || !v.price.trim() || !v.stock.trim())) {
        return Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกชื่อ / ราคา / คงเหลือ ของทุกตัวเลือก");
      }
    } else if (!price.trim() || !stock.trim()) {
      return Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกราคาและสต็อก");
    }
    showToast(`${title} "${name}" เรียบร้อย`);
    if (nav.canGoBack()) nav.goBack();
  };

  const previewPrice = Number(basePrice) || 0;

  // Open the shared OptionPicker modal (slide-up sheet with search) for a field.
  const openPicker = (title: string, options: string[], value: string, onChange: (v: string) => void, searchPlaceholder?: string) =>
    nav.navigate("OptionPicker", { title, options, value: value || undefined, searchPlaceholder, onSelect: onChange });

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title={title} onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 110, gap: 8 }}>
        {/* รูปภาพสินค้า */}
        <Section Icon={ImagePlus} title="รูปภาพสินค้า" subtitle="อัปโหลดได้สูงสุด 3 รูป (JPG, PNG, WebP) ไม่เกิน 2MB">
          <View className="flex-row" style={{ gap: 12 }}>
            {images.map((img, i) => (
              <Pressable key={i} onPress={() => pickImage(i)} className="active:opacity-80"
                style={{ flex: 1, aspectRatio: 1, borderRadius: 18, backgroundColor: "#f9f9f9", borderWidth: 2, borderColor: img ? BRAND_GREEN : i === 0 ? "rgba(49,151,84,0.4)" : "#dcdcdc", borderStyle: img ? "solid" : "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {img ? (
                  <>
                    <Image source={{ uri: img }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    <Pressable onPress={() => setImages((p) => { const n = [...p]; n[i] = null; return n; })} hitSlop={8} style={{ position: "absolute", top: 6, left: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
                      <X size={14} color="#fff" strokeWidth={2.4} />
                    </Pressable>
                    {i === 0 ? (
                      <View style={{ position: "absolute", top: 6, right: 6, backgroundColor: BRAND_GREEN, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                        <Text style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}>หลัก</Text>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e5e5", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }}>
                      <Plus size={16} color={BRAND_GREEN} strokeWidth={2.4} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: "500", color: "#0a0a0a", marginTop: 8 }}>{i === 0 ? "รูปปก" : `รูป ${i + 1}`}</Text>
                    <Text style={{ fontSize: 10, color: "#bdbdbd", marginTop: 1 }}>{i === 0 ? "หลัก" : "เพิ่มเติม"}</Text>
                  </>
                )}
              </Pressable>
            ))}
          </View>
        </Section>

        {/* ข้อมูลสินค้า */}
        <Section Icon={FileText} tint="#3b82f6" title="ข้อมูลสินค้า">
          <View>
            <FieldLabel required>ชื่อสินค้า</FieldLabel>
            <TextInput value={name} onChangeText={setName} placeholder={isMaterial ? "เช่น: ขมิ้นชันผง" : "เช่น: ยาดมสมุนไพร"} placeholderTextColor="#a3a3a3" style={INPUT} />
          </View>
          <View className="flex-row" style={{ gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel required>หมวดหมู่</FieldLabel>
              <SelectField value={category} placeholder="เลือกหมวดหมู่" onPress={() => openPicker("เลือกหมวดหมู่", isMaterial ? MATERIAL_CATEGORIES : REGULAR_CATEGORIES, category, setCategory, "ค้นหาหมวดหมู่")} />
            </View>
            {!isMaterial ? (
              <View style={{ flex: 1 }}>
                <FieldLabel>หน่วย</FieldLabel>
                <SelectField value={unit} placeholder="เลือกหน่วย" onPress={() => openPicker("เลือกหน่วย", UNITS, unit, setUnit, "ค้นหาหน่วย")} />
              </View>
            ) : null}
          </View>
          <View>
            <FieldLabel>รหัสสินค้า (SKU)</FieldLabel>
            <View style={[INPUT, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
              <Text style={{ fontSize: 14, color: BRAND_GREEN, fontWeight: "700" }}>{sku}</Text>
              <Text style={{ fontSize: 11, color: "#c0c0c0" }}>สร้างอัตโนมัติ</Text>
            </View>
          </View>
          <View>
            <FieldLabel>รูปแบบสินค้า</FieldLabel>
            <SelectField value={format} placeholder="เลือกรูปแบบสินค้า" onPress={() => openPicker("รูปแบบสินค้า", FORMATS, format, setFormat, "ค้นหารูปแบบสินค้า")} />
          </View>
          <View>
            <FieldLabel>ยี่ห้อ / แบรนด์</FieldLabel>
            <TextInput value={brand} onChangeText={setBrand} placeholder="เช่น: MetaHerb" placeholderTextColor="#a3a3a3" style={INPUT} />
          </View>
          {isMaterial ? (
            <View>
              <FieldLabel required>ชื่อวิทยาศาสตร์</FieldLabel>
              <TextInput value={scientific} onChangeText={setScientific} placeholder="เช่น: Curcuma longa" placeholderTextColor="#a3a3a3" style={[INPUT, { fontStyle: "italic" }]} />
            </View>
          ) : null}
          <View>
            <FieldLabel>รายละเอียดสินค้า</FieldLabel>
            <TextInput value={description} onChangeText={setDescription} placeholder="อธิบายสรรพคุณ วิธีใช้ ส่วนประกอบ ฯลฯ" placeholderTextColor="#a3a3a3" multiline textAlignVertical="top" style={{ backgroundColor: "#fafafa", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 14, fontSize: 14, color: "#0a0a0a", minHeight: 110 }} />
          </View>
        </Section>

        {/* ข้อมูล Herbal Market (B2B) — material only */}
        {isMaterial ? (
          <Section Icon={Beaker} tint="#14b8a6" title="ข้อมูล Herbal Market (B2B)" subtitle="ข้อมูลเพิ่มเติมสำหรับลงตลาดวัตถุดิบ">
            <View>
              <FieldLabel required>แหล่งผลิต / จังหวัด</FieldLabel>
              <View style={AFFIX}>
                <MapPin size={16} color={BRAND_GREEN} strokeWidth={2.2} />
                <TextInput value={location} onChangeText={setLocation} placeholder="เช่น: เชียงใหม่" placeholderTextColor="#a3a3a3" style={{ flex: 1, fontSize: 14, color: "#0a0a0a" }} />
              </View>
            </View>
            <View><FieldLabel>เกรดวัตถุดิบ</FieldLabel><SelectField value={grade} placeholder="เลือกเกรด" onPress={() => openPicker("เลือกเกรด", GRADES, grade, setGrade, "ค้นหาเกรด")} /></View>
            <View><FieldLabel>วิธีการแปรรูป</FieldLabel><SelectField value={processing} placeholder="เลือกวิธีการแปรรูป" onPress={() => openPicker("วิธีการแปรรูป", PROCESSING, processing, setProcessing, "ค้นหาวิธีการแปรรูป")} /></View>
            <View><FieldLabel>บรรจุภัณฑ์เริ่มต้น</FieldLabel><SelectField value={packaging} placeholder="เลือกบรรจุภัณฑ์" onPress={() => openPicker("บรรจุภัณฑ์เริ่มต้น", PACKAGING, packaging, setPackaging, "ค้นหาบรรจุภัณฑ์")} /></View>
            <View>
              <FieldLabel>อายุการเก็บรักษา (เดือน)</FieldLabel>
              <Stepper value={shelfLife} onChange={setShelfLife} suffix="เดือน" placeholder="12" />
            </View>
            <View><FieldLabel>ใบรับรองมาตรฐาน</FieldLabel><MultiChip options={CERTS} values={certs} onToggle={toggleCert} /></View>
          </Section>
        ) : null}

        {/* ตั้งราคา (วัตถุดิบ) */}
        {isMaterial ? (
        <Section Icon={Banknote} tint="#f59e0b" title="ตั้งราคา" subtitle="ราคาฐานต่อ กก. + MOQ — ซื้อมากขึ้นราคาต่อ กก. ลดลงได้">
          <>
              <View>
                <FieldLabel required>ราคาฐาน / กก.</FieldLabel>
                <Stepper value={basePrice} onChange={setBasePrice} prefix="฿" suffix="/ กก." placeholder="200" />
              </View>
              <View>
                <FieldLabel required>MOQ ขั้นต่ำ</FieldLabel>
                <Stepper value={moq} onChange={setMoq} suffix="กก." placeholder="1" />
              </View>
              <View>
                <FieldLabel required>คงเหลือ</FieldLabel>
                <Stepper value={matStock} onChange={setMatStock} suffix="กก." placeholder="500" />
              </View>
              <View>
                <FieldLabel>ราคาขายส่ง (ส่วนลดตามปริมาณ)</FieldLabel>
                <View style={{ gap: 8 }}>
                  {tiers.map((t, i) => (
                    <View key={i} style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#ececec", borderRadius: 16, padding: 12, gap: 10 }}>
                      <View className="flex-row items-center justify-between">
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(49,151,84,0.12)", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: BRAND_GREEN }}>{i + 1}</Text>
                        </View>
                        {tiers.length > 1 ? (
                          <Pressable onPress={() => removeTier(i)} hitSlop={6} className="active:opacity-70" style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }}>
                            <Trash2 size={16} color="#ef4444" strokeWidth={2.2} />
                          </Pressable>
                        ) : null}
                      </View>
                      <View style={{ gap: 10 }}>
                        <View>
                          <Text style={{ fontSize: 12.5, color: GRAY, marginBottom: 6 }}>ตั้งแต่ (กก.)</Text>
                          <Stepper value={t.minQty} onChange={(v) => setTier(i, "minQty", v)} suffix="กก." placeholder="0" />
                        </View>
                        <View>
                          <Text style={{ fontSize: 12.5, color: GRAY, marginBottom: 6 }}>ราคา / กก.</Text>
                          <Stepper value={t.price} onChange={(v) => setTier(i, "price", v)} prefix="฿" placeholder="0" />
                        </View>
                      </View>
                    </View>
                  ))}
                  <Pressable onPress={addTier} className="flex-row items-center justify-center active:opacity-70"
                    style={{ height: 44, borderRadius: 16, borderWidth: 2, borderColor: "#dcdcdc", borderStyle: "dashed", gap: 6 }}>
                    <Plus size={16} color={BRAND_GREEN} strokeWidth={2.4} />
                    <Text style={{ fontSize: 13, fontWeight: "500", color: BRAND_GREEN }}>เพิ่มขั้นราคา</Text>
                  </Pressable>
                </View>
              </View>
              {previewPrice > 0 ? (
                <View style={{ backgroundColor: "rgba(49,151,84,0.05)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(49,151,84,0.15)" }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#287745", marginBottom: 2 }}>ตัวอย่างการแสดงราคา</Text>
                  <Text style={{ fontSize: 12, color: "#4b5563" }}>
                    ราคา <Text style={{ fontWeight: "700" }}>฿{previewPrice.toLocaleString()}/กก.</Text>
                    {moq ? `  MOQ ${moq} กก.` : ""}
                    {tiers[0]?.minQty && tiers[0]?.price ? `  ·  ตั้งแต่ ${tiers[0].minQty} กก. = ฿${Number(tiers[0].price).toLocaleString()}/กก.` : ""}
                  </Text>
                </View>
              ) : null}
            </>
        </Section>
        ) : (
        /* ตัวเลือกสินค้า (ผลิตภัณฑ์) */
        <Section
          Icon={Boxes}
          tint="#0088ff"
          title="ตัวเลือกสินค้า"
          subtitle="เปิดใช้งานหากสินค้ามีหลายตัวเลือก เช่น ขนาด, สี"
          right={<Switch value={hasVariants} onValueChange={setHasVariants} trackColor={{ false: "#e9e9ea", true: "#34c759" }} thumbColor="#fff" ios_backgroundColor="#e9e9ea" />}
        >
          {!hasVariants ? (
            <>
              <View>
                <FieldLabel required>ราคา</FieldLabel>
                <Stepper value={price} onChange={setPrice} prefix="฿" placeholder="0.00" />
              </View>
              <View>
                <FieldLabel required>สินค้าคงเหลือ</FieldLabel>
                <Stepper value={stock} onChange={setStock} placeholder="0" />
              </View>
              <View>
                <FieldLabel required>น้ำหนักสินค้า (กรัม)</FieldLabel>
                <Stepper value={weight} onChange={setWeight} suffix="g" placeholder="0" />
              </View>
            </>
          ) : (
            <>
              {variants.map((v, i) => (
                <View key={i} style={{ borderWidth: 1, borderColor: "#ececec", borderRadius: 18, padding: 14, gap: 12 }}>
                  <View className="flex-row items-start" style={{ gap: 12 }}>
                    <Pressable onPress={() => pickVarImage(i)} className="active:opacity-80" style={{ width: 84, height: 84, borderRadius: 14, backgroundColor: "#f9f9f9", borderWidth: 2, borderColor: v.image ? BRAND_GREEN : "#dcdcdc", borderStyle: v.image ? "solid" : "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {v.image ? (
                        <Image source={{ uri: v.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      ) : (
                        <>
                          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e5e5", alignItems: "center", justifyContent: "center" }}>
                            <Plus size={14} color={BRAND_GREEN} strokeWidth={2.4} />
                          </View>
                          <Text style={{ fontSize: 10.5, color: GRAY, marginTop: 5 }}>เพิ่มรูป</Text>
                        </>
                      )}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <View className="flex-row items-center justify-between">
                        <FieldLabel required>ชื่อตัวเลือก</FieldLabel>
                        {variants.length > 1 ? (
                          <Pressable onPress={() => removeVariant(i)} hitSlop={6} className="active:opacity-70" style={{ marginBottom: 8 }}>
                            <Trash2 size={16} color="#ef4444" strokeWidth={2.2} />
                          </Pressable>
                        ) : null}
                      </View>
                      <TextInput value={v.name} onChangeText={(t) => setVar(i, "name", t)} placeholder="เช่น: 30 เม็ด, ขนาด L, สีแดง" placeholderTextColor="#a3a3a3" style={INPUT} />
                    </View>
                  </View>
                  <View>
                    <FieldLabel required>ราคา</FieldLabel>
                    <Stepper value={v.price} onChange={(t) => setVar(i, "price", t)} prefix="฿" placeholder="0.00" />
                  </View>
                  <View>
                    <FieldLabel required>คงเหลือ</FieldLabel>
                    <Stepper value={v.stock} onChange={(t) => setVar(i, "stock", t)} placeholder="0" />
                  </View>
                  <View>
                    <FieldLabel required>น้ำหนัก (กรัม)</FieldLabel>
                    <Stepper value={v.weight} onChange={(t) => setVar(i, "weight", t)} suffix="g" placeholder="0" />
                  </View>
                </View>
              ))}
              <Pressable onPress={addVariant} className="flex-row items-center justify-center active:opacity-70"
                style={{ height: 46, borderRadius: 16, borderWidth: 2, borderColor: "#dcdcdc", borderStyle: "dashed", gap: 6 }}>
                <Plus size={16} color={BRAND_GREEN} strokeWidth={2.4} />
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: BRAND_GREEN }}>เพิ่มตัวเลือกสินค้า</Text>
              </Pressable>
            </>
          )}
        </Section>
        )}

        {/* ตั้งค่า SEO — web parity (OwnerDashboard addprod-seo section) */}
        <Section
          Icon={Search}
          tint="#3b82f6"
          title="ตั้งค่า SEO"
          subtitle="เปิดตั้งค่า SEO เพื่อช่วยให้สินค้าติดอันดับใน Google ได้ดีขึ้น"
          right={<Switch value={seoEnabled} onValueChange={setSeoEnabled} trackColor={{ false: "#e9e9ea", true: "#34c759" }} thumbColor="#fff" ios_backgroundColor="#e9e9ea" />}
        >
          {seoEnabled ? (
            <>
              <View>
                <FieldLabel>SEO Title</FieldLabel>
                <TextInput value={seoTitle} onChangeText={setSeoTitle} placeholder="เช่น: ขมิ้นชันผง 100% ออร์แกนิก" placeholderTextColor="#a3a3a3" style={INPUT} />
              </View>
              <View>
                <FieldLabel>SEO Keywords</FieldLabel>
                <TextInput value={seoKeywords} onChangeText={setSeoKeywords} placeholder="คั่นด้วยเครื่องหมายจุลภาค (,)" placeholderTextColor="#a3a3a3" style={INPUT} />
              </View>
            </>
          ) : null}
        </Section>

        {/* ตั้งค่าสินค้า */}
        <Section Icon={Settings2} tint="#8b5cf6" title="ตั้งค่าสินค้า">
          <SettingCard Icon={Eye} label="เปิดขาย" subtitle="แสดงสินค้านี้บนหน้าร้านให้ลูกค้ามองเห็นและสั่งซื้อได้" value={active} onValueChange={setActive} accent={BRAND_GREEN} image={IMG_SELL} />
          {!isMaterial ? (
            <SettingCard Icon={Star} label="สินค้าแนะนำ" subtitle="ปักหมุดสินค้านี้ในส่วนแนะนำบนหน้าร้าน" value={recommended} onValueChange={setRecommended} accent="#f7931d" image={IMG_RECOMMEND} />
          ) : null}
        </Section>
      </ScrollView>
      {/* Scroll fades — content dissolves into the header / bottom edge */}
      <LinearGradient
        pointerEvents="none"
        colors={["#fafafa", "rgba(250,250,250,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
      />
      <BottomFade />
      </View>

      {/* Floating Liquid Glass save bar — same as the other create pages */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
        <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
          <GlassView glassEffectStyle="regular" colorScheme="light" style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
            <Pressable onPress={onSave} className="flex-row items-center justify-center active:opacity-90" style={{ flex: 1, height: 50, borderRadius: 999, gap: 8, backgroundColor: BRAND_GREEN }}>
              <Save size={17} color="#fff" strokeWidth={2.6} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{title}</Text>
            </Pressable>
          </GlassView>
        </View>
      </View>

    </View>
  );
}
