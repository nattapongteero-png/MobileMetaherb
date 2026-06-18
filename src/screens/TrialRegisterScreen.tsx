import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Check, ArrowLeft, ArrowRight } from "lucide-react-native";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";

/* ----------------------------------------------------------------------------
 * Data — ported verbatim from web src/app/pages/TrialRegisterPage.tsx
 * -------------------------------------------------------------------------- */

const AGE_RANGES = ["15-24", "25-34", "35-44", "45-54", "55+"] as const;
const GENDERS = ["ชาย", "หญิง", "LGBTQ+", "ไม่ระบุ"] as const;

const LIFESTYLE_OPTIONS = [
  { emoji: "🙂", label: "ผู้บริโภคทั่วไป" },
  { emoji: "💚", label: "สายสุขภาพ" },
  { emoji: "💪", label: "นักกีฬา/ออกกำลัง" },
  { emoji: "🧘", label: "สายโยคะ/meditation" },
  { emoji: "✨", label: "สาย skincare" },
  { emoji: "🌿", label: "ชื่นชอบสมุนไพรธรรมชาติ" },
  { emoji: "🌱", label: "มังสวิรัติ/วีแกน" },
  { emoji: "☕", label: "คนดื่มกาแฟ" },
  { emoji: "💼", label: "พนักงานออฟฟิศ" },
  { emoji: "🚴", label: "ชอบเดินทาง/outdoor" },
  { emoji: "🌙", label: "มีปัญหาการนอน" },
  { emoji: "😴", label: "นอนดึก/ทำงานกะ" },
  { emoji: "🤰", label: "ตั้งครรภ์/ให้นมบุตร" },
  { emoji: "👶", label: "ดูแลเด็กเล็ก" },
  { emoji: "🧓", label: "ดูแลผู้สูงอายุในบ้าน" },
  { emoji: "😌", label: "ผู้สูงอายุ (60+)" },
  { emoji: "🤧", label: "ภูมิแพ้/แพ้ง่าย" },
  { emoji: "🍃", label: "สาย wellness/detox" },
];

const HEALTH_OPTIONS = [
  { emoji: "😴", label: "นอนหลับยาก" },
  { emoji: "😩", label: "เครียด/วิตกกังวล" },
  { emoji: "😫", label: "อ่อนเพลีย/พลังงานต่ำ" },
  { emoji: "🧠", label: "สมาธิ/ความจำ" },
  { emoji: "💆", label: "ปวดหัว/ไมเกรน" },
  { emoji: "🌸", label: "ปัญหาผิว/สิว" },
  { emoji: "💧", label: "ผิวแห้ง/ขาดน้ำ" },
  { emoji: "👁️", label: "บำรุงสายตา" },
  { emoji: "👩‍🦳", label: "ผมร่วง/บำรุงผม" },
  { emoji: "🍽️", label: "ระบบย่อย/ท้องอืด" },
  { emoji: "🚽", label: "ระบบขับถ่าย/ท้องผูก" },
  { emoji: "🦴", label: "ปวดข้อ/ปวดเมื่อย" },
  { emoji: "💪", label: "กล้ามเนื้อ/ฟื้นฟู" },
  { emoji: "⚖️", label: "ควบคุมน้ำหนัก" },
  { emoji: "🩸", label: "ระดับน้ำตาล/เบาหวาน" },
  { emoji: "❤️", label: "ความดัน/หัวใจ" },
  { emoji: "🫁", label: "เสริมภูมิคุ้มกัน" },
  { emoji: "🤧", label: "ภูมิแพ้/หวัดบ่อย" },
  { emoji: "🩺", label: "บำรุงตับ" },
  { emoji: "🦷", label: "สุขภาพช่องปาก" },
];

const CONSUMPTION_OPTIONS = [
  { emoji: "🍵", label: "ชาสมุนไพร" },
  { emoji: "🥤", label: "เครื่องดื่มชง/instant" },
  { emoji: "💊", label: "แคปซูล/เม็ด" },
  { emoji: "💉", label: "ยาน้ำ/น้ำสกัด" },
  { emoji: "🌶️", label: "ผง/สมุนไพรบด" },
  { emoji: "🍯", label: "น้ำผึ้งสมุนไพร" },
  { emoji: "🍬", label: "ลูกอม/อมยิ้ม" },
  { emoji: "💧", label: "น้ำมันสกัด/oil" },
  { emoji: "🌸", label: "น้ำมันหอมระเหย" },
  { emoji: "🧴", label: "ครีม/เซรั่ม/โลชั่น" },
  { emoji: "🧊", label: "บาล์ม/ขี้ผึ้ง" },
  { emoji: "🌬️", label: "สเปรย์/aroma" },
  { emoji: "🛁", label: "สบู่/แชมพูสมุนไพร" },
  { emoji: "🌿", label: "ลูกประคบ/อบสมุนไพร" },
  { emoji: "🍴", label: "อาหาร functional" },
];

const TOTAL_STEPS = 5; // 4 input steps + 1 success state

/* ----------------------------------------------------------------------------
 * Module-scope sub-components (declared outside the screen so the TextInput
 * keeps focus across re-renders — per mobile conventions)
 * -------------------------------------------------------------------------- */

function NameField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="เช่น ก้อง"
      placeholderTextColor="#9ca3af"
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: "500", color: "#1a1a1a", marginBottom: 8 }}>
      {children}
    </Text>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 13, color: "#6b7280", lineHeight: 19 }}>{subtitle}</Text>
    </View>
  );
}

function Chip({
  selected,
  onPress,
  label,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: selected ? BRAND_GREEN : "#fff",
        borderColor: selected ? BRAND_GREEN : "#e5e7eb",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "500",
          color: selected ? "#fff" : "#374151",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: { emoji: string; label: string }[];
  selected: string[];
  onToggle: (label: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => (
        <Chip
          key={o.label}
          label={`${o.emoji} ${o.label}`}
          selected={selected.includes(o.label)}
          onPress={() => onToggle(o.label)}
        />
      ))}
    </View>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4 }}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => {
        const done = step > n || step === 5;
        const active = step === n;
        const filled = done || active;
        return (
          <View
            key={n}
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: n < TOTAL_STEPS ? 1 : 0,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: filled ? BRAND_GREEN : "#f3f4f6",
                borderWidth: active ? 4 : 0,
                borderColor: "rgba(49,151,84,0.15)",
              }}
            >
              {done ? (
                <Check size={16} color="#fff" strokeWidth={3} />
              ) : (
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: filled ? "#fff" : "#9ca3af",
                  }}
                >
                  {n}
                </Text>
              )}
            </View>
            {n < TOTAL_STEPS && (
              <View
                style={{
                  flex: 1,
                  height: 2,
                  marginHorizontal: 8,
                  borderRadius: 999,
                  backgroundColor: step > n ? BRAND_GREEN : "#e5e7eb",
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

/* ----------------------------------------------------------------------------
 * Screen
 * -------------------------------------------------------------------------- */

export function TrialRegisterScreen() {
  const nav = useNavigation();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
  const [lifestyle, setLifestyle] = useState<string[]>([]);
  const [health, setHealth] = useState<string[]>([]);
  const [consumption, setConsumption] = useState<string[]>([]);

  const toggle = (
    arr: string[],
    value: string,
    setter: (v: string[]) => void
  ) => {
    setter(arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]);
  };

  const canProceed =
    (step === 1 && displayName.trim().length >= 2 && !!ageRange && !!gender) ||
    (step === 2 && lifestyle.length > 0) ||
    (step === 3 && health.length > 0) ||
    (step === 4 && consumption.length > 0);

  const handleSubmit = () => {
    // No persistence on mobile mock — jump straight to success.
    setStep(5);
  };

  const handlePrimary = () => {
    if (step === 4) {
      handleSubmit();
    } else if (canProceed) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      nav.goBack();
    }
  };

  const resetRegistration = () => {
    Alert.alert(
      "ลงทะเบียนใหม่",
      "ล้างโปรไฟล์ผู้ทดสอบและเริ่มลงทะเบียนใหม่?",
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ตกลง",
          style: "destructive",
          onPress: () => {
            setDisplayName("");
            setAgeRange("");
            setGender("");
            setLifestyle([]);
            setHealth([]);
            setConsumption([]);
            setStep(1);
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
      >
        {/* Hero band */}
        <View
          style={{
            backgroundColor: "#eaf3ee",
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 18,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "500",
              color: BRAND_GREEN,
              textAlign: "center",
              lineHeight: 26,
            }}
          >
            ลงทะเบียนผู้ทดสอบผลิตภัณฑ์
          </Text>
        </View>

        {/* Description */}
        <Text
          style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 }}
        >
          กรอกข้อมูล 4 ขั้นตอน · ระบบจะแนะนำผลิตภัณฑ์ที่เหมาะสมกับคุณ
        </Text>

        {/* Stepper */}
        <Stepper step={step} />

        {/* Step card */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#ececed",
            padding: 16,
          }}
        >
          {step === 1 && (
            <View>
              <StepHeader
                title="ข้อมูลส่วนบุคคล"
                subtitle="โปรดกรอกข้อมูลพื้นฐานเพื่อเริ่มต้นการลงทะเบียน"
              />
              <FieldLabel>ชื่อที่ใช้แสดง *</FieldLabel>
              <NameField value={displayName} onChangeText={setDisplayName} />

              <View style={{ height: 18 }} />
              <FieldLabel>อายุ *</FieldLabel>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {AGE_RANGES.map((a) => (
                  <Chip
                    key={a}
                    label={a}
                    selected={ageRange === a}
                    onPress={() => setAgeRange(a)}
                  />
                ))}
              </View>

              <View style={{ height: 18 }} />
              <FieldLabel>เพศ *</FieldLabel>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {GENDERS.map((g) => (
                  <Chip
                    key={g}
                    label={g}
                    selected={gender === g}
                    onPress={() => setGender(g)}
                  />
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <StepHeader
                title="รูปแบบการใช้ชีวิต"
                subtitle="สามารถเลือกได้มากกว่าหนึ่งข้อ"
              />
              <ChipGrid
                options={LIFESTYLE_OPTIONS}
                selected={lifestyle}
                onToggle={(l) => toggle(lifestyle, l, setLifestyle)}
              />
            </View>
          )}

          {step === 3 && (
            <View>
              <StepHeader
                title="ข้อมูลด้านสุขภาพ"
                subtitle="โปรดเลือกปัญหาสุขภาพที่ท่านต้องการดูแล (เลือกได้หลายข้อ)"
              />
              <ChipGrid
                options={HEALTH_OPTIONS}
                selected={health}
                onToggle={(l) => toggle(health, l, setHealth)}
              />
            </View>
          )}

          {step === 4 && (
            <View>
              <StepHeader
                title="พฤติกรรมการบริโภค"
                subtitle="โปรดเลือกรูปแบบผลิตภัณฑ์สมุนไพรที่คุ้นเคย"
              />
              <ChipGrid
                options={CONSUMPTION_OPTIONS}
                selected={consumption}
                onToggle={(l) => toggle(consumption, l, setConsumption)}
              />
            </View>
          )}

          {step === 5 && (
            <View style={{ alignItems: "center", paddingVertical: 16 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  backgroundColor: BRAND_GREEN,
                }}
              >
                <Check size={40} color="#fff" strokeWidth={3} />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: "#1a1a1a",
                  marginBottom: 8,
                }}
              >
                ลงทะเบียนสำเร็จ
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  textAlign: "center",
                  lineHeight: 21,
                  marginBottom: 20,
                }}
              >
                {`ขอบคุณที่เข้าร่วมเป็นส่วนหนึ่งของ MetaLab คุณ${
                  displayName ? ` "${displayName}"` : ""
                } จะได้รับข่าวสารสินค้าที่เหมาะกับ lifestyle ของคุณก่อนใคร`}
              </Text>

              <Pressable
                onPress={() => nav.navigate("TrialProducts" as never)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  height: 48,
                  paddingHorizontal: 24,
                  borderRadius: 999,
                  backgroundColor: BRAND_GREEN,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                  ดูผลิตภัณฑ์ที่เปิดรับ
                </Text>
                <ArrowRight size={16} color="#fff" strokeWidth={2.4} />
              </Pressable>

              <Pressable
                onPress={resetRegistration}
                hitSlop={8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  height: 44,
                  paddingHorizontal: 20,
                  marginTop: 8,
                }}
              >
                <Text style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: "500" }}>
                  ลงทะเบียนใหม่
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed bottom nav (hidden on success step) */}
      {step < 5 && (
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fff" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: "#f0f0f0",
              gap: 12,
            }}
          >
            <Pressable
              onPress={handleBack}
              hitSlop={6}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                height: 48,
                paddingHorizontal: 16,
                borderRadius: 999,
              }}
            >
              <ArrowLeft
                size={16}
                color={step === 1 ? "#9ca3af" : "#374151"}
                strokeWidth={2.4}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: step === 1 ? "#9ca3af" : "#374151",
                }}
              >
                ย้อนกลับ
              </Text>
            </Pressable>

            <Pressable
              onPress={handlePrimary}
              disabled={!canProceed}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                flex: 1,
                maxWidth: 220,
                height: 48,
                paddingHorizontal: 18,
                borderRadius: 999,
                backgroundColor: canProceed ? BRAND_GREEN : "#e5e7eb",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: canProceed ? "#fff" : "#9ca3af",
                }}
              >
                {step === 4 ? "ยืนยันการลงทะเบียน" : "ถัดไป"}
              </Text>
              {step < 4 && (
                <ArrowRight
                  size={16}
                  color={canProceed ? "#fff" : "#9ca3af"}
                  strokeWidth={2.4}
                />
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}
