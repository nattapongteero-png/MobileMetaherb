import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ChevronDown,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react-native";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

// Route params are typed locally so the screen renders standalone before the
// route is registered. `id` -> single material PR; absent -> bulk (cart) PR.
type Params = { id?: string };

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
        height: 40,
        borderRadius: 999,
        paddingHorizontal: 14,
        fontSize: 13,
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

function SectionTitle({ children }: { children: string }) {
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: "#ececed", paddingBottom: 10, marginBottom: 14 }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a" }}>{children}</Text>
    </View>
  );
}

export function HerbalMarketPRScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const params = (route.params as Params) ?? {};
  const isBulk = !params.id;

  const [submitted, setSubmitted] = useState(false);
  const [priority, setPriority] = useState("Normal");
  const [showPriority, setShowPriority] = useState(false);
  const [requiredDate, setRequiredDate] = useState("");
  const [validityDays, setValidityDays] = useState("15");
  const [description, setDescription] = useState("");
  const [justification, setJustification] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>(INITIAL_LINE_ITEMS);

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

  const priorityLabel = PRIORITIES.find((p) => p.id === priority)?.label ?? priority;

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
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14, alignItems: "center", justifyContent: "center", flexGrow: 1 }}
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

          <Pressable
            onPress={() => (nav.canGoBack() ? nav.goBack() : undefined)}
            className="items-center justify-center active:opacity-80"
            style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, height: 48, alignSelf: "stretch" }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>กลับสู่ Herbal Market</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ============== Form ==============
  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
      >
        {/* Hero intro */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, color: TEXT_SECONDARY, lineHeight: 20 }}>
            กรอกข้อมูลใบ PR เพื่อขออนุมัติการจัดซื้อ — หลังจากผู้อนุมัติอนุมัติแล้ว ระบบจะแปลงเป็น PO อัตโนมัติ
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <Text style={{ fontSize: 12, color: TEXT_MUTED }}>เลขที่ PR</Text>
            <View
              style={{
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#ececed",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: "#0a0a0a", fontWeight: "600" }}>{prNumber}</Text>
            </View>
            <Text style={{ fontSize: 12, color: "#a3a3a3" }}>· {todayStr}</Text>
            <View
              style={{
                marginLeft: "auto",
                backgroundColor: "rgba(49,151,84,0.1)",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 11, color: BRAND_GREEN, fontWeight: "600" }}>
                {isBulk ? "จากตะกร้า" : "วัตถุดิบเดี่ยว"}
              </Text>
            </View>
          </View>
        </View>

        {/* === Card 1: PR Details === */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16, gap: 16 }}>
          {/* Priority (custom dropdown) */}
          <View>
            <FieldLabel label="Priority" required />
            <Pressable
              onPress={() => setShowPriority((v) => !v)}
              className="active:opacity-80"
              style={{
                backgroundColor: "#f5f5f5",
                height: 48,
                borderRadius: 999,
                paddingHorizontal: 18,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 14, color: "#374151" }}>{priorityLabel}</Text>
              <ChevronDown size={18} color="#9ca3af" strokeWidth={2.2} />
            </Pressable>
            {showPriority ? (
              <View
                style={{
                  marginTop: 8,
                  backgroundColor: "#fff",
                  borderWidth: 1,
                  borderColor: "#ececed",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                {PRIORITIES.map((p, i) => {
                  const active = p.id === priority;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        setPriority(p.id);
                        setShowPriority(false);
                      }}
                      className="active:opacity-70"
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: "#f0f0f0",
                        backgroundColor: active ? "rgba(49,151,84,0.08)" : "#fff",
                      }}
                    >
                      <Text style={{ fontSize: 14, color: active ? BRAND_GREEN : "#374151", fontWeight: active ? "600" : "400" }}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          {/* Required Date */}
          <View>
            <FieldLabel label="Required Date" required />
            <PillInput value={requiredDate} onChangeText={setRequiredDate} placeholder="วว/ดด/ปปปป" />
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
              {VALIDITY_OPTIONS.map((opt) => {
                const active = validityDays === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setValidityDays(opt.value)}
                    className="active:opacity-80"
                    style={{
                      height: 40,
                      minWidth: 76,
                      paddingHorizontal: 18,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? BRAND_GREEN : "#f5f5f5",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
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

        {/* === Card 2: Line Items === */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16 }}>
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
              {lineItems.map((li) => (
                <View
                  key={li.id}
                  style={{ borderWidth: 1, borderColor: "#f0f0f0", borderRadius: 14, padding: 14, gap: 10 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 2 }}>{li.itemCode}</Text>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>{li.description}</Text>
                      {li.notes ? (
                        <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{li.notes}</Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: BRAND_GREEN }}>
                      {baht(li.qty * li.unitPrice)}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <Text style={{ fontSize: 12, color: TEXT_SECONDARY }}>
                      จำนวน <Text style={{ fontWeight: "600", color: "#0a0a0a" }}>{li.qty.toLocaleString()}</Text> {li.uom}
                    </Text>
                    <Text style={{ fontSize: 12, color: TEXT_SECONDARY }}>
                      ราคา/หน่วย <Text style={{ fontWeight: "600", color: "#0a0a0a" }}>{baht(li.unitPrice)}</Text>
                    </Text>
                  </View>

                  {/* ERP code input */}
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, color: "#374151", fontWeight: "500" }}>Item Code ERP</Text>
                      <Info size={13} color="#9ca3af" strokeWidth={2.2} />
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
                  borderTopWidth: 1,
                  borderTopColor: "#ececed",
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

      {/* Fixed bottom Submit — primary action, full-width pill (Fitts's Law). */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fafafa", borderTopWidth: 1, borderTopColor: "#ececed" }}>
        <View style={{ padding: 16 }}>
          <Pressable
            onPress={handleSubmit}
            className="items-center justify-center active:opacity-80"
            style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, height: 48 }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>ส่งเพื่อขออนุมัติ</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
