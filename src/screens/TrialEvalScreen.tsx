import { useMemo, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, TextInput as RNTextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Star, Send, AlertTriangle, Check } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BottomFade } from "../components/BottomFade";
import { TEXT_MUTED } from "../theme/tokens";
import { TRIAL_PRODUCTS } from "./TrialProductsScreen";
import { useTrials } from "../context/TrialContext";
import type { TestObjective } from "../data/evalQuestions";
import {
  questionsForPhase,
  PHASE_META,
  type EvalQuestion,
  type EvalPhase,
  type ConditionalAnswer,
} from "../data/evalQuestions";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type EvalRoute = RouteProp<RootStackParamList, "TrialEval">;

function imgSource(src: number | string | undefined): any {
  return typeof src === "number" ? src : { uri: src };
}

type FormState = {
  scoreById: Record<string, number>;
  npsScores: Record<string, number>;
  mcAnswers: Record<string, string>;
  tagAnswers: Record<string, string[]>;
  abChoices: Record<string, "A" | "B">;
  textAnswers: Record<string, string>;
  conditionalAnswers: Record<string, ConditionalAnswer>;
};
const emptyForm = (): FormState => ({
  scoreById: {}, npsScores: {}, mcAnswers: {}, tagAnswers: {}, abChoices: {}, textAnswers: {}, conditionalAnswers: {},
});

function isAnswered(q: EvalQuestion, f: FormState): boolean {
  switch (q.type) {
    case "scale_1_5":
    case "stars_1_5": return (f.scoreById[q.id] ?? 0) > 0;
    case "nps_0_10": return typeof f.npsScores[q.id] === "number";
    case "multiple_choice": return !!f.mcAnswers[q.id];
    case "tag": return (f.tagAnswers[q.id]?.length ?? 0) > 0;
    case "conditional": return !!f.conditionalAnswers[q.id];
    case "text":
      return q.id === "core_text"
        ? (f.textAnswers[q.id] ?? "").trim().length >= 10
        : (f.textAnswers[q.id] ?? "").trim().length > 0;
    case "ab_choice": return !!f.abChoices[q.id];
  }
}

export function TrialEvalScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { id, kind } = useRoute<EvalRoute>().params;
  const { getRegistration, markEvalDone } = useTrials();

  const reg = getRegistration(id);
  const product = reg ? TRIAL_PRODUCTS.find((p) => p.id === reg.trialId) : undefined;
  const phase: EvalPhase = kind === "pre" ? "baseline" : "after_full";
  // Theme by phase: ก่อนใช้ = ฟ้า (baseline), หลังใช้ = เขียว (after_full).
  const accent = PHASE_META[phase].color;

  const questions = useMemo(
    () => (reg && product ? questionsForPhase(reg.objectives as TestObjective[], product.category, !!reg.hasPreEval, phase) : []),
    [reg, product, phase]
  );

  const [form, setForm] = useState<FormState>(emptyForm);

  if (!reg || !product) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <StatusBar style="dark" />
        <SubPageHeader title="แบบประเมิน" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: TEXT_MUTED }}>ไม่พบรายการนี้</Text>
        </View>
      </View>
    );
  }

  const answeredCount = questions.filter((q) => isAnswered(q, form)).length;
  const allAnswered = answeredCount === questions.length;
  const isPost = kind === "post";

  const handleSubmit = () => {
    if (!allAnswered) {
      Alert.alert("ยังไม่ครบ", "กรุณาตอบแบบประเมินให้ครบทุกข้อ");
      return;
    }
    // Post-eval completes the trial (the pre-eval, if required, is already done by then).
    const willComplete = isPost && (!reg.hasPreEval || !!reg.preEvalDone);
    // Every per-question answer is saved — the owner's "คำตอบแบบประเมิน" screen
    // reads them. (This used to keep only overall/nps/comment and drop the rest.)
    markEvalDone(id, kind, form);
    nav.replace("TrialEvalSuccess", {
      productName: product.name,
      points: product.rewardPoints,
      completed: willComplete,
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="แบบประเมิน"
        subtitle={kind === "pre" ? "ก่อนใช้สินค้า" : "หลังใช้สินค้า"}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
          {/* Product header */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image source={imgSource(product.imageSrc ?? product.image)} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "#f3f4f6" }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#319754", letterSpacing: 0.4 }}>แบบประเมินผลิตภัณฑ์ทดสอบ</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }} numberOfLines={1}>{product.name}</Text>
            </View>
          </View>

          {/* Questions */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>
            <Text style={{ fontSize: 12, color: TEXT_MUTED }}>{questions.length} คำถาม</Text>
            {questions.map((q, idx) => (
              <View key={q.id} style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#ececed", padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: accent + "1a", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: accent }}>{idx + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: "#1a1a1a", fontWeight: "500", lineHeight: 20 }}>{q.label}</Text>
                </View>
                <QuestionInput q={q} accent={accent} form={form} setForm={setForm} />
              </View>
            ))}
          </View>
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <BottomFade />

        {/* Floating submit */}
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
            <GlassView glassEffectStyle="regular" colorScheme="light" style={{ borderRadius: 34, overflow: "hidden", padding: 9, gap: 6 }}>
              <Text style={{ fontSize: 11.5, color: "#737373", textAlign: "center" }}>
                ตอบแล้ว {answeredCount} / {questions.length} ข้อ
              </Text>
              <Pressable
                onPress={handleSubmit}
                className="active:opacity-90"
                style={{ height: 50, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, backgroundColor: allAnswered ? accent : "#9ca3af" }}
              >
                <Send size={16} color="#fff" strokeWidth={2.6} />
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                  {isPost ? `ส่งแบบประเมิน · รับ +${product.rewardPoints.toLocaleString()} คะแนน` : "ส่งแบบประเมินก่อนใช้"}
                </Text>
              </Pressable>
            </GlassView>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Per-question inputs ────────────────────────────────────────────────────────

function QuestionInput({ q, accent, form, setForm }: {
  q: EvalQuestion; accent: string; form: FormState; setForm: (u: (p: FormState) => FormState) => void;
}) {
  switch (q.type) {
    case "scale_1_5":
      return <ScaleInput value={form.scoreById[q.id] ?? 0} accent={accent} onChange={(v) => setForm((p) => ({ ...p, scoreById: { ...p.scoreById, [q.id]: v } }))} />;
    case "stars_1_5":
      return <StarsInput value={form.scoreById[q.id] ?? 0} onChange={(v) => setForm((p) => ({ ...p, scoreById: { ...p.scoreById, [q.id]: v } }))} />;
    case "nps_0_10":
      return <NpsInput value={form.npsScores[q.id]} onChange={(v) => setForm((p) => ({ ...p, npsScores: { ...p.npsScores, [q.id]: v } }))} />;
    case "multiple_choice":
      return <McInput options={q.options ?? []} value={form.mcAnswers[q.id] ?? ""} accent={accent} onChange={(v) => setForm((p) => ({ ...p, mcAnswers: { ...p.mcAnswers, [q.id]: v } }))} />;
    case "tag":
      return <TagInput options={q.options ?? []} value={form.tagAnswers[q.id] ?? []} accent={accent} onChange={(v) => setForm((p) => ({ ...p, tagAnswers: { ...p.tagAnswers, [q.id]: v } }))} />;
    case "conditional":
      return <ConditionalInput value={form.conditionalAnswers[q.id]} onChange={(v) => setForm((p) => ({ ...p, conditionalAnswers: { ...p.conditionalAnswers, [q.id]: v } }))} />;
    case "text":
      return <TextField value={form.textAnswers[q.id] ?? ""} isLong={q.id === "core_text"} minChars={q.id === "core_text" ? 10 : undefined} onChange={(v) => setForm((p) => ({ ...p, textAnswers: { ...p.textAnswers, [q.id]: v } }))} />;
    case "ab_choice":
      return <AbInput value={form.abChoices[q.id]} onChange={(v) => setForm((p) => ({ ...p, abChoices: { ...p.abChoices, [q.id]: v } }))} />;
  }
}

function ScaleInput({ value, accent, onChange }: { value: number; accent: string; onChange: (v: number) => void }) {
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n === value;
          return (
            <Pressable key={n} onPress={() => onChange(n)} className="active:opacity-80"
              style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: active ? accent : "#fff", borderColor: active ? accent : "#e5e7eb" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: active ? "#fff" : "#737373" }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>1 = น้อย, 5 = มาก</Text>
    </View>
  );
}

function StarsInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} className="active:opacity-70" hitSlop={4}>
          <Star size={30} color={n <= value ? "#f59e0b" : "#d4d4d8"} fill={n <= value ? "#f59e0b" : "transparent"} strokeWidth={2} />
        </Pressable>
      ))}
      {value > 0 ? <Text style={{ fontSize: 13, fontWeight: "700", color: "#b45309", marginLeft: 6 }}>{value}/5</Text> : null}
    </View>
  );
}

function NpsInput({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {Array.from({ length: 11 }, (_, n) => n).map((n) => {
          const active = n === value;
          const color = n <= 6 ? "#ef4444" : n <= 8 ? "#f59e0b" : "#319754";
          return (
            <Pressable key={n} onPress={() => onChange(n)} className="active:opacity-80"
              style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: active ? color : "#fff", borderColor: active ? color : "#e5e7eb" }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#fff" : "#737373" }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ fontSize: 10.5, color: "#9ca3af" }}>0 = ไม่แนะนำเลย</Text>
        <Text style={{ fontSize: 10.5, color: "#9ca3af" }}>10 = แนะนำสุด ๆ</Text>
      </View>
    </View>
  );
}

function McInput({ options, value, accent, onChange }: { options: string[]; value: string; accent: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable key={opt} onPress={() => onChange(opt)} className="active:opacity-80"
            style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 999, backgroundColor: active ? accent + "12" : "#f8f8f8" }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: active ? accent : "#cbd5e1", alignItems: "center", justifyContent: "center" }}>
              {active ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: accent }} /> : null}
            </View>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: active ? "700" : "500", color: active ? accent : "#1a1a1a" }}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TagInput({ options, value, accent, onChange }: { options: string[]; value: string[]; accent: string; onChange: (v: string[]) => void }) {
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <Pressable key={opt} onPress={() => toggle(opt)} className="active:opacity-80"
            style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 2, backgroundColor: active ? accent : "#fff", borderColor: active ? accent : "#e5e7eb" }}>
            {active ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
            <Text style={{ fontSize: 12.5, fontWeight: active ? "700" : "500", color: active ? "#fff" : "#1a1a1a" }}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ConditionalInput({ value, onChange }: { value: ConditionalAnswer | undefined; onChange: (v: ConditionalAnswer) => void }) {
  const yes = value?.has === true;
  const no = value?.has === false;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => onChange({ has: false })} className="active:opacity-80"
          style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: no ? "#319754" : "#fff", borderColor: no ? "#319754" : "#e5e7eb" }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: no ? "#fff" : "#6b7280" }}>ไม่มี</Text>
        </Pressable>
        <Pressable onPress={() => onChange({ has: true, note: value?.note ?? "" })} className="active:opacity-80"
          style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: yes ? "#ef4444" : "#fff", borderColor: yes ? "#ef4444" : "#e5e7eb" }}>
          <AlertTriangle size={14} color={yes ? "#fff" : "#6b7280"} strokeWidth={2.4} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: yes ? "#fff" : "#6b7280" }}>มี (ระบุ)</Text>
        </Pressable>
      </View>
      {yes ? (
        <RNTextInput
          value={value?.note ?? ""}
          onChangeText={(t) => onChange({ has: true, note: t })}
          placeholder="กรุณาระบุอาการหรือผลข้างเคียงที่พบ"
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          style={{ minHeight: 72, backgroundColor: "#fef2f2", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1a1a1a", lineHeight: 20 }}
        />
      ) : null}
    </View>
  );
}

function TextField({ value, isLong, minChars, onChange }: { value: string; isLong?: boolean; minChars?: number; onChange: (v: string) => void }) {
  return (
    <View>
      <RNTextInput
        value={value}
        onChangeText={onChange}
        placeholder={isLong ? "เล่าประสบการณ์การใช้สินค้า — ผลลัพธ์, สิ่งที่ชอบ, สิ่งที่อยากให้ปรับปรุง" : "พิมพ์คำตอบที่นี่..."}
        placeholderTextColor="#9ca3af"
        multiline={isLong}
        textAlignVertical={isLong ? "top" : "center"}
        style={{ minHeight: isLong ? 96 : 46, backgroundColor: "#f5f5f5", borderRadius: 14, paddingHorizontal: 14, paddingVertical: isLong ? 12 : 0, fontSize: 14, color: "#1a1a1a", lineHeight: isLong ? 21 : undefined }}
      />
      {minChars ? (
        <Text style={{ fontSize: 10.5, color: value.trim().length >= minChars ? "#319754" : "#9ca3af", textAlign: "right", marginTop: 4 }}>
          {value.trim().length} / {minChars} ขั้นต่ำ
        </Text>
      ) : null}
    </View>
  );
}

function AbInput({ value, onChange }: { value: "A" | "B" | undefined; onChange: (v: "A" | "B") => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {(["A", "B"] as const).map((opt) => {
        const active = opt === value;
        const color = opt === "A" ? "#3b82f6" : "#319754";
        return (
          <Pressable key={opt} onPress={() => onChange(opt)} className="active:opacity-80"
            style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: active ? color : "#fff", borderColor: active ? color : "#e5e7eb" }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: active ? "#fff" : "#6b7280" }}>สูตร {opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
