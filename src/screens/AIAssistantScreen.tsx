import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Sparkles } from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

/**
 * AI assistant ("เมต้า") chat screen — mobile port of the web AIAssistant.
 *
 * Faithfully reproduces the web reply logic: keyword → intent detection,
 * health-goal extraction, and the keyword-matched canned Thai answers about
 * herbs / products / orders. The web app rendered rich product/comparison
 * cards via a live ProductsContext; on mobile we keep it text-only (this is a
 * pushed mockup screen) but preserve the assistant's voice, suggested prompts,
 * and every Thai copy string verbatim from the web source.
 */

// ===== Greeting (verbatim from AIAssistantContext GREETING) =====
const GREETING_TEXT =
  "สวัสดีค่ะ เมต้าเป็นผู้ช่วยช้อปสมุนไพรของคุณ 🌿 มีอะไรให้เมต้าช่วยไหมคะ — ลองถามได้เลยว่า “หาสินค้าอะไรอยู่” หรือ “แนะนำสินค้าหน่อย”";

// ===== Suggested prompt pool (verbatim — web EMPTY_STATE_CHIPS_POOL) =====
const SUGGESTION_POOL = [
  "แนะนำสมุนไพรช่วยนอนหลับ",
  "ลดน้ำหนัก เริ่มจากตัวไหนดี",
  "บำรุงผิวจากธรรมชาติ",
  "เปรียบเทียบสินค้าขายดี",
  "มีโปรอะไรบ้างวันนี้",
  "สมุนไพรลดความเครียด",
  "ขมิ้นชันกับฟ้าทะลายโจรต่างกันยังไง",
  "บำรุงสายตาด้วยอะไรดี",
  "ตัวไหนช่วยระบบขับถ่าย",
  "งบ 300 ซื้ออะไรได้บ้าง",
  "ของขวัญเพื่อสุขภาพให้คุณแม่",
  "สมุนไพรสำหรับวัยทำงาน",
  "ช่วยเสริมภูมิคุ้มกัน",
  "บำรุงตับ ตัวไหนดี",
  "ลดอาการปวดข้อ",
  "ของกินช่วยไมเกรน",
  "สมุนไพรช่วยลดน้ำตาล",
  "บำรุงผมสำหรับคนผมร่วง",
  "ของขายดีที่สุดอาทิตย์นี้",
  "มีสินค้ามาใหม่อะไรบ้าง",
] as const;

// ===== Reply engine — ported from aiEngine.ts + AIAssistantContext.handle =====

type Intent =
  | "greet"
  | "help"
  | "search"
  | "recommend"
  | "compare"
  | "bundle"
  | "promo"
  | "value"
  | "cart_add"
  | "cart_view"
  | "cart_remove"
  | "checkout"
  | "order_status"
  | "order_recent"
  | "qa"
  | "unknown";

type HealthGoal =
  | "sleep"
  | "weight_loss"
  | "weight_gain"
  | "skin"
  | "hair"
  | "brain"
  | "energy"
  | "immune"
  | "digestion"
  | "joint"
  | "pressure"
  | "diabetes"
  | "senior"
  | "kids"
  | "stress";

// Keyword → canonical goal (verbatim Thai keyword sets from aiEngine GOAL_KEYWORDS).
const GOAL_KEYWORDS: Record<HealthGoal, string[]> = {
  sleep: ["นอน", "หลับ", "อินซอม", "พักผ่อน", "sleep", "insomnia"],
  weight_loss: ["ลดน้ำหนัก", "ลดความอ้วน", "ผอม", "ดีท็อกซ์", "diet", "burn"],
  weight_gain: ["เพิ่มน้ำหนัก", "อ้วน", "บำรุงร่างกาย"],
  skin: ["ผิว", "หน้าใส", "สิว", "ฝ้า", "skin", "คอลลาเจน", "ขาว"],
  hair: ["ผม", "หัวล้าน", "ผมร่วง", "hair"],
  brain: ["สมอง", "ความจำ", "บำรุงสมอง", "memory", "focus", "เด็ก"],
  energy: ["พลังงาน", "อ่อนเพลีย", "เหนื่อย", "energy", "บำรุงกำลัง"],
  immune: ["ภูมิคุ้มกัน", "ป้องกัน", "หวัด", "ไข้หวัด", "immune"],
  digestion: ["ย่อย", "ท้อง", "ขับถ่าย", "ลำไส้", "stomach"],
  joint: ["ข้อ", "เข่า", "ปวดข้อ", "joint", "กระดูก"],
  pressure: ["ความดัน", "blood pressure"],
  diabetes: ["เบาหวาน", "น้ำตาล", "diabetes"],
  senior: ["ผู้สูงอายุ", "คนแก่", "ปู่ย่า", "ตายาย", "senior"],
  kids: ["เด็ก", "ลูก", "kids"],
  stress: ["เครียด", "วิตก", "stress", "anxiety"],
};

// Canonical goal labels (verbatim from aiEngine GOAL_LABEL).
const GOAL_LABEL: Record<HealthGoal, string> = {
  sleep: "ช่วยนอนหลับ",
  weight_loss: "ลดน้ำหนัก",
  weight_gain: "เพิ่มน้ำหนัก",
  skin: "บำรุงผิว",
  hair: "บำรุงผม",
  brain: "บำรุงสมอง",
  energy: "เพิ่มพลังงาน",
  immune: "เสริมภูมิคุ้มกัน",
  digestion: "ช่วยย่อย-ขับถ่าย",
  joint: "บำรุงข้อ-เข่า",
  pressure: "ดูแลความดัน",
  diabetes: "ดูแลเบาหวาน",
  senior: "ผู้สูงอายุ",
  kids: "สำหรับเด็ก",
  stress: "ลดความเครียด",
};

// Curated product hints per goal — lets the text-only mobile assistant name
// real products without a live catalog (drawn from aiEngine GOAL_PRODUCT_HINTS).
const GOAL_PICKS: Record<HealthGoal, string[]> = {
  sleep: ["ชาคาโมมายล์", "ดอกคำฝอยอบแห้ง", "น้ำมันลาเวนเดอร์"],
  weight_loss: ["ชาดีท็อกซ์สมุนไพร", "ขมิ้นชันแคปซูล", "ชาเขียวมัทฉะ"],
  weight_gain: ["โสมเกาหลีสกัด", "ถั่งเช่าแคปซูล"],
  skin: ["คอลลาเจนเปปไทด์", "วิตามินซีสกัดจากธรรมชาติ", "สบู่สมุนไพร"],
  hair: ["อาหารเสริมไบโอติน", "สารสกัดใบบัวบก"],
  brain: ["สารสกัดใบบัวบก", "แปะก๊วยแคปซูล"],
  energy: ["โสมเกาหลีสกัด", "ถั่งเช่าแคปซูล", "วิตามินบีรวม"],
  immune: ["ฟ้าทะลายโจรแคปซูล", "ขมิ้นชันแคปซูล", "เห็ดหลินจือสกัด"],
  digestion: ["ขิงผงชงดื่ม", "มะรุมแคปซูล", "ฟ้าทะลายโจรแคปซูล"],
  joint: ["ขมิ้นชันแคปซูล", "ไพลสกัด", "คอลลาเจนบำรุงข้อ"],
  pressure: ["รางจืดแคปซูล", "สารสกัดใบบัวบก", "กระเทียมสกัด"],
  diabetes: ["มะระขี้นกแคปซูล", "ฟ้าทะลายโจรแคปซูล", "สารสกัดใบบัวบก"],
  senior: ["แคลเซียมสมุนไพร", "เห็ดหลินจือสกัด", "คอลลาเจนเปปไทด์"],
  kids: ["วิตามินซีสำหรับเด็ก", "เอลเดอร์เบอร์รี่ไซรัป"],
  stress: ["ชาคาโมมายล์", "น้ำมันลาเวนเดอร์", "อโรม่าสมุนไพร"],
};

// Intent parser — verbatim regex order from aiEngine detectIntent.
function detectIntent(text: string): Intent {
  const t = text.toLowerCase().trim();
  if (!t) return "unknown";
  if (/^(สวัสดี|hello|hi|หวัดดี|ดีครับ|ดีค่ะ)/i.test(t)) return "greet";
  if (/(ช่วยอะไร|ทำอะไรได้|ใช้งานยังไง|วิธีใช้|how to use|what can you)/i.test(t)) return "help";

  if (/(เปรียบเทียบ|compare|ต่างกัน|แบบไหนดีกว่า)/.test(t)) return "compare";
  if (/(จัดเซต|bundle|ชุด|แพ็ค|รวม|set)/.test(t)) return "bundle";
  if (/(โปร|promo|ส่วนลด|คูปอง|coupon|deal)/.test(t)) return "promo";
  if (/(คุ้ม|ความคุ้ม|value|ราคาต่อ|คุ้มกว่า)/.test(t)) return "value";

  if (/(เพิ่มใส่|ใส่ตะกร้า|add to cart|หยิบ.*ตะกร้า)/.test(t)) return "cart_add";
  if (/(ตะกร้า|cart|รถเข็น)/.test(t) && /(ดู|แสดง|เปิด|view)/.test(t)) return "cart_view";
  if (/(เอาออก|ลบ.*ตะกร้า|remove)/.test(t)) return "cart_remove";
  if (/(ชำระ|checkout|สั่งซื้อ|สั่ง.*เลย|order now)/.test(t)) return "checkout";

  if (/(ออเดอร์.*ถึงไหน|order.*status|ติดตาม|เลข.*track|tracking)/.test(t)) return "order_status";
  if (/(ออเดอร์.*ล่าสุด|ประวัติ.*สั่ง|orders|my orders)/.test(t)) return "order_recent";

  if (/(แนะนำ|recommend|มีอะไร|มีตัว|แบบไหน|suggest)/.test(t)) return "recommend";
  if (/(หา|search|มี.*ไหม|มี|อยาก.*หา|มอง)/.test(t)) return "search";

  if (/(วิธีรับประทาน|กิน.*ยังไง|วิธี.*ใช้|ส่วนประกอบ|ข้อควรระวัง|กลุ่ม.*เหมาะ)/.test(t)) return "qa";

  return "unknown";
}

// Goal extraction — verbatim logic from aiEngine extractGoals.
function extractGoals(text: string): HealthGoal[] {
  const t = text.toLowerCase();
  const hits: HealthGoal[] = [];
  (Object.keys(GOAL_KEYWORDS) as HealthGoal[]).forEach((g) => {
    if (GOAL_KEYWORDS[g].some((kw) => t.includes(kw.toLowerCase()))) hits.push(g);
  });
  return hits;
}

// Budget extraction — verbatim from aiEngine extractBudget.
function extractBudget(text: string): number | undefined {
  const m = text.match(/(\d{2,5})\s*(บาท|baht|฿|thb)?/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 50 && n <= 100000) return n;
  }
  return undefined;
}

// Quick-reply chips keyed on the last detected intent (verbatim from aiEngine quickReplies).
function quickReplies(intent: Intent, lastGoal?: HealthGoal): string[] {
  switch (intent) {
    case "greet":
    case "unknown":
      return ["มีสมุนไพรช่วยนอนหลับไหม", "อยากลดน้ำหนัก แนะนำหน่อย", "เปรียบเทียบสินค้าขายดี", "ออเดอร์ล่าสุด"];
    case "search":
    case "recommend":
      return ["จัดเซตแนะนำให้หน่อย", "ตัวที่ถูกที่สุด", "เปรียบเทียบ 2 ตัวบนสุด", "ดูโปรโมชั่น"];
    case "compare":
      return ["ตัวไหนคุ้มกว่า", "เพิ่มตัวคุ้มสุดเข้าตะกร้า", "มีโปรไหม"];
    case "cart_view":
    case "promo":
      return ["ชำระเงิน", "แนะนำของแถม", "ลบสินค้าออก"];
    case "checkout":
      return ["ใช้ที่อยู่เดิม", "เลือกที่อยู่อื่น", "ยกเลิก"];
    default:
      return ["หาสินค้าใหม่", "ตะกร้า", "ออเดอร์ของฉัน", lastGoal ? `${GOAL_LABEL[lastGoal]} อะไรดี` : "จัดเซตแนะนำ"];
  }
}

// Build the assistant's reply text. Ports the branch-by-intent copy from
// AIAssistantContext.handle, keeping every Thai string verbatim. Where the web
// rendered a rich card from live data, mobile substitutes an equivalent text
// answer drawn from the curated goal picks above.
function buildReply(text: string, lastGoal?: HealthGoal): { reply: string; intent: Intent; goal?: HealthGoal } {
  const intent = detectIntent(text);
  const newGoals = extractGoals(text);
  const budget = extractBudget(text);
  const activeGoal = newGoals[0] ?? lastGoal;

  switch (intent) {
    case "greet":
      return {
        reply:
          "สวัสดีค่ะ! ลองบอก goal สุขภาพ เช่น “นอนไม่หลับ” หรือ “บำรุงผิว” ฉันจะแนะนำสินค้าที่เหมาะกับคุณ",
        intent,
        goal: activeGoal,
      };
    case "help":
      return {
        reply:
          "ฉันช่วยอะไรได้บ้าง:\n• ค้นหา/แนะนำสมุนไพรตามอาการ\n• เปรียบเทียบ + วิเคราะห์ความคุ้มค่า\n• จัดเซตประหยัด + แนะนำโปรโมชั่น\n• เพิ่ม/ลบสินค้าในตะกร้า + ชำระเงิน\n• ดูสถานะออเดอร์",
        intent,
        goal: activeGoal,
      };
    case "search":
    case "recommend": {
      if (activeGoal) {
        const picks = GOAL_PICKS[activeGoal];
        const head = `จาก goal “${GOAL_LABEL[activeGoal]}”${budget ? ` ภายในงบ ฿${budget}` : ""} แนะนำ:`;
        return { reply: `${head}\n${picks.map((p) => `• ${p}`).join("\n")}`, intent, goal: activeGoal };
      }
      return {
        reply:
          "ขอโทษค่ะ ยังไม่พบสินค้าที่ตรงเลย ลองใช้คำที่กว้างขึ้น หรือบอก goal เช่น “นอนหลับ”, “บำรุงผิว”",
        intent,
        goal: activeGoal,
      };
    }
    case "compare":
      return {
        reply:
          "บอกชื่อสินค้า 2 ตัวที่อยากเทียบได้เลยค่ะ เมต้าจะเทียบให้ทั้งราคา ส่วนลด คะแนนรีวิว และความคุ้มค่า แล้วสรุปว่าตัวไหนเหมาะกับคุณที่สุด",
        intent,
        goal: activeGoal,
      };
    case "bundle": {
      const picks = activeGoal ? GOAL_PICKS[activeGoal] : GOAL_PICKS.immune;
      const name = activeGoal ? `ชุด${GOAL_LABEL[activeGoal]}` : "ชุดแนะนำ";
      return {
        reply: `ฉันจัดชุดให้แล้วค่ะ — ${name} ราคารวมพิเศษ:\n${picks.map((p) => `• ${p}`).join("\n")}\nรับส่วนลดเพิ่ม 10% เมื่อซื้อทั้งชุด`,
        intent,
        goal: activeGoal,
      };
    }
    case "promo":
      return {
        reply: "เพิ่มสินค้าเข้าตะกร้าก่อนนะคะ ฉันจะช่วยหาโปรที่ใช่ให้",
        intent,
        goal: activeGoal,
      };
    case "value":
      return {
        reply: "ลองค้นหาสินค้าก่อน แล้วค่อยถามความคุ้มค่าได้นะคะ",
        intent,
        goal: activeGoal,
      };
    case "cart_add":
      return {
        reply:
          "ยังไม่แน่ใจว่าจะหยิบตัวไหน — ลองพิมพ์ชื่อสินค้าให้ชัดขึ้น หรือกดปุ่ม “เพิ่มเข้าตะกร้า” ใต้การ์ดสินค้าได้เลย",
        intent,
        goal: activeGoal,
      };
    case "cart_remove":
      return { reply: "ตะกร้ายังว่างอยู่ค่ะ", intent, goal: activeGoal };
    case "cart_view":
      return {
        reply: "ตะกร้ายังว่างอยู่ค่ะ ลองหาสินค้าก่อนนะคะ",
        intent,
        goal: activeGoal,
      };
    case "checkout":
      return { reply: "กรุณาเข้าสู่ระบบก่อนสั่งซื้อนะคะ", intent, goal: activeGoal };
    case "order_status":
    case "order_recent":
      return { reply: "ยังไม่มีออเดอร์ในระบบค่ะ", intent, goal: activeGoal };
    case "qa":
      return { reply: "บอกชื่อสินค้าให้แม่นยำขึ้นได้ไหมคะ ฉันจะดึงข้อมูลให้", intent, goal: activeGoal };
    default: {
      if (activeGoal) {
        const picks = GOAL_PICKS[activeGoal];
        return { reply: `ลองดูตัวเลือกเหล่านี้ดูนะคะ:\n${picks.map((p) => `• ${p}`).join("\n")}`, intent, goal: activeGoal };
      }
      return {
        reply: "ฉันยังไม่เข้าใจคำขอ — ลองเลือกจากคำถามแนะนำด้านล่างก็ได้ค่ะ",
        intent,
        goal: activeGoal,
      };
    }
  }
}

// ===== Message model =====

type Role = "user" | "ai";
interface Msg {
  id: string;
  role: Role;
  text: string;
  ts: number;
}

let _seq = 0;
const uid = () => `m_${Date.now()}_${_seq++}`;

const timeLabel = (ts: number) =>
  new Date(ts).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

// ===== Module-scope TextInput helper (chat composer field) =====
function ChatInput(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      multiline
      style={{
        flex: 1,
        backgroundColor: "#f5f5f5",
        minHeight: 44,
        maxHeight: 120,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingTop: 11,
        paddingBottom: 11,
        fontSize: 15,
        color: "#0a0a0a",
      }}
      placeholderTextColor={TEXT_MUTED}
    />
  );
}

// ===== Avatar — Sparkles in a brand-tinted circle (no external assets) =====
function AssistantAvatar() {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(49,151,84,0.12)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Sparkles size={16} color={BRAND_GREEN} strokeWidth={2.2} />
    </View>
  );
}

// ===== Typing indicator — three pulsing dots in an incoming bubble =====
function TypingBubble() {
  return (
    <View style={{ alignSelf: "flex-start", maxWidth: "78%" }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <AssistantAvatar />
        <View
          style={{
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "#ececed",
            borderRadius: 18,
            borderBottomLeftRadius: 6,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: "row",
            gap: 5,
          }}
        >
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: i === 1 ? BRAND_GREEN : "#c4c4c6",
              }}
            />
          ))}
        </View>
      </View>
      <Text style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: 40, marginTop: 3 }}>
        เมต้ากำลังคิด...
      </Text>
    </View>
  );
}

// ===== One message bubble =====
function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  if (isUser) {
    return (
      <View style={{ alignSelf: "flex-end", maxWidth: "78%", alignItems: "flex-end" }}>
        <View
          style={{
            backgroundColor: BRAND_GREEN,
            borderRadius: 18,
            borderBottomRightRadius: 6,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 15, lineHeight: 21 }}>{msg.text}</Text>
        </View>
        <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 3 }}>{timeLabel(msg.ts)}</Text>
      </View>
    );
  }
  return (
    <View style={{ alignSelf: "flex-start", maxWidth: "78%" }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <AssistantAvatar />
        <View
          style={{
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "#ececed",
            borderRadius: 18,
            borderBottomLeftRadius: 6,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexShrink: 1,
          }}
        >
          <Text style={{ color: "#1a1a1a", fontSize: 15, lineHeight: 22 }}>{msg.text}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: 40, marginTop: 3 }}>
        เมต้า · {timeLabel(msg.ts)}
      </Text>
    </View>
  );
}

// ===== Quick-reply / suggestion chip =====
function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "rgba(49,151,84,0.12)" : "#ffffff",
        borderWidth: 1,
        borderColor: pressed ? BRAND_GREEN : "#e5e7eb",
        borderRadius: 100,
        paddingHorizontal: 14,
        paddingVertical: 8,
      })}
    >
      <Text style={{ fontSize: 13, color: TEXT_SECONDARY }}>{label}</Text>
    </Pressable>
  );
}

export function AIAssistantScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "greet", role: "ai", text: GREETING_TEXT, ts: Date.now() },
  ]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [chips, setChips] = useState<string[]>(() => SUGGESTION_POOL.slice(0, 5));
  const lastGoalRef = useRef<HealthGoal | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);

  // Whether the conversation is still on just the greeting (mirrors web isEmpty).
  const isEmpty = messages.length <= 1;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || typing) return;

      const userMsg: Msg = { id: uid(), role: "user", text: trimmed, ts: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setText("");
      setTyping(true);
      scrollToEnd();

      // Simulate the AI "thinking" delay (web used a ~550ms mock), then append the reply.
      setTimeout(() => {
        const { reply, intent, goal } = buildReply(trimmed, lastGoalRef.current);
        lastGoalRef.current = goal ?? lastGoalRef.current;
        const aiMsg: Msg = { id: uid(), role: "ai", text: reply, ts: Date.now() };
        setMessages((prev) => [...prev, aiMsg]);
        setChips(quickReplies(intent, lastGoalRef.current));
        setTyping(false);
        scrollToEnd();
      }, 650);
    },
    [typing, scrollToEnd],
  );

  const canSend = text.trim().length > 0 && !typing;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={96}
      style={{ flex: 1, backgroundColor: "#fafafa" }}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToEnd}
      >
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
        {typing && <TypingBubble />}
      </ScrollView>

      {/* Suggestions row — on the empty greeting, show the prompt pool;
          afterwards, show intent-aware quick replies. Tap fills + sends. */}
      {(isEmpty || (!typing && chips.length > 0)) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
        >
          {(isEmpty ? [...SUGGESTION_POOL.slice(0, 5)] : chips).map((c) => (
            <Chip key={c} label={c} onPress={() => send(c)} />
          ))}
        </ScrollView>
      )}

      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fafafa" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 8,
            borderTopWidth: 1,
            borderTopColor: "#ececed",
          }}
        >
          <ChatInput
            value={text}
            onChangeText={setText}
            placeholder="พิมพ์คำถามหรือสิ่งที่คุณต้องการ…"
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => send(text)}
            disabled={!canSend}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: canSend ? BRAND_GREEN : "#e5e7eb",
              alignItems: "center",
              justifyContent: "center",
              opacity: canSend ? 1 : 0.7,
            }}
            android_ripple={{ color: BRAND_GREEN_DARK, borderless: true }}
            accessibilityLabel="ส่ง"
          >
            <Send size={20} color={canSend ? "#ffffff" : TEXT_MUTED} strokeWidth={2.2} />
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
