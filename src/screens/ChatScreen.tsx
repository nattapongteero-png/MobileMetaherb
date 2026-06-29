import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Send, Camera, Store } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { PressableScale } from "../components/PressableScale";
import { getImagePicker } from "../utils/imagePicker";
import { useChat } from "../context/ChatContext";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
import {
  BRAND_GREEN,
  BRAND_GREEN_DARK,
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
  image?: string;
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
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      onSubmitEditing={props.onSubmit}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      placeholder="พิมพ์ข้อความ..."
      placeholderTextColor={TEXT_MUTED}
      multiline
      blurOnSubmit={false}
      style={{
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        paddingRight: 10,
        paddingTop: 11,
        paddingBottom: 11,
        fontSize: 15,
        color: "#0a0a0a",
      }}
    />
  );
}

function Bubble({ msg, shopName }: { msg: ChatMessage; shopName: string }) {
  const isUser = msg.sender === "user";
  return (
    <View style={{ alignItems: isUser ? "flex-end" : "flex-start" }}>
      {msg.image ? (
        <Image
          source={{ uri: msg.image }}
          style={{
            width: 200,
            height: 200,
            borderRadius: 18,
            backgroundColor: "#eee",
            borderBottomRightRadius: isUser ? 4 : 18,
            borderBottomLeftRadius: isUser ? 18 : 4,
          }}
          resizeMode="cover"
        />
      ) : (
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
      )}
      <Text
        style={{
          fontSize: 10,
          color: TEXT_MUTED,
          marginTop: 3,
          marginHorizontal: 4,
        }}
      >
        {isUser ? msg.time : `${shopName} • ${msg.time}`}
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
  const nav = useNavigation<Nav>();
  const { markRead } = useChat();
  const route = useRoute<RouteProp<RootStackParamList, "Chat">>();
  const shopId = route.params?.shopId ?? "metaherb";
  const shopName = route.params?.shopName ?? SHOP_NAME;
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [input, setInput] = useState("");
  const [replying, setReplying] = useState(false);
  const [focused, setFocused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Input bar widens on focus — side margins shrink 24 → 16 (matches the AI bar).
  const focusOn = useSharedValue(0);
  useEffect(() => { focusOn.value = withTiming(focused ? 1 : 0, { duration: 300 }); }, [focused, focusOn]);
  const composerPad = useAnimatedStyle(() => ({ paddingHorizontal: 16 }));

  // Opening this conversation clears its unread badge.
  useEffect(() => {
    markRead(shopId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

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

  // Simulated shop auto-reply (web waits 1500ms).
  const triggerReply = useCallback(() => {
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
  }, []);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      const userMsg: ChatMessage = { id: `m${Date.now()}`, sender: "user", text, time: nowTime() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      triggerReply();
    },
    [triggerReply],
  );

  const sendImage = useCallback(
    (uri: string) => {
      const msg: ChatMessage = { id: `m${Date.now()}`, sender: "user", text: "", time: nowTime(), image: uri };
      setMessages((prev) => [...prev, msg]);
      triggerReply();
    },
    [triggerReply],
  );

  const pickFrom = async (source: "camera" | "library") => {
    const ImagePicker = getImagePicker();
    if (!ImagePicker) return;
    try {
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("ต้องอนุญาตใช้กล้อง", "เปิดสิทธิ์กล้องในการตั้งค่าเพื่อถ่ายรูปส่งในแชท");
          return;
        }
        const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
        if (!res.canceled) res.assets.forEach((a) => sendImage(a.uri));
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("ต้องอนุญาตเข้าถึงรูปภาพ", "เปิดสิทธิ์คลังรูปในการตั้งค่าเพื่อส่งรูปในแชท");
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsMultipleSelection: true });
        if (!res.canceled) res.assets.forEach((a) => sendImage(a.uri));
      }
    } catch {
      Alert.alert("ส่งรูปไม่สำเร็จ", "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  };

  const choosePhoto = () => {
    if (!getImagePicker()) {
      Alert.alert("ยังส่งรูปไม่ได้", "ตัวรันนี้ยังไม่มีโมดูลกล้อง/คลัง — ต้อง build แอปใหม่จึงจะถ่าย/ส่งรูปได้");
      return;
    }
    Alert.alert("ส่งรูปภาพ", "เลือกแหล่งรูปภาพ", [
      { text: "ถ่ายภาพ", onPress: () => pickFrom("camera") },
      { text: "เลือกจากคลังภาพ", onPress: () => pickFrom("library") },
      { text: "ยกเลิก", style: "cancel" },
    ]);
  };

  const canSend = input.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={shopName}
        subtitle="ออนไลน์ • ตอบกลับภายในไม่กี่นาที"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={
          <GlassIconButton onPress={() => nav.navigate("Shop")} accessibilityLabel="ไปที่ร้านค้า">
            <Store size={20} color="#1a1a1a" strokeWidth={2.2} />
          </GlassIconButton>
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          {/* Messages — scroll behind the floating input (paddingBottom clears the bar) */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 132 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEnd}
          >
            {messages.map((msg) => (
              <Bubble key={msg.id} msg={msg} shopName={shopName} />
            ))}
            {replying && <TypingBubble />}
          </ScrollView>

          {/* Bottom fade so messages dissolve as they pass behind the bar */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(250,250,250,0)", "#fafafa"]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150 }}
          />

          {/* Floating overlay — quick replies + input bar (content scrolls behind) */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
            {/* Quick-reply chips — hidden while typing */}
            {!focused ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 8, gap: 8 }}
                style={{ flexGrow: 0 }}
              >
                {QUICK_REPLIES.map((q) => (
                  <PressableScale key={q} onPress={() => send(q)} scaleTo={0.94}>
                    <GlassView
                      glassEffectStyle="regular"
                      colorScheme="light"
                      tintColor="rgba(49,151,84,0.12)"
                      isInteractive
                      style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(49,151,84,0.3)" }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "500", color: BRAND_GREEN_DARK }}>{q}</Text>
                    </GlassView>
                  </PressableScale>
                ))}
              </ScrollView>
            ) : null}

            <Reanimated.View style={[{ paddingBottom: 18 }, composerPad]}>
              <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
                <GlassView
                  glassEffectStyle="regular"
                  colorScheme="light"
                  style={{ borderRadius: 34, overflow: "hidden", padding: 9, flexDirection: "row", alignItems: "flex-end", gap: 6 }}
                >
                  {/* Gray field — wraps the camera button and the text input together */}
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", backgroundColor: "#f5f5f5", borderRadius: 22, minHeight: 44, paddingLeft: 2 }}>
                    <Pressable
                      onPress={choosePhoto}
                      hitSlop={6}
                      style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }}
                      accessibilityRole="button"
                      accessibilityLabel="ส่งรูปภาพ"
                    >
                      <Camera size={22} color={BRAND_GREEN} strokeWidth={2.2} />
                    </Pressable>
                    <MessageInput value={input} onChangeText={setInput} onSubmit={() => send(input)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
                  </View>
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
                </GlassView>
              </View>
            </Reanimated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
