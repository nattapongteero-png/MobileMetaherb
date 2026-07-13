import { GLASS_BAR_TINT } from "../theme/tokens";
import { useState, useRef } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert, Modal, StyleSheet, Dimensions, type View as RNView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassSelect } from "../components/GlassSelect";
import { GlassDatePicker } from "../components/GlassDatePicker";
import { Chip } from "../components/Chip";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react-native";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import { useCart, type CartItem } from "../context/CartContext";
import { appWidth } from "../theme/layout";

// Route params are typed locally so the screen renders standalone before the
// route is registered. `id` -> single material PR; `ids` -> bulk (cart) PR seeded
// from the ticked cart lines; absent -> bulk PR with the demo seed.
type Params = { id?: string; ids?: string[] };

// Validity duration in red (#ff3b30) is reserved by the web for the "*" required
// markers + error text only; we mirror that and keep everything else brand-green.
const REQUIRED_RED = "#ff3b30";

const PRIORITIES = [
  { id: "Low", label: "Low — ปกติทั่วไป" },
  { id: "Normal", label: "Normal — มาตรฐาน" },
  { id: "High", label: "High — สำคัญ" },
  { id: "Urgent", label: "Urgent — เร่งด่วน" },
];

const VALIDITY_OPTIONS = [
  { value: "7", label: "7 วัน" },
  { value: "10", label: "10 วัน" },
  { value: "15", label: "15 วัน" },
  { value: "30", label: "30 วัน" },
  { value: "60", label: "60 วัน" },
];

type LineItem = {
  id: string;
  itemCode: string;
  erpItemCode: string;
  description: string;
  qty: number;
  uom: string;
  unitPrice: number;
  notes: string;
};

// Seeded line items — ported from the web buildInitial() over the first two
// MATERIALS entries (the web pulls these from the cart / a single material).
const INITIAL_LINE_ITEMS: LineItem[] = [
  {
    id: "init-m-1",
    itemCode: "M-1",
    erpItemCode: "",
    description: "ขมิ้นชันแห้ง (ผง)",
    qty: 25,
    uom: "กก.",
    unitPrice: 320,
    notes: "พรีเมียม · Curcuma longa",
  },
  {
    id: "init-m-3",
    itemCode: "M-3",
    erpItemCode: "",
    description: "ใบบัวบกแห้ง",
    qty: 10,
    uom: "กก.",
    unitPrice: 450,
    notes: "พรีเมียม · Centella asiatica",
  },
];

const baht = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---- Module-scope inputs (declared outside the screen so the TextInput is not
// remounted on every render — prevents focus loss while typing). ----

function PillInput(props: {
  value: string;
  onChangeText?: (s: string) => void;
  placeholder?: string;
  editable?: boolean;
  weight?: "400" | "600";
}) {
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      placeholder={props.placeholder}
      placeholderTextColor="#a3a3a3"
      editable={props.editable !== false}
      style={{
        backgroundColor: "#f5f5f5",
        height: 48,
        borderRadius: 999,
        paddingHorizontal: 18,
        fontSize: 14,
        color: props.editable === false ? TEXT_SECONDARY : "#374151",
        fontWeight: props.weight ?? "400",
      }}
    />
  );
}

function AreaInput(props: {
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      placeholder={props.placeholder}
      placeholderTextColor="#a3a3a3"
      multiline
      style={{
        backgroundColor: "#f5f5f5",
        minHeight: 88,
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 14,
        fontSize: 14,
        color: "#374151",
        textAlignVertical: "top",
      }}
    />
  );
}

function ErpInput(props: { value: string; onChangeText: (s: string) => void }) {
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      placeholder="เช่น ERP-12345"
      placeholderTextColor="#a3a3a3"
      autoCapitalize="characters"
      style={{
        backgroundColor: "#f5f5f5",
        height: 48,
        borderRadius: 999,
        paddingHorizontal: 18,
        fontSize: 14,
        color: "#374151",
      }}
    />
  );
}

// ---- Reusable presentational helpers ----

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500", marginBottom: 8 }}>
      {label}
      {required ? <Text style={{ color: REQUIRED_RED }}> *</Text> : null}
    </Text>
  );
}

// Anchored info tooltip for the Item Code ERP field — a small card that pops
// right under the ⓘ icon (web parity: the hover tooltip), NOT a centered dialog.
function ErpInfoTooltip() {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ x: 0, y: 0, h: 0 });
  const ref = useRef<RNView>(null);
  const screenW = appWidth();
  const cardW = Math.min(290, screenW - 32);

  const show = () => {
    ref.current?.measureInWindow((x, y, _w, h) => {
      setBox({ x, y, h });
      setOpen(true);
    });
  };

  const left = Math.max(16, Math.min(box.x - 10, screenW - cardW - 16));
  const top = box.y + box.h + 8;

  return (
    <>
      <Pressable ref={ref} onPress={show} hitSlop={10} className="active:opacity-50">
        <Info size={14} color="#9ca3af" strokeWidth={2.2} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View style={{ position: "absolute", left, top, width: cardW }}>
            <Pressable onPress={() => {}}>
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 14,
                  gap: 6,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: "rgba(0,0,0,0.06)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.16,
                  shadowRadius: 20,
                  elevation: 12,
                }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#1a1a1a" }}>Item Code ERP คืออะไร?</Text>
                <Text style={{ fontSize: 12, color: "#525252", lineHeight: 18 }}>
                  รหัสสินค้าในระบบ ERP ภายในของบริษัทคุณ (เช่น{" "}
                  <Text style={{ color: BRAND_GREEN, fontWeight: "700" }}>ERP-12345</Text>) — กรอกเพื่อให้ฝ่ายจัดซื้อเชื่อมโยงสินค้านี้กับสต็อก/บัญชีภายในได้ทันทีหลังอนุมัติ
                </Text>
                <Text style={{ fontSize: 11, fontStyle: "italic", color: "#a3a3a3", lineHeight: 16 }}>
                  ไม่บังคับกรอก — เว้นว่างได้ถ้ายังไม่มีรหัสในระบบ
                </Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a" }}>{children}</Text>
    </View>
  );
}

export function HerbalMarketPRScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const params = (route.params as Params) ?? {};
  const isBulk = !params.id;
  // Mirror the web: the success/back label points at wherever the PR was opened
  // from — the cart for a bulk PR, the material detail for a single-material PR.
  const backLabel = isBulk ? "กลับสู่ตะกร้า" : "กลับสู่รายละเอียดวัตถุดิบ";

  const insets = useSafeAreaInsets();
  const [submitted, setSubmitted] = useState(false);
  const [priority, setPriority] = useState("Normal");
  const [requiredDate, setRequiredDate] = useState("");
  const [validityDays, setValidityDays] = useState("15");
  const [description, setDescription] = useState("");
  const [justification, setJustification] = useState("");
  const { items } = useCart();
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    // Bulk PR seeds from the ticked cart lines (web buildInitial bulk branch).
    // Cart products aren't herbal materials → uom "ชิ้น" and unitPrice = cart price;
    // fall back to the demo materials when opened without a cart selection.
    const seeded = (params.ids ?? [])
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is CartItem => !!i)
      .map((i) => ({
        id: i.id,
        itemCode: i.id.toUpperCase(),
        erpItemCode: "",
        description: i.name,
        qty: i.quantity,
        uom: "ชิ้น",
        unitPrice: i.price,
        notes: i.option,
      }));
    return seeded.length ? seeded : INITIAL_LINE_ITEMS;
  });

  const updateErpCode = (id: string, value: string) =>
    setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, erpItemCode: value } : li)));

  const totalAmount = lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);
  const buddhistYear = new Date().getFullYear() + 543;
  const prNumber = `PR-${buddhistYear}-${1000 + (lineItems.length + priority.length) % 9000}`;
  const todayStr = new Date().toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const handleSubmit = () => {
    if (lineItems.length === 0) {
      Alert.alert("ยังเพิ่มรายการไม่ครบ", "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }
    if (!requiredDate.trim()) {
      Alert.alert("กรุณาเลือกวันที่ต้องการ", "ระบุวันที่ต้องการรับสินค้า (Required Date)");
      return;
    }
    if (!justification.trim()) {
      Alert.alert("กรุณาระบุเหตุผล", "เหตุผลในการขออนุมัติจัดซื้อ (Justification) จำเป็นต้องกรอก");
      return;
    }
    setSubmitted(true);
  };

  // ============== Success screen ==============
  if (submitted) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, paddingTop: 32, paddingBottom: 24, gap: 14, alignItems: "center" }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(49,151,84,0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle2 size={40} color={BRAND_GREEN} strokeWidth={2.2} />
          </View>

          <Text style={{ fontSize: 24, fontWeight: "600", color: BRAND_GREEN, textAlign: "center" }}>
            ส่งใบ PR เรียบร้อย!
          </Text>
          <Text style={{ fontSize: 14, color: TEXT_SECONDARY, textAlign: "center", lineHeight: 22 }}>
            หมายเลข <Text style={{ color: "#0a0a0a", fontWeight: "600" }}>{prNumber}</Text> ส่งให้ผู้อนุมัติแล้ว — สถานะใบ PR จะอัปเดตในหน้าจัดการเอกสาร
          </Text>

          <View
            style={{
              backgroundColor: "#fafaf7",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#ececed",
              padding: 16,
              alignSelf: "stretch",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: "600", marginBottom: 2 }}>
              ขั้นถัดไป
            </Text>
            {[
              "ผู้อนุมัติจะได้รับ Email + Notification ในระบบ",
              "เมื่ออนุมัติแล้ว PR จะแปลงเป็น PO อัตโนมัติ",
              'สามารถติดตามสถานะได้ที่หน้า "เอกสารของฉัน"',
            ].map((t) => (
              <View key={t} style={{ flexDirection: "row", gap: 8 }}>
                <CheckCircle2 size={16} color={BRAND_GREEN} strokeWidth={2.4} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontSize: 13, color: "#374151", lineHeight: 20 }}>{t}</Text>
              </View>
            ))}
          </View>

        </ScrollView>

        {/* Fixed bottom actions (web parity) — primary explore + secondary back,
            styled like PaymentSuccessScreen. */}
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

  // ============== Form ==============
  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <SubPageHeader
        title="ออกใบขอสั่งซื้อ (PR)"
        subtitle={`ออกวันที่ ${todayStr}`}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />
      <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        {/* Document meta — PR number / issue date / source, as a tidy header card.
            The purpose line now lives in the SubPageHeader subtitle, so no duplicate
            intro paragraph here. */}
        <View
          style={{
            backgroundColor: "#fff",
            marginTop: 8,
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 3 }}>
            <Text style={{ fontSize: 11, color: TEXT_MUTED }}>เลขที่ใบ PR</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a", letterSpacing: 0.2 }}>{prNumber}</Text>
          </View>
          <View
            style={{
              backgroundColor: "rgba(49,151,84,0.1)",
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 5,
            }}
          >
            <Text style={{ fontSize: 11, color: BRAND_GREEN, fontWeight: "700" }}>
              {isBulk ? "จากตะกร้า" : "วัตถุดิบเดี่ยว"}
            </Text>
          </View>
        </View>

        {/* === Card 1: PR Details (full-bleed white section, like PaymentScreen) === */}
        <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16, gap: 16 }}>
          {/* Priority (custom dropdown) */}
          <View>
            <FieldLabel label="Priority" required />
            <GlassSelect
              value={priority}
              options={PRIORITIES.map((p) => ({ key: p.id, label: p.label }))}
              onSelect={setPriority}
            />
          </View>

          {/* Required Date — glass calendar picker (no manual typing) */}
          <View>
            <FieldLabel label="Required Date" required />
            <GlassDatePicker value={requiredDate} onChange={setRequiredDate} placeholder="เลือกวันที่ต้องการรับสินค้า" />
          </View>

          {/* Total Amount (read-only) */}
          <View>
            <FieldLabel label="Total Amount" />
            <PillInput value={`฿${baht(totalAmount)}`} editable={false} weight="600" />
          </View>

          {/* Validity duration chips */}
          <View>
            <FieldLabel label="ระยะเวลาใบ PR (กำหนดยื่นเพื่ออนุมัติ)" required />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {VALIDITY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={validityDays === opt.value}
                  onPress={() => setValidityDays(opt.value)}
                  minWidth={72}
                />
              ))}
            </View>
          </View>

          {/* Description */}
          <View>
            <FieldLabel label="Description" />
            <AreaInput
              value={description}
              onChangeText={setDescription}
              placeholder="คำอธิบายเพิ่มเติม เช่น ใช้สำหรับสายการผลิต A ในเดือนหน้า..."
            />
          </View>

          {/* Justification */}
          <View>
            <FieldLabel label="Justification" required />
            <AreaInput
              value={justification}
              onChangeText={setJustification}
              placeholder="เหตุผลในการขออนุมัติจัดซื้อ (จำเป็น)"
            />
          </View>
        </View>

        {/* === Card 2: Line Items (full-bleed white section) === */}
        <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
          <SectionTitle>{`Line Items (${lineItems.length} รายการ)`}</SectionTitle>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <ClipboardList size={18} color={BRAND_GREEN} strokeWidth={2.2} />
            <Text style={{ flex: 1, fontSize: 12, color: TEXT_MUTED }}>
              รายการสินค้ามาจากตะกร้า — หากต้องการเพิ่ม/ลดสินค้า กรุณาแก้ไขในตะกร้าก่อน
            </Text>
          </View>

          {lineItems.length === 0 ? (
            <View style={{ paddingVertical: 28, alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 13, color: "#a3a3a3" }}>ไม่มีข้อมูล</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <AlertCircle size={13} color={REQUIRED_RED} strokeWidth={2.4} />
                <Text style={{ fontSize: 11, color: REQUIRED_RED }}>ต้องมีอย่างน้อย 1 รายการก่อนส่งใบ PR</Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: 12, marginTop: 8 }}>
              {lineItems.map((li, idx) => (
                <View
                  key={li.id}
                  style={{ borderWidth: 1, borderColor: "#ececed", borderRadius: 14, padding: 14, gap: 12 }}
                >
                  {/* Header: line number + name (+ notes) + item code */}
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        backgroundColor: "rgba(49,151,84,0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: BRAND_GREEN }}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a", lineHeight: 19 }}>{li.description}</Text>
                      {li.notes ? (
                        <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{li.notes}</Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 11, color: "#a3a3a3", marginTop: 4 }}>{li.itemCode}</Text>
                  </View>

                  {/* Qty / unit price / amount — three aligned columns */}
                  <View
                    style={{
                      flexDirection: "row",
                      backgroundColor: "#f7f7f7",
                      borderRadius: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10.5, color: TEXT_MUTED, marginBottom: 3 }}>จำนวน</Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }}>
                        {li.qty.toLocaleString()} {li.uom}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10.5, color: TEXT_MUTED, marginBottom: 3 }}>ราคา/หน่วย</Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }}>฿{baht(li.unitPrice)}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", justifyContent: "flex-start" }}>
                      <Text style={{ fontSize: 10.5, color: TEXT_MUTED, marginBottom: 3 }}>รวม</Text>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: BRAND_GREEN }}>฿{baht(li.qty * li.unitPrice)}</Text>
                    </View>
                  </View>

                  {/* ERP code input */}
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, color: "#374151", fontWeight: "500" }}>Item Code ERP</Text>
                      <ErpInfoTooltip />
                      <Text style={{ fontSize: 11, color: "#a3a3a3" }}>(ไม่บังคับ)</Text>
                    </View>
                    <ErpInput value={li.erpItemCode} onChangeText={(v) => updateErpCode(li.id, v)} />
                  </View>
                </View>
              ))}

              {/* Total row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 12,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>Total</Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: BRAND_GREEN }}>฿{baht(totalAmount)}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
        {/* Scroll-edge fades — content dissolves into the header / bottom bar as it
            scrolls, same as PaymentScreen. */}
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

      {/* Floating Liquid-Glass action bar — hovers above the bottom, matching the
          RFQ preview / Payment / Cart bars (Jakob's Law: one CTA pattern app-wide). */}
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
              tintColor={GLASS_BAR_TINT}
            style={{ borderRadius: 34, overflow: "hidden", flexDirection: "row", padding: 8 }}
          >
            <Pressable
              onPress={handleSubmit}
              className="items-center justify-center active:opacity-80"
              style={{ flex: 1, backgroundColor: BRAND_GREEN, borderRadius: 999, height: 50 }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>ส่งเพื่อขออนุมัติ</Text>
            </Pressable>
          </GlassView>
        </View>
      </View>
    </View>
  );
}
