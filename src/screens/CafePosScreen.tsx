import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { View, Text, ScrollView, Pressable, Image, TextInput, StyleSheet, Alert, Animated, Easing, useWindowDimensions, Share, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { Banknote, Check, ChevronLeft, Coffee, Gift, ListOrdered, Minus, PauseCircle, Plus, QrCode, ReceiptText, Search, Share2, Trash2, UserRound, X } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { GlassActionBar, PrimaryAction } from "../components/GlassActionBar";
import { HeaderFade } from "../components/HeaderFade";
import { CountBadge } from "../components/CountBadge";
import { BottomSheet } from "../components/BottomSheet";
import { showToast } from "../components/Toast";
import { BRAND_GREEN, DIVIDER_GRAY, PRICE_GREEN, TEXT_MUTED } from "../theme/tokens";
import { useStore } from "../store/db";
import { cafeStore, cafeQueue, placeCafeOrder } from "../store/cafe";
import { cafeAdminStore, cafeOptionLibrary, cafePayInfo, CAFE_PAY_CHANNELS, type CafePayChannelId } from "../store/cafeAdmin";
import { posDraftStore, takePosDraft, type PosChoice, type PosLine } from "../store/posDraft";
import { activeCafeMenu, resolveOptionGroups, type AdminCafeItem } from "../data/cafeAdminMenu";
import { CAFE_SUBS } from "../data/cafeMenu";
import { METAHERB_SHOP } from "../data/shopOrders";
import { promptPayPayload, MERCHANT_PROMPTPAY, MERCHANT_NAME } from "../utils/promptpay";
import { MemberCard, matchesMember } from "./CafeMembersScreen";
import { FieldLabel, PAYOUT_INPUT } from "./ShopPayoutScreen";
import {
  cafeMemberStore,
  cafeMembers,
  cafePointRule,
  memberByPhone,
  memberById,
  addCafeMember,
  usablePoints,
  earnPoints,
  redeemPoints,
} from "../store/cafeMembers";
import type { RootStackParamList } from "../navigation/RootStack";

const SUB_BY_ID = Object.fromEntries(CAFE_SUBS.map((s) => [s.id, s]));

const PAY_ICON: Record<CafePayChannelId, typeof Banknote> = {
  cash: Banknote,
  promptpay: QrCode,
};

/**
 * One line on the bill = an item + the options chosen for it. Two cups of the
 * same drink with different sweetness are two separate lines, which is what
 * lets the barista read the queue ticket and make them right. (Shape shared
 * with the configure page via store/posDraft.)
 */
type BillChoice = PosChoice;
type BillLine = PosLine;
type Bill = BillLine[];
type HeldBill = { id: number; bill: Bill; total: number };
type PayStage = "bill" | "cash" | "qr" | "done" | "receipt";
/** What the cashier must be told after a sale settles. */
type Sale = {
  queueNo: number;
  total: number;
  payLabel: string;
  change: number;
  /** Kept because the bill is emptied on settle — the receipt reads from here. */
  items: { name: string; qty: number; summary: string; total: number }[];
  received?: number;
  at: number;
};

const STAGE_TITLE: Record<PayStage, string> = {
  bill: "ชำระเงิน",
  cash: "รับเงินสด",
  qr: "สแกนจ่าย",
  done: "รับชำระสำเร็จ",
  receipt: "ใบเสร็จ",
};

const PROMPTPAY_BLUE = "#003d7a";

/** พอดี + the notes a customer is likely to hand over above that amount. */
function cashQuickAmounts(total: number): number[] {
  const notes = [20, 50, 100, 500, 1000];
  const roundUp = Math.ceil(total / 100) * 100; // the "next hundred" note
  const above = [...notes, roundUp].filter((n) => n > total);
  return [total, ...Array.from(new Set(above)).sort((a, b) => a - b).slice(0, 3)];
}

/** Same item + same options = same line, so a repeat order just bumps qty. */
const lineKey = (itemId: string, opts: BillChoice[]): string =>
  [itemId, ...opts.map((o) => `${o.group}=${o.choice}`)].join("|");
const lineUnit = (l: BillLine, byId: Record<string, AdminCafeItem>): number =>
  (byId[l.itemId]?.price ?? 0) + l.opts.reduce((s, o) => s + o.price, 0);
const lineTotal = (l: BillLine, byId: Record<string, AdminCafeItem>): number => lineUnit(l, byId) * l.qty;
/** "หวาน 50% · +1 ช็อตกาแฟ · โน้ต: ไม่ใส่น้ำแข็ง" — the barista's ticket line. */
const optionSummary = (l: BillLine): string =>
  [...l.opts.map((o) => o.choice), ...(l.note ? [`โน้ต: ${l.note}`] : [])].join(" · ");

const billTotal = (bill: Bill, byId: Record<string, AdminCafeItem>): number =>
  bill.reduce((s, l) => s + lineTotal(l, byId), 0);
const billCount = (bill: Bill): number => bill.reduce((s, l) => s + l.qty, 0);
/** Tile badge — every variant of that item on the bill, added up. */
const qtyOfItem = (bill: Bill, itemId: string): number =>
  bill.reduce((s, l) => (l.itemId === itemId ? s + l.qty : s), 0);

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-70"
      style={{
        paddingHorizontal: 14, height: 34, borderRadius: 999, justifyContent: "center",
        backgroundColor: active ? BRAND_GREEN : "#fff",
        borderWidth: 1, borderColor: active ? BRAND_GREEN : "#e5e7eb",
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : "#525252" }}>{label}</Text>
    </Pressable>
  );
}

// Stepper geometry — same control as the customer's CafeCard (green circles,
// no pill behind them): a lone solid + at 30, and once on the bill an outline −
// / qty / solid + row at 28. The − half still slides out from under the +
// rather than popping into place.
const STEP_BTN = 28;
const ADD_BTN = 30;
const QTY_W = 14;
const STEP_GAP = 8;
const PILL_H = ADD_BTN;
const PILL_COLLAPSED_W = ADD_BTN;
const PILL_W = STEP_BTN * 2 + QTY_W + STEP_GAP * 2;
const SLIDE_X = STEP_BTN + QTY_W + STEP_GAP * 2;

/** One tappable menu tile — tapping anywhere on the card is the same as the +
 *  (opens ตัวเลือกเพิ่มเติม, or drops a plain item straight on the bill), exactly
 *  like the customer's café card. Once on the bill the lone + widens into a
 *  − / qty / + row, the − half sliding out from under the +. */
function PosTile({ item, qty, width, onPress, onDecrement }: { item: AdminCafeItem; qty: number; width: number; onPress: () => void; onDecrement: () => void }) {
  const accent = SUB_BY_ID[item.subId]?.accent ?? BRAND_GREEN;
  const inBill = qty > 0;

  // 0 → collapsed (+ only), 1 → expanded pill. Width can't run on the native
  // driver, but this is one small control, so the JS driver is fine here.
  const grow = useRef(new Animated.Value(inBill ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(grow, {
      toValue: inBill ? 1 : 0,
      duration: 240, // expand/collapse sits in the ~300 ms transition band
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [inBill, grow]);

  const pillWidth = grow.interpolate({ inputRange: [0, 1], outputRange: [PILL_COLLAPSED_W, PILL_W] });
  // The − / qty half rides out from behind the +.
  const slideX = grow.interpolate({ inputRange: [0, 1], outputRange: [SLIDE_X, 0] });
  const slideOpacity = grow.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.6, 1] });

  return (
    <Pressable onPress={onPress} className="active:opacity-80" style={{ width }} accessibilityLabel={`เพิ่ม ${item.name}`}>
      <View style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: qty > 0 ? BRAND_GREEN : DIVIDER_GRAY, overflow: "hidden" }}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={{ width: "100%", height: Math.round(((width - 2) * 5) / 6) }} resizeMode="cover" />
        ) : item.image != null ? (
          <Image source={item.image} style={{ width: "100%", height: Math.round(((width - 2) * 5) / 6) }} resizeMode="cover" />
        ) : (
          <View style={{ width: "100%", height: Math.round(((width - 2) * 5) / 6), backgroundColor: `${accent}1a`, alignItems: "center", justifyContent: "center" }}>
            <Coffee size={28} color={accent} strokeWidth={2} />
          </View>
        )}
        <View style={{ padding: 10, gap: 4 }}>
          <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "600", color: "#0a0a0a" }}>{item.name}</Text>
          {/* Price left · qty stepper pill right (appears once in the bill) */}
          <View className="flex-row items-center justify-between" style={{ gap: 8, minHeight: PILL_H }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 14, fontWeight: "700", color: PRICE_GREEN }}>฿ {item.price.toLocaleString()}</Text>
            {/* One control throughout: the + stays put on the right while the
                − / qty half slides out from under it (and back in on remove) */}
            <Animated.View
              className="flex-row items-center justify-end"
              style={{ width: pillWidth, height: PILL_H, overflow: "hidden" }}
            >
              <Animated.View
                pointerEvents={inBill ? "auto" : "none"}
                className="flex-row items-center"
                style={{ gap: STEP_GAP, marginRight: STEP_GAP, opacity: slideOpacity, transform: [{ translateX: slideX }] }}
              >
                {/* qty 1 → − becomes a trash, same rule as the charge sheet */}
                <Pressable
                  onPress={onDecrement}
                  hitSlop={6}
                  accessibilityLabel={qty === 1 ? `ลบ ${item.name}` : `ลดจำนวน ${item.name}`}
                  className="items-center justify-center active:opacity-70"
                  style={{ width: STEP_BTN, height: STEP_BTN, borderRadius: STEP_BTN / 2, borderWidth: 1.5, borderColor: qty === 1 ? "#dc2626" : BRAND_GREEN }}
                >
                  {qty === 1 ? (
                    <Trash2 size={14} color="#dc2626" strokeWidth={2.4} />
                  ) : (
                    <Minus size={15} color={BRAND_GREEN} strokeWidth={2.6} />
                  )}
                </Pressable>
                <Text style={{ width: QTY_W, textAlign: "center", fontSize: 14, fontWeight: "800", color: "#0a0a0a", includeFontPadding: false }}>{qty}</Text>
              </Animated.View>
              <Pressable
                onPress={onPress}
                hitSlop={6}
                accessibilityLabel={inBill ? `เพิ่มจำนวน ${item.name}` : `เพิ่ม ${item.name}`}
                className="items-center justify-center active:opacity-80"
                style={{ width: inBill ? STEP_BTN : ADD_BTN, height: inBill ? STEP_BTN : ADD_BTN, borderRadius: 15, backgroundColor: BRAND_GREEN }}
              >
                <Plus size={inBill ? 15 : 17} color="#fff" strokeWidth={2.6} />
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Round side action INSIDE the glass bar.
 *
 * GlassIconButton is built to float over photos, so it paints its own soft
 * ground shadow and a second layer of glass. Dropped inside the bar that reads
 * as a dark smudge — glass over glass, shadow over shadow. Here the bar is the
 * glass, so the circle is a plain tinted disc, exactly as ProductDetail's chat
 * and cart buttons are drawn.
 */
function BarCircle({ children, onPress, label, tint = "rgba(49,151,84,0.12)" }: {
  children: ReactNode;
  onPress: () => void;
  label: string;
  tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityLabel={label}
      className="items-center justify-center active:opacity-70"
      style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: tint }}
    >
      {children}
    </Pressable>
  );
}

/**
 * POS หน้าบ้าน Meta Cafe (17.2) — ซื้อ-ขายหน้าร้าน ชำระเงิน และพักบิล.
 *
 * Charging a bill places a real order in the shared café queue
 * (store/cafe.ts), so the barista's คิวคาเฟ่ picks it up exactly like an
 * order from the customer app. Payment channels honour the admin's
 * ช่องทางชำระเงิน settings (17.4).
 */
export function CafePosScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [subFilter, setSubFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [bill, setBill] = useState<Bill>([]);
  const [held, setHeld] = useState<HeldBill[]>([]);
  const [heldSeq, setHeldSeq] = useState(1);
  // Identity of the bill being worked on: set when a held bill is resumed, so
  // re-holding it keeps its original number (it's the same bill, not a new one).
  const [resumedId, setResumedId] = useState<number | null>(null);
  const [heldOpen, setHeldOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [pay, setPay] = useState<CafePayChannelId>("cash");
  // Checkout runs as stages inside the one sheet (no stacked modals):
  // bill → the channel's own step (cash / qr) → done.
  const [stage, setStage] = useState<PayStage>("bill");
  const [cashIn, setCashIn] = useState("");
  const [sale, setSale] = useState<Sale | null>(null);

  const adminState = useStore(cafeAdminStore);
  useStore(cafeStore);
  const menu = useMemo(() => activeCafeMenu(adminState), [adminState]);
  const library = cafeOptionLibrary(adminState);
  const byId = useMemo(() => Object.fromEntries(menu.map((i) => [i.id, i])), [menu]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.filter((i) => {
      if (subFilter !== "all" && i.subId !== subFilter) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q) || (SUB_BY_ID[i.subId]?.label ?? "").includes(q);
    });
  }, [menu, subFilter, query]);

  const channels = CAFE_PAY_CHANNELS.filter((c) => adminState.pay[c.id]);
  // 2-up everywhere (bigger tap targets + readable photos, per Fitts).
  // Floor per project convention so flex-wrap can't break the grid.
  const tileW = Math.floor((winW - 32 - 10) / 2);

  // ── สมาชิก & แต้ม ──
  // The member is attached to the bill before payment; the free cup is applied
  // as a discount on the priciest eligible item, which is what a shop means by
  // "แลกฟรี 1 แก้ว" (and is capped by the rule so it can't be gamed).
  const memberState = useStore(cafeMemberStore);
  const pointRule = cafePointRule(memberState);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberOpen, setMemberOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [memberName, setMemberName] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const member = memberId ? memberById(memberId, memberState) : undefined;
  const memberPoints = member ? usablePoints(member, pointRule) : 0;

  const gross = billTotal(bill, byId);
  /** ราคาแก้วที่แพงที่สุดในบิลที่ยังอยู่ในเพดานแลก. */
  const redeemValue = useMemo(() => {
    const prices = bill
      .map((l) => byId[l.itemId]?.price ?? 0)
      .filter((p) => p > 0 && p <= pointRule.maxRedeemPrice);
    return prices.length ? Math.max(...prices) : 0;
  }, [bill, byId, pointRule.maxRedeemPrice]);
  const discount = redeeming && redeemValue > 0 ? redeemValue : 0;
  const total = Math.max(0, gross - discount);
  const count = billCount(bill);
  const cups = bill.reduce((n, l) => n + l.qty, 0);

  // A member can only be kept while there is a bill to attach them to.
  useEffect(() => {
    if (count === 0) { setMemberId(null); setRedeeming(false); }
  }, [count]);

  /** เจอเบอร์ = ผูกสมาชิก, ไม่เจอ = สมัครให้เลยตรงเคาน์เตอร์. */
  // Search results — capped, because the sheet is a picker, not a directory.
  const memberHits = cafeMembers(memberState)
    .filter((m) => matchesMember(m, memberQuery))
    .slice(0, 8);

  const closeMemberSheet = () => {
    setMemberOpen(false);
    setMemberQuery("");
  };

  const openAddMember = () => {
    // Carry a typed phone number over, so nothing is retyped.
    setPhoneInput(memberQuery.replace(/[^0-9]/g, "").slice(0, 10));
    setMemberName("");
    // Close the picker sheet: the page takes over the whole checkout surface.
    setMemberOpen(false);
    setAddMemberOpen(true);
  };

  /** Cancelling the page hands the counter back to the picker it came from. */
  const cancelAddMember = () => {
    setAddMemberOpen(false);
    setMemberOpen(true);
  };

  const pickMember = (m: { id: string; name: string }) => {
    setMemberId(m.id);
    closeMemberSheet();
    showToast(`สมาชิก ${m.name}`, "info");
  };

  const attachMember = () => {
    const phone = phoneInput.replace(/[^0-9]/g, "");
    if (phone.length !== 10) { showToast("กรอกเบอร์ 10 หลัก", "error"); return; }
    const found = memberByPhone(phone, memberState);
    const m = found ?? addCafeMember({ phone, name: memberName.trim() || `คุณ ${phone.slice(-4)}` });
    setMemberId(m.id);
    setAddMemberOpen(false);
    closeMemberSheet();
    setPhoneInput("");
    setMemberName("");
    showToast(found ? `สมาชิก ${m.name} · ${usablePoints(m, pointRule)} แต้ม` : `สมัครสมาชิกให้แล้ว · ${m.name}`, "info");
  };
  const change = (Number(cashIn) || 0) - total;
  // "พอดี" (blank field) counts as exact payment, so a plain cash sale is one tap.
  const cashEnough = cashIn === "" || change >= 0;
  // The QR pays whoever ช่องทางชำระเงิน says it should — falling back to the
  // bundled merchant only if the field was cleared.
  const payInfo = cafePayInfo(adminState);
  const qrPayload = useMemo(
    () => promptPayPayload(payInfo.promptPayId || MERCHANT_PROMPTPAY, total),
    [payInfo.promptPayId, total],
  );

  // A configured cup handed back by CafePosItem — take it once, then clear.
  const draft = useStore(posDraftStore);
  useEffect(() => {
    if (!draft) return;
    takePosDraft();
    addLine(draft.itemId, draft.opts, draft.qty, draft.note);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Emptying the bill by hand discards its identity — the next hold is a new bill.
  useEffect(() => {
    if (count === 0) setResumedId(null);
  }, [count]);

  const addLine = (itemId: string, opts: BillChoice[], qty = 1, note?: string) => {
    Haptics.selectionAsync().catch(() => {});
    const key = [lineKey(itemId, opts), note ?? ""].join("|");
    setBill((b) =>
      b.some((l) => l.key === key)
        ? b.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l))
        : [...b, { key, itemId, qty, opts, note }],
    );
  };
  /** Tile + — an item with ตัวเลือกเพิ่มเติม opens the same configure page the
   *  customer app uses; a plain one goes straight on the bill. */
  const addItem = (item: AdminCafeItem) => {
    if (resolveOptionGroups(item, library).length > 0) { nav.navigate("CafePosItem", { itemId: item.id }); return; }
    addLine(item.id, []);
  };
  /** Tile − takes one off the most recent variant of that item on the bill. */
  const decrementItem = (itemId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setBill((b) => {
      let last = -1;
      b.forEach((l, i) => { if (l.itemId === itemId) last = i; });
      if (last < 0) return b;
      const q = b[last].qty - 1;
      return q <= 0 ? b.filter((_, i) => i !== last) : b.map((l, i) => (i === last ? { ...l, qty: q } : l));
    });
  };
  const setQty = (key: string, qty: number) =>
    setBill((b) => (qty <= 0 ? b.filter((l) => l.key !== key) : b.map((l) => (l.key === key ? { ...l, qty } : l))));

  const holdBill = () => {
    if (count === 0) return;
    // A resumed bill keeps its number; only a fresh bill takes the next one.
    const id = resumedId ?? heldSeq;
    if (resumedId == null) setHeldSeq((n) => n + 1);
    setHeld((h) => [...h, { id, bill, total }].sort((a, b) => a.id - b.id));
    setResumedId(null);
    setBill([]);
    closeCheckout();
    showToast(`พักบิล #${id} ไว้แล้ว`, "info");
  };
  const resumeBill = (hb: HeldBill) => {
    if (count > 0) {
      showToast("ชำระหรือพักบิลปัจจุบันก่อน แล้วค่อยเรียกบิลที่พักไว้", "error");
      return;
    }
    setHeld((h) => h.filter((x) => x.id !== hb.id));
    setBill(hb.bill);
    setResumedId(hb.id);
    setHeldOpen(false);
    showToast(`เรียกบิลพัก #${hb.id} กลับมาแล้ว`, "info");
  };
  const discardHeld = (hb: HeldBill) =>
    Alert.alert("ลบบิลพัก", `ต้องการลบบิลพัก #${hb.id} (฿${hb.total.toLocaleString()}) ใช่หรือไม่?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => setHeld((h) => h.filter((x) => x.id !== hb.id)) },
    ]);

  // ── checkout flow ──────────────────────────────────────────────
  const openCheckout = () => {
    setStage("bill");
    setCashIn("");
    setCheckout(true);
  };
  const closeCheckout = () => {
    setCheckout(false);
    setStage("bill");
    setCashIn("");
  };
  /** Bill → the channel's own step: counting cash, or a QR to scan. */
  const startPayment = () => {
    if (count === 0) return;
    setCashIn("");
    setStage(pay === "cash" ? "cash" : "qr");
  };

  /** Settle the bill: place the order in the shared queue, then show the
   *  cashier what they must read out — the queue number (and any change). */
  const settle = (received?: number) => {
    if (count === 0) return;
    const orders = cafeStore.get();
    const queueNo = orders.reduce((m, o) => Math.max(m, o.queueNo), 0) + 1;
    const preparingAhead = cafeQueue(METAHERB_SHOP).filter((o) => o.status === "preparing").length;
    const payLabel = CAFE_PAY_CHANNELS.find((c) => c.id === pay)?.label ?? "เงินสด";
    const now = Date.now();
    const waitMinutes = 5;
    placeCafeOrder({
      orderId: `POS-${now}`,
      userId: "pos-walkin",
      shopName: METAHERB_SHOP,
      payLabel,
      receiveLabel: "รับที่หน้าร้าน",
      items: bill.map((l) => ({
        name: byId[l.itemId]?.name ?? l.itemId,
        qty: l.qty,
        summary: optionSummary(l),
        total: lineTotal(l, byId),
      })),
      total,
      queueNo,
      queueAhead: preparingAhead,
      waitMinutes,
      readyAt: now + waitMinutes * 60000,
    });
    // Redeem first (it consumes the full card), then earn from this purchase —
    // the order matters, otherwise today's visit could pay for today's free one.
    // One bill = one point, however many cups are on it.
    if (memberId) {
      if (redeeming && discount > 0) redeemPoints(memberId, `POS-${now}`);
      earnPoints(memberId, `POS-${now}`);
    }
    setMemberId(null);
    setRedeeming(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSale({
      queueNo,
      total,
      payLabel,
      change: received != null ? received - total : 0,
      items: bill.map((l) => ({
        name: byId[l.itemId]?.name ?? l.itemId,
        qty: l.qty,
        summary: optionSummary(l),
        total: lineTotal(l, byId),
      })),
      received,
      at: now,
    });
    setBill([]);
    setResumedId(null); // the bill is settled — its number retires with it
    setStage("done");
  };

  /** The receipt as plain text — what the customer gets on LINE. */
  const receiptText = (r: Sale): string => {
    const d = new Date(r.at);
    const stamp = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const lines = r.items.map((it) => `${it.qty}x ${it.name}${it.summary ? ` (${it.summary})` : ""}  ฿${it.total.toLocaleString()}`);
    return [
      `${payInfo.merchantName || MERCHANT_NAME}`,
      `ใบเสร็จรับเงิน · คิว #${r.queueNo}`,
      stamp,
      "",
      ...lines,
      "",
      `รวม ฿${r.total.toLocaleString()}`,
      `ชำระโดย ${r.payLabel}`,
      r.change > 0 ? `รับเงิน ฿${(r.received ?? 0).toLocaleString()} · เงินทอน ฿${r.change.toLocaleString()}` : "",
      "",
      "ขอบคุณที่ใช้บริการ",
    ].filter(Boolean).join("\n");
  };

  /** Success → straight back to the grid, ready for the next customer. */
  const nextSale = () => {
    setSale(null);
    closeCheckout();
  };

  // Room for the pinned bill bar.
  const bottomPad = (count > 0 ? 92 : 24) + insets.bottom;

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="POS หน้าร้าน"
        subtitle="ขายหน้าร้าน · ชำระเงิน · พักบิล"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={
          /* Held bills live behind a header icon (badge = how many) — visible
             but out of the way of the sales grid (Zeigarnik without clutter) */
          <View>
            <GlassIconButton onPress={() => setHeldOpen(true)} accessibilityLabel="บิลที่พักไว้">
              <ReceiptText size={20} color="#1a1a1a" strokeWidth={2.2} />
            </GlassIconButton>
            {held.length > 0 ? (
              <View pointerEvents="none" style={{ position: "absolute", top: -3, right: -3 }}>
                <CountBadge count={held.length} color="#d97706" />
              </View>
            ) : null}
          </View>
        }
        bottomSlot={
          <View style={{ gap: 10 }}>
            {/* Search pill — same recipe as จัดการเมนู / จัดการสินค้า */}
            <View
              className="flex-row items-center"
              style={{ backgroundColor: "white", borderWidth: 1, borderColor: DIVIDER_GRAY, borderRadius: 999, height: 44, paddingLeft: 16, paddingRight: 6, gap: 8 }}
            >
              <TextInput
                style={{ flex: 1, fontSize: 13, color: "#0a0a0a", padding: 0 }}
                placeholder="ค้นหาชื่อเมนู หรือหมวดหมู่"
                placeholderTextColor="#c4c4c4"
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} hitSlop={8} className="active:opacity-60" accessibilityLabel="ล้างคำค้นหา">
                  <X size={16} color="#8a8f8a" strokeWidth={2.4} />
                </Pressable>
              ) : null}
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                <Search size={16} color="white" />
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -14 }}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}
            >
              <FilterChip label="ทั้งหมด" active={subFilter === "all"} onPress={() => setSubFilter("all")} />
              {CAFE_SUBS.map((s) => (
                <FilterChip key={s.id} label={s.label} active={subFilter === s.id} onPress={() => setSubFilter(s.id)} />
              ))}
            </ScrollView>
          </View>
        }
      />

      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad, flexDirection: "row", flexWrap: "wrap", gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {visible.length === 0 ? (
            /* Searching for something the menu doesn't have shouldn't look like
               a broken grid. */
            <View style={{ width: "100%", alignItems: "center", paddingVertical: 56, gap: 8 }}>
              <Coffee size={34} color="#c4c4c4" strokeWidth={1.6} />
              <Text style={{ fontSize: 14, color: TEXT_MUTED }}>ไม่พบเมนูที่ค้นหา</Text>
            </View>
          ) : null}
          {visible.map((item) => (
            <PosTile key={item.id} item={item} qty={qtyOfItem(bill, item.id)} width={tileW} onPress={() => addItem(item)} onDecrement={() => decrementItem(item.id)} />
          ))}
        </ScrollView>
        <HeaderFade />
      </View>

      {/* Pinned bill bar */}
      {count > 0 ? (
        <View
          style={{
            position: "absolute", left: 16, right: 16, bottom: 16 + insets.bottom,
            backgroundColor: "#fff", borderRadius: 999, paddingLeft: 20, paddingRight: 8, height: 60,
            flexDirection: "row", alignItems: "center", gap: 10,
            shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#0a0a0a" }}>฿ {total.toLocaleString()}</Text>
            <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{count} รายการ</Text>
          </View>
          <Pressable
            onPress={holdBill}
            className="active:opacity-70"
            style={{ height: 44, borderRadius: 999, borderWidth: 1, borderColor: "#d97706", paddingHorizontal: 14, justifyContent: "center" }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#d97706" }}>พักบิล</Text>
          </Pressable>
          <Pressable
            onPress={openCheckout}
            className="active:opacity-80"
            style={{ height: 44, borderRadius: 999, backgroundColor: BRAND_GREEN, paddingHorizontal: 18, justifyContent: "center" }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#fff" }}>ชำระเงิน</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Held-bills sheet — iOS-grouped rows (same card language as the
          payment channels): icon tile · บิลพัก #n / summary · เรียกคืน + trash */}
      <BottomSheet
        visible={heldOpen}
        onClose={() => setHeldOpen(false)}
        title="บิลที่พักไว้"
        centerTitle
        fillContent
        minHeightRatio={0.9}
        maxHeightRatio={0.9}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {held.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 36, gap: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(217,119,6,0.1)", alignItems: "center", justifyContent: "center" }}>
              <PauseCircle size={28} color="#d97706" strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: TEXT_MUTED }}>ยังไม่มีบิลที่พักไว้</Text>
            <Text style={{ fontSize: 12.5, color: "#a3a3a3", textAlign: "center", lineHeight: 18 }}>
              กด "พักบิล" ระหว่างคิดเงิน แล้วบิลจะมารออยู่ที่นี่
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginBottom: 8 }}>
            {held.map((hb) => (
              <View
                key={hb.id}
                className="flex-row items-center"
                style={{ minHeight: 64, paddingHorizontal: 14, paddingVertical: 12, gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f0f0f0" }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(217,119,6,0.1)", alignItems: "center", justifyContent: "center" }}>
                  <PauseCircle size={18} color="#d97706" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a" }}>บิลพัก #{hb.id}</Text>
                  <Text style={{ fontSize: 12, color: "#8a8f8a", marginTop: 1 }}>
                    {billCount(hb.bill)} รายการ · ฿{hb.total.toLocaleString()}
                  </Text>
                </View>
                <Pressable onPress={() => discardHeld(hb)} hitSlop={8} className="active:opacity-60" accessibilityLabel={`ลบบิลพัก ${hb.id}`}>
                  <Trash2 size={16} color="#9ca3af" strokeWidth={2.2} />
                </Pressable>
                <Pressable
                  onPress={() => resumeBill(hb)}
                  className="active:opacity-80"
                  style={{ height: 34, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", backgroundColor: BRAND_GREEN }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#fff" }}>เรียกคืน</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        </ScrollView>
      </BottomSheet>


      {/* Checkout — a full screen, not a sheet. Taking money is a mode the
          cashier is IN: it wants the whole display (the QR and the cash pad are
          cramped at 90%), and a sheet can be swiped away mid-payment, which is
          the one gesture that must not be easy here. Kept as a modal rather
          than a route so the bill, the held bills and the attached member stay
          exactly where they are in this screen's state. */}
      <Modal visible={checkout} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={stage === "done" ? nextSale : closeCheckout}>
        <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
          <SubPageHeader
            title={STAGE_TITLE[stage]}
            onBack={stage === "done" ? nextSale : closeCheckout}
            showSearch={false}
          />
        <View style={{ flex: 1 }}>
        {stage === "bill" ? (
        <>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 }}>
          {/* Line items — one iOS-grouped card, hairline between rows, matching
              the payment-channel card below it. Loose rows on the page made the
              bill read as a different kind of thing from the rest of the sheet. */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#f0f0f0", paddingHorizontal: 14, overflow: "hidden" }}>
            {bill.map((line, i) => {
              const it = byId[line.itemId];
              if (!it) return null;
              const qty = line.qty;
              const accent = SUB_BY_ID[it.subId]?.accent ?? BRAND_GREEN;
              const summary = optionSummary(line);
              return (
                <View key={line.key} className="flex-row items-center" style={{ gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: "rgba(60,60,67,0.12)" }}>
                  {it.imageUri || it.image != null ? (
                    <Image source={it.imageUri ? { uri: it.imageUri } : it.image} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "#f5f5f5" }} resizeMode="cover" resizeMethod="resize" />
                  ) : (
                    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: `${accent}1a`, alignItems: "center", justifyContent: "center" }}>
                      <Coffee size={20} color={accent} strokeWidth={2} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{it.name}</Text>
                    {summary ? (
                      <Text numberOfLines={2} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>{summary}</Text>
                    ) : null}
                    <Text style={{ fontSize: 13, fontWeight: "800", color: BRAND_GREEN, marginTop: 2 }}>฿{lineTotal(line, byId).toLocaleString()}</Text>
                  </View>
                  {/* Same stepper pill as the menu tile, so one control reads
                      the same in both places */}
                  <View className="flex-row items-center" style={{ height: 32, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }}>
                    {/* qty 1 → the − becomes a trash: one more tap removes the
                        line; removing the last line closes the sheet so the
                        cashier lands back on the menu grid to start over */}
                    <Pressable
                      onPress={() => {
                        setQty(line.key, qty - 1);
                        if (qty === 1 && count === 1) closeCheckout();
                      }}
                      hitSlop={8}
                      accessibilityLabel={qty === 1 ? `ลบ ${it.name}` : `ลดจำนวน ${it.name}`}
                      className="items-center justify-center active:opacity-60"
                      style={{ width: 32, height: 32 }}
                    >
                      {qty === 1 ? (
                        <Trash2 size={14} color="#dc2626" strokeWidth={2.2} />
                      ) : (
                        <Minus size={14} color="#0a0a0a" strokeWidth={2.6} />
                      )}
                    </Pressable>
                    <Text style={{ minWidth: 18, textAlign: "center", fontSize: 13.5, fontWeight: "700", color: "#0a0a0a", includeFontPadding: false }}>{qty}</Text>
                    <Pressable onPress={() => setQty(line.key, qty + 1)} hitSlop={8} accessibilityLabel={`เพิ่มจำนวน ${it.name}`} className="items-center justify-center active:opacity-60" style={{ width: 32, height: 32 }}>
                      <Plus size={14} color="#0a0a0a" strokeWidth={2.6} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          {/* สมาชิก — attach before paying, so the free cup and the points both
              land on this bill */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#f0f0f0", overflow: "hidden" }}>
            <Pressable
              onPress={() => (member ? setMemberId(null) : setMemberOpen(true))}
              className="flex-row items-center active:opacity-70"
              style={{ minHeight: 60, paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                <UserRound size={19} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#1c1c1e" }}>
                  {member ? member.name : "สมาชิก"}
                </Text>
                <Text style={{ fontSize: 12, color: "#8a8f8a", marginTop: 1 }}>
                  {member ? `มี ${memberPoints} แต้ม · แตะเพื่อเอาสมาชิกออกจากบิล` : "กรอกเบอร์ลูกค้าเพื่อสะสมแต้ม (บิลนี้ได้ 1 แต้ม)"}
                </Text>
              </View>
              {!member ? <Plus size={18} color={BRAND_GREEN} strokeWidth={2.6} /> : <X size={17} color="#9ca3af" strokeWidth={2.4} />}
            </Pressable>

            {/* Redeem is offered only when it can actually be honoured */}
            {member && memberPoints >= pointRule.redeemAt && redeemValue > 0 ? (
              <Pressable
                onPress={() => setRedeeming((v) => !v)}
                className="flex-row items-center active:opacity-70"
                style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(60,60,67,0.12)" }}
              >
                <Gift size={18} color={BRAND_GREEN} strokeWidth={2.2} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#1c1c1e" }}>ใช้แต้มแลกฟรี 1 แก้ว</Text>
                  <Text style={{ fontSize: 12, color: "#8a8f8a", marginTop: 1 }}>ตัด {pointRule.redeemAt} แต้ม · ลดให้ ฿{redeemValue.toLocaleString()}</Text>
                </View>
                <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: redeeming ? BRAND_GREEN : "#cbd0cb", backgroundColor: redeeming ? BRAND_GREEN : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {redeeming ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
                </View>
              </Pressable>
            ) : null}
          </View>

          <View>
            {/* iOS-grouped card — same rows as CafePaymentMethodScreen: icon ·
                label/desc · 22px radio, hairline separators inside one card */}
            <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#f0f0f0", overflow: "hidden" }}>
              {channels.map((c, i) => {
                const Icon = PAY_ICON[c.id];
                const active = pay === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setPay(c.id)}
                    className="flex-row items-center active:opacity-70"
                    style={{ minHeight: 60, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: "rgba(60,60,67,0.12)" }}
                  >
                    <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                      <Icon size={28} color={active ? BRAND_GREEN : "#9ca3af"} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 16, color: "#1c1c1e", fontWeight: active ? "600" : "400" }}>{c.label}</Text>
                      <Text style={{ fontSize: 12, color: "#8a8f8a", marginTop: 1 }}>{c.sub}</Text>
                    </View>
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: active ? BRAND_GREEN : "#cbd0cb", alignItems: "center", justifyContent: "center" }}>
                      {active ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: BRAND_GREEN }} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Pinned actions — always reachable, list scrolls behind them */}
        <GlassActionBar
          top={
            discount > 0 ? (
              <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 10, paddingTop: 2 }}>
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ส่วนลดแลกแต้ม</Text>
                <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN }}>−฿{discount.toLocaleString()}</Text>
              </View>
            ) : undefined
          }
        >
          <BarCircle onPress={holdBill} label="พักบิล" tint="rgba(217,119,6,0.14)">
            <PauseCircle size={22} color="#d97706" strokeWidth={2.2} />
          </BarCircle>
          <PrimaryAction
            label={`รับชำระ ฿${total.toLocaleString()}`}
            onPress={startPayment}
            disabled={count === 0}
          />
        </GlassActionBar>
        </>
        ) : stage === "cash" ? (
          /* เงินสด — the cashier's real job here is the change, so the app does
             the arithmetic while the customer is standing there (Tesler's Law) */
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 }}>
              <View style={{ backgroundColor: "#fafafa", borderRadius: 16, paddingVertical: 16, alignItems: "center", gap: 2 }}>
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ยอดที่ต้องเก็บ</Text>
                <Text style={{ fontSize: 32, fontWeight: "800", color: "#0a0a0a" }}>฿{total.toLocaleString()}</Text>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a" }}>รับเงินมา</Text>
                <View className="flex-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {cashQuickAmounts(total).map((amt) => {
                    const active = Number(cashIn) === amt;
                    return (
                      <Pressable
                        key={amt}
                        onPress={() => { Haptics.selectionAsync().catch(() => {}); setCashIn(String(amt)); }}
                        className="active:opacity-80"
                        style={{ paddingHorizontal: 16, height: 40, justifyContent: "center", borderRadius: 999, backgroundColor: active ? BRAND_GREEN : "#fafafa", borderWidth: 1, borderColor: active ? BRAND_GREEN : "#ececec" }}
                      >
                        <Text style={{ fontSize: 13.5, fontWeight: active ? "700" : "500", color: active ? "#fff" : "#525252" }}>
                          {amt === total ? "พอดี" : `฿${amt.toLocaleString()}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={cashIn}
                  onChangeText={(t) => setCashIn(t.replace(/[^0-9]/g, ""))}
                  keyboardType="numeric"
                  placeholder="หรือพิมพ์จำนวนเงินที่รับมา"
                  placeholderTextColor="#a3a3a3"
                  style={{ backgroundColor: "#fafafa", borderRadius: 999, paddingHorizontal: 20, height: 48, fontSize: 14, color: "#0a0a0a" }}
                />
              </View>

              {/* Change — the number the cashier is actually waiting for */}
              <View style={{ backgroundColor: change >= 0 ? "rgba(49,151,84,0.08)" : "#fafafa", borderRadius: 16, borderWidth: 1, borderColor: change >= 0 ? BRAND_GREEN : "#ececec", paddingVertical: 16, alignItems: "center", gap: 2 }}>
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>{change >= 0 ? "เงินทอน" : "ยังขาดอีก"}</Text>
                <Text style={{ fontSize: 34, fontWeight: "800", color: change >= 0 ? BRAND_GREEN : "#dc2626" }}>
                  ฿{Math.abs(change).toLocaleString()}
                </Text>
              </View>
            </ScrollView>

            <GlassActionBar>
              <BarCircle onPress={() => setStage("bill")} label="ย้อนกลับ" tint="rgba(118,118,128,0.12)">
                <ChevronLeft size={22} color="#6b7280" strokeWidth={2.4} />
              </BarCircle>
              <PrimaryAction
                label="ยืนยันรับเงิน"
                onPress={() => settle(Number(cashIn) || total)}
                disabled={!cashEnough}
              />
            </GlassActionBar>
          </>
        ) : stage === "qr" ? (
          /* พร้อมเพย์ — the same payload/QR the customer app generates, turned
             around to face the customer. No bank webhook in the mockup, so the
             cashier confirms receipt themselves. */
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 16, alignItems: "center" }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#f0f0f0", padding: 20, alignItems: "center", gap: 12, alignSelf: "stretch" }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: PROMPTPAY_BLUE, letterSpacing: 0.5 }}>PromptPay</Text>
                <QRCode value={qrPayload} size={200} />
                <View style={{ alignItems: "center", gap: 2 }}>
                  <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>{payInfo.merchantName || MERCHANT_NAME}</Text>
                  <Text style={{ fontSize: 28, fontWeight: "800", color: "#0a0a0a" }}>฿{total.toLocaleString()}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center", lineHeight: 19 }}>
                หันจอให้ลูกค้าสแกน แล้วกดยืนยันเมื่อเงินเข้าบัญชีแล้ว
              </Text>
            </ScrollView>

            <GlassActionBar>
              <BarCircle onPress={() => setStage("bill")} label="ย้อนกลับ" tint="rgba(118,118,128,0.12)">
                <ChevronLeft size={22} color="#6b7280" strokeWidth={2.4} />
              </BarCircle>
              <PrimaryAction label="ลูกค้าชำระแล้ว" onPress={() => settle()} />
            </GlassActionBar>
          </>
        ) : stage === "receipt" ? (
          /* ใบเสร็จ — a paper-shaped slip the cashier can hand over as a photo
             or a LINE message. No printer here on purpose: a thermal printer
             needs a native module, and a button that does nothing when there's
             no hardware is worse than no button. Everything a printer would
             need is on this slip, so wiring one up later is a rendering job. */
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#ececec", padding: 18, gap: 12 }}>
                <View style={{ alignItems: "center", gap: 2 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#0a0a0a" }}>{payInfo.merchantName || MERCHANT_NAME}</Text>
                  <Text style={{ fontSize: 12, color: TEXT_MUTED }}>ใบเสร็จรับเงิน</Text>
                </View>

                <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: "#dcdcdc" }} />

                <View className="flex-row items-center justify-between">
                  <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>คิว</Text>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: BRAND_GREEN }}>#{sale?.queueNo}</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>วันที่</Text>
                  <Text style={{ fontSize: 12.5, color: "#0a0a0a" }}>
                    {sale ? new Date(sale.at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : ""}
                  </Text>
                </View>

                <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: "#dcdcdc" }} />

                {sale?.items.map((it, i) => (
                  <View key={i} className="flex-row" style={{ gap: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#0a0a0a", minWidth: 22 }}>{it.qty}x</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13, color: "#0a0a0a" }}>{it.name}</Text>
                      {it.summary ? <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>{it.summary}</Text> : null}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }}>฿{it.total.toLocaleString()}</Text>
                  </View>
                ))}

                <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: "#dcdcdc" }} />

                <View className="flex-row items-center justify-between">
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>รวม</Text>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: "#0a0a0a" }}>฿{(sale?.total ?? 0).toLocaleString()}</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ชำระโดย</Text>
                  <Text style={{ fontSize: 12.5, color: "#0a0a0a" }}>{sale?.payLabel}</Text>
                </View>
                {sale && sale.change > 0 ? (
                  <>
                    <View className="flex-row items-center justify-between">
                      <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>รับเงิน</Text>
                      <Text style={{ fontSize: 12.5, color: "#0a0a0a" }}>฿{(sale.received ?? 0).toLocaleString()}</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>เงินทอน</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN }}>฿{sale.change.toLocaleString()}</Text>
                    </View>
                  </>
                ) : null}

                <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: "#dcdcdc" }} />
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED, textAlign: "center" }}>ขอบคุณที่ใช้บริการ</Text>
              </View>
            </ScrollView>

            <GlassActionBar>
              <BarCircle onPress={() => setStage("done")} label="ย้อนกลับ" tint="rgba(118,118,128,0.12)">
                <ChevronLeft size={22} color="#6b7280" strokeWidth={2.4} />
              </BarCircle>
              <PrimaryAction
                label="ส่งใบเสร็จให้ลูกค้า"
                icon={<Share2 size={16} color="#fff" strokeWidth={2.4} />}
                onPress={() => sale && Share.share({ message: receiptText(sale) }).catch(() => {})}
              />
            </GlassActionBar>
          </>
        ) : (
          /* สำเร็จ — the queue number is the biggest thing on screen because
             that is what the cashier has to read out (Peak-End Rule) */
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, alignItems: "center", gap: 6 }}>
              <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
                <Check size={40} color="#fff" strokeWidth={3} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#0a0a0a", marginTop: 8 }}>รับชำระสำเร็จ</Text>
              <Text style={{ fontSize: 13, color: TEXT_MUTED }}>แจ้งเลขคิวนี้กับลูกค้า</Text>
              <Text style={{ fontSize: 56, fontWeight: "900", color: BRAND_GREEN, marginTop: 2 }}>#{sale?.queueNo}</Text>

              <View style={{ alignSelf: "stretch", backgroundColor: "#fafafa", borderRadius: 16, padding: 16, gap: 10, marginTop: 12 }}>
                <View className="flex-row items-center justify-between">
                  <Text style={{ fontSize: 13, color: TEXT_MUTED }}>ยอดชำระ</Text>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>฿{(sale?.total ?? 0).toLocaleString()}</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text style={{ fontSize: 13, color: TEXT_MUTED }}>ช่องทาง</Text>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a" }}>{sale?.payLabel}</Text>
                </View>
                {sale && sale.change > 0 ? (
                  <View className="flex-row items-center justify-between">
                    <Text style={{ fontSize: 13, color: TEXT_MUTED }}>เงินทอน</Text>
                    <Text style={{ fontSize: 17, fontWeight: "800", color: BRAND_GREEN }}>฿{sale.change.toLocaleString()}</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <GlassActionBar>
              <BarCircle onPress={() => setStage("receipt")} label="ใบเสร็จ" tint="rgba(49,151,84,0.14)">
                <ReceiptText size={21} color={BRAND_GREEN} strokeWidth={2.2} />
              </BarCircle>
              <BarCircle onPress={() => { nextSale(); nav.navigate("CafeQueue"); }} label="ดูคิวออเดอร์" tint="rgba(0,122,255,0.12)">
                <ListOrdered size={21} color="#007aff" strokeWidth={2.2} />
              </BarCircle>
              <PrimaryAction label="ขายรายการถัดไป" onPress={nextSale} />
            </GlassActionBar>
          </>
        )}
        {/* Inside the scroll wrapper — as a sibling of the header its top:0
            landed behind the header, where nothing could see it. And the page
            surface is the app's #fafafa: white cards on a white page had
            nothing to dissolve INTO, so the fade did nothing either. */}
        <HeaderFade />
        </View>
        </View>
      {/* สมาชิก — search first: the counter usually has a member already, so the
          list does the work and registering is the exception, parked top-right.
          Rendered INSIDE the checkout modal, which is fullScreen and would
          otherwise cover a sheet that is only its sibling. */}
      <BottomSheet
        visible={memberOpen}
        onClose={closeMemberSheet}
        title="สมาชิก"
        centerTitle
        // The list should run to the bottom of the sheet; a centerTitle sheet
        // hugs its content unless told to fill.
        fill
        rightSlot={
          <GlassIconButton onPress={openAddMember} size={44} accessibilityLabel="เพิ่มสมาชิกใหม่">
            <Plus size={22} color={BRAND_GREEN} strokeWidth={2.8} />
          </GlassIconButton>
        }
      >
        <View style={{ flex: 1, paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}>
              <View className="flex-row items-center" style={{ backgroundColor: "#fafafa", borderRadius: 999, height: 48, paddingHorizontal: 16, gap: 8 }}>
                  <Search size={16} color="#9ca3af" strokeWidth={2.4} />
                  <TextInput
                    value={memberQuery}
                    onChangeText={setMemberQuery}
                    placeholder="ค้นหาเบอร์โทร หรือชื่อสมาชิก"
                    placeholderTextColor="#a3a3a3"
                    keyboardType="numbers-and-punctuation"
                    autoFocus
                    style={{ flex: 1, fontSize: 15, color: "#0a0a0a", padding: 0 }}
                  />
                  {memberQuery ? (
                    <Pressable onPress={() => setMemberQuery("")} hitSlop={8} className="active:opacity-60">
                      <X size={15} color="#9ca3af" strokeWidth={2.4} />
                    </Pressable>
                  ) : null}
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: insets.bottom + 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {memberHits.length === 0 ? (
                  <Text style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center", paddingVertical: 24 }}>
                    {memberQuery ? "ไม่พบสมาชิกที่ค้นหา — กด + มุมขวาบนเพื่อสมัครใหม่" : "พิมพ์เบอร์หรือชื่อเพื่อค้นหา"}
                  </Text>
                ) : (
                  memberHits.map((m) => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      points={usablePoints(m, pointRule)}
                      redeemAt={pointRule.redeemAt}
                      onPress={() => pickMember(m)}
                    />
                  ))
                )}
              </ScrollView>
        </View>
      </BottomSheet>

      {/* เพิ่มสมาชิก — a page, drawn as an overlay rather than a Modal: this
          subtree is already inside the fullScreen checkout Modal, and a Modal
          nested in a Modal never presents on iOS — which is why the form kept
          opening into nothing. An absolute layer always draws. */}
      {addMemberOpen ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "#fff", paddingTop: insets.top, zIndex: 20 }}
        >
          {/* Close on the left, title centred — the save moved to the floating
              bar below, where every other page in the app puts its action. */}
          <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
            <GlassIconButton onPress={cancelAddMember} size={44} accessibilityLabel="ปิด">
              <X size={22} color="#1a1a1a" strokeWidth={2.6} />
            </GlassIconButton>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>เพิ่มสมาชิก</Text>
            <View style={{ width: 44 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 6 }}>
              <FieldLabel>เบอร์โทรศัพท์</FieldLabel>
              <TextInput
                value={phoneInput}
                onChangeText={(t) => setPhoneInput(t.replace(/[^0-9]/g, ""))}
                placeholder="08xxxxxxxx"
                placeholderTextColor="#a3a3a3"
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
                style={PAYOUT_INPUT}
              />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel>ชื่อลูกค้า</FieldLabel>
              <TextInput
                value={memberName}
                onChangeText={setMemberName}
                placeholder="ชื่อเล่นที่ใช้เรียกหน้าร้าน"
                placeholderTextColor="#a3a3a3"
                style={PAYOUT_INPUT}
              />
            </View>
          </ScrollView>

          <GlassActionBar>
            <PrimaryAction
              label="บันทึกและเรียกใช้"
              onPress={attachMember}
              disabled={phoneInput.replace(/\D/g, "").length !== 10}
            />
          </GlassActionBar>
        </KeyboardAvoidingView>
      ) : null}

      </Modal>
    </View>
  );
}
