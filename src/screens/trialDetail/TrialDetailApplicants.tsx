/**
 * TrialDetailApplicants — APPLICANTS (ผู้ทดลอง) tab of the owner trial detail screen.
 *
 * Ported from web TrialDetailPage applicants branch (OwnerTrialTabs.tsx @ L3182-3253)
 * + the shared RegistrationCard (@ L658-884) + STATUS_CFG (@ L651-656) +
 * portraitForApplicant/PORTRAIT_POOL (@ L3478-3520).
 *
 * Faithful port of:
 *   - the 5 filter pills (ทั้งหมด / รออนุมัติ / กำลังทดสอบ / ประเมินแล้ว / ปฏิเสธ) with
 *     live counts from getRegistrationStatus, active = solid green pill, red count badge,
 *   - the search box ("ค้นหาชื่อ, เบอร์...") filtering by name + phone,
 *   - the RegistrationCard list with per-status colors and approve / reject actions,
 *   - the empty state.
 *
 * RN translations from the web (React-DOM) source:
 *   - div→View, p/span→Text, img→Image, button→Pressable, motion.*→plain View/Pressable.
 *   - framer-motion layout/AnimatePresence animations dropped (mockup).
 *   - Approve/reject mutate a local useState copy of the cohort (no localStorage).
 *   - The read-only evaluation modal opens a BottomSheet with a lightweight summary
 *     (overall stars + recommend + per-criterion + comment) rather than the heavy
 *     web EvaluationView — keeps the row layout faithful without porting Recharts.
 *   - reject uses Alert.alert confirm (web used window.confirm).
 *   - The web "form completion progress" block is gated on product.evaluationDays,
 *     a field the mobile TrialProduct does not carry — so it never renders here.
 */

import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import {
  FlaskConical,
  CircleAlert,
  Clock,
  Check,
  Ban,
  Users,
  Phone,
  Coins,
  Star,
  ThumbsUp,
  ThumbsDown,
  FileText,
  X,
  Sparkles,
} from "lucide-react-native";

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/RootStack";
import {
  getRegistrationsForTrial,
  getRegistrationStatus,
  generateEvalQuestions,
  PHASE_META,
  type Registration,
  type RegistrationStatus,
  type EvalQuestion,
  type Phase,
} from "../../data/ownerTrialRegistrations";
import { BRAND_GREEN } from "../../theme/tokens";

/* ---------------------------------------------------------------------------
 *  Loose product shape — only the fields the card actually reads. Matches the
 *  mobile TrialProduct (which has no `evaluationDays`, so the web form-progress
 *  block is naturally absent).
 * ------------------------------------------------------------------------- */
export type ApplicantsProduct = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  image: string;
  imageSrc?: number;
  rewardPoints: number;
};

/* ---------------------------------------------------------------------------
 *  STATUS_CFG — ported VERBATIM (OwnerTrialTabs.tsx L651-656).
 * ------------------------------------------------------------------------- */
export const STATUS_CFG: Record<
  RegistrationStatus,
  { label: string; pillBg: string; pillText: string }
> = {
  pending_approval: { label: "รออนุมัติ", pillBg: "#ef4444", pillText: "#fff" },
  approved: { label: "กำลังทดสอบ", pillBg: "#f59e0b", pillText: "#fff" },
  evaluated: { label: "ประเมินแล้ว", pillBg: BRAND_GREEN, pillText: "#fff" },
  rejected: { label: "ปฏิเสธ", pillBg: "#6b7280", pillText: "#fff" },
};

/* ---------------------------------------------------------------------------
 *  portraitForApplicant + PORTRAIT_POOL — ported VERBATIM (L3478-3520) so each
 *  applicant gets the same stable Unsplash portrait as the web dashboard.
 * ------------------------------------------------------------------------- */
const PORTRAIT_POOL = {
  female: [
    "photo-1494790108377-be9c29b29330",
    "photo-1544005313-94ddf0286df2",
    "photo-1517841905240-472988babdf9",
    "photo-1438761681033-6461ffad8d80",
    "photo-1531746020798-e6953c6e8e04",
    "photo-1554151228-14d9def656e4",
    "photo-1567532939604-b6b5b0db2604",
    "photo-1564087709253-a83d5f4fdb3a",
  ],
  male: [
    "photo-1507003211169-0a1dd7228f2d",
    "photo-1472099645785-5658abf4ff4e",
    "photo-1506794778202-cad84cf45f1d",
    "photo-1500648767791-00dcc994a43e",
    "photo-1539571696357-5a69c17a67c6",
    "photo-1463453091185-61582044d556",
    "photo-1568602471122-7832951cc4c5",
    "photo-1545996124-0501ebae84d0",
  ],
  lgbtq: [
    "photo-1599566150163-29194dcaad36",
    "photo-1602233158242-3ba0ac4d2167",
    "photo-1531123897727-8f129e1688ce",
    "photo-1611002831541-da4bf2bc6164",
  ],
  unknown: [
    "photo-1535713875002-d1d0cf377fde",
    "photo-1502323777036-f29e3972d82f",
    "photo-1492562080023-ab3db95bfbce",
  ],
} as const;

export function portraitForApplicant(name: string, gender: string | undefined): string {
  const key = (gender || "unknown") as keyof typeof PORTRAIT_POOL;
  const pool = PORTRAIT_POOL[key] || PORTRAIT_POOL.unknown;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const id = pool[h % pool.length];
  return `https://images.unsplash.com/${id}?crop=faces&fit=crop&fm=jpg&w=200&h=200&q=80`;
}

/** th-TH short date — mirrors web new Date(...).toLocaleString("th-TH", {...}). */
export function submittedLabelFor(ts: number): string {
  try {
    return new Date(ts).toLocaleString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

/* ===========================================================================
 *  Filter pill — solid green when active (matches web layoutId fill).
 * ========================================================================= */
export function FilterPill({
  label,
  count,
  Icon,
  active,
  onPress,
}: {
  label: string;
  count: number;
  Icon: typeof FlaskConical;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        height: 36,
        paddingLeft: 6,
        paddingRight: 12,
        borderRadius: 999,
        backgroundColor: active ? BRAND_GREEN : "#fff",
        borderWidth: 1,
        borderColor: active ? BRAND_GREEN : "#e5e7eb",
      }}
    >
      {/* icon chip */}
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? "rgba(255,255,255,0.22)" : "#d6eadd",
        }}
      >
        <Icon size={14} color={active ? "#fff" : BRAND_GREEN} strokeWidth={2.2} />
      </View>
      <Text
        style={{
          fontSize: 13,
          color: active ? "#fff" : "#171717",
          fontWeight: active ? "600" : "500",
        }}
      >
        {label}
      </Text>
      {/* count badge */}
      <View
        style={{
          minWidth: 18,
          height: 18,
          paddingHorizontal: 6,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? "rgba(255,255,255,0.25)" : "#ff3b30",
        }}
      >
        <Text style={{ fontSize: 10, color: "#fff", fontWeight: "600" }}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

/* ===========================================================================
 *  RegistrationCard — ported from web (L658-884).
 * ========================================================================= */
export function RegistrationCard({
  reg,
  product,
  onApprove,
  onReject,
  onViewEval,
  onPress,
}: {
  reg: Registration;
  product: ApplicantsProduct;
  onApprove: () => void;
  onReject: () => void;
  onViewEval: () => void;
  /** Tap on the card body (e.g. open the trial's detail page). */
  onPress?: () => void;
}) {
  const status = getRegistrationStatus(reg);
  const cfg = STATUS_CFG[status];
  const submittedLabel = submittedLabelFor(reg.submittedAt);
  const hasName = !!reg.name?.trim();
  const hasPhone = !!reg.phone?.trim();
  const imgSrc = product.imageSrc
    ? product.imageSrc
    : product.image
      ? { uri: product.image }
      : undefined;

  /* -- Footer actions (status-dependent, compact) ------------------------ */
  let actions: React.ReactNode = null;
  if (status === "pending_approval") {
    actions = (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          onPress={onReject}
          hitSlop={4}
          className="active:opacity-80"
          style={{ flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: "#ff3b30", height: 32, paddingHorizontal: 14, borderRadius: 999 }}
        >
          <X size={13} color="#ff3b30" strokeWidth={2.4} />
          <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#ff3b30" }}>ปฏิเสธ</Text>
        </Pressable>
        <Pressable
          onPress={onApprove}
          hitSlop={4}
          className="active:opacity-90"
          style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: BRAND_GREEN, height: 32, paddingHorizontal: 14, borderRadius: 999 }}
        >
          <Check size={13} color="#fff" strokeWidth={2.6} />
          <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#fff" }}>อนุมัติ</Text>
        </Pressable>
      </View>
    );
  } else if (status === "approved") {
    actions = (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Clock size={13} color="#b45309" strokeWidth={2.4} />
        <Text style={{ fontSize: 12, color: "#b45309", fontWeight: "500" }}>รอผู้ทดสอบส่งแบบประเมิน</Text>
      </View>
    );
  } else if (status === "evaluated") {
    actions = (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {reg.evaluation ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            {reg.evaluation.wouldRecommend ? (
              <ThumbsUp size={13} color={BRAND_GREEN} strokeWidth={2.4} />
            ) : (
              <ThumbsDown size={13} color="#dc2626" strokeWidth={2.4} />
            )}
            <Text style={{ fontSize: 12, fontWeight: "600", color: reg.evaluation.wouldRecommend ? BRAND_GREEN : "#dc2626" }}>
              {reg.evaluation.wouldRecommend ? "แนะนำ" : "ไม่แนะนำ"}
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={reg.evaluation ? onViewEval : undefined}
          disabled={!reg.evaluation}
          hitSlop={4}
          className="active:opacity-80"
          style={{ flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: BRAND_GREEN, height: 32, paddingHorizontal: 14, borderRadius: 999, opacity: reg.evaluation ? 1 : 0.4 }}
        >
          <FileText size={13} color={BRAND_GREEN} strokeWidth={2.4} />
          <Text style={{ fontSize: 12.5, fontWeight: "600", color: BRAND_GREEN }}>ดูแบบประเมิน</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="active:opacity-90"
      style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}
    >
      {/* Header — avatar | name + phone | status pill (tinted, peer style) */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {hasName ? (
          <Image resizeMethod="resize"
            source={{ uri: portraitForApplicant(reg.name, reg.gender) }}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#f3f4f6" }}
          />
        ) : (
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 16, color: BRAND_GREEN, fontWeight: "700" }}>?</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: hasName ? "#0a0a0a" : "#9ca3af" }}>
            {hasName ? reg.name.trim() : "ไม่ระบุชื่อ"}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: "#737373", marginTop: 2 }}>
            {hasPhone ? reg.phone.trim() : "ไม่ระบุเบอร์"}
          </Text>
        </View>
        <View style={{ backgroundColor: cfg.pillBg + "1a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: cfg.pillBg }}>{cfg.label}</Text>
        </View>
      </View>

      {/* Product line — image + name + reward */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, backgroundColor: "#f9fafb", borderRadius: 12, padding: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
          {imgSrc && <Image resizeMethod="resize" source={imgSrc} style={{ width: 40, height: 40 }} />}
        </View>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: "600", color: "#374151" }}>
          {product.name || reg.trialId}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Coins size={13} color="#d97706" strokeWidth={2.4} />
          <Text style={{ fontSize: 12.5, color: "#d97706", fontWeight: "700" }}>+{(product.rewardPoints || 0).toLocaleString()}</Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Footer — submitted date left · actions right */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <Text style={{ fontSize: 11.5, color: "#9ca3af" }}>{submittedLabel}</Text>
        {actions}
      </View>
    </Pressable>
  );
}

/* ===========================================================================
 *  EvaluationView — full Tester answer replay, ported 1:1 from the web
 *  EvaluationModal.tsx (getFormQuestions → groupIntoForms → ReadOnlyAnswer).
 * ========================================================================= */
const DEFAULT_OBJECTIVES = ["efficacy", "packaging", "market", "formula_ab"] as const;

function ratingLabel(r: number): string {
  if (r === 5) return "ดีมาก";
  if (r === 4) return "ดี";
  if (r === 3) return "พอใช้";
  if (r === 2) return "ต้องปรับปรุง";
  return "ควรปรับปรุงมาก";
}

function getFormQuestionsM(category: string): EvalQuestion[] {
  const phases: Phase[] = ["baseline", "after_full"];
  return generateEvalQuestions([...DEFAULT_OBJECTIVES], category).filter(
    (q) => q.phase !== "first_use" && (q.phase === "always" || phases.includes(q.phase)),
  );
}

function groupFormsM(questions: EvalQuestion[]) {
  const groups: Record<Phase, EvalQuestion[]> = { baseline: [], first_use: [], after_full: [], always: [] };
  questions.forEach((q) => groups[q.phase].push(q));
  const always = groups.always;
  const selected = (["baseline", "after_full"] as Phase[]).filter((ph) => groups[ph].length > 0);
  const lastIdx = selected.length - 1;
  return selected.map((ph, idx) => ({
    phase: ph,
    meta: PHASE_META[ph],
    timing: ph === "baseline" ? "ส่งทันทีหลังจัดส่งสินค้า" : "ส่งหลังใช้สินค้าครบกำหนด",
    questions: [...groups[ph], ...(idx === lastIdx ? always : [])],
  }));
}

function FormHeaderM({ formNum, totalForms, label, timing, color, count }: { formNum: number; totalForms: number; label: string; timing: string; color: string; count: number }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 16, paddingVertical: 12, overflow: "hidden" }}>
      <Sparkles size={56} color="rgba(255,255,255,0.12)" strokeWidth={1.5} style={{ position: "absolute", top: -8, right: -8 }} />
      <View className="flex-row items-start justify-between" style={{ gap: 10 }}>
        <View className="flex-row items-center" style={{ gap: 9, flex: 1, minWidth: 0 }}>
          <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}>
            <FileText size={15} color="#fff" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontWeight: "600", letterSpacing: 0.4 }}>ฟอร์มที่ {formNum} / {totalForms}</Text>
            <Text style={{ fontSize: 14, color: "#fff", fontWeight: "700" }}>{label}</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 3 }}>
          <View className="flex-row items-center" style={{ gap: 4, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
            <Clock size={11} color="#fff" strokeWidth={2.4} />
            <Text style={{ fontSize: 10, color: "#fff" }}>{timing}</Text>
          </View>
          <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>{count} คำถาม</Text>
        </View>
      </View>
    </View>
  );
}

const NO_ANSWER = <Text style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>ยังไม่ได้ตอบ</Text>;

function ReadOnlyAnswerBodyM({ q, accent, ev }: { q: EvalQuestion; accent: string; ev: Registration["evaluation"] }) {
  if (!ev) return NO_ANSWER;
  switch (q.type) {
    case "scale_1_5": {
      const v = ev.scoreById?.[q.id] ?? ev.criteria?.[q.label] ?? 0;
      if (!v) return NO_ANSWER;
      return (
        <View className="flex-row items-center" style={{ gap: 6, flexWrap: "wrap" }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const active = n === Math.round(v);
            return (
              <View key={n} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: active ? accent : "#e5e7eb", backgroundColor: active ? accent : "#fff", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: active ? "700" : "600", color: active ? "#fff" : "#9ca3af" }}>{n}</Text>
              </View>
            );
          })}
          <Text style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>(1 = น้อย, 5 = มาก)</Text>
        </View>
      );
    }
    case "stars_1_5": {
      const v = q.id === "core_overall" ? ev.overall : ev.scoreById?.[q.id] ?? 0;
      if (!v) return NO_ANSWER;
      return (
        <View className="flex-row items-center" style={{ gap: 2 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={22} color={n <= v ? "#f59e0b" : "#e5e7eb"} fill={n <= v ? "#f59e0b" : "#e5e7eb"} strokeWidth={0} />
          ))}
          <Text style={{ fontSize: 12, color: "#b45309", fontWeight: "700", marginLeft: 6 }}>{v}/5 · {ratingLabel(Math.round(v))}</Text>
        </View>
      );
    }
    case "nps_0_10": {
      const v = ev.npsScores?.[q.id];
      if (typeof v !== "number") return NO_ANSWER;
      const seg = v <= 6 ? { label: "Detractor", color: "#ef4444" } : v <= 8 ? { label: "Passive", color: "#f59e0b" } : { label: "Promoter", color: "#319754" };
      return (
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: seg.color, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{v}</Text>
          </View>
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: `${seg.color}15` }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: seg.color }}>{seg.label}</Text>
          </View>
        </View>
      );
    }
    case "multiple_choice": {
      const v = ev.mcAnswers?.[q.id];
      if (!v) return NO_ANSWER;
      return (
        <View style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: `${accent}12` }}>
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: accent }}>✓ {v}</Text>
        </View>
      );
    }
    case "tag": {
      const v = ev.tagAnswers?.[q.id];
      if (!v || v.length === 0) return NO_ANSWER;
      return (
        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {v.map((t) => (
            <View key={t} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: `${accent}15` }}>
              <Text style={{ fontSize: 11.5, fontWeight: "600", color: accent }}>{t}</Text>
            </View>
          ))}
        </View>
      );
    }
    case "conditional": {
      const v = ev.conditionalAnswers?.[q.id];
      if (!v) return NO_ANSWER;
      const color = v.has ? "#ef4444" : "#319754";
      return (
        <View style={{ gap: 8 }}>
          <View style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: `${color}15` }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color }}>{v.has ? "⚠ มี" : "✓ ไม่มี"}</Text>
          </View>
          {v.has && v.note ? (
            <View style={{ backgroundColor: "rgba(254,242,242,0.6)", borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontSize: 12, color: "#374151", fontStyle: "italic", lineHeight: 17 }}>"{v.note}"</Text>
            </View>
          ) : null}
        </View>
      );
    }
    case "text": {
      const v = q.id === "core_text" ? ev.comment : ev.textAnswers?.[q.id];
      if (!v) return NO_ANSWER;
      return (
        <View style={{ backgroundColor: "#f9fafb", borderRadius: 8, borderWidth: 1, borderColor: "#f0f0f0", padding: 12 }}>
          <Text style={{ fontSize: 12.5, color: "#374151", lineHeight: 19 }}>"{v}"</Text>
        </View>
      );
    }
    case "ab_choice": {
      const v = ev.abChoices?.[q.id];
      if (!v) return NO_ANSWER;
      const color = v === "A" ? "#3b82f6" : "#319754";
      return (
        <View style={{ alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10, backgroundColor: color }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>✓ สูตร {v}</Text>
        </View>
      );
    }
    default:
      return NO_ANSWER;
  }
}

function ReadOnlyAnswerM({ q, idx, accent, ev }: { q: EvalQuestion; idx: number; accent: string; ev: Registration["evaluation"] }) {
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f0f0f0", padding: 14 }}>
      <View className="flex-row items-start" style={{ gap: 8, marginBottom: 12 }}>
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: `${accent}15`, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 10.5, fontWeight: "700", color: accent }}>{idx + 1}</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 13.5, color: "#1a1a1a", fontWeight: "500", lineHeight: 19 }}>{q.label}</Text>
      </View>
      <ReadOnlyAnswerBodyM q={q} accent={accent} ev={ev} />
    </View>
  );
}

function EvaluationFormReplay({ evaluation, product }: { evaluation: Registration["evaluation"]; product: ApplicantsProduct }) {
  const forms = useMemo(() => groupFormsM(getFormQuestionsM(product.category)), [product.category]);
  return (
    <View style={{ gap: 16 }}>
      {forms.map((f, i) => (
        <View key={f.phase} style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#f0f0f0" }}>
          <FormHeaderM formNum={i + 1} totalForms={forms.length} label={f.meta.label} timing={f.timing} color={f.meta.color} count={f.questions.length} />
          <View style={{ backgroundColor: "#fafafa", padding: 14, gap: 10 }}>
            {f.questions.map((q, idx) => (
              <ReadOnlyAnswerM key={q.id} q={q} idx={idx} accent={f.meta.color} ev={evaluation} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/* ===========================================================================
 *  Evaluation summary (BottomSheet body) — full read-only form replay.
 * ========================================================================= */
export function EvalSummary({
  reg,
  product,
}: {
  reg: Registration;
  product: ApplicantsProduct;
}) {
  const ev = reg.evaluation;
  if (!ev) return null;
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* applicant + product header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Image resizeMethod="resize"
          source={{ uri: portraitForApplicant(reg.name || "?", reg.gender) }}
          style={{ width: 44, height: 44, borderRadius: 10 }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11, color: BRAND_GREEN, fontWeight: "600", letterSpacing: 0.4 }}>
            แบบประเมินจากผู้ทดสอบ
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 15, color: "#1a1a1a", fontWeight: "700" }}>
            {reg.name || "ไม่ระบุชื่อ"}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 11, color: "#6b7280" }}>
            {product.name}
          </Text>
        </View>
      </View>

      {/* Full Tester-answer replay — every question grouped by phase (web EvaluationView) */}
      <EvaluationFormReplay evaluation={ev} product={product} />
    </ScrollView>
  );
}

/* ===========================================================================
 *  Main tab.
 * ========================================================================= */
type FilterKey = "all" | RegistrationStatus;

export function TrialDetailApplicants({ product }: { product: ApplicantsProduct }) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Local mutable cohort copy so approve/reject works in the mockup.
  const [regs, setRegs] = useState<Registration[]>(() =>
    getRegistrationsForTrial(product.id, product.category)
      .slice()
      .sort((a, b) => b.submittedAt - a.submittedAt),
  );

  const [filter, setFilter] = useState<FilterKey>("all");

  const countByStatus = (s: RegistrationStatus) =>
    regs.filter((r) => getRegistrationStatus(r) === s).length;

  const filteredApplicants = useMemo(() => {
    if (filter === "all") return regs;
    return regs.filter((r) => getRegistrationStatus(r) === filter);
  }, [regs, filter]);

  const matchReg = (target: Registration) => (r: Registration) =>
    r.trialId === target.trialId &&
    r.name === target.name &&
    r.submittedAt === target.submittedAt;

  const approve = (reg: Registration) => {
    setRegs((prev) =>
      prev.map((r) =>
        matchReg(reg)(r) ? { ...r, approvedAt: Date.now() } : r,
      ),
    );
  };

  // Silent state update — the caller (list Alert / detail page) confirms first.
  const doReject = (reg: Registration) =>
    setRegs((prev) =>
      prev.map((r) => (matchReg(reg)(r) ? { ...r, rejectedAt: Date.now() } : r)),
    );

  const reject = (reg: Registration) => {
    Alert.alert(
      "ปฏิเสธคำขอ",
      `ปฏิเสธคำขอของ "${reg.name || "ผู้สมัคร"}"?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ปฏิเสธ", style: "destructive", onPress: () => doReject(reg) },
      ],
    );
  };

  const pills: { key: FilterKey; label: string; count: number; Icon: typeof FlaskConical }[] = [
    { key: "all", label: "ทั้งหมด", count: regs.length, Icon: FlaskConical },
    { key: "pending_approval", label: "รออนุมัติ", count: countByStatus("pending_approval"), Icon: CircleAlert },
    { key: "approved", label: "กำลังทดสอบ", count: countByStatus("approved"), Icon: Clock },
    { key: "evaluated", label: "ประเมินแล้ว", count: countByStatus("evaluated"), Icon: Check },
    { key: "rejected", label: "ปฏิเสธ", count: countByStatus("rejected"), Icon: Ban },
  ];

  return (
    <View style={{ gap: 16 }}>
      {/* Status filter — standalone chips (white pill + border + count badge),
          full-bleed scroll row like the other list pages' filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: "center" }}
      >
        {pills.map((p) => (
          <FilterPill
            key={p.key}
            label={p.label}
            count={p.count}
            Icon={p.Icon}
            active={filter === p.key}
            onPress={() => setFilter(p.key)}
          />
        ))}
      </ScrollView>

      {/* Card list / empty state */}
      {filteredApplicants.length === 0 ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: "#e5e7eb",
            padding: 40,
            alignItems: "center",
          }}
        >
          <Users size={40} color="#d1d5db" strokeWidth={1.5} />
          <Text style={{ fontSize: 13, color: "#6b7280", fontWeight: "500", marginTop: 8 }}>
            ไม่มีรายการที่ตรงกับเงื่อนไข
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filteredApplicants.map((r, i) => (
            <RegistrationCard
              key={`${r.name}-${r.submittedAt}-${i}`}
              reg={r}
              product={product}
              onApprove={() => approve(r)}
              onReject={() => reject(r)}
              onViewEval={() => nav.navigate("OwnerTrialEvalAnswers", { reg: r, product })}
              onPress={() =>
                nav.navigate("OwnerTrialRequestDetail", {
                  reg: r,
                  product,
                  onApprove: () => approve(r),
                  onReject: () => doReject(r),
                })
              }
            />
          ))}
        </View>
      )}

    </View>
  );
}
