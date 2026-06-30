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
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import {
  FlaskConical,
  CircleAlert,
  Clock,
  Check,
  Ban,
  Search,
  Users,
  Phone,
  MessageCircle,
  MapPin,
  Coins,
  Star,
  ThumbsUp,
  ThumbsDown,
  FileText,
  X,
  Sparkles,
} from "lucide-react-native";

import { BottomSheet } from "../../components/BottomSheet";
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
const STATUS_CFG: Record<
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

function portraitForApplicant(name: string, gender: string | undefined): string {
  const key = (gender || "unknown") as keyof typeof PORTRAIT_POOL;
  const pool = PORTRAIT_POOL[key] || PORTRAIT_POOL.unknown;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const id = pool[h % pool.length];
  return `https://images.unsplash.com/${id}?crop=faces&fit=crop&fm=jpg&w=200&h=200&q=80`;
}

/** th-TH short date — mirrors web new Date(...).toLocaleString("th-TH", {...}). */
function submittedLabelFor(ts: number): string {
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
        backgroundColor: active ? BRAND_GREEN : "transparent",
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
}: {
  reg: Registration;
  product: ApplicantsProduct;
  onApprove: () => void;
  onReject: () => void;
  onViewEval: () => void;
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

  /* -- Footer actions (status-dependent) -------------------------------- */
  let actions: React.ReactNode = null;
  if (status === "pending_approval") {
    actions = (
      <>
        <Pressable
          onPress={onReject}
          hitSlop={4}
          style={{
            borderWidth: 1,
            borderColor: "#ff3b30",
            height: 36,
            paddingHorizontal: 16,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <X size={14} color="#ff3b30" strokeWidth={2.4} />
          <Text style={{ fontSize: 13, color: "#ff3b30" }}>ปฏิเสธ</Text>
        </Pressable>
        <Pressable
          onPress={onApprove}
          hitSlop={4}
          style={{
            backgroundColor: BRAND_GREEN,
            height: 36,
            paddingHorizontal: 16,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Check size={14} color="#fff" strokeWidth={2.6} />
          <Text style={{ fontSize: 13, color: "#fff" }}>อนุมัติ</Text>
        </Pressable>
      </>
    );
  } else if (status === "approved") {
    actions = (
      <>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginRight: 8,
          }}
        >
          <Clock size={14} color="#b45309" strokeWidth={2.4} />
          <Text style={{ fontSize: 12, color: "#b45309", fontWeight: "500" }}>
            รอผู้ทดสอบส่งแบบประเมิน
          </Text>
        </View>
        <Pressable
          hitSlop={4}
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            height: 36,
            paddingHorizontal: 16,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Phone size={14} color="#374151" />
          <Text style={{ fontSize: 13, color: "#374151" }}>ติดต่อ</Text>
        </Pressable>
        <Pressable
          hitSlop={4}
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            height: 36,
            paddingHorizontal: 16,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <MessageCircle size={14} color="#374151" />
          <Text style={{ fontSize: 13, color: "#374151" }}>ส่งข้อความ</Text>
        </Pressable>
      </>
    );
  } else if (status === "evaluated") {
    actions = (
      <>
        {reg.evaluation && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginRight: 8,
            }}
          >
            <Star size={14} color="#fbbf24" fill="#fbbf24" strokeWidth={0} />
            <Text style={{ fontSize: 12, color: "#b45309", fontWeight: "600" }}>
              {reg.evaluation.overall}/5
            </Text>
            <Text style={{ fontSize: 12, color: "#9ca3af", marginHorizontal: 2 }}>
              ·
            </Text>
            {reg.evaluation.wouldRecommend ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
              >
                <ThumbsUp size={12} color={BRAND_GREEN} strokeWidth={2.4} />
                <Text style={{ fontSize: 12, color: BRAND_GREEN, fontWeight: "600" }}>
                  แนะนำ
                </Text>
              </View>
            ) : (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
              >
                <ThumbsDown size={12} color="#dc2626" strokeWidth={2.4} />
                <Text style={{ fontSize: 12, color: "#dc2626", fontWeight: "600" }}>
                  ไม่แนะนำ
                </Text>
              </View>
            )}
          </View>
        )}
        <Pressable
          onPress={reg.evaluation ? onViewEval : undefined}
          disabled={!reg.evaluation}
          hitSlop={4}
          style={{
            height: 36,
            paddingHorizontal: 16,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: reg.evaluation ? BRAND_GREEN : "#f3f4f6",
          }}
        >
          <FileText
            size={14}
            color={reg.evaluation ? "#fff" : "#9ca3af"}
            strokeWidth={2.4}
          />
          <Text
            style={{
              fontSize: 13,
              color: reg.evaluation ? "#fff" : "#9ca3af",
            }}
          >
            ดูแบบประเมิน
          </Text>
        </Pressable>
      </>
    );
  } else {
    // rejected
    actions = (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ban size={14} color="#6b7280" strokeWidth={2.4} />
        <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "500" }}>
          คำขอถูกปฏิเสธ
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#f3f4f6",
        overflow: "hidden",
      }}
    >
      {/* Header: avatar + name/phone + status pill | date */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 16,
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
            flexWrap: "wrap",
          }}
        >
          {hasName ? (
            <Image
              source={{ uri: portraitForApplicant(reg.name, reg.gender) }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: "rgba(49,151,84,0.15)",
              }}
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: "rgba(49,151,84,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 14, color: BRAND_GREEN, fontWeight: "700" }}>
                ?
              </Text>
            </View>
          )}
          <View style={{ minWidth: 0, flexShrink: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: hasName ? "#1a1a1a" : "#9ca3af",
                fontStyle: hasName ? "normal" : "italic",
              }}
            >
              {hasName ? reg.name.trim() : "ไม่ระบุชื่อ"}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}
            >
              <Phone size={12} color={hasPhone ? "#6b7280" : "#9ca3af"} strokeWidth={2.2} />
              <Text
                style={{
                  fontSize: 12,
                  color: hasPhone ? "#6b7280" : "#9ca3af",
                  fontStyle: hasPhone ? "normal" : "italic",
                }}
              >
                {hasPhone ? reg.phone.trim() : "ไม่ระบุเบอร์"}
              </Text>
            </View>
          </View>
          {/* status pill */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: cfg.pillBg,
            }}
          >
            <Text style={{ fontSize: 12, color: cfg.pillText, fontWeight: "500" }}>
              {cfg.label}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: "#6b7280" }}>{submittedLabel}</Text>
      </View>

      {/* Body: product row + address + motivation */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginTop: 8,
          gap: 12,
        }}
      >
        {/* Trial product row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: "#f9fafb",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              overflow: "hidden",
              backgroundColor: "#f3f4f6",
            }}
          >
            {imgSrc && (
              <Image source={imgSrc} style={{ width: 56, height: 56 }} />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
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
              numberOfLines={1}
              style={{ fontSize: 14, color: "#1a1a1a", fontWeight: "600" }}
            >
              {product.name || reg.trialId}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 12, color: "#6b7280" }}>
              {product.tagline}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 11, color: "#6b7280" }}>คะแนน</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <Coins size={14} color="#d97706" strokeWidth={2.4} />
              <Text style={{ fontSize: 14, color: "#d97706", fontWeight: "700" }}>
                +{(product.rewardPoints || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Address + Motivation — web is 2-col on md; phone stacks to 1 col. */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <MapPin size={14} color="#9ca3af" strokeWidth={2.2} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "500", marginBottom: 2 }}>
                ที่อยู่จัดส่ง
              </Text>
              <Text style={{ fontSize: 12.5, color: "#374151", lineHeight: 18 }}>
                {reg.address || "—"}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <MessageCircle size={14} color="#9ca3af" strokeWidth={2.2} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "500", marginBottom: 2 }}>
                เหตุผลในการขอ
              </Text>
              <Text numberOfLines={2} style={{ fontSize: 12.5, color: "#374151", lineHeight: 18 }}>
                {reg.motivation || "—"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer: actions */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: "#f3f4f6",
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          flexWrap: "wrap",
          backgroundColor: "rgba(249,250,251,0.3)",
        }}
      >
        {actions}
      </View>
    </View>
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
        <Image
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
  // Local mutable cohort copy so approve/reject works in the mockup.
  const [regs, setRegs] = useState<Registration[]>(() =>
    getRegistrationsForTrial(product.id, product.category)
      .slice()
      .sort((a, b) => b.submittedAt - a.submittedAt),
  );

  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [evalReg, setEvalReg] = useState<Registration | null>(null);

  const countByStatus = (s: RegistrationStatus) =>
    regs.filter((r) => getRegistrationStatus(r) === s).length;

  const filteredApplicants = useMemo(() => {
    let result = regs;
    if (filter !== "all")
      result = result.filter((r) => getRegistrationStatus(r) === filter);
    const q = search.trim().toLowerCase();
    if (q)
      result = result.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(q) ||
          (r.phone || "").includes(q),
      );
    return result;
  }, [regs, filter, search]);

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

  const reject = (reg: Registration) => {
    Alert.alert(
      "ปฏิเสธคำขอ",
      `ปฏิเสธคำขอของ "${reg.name || "ผู้สมัคร"}"?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ปฏิเสธ",
          style: "destructive",
          onPress: () =>
            setRegs((prev) =>
              prev.map((r) =>
                matchReg(reg)(r) ? { ...r, rejectedAt: Date.now() } : r,
              ),
            ),
        },
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
      {/* Filter pills row (horizontally scrollable on a phone) */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 999,
          padding: 4,
          // shadow ~ shadow-[0px_0px_6px_0px_rgba(0,0,0,0.08)]
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
          elevation: 1,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 4, alignItems: "center" }}
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
      </View>

      {/* Search box */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
          borderRadius: 999,
          paddingLeft: 16,
          paddingRight: 4,
          height: 36,
        }}
      >
        <TextInput
          style={{ flex: 1, fontSize: 13, color: "#171717", paddingVertical: 0 }}
          placeholder="ค้นหาชื่อ, เบอร์..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        <View
          style={{
            backgroundColor: BRAND_GREEN,
            width: 28,
            height: 28,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Search size={16} color="#fff" />
        </View>
      </View>

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
              onViewEval={() => setEvalReg(r)}
            />
          ))}
        </View>
      )}

      {/* Read-only evaluation sheet */}
      <BottomSheet
        visible={!!evalReg}
        onClose={() => setEvalReg(null)}
        title="แบบประเมินจากผู้ทดสอบ"
      >
        {evalReg && <EvalSummary reg={evalReg} product={product} />}
      </BottomSheet>
    </View>
  );
}
