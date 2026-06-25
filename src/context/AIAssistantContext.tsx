import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  detectIntent, extractGoals, extractBudget, extractCategory, goalLabel, categoryLabel,
  searchProducts, recommendForGoals, compareProducts, valueAnalysis, buildBundle,
  suggestPromos, crossSell, quickReplies,
  type Intent, type CustomerProfile, type HealthGoal, type ComparisonRow, type PromoSuggestion,
} from "../data/aiEngine";
import { REAL_PRODUCTS, getRealProductImage } from "../data/realProducts";
import type { CatalogProduct } from "../data/catalog";
import { useCart } from "./CartContext";
import { useOrders } from "./OrderContext";
import { STATUS_LABEL } from "../data/orders";

type P = CatalogProduct;

/** Rich message payloads — the UI renders cards based on `kind`. */
export type AIMessage =
  | { id: string; role: "user"; ts: number; kind: "text"; text: string }
  | { id: string; role: "ai";   ts: number; kind: "text"; text: string }
  | { id: string; role: "ai";   ts: number; kind: "products"; text: string; products: P[]; goals?: HealthGoal[] }
  | { id: string; role: "ai";   ts: number; kind: "comparison"; text: string; products: P[]; rows: ComparisonRow[]; summary: string }
  | { id: string; role: "ai";   ts: number; kind: "bundle"; text: string; items: P[]; total: number; discount: number; finalPrice: number; name: string }
  | { id: string; role: "ai";   ts: number; kind: "value"; text: string; product: P; verdict: string; savings?: string; discountPct: number }
  | { id: string; role: "ai";   ts: number; kind: "cart"; text: string; items: { id: string; name: string; price: number; quantity: number }[]; total: number; promos: PromoSuggestion[] }
  | { id: string; role: "ai";   ts: number; kind: "orders"; text: string; orders: Array<{ id: string; status: string; total: number; date: string }> }
  | { id: string; role: "ai";   ts: number; kind: "actions"; text: string; actions: { label: string; intent: string }[] };

/** Distributive Omit so each union variant keeps its own props. */
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
type NewAIMessage = DistributiveOmit<AIMessage, "id" | "ts">;

export interface ChatSession {
  id: string;
  title: string;
  messages: AIMessage[];
  updatedAt: number;
}

interface AIAssistantContextType {
  messages: AIMessage[];
  profile: CustomerProfile;
  typing: boolean;
  send: (text: string) => Promise<void>;
  quickReplyChips: string[];
  unreadCount: number;
  markRead: () => void;
  sessions: ChatSession[];
  currentSessionId: string;
  newChat: () => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | null>(null);

const uid = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const sid = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const STORAGE_KEY = "metaherb.ai.sessions.v1";
const CURRENT_KEY = "metaherb.ai.current.v1";

const GREETING: AIMessage = {
  id: "greet", role: "ai", ts: 0, kind: "text",
  text: "สวัสดีค่ะ เมต้าเป็นผู้ช่วยช้อปสมุนไพรของคุณ 🌿 มีอะไรให้เมต้าช่วยไหมคะ — ลองถามได้เลยว่า “หาสินค้าอะไรอยู่” หรือ “แนะนำสินค้าหน่อย”",
};

const createSession = (): ChatSession => ({ id: sid(), title: "แชทใหม่", messages: [GREETING], updatedAt: Date.now() });

const deriveTitle = (msgs: AIMessage[]): string => {
  const firstUser = msgs.find((m) => m.role === "user" && m.kind === "text");
  if (!firstUser || firstUser.kind !== "text") return "แชทใหม่";
  const t = firstUser.text.trim().slice(0, 28);
  return t.length > 0 ? t : "แชทใหม่";
};

/** Seed history so the list isn't empty on first run. */
function seedSessions(): ChatSession[] {
  const now = Date.now();
  const mk = (id: string, title: string, userText: string, agoMin: number): ChatSession => ({
    id, title, updatedAt: now - agoMin * 60_000,
    messages: [
      GREETING,
      { id: `${id}_u`, role: "user", ts: now - agoMin * 60_000 - 5000, kind: "text", text: userText },
      { id: `${id}_a`, role: "ai", ts: now - agoMin * 60_000 - 4000, kind: "text", text: "เมต้ามีตัวเลือกหลายอย่างเลยค่ะ ลองเปิดดูในแชทเดิมได้เลยนะคะ 🌿" },
    ],
  });
  return [
    { id: "s_seed_new", title: "แชทใหม่", updatedAt: now, messages: [GREETING] },
    mk("s_seed_1", "แนะนำสมุนไพรช่วยนอนหลับ", "แนะนำสมุนไพรช่วยนอนหลับ", 35),
    mk("s_seed_2", "เปรียบเทียบสินค้าขายดี", "เปรียบเทียบสินค้าขายดี", 90),
    mk("s_seed_3", "ลดน้ำหนัก งบไม่เกิน 500", "ลดน้ำหนัก งบไม่เกิน 500 บาท", 1440),
  ];
}

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const seed = useMemo(() => seedSessions(), []);
  const [sessions, setSessions] = useState<ChatSession[]>(seed);
  const [currentSessionId, setCurrentSessionId] = useState<string>(seed[0].id);
  const [profile, setProfile] = useState<CustomerProfile>({ goals: [] });
  const [typing, setTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const { items: cartItems, addToCart, removeItem } = useCart();
  const { orders } = useOrders();
  const cartTotal = useMemo(() => cartItems.reduce((s, i) => s + i.price * i.quantity, 0), [cartItems]);

  const profileRef = useRef(profile); profileRef.current = profile;
  const currentRef = useRef(currentSessionId); currentRef.current = currentSessionId;
  const cartRef = useRef({ cartItems, cartTotal }); cartRef.current = { cartItems, cartTotal };
  const ordersRef = useRef(orders); ordersRef.current = orders;

  // Load persisted sessions once.
  useEffect(() => {
    (async () => {
      try {
        const [rawS, rawC] = await Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(CURRENT_KEY)]);
        if (rawS) {
          const parsed = JSON.parse(rawS) as ChatSession[];
          if (Array.isArray(parsed) && parsed.length) {
            setSessions(parsed);
            setCurrentSessionId(rawC && parsed.some((s) => s.id === rawC) ? rawC : parsed[0].id);
          }
        }
      } catch { /* ignore */ }
      setHydrated(true);
    })();
  }, []);

  // Persist on change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)).catch(() => {});
    AsyncStorage.setItem(CURRENT_KEY, currentSessionId).catch(() => {});
  }, [sessions, currentSessionId, hydrated]);

  const messages: AIMessage[] = useMemo(() => {
    const s = sessions.find((x) => x.id === currentSessionId);
    return s ? s.messages : [GREETING];
  }, [sessions, currentSessionId]);
  const messagesRef = useRef(messages); messagesRef.current = messages;

  const mutateCurrent = useCallback((updater: (prev: AIMessage[]) => AIMessage[]) => {
    const id = currentRef.current;
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return [{ id, title: "แชทใหม่", messages: updater([GREETING]), updatedAt: Date.now() }, ...prev];
      const updatedMsgs = updater(prev[idx].messages);
      const session: ChatSession = {
        ...prev[idx],
        messages: updatedMsgs,
        title: prev[idx].title === "แชทใหม่" ? deriveTitle(updatedMsgs) : prev[idx].title,
        updatedAt: Date.now(),
      };
      return [session, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }, []);

  const push = useCallback((m: NewAIMessage) => {
    const msg = { ...m, id: uid(), ts: Date.now() } as AIMessage;
    mutateCurrent((prev) => [...prev, msg]);
    if (m.role === "ai") setUnreadCount((c) => c + 1);
  }, [mutateCurrent]);

  const updateProfile = useCallback((patch: Partial<CustomerProfile>) => {
    setProfile((prev) => ({
      ...prev, ...patch,
      goals: patch.goals && patch.goals.length > 0 ? Array.from(new Set([...patch.goals, ...prev.goals])).slice(0, 4) : prev.goals,
    }));
  }, []);

  const think = (ms = 600) => new Promise<void>((r) => setTimeout(r, ms));

  const handle = useCallback(async (text: string) => {
    const intent: Intent = detectIntent(text);
    const newGoals = extractGoals(text);
    const budget = extractBudget(text);
    const cat = extractCategory(text);
    const prof = profileRef.current;

    updateProfile({
      goals: newGoals.length > 0 ? newGoals : undefined,
      budgetMax: budget ?? prof.budgetMax,
      lastIntent: intent,
      lastQuery: text,
      lastCategory: cat,
    });
    const activeGoals = newGoals.length > 0 ? newGoals : prof.goals;
    const products = REAL_PRODUCTS;
    const { cartItems: cItems, cartTotal: cTotal } = cartRef.current;

    setTyping(true);
    await think(550);

    switch (intent) {
      case "greet":
        push({ role: "ai", kind: "text", text: "สวัสดีค่ะ! ลองบอกเป้าหมายสุขภาพ เช่น “นอนไม่หลับ” หรือ “บำรุงผิว” เมต้าจะแนะนำสินค้าที่เหมาะกับคุณนะคะ" });
        break;
      case "help":
        push({ role: "ai", kind: "text", text: "เมต้าช่วยอะไรได้บ้าง:\n• ค้นหา/แนะนำสมุนไพรตามอาการ\n• เปรียบเทียบ + วิเคราะห์ความคุ้มค่า\n• จัดเซตประหยัด + แนะนำโปรโมชั่น\n• เพิ่ม/ลบสินค้าในตะกร้า\n• ดูสถานะออเดอร์" });
        break;
      case "search":
      case "recommend": {
        const results = intent === "recommend" || activeGoals.length > 0
          ? recommendForGoals(products, activeGoals, 4)
          : searchProducts(products, text, { goals: activeGoals, budgetMax: budget ?? prof.budgetMax, category: cat, limit: 4 });
        if (results.length === 0) {
          push({ role: "ai", kind: "text", text: "ขอโทษค่ะ ยังไม่พบสินค้าที่ตรงเลย ลองใช้คำที่กว้างขึ้น หรือบอกเป้าหมาย เช่น “นอนหลับ”, “บำรุงผิว”" });
        } else {
          const head = activeGoals.length > 0
            ? `จากเป้าหมาย “${activeGoals.map(goalLabel).join(" + ")}”${budget ? ` ภายในงบ ฿${budget}` : ""} แนะนำ:`
            : `พบสินค้าที่น่าจะใช่ ${results.length} รายการ:`;
          push({ role: "ai", kind: "products", text: head, products: results, goals: activeGoals });
        }
        break;
      }
      case "compare": {
        let toCompare: P[] = [];
        for (let i = messagesRef.current.length - 1; i >= 0; i--) {
          const m = messagesRef.current[i];
          if (m.kind === "products" && m.products.length >= 2) { toCompare = m.products.slice(0, 3); break; }
        }
        if (toCompare.length < 2) toCompare = recommendForGoals(products, activeGoals, 3);
        const cmp = compareProducts(toCompare);
        push({ role: "ai", kind: "comparison", text: `เปรียบเทียบ ${toCompare.length} รายการ:`, products: toCompare, rows: cmp.rows, summary: cmp.summary });
        break;
      }
      case "bundle": {
        const bundle = buildBundle(products, activeGoals, budget ?? prof.budgetMax);
        push({ role: "ai", kind: "bundle", text: "เมต้าจัดชุดให้แล้วค่ะ — ราคารวมพิเศษ:", ...bundle });
        break;
      }
      case "promo": {
        const promos = suggestPromos(cTotal);
        if (promos.length === 0) push({ role: "ai", kind: "text", text: "เพิ่มสินค้าเข้าตะกร้าก่อนนะคะ เมต้าจะช่วยหาโปรที่ใช่ให้" });
        else push({ role: "ai", kind: "text", text: `จากยอดในตะกร้า ฿${cTotal.toLocaleString()}:\n${promos.map((p) => `• ${p.title} — ${p.body}`).join("\n")}` });
        break;
      }
      case "value": {
        let target: P | undefined;
        for (let i = messagesRef.current.length - 1; i >= 0; i--) {
          const m = messagesRef.current[i];
          if (m.kind === "products" && m.products.length > 0) { target = m.products[0]; break; }
        }
        if (!target) target = recommendForGoals(products, activeGoals, 1)[0];
        if (!target) { push({ role: "ai", kind: "text", text: "ลองค้นหาสินค้าก่อน แล้วค่อยถามความคุ้มค่าได้นะคะ" }); break; }
        const v = valueAnalysis(target);
        push({ role: "ai", kind: "value", text: `วิเคราะห์ความคุ้มค่า ${target.name}:`, product: target, verdict: v.verdict, savings: v.savings, discountPct: v.discountPct });
        break;
      }
      case "cart_add": {
        const tokens = text.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
        const match = products.find((p) => tokens.some((t) => p.name.toLowerCase().includes(t)));
        if (!match) {
          push({ role: "ai", kind: "text", text: "ยังไม่แน่ใจว่าจะหยิบตัวไหน — ลองพิมพ์ชื่อสินค้าให้ชัดขึ้น หรือกดปุ่มตะกร้าใต้การ์ดสินค้าได้เลยค่ะ" });
          break;
        }
        addToCart({ id: `c-${match.id}`, name: match.name, option: "ค่าเริ่มต้น", price: match.price, originalPrice: match.originalPrice, image: getRealProductImage(match.id) });
        push({ role: "ai", kind: "text", text: `เพิ่ม “${match.name}” ลงตะกร้าเรียบร้อย ✓\nยอดรวมโดยประมาณ ฿${(cTotal + match.price).toLocaleString()}` });
        const upsell = crossSell(products, match, 3);
        if (upsell.length > 0) { await think(400); push({ role: "ai", kind: "products", text: "ลูกค้าที่ซื้อสินค้านี้ มักซื้อพร้อมกับ:", products: upsell }); }
        break;
      }
      case "cart_remove": {
        if (cItems.length === 0) { push({ role: "ai", kind: "text", text: "ตะกร้ายังว่างอยู่ค่ะ" }); break; }
        const last = cItems[cItems.length - 1];
        removeItem(last.id);
        push({ role: "ai", kind: "text", text: `เอา “${last.name}” ออกจากตะกร้าแล้วค่ะ` });
        break;
      }
      case "cart_view": {
        const promos = suggestPromos(cTotal);
        push({
          role: "ai", kind: "cart",
          text: cItems.length === 0 ? "ตะกร้ายังว่างอยู่ค่ะ ลองหาสินค้าก่อนนะคะ" : `ในตะกร้าตอนนี้มี ${cItems.length} รายการ`,
          items: cItems.map((c) => ({ id: c.id, name: c.name, price: c.price, quantity: c.quantity })),
          total: cTotal, promos,
        });
        break;
      }
      case "checkout": {
        if (cItems.length === 0) { push({ role: "ai", kind: "text", text: "ตะกร้าว่างอยู่ค่ะ ลองค้นหาสินค้าก่อนนะคะ" }); break; }
        push({ role: "ai", kind: "actions", text: `ในตะกร้ามี ${cItems.length} รายการ รวม ฿${cTotal.toLocaleString()} — ไปต่อที่หน้าตะกร้าเพื่อชำระเงินได้เลยค่ะ`, actions: [{ label: "ไปที่ตะกร้า", intent: "nav:Cart" }] });
        break;
      }
      case "order_status":
      case "order_recent": {
        const myOrders = ordersRef.current.slice(0, 3);
        if (myOrders.length === 0) { push({ role: "ai", kind: "text", text: "ยังไม่มีออเดอร์ในระบบค่ะ" }); break; }
        push({ role: "ai", kind: "orders", text: "ออเดอร์ล่าสุดของคุณ:", orders: myOrders.map((o) => ({ id: o.id, status: o.status, total: o.total, date: o.date })) });
        break;
      }
      case "qa": {
        const tokens = text.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
        const match = products.find((p) => tokens.some((t) => p.name.toLowerCase().includes(t)));
        if (match) {
          push({ role: "ai", kind: "text", text: `เกี่ยวกับ ${match.name}:\n• หมวดหมู่: ${categoryLabel(match.category)}\n• ราคา: ฿${match.price.toLocaleString()}\n• คะแนนรีวิว: ${match.rating}/5 (${match.sold})\n• ข้อควรระวัง: ปรึกษาแพทย์หากใช้ร่วมกับยาประจำตัว` });
        } else {
          push({ role: "ai", kind: "text", text: "บอกชื่อสินค้าให้แม่นยำขึ้นได้ไหมคะ เมต้าจะดึงข้อมูลให้" });
        }
        break;
      }
      default: {
        const results = searchProducts(products, text, { goals: activeGoals, budgetMax: budget ?? prof.budgetMax, category: cat, limit: 4 });
        if (results.length > 0) push({ role: "ai", kind: "products", text: "ลองดูตัวเลือกเหล่านี้ดูนะคะ:", products: results, goals: activeGoals });
        else push({ role: "ai", kind: "text", text: "เมต้ายังไม่เข้าใจคำขอ — ลองเลือกจากคำถามแนะนำด้านล่างก็ได้ค่ะ" });
      }
    }
    setTyping(false);
  }, [push, updateProfile, addToCart, removeItem]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    push({ role: "user", kind: "text", text: trimmed });
    await handle(trimmed);
  }, [handle, push]);

  const newChat = useCallback(() => {
    setSessions((prev) => {
      const cur = prev.find((s) => s.id === currentRef.current);
      const isCurrentEmpty = cur && !cur.messages.some((m) => m.role === "user");
      if (isCurrentEmpty) { setProfile({ goals: [] }); return prev; }
      const fresh = createSession();
      setCurrentSessionId(fresh.id);
      setProfile({ goals: [] });
      return [fresh, ...prev];
    });
  }, []);

  const loadSession = useCallback((id: string) => setCurrentSessionId(id), []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (id === currentRef.current) {
        if (next.length > 0) setCurrentSessionId(next[0].id);
        else { const fresh = createSession(); setCurrentSessionId(fresh.id); return [fresh]; }
      }
      return next;
    });
  }, []);

  const markRead = useCallback(() => setUnreadCount(0), []);

  const quickReplyChips = useMemo(() => quickReplies(profile.lastIntent ?? "greet", profile), [profile]);

  const value = useMemo<AIAssistantContextType>(() => ({
    messages, profile, typing, send, quickReplyChips, unreadCount, markRead,
    sessions, currentSessionId, newChat, loadSession, deleteSession,
  }), [messages, profile, typing, send, quickReplyChips, unreadCount, markRead, sessions, currentSessionId, newChat, loadSession, deleteSession]);

  return <AIAssistantContext.Provider value={value}>{children}</AIAssistantContext.Provider>;
}

export function useAIAssistant() {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) throw new Error("useAIAssistant must be used within AIAssistantProvider");
  return ctx;
}
