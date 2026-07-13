/* ============================================================================
 *  เพิ่มสินค้าทดลองใหม่ — web-EXACT port of the web AddTrialProductForm
 *  (../Metaherb/src/app/pages/owner/OwnerTrialTabs.tsx L1470-2731).
 *
 *  The web renders all 7 sections in one column; mobile matches — full-bleed
 *  white sections stacked in one scroll (same shell as the other create pages)
 *  with a floating Liquid Glass save bar. The "สร้างแบบประเมินอัตโนมัติ"
 *  eval-generator and the Tester-view preview live as their own slide-up pages
 *  (TrialEvalBuilder / TrialEvalPreview). Required sections (ข้อมูลพื้นฐาน* /
 *  เงื่อนไขการทดสอบ* / แบบประเมิน Tester*) must be valid before save.
 *
 *  Saves to the trialDrafts store (addTrialDraft) so the new product shows in
 *  the registry immediately, then nav.goBack().
 *  ========================================================================== */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Check,
  Save,
  X,
  Plus,
  Package,
  FileText,
  Beaker,
  Clock,
  ShieldCheck,
  Users,
  Upload,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { BottomFade } from "../components/BottomFade";
import { getImagePicker } from "../utils/imagePicker";
import { addTrialDraft, upsertTrialDraft, getAddedTrials } from "../data/trialDrafts";
import { showToast } from "../components/Toast";
import { SubPageHeader } from "../components/SubPageHeader";
import { NumberStepper } from "../components/NumberStepper";
import {
  generateEvalQuestions,
  PHASE_META,
  type TestObjective,
  type Phase,
  type EvalQuestion,
} from "../data/ownerTrialRegistrations";
import type { QuestionType } from "../data/evalQuestions";
import { TRIAL_PRODUCTS, type TrialProduct } from "./TrialProductsScreen";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  BRAND_GREEN,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  TEXT_DISABLED,
  GLASS_BAR_TINT,
} from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RED = "#ff3b30";
const FAFAFA = "#fafafa";
const PLACEHOLDER = "#a3a3a3";

/* ─── option / config tables — copied verbatim from the web form ─── */
const CATEGORIES = [
  "เครื่องสำอาง",
  "สุขภาพ / อาหารเสริม",
  "อโรมา / เครื่องหอม",
  "อาหาร / เครื่องดื่ม",
  "อุปกรณ์ / เครื่องมือ",
];
const DURATION_OPTS = ["7", "14", "21", "30"];

const AGE_OPTIONS = ["15-24", "25-34", "35-44", "45-54", "55+"];
const GENDER_OPTIONS = ["ชาย", "หญิง", "LGBTQ+"];
const LIFESTYLE_OPTIONS: { emoji: string; label: string }[] = [
  { emoji: "🙂", label: "ผู้บริโภคทั่วไป" },
  { emoji: "💚", label: "สายสุขภาพ" },
  { emoji: "🧓", label: "ผู้สูงอายุ" },
  { emoji: "💪", label: "นักกีฬา/ออกกำลัง" },
  { emoji: "☕", label: "คนดื่มกาแฟ" },
  { emoji: "🌙", label: "มีปัญหาการนอน" },
  { emoji: "✨", label: "สาย skincare" },
];
const HEALTH_OPTIONS: { emoji: string; label: string }[] = [
  { emoji: "😴", label: "นอนหลับยาก" },
  { emoji: "😰", label: "เครียด" },
  { emoji: "😩", label: "อ่อนเพลีย" },
  { emoji: "🌸", label: "ปัญหาผิว" },
  { emoji: "🍽", label: "ระบบย่อย" },
  { emoji: "🦴", label: "ปวดข้อ" },
  { emoji: "🧠", label: "สมาธิ" },
];
const BEHAVIOR_OPTIONS: { emoji: string; label: string }[] = [
  { emoji: "🍵", label: "ชาสมุนไพร" },
  { emoji: "💊", label: "แคปซูล" },
  { emoji: "🥤", label: "ผง" },
  { emoji: "💧", label: "น้ำมัน" },
  { emoji: "🧴", label: "ครีม/เซรั่ม" },
];

export const CATEGORY_TO_TEMPLATE: Record<string, TestObjective[]> = {
  "เครื่องสำอาง": ["efficacy", "sensory", "packaging", "market"],
  "สุขภาพ / อาหารเสริม": ["efficacy", "packaging", "market"],
  "อโรมา / เครื่องหอม": ["sensory", "packaging", "market"],
  "อาหาร / เครื่องดื่ม": ["efficacy", "sensory", "market"],
  "อุปกรณ์ / เครื่องมือ": ["efficacy", "packaging", "market"],
};

export const TEST_OBJECTIVES: {
  key: TestObjective;
  label: string;
  description: string;
  example: string[];
  accent: string;
}[] = [
  {
    key: "efficacy",
    label: "ทดสอบประสิทธิภาพ (Efficacy)",
    description: "พิสูจน์ว่าสินค้าทำงานได้จริงตามสรรพคุณ วัดด้วย Before/After",
    accent: "#319754",
    example: ["ระดับความชุ่มชื้นผิว (Scale 1-5)", "ปัญหาผิวที่ต้องการแก้ไข (Multiple Choice)", "ผลข้างเคียง / อาการแพ้ (Conditional)"],
  },
  {
    key: "sensory",
    label: "ทดสอบประสาทสัมผัส (Sensory)",
    description: "วัดความพึงพอใจด้านเนื้อสัมผัส กลิ่น รสชาติ สี",
    accent: "#f59e0b",
    example: ["เนื้อสัมผัส (Texture) เหมาะกับผิว (Scale 1-5)", "กลิ่นน่าใช้ ไม่ฉุนรบกวน (Scale 1-5)", "สัมผัสแรกที่รู้สึกได้ (Tags)"],
  },
  {
    key: "packaging",
    label: "ทดสอบบรรจุภัณฑ์ (Packaging)",
    description: "วัดดีไซน์ ความสวยงาม ฟังก์ชันการใช้งาน และ First Impression",
    accent: "#8b5cf6",
    example: ["ดีไซน์ / ความสวยงาม (Scale 1-5)", "ฟังก์ชันการใช้งาน (เปิด/ปิด/พกพา) (Scale 1-5)", "First Impression (Multiple Choice)"],
  },
  {
    key: "market",
    label: "ทดสอบด้านการตลาด (Market Research)",
    description: "วัด Purchase Intent ราคาที่ยอมจ่าย NPS และกลุ่มเป้าหมาย",
    accent: "#ef4444",
    example: ["Purchase Intent — คุณจะซื้อจริงไหม (Scale 1-5)", "ราคาสูงสุดที่ยอมจ่าย (Text)", "เหมาะกับกลุ่มเป้าหมายแบบใด (Multiple Choice)"],
  },
  {
    key: "formula_ab",
    label: "เปรียบเทียบสูตร A/B (Formula Comparison)",
    description: "Tester ลองทั้งสองสูตรและประเมิน Side-by-Side",
    accent: "#ec4899",
    example: ["ชอบสูตรไหนมากกว่า (A vs B)", "ความแตกต่างที่สังเกตได้ (Text)"],
  },
];

export const TYPE_LABEL: Record<QuestionType, string> = {
  scale_1_5: "Scale 1-5",
  stars_1_5: "1-5 ดาว",
  nps_0_10: "NPS 0-10",
  multiple_choice: "Multiple Choice",
  tag: "Tag หลายข้อ",
  conditional: "Conditional",
  text: "Text",
  ab_choice: "A vs B",
};

/* ─── tiny field helpers ─── */
const inputStyle = {
  backgroundColor: FAFAFA,
  borderRadius: 999,
  paddingHorizontal: 18,
  height: 46,
  fontSize: 14,
  color: TEXT_PRIMARY,
} as const;
const areaStyle = {
  backgroundColor: FAFAFA,
  borderRadius: 16,
  paddingHorizontal: 18,
  paddingVertical: 12,
  fontSize: 14,
  color: TEXT_PRIMARY,
  textAlignVertical: "top" as const,
} as const;

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={{ fontSize: 13.5, fontWeight: "500", color: TEXT_PRIMARY }}>
      {text} {required ? <Text style={{ color: RED }}>*</Text> : null}
    </Text>
  );
}

// Provided by the screen: scrolls the just-focused TextInput above the keyboard.
const FocusScrollCtx = createContext<(e: { target?: any }) => void>(() => {});

function PillInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  numeric?: boolean;
  hint?: string;
}) {
  const onFocus = useContext(FocusScrollCtx);
  return (
    <View style={{ gap: 7 }}>
      <Label text={props.label} required={props.required} />
      {props.hint ? <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>{props.hint}</Text> : null}
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        onFocus={onFocus}
        placeholder={props.placeholder}
        placeholderTextColor={PLACEHOLDER}
        keyboardType={props.numeric ? "number-pad" : "default"}
        style={inputStyle}
      />
    </View>
  );
}

function AreaInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
  required?: boolean;
}) {
  const onFocus = useContext(FocusScrollCtx);
  return (
    <View style={{ gap: 7 }}>
      {props.label ? <Label text={props.label} required={props.required} /> : null}
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        onFocus={onFocus}
        placeholder={props.placeholder}
        placeholderTextColor={PLACEHOLDER}
        multiline
        style={[areaStyle, { minHeight: 24 * (props.rows ?? 3) + 12 }]}
      />
      {props.hint ? <Text style={{ fontSize: 11, color: TEXT_DISABLED }}>{props.hint}</Text> : null}
    </View>
  );
}

/** Multi-select chip group — used by the target-audience section. */
function ChipGroup(props: {
  label: string;
  required?: boolean;
  selected: string[];
  onToggle: (k: string) => void;
  options: { label: string; emoji?: string }[];
}) {
  return (
    <View>
      <View className="flex-row items-baseline justify-between" style={{ marginBottom: 8 }}>
        <Label text={props.label} required={props.required} />
        {props.selected.length > 0 ? (
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>{props.selected.length} เลือก</Text>
        ) : null}
      </View>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {props.options.map((opt) => {
          const active = props.selected.includes(opt.label);
          return (
            <Pressable
              key={opt.label}
              onPress={() => props.onToggle(opt.label)}
              className="flex-row items-center active:opacity-80"
              style={{
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: active ? BRAND_GREEN : "#e5e7eb",
                backgroundColor: active ? BRAND_GREEN : "#fff",
              }}
            >
              {opt.emoji ? <Text style={{ fontSize: 14 }}>{opt.emoji}</Text> : null}
              <Text style={{ fontSize: 13, fontWeight: active ? "600" : "500", color: active ? "#fff" : "#374151" }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Inline file-attach stub (Expo Go can't upload — just record/clear a name). */
function DocUpload(props: { label: string; fileName: string; onPick: () => void; onClear: () => void }) {
  const has = !!props.fileName;
  return (
    <View style={{ gap: 7 }}>
      <Label text={props.label} />
      <Pressable
        onPress={props.onPick}
        className="flex-row items-center active:opacity-80"
        style={{
          gap: 12,
          height: 46,
          paddingHorizontal: 18,
          borderRadius: 999,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: has ? BRAND_GREEN : "#d1d5db",
          backgroundColor: has ? "rgba(49,151,84,0.05)" : FAFAFA,
        }}
      >
        {has ? (
          <FileText size={16} color={BRAND_GREEN} strokeWidth={2} />
        ) : (
          <Upload size={16} color="#9ca3af" strokeWidth={2} />
        )}
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: has ? "600" : "500", color: has ? "#1d5b32" : TEXT_MUTED }}>
          {props.fileName || "แตะเพื่อแนบเอกสาร"}
        </Text>
        {has ? (
          <Pressable onPress={props.onClear} hitSlop={8} style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
            <X size={14} color="#6b7280" strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

/** Section header — colored icon tile + title + sub, same language as the
 *  other create pages (coupon / promotion / add-product). */
function SectionHeader({ Icon, tint = BRAND_GREEN, title, sub, required }: { Icon: typeof Package; tint?: string; title: string; sub: string; required?: boolean }) {
  return (
    <View className="flex-row items-center" style={{ gap: 12, marginBottom: 14 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${tint}1a`, alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={tint} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#000" }}>
          {title} {required ? <Text style={{ color: RED }}>*</Text> : null}
        </Text>
        <Text style={{ fontSize: 11, color: "#8e8e93", marginTop: 1 }}>{sub}</Text>
      </View>
    </View>
  );
}

/** Non-interactive Tester-facing field preview for each question type. */
export function FormFieldPreview({ type, options }: { type: QuestionType; options?: string[] }) {
  if (type === "scale_1_5") {
    return (
      <View className="flex-row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <View key={n} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: "#e5e7eb", backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: TEXT_MUTED }}>{n}</Text>
          </View>
        ))}
        <Text style={{ fontSize: 11, color: "#9ca3af" }}>(1 = น้อย, 5 = มาก)</Text>
      </View>
    );
  }
  if (type === "stars_1_5") {
    return (
      <View className="flex-row items-center" style={{ gap: 3 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Text key={n} style={{ fontSize: 22, color: "#d4d4d4" }}>★</Text>
        ))}
        <Text style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>(แตะดาวเพื่อให้คะแนน)</Text>
      </View>
    );
  }
  if (type === "nps_0_10") {
    return (
      <View>
        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {Array.from({ length: 11 }, (_, n) => (
            <View key={n} style={{ minWidth: 30, height: 32, paddingHorizontal: 6, borderRadius: 8, borderWidth: 2, borderColor: "#e5e7eb", backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: TEXT_MUTED }}>{n}</Text>
            </View>
          ))}
        </View>
        <View className="flex-row justify-between" style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 10.5, color: "#9ca3af" }}>0 = ไม่แนะนำเลย</Text>
          <Text style={{ fontSize: 10.5, color: "#9ca3af" }}>10 = แนะนำสุด ๆ</Text>
        </View>
      </View>
    );
  }
  if (type === "multiple_choice") {
    const opts = options && options.length > 0 ? options : ["ตัวเลือกที่ 1", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3"];
    return (
      <View style={{ gap: 8 }}>
        {opts.map((opt) => (
          <View key={opt} className="flex-row items-center" style={{ gap: 8 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#d1d5db" }} />
            <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>{opt}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (type === "tag") {
    return (
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {["นุ่ม", "ลื่น", "ฉ่ำ", "ซึมไว", "เย็น", "อื่น ๆ..."].map((t) => (
          <View key={t} style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 2, borderColor: "#e5e7eb", backgroundColor: "#fff" }}>
            <Text style={{ fontSize: 11.5, color: "#4b5563" }}>{t}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (type === "conditional") {
    return (
      <View className="flex-row" style={{ gap: 8 }}>
        {["ไม่มี", "มี (ระบุ)"].map((opt, i) => (
          <View key={opt} style={{ flex: 1, height: 40, borderRadius: 8, borderWidth: 2, borderColor: i === 0 ? "rgba(49,151,84,0.3)" : "#e5e7eb", backgroundColor: i === 0 ? "rgba(49,151,84,0.04)" : "#fff", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 12.5, fontWeight: "500", color: i === 0 ? "#1d5b32" : "#4b5563" }}>{opt}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (type === "text") {
    return (
      <View style={{ borderWidth: 2, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#f9fafb" }}>
        <Text style={{ fontSize: 12, color: "#9ca3af" }}>พิมพ์คำตอบที่นี่...</Text>
      </View>
    );
  }
  if (type === "ab_choice") {
    return (
      <View className="flex-row" style={{ gap: 8 }}>
        {["สูตร A", "สูตร B"].map((opt) => (
          <View key={opt} style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 2, borderColor: "#e5e7eb", backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#4b5563" }}>{opt}</Text>
          </View>
        ))}
      </View>
    );
  }
  return null;
}

export function TrialAddProductScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "TrialAddProduct">>();
  const editId = route.params?.editId;
  const editing = useMemo(
    () => (editId ? [...getAddedTrials(), ...TRIAL_PRODUCTS].find((p) => p.id === editId) ?? null : null),
    [editId],
  );

  /* ── รูปภาพสินค้า — 3 slots; slot 0 = primary "หลัก" ── */
  const [productImages, setProductImages] = useState<(string | null)[]>(() =>
    editing?.image ? [editing.image, null, null] : [null, null, null],
  );

  /* ── ข้อมูลพื้นฐาน ── */
  const [name, setName] = useState(() => editing?.name ?? "");
  const [category, setCategory] = useState(() => editing?.category ?? "");
  const [rewardPoints, setRewardPoints] = useState(() => (editing ? String(editing.rewardPoints) : ""));
  const [tagline, setTagline] = useState(() => editing?.tagline ?? "");

  /* ── ส่วนประกอบ & วิธีใช้ ── */
  const [ingredients, setIngredients] = useState("");
  const [howToUse, setHowToUse] = useState("");
  const [warnings, setWarnings] = useState("");

  /* ── เงื่อนไขการทดสอบ ── */
  const [spotsTotal, setSpotsTotal] = useState(() => editing?.spotsTotal ?? 0);
  const [endsInDays, setEndsInDays] = useState(() => editing?.endsInDays ?? 7);

  /* ── คุณภาพ & เอกสาร ── */
  const [docs, setDocs] = useState({
    fdaNumber: "",
    fdaDoc: "",
    factoryName: editing?.studioName ?? "",
    factoryGmpDoc: "",
    factoryAddress: "",
    labResult: "",
    labNote: "",
    sdsDoc: "",
    insuranceDoc: "",
    insuranceProvider: "",
  });
  const updDoc = (k: keyof typeof docs, v: string) => setDocs((p) => ({ ...p, [k]: v }));
  // Expo Go can't pick documents — stamp a placeholder file name on tap.
  const pickDoc = (k: keyof typeof docs) => updDoc(k, `เอกสาร-${k}.pdf`);

  /* ── กลุ่มเป้าหมาย ── */
  const [targetAge, setTargetAge] = useState<string[]>([]);
  const [targetGender, setTargetGender] = useState<string[]>([]);
  const [targetLifestyle, setTargetLifestyle] = useState<string[]>([]);
  const [targetHealth, setTargetHealth] = useState<string[]>([]);
  const [targetBehavior, setTargetBehavior] = useState<string[]>([]);
  const toggleIn = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (k: string) =>
    setter((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  /* ── แบบประเมิน Tester ── */
  const EDIT_OBJECTIVES: TestObjective[] = ["efficacy", "packaging", "market", "formula_ab"];
  const [testObjectives, setTestObjectives] = useState<TestObjective[]>(() => (editing ? EDIT_OBJECTIVES : []));
  const [activePhases, setActivePhases] = useState<("baseline" | "after_full")[]>(() => (editing ? ["baseline", "after_full"] : []));
  const [evaluationDays, setEvaluationDays] = useState(7);
  const [whatToTestText, setWhatToTestText] = useState(() =>
    editing
      ? generateEvalQuestions(EDIT_OBJECTIVES, editing.category)
          .filter((q) => q.phase !== "first_use")
          .map((q) => q.label)
          .join("\n")
      : "",
  );

  /* Committed generated questions (filtered by active phases). */
  const generatedQuestions = useMemo(
    () =>
      generateEvalQuestions(testObjectives, category).filter(
        (q) => q.phase === "always" || activePhases.includes(q.phase as "baseline" | "after_full"),
      ),
    [testObjectives, category, activePhases],
  );
  const questionsByPhase = useMemo(() => {
    const groups: Record<Phase, EvalQuestion[]> = { baseline: [], first_use: [], after_full: [], always: [] };
    for (const q of generatedQuestions) groups[q.phase].push(q);
    return groups;
  }, [generatedQuestions]);

  // Eval builder / preview live as their own slide-up pages (web-parity modals).
  const openEval = () => {
    nav.navigate("TrialEvalBuilder", {
      category,
      objectives: testObjectives,
      phases: activePhases,
      evaluationDays,
      onDone: ({ objectives, phases, evaluationDays: days }) => {
        setTestObjectives(objectives);
        setActivePhases(phases);
        setEvaluationDays(days);
        showToast("สร้างแบบประเมินเรียบร้อย");
      },
    });
  };
  const openEvalPreview = () => {
    nav.navigate("TrialEvalPreview", {
      category,
      objectives: testObjectives,
      phases: activePhases,
      evaluationDays,
      onEdit: openEval,
    });
  };

  // Keep the legacy text representation in sync (drives criteria validation + save).
  useEffect(() => {
    if (testObjectives.length > 0) {
      setWhatToTestText(generatedQuestions.map((q) => q.label).join("\n"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedQuestions]);

  // When category changes, suggest its objective template.
  useEffect(() => {
    const suggested = CATEGORY_TO_TEMPLATE[category];
    if (suggested && testObjectives.length === 0) {
      // do not auto-commit; only used as a hint — left intentionally light.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  /* ── per-section validation (mirrors the web) ── */
  const image = productImages[0] || "";
  const num = (s: string) => Number(s.replace(/[^0-9]/g, "")) || 0;
  const imageValid = image.trim().length > 0;
  const infoValid = name.trim().length >= 3 && tagline.trim().length >= 5 && num(rewardPoints) > 0;
  const usageValid = ingredients.trim().length > 0 && howToUse.trim().length > 0;
  const conditionsValid = spotsTotal > 0 && endsInDays > 0;
  const qualityValid = !!(docs.fdaNumber && docs.factoryName);
  const targetValid = targetAge.length > 0 && targetGender.length > 0;
  const criteriaValid = whatToTestText.split("\n").map((s) => s.trim()).filter(Boolean).length > 0;
  const canSave = infoValid && conditionsValid && criteriaValid;

  const sections: { id: string; label: string; required: boolean; valid: boolean }[] = [
    { id: "image", label: "รูปภาพสินค้า", required: false, valid: imageValid },
    { id: "info", label: "ข้อมูลพื้นฐาน", required: true, valid: infoValid },
    { id: "usage", label: "ส่วนประกอบ & วิธีใช้", required: false, valid: usageValid },
    { id: "conditions", label: "เงื่อนไขการทดสอบ", required: true, valid: conditionsValid },
    { id: "quality", label: "คุณภาพ & เอกสาร", required: false, valid: qualityValid },
    { id: "target", label: "กลุ่มเป้าหมาย", required: false, valid: targetValid },
    { id: "criteria", label: "แบบประเมิน Tester", required: true, valid: criteriaValid },
  ];

  const bodyScrollRef = useRef<ScrollView>(null);

  // Scroll the just-focused TextInput above the keyboard.
  const onInputFocus = (e: { target?: any }) => {
    const r: any = bodyScrollRef.current?.getScrollResponder?.();
    r?.scrollResponderScrollNativeHandleToKeyboard?.(e?.target, 120, true);
  };

  /* ── image picker ── */
  const pickImage = async (slot: number) => {
    const P = getImagePicker();
    if (!P) {
      Alert.alert("ยังเพิ่มรูปไม่ได้", "ตัวรันนี้ยังไม่มีโมดูลคลังรูป — ต้อง build แอปใหม่จึงจะเลือกรูปได้");
      return;
    }
    const res = await P.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) {
      const uri = res.assets[0].uri;
      setProductImages((prev) => prev.map((v, i) => (i === slot ? uri : v)));
    }
  };
  const removeImage = (slot: number) =>
    setProductImages((prev) => prev.map((v, i) => (i === slot ? null : v)));

  /* ── save ── */
  const save = () => {
    if (!canSave) {
      Alert.alert("กรอกข้อมูลให้ครบและถูกต้อง", "กรุณากรอก ข้อมูลพื้นฐาน · เงื่อนไขการทดสอบ · แบบประเมิน Tester");
      return;
    }
    const gallery = productImages.filter((x): x is string => !!x);
    const product: TrialProduct = {
      id: editing ? editing.id : `trial-custom-${Date.now()}`,
      name: name.trim(),
      tagline: tagline.trim(),
      category,
      image: gallery[0] || editing?.image || "",
      spotsTotal,
      spotsTaken: editing?.spotsTaken ?? 0,
      endsInDays,
      rewardPoints: num(rewardPoints),
      studioName: docs.factoryName.trim() || undefined,
      // Eval setup — carried on the product so the detail page's ข้อมูลสินค้า
      // tab can rebuild the same forms (web parity).
      testObjectives,
      activePhases,
      evaluationDays,
    };
    if (editing) {
      upsertTrialDraft(product);
      showToast(`บันทึกการแก้ไข "${product.name}"`);
    } else {
      addTrialDraft(product);
      showToast(`เพิ่ม "${product.name}" เรียบร้อย`);
    }
    nav.goBack();
  };

  /* =====================================================================
   *  Section bodies
   * ===================================================================== */
  const renderSection = (id: string) => {
    switch (id) {
      case "image":
        return (
          <View style={{ gap: 0 }}>
            <SectionHeader Icon={Package} title="รูปภาพสินค้า" sub="อัปโหลดได้สูงสุด 3 รูป (JPG, PNG, WebP) ขนาดไม่เกิน 2MB" />
            <View className="flex-row" style={{ gap: 10, marginTop: 12 }}>
              {[
                { label: "รูปปกสินค้า", sub: "รูปหลัก", primary: true },
                { label: "รูป 2", sub: "เพิ่มเติม", primary: false },
                { label: "รูป 3", sub: "เพิ่มเติม", primary: false },
              ].map((item, slot) => {
                const uploaded = productImages[slot];
                return (
                  <View key={item.label} style={{ flex: 1, minWidth: 0 }}>
                    <Pressable
                      onPress={() => pickImage(slot)}
                      className="active:opacity-80"
                      style={{
                        width: "100%",
                        aspectRatio: 1,
                        borderRadius: 16,
                        borderWidth: 2,
                        borderStyle: uploaded ? "solid" : "dashed",
                        borderColor: uploaded ? BRAND_GREEN : item.primary ? "rgba(49,151,84,0.4)" : "#d1d5db",
                        backgroundColor: uploaded ? "#fff" : FAFAFA,
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {uploaded ? (
                        <>
                          <Image source={{ uri: uploaded }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
                          <Pressable
                            onPress={() => removeImage(slot)}
                            hitSlop={6}
                            style={{ position: "absolute", top: 8, left: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}
                          >
                            <X size={14} color="#fff" strokeWidth={2.4} />
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center" }}>
                            <Plus size={16} color="#6b7280" strokeWidth={2.4} />
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: "500", color: "#000", marginTop: 8 }}>{item.label}</Text>
                        </>
                      )}
                    </Pressable>
                    {/* "หลัก" chip — straddles the bottom border, above everything */}
                    {item.primary ? (
                      <View pointerEvents="none" style={{ position: "absolute", bottom: -9, left: 0, right: 0, alignItems: "center", zIndex: 20 }}>
                        <View style={{ backgroundColor: BRAND_GREEN, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, elevation: 4, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}>
                          <Text style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}>หลัก</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        );

      case "info":
        return (
          <View style={{ gap: 16 }}>
            <SectionHeader Icon={FileText} tint="#3b82f6" required title="ข้อมูลสินค้า" sub="ชื่อ หมวดหมู่ คะแนนตอบแทน และคำอธิบายสั้น" />
            <PillInput label="ชื่อสินค้าทดลอง" required value={name} onChange={setName} placeholder="เช่น: เซรั่มขมิ้นชัน Brightening v3" />
            <View style={{ gap: 7 }}>
              <Label text="หมวดหมู่" required />
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {CATEGORIES.map((c) => {
                  const active = c === category;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCategory(c)}
                      className="active:opacity-80"
                      style={{ paddingHorizontal: 14, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: active ? BRAND_GREEN : "#fff", borderWidth: active ? 0 : 1, borderColor: "#e5e7eb" }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <PillInput label="คะแนนที่ผู้ทดสอบจะได้รับ" required numeric value={rewardPoints} onChange={setRewardPoints} placeholder="200" />
            <AreaInput label="คำอธิบายสั้น" required value={tagline} onChange={setTagline} rows={3} placeholder="เช่น: สูตรใหม่ลดความหมอง — รอผลตอบรับก่อนเปิดขายจริง" />
          </View>
        );

      case "usage":
        return (
          <View style={{ gap: 14 }}>
            <SectionHeader Icon={Beaker} tint="#14b8a6" title="ส่วนประกอบ & วิธีใช้" sub="Ingredient list, วิธีการใช้, และคำเตือนสำหรับผู้ทดสอบ" />
            <AreaInput label="ส่วนประกอบ (Ingredients)" value={ingredients} onChange={setIngredients} rows={4} placeholder={"เช่น Curcumin 5%\nNiacinamide 3%\nHyaluronic Acid\nGlycerin\nAqua"} />
            <AreaInput label="วิธีการใช้" value={howToUse} onChange={setHowToUse} rows={4} placeholder={"ขั้นตอนการใช้ — 1 ขั้นตอน ต่อ 1 บรรทัด\nเช่น ล้างหน้าให้สะอาด\nหยด 2-3 หยดลงฝ่ามือ\nทาบนใบหน้า เน้นจุดที่ต้องการบำรุง"} />
            <AreaInput label="คำเตือน" value={warnings} onChange={setWarnings} rows={3} placeholder={"เช่น หยุดใช้ทันทีหากเกิดการระคายเคือง\nหลีกเลี่ยงรอบดวงตา\nไม่เหมาะกับผู้แพ้ขมิ้น"} />
          </View>
        );

      case "conditions":
        return (
          <View style={{ gap: 14 }}>
            <SectionHeader Icon={Clock} tint="#f59e0b" required title="เงื่อนไขการทดสอบ" sub="จำนวนผู้ทดสอบและระยะเวลาเปิดรับสมัคร" />
            <View style={{ gap: 7 }}>
              <Label text="จำนวนที่นั่ง" required />
              <NumberStepper value={spotsTotal} onChange={setSpotsTotal} min={0} step={5} placeholder="กรอกจำนวนที่นั่งที่ต้องการ" />
            </View>
            <View style={{ gap: 7 }}>
              <Label text="ระยะเวลาเปิดรับสมัคร (วัน)" required />
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {DURATION_OPTS.map((d) => {
                  const active = Number(d) === endsInDays;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setEndsInDays(Number(d))}
                      className="active:opacity-80"
                      style={{ paddingHorizontal: 16, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: active ? BRAND_GREEN : "#fff", borderWidth: active ? 0 : 1, borderColor: "#e5e7eb" }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>{d} วัน</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        );

      case "quality":
        return (
          <View style={{ gap: 16 }}>
            <SectionHeader Icon={ShieldCheck} tint="#8b5cf6" title="คุณภาพ & เอกสารรับรอง" sub="ผลแล็บ, อย., โรงงาน GMP, SDS, ประกันความรับผิด" />
            {/* Required-ish: FDA */}
            <PillInput label="เลข อย." required value={docs.fdaNumber} onChange={(v) => updDoc("fdaNumber", v)} placeholder="10-1-6200xxxxx" />
            <DocUpload label="ใบอนุญาต อย." fileName={docs.fdaDoc} onPick={() => pickDoc("fdaDoc")} onClear={() => updDoc("fdaDoc", "")} />
            {/* Factory */}
            <PillInput label="ชื่อโรงงานผลิต" required value={docs.factoryName} onChange={(v) => updDoc("factoryName", v)} placeholder="เช่น โรงงาน ABC Pharma" />
            <DocUpload label="ใบรับรอง GMP โรงงาน" fileName={docs.factoryGmpDoc} onPick={() => pickDoc("factoryGmpDoc")} onClear={() => updDoc("factoryGmpDoc", "")} />
            <AreaInput label="ที่อยู่โรงงาน" value={docs.factoryAddress} onChange={(v) => updDoc("factoryAddress", v)} rows={2} placeholder="เลขที่ ถนน แขวง/ตำบล จังหวัด รหัสไปรษณีย์" />

            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#f1f1f1" }} />
              <Text style={{ fontSize: 11, fontWeight: "500", color: "#9ca3af" }}>เอกสารเพิ่มเติม (ทางเลือก)</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#f1f1f1" }} />
            </View>

            <DocUpload label="ผลทดสอบจากห้องแล็บ (ISO/GMP)" fileName={docs.labResult} onPick={() => pickDoc("labResult")} onClear={() => updDoc("labResult", "")} />
            <PillInput label="สรุปผลทดสอบสั้น ๆ" value={docs.labNote} onChange={(v) => updDoc("labNote", v)} placeholder="เช่น ผ่าน Patch Test 99%" />
            <DocUpload label="Safety Data Sheet (SDS)" fileName={docs.sdsDoc} onPick={() => pickDoc("sdsDoc")} onClear={() => updDoc("sdsDoc", "")} />
            <DocUpload label="ประกันความรับผิดต่อผลิตภัณฑ์" fileName={docs.insuranceDoc} onPick={() => pickDoc("insuranceDoc")} onClear={() => updDoc("insuranceDoc", "")} />
            <PillInput label="ผู้รับประกัน (Insurance provider)" value={docs.insuranceProvider} onChange={(v) => updDoc("insuranceProvider", v)} placeholder="เช่น บริษัทประกันภัย XYZ" />
          </View>
        );

      case "target":
        return (
          <View style={{ gap: 14 }}>
            <SectionHeader Icon={Users} tint="#ec4899" title="กลุ่มเป้าหมาย" sub="คุณสมบัติของ Tester ที่ต้องการ" />
            {/* Required basics */}
            <View style={{ backgroundColor: "rgba(49,151,84,0.04)", borderWidth: 1, borderColor: "rgba(49,151,84,0.15)", borderRadius: 12, padding: 14, gap: 14 }}>
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND_GREEN }} />
                <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#1d5b32" }}>ข้อมูลพื้นฐาน Tester</Text>
                <Text style={{ fontSize: 10.5, color: "#6b7280" }}>· จำเป็นต้องระบุ</Text>
              </View>
              <ChipGroup label="ช่วงอายุ" required selected={targetAge} onToggle={toggleIn(setTargetAge)} options={AGE_OPTIONS.map((a) => ({ label: a }))} />
              <ChipGroup label="เพศ" required selected={targetGender} onToggle={toggleIn(setTargetGender)} options={GENDER_OPTIONS.map((g) => ({ label: g }))} />
            </View>
            {/* Optional extras */}
            <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, gap: 14 }}>
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#9ca3af" }} />
                <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#4b5563" }}>ข้อมูลเสริม</Text>
                <Text style={{ fontSize: 10.5, color: "#6b7280" }}>· ยิ่งระบุละเอียด ระบบจะ match แม่นขึ้น</Text>
              </View>
              <ChipGroup label="รูปแบบชีวิต" selected={targetLifestyle} onToggle={toggleIn(setTargetLifestyle)} options={LIFESTYLE_OPTIONS} />
              <View style={{ height: 1, backgroundColor: "#f1f1f1" }} />
              <ChipGroup label="สุขภาพ" selected={targetHealth} onToggle={toggleIn(setTargetHealth)} options={HEALTH_OPTIONS} />
              <View style={{ height: 1, backgroundColor: "#f1f1f1" }} />
              <ChipGroup label="พฤติกรรมการบริโภค" selected={targetBehavior} onToggle={toggleIn(setTargetBehavior)} options={BEHAVIOR_OPTIONS} />
            </View>
          </View>
        );

      case "criteria":
        return (
          <View style={{ gap: 14 }}>
            <SectionHeader Icon={Check} tint="#0088ff" required title="แบบประเมินสำหรับ Tester" sub="ระบบจะสร้างคำถามให้อัตโนมัติตามวัตถุประสงค์ที่เลือก" />
            {testObjectives.length === 0 ? (
              <Pressable
                onPress={openEval}
                className="active:opacity-90"
                style={{ borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(49,151,84,0.3)", borderRadius: 14, paddingVertical: 28, paddingHorizontal: 20, alignItems: "center", backgroundColor: "#f9fdfa" }}
              >
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <FileText size={28} color={BRAND_GREEN} strokeWidth={1.8} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 }}>ยังไม่มีแบบประเมิน</Text>
                <Text style={{ fontSize: 12.5, color: "#6b7280", textAlign: "center", lineHeight: 18 }}>
                  แตะที่นี่เพื่อเริ่มสร้างแบบประเมินอัตโนมัติ — เลือกวัตถุประสงค์การทดสอบ + ช่วงเวลา ระบบจะสร้างคำถามให้ทันที
                </Text>
                <View className="flex-row items-center" style={{ gap: 6, marginTop: 12 }}>
                  <Plus size={14} color={BRAND_GREEN} strokeWidth={2.6} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: BRAND_GREEN }}>สร้างแบบประเมิน</Text>
                </View>
              </Pressable>
            ) : (
              <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 14, backgroundColor: "#fff" }}>
                <View className="flex-row items-start justify-between" style={{ gap: 12 }}>
                  <View className="flex-row items-start" style={{ gap: 12, flex: 1 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                      <FileText size={16} color={BRAND_GREEN} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#1a1a1a" }}>แบบประเมิน Tester</Text>
                      <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                        {generatedQuestions.length} คำถาม · {activePhases.length} ฟอร์ม · {testObjectives.length} วัตถุประสงค์
                      </Text>
                      {activePhases.includes("after_full") ? (
                        <View className="flex-row items-center" style={{ gap: 4, marginTop: 4 }}>
                          <Clock size={11} color={BRAND_GREEN} strokeWidth={2.4} />
                          <Text style={{ fontSize: 10.5, fontWeight: "600", color: BRAND_GREEN }}>ฟอร์มหลังใช้: ส่งวันที่ {evaluationDays} หลังลงทะเบียน</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View className="flex-row items-center" style={{ gap: 4 }}>
                    {/* ดูตัวอย่างฟอร์มที่ Tester จะเห็น */}
                    <Pressable onPress={openEvalPreview} hitSlop={4} style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                      <Eye size={16} color="#6b7280" strokeWidth={2.2} />
                    </Pressable>
                    <Pressable onPress={openEval} hitSlop={4} style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                      <Pencil size={16} color="#6b7280" strokeWidth={2.2} />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        // Web parity: clears objectives + textarea only (phases/days persist).
                        Alert.alert("ลบแบบประเมิน", "ต้องการลบแบบประเมินนี้ออกจริง ๆ ใช่ไหม?", [
                          { text: "ยกเลิก", style: "cancel" },
                          { text: "ลบ", style: "destructive", onPress: () => { setTestObjectives([]); setWhatToTestText(""); showToast("ลบแบบประเมินเรียบร้อย", "info"); } },
                        ])
                      }
                      hitSlop={4}
                      style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }}
                    >
                      <Trash2 size={16} color="#6b7280" strokeWidth={2.2} />
                    </Pressable>
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: "#f1f1f1", marginVertical: 12 }} />
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  {(["baseline", "first_use", "after_full", "always"] as Phase[]).map((ph) => {
                    const list = questionsByPhase[ph];
                    if (!list.length) return null;
                    const meta = PHASE_META[ph];
                    return (
                      <View key={ph} className="flex-row items-center" style={{ gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" }}>
                        <Text style={{ fontSize: 11, fontWeight: "500", color: "#4b5563" }}>{meta.label}</Text>
                        <Text style={{ fontSize: 10, color: "#9ca3af" }}>{list.length}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {testObjectives.length > 0 ? (
              <AreaInput
                label="รายละเอียดการประเมิน"
                value={whatToTestText}
                onChange={setWhatToTestText}
                rows={6}
                placeholder={"กลิ่นและเนื้อสัมผัส\nผลลัพธ์ใน 14 วัน\nการระคายเคือง"}
                hint="ข้อมูลถูกดึงมาจากชุดคำถามอัตโนมัติ — สามารถพิมพ์เพิ่มเติม / แก้ไขได้"
              />
            ) : null}
          </View>
        );
      default:
        return null;
    }
  };

  /* =====================================================================
   *  Render — full-bleed stacked sections + floating glass save bar (same
   *  shell as the other create pages)
   * ===================================================================== */
  return (
    <FocusScrollCtx.Provider value={onInputFocus}>
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={editing ? "แก้ไขสินค้าทดลอง" : "เพิ่มสินค้าทดลองใหม่"}
        onBack={() => nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView
          ref={bodyScrollRef}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {sections.map((s) => (
            <View key={s.id} style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
              {renderSection(s.id)}
            </View>
          ))}
        </ScrollView>
        {/* Scroll fades — content dissolves into the header / bottom edge */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
        <BottomFade />
      </View>

      {/* Floating Liquid Glass save bar — same as the other create pages */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
        <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
          <GlassView glassEffectStyle="regular" colorScheme="light" tintColor={GLASS_BAR_TINT} style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
            <Pressable onPress={save} className="flex-row items-center justify-center active:opacity-90" style={{ flex: 1, height: 50, borderRadius: 999, gap: 8, backgroundColor: canSave ? BRAND_GREEN : "#d4d4d4" }}>
              <Save size={17} color="#fff" strokeWidth={2.6} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{editing ? "บันทึกการแก้ไข" : "บันทึกสินค้า"}</Text>
            </Pressable>
          </GlassView>
        </View>
      </View>

    </View>
    </FocusScrollCtx.Provider>
  );
}
