import { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ban, Check, ChevronRight, CircleAlert, Clock, ClipboardList, Coins, Star, Truck, X, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BottomFade } from "../components/BottomFade";
import { showToast } from "../components/Toast";
import { approveRegistration, registrationById, rejectRegistration } from "../store/trials";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import {
  STATUS_CFG,
  portraitForApplicant,
  submittedLabelFor,
  type ApplicantsProduct,
} from "./trialDetail/TrialDetailApplicants";
import { getRegistrationStatus, type RegistrationStatus } from "../data/ownerTrialRegistrations";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_ICON: Record<RegistrationStatus, LucideIcon> = {
  pending_approval: CircleAlert,
  approved: Clock,
  evaluated: Check,
  rejected: Ban,
};

const GENDER_LABEL: Record<string, string> = { male: "ชาย", female: "หญิง", lgbtq: "LGBTQ+" };

// Same section / row language as the order & coupon detail pages.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", marginBottom: 12 }}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 13.5, color: valueColor ?? "#0a0a0a", fontWeight: "500", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

/** รายละเอียดคำขอใช้สินค้าทดลอง (ฝั่งร้าน) — pushed from a RegistrationCard.
 *  Shows the applicant, motivation, and the requested product; pending requests
 *  get a floating อนุมัติ/ปฏิเสธ bar (local status override + callbacks back to
 *  the list — same mock pattern as the order detail page). */
export function OwnerTrialRequestDetailScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { reg, product, onApprove, onReject } =
    useRoute<RouteProp<RootStackParamList, "OwnerTrialRequestDetail">>().params;

  // Local status override so actions update this page immediately.
  const [localStatus, setLocalStatus] = useState<RegistrationStatus | null>(null);
  const status = localStatus ?? getRegistrationStatus(reg);
  const st = STATUS_CFG[status];
  const StIcon = STATUS_ICON[status];

  const portrait = useMemo(() => portraitForApplicant(reg.name || "?", reg.gender), [reg.name, reg.gender]);
  const productImg = product.imageSrc ? product.imageSrc : product.image ? { uri: product.image } : undefined;

  const approve = () => {
    setLocalStatus("approved");
    // Real applicants carry an id — approving moves their MyTrials to "กำลังจัดส่ง".
    // The demo cohort has none, so it stays a local-only UI change.
    if (reg.id) approveRegistration(reg.id);
    onApprove?.();
  };
  const reject = () => {
    Alert.alert("ปฏิเสธคำขอ", `ปฏิเสธคำขอของ "${reg.name || "ผู้สมัคร"}"?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ปฏิเสธ",
        style: "destructive",
        onPress: () => {
          setLocalStatus("rejected");
          if (reg.id) rejectRegistration(reg.id, "คุณสมบัติผู้ทดสอบไม่ตรงเกณฑ์ของรอบนี้");
          onReject?.();
          showToast("ปฏิเสธคำขอเรียบร้อย", "info");
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="รายละเอียดคำขอทดลอง"
        subtitle={reg.name || "ผู้สมัคร"}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: status === "pending_approval" ? 140 : insets.bottom + 40 }}
        >
          {/* Status banner — same language as the other detail pages */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: st.pillBg + "1a", alignItems: "center", justifyContent: "center" }}>
                <StIcon size={18} color={st.pillBg} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>สถานะคำขอ</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: st.pillBg, marginTop: 1 }}>{st.label}</Text>
              </View>
            </View>
          </View>

          {/* ข้อมูลผู้สมัคร */}
          <Section title="ข้อมูลผู้สมัคร">
            <View className="flex-row items-center" style={{ gap: 12, marginBottom: 10 }}>
              <Image source={{ uri: portrait }} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#f3f4f6" }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{reg.name || "ผู้สมัคร"}</Text>
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>{reg.phone || "—"}</Text>
              </View>
            </View>
            <InfoRow label="เพศ" value={reg.gender ? GENDER_LABEL[reg.gender] ?? reg.gender : "—"} />
            <InfoRow label="ช่วงอายุ" value={reg.ageRange ? `${reg.ageRange} ปี` : "—"} />
            <InfoRow label="ที่อยู่จัดส่ง" value={reg.address || "—"} />
            <InfoRow label="วันที่ส่งคำขอ" value={submittedLabelFor(reg.submittedAt)} />
          </Section>

          {/* เหตุผลการขอทดลอง */}
          {reg.motivation ? (
            <Section title="เหตุผลการขอทดลอง">
              <View style={{ backgroundColor: "#f7f7f7", borderRadius: 12, padding: 12 }}>
                <Text style={{ fontSize: 13.5, color: "#374151", lineHeight: 20 }}>{reg.motivation}</Text>
              </View>
            </Section>
          ) : null}

          {/* สินค้าที่ขอทดลอง — tap → the trial's detail page */}
          <Section title="สินค้าที่ขอทดลอง">
            <Pressable
              onPress={() => nav.navigate("TrialRegistryDetail", { id: product.id })}
              className="flex-row items-center active:opacity-80"
              style={{ gap: 12 }}
            >
              <Image source={productImg} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#f3f4f6" }} resizeMode="cover" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "600", color: "#0a0a0a" }}>{product.name}</Text>
                <Text numberOfLines={1} style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{product.category || "—"}</Text>
                <View className="flex-row items-center" style={{ gap: 4, marginTop: 3 }}>
                  <Coins size={12} color="#f59e0b" strokeWidth={2.4} />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#f59e0b" }}>+{product.rewardPoints.toLocaleString("th-TH")} pts</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#c7c7cc" strokeWidth={2.2} />
            </Pressable>
          </Section>

          {/* ผลการประเมิน — the always-on "สรุปท้ายฟอร์ม" answers only
              (overall stars + NPS + comment), when the tester submitted */}
          {reg.evaluation ? (
            <Section title="ผลการประเมิน">
              {/* คะแนนรวม — star row */}
              <View className="flex-row items-center justify-between" style={{ paddingVertical: 6 }}>
                <Text style={{ fontSize: 13, color: TEXT_MUTED }}>คะแนนความพึงพอใจรวม</Text>
                <View className="flex-row items-center" style={{ gap: 3 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={16}
                      color="#f59e0b"
                      fill={n <= Math.round(reg.evaluation!.overall) ? "#f59e0b" : "transparent"}
                      strokeWidth={1.6}
                    />
                  ))}
                  <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#0a0a0a", marginLeft: 4 }}>
                    {reg.evaluation.overall.toFixed(1)}
                  </Text>
                </View>
              </View>
              {/* NPS */}
              <View className="flex-row items-center justify-between" style={{ paddingVertical: 6 }}>
                <Text style={{ fontSize: 13, color: TEXT_MUTED }}>แนะนำให้คนอื่น (NPS)</Text>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  {(() => {
                    const nps = reg.evaluation!.npsScores ? Object.values(reg.evaluation!.npsScores)[0] : undefined;
                    return nps != null ? (
                      <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#0a0a0a" }}>{nps}/10</Text>
                    ) : null;
                  })()}
                  <View
                    style={{
                      backgroundColor: reg.evaluation.wouldRecommend ? "rgba(49,151,84,0.1)" : "rgba(220,38,38,0.1)",
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: reg.evaluation.wouldRecommend ? BRAND_GREEN : "#dc2626" }}>
                      {reg.evaluation.wouldRecommend ? "แนะนำ" : "ไม่แนะนำ"}
                    </Text>
                  </View>
                </View>
              </View>
              {/* ความคิดเห็น */}
              {reg.evaluation.comment ? (
                <View style={{ paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 6 }}>ความคิดเห็นเพิ่มเติม</Text>
                  <View style={{ backgroundColor: "#f7f7f7", borderRadius: 12, padding: 12 }}>
                    <Text style={{ fontSize: 13.5, color: "#374151", lineHeight: 20 }}>{reg.evaluation.comment}</Text>
                  </View>
                </View>
              ) : null}

              <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 10 }} />

              {/* ดูคำตอบเต็มทุกข้อ — pushed full page */}
              <Pressable
                onPress={() => nav.navigate("OwnerTrialEvalAnswers", { reg, product })}
                className="flex-row items-center active:opacity-80"
                style={{ gap: 12 }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                  <ClipboardList size={18} color={BRAND_GREEN} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>ดูคำตอบแบบประเมินทั้งหมด</Text>
                  <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>คำตอบทุกข้อที่ Tester ส่งเข้ามา</Text>
                </View>
                <ChevronRight size={18} color="#c7c7cc" strokeWidth={2.2} />
              </Pressable>
            </Section>
          ) : null}
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <BottomFade />
      </View>

      {/* Approved but not yet shipped — the sample still has to go out. This
          button was missing entirely, so an approved tester waited forever. */}
      {status === "approved" && reg.id && registrationById(reg.id)?.stage === "shipping" ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
            <GlassView glassEffectStyle="regular" colorScheme="light" style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
              <Pressable
                onPress={() => nav.navigate("ConfirmShip", { orderId: reg.id!, kind: "trial" })}
                className="flex-row items-center justify-center active:opacity-90"
                style={{ flex: 1, height: 50, borderRadius: 999, gap: 6, backgroundColor: BRAND_GREEN }}
              >
                <Truck size={16} color="#fff" strokeWidth={2.4} />
                <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#fff" }}>ยืนยันจัดส่งตัวอย่าง</Text>
              </Pressable>
            </GlassView>
          </View>
        </View>
      ) : null}

      {/* Floating actions — pending requests only (Liquid Glass bar) */}
      {status === "pending_approval" ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
            <GlassView glassEffectStyle="regular" colorScheme="light" style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
              <Pressable
                onPress={reject}
                className="flex-row items-center justify-center active:opacity-80"
                style={{ flex: 1, height: 50, borderRadius: 999, gap: 6, borderWidth: 1.5, borderColor: "#ff3b30", backgroundColor: "rgba(255,59,48,0.06)" }}
              >
                <X size={16} color="#ff3b30" strokeWidth={2.6} />
                <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#ff3b30" }}>ปฏิเสธ</Text>
              </Pressable>
              <Pressable
                onPress={approve}
                className="flex-row items-center justify-center active:opacity-90"
                style={{ flex: 1.3, height: 50, borderRadius: 999, gap: 6, backgroundColor: BRAND_GREEN }}
              >
                <Check size={16} color="#fff" strokeWidth={2.8} />
                <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#fff" }}>อนุมัติคำขอ</Text>
              </Pressable>
            </GlassView>
          </View>
        </View>
      ) : null}

    </View>
  );
}
