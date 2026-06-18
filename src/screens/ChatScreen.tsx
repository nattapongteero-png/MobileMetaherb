import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send } from "lucide-react-native";
import {
  BRAND_GREEN,
  BRAND_GREEN_DARK,
  BRAND_GREEN_TINT,
  TEXT_MUTED,
} from "../theme/tokens";

/**
 * Shop chat ("คุยกับร้านค้า") — ported from the web ChatModal `UserChat` view,
 * defaulting to the main "METAHERB Store" thread (shopId "metaherb").
 *
 * Web seed messages, quick replies and the 1.5s random shop auto-reply are
 * preserved; the layout is rebuilt as a proper mobile pushed-stack screen.
 */

type Sender = "user" | "shop";

interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  time: string;
}

// Seeded from mockChatRooms[0] (METAHERB Store) in the web ChatContext.
const SEED_MESSAGES: ChatMessage[] = [
  { id: "m1", sender: "shop", text: "สวัสดีค่ะ ยินดีให้บริการ 🌿", time: "10:00" },
  { id: "m2", sender: "user", text: "สอบถามเรื่องชาออร์แกนิกครับ", time: "10:01" },
  {
    id: "m3",
    sender: "shop",
    text: "ชาออร์แกนิกของเราเป็นชาสมุนไพร 100% จากดอยเชียงใหม่ค่ะ ปลูกแบบไม่ใช้สารเคมี มี 5 รสชาติให้เลือก",
    time: "10:02",
  },
  { id: "m4", sender: "user", text: "มีรสชาติไหนบ้างครับ?", time: "10:03" },
  {
    id: "m5",
    sender: "shop",
    text: "มี ดอกคำฝอย, ตะไคร้, ขิง, มะตูม, และใบเตยค่ะ แนะนำรสตะไคร้นะคะ ขายดีที่สุดเลย 😊",
    time: "10:04",
  },
];

// Quick-reply suggestions (web `chat_quick_q1..q4`).
const QUICK_REPLIES = [
  "สินค้ามีพร้อมส่งไหม?",
  "ค่าจัดส่งเท่าไหร่?",
  "มีโปรโมชั่นไหม?",
  "ขอดูรีวิวหน่อย",
];

// Shop auto-reply pool (web `sendMessage`).
const SHOP_REPLIES = [
  "ขอบคุณค่ะ รอสักครู่นะคะ 😊",
  "สินค้ามีพร้อมจัดส่งเลยค่ะ",
  "สามารถสั่งซื้อได้เลยค่ะ ส่งฟรี!",
  "หากมีข้อสงสัยเพิ่มเติม ทักมาได้ตลอดนะคะ",
  "ของพร้อมส่งค่ะ สั่งวันนี้ ส่งวันนี้เลย 🚚",
];

const SHOP_NAME = "METAHERB Store";

function nowTime() {
  return new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Pill text input — kept at module scope per project convention. */
function MessageInput(props: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      onSubmitEditing={props.onSubmit}
      placeholder="พิมพ์ข้อความ..."
      placeholderTextColor={TEXT_MUTED}
      multiline
      blurOnSubmit={false}
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
    />
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.sender === "user";
  return (
    <View style={{ alignItems: isUser ? "flex-end" : "flex-start" }}>
      <View
        style={{
          maxWidth: "78%",
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 18,
          backgroundColor: isUser ? BRAND_GREEN : "#ffffff",
          borderWidth: isUser ? 0 : 1,
          borderColor: "#ececed",
          // Tight corner toward the speaker's side.
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: isUser ? "#ffffff" : "#0a0a0a",
          }}
        >
          {msg.text}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 10,
          color: TEXT_MUTED,
          marginTop: 3,
          marginHorizontal: 4,
        }}
      >
        {isUser ? msg.time : `${SHOP_NAME} • ${msg.time}`}
      </Text>
    </View>
  );
}

/** Animated-ish three-dot "typing" bubble (left-aligned, shop side). */
function TypingBubble() {
  return (
    <View style={{ alignItems: "flex-start" }}>
      <View
        style={{
          flexDirection: "row",
          gap: 4,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#ececed",
        }}
      >
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: TEXT_MUTED,
              opacity: 0.4 + i * 0.2,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [input, setInput] = useState("");
  const [replying, setReplying] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, replying, scrollToEnd]);

  useEffect(() => {
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, []);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;

      const userMsg: ChatMessage = {
        id: `m${Date.now()}`,
        sender: "user",
        text,
        time: nowTime(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      // Simulated shop auto-reply (web waits 1500ms).
      setReplying(true);
      if (replyTimer.current) clearTimeout(replyTimer.current);
      replyTimer.current = setTimeout(() => {
        const reply: ChatMessage = {
          id: `m${Date.now() + 1}`,
          sender: "shop",
          text: SHOP_REPLIES[Math.floor(Math.random() * SHOP_REPLIES.length)],
          time: nowTime(),
        };
        setReplying(false);
        setMessages((prev) => [...prev, reply]);
      }, 1500);
    },
    [],
  );

  const canSend = input.trim().length > 0;

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
        {messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} />
        ))}
        {replying && <TypingBubble />}
      </ScrollView>

      {/* Quick-reply chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 8,
        }}
        style={{ flexGrow: 0 }}
      >
        {QUICK_REPLIES.map((q) => (
          <Pressable
            key={q}
            onPress={() => send(q)}
            hitSlop={6}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: BRAND_GREEN,
              backgroundColor: pressed ? BRAND_GREEN_TINT : "transparent",
            })}
          >
            <Text style={{ fontSize: 12, color: BRAND_GREEN_DARK }}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

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
            backgroundColor: "#ffffff",
          }}
        >
          <MessageInput
            value={input}
            onChangeText={setInput}
            onSubmit={() => send(input)}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!canSend}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: canSend ? BRAND_GREEN : "#cfd4d1",
              opacity: canSend ? 1 : 0.7,
            }}
            accessibilityRole="button"
            accessibilityLabel="ส่งข้อความ"
          >
            <Send size={20} color="#ffffff" strokeWidth={2.2} />
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
