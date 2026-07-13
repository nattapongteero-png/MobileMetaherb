import { glassTint } from "../theme/tokens";
/**
 * น้องเมต้า — ผู้จัดการร้านค้า AI chat (owner-facing).
 * Same polished shell as the customer assistant (AIAssistantScreen) — bobbing
 * glass orb empty state, glowing glass composer, icon chips, edge fades — but
 * themed orange and answering from the shop's own data via respondAsManager().
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Image, Keyboard, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import Animated, {
  FadeInDown, FadeOut, ZoomIn, ZoomOut, Keyframe, useSharedValue, useAnimatedStyle, withTiming, withRepeat, cancelAnimation, Easing, withSequence, withDelay,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Send, Sparkles, ChevronRight, AlertTriangle, Clock, Package, Camera, Mic, X,
  Wallet, Flame, Star, Coins, Boxes, Receipt, Ticket, Zap, Tag, Users, BarChart3,
  FileText, FlaskConical, Leaf, TrendingUp, CheckCircle2, ArrowUpRight, ClipboardList, Target, Hourglass, type LucideIcon,
} from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { PressableScale } from "../components/PressableScale";
import type { RootStackParamList } from "../navigation/RootStack";
import { useComplaints } from "../context/ComplaintContext";
import { getSpeech } from "../utils/speech";
import { getTts } from "../utils/tts";
import { voxSpeak, stopVox } from "../utils/voxtts";
import {
  respondAsManager, runManagerAction, shopSnapshot, createCouponFromDraft, couponDraftReady,
  setProductFlashSale, endProductFlashSale, setProductPrice, setProductStock, resolvePR, setSalesGoal,
  QUICK_ACTIONS, MANAGER_GREETING,
  type ShopMsg, type MetaReply, type BriefAlert,
} from "../data/shopManager";
import { managerPlan } from "../services/shopManagerAI";
import type { ComplaintStatus } from "../data/shopComplaints";
import type { DocKind } from "../data/b2bDocs";
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type MetaMsg = Extract<ShopMsg, { role: "meta" }>;
type Brief = Extract<MetaReply, { kind: "briefing" }>;
type VoicePhase = "listening" | "thinking" | "speaking";

const META_CHAR = require("../../assets/meta-character-loop.gif");
const ORANGE = "#ea580c";
const ORANGE_DK = "#c2410c";
const TAU = Math.PI * 2;
const GLOW_R = 5;
const baht = (n: number) => "฿" + Math.round(n).toLocaleString();

/** Topic icon for a manager quick-action / chip. */
function managerIcon(label: string): LucideIcon {
  const t = label.toLowerCase();
  if (/(รายได้ใน|กระเป๋า|ถอน|เงินในร้าน)/.test(t)) return Wallet;
  if (/(ขายดี|ขายเยอะ|ฮิต|best)/.test(t)) return Flame;
  if (/(คะแนน|รีวิว|ดาว|rating)/.test(t)) return Star;
  if (/(ทำเงิน|รายได้สูง|ทำรายได้)/.test(t)) return Coins;
  if (/(สต๊อก|สต็อก|คลัง|stock)/.test(t)) return Boxes;
  if (/(ออเดอร์|คำสั่งซื้อ|order)/.test(t)) return Receipt;
  if (/(ร้องเรียน|ปัญหา|เคลม)/.test(t)) return AlertTriangle;
  if (/(คูปอง|coupon)/.test(t)) return Ticket;
  if (/(flash|แฟลช)/.test(t)) return Zap;
  if (/(โปรโมชั่น|ลดราคา|promo)/.test(t)) return Tag;
  if (/(ลูกค้า|สมาชิก|customer)/.test(t)) return Users;
  if (/(การตลาด|ช่องทาง|market)/.test(t)) return BarChart3;
  if (/(เอกสาร|จัดซื้อ|po|pr|rfq|ใบ)/.test(t)) return FileText;
  if (/(ทดลอง|ทดสอบ|trial)/.test(t)) return FlaskConical;
  if (/(herbal|วัตถุดิบ|สมุนไพร)/.test(t)) return Leaf;
  if (/(เป้า|goal|target)/.test(t)) return Target;
  if (/(เทียบ|เปรียบเทียบ|compare)/.test(t)) return BarChart3;
  if (/(จะหมด|พยากรณ์|คาดการณ์|forecast)/.test(t)) return Hourglass;
  if (/(ยอดขาย|สรุป|ภาพรวม|รายงาน|วิเคราะห์)/.test(t)) return TrendingUp;
  return Sparkles;
}

const chipEnter = (i: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.85 }, { translateY: 6 }] },
    100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  }).duration(300).delay(i * 45);
const chipExit = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  100: { opacity: 0, transform: [{ scale: 0.9 }, { translateY: -6 }] },
}).duration(190);

/** Shuffle the quick actions and take a rotating subset (matches the customer chat). */
function pickChips(): string[] {
  const a = [...QUICK_ACTIONS];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, 7);
}

/** Twinkling sparkle badge on the mic — same as the customer composer (orange-themed). */
function AiSparkle() {
  const t = useSharedValue(0);
  useEffect(() => {
    const twinkle = () => withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 480, easing: Easing.in(Easing.quad) }),
    );
    t.value = withRepeat(withSequence(withDelay(3200, twinkle()), withDelay(5000, twinkle()), withDelay(2600, twinkle())), -1, false);
    return () => cancelAnimation(t);
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + t.value * 0.55, transform: [{ scale: 1 + t.value * 0.3 }, { rotate: `${t.value * 30}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -5, right: -6 }, style]}>
      <Sparkles size={11} color={ORANGE} fill={ORANGE} strokeWidth={2} />
    </Animated.View>
  );
}

export function ShopManagerChatScreen() {
  const nav = useNavigation<Nav>();
  const { complaints, setDecision } = useComplaints();
  const [messages, setMessages] = useState<ShopMsg[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [focused, setFocused] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("listening");
  const [interim, setInterim] = useState("");
  const idRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const subsRef = useRef<{ remove: () => void }[]>([]);
  const voiceModeRef = useRef(false);
  const finalRef = useRef("");
  const lastTranscriptRef = useRef("");
  const spokenRef = useRef<string | null>(null);
  const voiceIdRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);
  const messagesRef = useRef<ShopMsg[]>([]);
  messagesRef.current = messages;
  const mountedRef = useRef(true);
  const genId = () => `m${++idRef.current}`;

  // Composer focus glow — warm halo that slowly circles the bar while focused.
  const rot = useSharedValue(0);
  const on = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(1, { duration: 5000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [rot]);
  useEffect(() => { on.value = withTiming(focused ? 1 : 0, { duration: 260 }); }, [focused, on]);
  const glowA = useAnimatedStyle(() => {
    const a = rot.value * TAU;
    return { shadowColor: "#f97316", shadowOffset: { width: Math.cos(a) * GLOW_R, height: Math.sin(a) * GLOW_R }, shadowRadius: 11, shadowOpacity: on.value * 0.4 };
  });
  const glowB = useAnimatedStyle(() => {
    const a = rot.value * TAU + Math.PI;
    return { shadowColor: "#fbbf24", shadowOffset: { width: Math.cos(a) * GLOW_R, height: Math.sin(a) * GLOW_R }, shadowRadius: 11, shadowOpacity: on.value * 0.4 };
  });

  const cleanupSubs = () => { subsRef.current.forEach((s) => s.remove()); subsRef.current = []; };
  useEffect(() => () => {
    mountedRef.current = false;
    timers.current.forEach(clearTimeout);
    voiceModeRef.current = false;
    cleanupSubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { (getSpeech()?.ExpoSpeechRecognitionModule as any)?.abort?.(); } catch { /* noop */ }
    try { getTts()?.stop(); } catch { /* noop */ }
    try { stopVox(); } catch { /* noop */ }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 70);
    return () => clearTimeout(t);
  }, [messages, typing]);

  const send = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setText("");
    setMessages((prev) => [...prev, { id: genId(), role: "user", text: v }]);
    setTyping(true);
    void replyTo(v);
  };

  // Real AI: Gemma reads the question + a live shop snapshot → natural reply +
  // one or more data cards to show, and real actions (create coupon / รับเรื่อง
  // ร้องเรียน). Keyword router (respondAsManager) is the offline fallback.
  const replyTo = async (v: string) => {
    const hist = messagesRef.current
      .map((m) => ({ role: (m.role === "user" ? "user" : "ai") as "user" | "ai", text: m.text }))
      .filter((h) => h.text?.trim());
    hist.push({ role: "user", text: v });
    let replies: MetaReply[];
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 12000);
    try {
      const plan = await managerPlan(hist, shopSnapshot(complaints), ac.signal);
      const cards: MetaReply[] = [];
      // Working complaint list — threaded across complaint-mutating actions so two
      // in one plan (e.g. ack + resolve) build consistent, non-contradictory cards.
      let work = complaints;
      for (const action of plan.actions) {
        if (action === "none") continue;
        if (action === "create_coupon") {
          // Real action: mint the coupon when the draft is complete, else ask.
          if (couponDraftReady(plan.coupon)) cards.push(createCouponFromDraft(plan.coupon!));
          else cards.push(...runManagerAction("create_coupon", work));
          continue;
        }
        if (action === "ack_complaints") {
          // Real action: mark every pending complaint as "รับเรื่องแล้ว" via context.
          work.filter((c) => c.status === "pending").forEach((c) => setDecision(c.id, "acknowledged"));
          work = work.map((c) => (c.status === "pending" ? { ...c, status: "acknowledged" as const } : c));
          cards.push(...runManagerAction("complaints", work));
          continue;
        }
        if (action === "resolve_complaint") {
          // Real action: settle one complaint (refund full/partial · reject · รับเรื่อง).
          const dec = plan.complaint?.decision ?? "acknowledge";
          const target = (plan.complaint?.id ? work.find((c) => c.id === plan.complaint!.id) : undefined)
            ?? work.find((c) => c.status === "pending");
          if (!target) {
            cards.push({ kind: "text", text: "ตอนนี้ไม่มีเรื่องร้องเรียนที่รอดำเนินการให้จัดการครับ ✅" });
          } else if (dec === "refund_partial" && (plan.complaint?.amount == null || plan.complaint.amount <= 0)) {
            // Partial refund must have an explicit amount — never default to the full total.
            cards.push({ kind: "text", text: `เคส ${target.id} จะคืนเงินบางส่วนเท่าไรดีครับ? บอกจำนวนมาได้เลย เช่น “คืนบางส่วน 150 บาท”` });
          } else {
            const status: ComplaintStatus =
              dec === "refund_full" ? "refund_full" : dec === "refund_partial" ? "refund_partial" : dec === "reject" ? "rejected" : "acknowledged";
            const amount = dec === "refund_full" ? target.amount : dec === "refund_partial" ? plan.complaint?.amount : undefined;
            setDecision(target.id, status, amount != null ? { refundAmount: amount } : undefined);
            work = work.map((c) => (c.id === target.id ? { ...c, status, refundAmount: amount ?? c.refundAmount } : c));
            cards.push(...runManagerAction("complaints", work));
          }
          continue;
        }
        if (action === "set_flashsale") {
          // Real action: put a product on Flash Sale / set its discount.
          cards.push(setProductFlashSale(plan.flash?.product ?? "", plan.flash?.discount));
          continue;
        }
        if (action === "end_flashsale") {
          cards.push(endProductFlashSale(plan.flash?.product ?? ""));
          continue;
        }
        if (action === "set_price") {
          cards.push(setProductPrice(plan.edit?.product ?? "", plan.edit?.price ?? 0));
          continue;
        }
        if (action === "set_stock") {
          cards.push(setProductStock(plan.edit?.sku || plan.edit?.product || "", plan.edit?.stock, plan.edit?.addStock));
          continue;
        }
        if (action === "resolve_pr") {
          // Never auto-approve on an ambiguous plan — confirm the decision first.
          const dec = plan.pr?.decision;
          if (dec !== "approve" && dec !== "reject") {
            cards.push({ kind: "text", text: "จะให้อนุมัติหรือปฏิเสธใบขอซื้อ (PR) ดีครับ? บอกมาได้เลย เช่น “อนุมัติ PR-2569-3023” หรือ “ปฏิเสธ … เพราะงบเกิน”" });
          } else {
            cards.push(resolvePR(plan.pr?.id, dec, plan.pr?.reason));
          }
          continue;
        }
        if (action === "set_goal") {
          // Only set when a positive amount is given — otherwise show the goal (don't wipe it).
          if (plan.goal != null && plan.goal > 0) cards.push(setSalesGoal(plan.goal));
          else cards.push(...runManagerAction("goal", work));
          continue;
        }
        cards.push(...runManagerAction(action, work, { period: plan.period }));
      }
      if (cards.length) {
        // Lead with the LLM's natural reply on the first card — except cards that
        // carry their own authoritative copy: greeting, mutator confirmations, and
        // any fallback/clarifying text card.
        const firstAction = plan.actions.find((a) => a !== "none");
        const KEEP = new Set(["briefing", "create_coupon", "set_flashsale", "end_flashsale", "resolve_pr", "set_goal"]);
        const keepCardText = (firstAction != null && KEEP.has(firstAction)) || cards[0]?.kind === "text";
        const head: MetaReply = plan.reply && cards[0] && !keepCardText
          ? ({ ...cards[0], text: plan.reply } as MetaReply)
          : cards[0];
        replies = [head, ...cards.slice(1)];
      } else {
        replies = [{ kind: "text", text: plan.reply || "รับทราบครับ มีอะไรให้ช่วยอีกไหมครับ" }];
      }
    } catch {
      replies = respondAsManager(v, complaints); // offline / LLM down → keyword fallback
    } finally {
      clearTimeout(to);
    }
    if (!mountedRef.current) return;
    setMessages((prev) => [...prev, ...replies.map((r) => ({ id: genId(), role: "meta", ...r }) as ShopMsg)]);
    setTyping(false);
  };

  const onCamera = () => Alert.alert("กำลังพัฒนา", "ส่งรูปให้น้องเมต้าช่วยวิเคราะห์ — กำลังพัฒนาเร็ว ๆ นี้ครับ");

  // ── Voice mode — full conversational flow, mirrors the customer assistant ──
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
        if (t) lastTranscriptRef.current = t;
        setInterim(t);
        if (e?.isFinal) finalRef.current = t;
      }),
      mod.addListener("end", () => {
        cleanupSubs();
        if (!voiceModeRef.current) return;
        const t = (finalRef.current || lastTranscriptRef.current || "").trim();
        setInterim("");
        if (t) { setVoicePhase("thinking"); send(t); }
        else { setTimeout(() => { if (voiceModeRef.current) beginListen(); }, 300); }
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mod.addListener("error", (e: any) => {
        cleanupSubs();
        if (!voiceModeRef.current) return;
        setInterim("");
        if (e?.error !== "aborted") setTimeout(() => { if (voiceModeRef.current) beginListen(); }, 400);
      }),
    );
    try { mod.start({ lang: "th-TH", interimResults: true, continuous: false }); } catch { /* ignore */ }
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
    try { stopVox(); } catch { /* noop */ }
    cleanupSubs();
    setVoiceMode(false);
    setInterim("");
    setVoicePhase("listening");
  };

  const onMic = () => { if (voiceMode) exitVoice(); else enterVoice(); };

  // Speak น้องเมต้า's reply aloud in voice mode, then re-open the mic.
  useEffect(() => {
    if (!voiceMode) return;
    if (typing) { setVoicePhase("thinking"); return; }
    const last = messages[messages.length - 1];
    if (!last || last.role !== "meta" || !last.text) return;
    if (last.id === spokenRef.current) return;
    spokenRef.current = last.id;
    setVoicePhase("speaking");
    const txt = last.text;
    const resume = () => { if (voiceModeRef.current) setTimeout(() => { if (voiceModeRef.current) beginListen(); }, 350); };
    voxSpeak(txt, resume).then((vok) => {
      if (vok) return;
      const T = getTts();
      if (!T) { resume(); return; }
      T.speak(txt, { language: "th-TH", voice: voiceIdRef.current, pitch: 1.05, rate: 0.96, onDone: resume, onError: resume });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, typing, voiceMode]);

  // Pick the best Thai system voice as a TTS fallback.
  useEffect(() => {
    const T = getTts();
    if (!T) return;
    T.getAvailableVoicesAsync()
      .then((voices) => {
        const rank = (q?: string) => (q === "Premium" ? 3 : q === "Enhanced" ? 2 : 1);
        const th = voices.filter((v) => (v.language ?? "").toLowerCase().startsWith("th"))
          .sort((a, b) => rank(b.quality as unknown as string) - rank(a.quality as unknown as string));
        voiceIdRef.current = th[0]?.identifier;
      })
      .catch(() => {});
  }, []);

  const isEmpty = messages.length === 0;
  // Proactive daily briefing shown the moment the chat opens (real shop numbers).
  const briefing = useMemo<Brief | null>(() => {
    const b = runManagerAction("briefing", complaints)[0];
    return b.kind === "briefing" ? b : null;
  }, [complaints]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="น้องเมต้า"
        subtitle="ผู้จัดการร้านค้า AI"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={
          messages.length > 0 ? (
            <GlassIconButton onPress={() => { setMessages([]); setText(""); }} accessibilityLabel="แชทใหม่">
              <Sparkles size={19} color="#1a1a1a" strokeWidth={2.2} />
            </GlassIconButton>
          ) : undefined
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1 }}>
          {isEmpty ? (
            <EmptyState onChip={send} briefing={briefing} />
          ) : (
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 150 }}
            >
              {messages.map((m) => <Bubble key={m.id} m={m} onChip={send} />)}
              {typing ? <Typing /> : null}
            </ScrollView>
          )}

          {/* Top fade — messages dissolve under the header */}
          <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
          {/* Bottom fade — messages dissolve behind the bar */}
          <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150 }} />

          {/* Floating overlay — quick chips + composer */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: 18 }}>
            {voiceMode ? (
              <Animated.View key="voicebar" entering={ZoomIn.springify().damping(15).duration(320)} exiting={ZoomOut.duration(180)} style={{ paddingHorizontal: 16 }}>
                <VoiceBar phase={voicePhase} interim={interim} onExit={exitVoice} />
              </Animated.View>
            ) : (
              <>
            {!isEmpty && !focused && !typing ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 22, paddingBottom: 8 }}>
                {QUICK_ACTIONS.map((c, i) => {
                  const Icon = managerIcon(c);
                  return (
                    <Animated.View key={c} entering={chipEnter(i)}>
                      <PressableScale onPress={() => send(c)}>
                        <View style={{ height: 34, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
                          <Icon size={14} color={ORANGE} strokeWidth={2.2} />
                          <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }}>{c}</Text>
                        </View>
                      </PressableScale>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            ) : null}

            <Animated.View entering={FadeInDown.springify().damping(18).duration(320)} exiting={FadeOut.duration(140)} style={{ paddingHorizontal: 16 }}>
              <View>
                <Animated.View pointerEvents="none" style={[glowRect, glowA]} />
                <Animated.View pointerEvents="none" style={[glowRect, glowB]} />
                <View style={{ borderRadius: 34, shadowColor: "#7c2d12", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 14 }}>
                  <GlassView glassEffectStyle="regular" colorScheme="light" style={{ borderRadius: 34, overflow: "hidden", padding: 9, flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 22, minHeight: 44, paddingLeft: 2 }}>
                      <Pressable onPress={onCamera} hitSlop={6} style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel="ส่งรูปภาพ">
                        <Camera size={22} color={ORANGE} strokeWidth={2.2} />
                      </Pressable>
                      <TextInput
                        value={text}
                        onChangeText={setText}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="ถามน้องเมต้าเรื่องร้านของคุณ…"
                        placeholderTextColor="#a3a3a3"
                        returnKeyType="send"
                        onSubmitEditing={() => send(text)}
                        style={{ flex: 1, fontSize: 14, color: "#1a1a1a", paddingVertical: 0, paddingRight: 8, minHeight: 44 }}
                      />
                    </View>
                    <Pressable onPress={onMic} hitSlop={6} style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel="พูดกับน้องเมต้า">
                      <View>
                        <Mic size={21} color={ORANGE} strokeWidth={2.2} />
                        <AiSparkle />
                      </View>
                    </Pressable>
                    <Pressable onPress={() => send(text)} disabled={!text.trim()} hitSlop={8} accessibilityLabel="ส่ง">
                      {text.trim() ? (
                        <LinearGradient colors={[ORANGE_DK, ORANGE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
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
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ── Empty state — bobbing glass orb + daily briefing + icon chips ─────────── */
function EmptyState({ onChip, briefing }: { onChip: (s: string) => void; briefing: Brief | null }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(bob);
  }, [bob]);
  const orbFloat = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * bob.value }] }));
  // Rotating quick-action chips — cycle a fresh subset every 6s with enter/exit
  // keyframes, exactly like the customer chat empty state.
  const [chips, setChips] = useState<string[]>(() => pickChips());
  useEffect(() => {
    const t = setInterval(() => setChips(pickChips()), 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <Pressable onPress={() => Keyboard.dismiss()} style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 150 }}>
        <Animated.View style={[{ marginBottom: 16, borderRadius: 44, shadowColor: "#7c2d12", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 20, elevation: 6 }, orbFloat]}>
          <GlassView glassEffectStyle="regular" colorScheme="light" tintColor={glassTint("rgba(255,255,255,0.6)", "rgba(255,255,255,0.9)")} style={{ width: 88, height: 88, borderRadius: 44, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.7)" }}>
            <Image source={META_CHAR} style={{ width: 76, height: 76 }} resizeMode="contain" />
          </GlassView>
        </Animated.View>
        <Text style={{ fontSize: 17, fontWeight: "800", color: TEXT_PRIMARY, marginBottom: 16 }}>น้องเมต้า · ผู้จัดการร้านค้า</Text>
        {briefing ? (
          <View style={[cardStyle, { width: "100%", maxWidth: 380, marginBottom: 18 }]}>
            <BriefingBody m={briefing} onChip={onChip} />
          </View>
        ) : (
          <Text style={{ fontSize: 13, color: TEXT_SECONDARY, marginTop: 2, marginBottom: 20, textAlign: "center", lineHeight: 19 }}>{MANAGER_GREETING}</Text>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 9, minHeight: 120 }}>
          {chips.map((c, i) => {
            const Icon = managerIcon(c);
            return (
              <Animated.View key={c} entering={chipEnter(i)} exiting={chipExit}>
                <PressableScale onPress={() => onChip(c)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ececec" }}>
                    <Icon size={14} color={ORANGE} strokeWidth={2.2} />
                    <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }}>{c}</Text>
                  </View>
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </Pressable>
  );
}

/* ── Bubbles ──────────────────────────────────────────────────────────────── */
function Bubble({ m, onChip }: { m: ShopMsg; onChip: (s: string) => void }) {
  if (m.role === "user") {
    return (
      <View style={{ alignSelf: "flex-end", maxWidth: "82%", marginBottom: 14, backgroundColor: "#ececec", borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 }}>
        <Text style={{ fontSize: 14, color: "#1a1a1a", lineHeight: 20 }}>{m.text}</Text>
      </View>
    );
  }
  if (m.kind === "text") {
    return <View style={{ marginBottom: 14 }}><Text style={{ fontSize: 14, color: TEXT_PRIMARY, lineHeight: 21 }}>{m.text}</Text></View>;
  }
  return (
    <View style={{ marginBottom: 14 }}>
      {m.text ? <Text style={{ fontSize: 14, color: TEXT_PRIMARY, lineHeight: 21, marginBottom: 10 }}>{m.text}</Text> : null}
      <View style={cardStyle}>
        <MetaContent m={m} onChip={onChip} />
        <OpenFullButton kind={m.kind} docKind={m.kind === "b2b" ? m.docKind : undefined} />
      </View>
    </View>
  );
}

function Typing() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, marginBottom: 14 }}>
      <Sparkles size={18} color={ORANGE} strokeWidth={2.2} />
      <Text style={{ fontSize: 14, color: "#6b7280", fontWeight: "500" }}>น้องเมต้ากำลังดูข้อมูล…</Text>
    </View>
  );
}

/* ── Card content per kind ────────────────────────────────────────────────── */
function MetaContent({ m, onChip }: { m: MetaMsg; onChip: (s: string) => void }) {
  switch (m.kind) {
    case "briefing":
      return <BriefingBody m={m} onChip={onChip} />;
    case "coupon_created":
      return (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <CheckCircle2 size={17} color="#15803d" strokeWidth={2.4} />
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#15803d" }}>คูปองใหม่ · ใช้งานได้แล้ว</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#f0f0f0" }}>
            <View style={{ width: 56, alignSelf: "stretch", backgroundColor: m.color, alignItems: "center", justifyContent: "center", paddingVertical: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#fff" }}>{m.type}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0, paddingVertical: 10 }}>
              <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "700", color: "#1a1a1a" }}>{m.title}</Text>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>{m.code} · {m.minSpend}</Text>
              <Text style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 1 }}>{m.expiry}</Text>
            </View>
          </View>
        </View>
      );
    case "kpi":
      return (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Tile label={`ยอดขาย ${m.scope}`} value={baht(m.sales)} accent="#10b981" delta={m.salesDelta} Icon={Coins} />
            <Tile label="คำสั่งซื้อ" value={`${m.orders} ออเดอร์`} accent="#0ea5e9" delta={m.ordersDelta} Icon={Receipt} />
            <Tile label="กำไร" value={baht(m.profit)} accent="#f59e0b" Icon={Wallet} />
            <Tile label="มาร์จิ้น" value={`${m.margin.toFixed(1)}%`} accent="#6366f1" Icon={BarChart3} />
          </View>
          <Text style={subNote}>เฉลี่ย {baht(m.avgSales)}/ช่วง · ต่อออเดอร์ {baht(m.aov)}{m.salesDelta != null ? " · เทียบเมื่อวาน" : ""}</Text>
          {m.series.length > 1 ? (
            <>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 12, marginBottom: 6 }}>แนวโน้มยอดขาย{m.scope}</Text>
              <MiniBars data={m.series} labels={m.seriesLabels} accent="#10b981" />
            </>
          ) : null}
        </>
      );
    case "pr_draft":
      return (
        <View style={{ gap: 8 }}>
          {m.items.length === 0 ? (
            <Text style={{ fontSize: 12.5, color: "#15803d", fontWeight: "500" }}>ไม่มีสินค้าที่ต้องเติมด่วนครับ ✅</Text>
          ) : (
            m.items.map((it, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center" }}>
                  <ClipboardList size={15} color={ORANGE} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>{it.name}</Text>
                  <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{it.sku} · เหลือ {it.stock} {it.unit}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: ORANGE_DK }}>+{it.suggest}</Text>
                  <Text style={{ fontSize: 10, color: TEXT_MUTED }}>แนะนำสั่ง</Text>
                </View>
              </View>
            ))
          )}
          {m.items.length > 0 ? <Text style={subNote}>{m.note}</Text> : null}
        </View>
      );
    case "forecast":
      return (
        <View style={{ gap: 8 }}>
          {m.items.map((it, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: it.urgent ? "#fef2f2" : "#f0f9ff", alignItems: "center", justifyContent: "center" }}>
                <Hourglass size={15} color={it.urgent ? "#dc2626" : "#3b82f6"} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>{it.name}</Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>เหลือ {it.stock} {it.unit} · ขาย ~{it.perDay}/วัน</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: it.urgent ? "#dc2626" : "#15803d" }}>{it.daysLeft == null ? "—" : `${it.daysLeft} วัน`}</Text>
                <Text style={{ fontSize: 10, color: TEXT_MUTED }}>คาดว่าหมดใน</Text>
              </View>
            </View>
          ))}
        </View>
      );
    case "compare":
      return (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 10.5, color: TEXT_MUTED, width: 64, textAlign: "right" }}>{m.prevLabel}</Text>
            <Text style={{ fontSize: 10.5, color: ORANGE_DK, fontWeight: "700", width: 64, textAlign: "right" }}>{m.curLabel}</Text>
            <Text style={{ fontSize: 10.5, color: TEXT_MUTED, width: 48, textAlign: "right" }}>เทียบ</Text>
          </View>
          {m.rows.map((r, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ flex: 1, fontSize: 12.5, color: "#374151" }}>{r.label}</Text>
              <Text style={{ fontSize: 12, color: TEXT_MUTED, width: 64, textAlign: "right" }}>{r.prev}</Text>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#1a1a1a", width: 64, textAlign: "right" }}>{r.cur}</Text>
              <Text style={{ width: 48, textAlign: "right", fontSize: 11.5, fontWeight: "700", color: r.delta >= 0 ? "#15803d" : "#dc2626" }}>{r.delta >= 0 ? "▲" : "▼"}{Math.abs(r.delta)}%</Text>
            </View>
          ))}
        </View>
      );
    case "goal":
      return m.goal == null ? (
        <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 19 }}>บอกตัวเลขเป้ายอดขายเดือนนี้ได้เลยครับ เช่น “ตั้งเป้าเดือนนี้ 30000”</Text>
      ) : (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 11, color: TEXT_MUTED }}>ยอดขาย{m.scope}</Text>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#10b981" }}>{baht(m.current)}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Target size={13} color={TEXT_MUTED} strokeWidth={2.2} />
              <Text style={{ fontSize: 12, color: TEXT_MUTED }}>เป้า {baht(m.goal)}</Text>
            </View>
          </View>
          <View style={{ height: 10, borderRadius: 999, backgroundColor: "#eef2f0", overflow: "hidden" }}>
            <View style={{ width: `${Math.min(100, m.pct)}%`, height: "100%", borderRadius: 999, backgroundColor: m.pct >= 100 ? "#10b981" : ORANGE }} />
          </View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: m.pct >= 100 ? "#15803d" : ORANGE_DK }}>{m.pct}% ของเป้า{m.pct >= 100 ? " — ทะลุเป้าแล้ว 🎉" : ""}</Text>
        </View>
      );
    case "revenue":
      return (
        <View style={{ gap: 8 }}>
          <View style={{ backgroundColor: "#ecfdf5", borderRadius: 12, padding: 12 }}>
            <Text style={{ fontSize: 11.5, color: "#059669", fontWeight: "600" }}>ยอดพร้อมถอน</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#047857", marginTop: 2 }}>{baht(m.available)}</Text>
          </View>
          <KV label={`รอปล่อย (Escrow) · ${m.escrowCount} ออเดอร์`} value={baht(m.escrow)} />
          <KV label="ค่าธรรมเนียม GP สะสม" value={baht(m.gpFees)} />
          <KV label="รายได้สะสมทั้งหมด" value={baht(m.totalIncome)} strong />
        </View>
      );
    case "ranking":
      return (
        <View style={{ gap: 8 }}>
          {m.items.map((it, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: i === 0 ? "#fef3c7" : "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: i === 0 ? "#b45309" : "#737373" }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>{it.name}</Text>
                {it.sub ? <Text numberOfLines={1} style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{it.sub}</Text> : null}
              </View>
              <Text style={{ fontSize: 13, fontWeight: "800", color: ORANGE_DK }}>{it.value}</Text>
            </View>
          ))}
        </View>
      );
    case "products":
      return (
        <View style={{ gap: 8 }}>
          {m.lowCount > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fef2f2", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }}>
              <AlertTriangle size={13} color="#dc2626" strokeWidth={2.2} />
              <Text style={{ fontSize: 11.5, color: "#b91c1c", fontWeight: "600" }}>สต๊อกใกล้หมด {m.lowCount} รายการ</Text>
            </View>
          ) : null}
          {m.items.map((p, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>{p.name}</Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{p.sku} · ขาย {p.qty} {m.unit} · {baht(p.sales)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: p.low ? "#dc2626" : "#15803d" }}>{p.stock} {m.unit}</Text>
                <Text style={{ fontSize: 10, color: TEXT_MUTED }}>คงเหลือ</Text>
              </View>
            </View>
          ))}
        </View>
      );
    case "orders":
      return (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <MiniStat label="ชำระแล้ว" value={`${m.settled}`} color="#15803d" />
            <MiniStat label="รอปล่อยเงิน" value={`${m.pending}`} color="#d97706" />
          </View>
          {m.items.map((o, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: "600", color: "#1a1a1a" }}>{o.orderNo}</Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{o.created}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: ORANGE_DK }}>{baht(o.payout)}</Text>
                <Dot label={o.status === "settled" ? "ชำระแล้ว" : "รอปล่อย"} color={o.status === "settled" ? "#15803d" : "#d97706"} />
              </View>
            </View>
          ))}
        </View>
      );
    case "complaints":
      return (
        <View style={{ gap: 8 }}>
          <Chips chips={m.counts} />
          {m.items.map((c, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: "600", color: "#1a1a1a" }}>{c.customer}</Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{c.id} · {c.product}</Text>
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: ORANGE_DK }}>{baht(c.amount)}</Text>
            </View>
          ))}
        </View>
      );
    case "coupons":
      return (
        <View style={{ gap: 8 }}>
          {m.items.map((c, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#f0f0f0" }}>
              <View style={{ width: 52, alignSelf: "stretch", backgroundColor: c.color, alignItems: "center", justifyContent: "center", paddingVertical: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#fff" }}>{c.type}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, paddingVertical: 8 }}>
                <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: "700", color: "#1a1a1a" }}>{c.title}</Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{c.code} · {c.minSpend}</Text>
                <Text style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 1 }}>{c.expiry}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    case "flashsale":
      return (
        <View style={{ gap: 8 }}>
          {m.items.map((p, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Image source={p.image} style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "#f5f5f5" }} resizeMode="cover" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: "600", color: "#1a1a1a" }}>{p.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#e62e05" }}>{baht(p.price)}</Text>
                  {p.originalPrice ? <Text style={{ fontSize: 11, color: "#9ca3af", textDecorationLine: "line-through" }}>{baht(p.originalPrice)}</Text> : null}
                </View>
              </View>
              {p.discountPercent ? (
                <View style={{ backgroundColor: "#fee2e2", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#e62e05" }}>-{p.discountPercent}%</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      );
    case "customers":
      return (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {m.segments.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 11.5, fontWeight: "700", color: s.fg }}>{s.group}</Text>
                <Text style={{ fontSize: 11, color: s.fg }}>{s.n} คน · {baht(s.total)}</Text>
              </View>
            ))}
          </View>
          {m.atRisk.length > 0 ? (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#b91c1c" }}>ลูกค้าเสี่ยงหาย</Text>
              {m.atRisk.map((c, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Clock size={12} color="#b91c1c" strokeWidth={2.2} />
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: "#1a1a1a" }}>{c.name}</Text>
                  <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>ไม่ซื้อ {c.daysAgo} วัน · {baht(c.total)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      );
    case "market":
      return (
        <View style={{ gap: 8 }}>
          {m.items.map((c, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: "600", color: "#1a1a1a" }}>{c.name}</Text>
                  <View style={{ backgroundColor: c.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: "700", color: c.fg }}>{c.type}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{c.orders} ออเดอร์ · {c.roas}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "800", color: ORANGE_DK }}>{baht(c.revenue)}</Text>
            </View>
          ))}
        </View>
      );
    case "b2b":
      return (
        <View style={{ gap: 8 }}>
          <Chips chips={m.counts} />
          {m.items.map((d, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Package size={15} color="#9ca3af" strokeWidth={2} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: "600", color: "#1a1a1a" }}>{d.id}</Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{d.date}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: ORANGE_DK }}>{baht(d.total)}</Text>
                <Dot label={d.statusLabel} color={d.statusColor} />
              </View>
            </View>
          ))}
        </View>
      );
    case "trial":
      return (
        <View style={{ gap: 8 }}>
          <Chips chips={m.counts} />
          {m.items.map((r, i) => (
            <View key={i} style={{ gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#1a1a1a" }}>{r.id}</Text>
                <Dot label={r.stageLabel} color={r.tint} />
                {r.tracking ? <Text style={{ fontSize: 10.5, color: TEXT_MUTED }}>· {r.tracking}</Text> : null}
              </View>
              <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED }}>{r.reason}</Text>
            </View>
          ))}
        </View>
      );
    case "actions":
      return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {m.chips.map((c) => (
            <Pressable key={c} onPress={() => onChip(c)} className="active:opacity-70" style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa" }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: ORANGE_DK }}>{c}</Text>
              <ChevronRight size={13} color={ORANGE} strokeWidth={2.4} />
            </Pressable>
          ))}
        </View>
      );
    default:
      return null;
  }
}

/* ── Daily briefing body (shared by empty state + in-chat card) ────────────── */
// Trend delta as a soft green/red pill — used by both the briefing stats and the
// KPI card tiles so the "vs เมื่อวาน" change reads the same everywhere.
function Delta({ v }: { v: number }) {
  const up = v >= 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10.5, fontWeight: "700", color: up ? "#15803d" : "#dc2626" }}>{up ? "▲" : "▼"} {Math.abs(v)}%</Text>
    </View>
  );
}
function alertIcon(icon: BriefAlert["icon"]): LucideIcon {
  return icon === "complaint" ? AlertTriangle : icon === "stock" ? Boxes : icon === "customer" ? Users : FileText;
}
function BriefStat({ label, value, delta, accent, Icon }: { label: string; value: string; delta: number; accent: string; Icon: LucideIcon }) {
  return (
    <View style={{ flex: 1, backgroundColor: accent + "12", borderRadius: 16, padding: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: accent + "22", alignItems: "center", justifyContent: "center" }}>
          <Icon size={15} color={accent} strokeWidth={2.4} />
        </View>
        <Text style={{ flex: 1, fontSize: 11.5, color: TEXT_SECONDARY, fontWeight: "600" }} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={{ fontSize: 19, fontWeight: "800", color: accent, marginTop: 9 }} numberOfLines={1}>{value}</Text>
      <View style={{ marginTop: 7 }}><Delta v={delta} /></View>
    </View>
  );
}
function BriefingBody({ m, onChip }: { m: Brief; onChip: (s: string) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 13.5, fontWeight: "700", color: TEXT_PRIMARY, lineHeight: 20 }}>{m.greeting}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <BriefStat label={`ยอดขาย${m.scope}`} value={baht(m.sales)} delta={m.salesDelta} accent="#10b981" Icon={Coins} />
        <BriefStat label="คำสั่งซื้อ" value={`${m.orders} ออเดอร์`} delta={m.ordersDelta} accent="#0ea5e9" Icon={Receipt} />
      </View>
      {m.alerts.length ? (
        <View style={{ gap: 8 }}>
          {m.alerts.map((a, i) => {
            const Icon = alertIcon(a.icon);
            const warn = a.tone === "warn";
            return (
              <Pressable key={i} onPress={() => onChip(a.topic)} className="active:opacity-70" style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: warn ? "#fef2f2" : "#f0f9ff", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }}>
                <Icon size={15} color={warn ? "#dc2626" : "#3b82f6"} strokeWidth={2.2} />
                <Text style={{ flex: 1, fontSize: 12, fontWeight: "500", color: warn ? "#b91c1c" : "#1e40af" }}>{a.label}</Text>
                <ChevronRight size={14} color={warn ? "#dc2626" : "#3b82f6"} strokeWidth={2.2} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={{ fontSize: 12, color: "#15803d", fontWeight: "500" }}>วันนี้ทุกอย่างเรียบร้อยดีครับ ไม่มีรายการเร่งด่วน ✅</Text>
      )}
    </View>
  );
}

/* ── Small shared bits ─────────────────────────────────────────────────────── */
function Tile({ label, value, accent, delta, Icon }: { label: string; value: string; accent: string; delta?: number; Icon?: LucideIcon }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: "47%", backgroundColor: accent + "12", borderRadius: 14, padding: 11 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {Icon ? (
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: accent + "22", alignItems: "center", justifyContent: "center" }}>
            <Icon size={13} color={accent} strokeWidth={2.4} />
          </View>
        ) : null}
        <Text style={{ flex: 1, fontSize: 11, color: TEXT_MUTED }} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: "800", color: accent, marginTop: Icon ? 7 : 3 }} numberOfLines={1}>{value}</Text>
      {delta != null ? <View style={{ marginTop: 6 }}><Delta v={delta} /></View> : null}
    </View>
  );
}

/** Tiny inline bar chart for the KPI card — last bar highlighted. */
function MiniBars({ data, labels, accent }: { data: number[]; labels: string[]; accent: string }) {
  const max = Math.max(1, ...data);
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 46 }}>
        {data.map((v, i) => (
          <View key={i} style={{ flex: 1, height: Math.max(3, (v / max) * 46), borderRadius: 3, backgroundColor: i === data.length - 1 ? accent : accent + "55" }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <Text style={{ fontSize: 9.5, color: TEXT_MUTED }}>{labels[0]}</Text>
        <Text style={{ fontSize: 9.5, color: TEXT_MUTED }}>{labels[labels.length - 1]}</Text>
      </View>
    </View>
  );
}

/** "เปิดหน้าเต็ม" — jump from a chat card to the matching owner-console screen
 *  (only the cards with a clean standalone destination get the button). */
function OpenFullButton({ kind, docKind }: { kind: MetaMsg["kind"]; docKind?: DocKind }) {
  const nav = useNavigation<Nav>();
  let go: (() => void) | null = null;
  switch (kind) {
    case "kpi": case "briefing": case "compare": case "goal": go = () => nav.navigate("ShopReport", { kind: "sales" }); break;
    case "revenue": go = () => nav.navigate("ShopPayout"); break;
    case "ranking": case "products": case "forecast": go = () => nav.navigate("ShopReport", { kind: "products" }); break;
    case "customers": go = () => nav.navigate("ShopReport", { kind: "customers" }); break;
    case "market": go = () => nav.navigate("ShopReport", { kind: "market" }); break;
    case "complaints": go = () => nav.navigate("ShopComplaints"); break;
    case "pr_draft": go = () => nav.navigate("B2BDocs", { kind: "pr" }); break;
    case "b2b": if (docKind) { const dk = docKind; go = () => nav.navigate("B2BDocs", { kind: dk }); } break;
  }
  if (!go) return null;
  const open = go;
  return (
    <Pressable onPress={open} className="active:opacity-70" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: "#fff7ed" }}>
      <Text style={{ fontSize: 12.5, fontWeight: "700", color: ORANGE_DK }}>เปิดหน้าเต็ม</Text>
      <ArrowUpRight size={14} color={ORANGE} strokeWidth={2.4} />
    </Pressable>
  );
}
function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: color + "14", borderRadius: 10, paddingVertical: 8, alignItems: "center" }}>
      <Text style={{ fontSize: 16, fontWeight: "800", color }}>{value}</Text>
      <Text style={{ fontSize: 10.5, color: TEXT_MUTED, marginTop: 1 }}>{label}</Text>
    </View>
  );
}
function KV({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: strong ? "800" : "600", color: strong ? TEXT_PRIMARY : "#374151" }}>{value}</Text>
    </View>
  );
}
function Dot({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 10.5, fontWeight: "600", color }}>{label}</Text>
    </View>
  );
}
function Chips({ chips }: { chips: { label: string; n: number; color: string }[] }) {
  if (!chips.length) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {chips.map((c, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.color + "1a", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: c.color }}>{c.label}</Text>
          <Text style={{ fontSize: 11, fontWeight: "800", color: c.color }}>{c.n}</Text>
        </View>
      ))}
    </View>
  );
}

const cardStyle = { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececec", padding: 14 } as const;
const subNote = { fontSize: 11.5, color: TEXT_MUTED, marginTop: 8 } as const;
const glowRect = { position: "absolute", left: 16, right: 16, top: 4, bottom: 4, borderRadius: 30, backgroundColor: "#fff" } as const;

/* ── Voice mode UI (orange-themed port of the customer VoiceBar) ───────────── */
function WaveBar({ index, color, active }: { index: number; color: string; active: boolean }) {
  const h = useSharedValue(0.25 + ((index % 4) * 0.18));
  useEffect(() => {
    if (!active) { cancelAnimation(h); h.value = withTiming(0.18, { duration: 200 }); return; }
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
function Dots() {
  const Dot = () => {
    const o = useSharedValue(0.3);
    useEffect(() => { o.value = withRepeat(withTiming(1, { duration: 500 }), -1, true); }, [o]);
    const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: 0.7 + o.value * 0.3 }] }));
    return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.9)", marginHorizontal: 3 }, st]} />;
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 26 }}>
      {[0, 1, 2].map((i) => <Dot key={i} />)}
    </View>
  );
}
function VoiceBar({ phase, interim, onExit }: { phase: VoicePhase; interim: string; onExit: () => void }) {
  const speaking = phase === "speaking";
  const thinking = phase === "thinking";
  const label = thinking ? "น้องเมต้ากำลังดูข้อมูล…" : speaking ? "น้องเมต้ากำลังตอบ…" : (interim || "กำลังฟัง… พูดได้เลยครับ");
  const orbit = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    orbit.value = withRepeat(withTiming(1, { duration: 3800, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => { cancelAnimation(orbit); cancelAnimation(pulse); };
  }, [orbit, pulse]);
  const glowG = useAnimatedStyle(() => { const a = orbit.value * TAU; return { shadowColor: "#f97316", shadowOffset: { width: Math.cos(a) * 9, height: Math.sin(a) * 9 }, shadowRadius: 18, shadowOpacity: 0.6 }; });
  const glowT = useAnimatedStyle(() => { const a = orbit.value * TAU + Math.PI; return { shadowColor: "#fbbf24", shadowOffset: { width: Math.cos(a) * 9, height: Math.sin(a) * 9 }, shadowRadius: 18, shadowOpacity: 0.55 }; });
  const sheenStyle = useAnimatedStyle(() => ({ opacity: 0.12 + pulse.value * 0.5 }));
  const fill = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
  const glowFill = { position: "absolute" as const, top: 5, left: 8, right: 8, bottom: 5, borderRadius: 30, backgroundColor: "#9a3412" };
  return (
    <View>
      <Animated.View pointerEvents="none" style={[glowFill, glowG]} />
      <Animated.View pointerEvents="none" style={[glowFill, glowT]} />
      <View>
        <View style={{ borderRadius: 34, overflow: "hidden", paddingVertical: 9, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 62 }}>
          <LinearGradient colors={["#c2410c", "#ea580c", "#fb923c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={fill} />
          <Animated.View pointerEvents="none" style={[fill, sheenStyle]}>
            <LinearGradient colors={["#fed7aa", "rgba(255,255,255,0)", "#fdba74"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={fill} />
          </Animated.View>
          <Pressable onPress={onExit} hitSlop={6} style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel="ออกจากโหมดเสียง">
            <X size={22} color="rgba(255,255,255,0.92)" strokeWidth={2.2} />
          </Pressable>
          <View style={{ flex: 1, justifyContent: "center" }}>
            {thinking ? <Dots /> : <VoiceWaveform color="#ffffff" active={speaking || phase === "listening"} />}
            <Text numberOfLines={1} style={{ color: phase === "listening" && !interim ? "rgba(255,255,255,0.85)" : "#fff", fontSize: 12.5, fontWeight: "600", marginTop: 4, textAlign: "center" }}>{label}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>
    </View>
  );
}
