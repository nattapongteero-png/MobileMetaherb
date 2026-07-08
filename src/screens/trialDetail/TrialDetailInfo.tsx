/**
 * TrialDetailInfo — INFO (ข้อมูลสินค้า) tab of the owner trial detail screen.
 *
 * Full port of the web TrialDetailPage info branch (OwnerTrialTabs.tsx L3255+):
 *   1. ข้อมูลพื้นฐาน   (ชื่อสินค้า / หมวดหมู่ / Studio / Tagline)
 *   2. เงื่อนไขการทดสอบ (จำนวนที่นั่ง / ระยะเวลาทดสอบ / คะแนนตอบแทน)
 *   3. รายละเอียดสินค้า (rich detail rows — shared TRIAL_EXTRAS content)
 *   4. แบบประเมิน Tester (document card: form chips + per-form question lists,
 *      Eye → พรีวิวแบบประเมิน page)
 */

import { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Clock, Eye, FileText } from "lucide-react-native";
import {
  generateEvalQuestions,
  PHASE_META,
  type TestObjective,
  type Phase,
  type EvalQuestion,
} from "../../data/ownerTrialRegistrations";
import { getTrialRichDetail } from "../TrialDetailScreen";
import { CATEGORY_TO_TEMPLATE } from "../TrialAddProductScreen";
import type { RootStackParamList } from "../../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const GREEN = "#319754";

/** Loose shape — the parent passes the full TrialProduct. */
export type TrialDetailInfoProduct = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  studioName?: string;
  spotsTotal: number;
  /** Mobile carries spotsTaken; spotsLeft is derived. */
  spotsTaken?: number;
  spotsLeft?: number;
  endsInDays: number;
  rewardPoints: number;
  testObjectives?: TestObjective[];
  activePhases?: ("baseline" | "after_full")[];
  evaluationDays?: number;
  detail?: {
    productInfo?: { label: string; value: string }[];
  };
};

/** Web: bg-white rounded-2xl border border-gray-100 p-4. */
function InfoCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16, // rounded-2xl
        borderWidth: 1,
        borderColor: "#f3f4f6", // gray-100
        padding: 16, // p-4
      }}
    >
      {/* title — text-[12px] text-gray-500 uppercase tracking-wide mb-3, weight 600 */}
      <Text
        style={{
          fontSize: 12,
          color: "#6b7280", // gray-500
          textTransform: "uppercase",
          letterSpacing: 0.6, // tracking-wide
          marginBottom: 12, // mb-3
          fontWeight: "600",
        }}
      >
        {title}
      </Text>

      {/* Web is a 2-col grid on sm+; on a 430px phone we stack to 1 col. */}
      <View style={{ gap: 10 }}>
        {rows.map((r) => (
          <View key={r.label}>
            <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "500" }}>
              {r.label}
            </Text>
            <Text
              style={{
                fontSize: 12.5,
                color: "#1a1a1a",
                marginTop: 2,
                fontWeight: "500",
              }}
            >
              {r.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function TrialDetailInfo({ product }: { product: TrialDetailInfoProduct }) {
  const nav = useNavigation<Nav>();

  // Web derives spotsLeft from real registrations; mobile carries spotsTaken.
  const spotsLeft =
    product.spotsLeft ??
    Math.max(0, product.spotsTotal - (product.spotsTaken ?? 0));

  // Rich detail rows — the product's own data first, then the shared
  // TRIAL_EXTRAS content the customer detail page uses; finally a
  // deterministic mock set so the card is never missing.
  const batchNo = `MH-2569-${(product.id.replace(/\D/g, "") || "0").padStart(2, "0")}`;
  // ปริมาณสุทธิ mock per category (web rows include net volume).
  const NET_BY_CATEGORY: Record<string, string> = {
    "เครื่องสำอาง": "30 ml",
    "สุขภาพ / อาหารเสริม": "60 แคปซูล",
    "อโรมา / เครื่องหอม": "10 ml",
    "อาหาร / เครื่องดื่ม": "250 ml",
    "อุปกรณ์ / เครื่องมือ": "1 ชิ้น",
  };
  const productInfo =
    product.detail?.productInfo ??
    getTrialRichDetail(product.id)?.productInfo ?? [
      { label: "ชื่อสินค้า", value: product.name },
      { label: "แบรนด์", value: product.studioName ?? "METAHERB Store" },
      { label: "ผู้พัฒนา", value: "ดร. วรรณา สุขสม" },
      { label: "ประเภท", value: product.category },
      { label: "ปริมาณสุทธิ", value: NET_BY_CATEGORY[product.category] ?? "1 ชิ้น" },
      { label: "วันที่ผลิต", value: "มีนาคม 2569" },
      { label: "วันหมดอายุ", value: "มีนาคม 2571" },
      { label: "รหัส Batch", value: batchNo },
    ];

  /* ── แบบประเมิน Tester — web previewForms derivation ──
     Built-in mocks carry no eval setup, so fall back to the category's
     objective template (the same suggestion the add-form uses). */
  const objectives = product.testObjectives ?? CATEGORY_TO_TEMPLATE[product.category] ?? ["efficacy", "market"];
  const phases: ("baseline" | "after_full")[] =
    product.activePhases && product.activePhases.length > 0 ? product.activePhases : ["baseline", "after_full"];
  const evaluationDays = product.evaluationDays ?? 7;

  const forms = useMemo(() => {
    if (objectives.length === 0) return [];
    const questions = generateEvalQuestions(objectives, product.category).filter(
      (q) => q.phase !== "first_use" && (q.phase === "always" || phases.includes(q.phase as "baseline" | "after_full")),
    );
    const byPhase: Record<Phase, EvalQuestion[]> = { baseline: [], first_use: [], after_full: [], always: [] };
    for (const q of questions) byPhase[q.phase].push(q);
    const ordered = (["baseline", "after_full"] as const).filter((ph) => byPhase[ph].length > 0);
    return ordered.map((ph, idx) => {
      const isLast = idx === ordered.length - 1;
      return {
        phase: ph,
        meta: PHASE_META[ph],
        timing: ph === "baseline" ? "ส่งทันที" : `วันที่ ${evaluationDays}`,
        questions: [...byPhase[ph], ...(isLast ? byPhase.always : [])],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectives.join(","), phases.join(","), product.category, evaluationDays]);
  const totalQuestions = forms.reduce((s, f) => s + f.questions.length, 0);

  const openPreview = () =>
    nav.navigate("TrialEvalPreview", { category: product.category, objectives, phases, evaluationDays });

  return (
    // Web wrapper: space-y-4 (16px vertical gap between cards).
    <View style={{ gap: 16 }}>
      {/* 1 — Basic info */}
      <InfoCard
        title="ข้อมูลพื้นฐาน"
        rows={[
          { label: "ชื่อสินค้า", value: product.name },
          { label: "หมวดหมู่", value: product.category },
          { label: "Studio", value: product.studioName ?? "—" },
          { label: "Tagline", value: product.tagline },
        ]}
      />

      {/* 2 — Trial conditions */}
      <InfoCard
        title="เงื่อนไขการทดสอบ"
        rows={[
          {
            label: "จำนวนที่นั่ง",
            value: `${product.spotsTotal} ที่ (เหลือ ${spotsLeft})`,
          },
          { label: "ระยะเวลาทดสอบ", value: `${product.endsInDays} วัน` },
          { label: "คะแนนตอบแทน", value: `${product.rewardPoints} pts` },
        ]}
      />

      {/* 3 — Detail content (only when present) */}
      {productInfo && productInfo.length > 0 && (
        <InfoCard
          title="รายละเอียดสินค้า"
          rows={productInfo.map((p) => ({ label: p.label, value: p.value }))}
        />
      )}

      {/* 4 — แบบประเมิน Tester — document card (web parity) */}
      {forms.length > 0 && (
        <View style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 14, overflow: "hidden" }}>
          {/* Decorative document corner fold — top-right triangle */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderTopWidth: 20,
              borderTopColor: "rgba(49,151,84,0.1)",
              borderLeftWidth: 20,
              borderLeftColor: "transparent",
            }}
          />

          {/* Header — icon tile + counts + Eye (พรีวิวแบบประเมิน) */}
          <View className="flex-row items-start" style={{ gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(49,151,84,0.12)", alignItems: "center", justifyContent: "center" }}>
              <FileText size={16} color={GREEN} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#1a1a1a" }}>แบบประเมิน Tester</Text>
              <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                {totalQuestions} คำถาม · {forms.length} ฟอร์ม
              </Text>
              <View className="flex-row items-center" style={{ gap: 4, marginTop: 4 }}>
                <Clock size={11} color={GREEN} strokeWidth={2.4} />
                <Text style={{ fontSize: 10.5, fontWeight: "600", color: GREEN }}>
                  ฟอร์มหลังใช้: ส่งวันที่ {evaluationDays} หลังลงทะเบียน
                </Text>
              </View>
            </View>
            <Pressable
              onPress={openPreview}
              hitSlop={4}
              accessibilityLabel="ดูตัวอย่างฟอร์มที่ Tester จะเห็น"
              className="active:opacity-70"
              style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(49,151,84,0.08)" }}
            >
              <Eye size={16} color={GREEN} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={{ height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 }} />

          {/* Form chips — one pill per form, tinted by its phase */}
          <View className="flex-row flex-wrap" style={{ gap: 6, marginBottom: 14 }}>
            {forms.map((f, idx) => (
              <View
                key={f.phase}
                className="flex-row items-center"
                style={{ gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: `${f.meta.color}40`, backgroundColor: "#fff" }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: f.meta.color }}>
                  ฟอร์มที่ {idx + 1} · {f.meta.label}
                </Text>
                <Text style={{ fontSize: 10, color: "#9ca3af" }}>{f.questions.length}</Text>
              </View>
            ))}
          </View>

          {/* รายละเอียดการประเมิน — bordered box per form */}
          <Text style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, fontWeight: "600" }}>
            รายละเอียดการประเมิน
          </Text>
          <View style={{ gap: 12 }}>
            {forms.map((f, idx) => (
              <View key={f.phase} style={{ borderRadius: 12, borderWidth: 1, borderColor: `${f.meta.color}25`, overflow: "hidden" }}>
                <View className="flex-row items-center" style={{ gap: 6, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: `${f.meta.color}08` }}>
                  <FileText size={12} color={f.meta.color} strokeWidth={2.4} />
                  <Text style={{ flex: 1, fontSize: 11, fontWeight: "700", color: f.meta.color }}>
                    ฟอร์มที่ {idx + 1} · {f.meta.label}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: "#9ca3af" }}>{f.timing}</Text>
                </View>
                <View style={{ backgroundColor: "rgba(249,250,251,0.7)", paddingHorizontal: 12, paddingVertical: 10, gap: 7 }}>
                  {f.questions.map((q) => (
                    <View key={q.id} className="flex-row items-center flex-wrap" style={{ gap: 6 }}>
                      <Text style={{ fontSize: 12.5, lineHeight: 18, color: q.phase === "always" ? "#4b5563" : "#1a1a1a" }}>
                        {q.label}
                      </Text>
                      {q.phase === "always" ? (
                        <View style={{ backgroundColor: `${f.meta.color}12`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>
                          <Text style={{ fontSize: 9.5, fontWeight: "600", color: f.meta.color }}>สรุปท้ายฟอร์ม</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
