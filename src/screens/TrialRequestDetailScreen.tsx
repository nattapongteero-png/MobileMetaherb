import { View, Text, Image, Pressable, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Store,
  Check,
  X,
  Truck,
  Clock,
  MapPin,
  Calendar,
  FileText,
  ClipboardCheck,
  Coins,
  Star,
  type LucideIcon,
} from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BottomFade } from "../components/BottomFade";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import { TRIAL_PRODUCTS } from "./TrialProductsScreen";
import { STAGE_META, nextEval, fmtTrialDate } from "../data/trialRegistrations";
import { useTrials } from "../context/TrialContext";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Detail = RouteProp<RootStackParamList, "TrialRequestDetail">;

function imgSource(src: number | string | undefined): any {
  return typeof src === "number" ? src : { uri: src };
}

function ratingLabel(r: number): string {
  return r >= 5 ? "ดีมาก" : r === 4 ? "ดี" : r === 3 ? "พอใช้" : r === 2 ? "ต้องปรับปรุง" : "ควรปรับปรุงมาก";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", marginBottom: 12 }}>{title}</Text>
      {children}
    </View>
  );
}

type Step = { label: string; desc: string; state: "done" | "active" | "todo" | "rejected" };

export function TrialRequestDetailScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { id } = useRoute<Detail>().params;
  const { getRegistration } = useTrials();

  const reg = getRegistration(id);
  const product = reg ? TRIAL_PRODUCTS.find((p) => p.id === reg.trialId) : undefined;

  if (!reg || !product) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <StatusBar style="dark" />
        <SubPageHeader title="รายละเอียดการสมัคร" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: TEXT_MUTED }}>ไม่พบรายการนี้</Text>
        </View>
      </View>
    );
  }

  const stage = STAGE_META[reg.stage];
  const evalKind = nextEval(reg);

  // Build the lifecycle timeline. Rejected branches off after the application step.
  const steps: Step[] =
    reg.stage === "rejected"
      ? [
          { label: "ส่งใบสมัคร", desc: fmtTrialDate(reg.submittedAt), state: "done" },
          { label: "ถูกปฏิเสธจากร้านค้า", desc: reg.rejectReason ?? "คำขอไม่ผ่านการพิจารณา", state: "rejected" },
        ]
      : (() => {
          const cur = { pending_approval: 1, shipping: 2, testing: 3, completed: 5 }[reg.stage] ?? 0;
          const base: { label: string; desc: string }[] = [
            { label: "ส่งใบสมัคร", desc: fmtTrialDate(reg.submittedAt) },
            { label: "ร้านค้าอนุมัติ", desc: "ร้านตรวจสอบคุณสมบัติผู้ทดสอบ" },
            { label: "จัดส่งสินค้า", desc: reg.trackingNumber ? `เลขพัสดุ ${reg.trackingNumber}` : "ร้านจัดส่งสินค้าทดลอง" },
            { label: "เริ่มทดลองใช้ + ทำแบบประเมิน", desc: "ทำแบบประเมินก่อน/หลังใช้งาน" },
            { label: "เสร็จสิ้น", desc: "ปิดการทดสอบเรียบร้อย" },
          ];
          return base.map((s, i) => ({
            ...s,
            state: i < cur ? "done" : i === cur ? "active" : "todo",
          }));
        })();

  const openEval = (kind: "pre" | "post") => nav.navigate("TrialEval", { id, kind });
  const onTrack = () => Alert.alert("กำลังพัฒนา", "การติดตามพัสดุกำลังพัฒนา");
  const goToTrials = () => nav.navigate("TrialProducts");

  // Stage-driven floating action (none for pending / completed).
  const action: { label: string; Icon: LucideIcon; onPress: () => void } | null =
    reg.stage === "shipping"
      ? { label: "ติดตามพัสดุ", Icon: Truck, onPress: onTrack }
      : reg.stage === "testing"
        ? {
            label: evalKind === "pre" ? "ทำแบบประเมินก่อนใช้" : "ทำแบบประเมินหลังใช้",
            Icon: evalKind === "pre" ? ClipboardCheck : FileText,
            onPress: () => openEval(evalKind === "pre" ? "pre" : "post"),
          }
        : reg.stage === "rejected"
          ? { label: "ดูสินค้าทดสอบอื่น", Icon: Store, onPress: goToTrials }
          : null;

  const showSurvey = reg.stage === "testing" || reg.stage === "completed";

  // Summary answers from the after-use form (overall feeds the product rating).
  const ev = reg.evaluation;
  const npsSeg =
    ev?.nps == null
      ? null
      : ev.nps <= 6
        ? { label: "Detractor", color: "#ef4444" }
        : ev.nps <= 8
          ? { label: "Passive", color: "#f59e0b" }
          : { label: "Promoter", color: "#319754" };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="รายละเอียดการสมัคร"
        subtitle={`สมัคร ${fmtTrialDate(reg.submittedAt)}`}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: action ? 120 + insets.bottom : 32 }}>
          {/* Product + shop + stage */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                  <Store size={14} color="#fff" strokeWidth={2.4} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>
                  {product.studioName ?? "METAHERB Store"}
                </Text>
              </View>
              <View style={{ backgroundColor: stage.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: stage.tint }}>{stage.label}</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 14 }}>
              <Image
                source={imgSource(product.imageSrc ?? product.image)}
                style={{ width: 84, height: 84, borderRadius: 12, backgroundColor: "#f3f4f6" }}
              />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#1a1a1a" }} numberOfLines={2}>{product.name}</Text>
                <Text style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 17 }} numberOfLines={3}>{product.tagline}</Text>
              </View>
            </View>
          </View>

          {/* Status timeline */}
          <Section title="สถานะการสมัคร">
            <View>
              {steps.map((s, i) => {
                const isLast = i === steps.length - 1;
                const isDone = s.state === "done";
                const isRejected = s.state === "rejected";
                const isActive = s.state === "active";
                const dotColor = isDone ? BRAND_GREEN : isRejected ? "#dc2626" : isActive ? stage.tint : "#d4d4d8";
                const Icon = isRejected ? X : isDone ? Check : null;
                return (
                  <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                    {/* dot + connector */}
                    <View style={{ alignItems: "center", width: 24 }}>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isDone || isRejected ? dotColor : "transparent",
                          borderWidth: isDone || isRejected ? 0 : 2,
                          borderColor: dotColor,
                        }}
                      >
                        {Icon ? <Icon size={14} color="#fff" strokeWidth={3} /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />}
                      </View>
                      {!isLast ? <View style={{ flex: 1, width: 2, backgroundColor: isDone ? BRAND_GREEN : "#e5e7eb", marginVertical: 2, minHeight: 22 }} /> : null}
                    </View>
                    {/* labels */}
                    <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                      <Text style={{ fontSize: 14, fontWeight: isActive || isRejected ? "700" : "600", color: isDone || isActive ? "#0a0a0a" : isRejected ? "#dc2626" : "#9ca3af" }}>
                        {s.label}
                      </Text>
                      <Text style={{ fontSize: 12.5, color: isRejected ? "#dc2626" : TEXT_MUTED, marginTop: 2, lineHeight: 17 }}>{s.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Section>

          {/* Reason given when applying */}
          {reg.reason ? (
            <Section title="เหตุผลในการขอทดลอง">
              <Text style={{ fontSize: 13.5, color: "#0a0a0a", lineHeight: 21 }}>{reg.reason}</Text>
            </Section>
          ) : null}

          {/* Survey progress */}
          {showSurvey ? (
            <Section title="แบบประเมิน">
              <View style={{ gap: 12 }}>
                {reg.hasPreEval ? <SurveyRow label="แบบประเมินก่อนใช้งาน" done={!!reg.preEvalDone} /> : null}
                <SurveyRow label="แบบประเมินหลังใช้งาน" done={!!reg.postEvalDone} />
              </View>
            </Section>
          ) : null}

          {/* Evaluation summary — overall / NPS / comment (overall feeds the product rating) */}
          {ev ? (
            <Section title="ผลการประเมิน">
              {/* Overall satisfaction — hero block (this score feeds the product rating) */}
              <View style={{ alignItems: "center", gap: 7, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ความพึงพอใจโดยรวม</Text>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={28} color={n <= ev.overall ? "#f59e0b" : "#e5e7eb"} fill={n <= ev.overall ? "#f59e0b" : "transparent"} strokeWidth={2} />
                  ))}
                </View>
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#b45309" }}>{ev.overall}/5 · {ratingLabel(ev.overall)}</Text>
              </View>

              {/* NPS */}
              {typeof ev.nps === "number" && npsSeg ? (
                <>
                  <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 14 }} />
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, color: "#0a0a0a", fontWeight: "500" }}>แนะนำให้คนอื่น</Text>
                      <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>คะแนน NPS (0–10)</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: npsSeg.color, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: "#fff" }}>{ev.nps}</Text>
                      </View>
                      <View style={{ backgroundColor: npsSeg.color + "1a", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: npsSeg.color }}>{npsSeg.label}</Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : null}

              {/* Comment */}
              {ev.comment ? (
                <>
                  <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 14 }} />
                  <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginBottom: 7 }}>คำแนะนำเพิ่มเติม</Text>
                  <View style={{ flexDirection: "row", gap: 8, backgroundColor: "#f7f7f8", borderRadius: 12, padding: 12 }}>
                    <View style={{ width: 3, borderRadius: 2, backgroundColor: "#d4d4d8" }} />
                    <Text style={{ flex: 1, fontSize: 13.5, color: "#0a0a0a", lineHeight: 21 }}>{ev.comment}</Text>
                  </View>
                </>
              ) : null}
            </Section>
          ) : null}

          {/* Reward earned — only once the trial is fully completed */}
          {reg.stage === "completed" ? (
            <Section title="คะแนนสะสม">
              <View
                style={{
                  borderRadius: 20,
                  overflow: "hidden",
                  shadowColor: "#d97706",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.22,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <LinearGradient colors={["#fcd34d", "#f59e0b", "#d97706"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
                  {/* Decorative coins glow */}
                  <View pointerEvents="none" style={{ position: "absolute", top: -34, right: -22, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.14)" }} />
                  <View pointerEvents="none" style={{ position: "absolute", bottom: -42, left: 24, width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(255,255,255,0.10)" }} />

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.25)", borderWidth: 1, borderColor: "rgba(255,255,255,0.45)", alignItems: "center", justifyContent: "center" }}>
                      <Coins size={28} color="#fff" strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.92)", fontWeight: "600" }}>ได้รับคะแนนแล้ว</Text>
                      <Text style={{ fontSize: 30, fontWeight: "800", color: "#fff", marginTop: 1 }}>
                        +{product.rewardPoints.toLocaleString()} <Text style={{ fontSize: 16, fontWeight: "700" }}>คะแนน</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
                    <Check size={13} color="#fff" strokeWidth={3} />
                    <Text style={{ fontSize: 12.5, color: "#fff", fontWeight: "600" }}>เข้าบัญชีคะแนนสะสมแล้ว</Text>
                  </View>
                </LinearGradient>
              </View>
            </Section>
          ) : null}

          {/* Shipping */}
          <Section title="ข้อมูลการจัดส่ง">
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <MapPin size={15} color={BRAND_GREEN} strokeWidth={2.2} style={{ marginTop: 1 }} />
                <Text style={{ fontSize: 13.5, color: "#0a0a0a", flex: 1, lineHeight: 19 }}>{reg.address}</Text>
              </View>
              {reg.trackingNumber ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Truck size={15} color={BRAND_GREEN} strokeWidth={2.2} />
                  <Text style={{ fontSize: 13.5, color: "#0a0a0a" }}>เลขพัสดุ {reg.trackingNumber}</Text>
                </View>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Calendar size={15} color={BRAND_GREEN} strokeWidth={2.2} />
                <Text style={{ fontSize: 13.5, color: "#0a0a0a" }}>วันที่สมัคร {fmtTrialDate(reg.submittedAt)}</Text>
              </View>
            </View>
          </Section>
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <BottomFade />

        {/* Floating Liquid Glass action bar (stage-driven) */}
        {action ? (
          <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
            <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
              <GlassView glassEffectStyle="regular" colorScheme="light" style={{ borderRadius: 34, overflow: "hidden", padding: 9 }}>
                <Pressable
                  onPress={action.onPress}
                  className="active:opacity-90"
                  style={{ height: 50, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, backgroundColor: BRAND_GREEN }}
                >
                  <action.Icon size={17} color="#fff" strokeWidth={2.6} />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{action.label}</Text>
                </Pressable>
              </GlassView>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SurveyRow({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: done ? "rgba(49,151,84,0.12)" : "rgba(180,83,9,0.12)" }}>
        {done ? <Check size={15} color={BRAND_GREEN} strokeWidth={2.8} /> : <Clock size={15} color="#b45309" strokeWidth={2.4} />}
      </View>
      <Text style={{ fontSize: 14, color: "#0a0a0a", flex: 1, fontWeight: "500" }}>{label}</Text>
      <Text style={{ fontSize: 12.5, fontWeight: "600", color: done ? BRAND_GREEN_DARK : "#b45309" }}>{done ? "เสร็จแล้ว" : "ยังไม่ทำ"}</Text>
    </View>
  );
}
