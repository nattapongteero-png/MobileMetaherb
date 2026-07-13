import { GLASS_BAR_TINT } from "../theme/tokens";
import { glassTint } from "../theme/tokens";
import { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable, Image, Dimensions,
  KeyboardAvoidingView, Platform, Keyboard, Alert, Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import Animated, {
  FadeOut, FadeInDown, ZoomIn, ZoomOut, Keyframe, useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  cancelAnimation, Easing, withSequence, withDelay,
} from "react-native-reanimated";
import {
  Plus, History, Send, Sparkles, Check, Tag, ShoppingCart, ArrowRight, Camera, Mic,
  Moon, Activity, Scale, Brain, Shield, Wallet, Gift, Package, Leaf, Receipt, X,
  BookOpen,
  type LucideIcon,
} from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { getImagePicker } from "../utils/imagePicker";
import { SubPageHeader } from "../components/SubPageHeader";
import { PressableScale } from "../components/PressableScale";
import { ProductCard } from "../components/ProductCard";
import { useAIAssistant, type AIMessage } from "../context/AIAssistantContext";
import { getRealProductImage } from "../data/realProducts";
import { getSpeech } from "../utils/speech";
import { getTts } from "../utils/tts";
import { elevenSpeak, stopEleven } from "../utils/elevenlabs";
import { voxSpeak, stopVox } from "../utils/voxtts";
import { STATUS_LABEL } from "../data/orders";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";
import { appWidth, gridColumns, gridCardWidth } from "../theme/layout";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const SCREEN_WIDTH = appWidth();
const AI_GRAD = ["#0088ff", "#6366f1", "#9747ff"] as const;
const AI_PURPLE = "#6366f1";
const META_AI = require("../../assets/meta-ai.gif");
const TAU = Math.PI * 2;
const GLOW_R = 5; // how far the glow drifts off-center as it circles

const CHIP_POOL = [
  "แนะนำสมุนไพรช่วยนอนหลับ", "ลดน้ำหนัก เริ่มจากตัวไหนดี", "บำรุงผิวจากธรรมชาติ",
  "เปรียบเทียบสินค้าขายดี", "มีโปรอะไรบ้างวันนี้", "สมุนไพรลดความเครียด",
  "ช่วยเสริมภูมิคุ้มกัน", "งบ 300 ซื้ออะไรได้บ้าง", "ของขวัญเพื่อสุขภาพให้คุณแม่",
  "จัดเซตแนะนำให้หน่อย", "ช่วยย่อย-ขับถ่ายตัวไหนดี", "ออเดอร์ล่าสุดของฉัน",
];
function pickChips(): string[] {
  const a = [...CHIP_POOL];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, 5);
}

/** Pick a topic icon for a suggestion / quick-reply chip from its text. */
function iconFor(label: string): LucideIcon {
  const t = label.toLowerCase();
  if (/(นอน|หลับ)/.test(t)) return Moon;
  if (/(ลดน้ำหนัก|ผอม|อ้วน)/.test(t)) return Activity;
  if (/(ผิว|หน้าใส|คอลลาเจน)/.test(t)) return Sparkles;
  if (/(เปรียบเทียบ|ต่างกัน|คุ้ม|ถูก)/.test(t)) return Scale;
  if (/(โปร|ส่วนลด|คูปอง|ของแถม)/.test(t)) return Tag;
  if (/(เครียด|สมอง|วิตก)/.test(t)) return Brain;
  if (/(ภูมิ|ป้องกัน|หวัด)/.test(t)) return Shield;
  if (/(งบ|฿|\d)/.test(t)) return Wallet;
  if (/(ของขวัญ|ของฝาก)/.test(t)) return Gift;
  if (/(เซต|ชุด|แพ็ค)/.test(t)) return Package;
  if (/(ย่อย|ขับถ่าย|ลำไส้)/.test(t)) return Leaf;
  if (/(ออเดอร์|คำสั่งซื้อ|สถานะ)/.test(t)) return Receipt;
  if (/(ตะกร้า|ชำระ)/.test(t)) return ShoppingCart;
  return Sparkles;
}

// Web-parity chip transitions: scale + fade + slide, staggered on enter.
const chipEnter = (i: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.85 }, { translateY: 6 }] },
    100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  }).duration(300).delay(i * 55);
const chipExit = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  100: { opacity: 0, transform: [{ scale: 0.9 }, { translateY: -6 }] },
}).duration(190);

export function AIAssistantScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "AIAssistant">>();
  const { messages, typing, send, sendImage, setPageContext, quickReplyChips, markRead, newChat } = useAIAssistant();
  useEffect(() => { setPageContext(route.params?.context); }, [route.params, setPageContext]);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voicePhase, setVoicePhase] = useState<"listening" | "thinking" | "speaking">("listening");
  const [interim, setInterim] = useState("");
  const subsRef = useRef<{ remove: () => void }[]>([]);
  const finalRef = useRef("");
  const voiceModeRef = useRef(false);
  const spokenRef = useRef<string | null>(null);
  const lastTranscriptRef = useRef("");
  const voiceIdRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);

  // Composer focus glow — a soft blue + purple halo that slowly circles the
  // floating bar while focused (two colored shadow layers, opposite phase).
  const rot = useSharedValue(0); // 0→1 continuous, drives the orbit angle
  const on = useSharedValue(0);  // 0/1, fades the colored glow in on focus
  useEffect(() => {
    rot.value = withRepeat(withTiming(1, { duration: 5000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [rot]);
  useEffect(() => { on.value = withTiming(focused ? 1 : 0, { duration: 300 }); }, [focused, on]);
  const glowA = useAnimatedStyle(() => {
    const a = rot.value * TAU;
    return {
      shadowColor: "#0088ff",
      shadowOffset: { width: Math.cos(a) * GLOW_R, height: Math.sin(a) * GLOW_R },
      shadowRadius: 11,
      shadowOpacity: on.value * 0.38,
    };
  });
  const glowB = useAnimatedStyle(() => {
    const a = rot.value * TAU + Math.PI;
    return {
      shadowColor: "#9747ff",
      shadowOffset: { width: Math.cos(a) * GLOW_R, height: Math.sin(a) * GLOW_R },
      shadowRadius: 11,
      shadowOpacity: on.value * 0.38,
    };
  });
  // Bar widens on focus — side margins shrink 24 → 16.
  const composerPad = useAnimatedStyle(() => ({ paddingHorizontal: 16 }));

  // Pick a photo (camera or library), downscale + base64-encode, and hand it to
  // เมต้า for vision analysis. Keeps the payload small (quality 0.5) so the
  // multimodal request stays fast; caption = whatever's typed in the composer.
  const runPicker = async (mode: "camera" | "library") => {
    const ImagePicker = getImagePicker();
    if (!ImagePicker) { Alert.alert("ยังไม่พร้อม", "ฟีเจอร์รูปภาพต้องอัปเดต/รีบิลด์แอปก่อนนะครับ"); return; }
    try {
      const perm =
        mode === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm?.granted) { Alert.alert("ต้องอนุญาต", mode === "camera" ? "กรุณาอนุญาตการใช้กล้อง" : "กรุณาอนุญาตการเข้าถึงรูปภาพ"); return; }
      const opts = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, base64: true } as const;
      const res = mode === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.base64) { Alert.alert("ผิดพลาด", "อ่านรูปไม่สำเร็จ ลองใหม่อีกครั้งครับ"); return; }
      const mime = asset.mimeType ?? "image/jpeg";
      const caption = text.trim();
      setText("");
      Keyboard.dismiss();
      await sendImage(`data:${mime};base64,${asset.base64}`, caption);
    } catch {
      Alert.alert("ผิดพลาด", "เปิดรูปไม่สำเร็จ ลองใหม่อีกครั้งครับ");
    }
  };

  const onCamera = () => {
    Alert.alert("ส่งรูปให้เมต้า", "ให้เมต้าช่วยดูรูปอาการหรือฉลากสินค้า", [
      { text: "ถ่ายรูป", onPress: () => runPicker("camera") },
      { text: "เลือกจากคลังภาพ", onPress: () => runPicker("library") },
      { text: "ยกเลิก", style: "cancel" },
    ]);
  };

  const cleanupSubs = () => { subsRef.current.forEach((s) => s.remove()); subsRef.current = []; };

  // Open the mic and listen for one utterance; 'end' routes the transcript to เมต้า.
  const beginListen = () => {
    const S = getSpeech();
    if (!S) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = S.ExpoSpeechRecognitionModule as any;
    finalRef.current = "";
    lastTranscriptRef.current = "";
    setInterim("");
    setVoicePhase("listening");
    cleanupSubs();
    subsRef.current.push(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mod.addListener("result", (e: any) => {
        const t = e?.results?.[0]?.transcript ?? "";
        if (t) lastTranscriptRef.current = t; // keep every partial — isFinal may not fire
        setInterim(t);
        if (e?.isFinal) finalRef.current = t;
      }),
      mod.addListener("end", () => {
        cleanupSubs();
        if (!voiceModeRef.current) return;
        const t = (finalRef.current || lastTranscriptRef.current || "").trim();
        setInterim("");
        if (t) { setVoicePhase("thinking"); send(t); } // → shows as a user bubble in the thread
        else { setTimeout(() => { if (voiceModeRef.current) beginListen(); }, 300); } // silence → keep mic open
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mod.addListener("error", (e: any) => {
        cleanupSubs();
        if (!voiceModeRef.current) return;
        setInterim("");
        if (e?.error !== "aborted") setTimeout(() => { if (voiceModeRef.current) beginListen(); }, 400); // no-speech / transient → keep listening
      }),
    );
    try { mod.start({ lang: "th-TH", interimResults: true, continuous: false }); }
    catch { /* ignore */ }
  };

  const enterVoice = async () => {
    const S = getSpeech();
    if (!S) { Alert.alert("ยังไม่พร้อม", "โหมดสนทนาด้วยเสียงต้องอัปเดต/รีบิลด์แอปก่อนนะครับ"); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = S.ExpoSpeechRecognitionModule as any;
    try {
      const perm = await mod.requestPermissionsAsync();
      if (!perm?.granted) { Alert.alert("ต้องอนุญาต", "กรุณาอนุญาตไมโครโฟนและการรู้จำเสียงพูด"); return; }
    } catch { Alert.alert("ผิดพลาด", "ขอสิทธิ์ไม่สำเร็จ"); return; }
    Keyboard.dismiss();
    setFocused(false);
    spokenRef.current = null;
    voiceModeRef.current = true;
    setVoiceMode(true);
    beginListen();
  };

  const exitVoice = () => {
    voiceModeRef.current = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { (getSpeech()?.ExpoSpeechRecognitionModule as any)?.abort?.(); } catch { /* noop */ }
    try { getTts()?.stop(); } catch { /* noop */ }
    try { stopEleven(); } catch { /* noop */ }
    try { stopVox(); } catch { /* noop */ }
    cleanupSubs();
    setVoiceMode(false);
    setInterim("");
    setVoicePhase("listening");
  };

  const onMic = () => { if (voiceMode) exitVoice(); else enterVoice(); };

  // Speak เมต้า's replies aloud in voice mode, then re-open the mic (the turn
  // still appears in the chat thread via send()).
  useEffect(() => {
    if (!voiceMode) return;
    if (typing) { setVoicePhase("thinking"); return; }
    const last = messages[messages.length - 1];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txt = last && last.role === "ai" ? (last as any).text : "";
    if (!txt || last.id === spokenRef.current) return;
    spokenRef.current = last.id;
    setVoicePhase("speaking");
    const resume = () => { if (voiceModeRef.current) setTimeout(() => { if (voiceModeRef.current) beginListen(); }, 350); };
    // Thai voice via VoxCPM → ElevenLabs → system voice (each falls back if unavailable).
    voxSpeak(txt, resume).then((vok) => {
      if (vok) return;
      elevenSpeak(txt, resume).then((ok) => {
        if (ok) return;
        const T = getTts();
        if (!T) { resume(); return; }
        T.speak(txt, { language: "th-TH", voice: voiceIdRef.current, pitch: 1.05, rate: 0.94, onDone: resume, onError: resume });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, typing, voiceMode]);

  useEffect(() => () => {
    voiceModeRef.current = false;
    cleanupSubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { (getSpeech()?.ExpoSpeechRecognitionModule as any)?.abort?.(); } catch { /* noop */ }
    try { getTts()?.stop(); } catch { /* noop */ }
    try { stopEleven(); } catch { /* noop */ }
    try { stopVox(); } catch { /* noop */ }
  }, []);

  // Pick the most natural Thai voice the OS has (Premium > Enhanced > compact).
  useEffect(() => {
    const T = getTts();
    if (!T) return;
    T.getAvailableVoicesAsync()
      .then((voices) => {
        const rank = (q?: string) => (q === "Premium" ? 3 : q === "Enhanced" ? 2 : 1);
        const th = voices
          .filter((v) => (v.language ?? "").toLowerCase().startsWith("th"))
          .sort((a, b) => rank(b.quality as unknown as string) - rank(a.quality as unknown as string));
        voiceIdRef.current = th[0]?.identifier;
      })
      .catch(() => {});
  }, []);

  useEffect(() => { markRead(); }, [markRead]);
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages, typing]);

  const isEmpty = messages.length <= 1;
  const submit = async () => {
    const v = text.trim();
    if (!v) return;
    setText("");
    await send(v);
  };
  const onChip = (c: string) => send(c);

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader
        title="เมต้า"
        subtitle="AI Shopping Assistant"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <GlassIconButton onPress={() => nav.navigate("AIHistory")} accessibilityLabel="ประวัติแชท">
              <History size={19} color="#1a1a1a" strokeWidth={2.2} />
            </GlassIconButton>
            <GlassIconButton onPress={() => { newChat(); setText(""); }} accessibilityLabel="แชทใหม่">
              <Plus size={20} color="#1a1a1a" strokeWidth={2.4} />
            </GlassIconButton>
          </View>
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <View style={{ flex: 1 }}>
        {isEmpty ? (
          <EmptyState onChip={onChip} />
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 150 }}
          >
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                m={m}
                onSend={onChip}
                onNav={(r) => nav.navigate(r as any)}
                onProduct={(p) => nav.navigate("ProductDetail", { product: p })}
              />
            ))}
            {typing ? <ThinkingIndicator /> : null}
          </ScrollView>
        )}

        {/* Top fade — messages dissolve as they scroll up under the header */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 32 }}
        />

        {/* Bottom fade — messages dissolve as they pass behind the bar */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(250,250,250,0)", "#fafafa"]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150 }}
        />

        {/* Floating overlay — quick replies + composer (content scrolls behind) */}
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: 18 }}>
          {!voiceMode && !isEmpty && !typing && !focused && quickReplyChips.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 24, paddingBottom: 8 }}>
              {quickReplyChips.map((c, i) => {
                const Icon = iconFor(c);
                return (
                  <Animated.View key={c} entering={chipEnter(i)}>
                    <PressableScale onPress={() => onChip(c)}>
                      <View style={{ height: 34, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
                        <Icon size={14} color={AI_PURPLE} strokeWidth={2.2} />
                        <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }}>{c}</Text>
                      </View>
                    </PressableScale>
                  </Animated.View>
                );
              })}
            </ScrollView>
          ) : null}

          {/* Two independent floating bars — typing & voice — toggled by voiceMode */}
          {voiceMode ? (
            <Animated.View key="voicebar" entering={ZoomIn.springify().damping(15).duration(320)} exiting={ZoomOut.duration(180)} style={{ paddingHorizontal: 16 }}>
              <VoiceBar phase={voicePhase} interim={interim} onExit={exitVoice} />
            </Animated.View>
          ) : (
            <Animated.View key="composer" entering={FadeInDown.springify().damping(18).duration(320)} exiting={FadeOut.duration(140)} style={composerPad}>
              <View>
                {/* Blue + purple halo that slowly circles the bar while focused */}
                <Animated.View pointerEvents="none" style={[glowRect, glowA]} />
                <Animated.View pointerEvents="none" style={[glowRect, glowB]} />
                <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
                  <GlassView
                    glassEffectStyle="regular"
                    colorScheme="light"
              tintColor={GLASS_BAR_TINT}
                    style={{ borderRadius: 34, overflow: "hidden", padding: 9, flexDirection: "row", alignItems: "flex-end", gap: 6 }}
                  >
                    {/* Gray field — wraps the camera button + text input */}
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 22, minHeight: 44, paddingLeft: 2 }}>
                      <Pressable onPress={onCamera} hitSlop={6} style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel="ส่งรูปภาพ">
                        <Camera size={22} color={AI_PURPLE} strokeWidth={2.2} />
                      </Pressable>
                      <TextInput
                        value={text}
                        onChangeText={setText}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="พิมพ์คำถามหรือสิ่งที่คุณต้องการ…"
                        placeholderTextColor="#a3a3a3"
                        returnKeyType="send"
                        onSubmitEditing={submit}
                        style={{ flex: 1, fontSize: 14, color: "#1a1a1a", paddingVertical: 0, paddingRight: 8, minHeight: 44 }}
                      />
                    </View>
                    <Pressable onPress={onMic} hitSlop={6} style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel="คุยกับเมต้าด้วยเสียง">
                      <View>
                        <Mic size={21} color={AI_PURPLE} strokeWidth={2.2} />
                        <AiSparkle />
                      </View>
                    </Pressable>
                    <Pressable onPress={submit} disabled={!text.trim()} hitSlop={8} accessibilityLabel="ส่ง">
                      {text.trim() ? (
                        <LinearGradient colors={AI_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
                          <Send size={20} color="#fff" strokeWidth={2.2} />
                        </LinearGradient>
                      ) : (
                        <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#cfd4d1", opacity: 0.7 }}>
                          <Send size={20} color="#fff" strokeWidth={2.2} />
                        </View>
                      )}
                    </Pressable>
                  </GlassView>
                </View>
              </View>
            </Animated.View>
          )}
        </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Twinkling AI sparkle badge on the mic — irregular timing so it feels random. */
function AiSparkle() {
  const t = useSharedValue(0);
  useEffect(() => {
    // Sit idle for a (varied) few seconds, then a quick twinkle — not continuous.
    const twinkle = () => withSequence(
      withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) }),
    );
    t.value = withRepeat(
      withSequence(
        withDelay(3200, twinkle()),
        withDelay(5000, twinkle()),
        withDelay(2600, twinkle()),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.45 + t.value * 0.55,
    transform: [{ scale: 1 + t.value * 0.3 }, { rotate: `${t.value * 30}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -5, right: -6 }, style]}>
      <Sparkles size={11} color={AI_PURPLE} fill={AI_PURPLE} strokeWidth={2} />
    </Animated.View>
  );
}

/* ===== Voice-conversation composer ===== */
type VoicePhase = "listening" | "thinking" | "speaking";

function WaveBar({ index, color, active }: { index: number; color: string; active: boolean }) {
  const h = useSharedValue(0.25 + ((index % 4) * 0.18));
  useEffect(() => {
    if (!active) { cancelAnimation(h); h.value = withTiming(0.18, { duration: 300 }); return; }
    const dur = 360 + ((index * 53) % 360);
    h.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(h);
  }, [h, index, active]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: h.value }] }));
  return <Animated.View style={[{ width: 3, height: 20, borderRadius: 2, backgroundColor: color }, style]} />;
}

function VoiceWaveform({ color, active }: { color: string; active: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 22, gap: 3 }}>
      {Array.from({ length: 22 }).map((_, i) => <WaveBar key={i} index={i} color={color} active={active} />)}
    </View>
  );
}

/** Three pulsing dots — shown while เมต้า is thinking. */
function Dots() {
  const Dot = ({ i }: { i: number }) => {
    const o = useSharedValue(0.3);
    useEffect(() => { o.value = withRepeat(withTiming(1, { duration: 500 }), -1, true); }, [o]);
    const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: 0.7 + o.value * 0.3 }] }));
    return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#cbd5e1", marginHorizontal: 3 }, st]} />;
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 26 }}>
      {[0, 1, 2].map((i) => <Dot key={i} i={i} />)}
    </View>
  );
}

/** Dark voice-conversation bar — listening / เมต้ากำลังคิด / เมต้ากำลังพูด. */
function VoiceBar({ phase, interim, onExit }: { phase: VoicePhase; interim: string; onExit: () => void }) {
  const speaking = phase === "speaking";
  const thinking = phase === "thinking";
  const label = thinking ? "เมต้ากำลังคิด…" : speaking ? "เมต้ากำลังพูด…" : (interim || "กำลังฟัง… พูดได้เลยครับ");
  // Grand voice bar: an emerald↔teal aura orbits behind, a jewel-tone gradient
  // base, a breathing sheen on top, and the whole bar gently pulses in scale.
  const orbit = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    orbit.value = withRepeat(withTiming(1, { duration: 3800, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => { cancelAnimation(orbit); cancelAnimation(pulse); };
  }, [orbit, pulse]);
  const glowG = useAnimatedStyle(() => {
    const a = orbit.value * TAU;
    return { shadowColor: "#10b981", shadowOffset: { width: Math.cos(a) * 9, height: Math.sin(a) * 9 }, shadowRadius: 18, shadowOpacity: 0.6 };
  });
  const glowT = useAnimatedStyle(() => {
    const a = orbit.value * TAU + Math.PI;
    return { shadowColor: "#2dd4bf", shadowOffset: { width: Math.cos(a) * 9, height: Math.sin(a) * 9 }, shadowRadius: 18, shadowOpacity: 0.55 };
  });
  const sheenStyle = useAnimatedStyle(() => ({ opacity: 0.12 + pulse.value * 0.5 }));
  const fill = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
  const glowFill = { position: "absolute" as const, top: 5, left: 8, right: 8, bottom: 5, borderRadius: 30, backgroundColor: "#0b7a52" };
  return (
    <View>
      {/* Orbiting emerald + teal aura behind the bar */}
      <Animated.View pointerEvents="none" style={[glowFill, glowG]} />
      <Animated.View pointerEvents="none" style={[glowFill, glowT]} />
      <View>
        <View style={{ borderRadius: 34, overflow: "hidden", paddingVertical: 9, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 62 }}>
          <LinearGradient colors={["#059669", "#0d9488", "#10b981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={fill} />
          <Animated.View pointerEvents="none" style={[fill, sheenStyle]}>
            <LinearGradient colors={["#a7f3d0", "rgba(255,255,255,0)", "#99f6e4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={fill} />
          </Animated.View>
          <Pressable onPress={onExit} hitSlop={6} style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel="ออกจากโหมดเสียง">
            <X size={22} color="rgba(255,255,255,0.92)" strokeWidth={2.2} />
          </Pressable>
          <View style={{ flex: 1, justifyContent: "center" }}>
            {thinking ? <Dots /> : <VoiceWaveform color="#ffffff" active={speaking || phase === "listening"} />}
            <Text numberOfLines={1} style={{ color: phase === "listening" && !interim ? "rgba(255,255,255,0.85)" : "#fff", fontSize: 12.5, fontWeight: "600", marginTop: 4, textAlign: "center" }}>
              {label}
            </Text>
          </View>
          {/* right spacer to keep the waveform centered opposite the X */}
          <View style={{ width: 40 }} />
        </View>
      </View>
    </View>
  );
}

/* ===== Empty state ===== */
function EmptyState({ onChip, topPad = 0 }: { onChip: (s: string) => void; topPad?: number }) {
  const [chips, setChips] = useState<string[]>(() => pickChips());
  useEffect(() => {
    const t = setInterval(() => setChips(pickChips()), 6000);
    return () => clearInterval(t);
  }, []);

  // Idle float — the orb gently bobs; the GIF handles the character's own motion.
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => { cancelAnimation(bob); };
  }, [bob]);
  const orbFloat = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * bob.value }] }));

  return (
    <Pressable onPress={() => Keyboard.dismiss()} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingTop: topPad, paddingBottom: 40 }}>
      {/* Glass orb with the META AI character — matches the web empty state */}
      <Animated.View style={[{ marginBottom: 18, borderRadius: 44, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 6 }, orbFloat]}>
        <GlassView
          glassEffectStyle="regular"
          colorScheme="light"
          tintColor={glassTint("rgba(255,255,255,0.6)", "rgba(255,255,255,0.9)")}
          style={{ width: 88, height: 88, borderRadius: 44, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.7)" }}
        >
          <Image source={META_AI} style={{ width: 76, height: 76 }} resizeMode="contain" />
        </GlassView>
      </Animated.View>
      <Text style={{ fontSize: 18, fontWeight: "600", color: "#1a1a1a", textAlign: "center", marginBottom: 22 }}>สวัสดีครับ มีอะไรให้เมต้าช่วยไหมครับ</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, minHeight: 100 }}>
        {chips.map((c, i) => {
          const Icon = iconFor(c);
          return (
            <Animated.View key={c} entering={chipEnter(i)} exiting={chipExit}>
              <PressableScale onPress={() => onChip(c)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 100, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
                  <Icon size={15} color={AI_PURPLE} strokeWidth={2.2} />
                  <Text style={{ fontSize: 14, color: "#374151", fontWeight: "500" }}>{c}</Text>
                </View>
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>
    </Pressable>
  );
}

/* ===== Thinking indicator ===== */
function ThinkingIndicator() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }}>
      <Sparkles size={18} color={AI_PURPLE} strokeWidth={2.2} />
      <Text style={{ fontSize: 14, color: "#6b7280", fontWeight: "500" }}>เมต้ากำลังคิด…</Text>
    </View>
  );
}

/* ===== Message bubble ===== */
function MessageBubble({ m, onSend, onNav, onProduct }: {
  m: AIMessage;
  onSend: (s: string) => void;
  onNav: (r: keyof RootStackParamList) => void;
  onProduct: (p: any) => void;
}) {
  // User text — gray bubble right
  if (m.role === "user" && m.kind === "text") {
    return (
      <View style={{ alignItems: "flex-end", marginBottom: 16 }}>
        <View style={{ maxWidth: "82%", backgroundColor: "#eceef1", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ fontSize: 15, color: "#1a1a1a", lineHeight: 22 }}>{m.text}</Text>
        </View>
      </View>
    );
  }

  // User photo — image thumbnail (+ optional caption) right-aligned
  if (m.role === "user" && m.kind === "image") {
    return (
      <View style={{ alignItems: "flex-end", marginBottom: 16 }}>
        <View style={{ maxWidth: "72%", borderRadius: 18, overflow: "hidden", backgroundColor: "#eceef1" }}>
          <Image source={{ uri: m.image }} style={{ width: 200, height: 200, backgroundColor: "#e5e7eb" }} resizeMode="cover"
          resizeMethod="resize" />
          {m.text ? (
            <Text style={{ fontSize: 14.5, color: "#1a1a1a", lineHeight: 21, paddingHorizontal: 14, paddingVertical: 9 }}>{m.text}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 22 }}>
      {m.kind === "text" && (
        <View>
          <Text style={{ fontSize: 15, color: "#333", lineHeight: 23 }}>{m.text}</Text>
          {/* Source citations — grounded answers show where the facts came
              from (herb KB / Wikipedia); tap opens the reference. */}
          {m.sources?.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {m.sources.map((s) => (
                <Pressable
                  key={s.url + s.title}
                  onPress={() => Linking.openURL(s.url).catch(() => {})}
                  className="active:opacity-60"
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 5,
                    backgroundColor: "rgba(49,151,84,0.08)", borderWidth: 1, borderColor: "rgba(49,151,84,0.25)",
                    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, maxWidth: "100%",
                  }}
                >
                  <BookOpen size={11} color={BRAND_GREEN_DARK} strokeWidth={2.4} />
                  <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "600", color: BRAND_GREEN_DARK, flexShrink: 1 }}>
                    {s.title} · {s.org}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      )}

      {m.kind === "products" && (
        <View>
          <Text style={{ fontSize: 15, color: "#333", lineHeight: 23, marginBottom: 10 }}>{m.text}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {m.products.map((p) => (
              <ProductCard key={p.id} product={p} width={gridCardWidth(gridColumns(190, 32, 12), 32, 12)} />
            ))}
          </View>
        </View>
      )}

      {m.kind === "comparison" && (
        <View style={card}>
          <Text style={{ fontSize: 13.5, color: "#333", fontWeight: "500", marginBottom: 8 }}>{m.text}</Text>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0", paddingBottom: 6 }}>
            <Text style={{ width: 78, fontSize: 11, color: "#a3a3a3", fontWeight: "500" }}>รายการ</Text>
            {m.products.map((p) => (
              <Text key={p.id} numberOfLines={1} style={{ flex: 1, fontSize: 11, color: BRAND_GREEN_DARK, fontWeight: "700", paddingHorizontal: 2 }}>{p.name}</Text>
            ))}
          </View>
          {m.rows.map((row, i) => (
            <View key={i} style={{ flexDirection: "row", borderBottomWidth: i < m.rows.length - 1 ? 1 : 0, borderBottomColor: "#f6f6f6", paddingVertical: 6 }}>
              <Text style={{ width: 78, fontSize: 11.5, color: "#737373" }}>{row.label}</Text>
              {row.values.map((v, j) => (
                <View key={j} style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 2 }}>
                  <Text style={{ fontSize: 11.5, color: row.highlight === j ? BRAND_GREEN : "#444", fontWeight: row.highlight === j ? "700" : "500" }}>
                    {typeof v === "number" ? v.toLocaleString() : v}
                  </Text>
                  {row.highlight === j ? <Check size={11} color={BRAND_GREEN} strokeWidth={3} style={{ marginLeft: 2 }} /> : null}
                </View>
              ))}
            </View>
          ))}
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "rgba(49,151,84,0.1)", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, marginTop: 8 }}>
            <Sparkles size={13} color={BRAND_GREEN} strokeWidth={2.2} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, color: "#444", lineHeight: 17 }}>{m.summary}</Text>
          </View>
        </View>
      )}

      {m.kind === "bundle" && (
        <View style={card}>
          <Text style={{ fontSize: 13.5, color: "#333", marginBottom: 10 }}>{m.text}</Text>

          {/* Bundle surface — light & high-contrast; green reserved for accents */}
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: "#e7efe9", backgroundColor: "#f7faf8", overflow: "hidden", marginBottom: 12 }}>
            {/* Header: name + discount tag */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(49,151,84,0.08)" }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(49,151,84,0.14)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 15 }}>📦</Text>
              </View>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>{m.name}</Text>
              <View style={{ backgroundColor: "#e62e05", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>-10%</Text>
              </View>
            </View>

            {/* Items */}
            <View style={{ paddingHorizontal: 10 }}>
              {m.items.map((p, i) => (
                <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: i < m.items.length - 1 ? 1 : 0, borderBottomColor: "#ecf2ee" }}>
                  <Image resizeMethod="resize" source={getRealProductImage(p.id)} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#fff" }} />
                  <Text numberOfLines={2} style={{ flex: 1, fontSize: 12.5, color: "#262626", lineHeight: 17 }}>{p.name}</Text>
                  <Text style={{ fontSize: 12.5, color: "#525252", fontWeight: "600" }}>฿{p.price.toLocaleString()}</Text>
                </View>
              ))}
            </View>

            {/* Footer: total → final price */}
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: "#e7efe9", backgroundColor: "#fff" }}>
              <View>
                <Text style={{ fontSize: 11, color: "#a3a3a3" }}>ราคารวม</Text>
                <Text style={{ fontSize: 13, color: "#a3a3a3", textDecorationLine: "line-through" }}>฿{m.total.toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 22, color: BRAND_GREEN_DARK, fontWeight: "800", lineHeight: 26 }}>฿{m.finalPrice.toLocaleString()}</Text>
                <Text style={{ fontSize: 11, color: BRAND_GREEN, fontWeight: "700" }}>ประหยัด ฿{m.discount.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <PressableScale onPress={() => m.items.forEach((p) => onSend(`เพิ่ม ${p.name} ใส่ตะกร้า`))}>
            <View style={{ height: 46, borderRadius: 999, backgroundColor: BRAND_GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <ShoppingCart size={16} color="#fff" strokeWidth={2.4} />
              <Text style={{ fontSize: 14, color: "#fff", fontWeight: "700" }}>เพิ่มทั้งชุดเข้าตะกร้า</Text>
            </View>
          </PressableScale>
        </View>
      )}

      {m.kind === "value" && (
        <View style={card}>
          <Text style={{ fontSize: 13.5, color: "#333", marginBottom: 8 }}>{m.text}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image resizeMethod="resize" source={getRealProductImage(m.product.id)} style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#f3f4f6" }} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 13, color: "#1a1a1a", fontWeight: "600" }}>{m.product.name}</Text>
              <Text style={{ fontSize: 12, color: "#737373", marginTop: 2 }}>฿{m.product.price.toLocaleString()}{m.product.originalPrice ? `  (เดิม ฿${m.product.originalPrice.toLocaleString()})` : ""}</Text>
              {m.savings ? <Text style={{ fontSize: 11.5, color: "#dc2626", fontWeight: "600", marginTop: 1 }}>{m.savings}</Text> : null}
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "rgba(49,151,84,0.1)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, marginTop: 10 }}>
            <Tag size={12} color={BRAND_GREEN_DARK} strokeWidth={2.4} />
            <Text style={{ fontSize: 12, color: BRAND_GREEN_DARK, fontWeight: "600" }}>{m.verdict}</Text>
          </View>
        </View>
      )}

      {m.kind === "cart" && (
        <View style={card}>
          <Text style={{ fontSize: 13.5, color: "#333", marginBottom: m.items.length ? 10 : 0 }}>{m.text}</Text>

          {m.items.length > 0 && (
            <View style={{ borderRadius: 16, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa", overflow: "hidden", marginBottom: 10 }}>
              {/* Items */}
              <View style={{ paddingHorizontal: 10 }}>
                {m.items.map((it, i) => (
                  <View key={it.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: i < m.items.length - 1 ? 1 : 0, borderBottomColor: "#efefef" }}>
                    <Image resizeMethod="resize" source={it.image ?? getRealProductImage(it.id.replace(/^c-/, ""))} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#fff" }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={2} style={{ fontSize: 12.5, color: "#262626", lineHeight: 17 }}>{it.name}</Text>
                      <Text style={{ fontSize: 11, color: "#a3a3a3", marginTop: 2 }}>฿{it.price.toLocaleString()} × {it.quantity}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: "#262626", fontWeight: "700" }}>฿{(it.price * it.quantity).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
              {/* Total */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#eee", backgroundColor: "#fff" }}>
                <Text style={{ fontSize: 12.5, color: "#737373", fontWeight: "600" }}>ยอดรวม · {m.items.reduce((s, it) => s + it.quantity, 0)} ชิ้น</Text>
                <Text style={{ fontSize: 18, color: BRAND_GREEN_DARK, fontWeight: "800" }}>฿{m.total.toLocaleString()}</Text>
              </View>
            </View>
          )}

          {m.promos.length > 0 && (
            <View style={{ gap: 6, marginBottom: m.items.length > 0 ? 10 : 0 }}>
              {m.promos.map((p, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 }}>
                  <Sparkles size={12} color="#f59e0b" strokeWidth={2.4} style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 11.5, color: "#92400e", lineHeight: 16 }}><Text style={{ fontWeight: "700" }}>{p.title}</Text> — {p.body}</Text>
                </View>
              ))}
            </View>
          )}

          {m.items.length > 0 && (
            <PressableScale onPress={() => onNav("Cart")}>
              <View style={{ height: 46, borderRadius: 999, backgroundColor: BRAND_GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Text style={{ fontSize: 14, color: "#fff", fontWeight: "700" }}>ดำเนินการชำระเงิน</Text>
                <ArrowRight size={16} color="#fff" strokeWidth={2.4} />
              </View>
            </PressableScale>
          )}
        </View>
      )}

      {m.kind === "orders" && (
        <View style={card}>
          <Text style={{ fontSize: 13.5, color: "#333", marginBottom: 8 }}>{m.text}</Text>
          <View style={{ gap: 6 }}>
            {m.orders.map((o) => (
              <View key={o.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fafafa", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 12, color: "#1a1a1a", fontWeight: "600" }}>{o.id}</Text>
                  <Text style={{ fontSize: 10.5, color: "#a3a3a3", marginTop: 1 }}>{o.date}</Text>
                </View>
                <View style={{ backgroundColor: "rgba(49,151,84,0.1)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                  <Text style={{ fontSize: 11, color: BRAND_GREEN_DARK, fontWeight: "600" }}>{STATUS_LABEL[o.status as keyof typeof STATUS_LABEL] ?? o.status}</Text>
                </View>
                <Text style={{ fontSize: 12, color: BRAND_GREEN, fontWeight: "700" }}>฿{o.total.toLocaleString()}</Text>
              </View>
            ))}
          </View>
          <PressableScale onPress={() => onNav("Orders")}>
            <View style={{ height: 36, borderRadius: 999, backgroundColor: "rgba(49,151,84,0.1)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: BRAND_GREEN_DARK, fontWeight: "600" }}>ดูทั้งหมด</Text>
              <ArrowRight size={14} color={BRAND_GREEN_DARK} strokeWidth={2.4} />
            </View>
          </PressableScale>
        </View>
      )}

      {m.kind === "actions" && (
        <View style={card}>
          <Text style={{ fontSize: 13.5, color: "#333", marginBottom: 8 }}>{m.text}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {m.actions.map((a, i) => (
              <PressableScale key={i} onPress={() => { if (a.intent.startsWith("nav:")) onNav(a.intent.slice(4) as keyof RootStackParamList); else onSend(a.intent); }}>
                <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: BRAND_GREEN }}>
                  <Text style={{ fontSize: 12.5, color: "#fff", fontWeight: "600" }}>{a.label}</Text>
                </View>
              </PressableScale>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const card = {
  backgroundColor: "#fff",
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#f0f0f0",
  padding: 14,
} as const;

// White rounded layer behind the bar, used only to cast the circling colored glow.
const glowRect = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 34,
  backgroundColor: "#fff",
} as const;
