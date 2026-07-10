import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  detectIntent, extractGoals, extractBudget, extractCategory, goalLabel, categoryLabel,
  searchProducts, recommendForGoals, compareProducts, valueAnalysis, buildBundle, filterProducts,
  suggestPromos, crossSell, quickReplies,
  type Intent, type CustomerProfile, type HealthGoal, type ComparisonRow, type PromoSuggestion,
} from "../data/aiEngine";
import { REAL_PRODUCTS, getRealProductImage } from "../data/realProducts";
import type { CatalogProduct } from "../data/catalog";
import { metaChat, metaPlan, metaVision, metaRecommend, maleify, type AIPlan } from "../services/metaAI";
import { research, type ResearchSource } from "../services/herbResearch";
import { useCart } from "./CartContext";
import { useOrders } from "./OrderContext";
import { STATUS_LABEL } from "../data/orders";

type P = CatalogProduct;

/** Rich message payloads — the UI renders cards based on `kind`. */
export type AIMessage =
  | { id: string; role: "user"; ts: number; kind: "text"; text: string }
  | { id: string; role: "user"; ts: number; kind: "image"; text: string; image: string }
  | { id: string; role: "ai";   ts: number; kind: "text"; text: string; sources?: ResearchSource[] }
  | { id: string; role: "ai";   ts: number; kind: "products"; text: string; products: P[]; goals?: HealthGoal[] }
  | { id: string; role: "ai";   ts: number; kind: "comparison"; text: string; products: P[]; rows: ComparisonRow[]; summary: string }
  | { id: string; role: "ai";   ts: number; kind: "bundle"; text: string; items: P[]; total: number; discount: number; finalPrice: number; name: string }
  | { id: string; role: "ai";   ts: number; kind: "value"; text: string; product: P; verdict: string; savings?: string; discountPct: number }
  | { id: string; role: "ai";   ts: number; kind: "cart"; text: string; items: { id: string; name: string; price: number; quantity: number; image: number | { uri: string } }[]; total: number; promos: PromoSuggestion[] }
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
  /** Send a photo (data-URI) for เมต้า to analyze; optional caption. */
  sendImage: (imageDataUrl: string, caption?: string) => Promise<void>;
  setPageContext: (c?: string) => void;
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
  text: "สวัสดีครับ เมต้าเป็นผู้ช่วยช้อปสมุนไพรของคุณ 🌿 มีอะไรให้เมต้าช่วยไหมครับ — ลองถามได้เลยว่า “หาสินค้าอะไรอยู่” หรือ “แนะนำสินค้าหน่อย”",
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
      { id: `${id}_a`, role: "ai", ts: now - agoMin * 60_000 - 4000, kind: "text", text: "เมต้ามีตัวเลือกหลายอย่างเลยครับ ลองเปิดดูในแชทเดิมได้เลยนะครับ 🌿" },
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

  const { items: cartItems, addToCart, removeItem, removeMany } = useCart();
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
  // Current-screen context (e.g. the product being viewed) so เมต้า understands "ตัวนี้".
  const pageCtxRef = useRef<string | undefined>(undefined);
  const setPageContext = useCallback((c?: string) => { pageCtxRef.current = c; }, []);

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
    // Guarantee เมต้า (male) never says ค่ะ/คะ — force ครับ on every AI text.
    const fixed =
      m.role === "ai" && typeof (m as { text?: string }).text === "string"
        ? ({ ...m, text: maleify((m as { text: string }).text) } as NewAIMessage)
        : m;
    const msg = { ...fixed, id: uid(), ts: Date.now() } as AIMessage;
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

    // Real-AI free-form answer via Gemma (grounded with the catalog); returns
    // false on any failure so the caller falls back to the rule-based reply.
    const llm = async (): Promise<boolean> => {
      try {
        const hist = messagesRef.current
          .map((m) => ({ role: m.role as "user" | "ai", text: (m as { text?: string }).text ?? "" }))
          .filter((m) => m.text.trim());
        if (hist[hist.length - 1]?.text !== text) hist.push({ role: "user", text });
        const ans = await metaChat(hist);
        if (ans) { push({ role: "ai", kind: "text", text: ans }); return true; }
      } catch { /* fall back to rule-based */ }
      return false;
    };

    // ===== AI agent: Gemma plans the action, we execute it on the real data =====
    const histFor = () => {
      const h = messagesRef.current
        .map((m) => ({ role: m.role as "user" | "ai", text: (m as { text?: string }).text ?? "" }))
        .filter((m) => m.text.trim());
      // Augment only the current question with the page context so "ตัวนี้/อันนี้" resolves.
      const q = pageCtxRef.current ? `[ผู้ใช้กำลังดู: ${pageCtxRef.current}] ${text}` : text;
      if (h.length && h[h.length - 1].role === "user" && h[h.length - 1].text === text) h[h.length - 1] = { role: "user", text: q };
      else h.push({ role: "user", text: q });
      return h;
    };

    const executePlan = async (plan: AIPlan, hist: { role: "user" | "ai"; text: string }[]): Promise<boolean> => {
      const intro = plan.reply?.trim();
      const planGoals: HealthGoal[] = plan.goal ? ([plan.goal] as HealthGoal[]) : activeGoals;
      switch (plan.action) {
        case "search": {
          const applyHardFilters = (p: P) =>
            (plan.maxPrice == null || p.price <= plan.maxPrice) &&
            (plan.minPrice == null || p.price >= plan.minPrice) &&
            (plan.minRating == null || p.rating >= plan.minRating) &&
            (!plan.promoOnly || p.isFlashSale || p.hasCoupon || (p.discountPercent ?? 0) > 0);

          let results: P[] = [];
          let sources: ResearchSource[] = [];
          let groundedReply = "";

          // Agentic web-first recommend — for need/symptom queries (not plain
          // sort/price browsing): fetch herb evidence (KB → live web), then let
          // Gemma pick the products that TRULY fit from a candidate shortlist,
          // instead of guessing off product names. Falls back silently to the
          // name-based matcher on any failure so recommendations never break.
          const isNeedQuery = !plan.sort && (Boolean(plan.query?.trim()) || Boolean(plan.goal));
          if (isNeedQuery) {
            try {
              const byId = new Map(products.map((p) => [p.id, p]));
              // Candidate pool: Gemma's picks ∪ the keyword/goal matcher — deduped,
              // hard-filtered, capped. Gives the ranker real options to choose from.
              const pool: P[] = [];
              const seen = new Set<string>();
              const addCand = (p?: P) => { if (p && !seen.has(p.id) && applyHardFilters(p)) { seen.add(p.id); pool.push(p); } };
              (plan.productIds ?? []).forEach((id) => addCand(byId.get(String(id))));
              filterProducts(products, { query: plan.query, goals: planGoals, category: plan.category, maxPrice: plan.maxPrice, minPrice: plan.minPrice, minRating: plan.minRating, promoOnly: plan.promoOnly, limit: 10 }).forEach(addCand);
              const candidates = pool.slice(0, 10);

              if (candidates.length > 0) {
                const r = await research(plan.query?.trim() || text, true);
                sources = r.sources;
                const ranked = await metaRecommend(
                  plan.query?.trim() || text,
                  candidates.map((p) => ({ id: p.id, name: p.name })),
                  r.grounding,
                );
                groundedReply = ranked.reply;
                results = ranked.productIds.map((id) => byId.get(String(id))).filter(Boolean) as P[];
              }
            } catch { /* fall through to the name-based matcher below */ }
          }

          // Fallback / non-need queries — original fast path.
          if (results.length === 0 && !plan.productIds?.length) {
            results = filterProducts(products, {
              query: plan.query, goals: planGoals, category: plan.category,
              maxPrice: plan.maxPrice, minPrice: plan.minPrice, minRating: plan.minRating,
              promoOnly: plan.promoOnly, sort: plan.sort, limit: 6,
            });
          } else if (results.length === 0 && plan.productIds?.length && !plan.sort) {
            const byId = new Map(products.map((p) => [p.id, p]));
            results = (plan.productIds.map((id) => byId.get(String(id))).filter(Boolean) as P[]).filter(applyHardFilters).slice(0, 6);
          }

          const head = groundedReply || intro;
          if (results.length === 0) {
            push({ role: "ai", kind: "text", text: head ? `${head}\n— แต่ยังไม่พบสินค้าที่ตรงเงื่อนไข ลองปรับราคา/คำค้นดูนะครับ` : "ยังไม่พบสินค้าที่ตรงเงื่อนไขครับ ลองปรับราคา/คำค้นดูนะครับ", ...(sources.length && groundedReply ? { sources } : null) });
          } else if (groundedReply) {
            // Grounded path: reason (+ sources) as its own bubble, then the cards.
            push({ role: "ai", kind: "text", text: groundedReply, ...(sources.length ? { sources } : null) });
            push({ role: "ai", kind: "products", text: "สินค้าที่แนะนำครับ 👇", products: results, goals: planGoals });
          } else {
            push({ role: "ai", kind: "products", text: intro || "นี่คือสินค้าที่ตรงกับที่หาครับ:", products: results, goals: planGoals });
          }
          return true;
        }
        case "compare": {
          let toCompare: P[] = [];
          for (let i = messagesRef.current.length - 1; i >= 0; i--) {
            const m = messagesRef.current[i];
            if (m.kind === "products" && m.products.length >= 2) { toCompare = m.products.slice(0, 3); break; }
          }
          if (toCompare.length < 2) toCompare = filterProducts(products, { query: plan.query, goals: planGoals, limit: 3 });
          if (toCompare.length < 2) return false;
          const cmp = compareProducts(toCompare);
          push({ role: "ai", kind: "comparison", text: intro || `เปรียบเทียบ ${toCompare.length} รายการครับ:`, products: toCompare, rows: cmp.rows, summary: cmp.summary });
          return true;
        }
        case "add_cart": {
          const names = (plan.productNames?.length ? plan.productNames : [plan.productName || plan.query || ""])
            .map((n) => n.toLowerCase().trim()).filter(Boolean);
          const qty = Math.max(1, Math.min(99, plan.quantity ?? 1));
          const addedNames: string[] = [];
          const seen = new Set<string>();
          for (const key of names) {
            const toks = key.split(/\s+/).filter((t) => t.length > 1);
            const match = products.find((p) => p.name.toLowerCase().includes(key)) || products.find((p) => toks.some((t) => p.name.toLowerCase().includes(t)));
            if (match && !seen.has(match.id)) {
              seen.add(match.id);
              addToCart({ id: `c-${match.id}`, productId: match.id, name: match.name, option: "ค่าเริ่มต้น", price: match.price, originalPrice: match.originalPrice, image: getRealProductImage(match.id), quantity: qty });
              addedNames.push(match.name);
            }
          }
          if (addedNames.length === 0) { push({ role: "ai", kind: "text", text: intro || "บอกชื่อสินค้าที่จะหยิบให้ชัดอีกนิดได้ไหมครับ" }); return true; }
          const qtyTxt = qty > 1 ? `${qty}× ` : "";
          push({ role: "ai", kind: "text", text: intro || `เพิ่ม ${qtyTxt}${addedNames.map((n) => `“${n}”`).join(", ")} ลงตะกร้าให้แล้วครับ ✓ — แตะดูตะกร้าได้เลยครับ` });
          return true;
        }
        case "remove_cart": {
          const items = cartRef.current.cartItems;
          if (items.length === 0) { push({ role: "ai", kind: "text", text: "ตะกร้ายังว่างอยู่ครับ" }); return true; }
          const key = (plan.productName || "").toLowerCase().trim();
          const target = (key && items.find((it) => it.name.toLowerCase().includes(key))) || items[items.length - 1];
          removeItem(target.id);
          push({ role: "ai", kind: "text", text: intro || `เอา “${target.name}” ออกจากตะกร้าแล้วครับ` });
          return true;
        }
        case "view_cart": {
          const { cartItems: ci, cartTotal: ct } = cartRef.current;
          push({ role: "ai", kind: "cart", text: intro || (ci.length === 0 ? "ตะกร้ายังว่างอยู่ครับ" : `ในตะกร้ามี ${ci.length} รายการครับ`), items: ci.map((c) => ({ id: c.id, name: c.name, price: c.price, quantity: c.quantity, image: c.image })), total: ct, promos: suggestPromos(ct) });
          return true;
        }
        case "clear_cart": {
          const items = cartRef.current.cartItems;
          if (items.length === 0) { push({ role: "ai", kind: "text", text: "ตะกร้าว่างอยู่แล้วครับ" }); return true; }
          removeMany(items.map((i) => i.id));
          push({ role: "ai", kind: "text", text: intro || "ล้างตะกร้าให้เรียบร้อยแล้วครับ 🧹" });
          return true;
        }
        case "checkout": {
          const items = cartRef.current.cartItems;
          if (items.length === 0) { push({ role: "ai", kind: "text", text: "ตะกร้ายังว่างอยู่ครับ ลองหาสินค้าก่อนนะครับ" }); return true; }
          push({ role: "ai", kind: "actions", text: intro || `ในตะกร้ามี ${items.length} รายการ รวม ฿${cartRef.current.cartTotal.toLocaleString()} — กดไปชำระเงินได้เลยครับ`, actions: [{ label: "ไปที่ตะกร้า", intent: "nav:Cart" }] });
          return true;
        }
        case "promo": {
          const promos = suggestPromos(cartRef.current.cartTotal);
          push({ role: "ai", kind: "text", text: promos.length ? `${intro || "โปรที่ใช้ได้ตอนนี้ครับ:"}\n${promos.map((p) => `• ${p.title} — ${p.body}`).join("\n")}` : (intro || "ลองเพิ่มสินค้าในตะกร้าก่อน เดี๋ยวผมหาโปรให้ครับ") });
          return true;
        }
        case "bundle": {
          const bundle = buildBundle(products, planGoals, plan.maxPrice);
          push({ role: "ai", kind: "bundle", text: intro || "จัดเซตให้แล้วครับ — ราคารวมพิเศษ:", ...bundle });
          return true;
        }
        case "orders": {
          const myOrders = ordersRef.current.slice(0, 3);
          if (myOrders.length === 0) { push({ role: "ai", kind: "text", text: "ยังไม่มีออเดอร์ในระบบครับ" }); return true; }
          push({ role: "ai", kind: "orders", text: intro || "ออเดอร์ล่าสุดของคุณครับ:", orders: myOrders.map((o) => ({ id: o.id, status: o.status, total: o.total, date: o.date })) });
          return true;
        }
        default: {
          // Ground herb/health answers: curated KB first (instant), live web
          // lookup only when the planner marked the turn as knowledge-seeking
          // (query/goal present) — chit-chat stays latency-free. Never blocks
          // the answer: research failure just means an ungrounded reply.
          let grounding = "";
          let sources: ResearchSource[] = [];
          try {
            const r = await research(plan.query?.trim() || text, Boolean(plan.query?.trim() || plan.goal));
            grounding = r.grounding;
            sources = r.sources;
          } catch { /* answer without grounding */ }
          let answered = false;
          try {
            const ans = await metaChat(hist, undefined, grounding);
            push({ role: "ai", kind: "text", text: ans, ...(sources.length && grounding ? { sources } : null) });
            answered = true;
          }
          catch { if (intro) { push({ role: "ai", kind: "text", text: intro }); answered = true; } }
          if (!answered) return false;
          // Close the knowledge → shopping loop: attach related in-store products
          // (prefer the exact ids Gemma chose, else fall back to keyword/goal filter).
          let rel: P[] = [];
          if (plan.productIds?.length) {
            const byId = new Map(products.map((p) => [p.id, p]));
            rel = (plan.productIds.map((id) => byId.get(String(id))).filter(Boolean) as P[]).slice(0, 3);
          }
          if (rel.length === 0 && (plan.query?.trim() || plan.goal)) {
            rel = filterProducts(products, { query: plan.query, goals: plan.goal ? ([plan.goal] as HealthGoal[]) : [], limit: 3 });
          }
          if (rel.length > 0) { await think(250); push({ role: "ai", kind: "products", text: "สินค้าที่เกี่ยวข้องในร้านครับ 👇", products: rel }); }
          return true;
        }
      }
    };

    setTyping(true);
    try {
      const hist = histFor();
      const plan = await metaPlan(hist);
      if (await executePlan(plan, hist)) { setTyping(false); return; }
    } catch { /* Gemma unreachable / bad plan → rule-based fallback below */ }
    await think(300);

    switch (intent) {
      case "greet":
        push({ role: "ai", kind: "text", text: "สวัสดีครับ! ลองบอกเป้าหมายสุขภาพ เช่น “นอนไม่หลับ” หรือ “บำรุงผิว” เมต้าจะแนะนำสินค้าที่เหมาะกับคุณนะครับ" });
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
          push({ role: "ai", kind: "text", text: "ขอโทษครับ ยังไม่พบสินค้าที่ตรงเลย ลองใช้คำที่กว้างขึ้น หรือบอกเป้าหมาย เช่น “นอนหลับ”, “บำรุงผิว”" });
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
        push({ role: "ai", kind: "bundle", text: "เมต้าจัดชุดให้แล้วครับ — ราคารวมพิเศษ:", ...bundle });
        break;
      }
      case "promo": {
        const promos = suggestPromos(cTotal);
        if (promos.length === 0) push({ role: "ai", kind: "text", text: "เพิ่มสินค้าเข้าตะกร้าก่อนนะครับ เมต้าจะช่วยหาโปรที่ใช่ให้" });
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
        if (!target) { push({ role: "ai", kind: "text", text: "ลองค้นหาสินค้าก่อน แล้วค่อยถามความคุ้มค่าได้นะครับ" }); break; }
        const v = valueAnalysis(target);
        push({ role: "ai", kind: "value", text: `วิเคราะห์ความคุ้มค่า ${target.name}:`, product: target, verdict: v.verdict, savings: v.savings, discountPct: v.discountPct });
        break;
      }
      case "cart_add": {
        const tokens = text.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
        const match = products.find((p) => tokens.some((t) => p.name.toLowerCase().includes(t)));
        if (!match) {
          push({ role: "ai", kind: "text", text: "ยังไม่แน่ใจว่าจะหยิบตัวไหน — ลองพิมพ์ชื่อสินค้าให้ชัดขึ้น หรือกดปุ่มตะกร้าใต้การ์ดสินค้าได้เลยครับ" });
          break;
        }
        addToCart({ id: `c-${match.id}`, productId: match.id, name: match.name, option: "ค่าเริ่มต้น", price: match.price, originalPrice: match.originalPrice, image: getRealProductImage(match.id) });
        push({ role: "ai", kind: "text", text: `เพิ่ม “${match.name}” ลงตะกร้าเรียบร้อย ✓\nยอดรวมโดยประมาณ ฿${(cTotal + match.price).toLocaleString()}` });
        const upsell = crossSell(products, match, 3);
        if (upsell.length > 0) { await think(400); push({ role: "ai", kind: "products", text: "ลูกค้าที่ซื้อสินค้านี้ มักซื้อพร้อมกับ:", products: upsell }); }
        break;
      }
      case "cart_remove": {
        if (cItems.length === 0) { push({ role: "ai", kind: "text", text: "ตะกร้ายังว่างอยู่ครับ" }); break; }
        const last = cItems[cItems.length - 1];
        removeItem(last.id);
        push({ role: "ai", kind: "text", text: `เอา “${last.name}” ออกจากตะกร้าแล้วครับ` });
        break;
      }
      case "cart_view": {
        const promos = suggestPromos(cTotal);
        push({
          role: "ai", kind: "cart",
          text: cItems.length === 0 ? "ตะกร้ายังว่างอยู่ครับ ลองหาสินค้าก่อนนะครับ" : `ในตะกร้าตอนนี้มี ${cItems.length} รายการ`,
          items: cItems.map((c) => ({ id: c.id, name: c.name, price: c.price, quantity: c.quantity, image: c.image })),
          total: cTotal, promos,
        });
        break;
      }
      case "checkout": {
        if (cItems.length === 0) { push({ role: "ai", kind: "text", text: "ตะกร้าว่างอยู่ครับ ลองค้นหาสินค้าก่อนนะครับ" }); break; }
        push({ role: "ai", kind: "actions", text: `ในตะกร้ามี ${cItems.length} รายการ รวม ฿${cTotal.toLocaleString()} — ไปต่อที่หน้าตะกร้าเพื่อชำระเงินได้เลยครับ`, actions: [{ label: "ไปที่ตะกร้า", intent: "nav:Cart" }] });
        break;
      }
      case "order_status":
      case "order_recent": {
        const myOrders = ordersRef.current.slice(0, 3);
        if (myOrders.length === 0) { push({ role: "ai", kind: "text", text: "ยังไม่มีออเดอร์ในระบบครับ" }); break; }
        push({ role: "ai", kind: "orders", text: "ออเดอร์ล่าสุดของคุณ:", orders: myOrders.map((o) => ({ id: o.id, status: o.status, total: o.total, date: o.date })) });
        break;
      }
      case "qa": {
        if (await llm()) break;
        const tokens = text.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
        const match = products.find((p) => tokens.some((t) => p.name.toLowerCase().includes(t)));
        if (match) {
          push({ role: "ai", kind: "text", text: `เกี่ยวกับ ${match.name}:\n• หมวดหมู่: ${categoryLabel(match.category)}\n• ราคา: ฿${match.price.toLocaleString()}\n• คะแนนรีวิว: ${match.rating}/5 (${match.sold})\n• ข้อควรระวัง: ปรึกษาแพทย์หากใช้ร่วมกับยาประจำตัว` });
        } else {
          push({ role: "ai", kind: "text", text: "บอกชื่อสินค้าให้แม่นยำขึ้นได้ไหมครับ เมต้าจะดึงข้อมูลให้" });
        }
        break;
      }
      default: {
        const results = searchProducts(products, text, { goals: activeGoals, budgetMax: budget ?? prof.budgetMax, category: cat, limit: 4 });
        if (results.length > 0) { push({ role: "ai", kind: "products", text: "ลองดูตัวเลือกเหล่านี้ดูนะครับ:", products: results, goals: activeGoals }); break; }
        if (await llm()) break;
        push({ role: "ai", kind: "text", text: "เมต้ายังไม่เข้าใจคำขอ — ลองเลือกจากคำถามแนะนำด้านล่างก็ได้ครับ" });
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

  const sendImage = useCallback(async (imageDataUrl: string, caption?: string) => {
    if (!imageDataUrl) return;
    const cap = (caption ?? "").trim();
    push({ role: "user", kind: "image", text: cap, image: imageDataUrl });
    setTyping(true);
    try {
      // Ground the vision answer when the caption looks herb/health-shaped
      // (same research layer as text chat) so any claim is source-backed.
      let grounding = "";
      let sources: ResearchSource[] = [];
      if (cap) {
        try {
          const r = await research(cap, true);
          grounding = r.grounding;
          sources = r.sources;
        } catch { /* answer without grounding */ }
      }
      const ans = await metaVision(imageDataUrl, cap, undefined, grounding);
      push({ role: "ai", kind: "text", text: ans, ...(sources.length && grounding ? { sources } : null) });
      // Close the loop: attach related in-store products from caption/answer goals.
      const goals = extractGoals(`${cap} ${ans}`);
      if (goals.length > 0) {
        const rel = recommendForGoals(REAL_PRODUCTS, goals, 3);
        if (rel.length > 0) { await think(250); push({ role: "ai", kind: "products", text: "สินค้าที่เกี่ยวข้องในร้านครับ 👇", products: rel }); }
      }
    } catch {
      push({ role: "ai", kind: "text", text: "ขอโทษครับ ตอนนี้ดูรูปให้ไม่ได้ ลองใหม่อีกครั้งหรือพิมพ์อธิบายอาการมาได้เลยครับ" });
    } finally {
      setTyping(false);
    }
  }, [push]);

  const newChat = useCallback(() => {
    pageCtxRef.current = undefined;
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
    messages, profile, typing, send, sendImage, setPageContext, quickReplyChips, unreadCount, markRead,
    sessions, currentSessionId, newChat, loadSession, deleteSession,
  }), [messages, profile, typing, send, sendImage, setPageContext, quickReplyChips, unreadCount, markRead, sessions, currentSessionId, newChat, loadSession, deleteSession]);

  return <AIAssistantContext.Provider value={value}>{children}</AIAssistantContext.Provider>;
}

export function useAIAssistant() {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) throw new Error("useAIAssistant must be used within AIAssistantProvider");
  return ctx;
}
