import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Calendar, Check, Clock, FileText, Info, X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { BRAND_GREEN, TEXT_PRIMARY } from "../theme/tokens";
import { modalTopPad } from "../theme/layout";
import {
  generateEvalQuestions,
  PHASE_META,
  type TestObjective,
  type Phase,
  type EvalQuestion,
} from "../data/ownerTrialRegistrations";
import { TEST_OBJECTIVES, TYPE_LABEL, FormFieldPreview } from "./TrialAddProductScreen";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type EditablePhase = Exclude<Phase, "always" | "first_use">;

const num = (v: string) => parseInt(v.replace(/[^0-9]/g, ""), 10) || 0;

/**
 * สร้างแบบประเมินอัตโนมัติ — slide-up modal page in the AddCard style (replaces
 * the old BottomSheet). Ported 1:1 from the web OwnerTrialTabs eval modal:
 * step 1 objectives (พร้อมตัวอย่างคำถาม), step 2 phases + วันส่งฟอร์ม,
 * step 3 live preview (รายการ / ฟอร์มจริง), then "ใช้แบบประเมินนี้" commits
 * back to the add-trial form via the onDone callback.
 */
export function TrialEvalBuilderScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { category, objectives: initObjectives, phases: initPhases, evaluationDays: initDays, onDone } =
    useRoute<RouteProp<RootStackParamList, "TrialEvalBuilder">>().params;

  const [objectives, setObjectives] = useState<TestObjective[]>(initObjectives);
  const [phases, setPhases] = useState<EditablePhase[]>(initPhases);
  const [evaluationDays, setEvaluationDays] = useState(initDays);
  const [previewMode, setPreviewMode] = useState<"list" | "form">("list");
  const [infoFor, setInfoFor] = useState<TestObjective | null>(null);

  /* Live preview questions for the current picks. */
  const questions = useMemo(
    () =>
      generateEvalQuestions(objectives, category).filter(
        (q) => q.phase === "always" || phases.includes(q.phase as EditablePhase),
      ),
    [objectives, category, phases],
  );
  const byPhase = useMemo(() => {
    const groups: Record<Phase, EvalQuestion[]> = { baseline: [], first_use: [], after_full: [], always: [] };
    for (const q of questions) groups[q.phase].push(q);
    return groups;
  }, [questions]);
  const selectedPhasesOrdered = (["baseline", "after_full"] as EditablePhase[]).filter((ph) => byPhase[ph].length > 0);

  const submit = () => {
    if (objectives.length === 0) return;
    nav.goBack();
    onDone?.({ objectives, phases, evaluationDays });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header — same style as AddCard (circular close / centered title / spacer) */}
      <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16 + modalTopPad(insets.top), paddingBottom: 12 }}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>สร้างแบบประเมินอัตโนมัติ</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={{ fontSize: 11.5, color: "#6b7280" }}>
            วัตถุประสงค์ที่เลือก + หมวดหมู่ <Text style={{ color: BRAND_GREEN, fontWeight: "600" }}>"{category || "ยังไม่เลือก"}"</Text>
          </Text>
        </View>

        {/* Step 1 — objectives */}
        <View style={{ gap: 12 }}>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
              {objectives.length > 0 ? <Check size={13} color="#fff" strokeWidth={3} /> : <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>1</Text>}
            </View>
            <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#1a1a1a" }}>เลือกวัตถุประสงค์การทดสอบ</Text>
            <Text style={{ fontSize: 11, color: "#6b7280" }}>เลือกได้มากกว่า 1 ข้อ</Text>
          </View>
          <View style={{ gap: 10 }}>
            {TEST_OBJECTIVES.map((o) => {
              const isOn = objectives.includes(o.key);
              const showInfo = infoFor === o.key;
              return (
                <View key={o.key}>
                  <Pressable
                    onPress={() => setObjectives((prev) => (isOn ? prev.filter((k) => k !== o.key) : [...prev, o.key]))}
                    className="active:opacity-90"
                    style={{ borderWidth: 2, borderColor: isOn ? BRAND_GREEN : "#e5e7eb", borderRadius: 12, padding: 12 }}
                  >
                    <View className="flex-row items-start" style={{ gap: 12 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 6, marginTop: 1, alignItems: "center", justifyContent: "center", backgroundColor: isOn ? BRAND_GREEN : "#fff", borderWidth: isOn ? 0 : 2, borderColor: "#d1d5db" }}>
                        {isOn ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
                          <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>{o.label}</Text>
                          <Pressable onPress={() => setInfoFor(showInfo ? null : o.key)} hitSlop={8}>
                            <Info size={14} color={showInfo ? BRAND_GREEN : "#9ca3af"} strokeWidth={2.2} />
                          </Pressable>
                        </View>
                        <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 4, lineHeight: 16 }}>{o.description}</Text>
                        {showInfo ? (
                          <View style={{ marginTop: 8, gap: 6, backgroundColor: "#f9fafb", borderRadius: 10, padding: 10 }}>
                            <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#6b7280" }}>ตัวอย่างคำถามในแบบประเมิน</Text>
                            {o.example.map((q, i) => (
                              <View key={i} className="flex-row items-start" style={{ gap: 8 }}>
                                <View style={{ width: 4, height: 4, borderRadius: 2, marginTop: 6, backgroundColor: o.accent }} />
                                <Text style={{ flex: 1, fontSize: 12, color: "#374151", lineHeight: 17 }}>{q}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* Step 2 — phases */}
        <View style={{ gap: 12 }}>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
              {phases.length > 0 ? <Check size={13} color="#fff" strokeWidth={3} /> : <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>2</Text>}
            </View>
            <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#1a1a1a" }}>เลือกช่วงเวลาที่จะให้ Tester ประเมิน</Text>
          </View>
          {([
            { key: "baseline" as const, label: "ก่อนใช้สินค้า", sub: "Baseline — ส่งฟอร์มทันทีหลังจัดส่งสินค้า" },
            { key: "after_full" as const, label: "หลังใช้ครบกำหนด", sub: "Final assessment — Tester จะกรอกได้หลังถึงวันที่กำหนด" },
          ]).map((p) => {
            const isOn = phases.includes(p.key);
            return (
              <View key={p.key} style={{ borderWidth: 2, borderColor: isOn ? BRAND_GREEN : "#e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                <Pressable
                  onPress={() => setPhases((prev) => (isOn ? prev.filter((k) => k !== p.key) : [...prev, p.key]))}
                  className="active:opacity-90"
                  style={{ padding: 12 }}
                >
                  <View className="flex-row items-start" style={{ gap: 10 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 6, marginTop: 1, alignItems: "center", justifyContent: "center", backgroundColor: isOn ? BRAND_GREEN : "#fff", borderWidth: isOn ? 0 : 2, borderColor: "#d1d5db" }}>
                      {isOn ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#1a1a1a" }}>{p.label}</Text>
                      <Text style={{ fontSize: 10.5, color: "#6b7280", marginTop: 2, lineHeight: 15 }}>{p.sub}</Text>
                    </View>
                  </View>
                </Pressable>
                {p.key === "after_full" && isOn ? (
                  <View style={{ borderTopWidth: 2, borderTopColor: "rgba(49,151,84,0.15)", backgroundColor: "rgba(49,151,84,0.04)", paddingHorizontal: 12, paddingVertical: 10 }}>
                    <View className="flex-row items-center" style={{ gap: 6, marginBottom: 6 }}>
                      <Clock size={12} color="#1d5b32" strokeWidth={2.4} />
                      <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#1d5b32" }}>ส่งฟอร์มให้ Tester ในวันที่</Text>
                    </View>
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <TextInput
                        value={evaluationDays ? String(evaluationDays) : ""}
                        onChangeText={(v) => setEvaluationDays(Math.max(1, num(v) || 1))}
                        keyboardType="number-pad"
                        style={{ width: 64, height: 36, borderWidth: 2, borderColor: "rgba(49,151,84,0.2)", borderRadius: 8, textAlign: "center", fontSize: 13, color: TEXT_PRIMARY }}
                      />
                      <Text style={{ fontSize: 11.5, color: "#4b5563" }}>วันหลังลงทะเบียน</Text>
                    </View>
                    <View className="flex-row flex-wrap" style={{ gap: 4, marginTop: 8 }}>
                      {[7, 14, 21, 30].map((d) => {
                        const on = evaluationDays === d;
                        return (
                          <Pressable key={d} onPress={() => setEvaluationDays(d)} style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: on ? BRAND_GREEN : "#e5e7eb", backgroundColor: on ? BRAND_GREEN : "#fff" }}>
                            <Text style={{ fontSize: 10.5, fontWeight: "500", color: on ? "#fff" : "#4b5563" }}>{d} วัน</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
          <Text style={{ fontSize: 10.5, color: "#9ca3af" }}>💡 คำถาม "สรุปท้ายฟอร์ม" (คะแนนรวม + NPS + ความคิดเห็น) จะอยู่ในฟอร์มสุดท้ายเท่านั้น — Tester ตอบเพียงรอบเดียว</Text>
        </View>

        {/* Step 3 — preview */}
        <View style={{ gap: 12 }}>
          <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
            <View className="flex-row items-center" style={{ gap: 8, flex: 1 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>3</Text>
              </View>
              <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#1a1a1a" }}>พรีวิวแบบประเมิน</Text>
              {questions.length > 0 ? (
                <View style={{ backgroundColor: "rgba(49,151,84,0.1)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: BRAND_GREEN }}>{questions.length} คำถาม</Text>
                </View>
              ) : null}
            </View>
            {objectives.length > 0 ? (
              <View className="flex-row" style={{ backgroundColor: "#f3f4f6", borderRadius: 999, padding: 2 }}>
                {(["list", "form"] as const).map((m) => {
                  const on = previewMode === m;
                  return (
                    <Pressable key={m} onPress={() => setPreviewMode(m)} style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: on ? "#fff" : "transparent" }}>
                      <Text style={{ fontSize: 11, fontWeight: on ? "600" : "500", color: on ? "#1a1a1a" : "#6b7280" }}>{m === "list" ? "📋 รายการ" : "👁 ฟอร์มจริง"}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          {objectives.length === 0 ? (
            <View style={{ borderWidth: 2, borderStyle: "dashed", borderColor: "#e5e7eb", borderRadius: 16, padding: 28, alignItems: "center", backgroundColor: "#fafafa" }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <FileText size={28} color="#d4d4d4" strokeWidth={1.5} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#6b7280" }}>เลือกวัตถุประสงค์อย่างน้อย 1 ข้อด้านบน</Text>
            </View>
          ) : previewMode === "form" ? (
            <View style={{ gap: 14 }}>
              {selectedPhasesOrdered.length === 0 ? (
                <View style={{ borderWidth: 2, borderStyle: "dashed", borderColor: "#e5e7eb", borderRadius: 16, padding: 22, alignItems: "center", backgroundColor: "#fafafa" }}>
                  <Text style={{ fontSize: 12.5, fontWeight: "500", color: "#6b7280" }}>เลือกช่วงเวลาประเมินอย่างน้อย 1 ช่วงด้านบน</Text>
                </View>
              ) : (
                selectedPhasesOrdered.map((ph, idx) => {
                  const meta = PHASE_META[ph];
                  const isLast = idx === selectedPhasesOrdered.length - 1;
                  const qs = [...byPhase[ph], ...(isLast ? byPhase.always : [])];
                  const timing = ph === "baseline" ? "ส่งทันทีหลังจัดส่งสินค้า" : `ส่งให้ Tester ในวันที่ ${evaluationDays} หลังลงทะเบียน`;
                  return (
                    <View key={ph} style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(49,151,84,0.15)" }}>
                      <View style={{ backgroundColor: meta.color, paddingHorizontal: 16, paddingVertical: 12 }}>
                        <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
                          <View className="flex-row items-center" style={{ gap: 10, flex: 1 }}>
                            <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}>
                              <FileText size={16} color="#fff" strokeWidth={2.4} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 10.5, fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>ฟอร์มที่ {idx + 1} / {selectedPhasesOrdered.length}</Text>
                              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>{meta.label}</Text>
                            </View>
                          </View>
                          <View style={{ alignItems: "flex-end", gap: 3 }}>
                            <View className="flex-row items-center" style={{ gap: 4, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                              <Clock size={11} color="#fff" strokeWidth={2.4} />
                              <Text style={{ fontSize: 10, color: "#fff" }}>{timing}</Text>
                            </View>
                            <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>{qs.length} คำถาม</Text>
                          </View>
                        </View>
                      </View>
                      <View style={{ backgroundColor: "#fafafa", padding: 14, gap: 10 }}>
                        {qs.map((q, qi) => {
                          const shared = q.phase === "always";
                          return (
                            <View key={q.id} style={{ backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#f1f1f1" }}>
                              <View className="flex-row items-start" style={{ gap: 8, marginBottom: 10 }}>
                                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: `${meta.color}26`, alignItems: "center", justifyContent: "center" }}>
                                  <Text style={{ fontSize: 10.5, fontWeight: "700", color: meta.color }}>{qi + 1}</Text>
                                </View>
                                <Text style={{ flex: 1, fontSize: 13, fontWeight: "500", color: "#1a1a1a" }}>{q.label}</Text>
                                {shared ? (
                                  <View style={{ backgroundColor: "rgba(26,26,26,0.08)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>
                                    <Text style={{ fontSize: 9.5, fontWeight: "600", color: "#1a1a1a" }}>สรุปท้ายฟอร์ม</Text>
                                  </View>
                                ) : null}
                              </View>
                              <FormFieldPreview type={q.type} options={q.options} />
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ) : (
            /* LIST view */
            <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(49,151,84,0.15)" }}>
              <View style={{ backgroundColor: BRAND_GREEN, paddingHorizontal: 16, paddingVertical: 12 }}>
                <View className="flex-row items-center" style={{ gap: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                    <Calendar size={16} color="#fff" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>ลำดับการส่งให้ Tester</Text>
                    <Text style={{ fontSize: 10.5, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                      {(["baseline", "first_use", "after_full"] as Phase[])
                        .filter((ph) => byPhase[ph].length > 0)
                        .map((ph, i) => `${i + 1}. ${PHASE_META[ph].label}`)
                        .join(" → ") || "—"}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ backgroundColor: "#fff" }}>
                {(["baseline", "first_use", "after_full", "always"] as Phase[]).map((ph, phIdx) => {
                  const list = byPhase[ph];
                  if (!list.length) return null;
                  const meta = PHASE_META[ph];
                  return (
                    <View key={ph} style={{ padding: 14, borderTopWidth: phIdx > 0 ? 1 : 0, borderTopColor: "#f1f1f1" }}>
                      <View className="flex-row items-center justify-between" style={{ marginBottom: 10 }}>
                        <View style={{ backgroundColor: `${meta.color}26`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                          <Text style={{ fontSize: 11.5, fontWeight: "700", color: meta.color }}>{meta.label}</Text>
                        </View>
                        <Text style={{ fontSize: 10.5, color: "#9ca3af" }}>{list.length} ข้อ</Text>
                      </View>
                      <View style={{ gap: 6 }}>
                        {list.map((q, idx) => (
                          <View key={q.id} className="flex-row items-center justify-between" style={{ gap: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#fafafa", borderRadius: 10, borderWidth: 1, borderColor: "#f1f1f1" }}>
                            <View className="flex-row items-center" style={{ gap: 10, flex: 1 }}>
                              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: `${meta.color}1a`, alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ fontSize: 10, fontWeight: "700", color: meta.color }}>{idx + 1}</Text>
                              </View>
                              <Text style={{ flex: 1, fontSize: 12.5, color: "#1a1a1a" }}>{q.label}</Text>
                            </View>
                            <View style={{ backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 }}>
                              <Text style={{ fontSize: 10, fontWeight: "600", color: "#4b5563" }}>{TYPE_LABEL[q.type]}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      {/* Scroll fades — content dissolves into the header / bottom CTA (white bg) */}
      <LinearGradient
        pointerEvents="none"
        colors={["#ffffff", "rgba(255,255,255,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0)", "#ffffff"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 28 }}
      />
      </View>

      {/* Bottom CTA — AddCard pattern */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <Pressable
          onPress={submit}
          disabled={objectives.length === 0}
          className="flex-row active:opacity-80 items-center justify-center"
          style={{ height: 52, borderRadius: 999, gap: 8, backgroundColor: objectives.length === 0 ? "#d1d5db" : BRAND_GREEN }}
        >
          <Check size={16} color="#fff" strokeWidth={2.8} />
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>ใช้แบบประเมินนี้</Text>
        </Pressable>
      </View>
    </View>
  );
}
