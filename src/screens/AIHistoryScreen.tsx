import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { X, Plus, Trash2, MessageSquare } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { PressableScale } from "../components/PressableScale";
import { useAIAssistant } from "../context/AIAssistantContext";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import { modalTopPad } from "../theme/layout";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const GROUPED_BG = "#f2f2f7";
const LABEL = "#1c1c1e";

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]}`;
}

export function AIHistoryScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { sessions, currentSessionId, loadSession, deleteSession, newChat } = useAIAssistant();

  // Sessions that actually have a question, plus the active empty draft on top.
  const withHistory = sessions.filter((s) => s.messages.some((m) => m.role === "user"));
  const activeEmpty = sessions.find((s) => s.id === currentSessionId && !s.messages.some((m) => m.role === "user"));
  const ordered = activeEmpty ? [activeEmpty, ...withHistory] : withHistory;

  const open = (id: string) => { loadSession(id); nav.goBack(); };
  const startNew = () => { newChat(); nav.goBack(); };

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      {/* Android: clear the status bar (iOS modal card already starts below it) */}
      <View style={[styles.header, { paddingTop: 16 + modalTopPad(insets.top) }]}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: LABEL }}>ประวัติแชท</Text>
        <GlassIconButton onPress={startNew} size={44} accessibilityLabel="แชทใหม่">
          <Plus size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {ordered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 80, gap: 12 }}>
            <MessageSquare size={48} color="#d4d4d4" strokeWidth={1.5} />
            <Text style={{ fontSize: 14, color: TEXT_MUTED }}>ยังไม่มีประวัติแชท</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {ordered.map((s, i) => {
              const active = s.id === currentSessionId;
              const isEmptyDraft = !s.messages.some((m) => m.role === "user");
              const qCount = s.messages.filter((m) => m.role === "user").length;
              return (
                <PressableScale key={s.id} onPress={() => open(s.id)}>
                  <View style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(60,60,67,0.12)" }, active && { backgroundColor: "rgba(49,151,84,0.06)" }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: active ? "700" : "500", color: active ? BRAND_GREEN_DARK : isEmptyDraft ? "#a3a3a3" : "#1a1a1a", fontStyle: isEmptyDraft ? "italic" : "normal" }}>
                        {isEmptyDraft ? "ยังไม่มีคำถาม" : s.title}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: "#a3a3a3", marginTop: 2 }}>{fmtDate(s.updatedAt)}  ·  {qCount} คำถาม</Text>
                    </View>
                    {!isEmptyDraft ? (
                      <Pressable onPress={() => deleteSession(s.id)} hitSlop={10} accessibilityLabel="ลบแชท" style={{ padding: 6, marginLeft: 6 }}>
                        <Trash2 size={17} color="#c0392b" strokeWidth={2} />
                      </Pressable>
                    ) : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  card: { backgroundColor: "#fff", borderRadius: 20, marginHorizontal: 16, overflow: "hidden" },
  row: { minHeight: 60, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center" },
});
