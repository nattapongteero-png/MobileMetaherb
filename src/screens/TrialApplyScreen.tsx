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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { SubPageHeader } from "../components/SubPageHeader";
import { BottomFade } from "../components/BottomFade";
import { usePayment } from "../context/PaymentContext";
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
  Plus,
} from "lucide-react-native";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";

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

// Full-bleed white section (edge-to-edge, separated by a thin gray gap) — matches
// the order detail / account pages.
const CARD_STYLE = {
  backgroundColor: "#fff",
  marginTop: 8,
  paddingHorizontal: 16,
  paddingVertical: 16,
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
        backgroundColor: "#f5f5f5",
        borderRadius: 14,
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
  const insets = useSafeAreaInsets();
  const { id } = (route.params as Params) ?? {};

  const product = useMemo(
    () => TRIAL_PRODUCTS.find((p) => p.id === id) ?? TRIAL_PRODUCTS[0],
    [id]
  );

  // Shared shipping address — same source as the checkout page (PaymentContext),
  // tapping the card opens the same AddressSelect picker.
  const { addresses, selectedAddressId } = usePayment();
  const selectedAddress =
    addresses.find((a) => a.id === selectedAddressId) ?? addresses[0];

  const [reason, setReason] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const spotsLeft = product.spotsTotal - product.spotsTaken;
  const isClosed = spotsLeft <= 0 || product.endsInDays <= 0;
  const canSubmit =
    reason.trim().length >= 10 && acceptTerms && !isClosed;

  // Always tappable — each unmet condition explains itself via an alert so the
  // user is never left with a silent, unresponsive button.
  const handleSubmit = () => {
    if (isClosed) {
      Alert.alert("ปิดรับสมัครแล้ว", "ขออภัย — การทดสอบนี้ปิดรับสมัครแล้ว");
      return;
    }
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
    (nav as any).navigate("TrialSuccess", {
      productName: product.name,
      rewardPoints: product.rewardPoints,
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="สมัครทดลองใช้สินค้า"
        subtitle={product.name}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        >
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

        {/* ===== Address — same card + AddressSelect picker as the checkout page ===== */}
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
              ที่อยู่จัดส่ง
            </SectionTitle>
            <Pressable onPress={() => nav.navigate("AddressSelect" as never)} hitSlop={10}>
              <Text style={{ fontSize: 13, color: BRAND_GREEN, fontWeight: "500" }}>
                เปลี่ยน
              </Text>
            </Pressable>
          </View>

          {selectedAddress ? (
            <Pressable
              onPress={() => nav.navigate("AddressSelect" as never)}
              className="active:opacity-90"
              style={{
                backgroundColor: "rgba(242,242,247,0.6)",
                borderRadius: 24,
                padding: 14,
                gap: 10,
              }}
            >
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a", lineHeight: 20, flexShrink: 1 }}
                >
                  {selectedAddress.name}
                </Text>
                {selectedAddress.isDefault ? (
                  <View style={{ backgroundColor: BLUE, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                    <Text style={{ color: "white", fontSize: 10, fontWeight: "700", lineHeight: 13 }}>
                      ค่าเริ่มต้น
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={{ height: 1, backgroundColor: "#d4d4d8" }} />
              <View>
                <Text style={{ fontSize: 14, color: "#0a0a0a", lineHeight: 19 }}>
                  {selectedAddress.phone}
                </Text>
                <Text style={{ fontSize: 13, color: "#525252", lineHeight: 19, marginTop: 4 }}>
                  {selectedAddress.detail}
                  {"\n"}
                  {selectedAddress.area}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => nav.navigate("AddAddress" as never)}
              hitSlop={8}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Plus size={14} color={BRAND_GREEN} strokeWidth={2.4} />
              <Text style={{ fontSize: 13, color: BRAND_GREEN }}>เพิ่มที่อยู่ใหม่</Text>
            </Pressable>
          )}
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
              marginTop: 8,
              marginHorizontal: 16,
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
            marginTop: 14,
            paddingHorizontal: 16,
          }}
        >
          เมื่อกดส่งคำขอ ทีมงานจะตรวจสอบและติดต่อกลับภายใน 2 วันทำการ
        </Text>
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <BottomFade />
      </View>

      {/* ===== Floating Liquid Glass submit bar (hovers above the bottom, same
          language as the cart / payment / order detail screens) ===== */}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}
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
            style={{ borderRadius: 34, overflow: "hidden", padding: 9 }}
          >
            <Pressable
              onPress={handleSubmit}
              className="active:opacity-90"
              style={{
                height: 50,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                backgroundColor: canSubmit ? BRAND_GREEN : "#9ca3af",
              }}
            >
              <Check size={17} color="#fff" strokeWidth={2.6} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                ส่งคำขอเข้าร่วมทดสอบ
              </Text>
            </Pressable>
          </GlassView>
        </View>
      </View>
    </View>
  );
}
