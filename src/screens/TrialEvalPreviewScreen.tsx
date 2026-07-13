import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Eye, Pencil, X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { BRAND_GREEN } from "../theme/tokens";
import { modalTopPad } from "../theme/layout";
import {
  generateEvalQuestions,
  PHASE_META,
  type Phase,
  type EvalQuestion,
} from "../data/ownerTrialRegistrations";
import { FormFieldPreview } from "./TrialAddProductScreen";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * พรีวิวแบบประเมิน — read-only "มุมมองที่ Tester จะเห็นจริง" modal, web parity
 * (OwnerTrialTabs preview modal). Flat form grouped by phase with disabled
 * mock controls; แก้ไขแบบประเมิน swaps this page for the builder.
 */
export function TrialEvalPreviewScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { category, objectives, phases, onEdit } =
    useRoute<RouteProp<RootStackParamList, "TrialEvalPreview">>().params;

  const questions = useMemo(
    () =>
      generateEvalQuestions(objectives, category).filter(
        (q) => q.phase === "always" || phases.includes(q.phase as "baseline" | "after_full"),
      ),
    [objectives, category, phases],
  );
  const byPhase = useMemo(() => {
    const groups: Record<Phase, EvalQuestion[]> = { baseline: [], first_use: [], after_full: [], always: [] };
    for (const q of questions) groups[q.phase].push(q);
    return groups;
  }, [questions]);

  const edit = () => {
    nav.goBack();
    onEdit?.();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header — glass X / centered title + Tester-view hint / spacer */}
      <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16 + modalTopPad(insets.top), paddingBottom: 12 }}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <View style={{ alignItems: "center" }}>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Eye size={16} color={BRAND_GREEN} strokeWidth={2.4} />
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>พรีวิวแบบประเมิน</Text>
          </View>
          <Text style={{ fontSize: 11, color: "#8e8e93", marginTop: 2 }}>มุมมองที่ Tester จะเห็นจริง — ไม่สามารถกรอกได้</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 18 }} showsVerticalScrollIndicator={false}>
          {(["baseline", "first_use", "after_full", "always"] as Phase[]).map((ph) => {
            const list = byPhase[ph];
            if (!list.length) return null;
            const meta = PHASE_META[ph];
            return (
              <View key={ph} style={{ gap: 10 }}>
                {/* Phase header — colored pill + count */}
                <View className="flex-row items-center justify-between">
                  <View style={{ backgroundColor: `${meta.color}26`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: "700", color: meta.color }}>{meta.label}</Text>
                  </View>
                  <Text style={{ fontSize: 10.5, color: "#9ca3af" }}>{list.length} คำถาม</Text>
                </View>
                {list.map((q, qi) => (
                  <View key={q.id} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#f1f1f1", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 }}>
                    <View className="flex-row items-start" style={{ gap: 8, marginBottom: 10 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: `${meta.color}26`, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 10.5, fontWeight: "700", color: meta.color }}>{qi + 1}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 13.5, fontWeight: "500", color: "#1a1a1a" }}>{q.label}</Text>
                    </View>
                    <FormFieldPreview type={q.type} options={q.options} />
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
        {/* Scroll fades — content dissolves into the header / footer (white bg) */}
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

      {/* Footer — counts caption + แก้ไขแบบประเมิน (web parity) */}
      <View className="flex-row items-center" style={{ gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <Text style={{ flex: 1, fontSize: 11, color: "#6b7280" }}>
          {questions.length} คำถาม · {phases.length + 1} เฟส
        </Text>
        {onEdit ? (
          <Pressable
            onPress={edit}
            className="flex-row items-center justify-center active:opacity-90"
            style={{ height: 44, paddingHorizontal: 20, borderRadius: 999, gap: 6, backgroundColor: BRAND_GREEN }}
          >
            <Pencil size={14} color="#fff" strokeWidth={2.4} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>แก้ไขแบบประเมิน</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
