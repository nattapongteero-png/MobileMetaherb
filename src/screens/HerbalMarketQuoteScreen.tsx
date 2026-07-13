import { useState, useEffect, type ReactNode } from "react";
import { View, Text, Image, Pressable, ScrollView, TextInput, Alert, Modal, Dimensions, ActivityIndicator, type DimensionValue } from "react-native";
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { GestureDetector, Gesture, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { Chip } from "../components/Chip";
import { GlassSelect } from "../components/GlassSelect";
import { GlassDatePicker } from "../components/GlassDatePicker";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootStack";
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
  Maximize2,
  type LucideIcon,
} from "lucide-react-native";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import { useCart } from "../context/CartContext";
import { createQuoteRequest } from "../store/quotes";
import { currentUserId } from "../store/session";
import { makeQuotePdf } from "../utils/quotePdf";

// Route params are typed locally — `id` → single-material RFQ; `ids` → bulk RFQ
// seeded from the ticked cart lines (grouped by supplier in the preview).
type Params = { id?: string; ids?: string[] };

// A quote row in bulk (from-cart) mode.
type QuoteItem = {
  id: string;
  name: string;
  image: number | { uri: string };
  supplier: string;
  unitPrice: number;
  quantity: number;
  option?: string;
};

// ── Mock data ported verbatim from the web HerbalMarketQuotePage / herbalMaterials ──
const UNITS = ["kg", "ตัน", "ลิตร", "ชิ้น"];
const CERT_OPTIONS = ["ทั่วไป", "Organic", "GAP", "GMP", "ISO", "HALAL"];

// Materials come from the canonical HerbalMarketScreen list (local photos) so
// the quote always matches the card/detail the user came from.
import { MATERIALS } from "./HerbalMarketScreen";
import { appWidth, isTablet } from "../theme/layout";

/** Resolve a local bundled image (require → number) or remote URL string. */
function imgSource(src: number | string | undefined): any {
  return typeof src === "number" ? src : { uri: src };
}

// Product thumbnails — larger on iPad (same treatment as the cart rows).
const MATERIAL_IMG = isTablet() ? 96 : 64; // single-material header row
const LINE_IMG = isTablet() ? 80 : 52; // bulk cart-line rows

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

// Full-bleed white section — same language as PaymentScreen / the PR form: spans
// edge-to-edge with inner horizontal padding, separated from the next by an 8px gap.
const SECTION = {
  backgroundColor: "#fff",
  marginTop: 8,
  paddingHorizontal: 16,
  paddingVertical: 16,
} as const;

const LOGO = require("../../assets/logo.png");

// The quotation is a LEGAL document — render it at this fixed width (≈ the web A4
// content width) using the web's exact font sizes / proportions, then uniformly
// scale the whole thing to fit the phone. Proportions + word positions stay 1:1
// with the web, just smaller.
const DOC_WIDTH = 820;

function ScaledDoc({ width, scale, children }: { width: number; scale: number; children: ReactNode }) {
  const [h, setH] = useState(0);
  const [open, setOpen] = useState(false);
  return (
    <View>
      {/* Fit-to-width thumbnail — tap to open the zoomable viewer. */}
      <Pressable onPress={() => setOpen(true)} className="active:opacity-90">
        <View style={{ width: width * scale, height: h ? h * scale : undefined, opacity: h ? 1 : 0, overflow: "hidden", alignSelf: "center" }}>
          <View
            onLayout={(e) => setH(e.nativeEvent.layout.height)}
            style={{ width, transformOrigin: "0% 0%", transform: [{ scale }] }}
          >
            {children}
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 8 }}>
          <Maximize2 size={13} color={TEXT_MUTED} strokeWidth={2.2} />
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>แตะเพื่อขยาย · ซูมอ่านได้</Text>
        </View>
      </Pressable>
      <DocZoomModal visible={open} onClose={() => setOpen(false)} width={width} fitScale={scale}>
        {children}
      </DocZoomModal>
    </View>
  );
}

// Full-screen zoomable document viewer: pinch to zoom, drag to pan, double-tap to
// reset. Renders the SAME document tree at its native width and transforms it.
function DocZoomModal({ visible, onClose, width, fitScale, children }: { visible: boolean; onClose: () => void; width: number; fitScale: number; children: ReactNode }) {
  const minS = fitScale;
  const maxS = Math.max(fitScale * 3, 2.2);
  const scale = useSharedValue(fitScale);
  const saved = useSharedValue(fitScale);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const stx = useSharedValue(0);
  const sty = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = fitScale;
      saved.value = fitScale;
      tx.value = 0;
      ty.value = 0;
      stx.value = 0;
      sty.value = 0;
    }
  }, [visible, fitScale, scale, saved, tx, ty, stx, sty]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(maxS, Math.max(minS, saved.value * e.scale));
    })
    .onEnd(() => {
      saved.value = scale.value;
    });
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = stx.value + e.translationX;
      ty.value = sty.value + e.translationY;
    })
    .onEnd(() => {
      stx.value = tx.value;
      sty.value = ty.value;
    });
  const dtap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withTiming(fitScale);
      saved.value = fitScale;
      tx.value = withTiming(0);
      ty.value = withTiming(0);
      stx.value = 0;
      sty.value = 0;
    });
  const gesture = Gesture.Simultaneous(pinch, pan, dtap);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
            {/* App bar — same SubPageHeader as the request page. */}
            <SubPageHeader title="ใบเสนอราคา / Quotation" onBack={onClose} showSearch={false} />
            <GestureDetector gesture={gesture}>
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <Animated.View style={[aStyle, { width }]}>{visible ? children : null}</Animated.View>
              </View>
            </GestureDetector>
            <SafeAreaView edges={["bottom"]} pointerEvents="none" style={{ alignItems: "center" }}>
              <Text style={{ color: "#8a8f8a", fontSize: 12, marginBottom: 10 }}>นิ้วถ่างเพื่อซูม · ลากเพื่อเลื่อน · แตะสองครั้งรีเซ็ต</Text>
            </SafeAreaView>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}

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
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { id, ids } = (route.params as Params) ?? {};
  const { items: cartItems } = useCart();

  // Two modes (web parity): `id` → single-material RFQ; absent → bulk RFQ from the
  // ticked cart lines. Single mode falls back to m-1 so it renders standalone.
  const isBulk = !id;
  const material = MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
  const backLabel = isBulk ? "กลับสู่ตะกร้า" : "กลับสู่รายละเอียดวัตถุดิบ";

  // Bulk: map each selected cart line to a quote row. Cart products aren't herbal
  // materials, so the unit price is the cart price and the unit shows as "ชิ้น".
  const quoteItems: QuoteItem[] = isBulk
    ? cartItems
        .filter((c) => (ids ?? []).length === 0 || (ids ?? []).includes(c.id))
        .map((c) => ({
          id: c.id,
          name: c.name,
          image: c.image,
          supplier: c.shop || "—",
          unitPrice: c.price,
          quantity: c.quantity,
          option: c.option,
        }))
    : [];

  // Selected items grouped by supplier — one quotation block per supplier (web parity).
  const supplierGroups: [string, QuoteItem[]][] = Array.from(
    quoteItems.reduce((m, q) => {
      const arr = m.get(q.supplier);
      if (arr) arr.push(q);
      else m.set(q.supplier, [q]);
      return m;
    }, new Map<string, QuoteItem[]>()),
  );

  const [previewMode, setPreviewMode] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  /**
   * Submit the RFQ. It used to only flip `submitted`, so the request the buyer
   * spent a form filling in reached neither the shop nor their own B2BDocs page.
   * One request per supplier — the shop console filters on `shopName`.
   */
  const submitRfq = () => {
    const company = { name: companyName.trim() || "-", taxId: taxId.trim(), address: companyAddress.trim() };
    const contact = {
      name: contactName.trim() || "-",
      position: position.trim() || undefined,
      phone: phone.trim(),
      email: email.trim(),
      poRef: poReference.trim() || undefined,
    };
    const common = {
      userId: currentUserId(),
      company,
      contact,
      certificate: certPref,
      neededBy: requiredBy.trim() || undefined,
      note: note.trim() || undefined,
    };

    if (isBulk) {
      for (const [supplier, items] of supplierGroups) {
        createQuoteRequest({
          ...common,
          shopName: supplier,
          items: items.map((it) => ({
            materialId: it.id,
            name: it.name,
            supplier,
            qty: it.quantity,
            unit: "ชิ้น",
            price: it.unitPrice,
            image: it.image,
          })),
        });
      }
    } else {
      createQuoteRequest({
        ...common,
        shopName: material.supplier,
        items: [
          {
            materialId: material.id,
            name: material.name,
            supplier: material.supplier,
            qty: qtyNum,
            unit,
            price: material.pricePerKg,
            image: material.image as number,
          },
        ],
      });
    }
    setSubmitted(true);
  };

  const rfqNumber = `RFQ-${new Date().getFullYear() + 543}-${String(
    (Math.abs(((companyName || "x") + email).split("").reduce((s, c) => s + c.charCodeAt(0), 0)) % 9000) + 1000,
  )}`;
  const todayStr = new Date().toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });

  const qtyNum = Number(qty) || 0;
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const docScale = (appWidth() - 32) / DOC_WIDTH;
  const insets = useSafeAreaInsets();

  // One quotation document per supplier in bulk mode (web parity: docs[]). Single
  // mode → one document. Each carries its own RFQ number (-01/-02) and own totals.
  type DocRow = { name: string; qty: number; unit: string; price: number };
  const docs: { supplier: string; rfqNumber: string; rows: DocRow[] }[] = isBulk
    ? supplierGroups.map(([supplier, items], i) => ({
        supplier,
        rfqNumber: `${rfqNumber}-${String(i + 1).padStart(2, "0")}`,
        rows: items.map((q) => ({
          name: q.option ? `${q.name} · ${q.option}` : q.name,
          qty: q.quantity,
          unit: "ชิ้น",
          price: q.unitPrice,
        })),
      }))
    : [
        {
          supplier: material.supplier,
          rfqNumber,
          rows: [{ name: materialDetail, qty: qtyNum, unit, price: material.pricePerKg }],
        },
      ];

  const handlePreview = () => {
    if (!companyName.trim()) return Alert.alert("กรุณากรอกชื่อบริษัท");
    if (!companyAddress.trim()) return Alert.alert("กรุณากรอกที่อยู่บริษัท");
    if (!contactName.trim()) return Alert.alert("กรุณากรอกชื่อผู้ติดต่อ");
    if (!email.trim()) return Alert.alert("กรุณากรอกอีเมล");
    if (isBulk) {
      if (quoteItems.length === 0)
        return Alert.alert("ไม่มีรายการ", "กรุณาเลือกสินค้าในตะกร้าก่อนขอใบเสนอราคา");
    } else {
      if (!materialDetail.trim()) return Alert.alert("กรุณาระบุวัตถุดิบ");
      if (qtyNum <= 0) return Alert.alert("กรุณาระบุปริมาณ");
    }
    if (!requiredBy.trim()) return Alert.alert("กรุณาระบุวันที่ต้องการ");
    setPreviewMode(true);
  };

  // Generate a real A4 PDF from the quotation and hand it to the iOS share/save sheet.
  // expo-print/expo-sharing are loaded lazily so the screen still works in Expo Go
  // (which doesn't bundle the ExpoPrint native module — that needs a dev build).
  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await makeQuotePdf({
        docs, isBulk, companyName, taxId, companyAddress, contactName, position, email, phone, poReference, todayStr, note, certPref, requiredBy,
      });
    } catch (e) {
      Alert.alert("สร้าง PDF ไม่สำเร็จ", String((e as Error)?.message ?? e));
    } finally {
      setDownloading(false);
    }
  };

  // ───────────────────── Success state ─────────────────────
  if (submitted) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, paddingTop: 32, paddingBottom: 24, gap: 14 }}
        >
          <View style={{ alignItems: "center" }}>
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

        </ScrollView>

        {/* Fixed bottom actions — primary explore + secondary back (like PR / Payment). */}
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fafafa" }}>
          <View style={{ padding: 16, gap: 8 }}>
            <Pressable
              onPress={() => nav.navigate("Main", { screen: "HerbalMarket" })}
              className="items-center justify-center active:opacity-80"
              style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, height: 52 }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>ไปยัง Herbal Market</Text>
            </Pressable>
            <Pressable
              onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate("Main", { screen: "HerbalMarket" }))}
              className="items-center justify-center active:opacity-70"
              style={{ height: 48 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: BRAND_GREEN }}>{backLabel}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ───────────────────── Preview (Quotation document) ─────────────────────
  if (previewMode) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        {/* App bar — same SubPageHeader as the request page; back returns to the form.
            Download lives here as a glass icon button (Fitts's Law: persistent,
            thumb-reachable top-right, doesn't compete with the primary CTA). */}
        <SubPageHeader
          title="ตัวอย่างใบเสนอราคา"
          subtitle="ตรวจทานก่อนส่ง RFQ"
          onBack={() => setPreviewMode(false)}
          showSearch={false}
          rightSlot={
            <GlassIconButton onPress={handleDownloadPdf} accessibilityLabel="ดาวน์โหลด PDF">
              {downloading ? (
                <ActivityIndicator size="small" color="#0088ff" />
              ) : (
                <Download size={20} color="#0088ff" strokeWidth={2.4} />
              )}
            </GlassIconButton>
          }
        />
        <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom, gap: 14 }}
        >

          {/* A4 quotation documents — one per supplier in bulk mode (web parity). */}
          {docs.map((doc, docIdx) => {
            const docSum = doc.rows.reduce((s, r) => s + r.qty * r.price, 0);
            const docBeforeVat = (docSum * 100) / 107;
            const docVat = (docSum * 7) / 107;
            return (
              <ScaledDoc key={doc.rfqNumber} width={DOC_WIDTH} scale={docScale}>
                <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#ececed", borderRadius: 16, width: DOC_WIDTH, padding: 32 }}>
                  {/* Header — logo + company info (right) */}
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                    <Image source={LOGO} style={{ width: 56, height: 56 }} resizeMode="contain" />
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>บริษัท เมต้าเฮิร์บ จำกัด</Text>
                      <Text style={{ fontSize: 11, color: "#000", textAlign: "right", lineHeight: 16 }}>
                        เลขที่ 459/153 ถนนสุขสวัสดิ์ แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140
                      </Text>
                      <Text style={{ fontSize: 11, color: "#000" }}>โทรศัพท์ 061-4213111</Text>
                      <Text style={{ fontSize: 11, color: "#000" }}>เลขประจำตัวผู้เสียภาษี: 0105565148242</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#000", textAlign: "center", marginTop: 12, marginBottom: isBulk && docs.length > 1 ? 4 : 8 }}>
                    ใบเสนอราคา/Quotation
                  </Text>
                  {isBulk && docs.length > 1 ? (
                    <Text style={{ fontSize: 11, color: "#525252", textAlign: "center", marginBottom: 8 }}>
                      ใบที่ {docIdx + 1} / {docs.length} · จาก Supplier:{" "}
                      <Text style={{ fontWeight: "600", color: "#000" }}>{doc.supplier}</Text>
                    </Text>
                  ) : null}

                  {/* Customer + doc meta (4-column grid, web parity) */}
                  <View>
                    <MetaGridRow k1="เรียน :" v1={companyName || "—"} v1Bold k2="เลขที่ :" v2={doc.rfqNumber} />
                    <MetaGridRow
                      k1="ที่อยู่ :"
                      v1={`${companyAddress || "—"}${taxId ? `\nเลขประจำตัวผู้เสียภาษี: ${taxId}` : ""}`}
                      k2="วันที่ :"
                      v2={todayStr}
                    />
                    <MetaGridRow k1="ผู้ติดต่อ:" v1={`${contactName}${position ? ` (${position})` : ""}`} k2="อ้างถึง :" v2={poReference || "30"} />
                    <MetaGridRow k1="อีเมล์:" v1={email} k2="กำหนดยื่นราคา(วัน) :" v2="30" />
                    <MetaGridRow k1="โทรศัพท์:" v1={phone} k2="" v2="" />
                  </View>

                  <Text style={{ fontSize: 12, color: "#000", textAlign: "center", marginTop: 12, marginBottom: 8, lineHeight: 18 }}>
                    ทาง<Text style={{ fontWeight: "600" }}>{doc.supplier}</Text> (ผ่านแพลตฟอร์ม Metaherb) มีความยินดีขอเสนอราคาดังรายการต่อไปนี้
                  </Text>

                  {/* Items table */}
                  <DocTable rows={doc.rows} fmt={fmt} />

                  {/* Notes (left) + Totals box (right) */}
                  <View style={{ flexDirection: "row", marginTop: 4 }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#000" }}>หมายเหตุ :</Text>
                      {note ? <Text style={{ fontSize: 11, color: "#000", marginTop: 3, lineHeight: 16 }}>{note}</Text> : null}
                      <Text style={{ fontSize: 11, color: "#000", marginTop: 6, lineHeight: 16 }}>
                        <Text style={{ fontWeight: "600" }}>เงื่อนไขการชำระเงิน:</Text> เช็คสั่งจ่าย หรือ การโอน บัญชีธนาคารกรุงไทย ชื่อบัญชีบริษัท เมต้าเฮิร์บ จำกัด เลขที่บัญชี 173-074649-7 โปรดชำระในวันรับสินค้าหรือชำระก่อนวันรับสินค้า
                      </Text>
                      {certPref !== "ทั่วไป" || requiredBy ? (
                        <Text style={{ fontSize: 11, color: "#374151", marginTop: 6, lineHeight: 16 }}>
                          {certPref !== "ทั่วไป" ? (
                            <>เกรด/Certificate: <Text style={{ fontWeight: "600", color: "#000" }}>{certPref}</Text></>
                          ) : null}
                          {certPref !== "ทั่วไป" && requiredBy ? " · " : ""}
                          {requiredBy ? (
                            <>ต้องการภายใน: <Text style={{ fontWeight: "600", color: "#000" }}>{requiredBy}</Text></>
                          ) : null}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ width: 300, borderWidth: 1, borderColor: "#000" }}>
                      {[
                        ["ยอดรวม", fmt(docSum)],
                        ["ราคาก่อนภาษีมูลค่าเพิ่ม 7%", fmt(docBeforeVat)],
                        ["ภาษีมูลค่าเพิ่ม 7%", fmt(docVat)],
                        ["รวมราคาสินค้าหลังหักส่วนลด", fmt(docSum)],
                      ].map(([k, v]) => (
                        <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderColor: "#000", paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11, fontWeight: "600", color: "#000", flex: 1 }}>{k}</Text>
                          <Text style={{ fontSize: 11, color: "#000" }}>{v}</Text>
                        </View>
                      ))}
                      <Text style={{ fontSize: 11, fontStyle: "italic", color: "#000", textAlign: "center", paddingHorizontal: 8, paddingVertical: 4 }}>
                        {thaiBahtText(docSum)}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 11, color: "#000", marginTop: 12, lineHeight: 16 }}>
                    *หากท่านลงนามหรือประทับตราหน่วยบริการตามที่บริษัท เมต้าเฮิร์บ จำกัด ได้นำเสนอในใบเสนอราคาฉบับนี้แล้ว ทางบริษัทจะนับใบเสนอราคาฉบับนี้คือเอกสารยืนยันการสั่งซื้อ โดยทันที
                  </Text>

                  {/* Signature blocks */}
                  <View style={{ flexDirection: "row", marginTop: 8 }}>
                    <View style={{ flex: 1, borderWidth: 1, borderColor: "#000", padding: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#000", textAlign: "center" }}>สำหรับ ลูกค้า</Text>
                      <Text style={{ fontSize: 11, color: "#000", textAlign: "center", marginTop: 2 }}>กรุณาลงนามและประทับตราหน่วยบริการ</Text>
                      <Text style={{ fontSize: 11, color: "#000", textAlign: "center" }}>เพื่อยืนยันการสั่งซื้อ</Text>
                      <View style={{ marginTop: 22, gap: 18 }}>
                        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
                          <Text style={{ fontSize: 11, color: "#000" }}>ลงนาม:</Text>
                          <DocSigLine />
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
                          <Text style={{ fontSize: 11, color: "#000" }}>ตำแหน่ง :</Text>
                          <DocSigLine />
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 6 }}>
                          <Text style={{ fontSize: 11, color: "#000" }}>วันที่</Text>
                          <DocSigLine width={36} />
                          <Text style={{ fontSize: 11, color: "#000" }}>/</Text>
                          <DocSigLine width={36} />
                          <Text style={{ fontSize: 11, color: "#000" }}>/</Text>
                          <DocSigLine width={52} />
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: "#000", marginTop: 16 }}>ประทับตราบริการหน่วย (ถ้ามี)</Text>
                      <View style={{ marginTop: 20 }}>
                        <DocSigLine />
                      </View>
                    </View>
                    <View style={{ flex: 1, borderWidth: 1, borderLeftWidth: 0, borderColor: "#000", padding: 10, alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#000", textAlign: "center" }}>จึงเรียนมาเพื่อโปรดพิจารณา</Text>
                      <View style={{ minHeight: 100 }} />
                      <View style={{ alignItems: "center" }}>
                        <Text style={{ fontSize: 11, color: "#000" }}>........................................................</Text>
                        <Text style={{ fontSize: 11, color: "#000" }}>(นายอรรถพล อุทัยเรือง)</Text>
                        <Text style={{ fontSize: 11, color: "#000" }}>ผู้เสนอราคา</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={{ fontSize: 10, color: "#000", marginTop: 8, lineHeight: 14 }}>
                    ** กรุณาลงลายมือชื่อเพื่อยืนยันใบเสนอราคาดังกล่าวและ Email : mataherb.herb@gmail.com
                  </Text>
                </View>
              </ScaledDoc>
            );
          })}
        </ScrollView>
          {/* Scroll-edge fades — content dissolves into the header / bottom bar. */}
          <LinearGradient
            pointerEvents="none"
            colors={["#fafafa", "rgba(250,250,250,0)"]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 24 }}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(250,250,250,0)", "#fafafa"]}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 24 }}
          />
        </View>

        {/* Floating Liquid-Glass action bar — hovers above the bottom (like Payment / Cart). */}
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 18 }}
        >
          <View
            style={{
              borderRadius: 34,
              shadowColor: "#0a3d22",
              shadowOffset: { width: 0, height: 9 },
              shadowOpacity: 0.18,
              shadowRadius: 16,
              elevation: 14,
            }}
          >
            <GlassView
              glassEffectStyle="regular"
              colorScheme="light"
              style={{ borderRadius: 34, overflow: "hidden", flexDirection: "row", padding: 8 }}
            >
              <Pressable
                onPress={submitRfq}
                className="items-center justify-center active:opacity-80"
                style={{ flex: 1, backgroundColor: BRAND_GREEN, borderRadius: 999, height: 50 }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>ส่ง RFQ ใน ERP</Text>
              </Pressable>
            </GlassView>
          </View>
        </View>
      </View>
    );
  }

  // ───────────────────── Form ─────────────────────
  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <SubPageHeader
        title="ขอใบเสนอราคา"
        subtitle="รับ quote หลายเจ้าใน 24 ชม."
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />
      <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Single mode: the material being quoted. Bulk mode: the selected cart lines. */}
        {!isBulk ? (
          <View style={{ ...SECTION, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: MATERIAL_IMG, height: MATERIAL_IMG, borderRadius: 10, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
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
        ) : (
          <View style={SECTION}>
            <SectionHeader Icon={Package} title={`รายการสินค้า (${quoteItems.length})`} sub="มาจากตะกร้า — แก้ไขจำนวนได้ในตะกร้า" />
            <View style={{ gap: 16 }}>
              {quoteItems.map((q) => (
                <View key={q.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: LINE_IMG, height: LINE_IMG, borderRadius: 12, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
                    <Image source={q.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }} numberOfLines={1}>
                      {q.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: TEXT_MUTED }} numberOfLines={1}>
                      {q.option ? `${q.option} · ` : ""}{q.supplier}
                    </Text>
                    <Text style={{ fontSize: 12, color: TEXT_SECONDARY }}>
                      จำนวน {q.quantity} · ฿{q.unitPrice.toLocaleString()}/หน่วย
                    </Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: BRAND_GREEN }}>
                    ฿{(q.unitPrice * q.quantity).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Company info */}
        <View style={SECTION}>
          <SectionHeader Icon={Building2} title="ข้อมูลบริษัท" sub="ใช้สำหรับออกใบเสนอราคาและใบกำกับภาษี" />
          <View style={{ gap: 14 }}>
            <LabeledField label="ชื่อบริษัท / นิติบุคคล" required value={companyName} onChangeText={setCompanyName} placeholder="เช่น บริษัท เฮอร์บาแบรนด์ จำกัด" />
            <LabeledField label="เลขประจำตัวผู้เสียภาษี" value={taxId} onChangeText={setTaxId} placeholder="13 หลัก" keyboardType="phone-pad" />
            <MultilineField label="ที่อยู่บริษัท" required value={companyAddress} onChangeText={setCompanyAddress} placeholder="เลขที่ / ซอย / ถนน / ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์" />
          </View>
        </View>

        {/* Contact */}
        <View style={SECTION}>
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
        <View style={SECTION}>
          <SectionHeader
            Icon={ClipboardList}
            title={isBulk ? "เงื่อนไขการขอราคา" : "รายละเอียดวัตถุดิบ"}
            sub={isBulk ? "เงื่อนไขนี้ใช้กับทุกรายการที่เลือก" : "ระบุละเอียดเท่าไหร่ ยิ่งได้ quote แม่นยำขึ้น"}
          />
          <View style={{ gap: 14 }}>
            {!isBulk ? (
              <>
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
                    <GlassSelect value={unit} options={UNITS.map((u) => ({ key: u, label: u }))} onSelect={setUnit} />
                  </View>
                </View>
              </>
            ) : null}

            {/* Cert preference pills */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151" }}>เกรด / Certificate ที่ต้องการ</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {CERT_OPTIONS.map((c) => (
                  <Chip key={c} label={c} active={certPref === c} onPress={() => setCertPref(c)} />
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151" }}>
                ต้องการภายใน <Text style={{ color: "#ff3b30" }}>*</Text>
              </Text>
              <GlassDatePicker value={requiredBy} onChange={setRequiredBy} placeholder="เลือกวันที่ต้องการ" />
            </View>

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
        {/* Scroll-edge fades — content dissolves into the header / bottom bar (like PR). */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 24 }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(250,250,250,0)", "#fafafa"]}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 24 }}
        />
      </View>

      {/* Floating Liquid Glass action bar — same as the other create pages
          (Fitts's Law: full-width pill anchored at thumb reach). */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
        <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
          <GlassView glassEffectStyle="regular" colorScheme="light" style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
            <Pressable
              onPress={handlePreview}
              className="flex-row items-center justify-center active:opacity-90"
              style={{ flex: 1, height: 50, borderRadius: 999, gap: 8, backgroundColor: BRAND_GREEN }}
            >
              <ClipboardList size={17} color="#fff" strokeWidth={2.6} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                ดูตัวอย่างใบขอเสนอราคา{isBulk ? ` (${quoteItems.length} รายการ)` : ""}
              </Text>
            </Pressable>
          </GlassView>
        </View>
      </View>
    </View>
  );
}

// Amount → Thai baht text (ported verbatim from the web quotation document — legal).
function thaiBahtText(amount: number): string {
  if (!isFinite(amount) || amount === 0) return "ศูนย์บาทถ้วน";
  const digits = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
  const readChunk = (numStr: string): string => {
    let s = "";
    const len = numStr.length;
    for (let i = 0; i < len; i++) {
      const d = parseInt(numStr.charAt(i), 10);
      const pos = len - i - 1;
      if (d === 0) continue;
      if (pos === 0 && d === 1 && len > 1) s += "เอ็ด";
      else if (pos === 1 && d === 2) s += "ยี่" + positions[pos];
      else if (pos === 1 && d === 1) s += positions[pos];
      else s += digits[d] + positions[pos];
    }
    return s;
  };
  const rounded = Math.round(amount * 100) / 100;
  const baht = Math.floor(rounded);
  const satang = Math.round((rounded - baht) * 100);
  let result = "";
  if (baht >= 1000000) {
    const millions = Math.floor(baht / 1000000);
    const rest = baht % 1000000;
    result += readChunk(String(millions)) + "ล้าน";
    if (rest > 0) result += readChunk(String(rest).padStart(6, "0").replace(/^0+/, ""));
  } else {
    result += readChunk(String(baht));
  }
  result += "บาท";
  if (satang === 0) result += "ถ้วน";
  else result += readChunk(String(satang)) + "สตางค์";
  return result;
}

// Build a printable A4 HTML of the quotation (one page per supplier) for expo-print.
function buildQuoteHtml(args: {
  docs: { supplier: string; rfqNumber: string; rows: { name: string; qty: number; unit: string; price: number }[] }[];
  isBulk: boolean;
  companyName: string; taxId: string; companyAddress: string;
  contactName: string; position: string; email: string; phone: string; poReference: string;
  todayStr: string; note: string; certPref: string; requiredBy: string;
}): string {
  const { docs, isBulk, companyName, taxId, companyAddress, contactName, position, email, phone, poReference, todayStr, note, certPref, requiredBy } = args;
  const f = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pages = docs.map((doc, docIdx) => {
    const sum = doc.rows.reduce((s, r) => s + r.qty * r.price, 0);
    const beforeVat = (sum * 100) / 107;
    const vat = (sum * 7) / 107;
    const rows = doc.rows
      .map((r, i) => `<tr><td class="c">${i + 1}</td><td>${esc(r.name)}</td><td class="c">${r.qty}</td><td class="c">${esc(r.unit)}</td><td class="r">${f(r.price)}</td><td class="r">${f(r.qty * r.price)}</td></tr>`)
      .join("");
    const empties = Array.from({ length: Math.max(0, 7 - doc.rows.length) })
      .map(() => `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`)
      .join("");
    const banner = isBulk && docs.length > 1 ? `<div class="banner">ใบที่ ${docIdx + 1} / ${docs.length} · จาก Supplier: <b>${esc(doc.supplier)}</b></div>` : "";
    const cert = certPref !== "ทั่วไป" || requiredBy
      ? `<div class="cert">${certPref !== "ทั่วไป" ? `เกรด/Certificate: <b>${esc(certPref)}</b>` : ""}${certPref !== "ทั่วไป" && requiredBy ? " · " : ""}${requiredBy ? `ต้องการภายใน: <b>${esc(requiredBy)}</b>` : ""}</div>`
      : "";
    return `<div class="page">
      <div class="company"><div class="cname">บริษัท เมต้าเฮิร์บ จำกัด</div>
        <div>เลขที่ 459/153 ถนนสุขสวัสดิ์ แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140</div>
        <div>โทรศัพท์ 061-4213111</div><div>เลขประจำตัวผู้เสียภาษี: 0105565148242</div></div>
      <div class="title">ใบเสนอราคา/Quotation</div>${banner}
      <table class="meta">
        <tr><td class="lbl">เรียน :</td><td><b>${esc(companyName || "—")}</b></td><td class="lbl">เลขที่ :</td><td>${esc(doc.rfqNumber)}</td></tr>
        <tr><td class="lbl">ที่อยู่ :</td><td>${esc(companyAddress || "—")}${taxId ? `<br><span class="sm">เลขประจำตัวผู้เสียภาษี: ${esc(taxId)}</span>` : ""}</td><td class="lbl">วันที่ :</td><td>${esc(todayStr)}</td></tr>
        <tr><td class="lbl">ผู้ติดต่อ:</td><td>${esc(contactName)}${position ? ` (${esc(position)})` : ""}</td><td class="lbl">อ้างถึง :</td><td>${esc(poReference || "30")}</td></tr>
        <tr><td class="lbl">อีเมล์:</td><td>${esc(email)}</td><td class="lbl sm">กำหนดยื่นราคา(วัน) :</td><td>30</td></tr>
        <tr><td class="lbl">โทรศัพท์:</td><td>${esc(phone)}</td><td></td><td></td></tr>
      </table>
      <div class="intro">ทาง<b>${esc(doc.supplier)}</b> (ผ่านแพลตฟอร์ม Metaherb) มีความยินดีขอเสนอราคาดังรายการต่อไปนี้</div>
      <table class="items"><thead><tr><th style="width:8%">ลำดับ</th><th>รายการ</th><th style="width:9%">จำนวน</th><th style="width:11%">หน่วยนับ</th><th style="width:14%">ราคาต่อหน่วย</th><th style="width:16%">ราคารวม(บาท)</th></tr></thead><tbody>${rows}${empties}</tbody></table>
      <div class="bottom">
        <div class="notes"><div><b>หมายเหตุ :</b></div>${note ? `<div>${esc(note)}</div>` : ""}<div class="terms"><b>เงื่อนไขการชำระเงิน:</b> เช็คสั่งจ่าย หรือ การโอน บัญชีธนาคารกรุงไทย ชื่อบัญชีบริษัท เมต้าเฮิร์บ จำกัด เลขที่บัญชี 173-074649-7 โปรดชำระในวันรับสินค้าหรือชำระก่อนวันรับสินค้า</div>${cert}</div>
        <table class="totals">
          <tr><td><b>ยอดรวม</b></td><td class="r">${f(sum)}</td></tr>
          <tr><td><b>ราคาก่อนภาษีมูลค่าเพิ่ม 7%</b></td><td class="r">${f(beforeVat)}</td></tr>
          <tr><td><b>ภาษีมูลค่าเพิ่ม 7%</b></td><td class="r">${f(vat)}</td></tr>
          <tr><td><b>รวมราคาสินค้าหลังหักส่วนลด</b></td><td class="r">${f(sum)}</td></tr>
          <tr><td colspan="2" class="baht">${esc(thaiBahtText(sum))}</td></tr>
        </table>
      </div>
      <div class="legal">*หากท่านลงนามหรือประทับตราหน่วยบริการตามที่บริษัท เมต้าเฮิร์บ จำกัด ได้นำเสนอในใบเสนอราคาฉบับนี้แล้ว ทางบริษัทจะนับใบเสนอราคาฉบับนี้คือเอกสารยืนยันการสั่งซื้อ โดยทันที</div>
      <div class="sign">
        <div class="sbox"><div class="sc"><b>สำหรับ ลูกค้า</b></div><div class="sc">กรุณาลงนามและประทับตราหน่วยบริการ</div><div class="sc">เพื่อยืนยันการสั่งซื้อ</div>
          <div class="sl">ลงนาม: ...........................................</div><div class="sl">ตำแหน่ง : .......................................</div><div class="sl sc">วันที่ ....... / ....... / ..........</div><div class="sl">ประทับตราบริการหน่วย (ถ้ามี)</div><div class="sl">............................................................</div></div>
        <div class="sbox sbox2"><div class="sc"><b>จึงเรียนมาเพื่อโปรดพิจารณา</b></div><div class="signer"><div>........................................................</div><div>(นายอรรถพล อุทัยเรือง)</div><div>ผู้เสนอราคา</div></div></div>
      </div>
      <div class="foot">** กรุณาลงลายมือชื่อเพื่อยืนยันใบเสนอราคาดังกล่าวและ Email : mataherb.herb@gmail.com</div>
    </div>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;font-family:'Sarabun','Helvetica',sans-serif;color:#000;}
    @page{size:A4;margin:14mm;} body{margin:0;font-size:11px;}
    .page{page-break-after:always;} .page:last-child{page-break-after:auto;}
    .company{text-align:right;} .cname{font-size:15px;font-weight:700;} .company div{font-size:10px;line-height:1.35;}
    .title{text-align:center;font-size:16px;font-weight:700;margin:8px 0 4px;}
    .banner{text-align:center;font-size:10px;color:#555;margin-bottom:6px;}
    .meta{width:100%;border-collapse:collapse;font-size:11px;} .meta td{padding:1px 4px;vertical-align:top;} .meta .lbl{font-weight:600;white-space:nowrap;} .meta .sm{font-size:9px;}
    .intro{text-align:center;font-size:11px;margin:8px 0 6px;}
    .items{width:100%;border-collapse:collapse;font-size:10.5px;} .items th,.items td{border:0.6px solid #000;padding:3px 4px;} .items th{text-align:center;font-weight:700;} .items td.c{text-align:center;} .items td.r{text-align:right;}
    .bottom{display:flex;margin-top:4px;gap:8px;} .notes{flex:1;font-size:10.5px;} .notes .terms{margin-top:6px;line-height:1.4;} .notes .cert{margin-top:6px;color:#333;}
    .totals{width:280px;border-collapse:collapse;border:0.6px solid #000;font-size:10.5px;} .totals td{border-bottom:0.6px solid #000;padding:2px 6px;} .totals td.r{text-align:right;} .totals .baht{text-align:center;font-style:italic;}
    .legal{font-size:10.5px;margin-top:10px;line-height:1.4;}
    .sign{display:flex;margin-top:8px;} .sbox{flex:1;border:0.6px solid #000;padding:8px;font-size:10.5px;} .sbox2{border-left:0;text-align:center;} .sc{text-align:center;} .sl{margin-top:13px;} .signer{margin-top:56px;}
    .foot{font-size:9px;margin-top:8px;}
  </style></head><body>${pages}</body></html>`;
}

// 4-column meta grid row (label / value / label / value) — quotation header (web parity).
function MetaGridRow({ k1, v1, v1Bold, k2, v2 }: { k1: string; v1: string; v1Bold?: boolean; k2: string; v2: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 4 }}>
      <Text style={{ width: 80, fontSize: 12, fontWeight: "600", color: "#000" }}>{k1}</Text>
      <Text style={{ flex: 1, fontSize: 12, fontWeight: v1Bold ? "700" : "400", color: "#000", lineHeight: 17 }}>{v1}</Text>
      <Text style={{ width: 120, fontSize: 11, fontWeight: "600", color: "#000", paddingRight: 6 }}>{k2}</Text>
      <Text style={{ width: 120, fontSize: 12, color: "#000" }}>{v2}</Text>
    </View>
  );
}

// One cell of the quotation items table.
function DocCell({ w, flex, bold, align = "center", children }: { w?: DimensionValue; flex?: boolean; bold?: boolean; align?: "left" | "center" | "right"; children: string | number }) {
  return (
    <View style={{ width: w, flex: flex ? 1 : undefined, borderRightWidth: 1, borderColor: "#000", paddingHorizontal: 4, paddingVertical: 4, justifyContent: "center" }}>
      <Text style={{ fontSize: 11, color: "#000", fontWeight: bold ? "700" : "400", textAlign: align }}>
        {children}
      </Text>
    </View>
  );
}

// Bordered 6-column items table (+ empty rows padded to 7) — matches the web document.
function DocTable({ rows, fmt }: { rows: { name: string; qty: number; unit: string; price: number }[]; fmt: (n: number) => string }) {
  // Column widths as PERCENTAGES, matching the web colgroup (10/flex/10/12/14/16)
  // so proportions are identical at any scale.
  const rowStyle = { flexDirection: "row" as const, borderBottomWidth: 1, borderColor: "#000" };
  return (
    <View style={{ borderTopWidth: 1, borderLeftWidth: 1, borderColor: "#000" }}>
      <View style={rowStyle}>
        <DocCell w="10%" bold>ลำดับ</DocCell>
        <DocCell flex bold>รายการ</DocCell>
        <DocCell w="10%" bold>จำนวน</DocCell>
        <DocCell w="12%" bold>หน่วยนับ</DocCell>
        <DocCell w="14%" bold>ราคาต่อหน่วย</DocCell>
        <DocCell w="16%" bold>ราคารวม(บาท)</DocCell>
      </View>
      {rows.map((row, i) => (
        <View key={i} style={rowStyle}>
          <DocCell w="10%">{i + 1}</DocCell>
          <DocCell flex align="left">{row.name}</DocCell>
          <DocCell w="10%">{row.qty}</DocCell>
          <DocCell w="12%">{row.unit}</DocCell>
          <DocCell w="14%" align="right">{fmt(row.price)}</DocCell>
          <DocCell w="16%" align="right">{fmt(row.qty * row.price)}</DocCell>
        </View>
      ))}
      {Array.from({ length: Math.max(0, 7 - rows.length) }).map((_, i) => (
        <View key={`e${i}`} style={[rowStyle, { minHeight: 26 }]}>
          <DocCell w="10%">{" "}</DocCell>
          <DocCell flex>{" "}</DocCell>
          <DocCell w="10%">{" "}</DocCell>
          <DocCell w="12%">{" "}</DocCell>
          <DocCell w="14%">{" "}</DocCell>
          <DocCell w="16%">{" "}</DocCell>
        </View>
      ))}
    </View>
  );
}

// Signature underline (dotted, matching the web document).
function DocSigLine({ width }: { width?: number }) {
  return <View style={{ width, flex: width ? undefined : 1, borderBottomWidth: 1, borderStyle: "dotted", borderColor: "#000", height: 15 }} />;
}
