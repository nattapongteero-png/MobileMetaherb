import { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  MapPin,
  FileText,
  ShieldCheck,
  Coins,
  Clock,
  Users,
  Check,
  Sparkles,
  User,
  Ellipsis,
  Plus,
} from "lucide-react-native";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

/* ----------------------------------------------------------------------------
 * Data — ported verbatim from web src/app/data/trialProducts.ts + TrialApplyPage.
 * Local figma:asset images don't exist here, so trial imagery uses Unsplash.
 * The route receives an `id`; we fall back to "trial-1" so the screen renders
 * standalone before the detail/list flow is wired.
 * -------------------------------------------------------------------------- */

// Trial data comes from the canonical TrialProductsScreen list (local photos)
// so this flow always matches the card/detail the user came from.
import { TRIAL_PRODUCTS } from "./TrialProductsScreen";

/** Resolve a local bundled image (require → number) or remote URL string. */
function imgSource(src: number | string | undefined): any {
  return typeof src === "number" ? src : { uri: src };
}

type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  fullAddress: string;
  isDefault?: boolean;
};

/** Mock saved addresses — would come from AddressContext in a real app. */
const SAVED_ADDRESSES: Address[] = [
  {
    id: "addr-1",
    label: "บ้าน",
    recipient: "username01",
    phone: "090-000-0001",
    fullAddress:
      "เลขที่ 2 ชั้น 2 ซอยสุขสวัสดิ์ 33 แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "ที่ทำงาน",
    recipient: "username01",
    phone: "090-000-0001",
    fullAddress:
      "ชั้น 15 อาคาร B ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110",
  },
  {
    id: "addr-3",
    label: "บ้านต่างจังหวัด",
    recipient: "username01",
    phone: "090-000-0002",
    fullAddress: "55/12 หมู่ 5 ตำบลในเมือง อำเภอเมือง จังหวัดเชียงใหม่ 50000",
  },
];

/** Tester profile — mirrors loadTesterProfile() from the web mock. */
const TESTER_PROFILE = {
  displayName: "username01",
  ageRange: "25 - 34 ปี",
  gender: "หญิง",
  lifestyle: ["ทำงานออฟฟิศ", "ออกกำลังกายสม่ำเสมอ"],
  health: ["ผิวแพ้ง่าย", "นอนหลับยาก"],
  consumption: ["ดื่มชาสมุนไพรเป็นประจำ"],
};

const TERMS: string[] = [
  "1. ผู้ขอทดสอบต้องเป็นบุคคลที่มีอายุ 15 ปีขึ้นไป และมีที่อยู่จัดส่งภายในประเทศไทย",
  "2. METAHERB จะคัดเลือกผู้ทดสอบจากใบสมัครและติดต่อกลับภายใน 2 วันทำการ — การส่งใบสมัครไม่ได้ยืนยันสิทธิ์การได้รับสินค้า",
  "3. ผู้ทดสอบที่ได้รับเลือก ต้องส่งแบบประเมินผลภายใน 30 วันหลังได้รับสินค้า เพื่อรับคะแนนสะสม",
  "4. สามารถขอเข้าร่วมทดสอบได้ครั้งละ 1 รายการ — รายการถัดไปสมัครได้หลังส่งแบบประเมินครบ",
  "5. ข้อมูลส่วนตัวจะถูกใช้เพื่อการจัดส่งและสื่อสารเกี่ยวกับการทดสอบเท่านั้น ตามนโยบายความเป็นส่วนตัวของ METAHERB",
  "6. ผู้ทดสอบยินยอมให้ใช้ความคิดเห็น/ผลการประเมินเพื่อพัฒนาผลิตภัณฑ์ โดยอาจอ้างอิงในรูปแบบที่ไม่ระบุตัวตน",
];

type Params = { id?: string };

/* ----------------------------------------------------------------------------
 * Shared style constants
 * -------------------------------------------------------------------------- */

const CARD_STYLE = {
  backgroundColor: "#fff",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#ececed",
  padding: 16,
} as const;

const BLUE = "#08f"; // "ที่อยู่หลัก" default-address badge (matches web)
const AMBER_BG = "#fef3c7";
const AMBER_BORDER = "#fde68a";
const AMBER_TEXT = "#92400e";

/* ----------------------------------------------------------------------------
 * Module-scope sub-components (declared outside the screen to keep the
 * TextInput from losing focus on re-render).
 * -------------------------------------------------------------------------- */

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {icon}
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1a1a1a" }}>
        {children}
      </Text>
    </View>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Text style={{ fontSize: 12.5, color: TEXT_MUTED, width: 120 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, color: "#1a1a1a", flex: 1 }}>{value}</Text>
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
      {icon}
      <Text style={{ fontSize: 10, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color: "#1a1a1a" }}>
        {value}
      </Text>
    </View>
  );
}

function ReasonInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (t: string) => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="เล่าให้เราฟังว่าทำไมสินค้านี้น่าสนใจสำหรับคุณ / คุณมีปัญหาอะไรที่คาดว่าผลิตภัณฑ์นี้จะช่วยได้ — อย่างน้อย 10 ตัวอักษร"
      placeholderTextColor="#9ca3af"
      multiline
      textAlignVertical="top"
      style={{
        minHeight: 110,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: "#1a1a1a",
        lineHeight: 21,
      }}
    />
  );
}

/* ----------------------------------------------------------------------------
 * Screen
 * -------------------------------------------------------------------------- */

export function TrialApplyScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const { id } = (route.params as Params) ?? {};

  const product = useMemo(
    () => TRIAL_PRODUCTS.find((p) => p.id === id) ?? TRIAL_PRODUCTS[0],
    [id]
  );

  const [selectedAddressId, setSelectedAddressId] = useState(
    SAVED_ADDRESSES.find((a) => a.isDefault)?.id ?? SAVED_ADDRESSES[0].id
  );
  const [showAddressList, setShowAddressList] = useState(false);
  const [reason, setReason] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const selectedAddress =
    SAVED_ADDRESSES.find((a) => a.id === selectedAddressId) ??
    SAVED_ADDRESSES[0];

  const spotsLeft = product.spotsTotal - product.spotsTaken;
  const isClosed = spotsLeft <= 0 || product.endsInDays <= 0;
  const canSubmit =
    reason.trim().length >= 10 && acceptTerms && !isClosed;

  const handleSubmit = () => {
    if (reason.trim().length < 10) {
      Alert.alert(
        "กรุณากรอกเหตุผล",
        "เล่าเหตุผลในการขอทดลองใช้อย่างน้อย 10 ตัวอักษร"
      );
      return;
    }
    if (!acceptTerms) {
      Alert.alert(
        "ยอมรับเงื่อนไข",
        "กรุณายอมรับข้อกำหนดและเงื่อนไขก่อนส่งคำขอ"
      );
      return;
    }
    if (!canSubmit) return;
    Alert.alert(
      "ส่งใบสมัครเรียบร้อย",
      `METAHERB จะตรวจสอบและติดต่อกลับทาง ${selectedAddress.phone} ภายใน 2 วันทำการ`
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
      >
        {/* Page heading */}
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#1a1a1a" }}>
          ขอเข้าร่วมทดสอบผลิตภัณฑ์
        </Text>

        {/* ===== Trial summary — product + stats + studio ===== */}
        <View style={[CARD_STYLE, { gap: 14 }]}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#1a1a1a" }}>
            สินค้าที่ขอเข้าร่วม
          </Text>
          <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 14,
                overflow: "hidden",
                backgroundColor: "#f3f4f6",
              }}
            >
              <Image
                source={imgSource(product.imageSrc ?? product.image)}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              <View style={{ position: "absolute", top: 6, left: 6 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "#0088ff",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                  }}
                >
                  <Sparkles size={10} color="#fff" strokeWidth={2.4} />
                  <Text style={{ fontSize: 10, color: "#fff", fontWeight: "600" }}>
                    Beta
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: BRAND_GREEN,
                  fontWeight: "600",
                  letterSpacing: 0.4,
                }}
              >
                {product.category.toUpperCase()}
              </Text>
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#1a1a1a",
                  marginTop: 2,
                  lineHeight: 19,
                }}
              >
                {product.name}
              </Text>
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 11.5,
                  color: TEXT_MUTED,
                  marginTop: 4,
                  lineHeight: 16,
                }}
              >
                {product.tagline}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

          {/* Mini stats */}
          <View style={{ flexDirection: "row" }}>
            <Stat
              icon={<Coins size={16} color="#d97706" strokeWidth={2.4} />}
              label="คะแนน"
              value={`+${product.rewardPoints.toLocaleString()}`}
            />
            <Stat
              icon={<Clock size={16} color="#6b7280" strokeWidth={2.4} />}
              label="เหลือ"
              value={`${product.endsInDays} วัน`}
            />
            <Stat
              icon={<Users size={16} color="#6b7280" strokeWidth={2.4} />}
              label="ที่นั่ง"
              value={`${product.spotsTaken}/${product.spotsTotal}`}
            />
          </View>
        </View>

        {/* ===== Address — mirrors PaymentPage layout ===== */}
        <View style={CARD_STYLE}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <SectionTitle
              icon={<MapPin size={18} color={BRAND_GREEN} strokeWidth={2.2} />}
            >
              ที่อยู่ในการจัดส่ง
            </SectionTitle>
            <Pressable
              onPress={() => setShowAddressList((v) => !v)}
              hitSlop={10}
            >
              <Text style={{ fontSize: 13, color: BRAND_GREEN, fontWeight: "500" }}>
                {showAddressList ? "ปิด" : "เปลี่ยน"}
              </Text>
            </Pressable>
          </View>

          {/* Selected address card */}
          <View
            style={{
              backgroundColor: "rgba(242,242,247,0.7)",
              borderRadius: 16,
              padding: 14,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flex: 1,
                  flexWrap: "wrap",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "500", color: "#000" }}>
                  {selectedAddress.recipient}
                </Text>
                {selectedAddress.isDefault && (
                  <View
                    style={{
                      backgroundColor: BLUE,
                      paddingHorizontal: 12,
                      paddingVertical: 2,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "#fff", fontWeight: "500" }}>
                      ที่อยู่หลัก
                    </Text>
                  </View>
                )}
                <View
                  style={{
                    backgroundColor: "#e5e7eb",
                    paddingHorizontal: 10,
                    paddingVertical: 2,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#374151", fontWeight: "500" }}>
                    {selectedAddress.label}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "rgba(120,120,128,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ellipsis size={16} color="#999" />
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: "#D4D4D8" }} />
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 15, color: "#000" }}>
                {selectedAddress.phone}
              </Text>
              <Text style={{ fontSize: 13.5, color: "#000", lineHeight: 19 }}>
                {selectedAddress.fullAddress}
              </Text>
            </View>
          </View>

          {/* Address picker — expands when "เปลี่ยน" pressed */}
          {showAddressList && (
            <View
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: "#f0f0f0",
                gap: 8,
              }}
            >
              {SAVED_ADDRESSES.filter((a) => a.id !== selectedAddressId).map(
                (addr) => (
                  <Pressable
                    key={addr.id}
                    onPress={() => {
                      setSelectedAddressId(addr.id);
                      setShowAddressList(false);
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}
                      >
                        {addr.recipient}
                      </Text>
                      <Text style={{ fontSize: 11, color: TEXT_MUTED }}>
                        · {addr.phone}
                      </Text>
                      <View
                        style={{
                          backgroundColor: "#e5e7eb",
                          paddingHorizontal: 8,
                          paddingVertical: 1,
                          borderRadius: 999,
                        }}
                      >
                        <Text
                          style={{ fontSize: 10, color: "#374151", fontWeight: "500" }}
                        >
                          {addr.label}
                        </Text>
                      </View>
                      {addr.isDefault && (
                        <View
                          style={{
                            backgroundColor: BLUE,
                            paddingHorizontal: 8,
                            paddingVertical: 1,
                            borderRadius: 999,
                          }}
                        >
                          <Text
                            style={{ fontSize: 10, color: "#fff", fontWeight: "500" }}
                          >
                            ที่อยู่หลัก
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 18 }}>
                      {addr.fullAddress}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          )}

          <Pressable
            onPress={() => nav.navigate("Address" as never)}
            hitSlop={8}
            style={{
              marginTop: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Plus size={14} color={BRAND_GREEN} strokeWidth={2.4} />
            <Text style={{ fontSize: 13, color: BRAND_GREEN }}>เพิ่มที่อยู่ใหม่</Text>
          </Pressable>
        </View>

        {/* ===== Tester profile ===== */}
        <View style={[CARD_STYLE, { gap: 12 }]}>
          <SectionTitle
            icon={<User size={18} color={BRAND_GREEN} strokeWidth={2.4} />}
          >
            โปรไฟล์ผู้ทดสอบของคุณ
          </SectionTitle>
          <View style={{ gap: 8 }}>
            <ProfileRow label="ชื่อแสดง" value={TESTER_PROFILE.displayName} />
            <ProfileRow label="อายุ" value={TESTER_PROFILE.ageRange} />
            <ProfileRow label="เพศ" value={TESTER_PROFILE.gender} />
            <ProfileRow
              label="รูปแบบการใช้ชีวิต"
              value={TESTER_PROFILE.lifestyle.join(" · ")}
            />
            <ProfileRow
              label="ปัญหาสุขภาพ"
              value={TESTER_PROFILE.health.join(" · ")}
            />
            <ProfileRow
              label="พฤติกรรมบริโภค"
              value={TESTER_PROFILE.consumption.join(" · ")}
            />
          </View>
          <Pressable
            onPress={() =>
              Alert.alert("กำลังพัฒนา", "แก้ไขโปรไฟล์ผู้ทดสอบกำลังพัฒนา")
            }
            hitSlop={8}
          >
            <Text style={{ fontSize: 12, color: BRAND_GREEN }}>
              แก้ไขโปรไฟล์ผู้ทดสอบ
            </Text>
          </Pressable>
        </View>

        {/* ===== Reason ===== */}
        <View style={[CARD_STYLE, { gap: 12 }]}>
          <SectionTitle
            icon={<FileText size={18} color={BRAND_GREEN} strokeWidth={2.4} />}
          >
            เหตุผลในการขอทดลองใช้
          </SectionTitle>
          <ReasonInput value={reason} onChange={setReason} />
          <Text
            style={{
              fontSize: 11,
              color: reason.trim().length >= 10 ? BRAND_GREEN : "#9ca3af",
              textAlign: "right",
            }}
          >
            {reason.trim().length} / 10 ขั้นต่ำ
          </Text>
        </View>

        {/* ===== Terms & conditions ===== */}
        <View style={[CARD_STYLE, { gap: 12 }]}>
          <SectionTitle
            icon={<ShieldCheck size={18} color={BRAND_GREEN} strokeWidth={2.4} />}
          >
            ข้อกำหนดและเงื่อนไข
          </SectionTitle>
          <View
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 10,
              padding: 12,
              gap: 6,
            }}
          >
            {TERMS.map((t, i) => (
              <Text
                key={i}
                style={{ fontSize: 11.5, color: "#374151", lineHeight: 18 }}
              >
                {t}
              </Text>
            ))}
          </View>

          <Pressable
            onPress={() => setAcceptTerms((v) => !v)}
            hitSlop={6}
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                marginTop: 1,
                borderWidth: 2,
                borderColor: acceptTerms ? BRAND_GREEN : "#d1d5db",
                backgroundColor: acceptTerms ? BRAND_GREEN : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {acceptTerms && <Check size={13} color="#fff" strokeWidth={3} />}
            </View>
            <Text style={{ flex: 1, fontSize: 12.5, color: "#1a1a1a", lineHeight: 19 }}>
              ฉันได้อ่านและยอมรับ{" "}
              <Text style={{ color: BRAND_GREEN, fontWeight: "600" }}>
                ข้อกำหนดและเงื่อนไข
              </Text>{" "}
              การเข้าร่วมทดสอบ
            </Text>
          </Pressable>
        </View>

        {/* Closed warning — urgency red is appropriate here (closed quota) */}
        {isClosed && (
          <View
            style={{
              borderRadius: 12,
              padding: 12,
              backgroundColor: AMBER_BG,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
            }}
          >
            <Text style={{ fontSize: 12, color: AMBER_TEXT, lineHeight: 18 }}>
              ขออภัย — การทดสอบนี้ปิดรับสมัครแล้ว
            </Text>
          </View>
        )}

        <Text
          style={{
            fontSize: 11,
            color: "#9ca3af",
            textAlign: "center",
            lineHeight: 17,
            marginTop: 2,
          }}
        >
          เมื่อกดส่งคำขอ ทีมงานจะตรวจสอบและติดต่อกลับภายใน 2 วันทำการ
        </Text>
      </ScrollView>

      {/* ===== Fixed bottom submit ===== */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fafafa" }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 6,
            borderTopWidth: 1,
            borderTopColor: "#ececed",
            backgroundColor: "#fff",
          }}
        >
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={{
              height: 48,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              backgroundColor: canSubmit ? BRAND_GREEN : "#e5e7eb",
            }}
          >
            <Check
              size={16}
              color={canSubmit ? "#fff" : "#9ca3af"}
              strokeWidth={2.6}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: canSubmit ? "#fff" : "#9ca3af",
              }}
            >
              ส่งคำขอเข้าร่วมทดสอบ
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
