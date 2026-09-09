import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { CafeCartLine } from "../data/cafeCart";
import type { CafePayMethodId, CafeFavorite } from "../data/cafePayment";
import { startOrderLiveActivity, endOrderLiveActivity, reconcileOrderLiveActivities } from "../services/cafeLiveActivity";
import { startOrderLiveNotification, endOrderLiveNotification } from "../services/cafeLiveNotification";
import { scheduleCafeReadyNotification, cancelCafeReadyNotification } from "../services/cafeNotify";
import { useStore } from "../store/db";
import {
  activeCafeOrders,
  cafeHistory,
  cafeStore,
  completeCafeOrder,
  placeCafeOrder,
  rateCafeOrder,
  type CafeOrder,
  cafeOrderById,
  type PlaceCafeOrderInput,
} from "../store/cafe";
import { currentUserId, sessionStore } from "../store/session";
import { earnPointsForUser, memberForUser, redeemPoints } from "../store/cafeMembers";

/**
 * METAHERB Café cart — shared across the café landing, item-detail and cart screens.
 * Lines are keyed by item + chosen options (identical lines merge). Item-level
 * helpers (qtyOfItem / decItem) power the quick +/- on the menu cards.
 *
 * The CART stays local to the session. ORDERS live in the shared café table
 * (src/store/cafe.ts), which the barista queue on the shop side also reads —
 * before this, a placed café order never left the customer's device.
 */
type Ctx = {
  lines: CafeCartLine[];
  add: (line: CafeCartLine) => void;
  incKey: (key: string) => void;
  decKey: (key: string) => void;
  removeKey: (key: string) => void;
  decItem: (itemId: string) => void;
  clear: () => void;
  totalQty: number;
  totalPrice: number;
  qtyOfItem: (itemId: string) => number;
  /** Café checkout payment method (PromptPay or cash only). */
  payMethod: CafePayMethodId;
  setPayMethod: (id: CafePayMethodId) => void;
  /** Orders being prepared or waiting at the counter. */
  activeOrders: CafeOrder[];
  /** Past (picked-up) orders, newest first — with service/taste ratings. */
  orderHistory: CafeOrder[];
  /** Place an order: append it to the shared queue and empty the cart. */
  placeOrder: (order: PlaceCafeOrderInput) => void;
  /** Mark an active order picked up: move it into history. */
  completeOrder: (orderId: string) => void;
  /** Save the review (service + taste ratings 1–5 and a comment). */
  rateOrder: (orderId: string, service: number, taste: number, comment: string) => void;
  /** Favourite menu items (with saved options), newest first. */
  favorites: CafeFavorite[];
  toggleFavorite: (fav: CafeFavorite) => void;
  isFavorite: (itemId: string) => boolean;
  /** Counter that bumps to fire the falling-stars celebration overlay. */
  celebrate: number;
  fireCelebration: () => void;
};

const CafeCartCtx = createContext<Ctx | null>(null);

export function CafeCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CafeCartLine[]>([]);
  const [payMethod, setPayMethod] = useState<CafePayMethodId>("promptpay");
  const [favorites, setFavorites] = useState<CafeFavorite[]>([]);
  const [celebrate, setCelebrate] = useState(0);
  const fireCelebration = () => setCelebrate((c) => c + 1);

  useStore(cafeStore); // re-render when the barista moves an order
  const userId = currentUserId();
  const activeOrders = activeCafeOrders(userId);
  const orderHistory = cafeHistory(userId);

  // Reliable no-push "ready" flip for the reopened-app case: whenever the app
  // returns to the foreground, ask native to flip any order whose readyAt has
  // passed. No-op when nothing is due (guarded natively). Also runs once on mount.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") reconcileOrderLiveActivities();
    });
    reconcileOrderLiveActivities();
    return () => sub.remove();
  }, []);

  // The bar getting ahead moves an order's readyAt earlier (reflowCafeQueue), and
  // the "ready" push was scheduled for the old time — it would have fired minutes
  // after the drink was already on the counter. Re-arm it whenever the promised
  // time actually moves; the Live Activity countdown is restarted from the same
  // figures so the two never disagree.
  const armedAt = useRef(new Map<string, number>());
  useEffect(() => {
    for (const o of activeOrders) {
      if (o.status !== "preparing") continue;
      const known = armedAt.current.get(o.orderId);
      if (known === o.readyAt) continue;
      armedAt.current.set(o.orderId, o.readyAt);
      if (known == null) continue; // placeOrder already armed this one
      const first = o.items[0];
      const itemsLabel = first ? (o.items.length > 1 ? `${first.name} +${o.items.length - 1}` : first.name) : "ออเดอร์กาแฟ";
      const live = { orderId: o.orderId, queueNo: o.queueNo, queueAhead: o.queueAhead, itemsLabel, startedAt: o.readyAt - o.waitMinutes * 60000, readyAt: o.readyAt };
      startOrderLiveActivity(live);
      startOrderLiveNotification(live);
      void cancelCafeReadyNotification(o.orderId).then(() =>
        scheduleCafeReadyNotification({ orderId: o.orderId, readyAt: o.readyAt, queueNo: o.queueNo, itemsLabel }),
      );
    }
    // Forget orders that have left the queue, so a re-placed id arms cleanly.
    for (const id of [...armedAt.current.keys()]) {
      if (!activeOrders.some((o) => o.orderId === id)) armedAt.current.delete(id);
    }
  }, [activeOrders]);

  const add: Ctx["add"] = (line) =>
    setLines((prev) => {
      const i = prev.findIndex((l) => l.key === line.key);
      if (i >= 0) { const next = [...prev]; next[i] = { ...next[i], qty: next[i].qty + line.qty }; return next; }
      return [...prev, line];
    });
  const incKey: Ctx["incKey"] = (key) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)));
  const decKey: Ctx["decKey"] = (key) =>
    setLines((prev) => prev.flatMap((l) => (l.key === key ? (l.qty <= 1 ? [] : [{ ...l, qty: l.qty - 1 }]) : [l])));
  const removeKey: Ctx["removeKey"] = (key) => setLines((prev) => prev.filter((l) => l.key !== key));
  const decItem: Ctx["decItem"] = (itemId) =>
    setLines((prev) => {
      let i = -1;
      for (let k = prev.length - 1; k >= 0; k--) { if (prev[k].itemId === itemId) { i = k; break; } }
      if (i < 0) return prev;
      const next = [...prev];
      if (next[i].qty <= 1) next.splice(i, 1);
      else next[i] = { ...next[i], qty: next[i].qty - 1 };
      return next;
    });
  const clear = () => setLines([]);

  const placeOrder: Ctx["placeOrder"] = (order) => {
    // Idempotent per orderId, enforced by the store — but earning is not, so
    // ask first whether this order is new before awarding anything for it.
    const alreadyPlaced = cafeOrderById(order.orderId) != null;
    placeCafeOrder(order);
    // An order placed in the app is a visit like any other. Only the POS used
    // to earn, so a customer could order through the app week after week and
    // stay on zero — while their own card screen told them "ซื้อ 1 ครั้ง ได้ 1
    // แต้ม". The card is found from the signed-in account — by its link first,
    // then by its phone — the same lookup the card screen uses. Someone who has
    // not joined simply earns nothing; the checkout offers them the card.
    if (!alreadyPlaced) {
      const user = sessionStore.get().user;
      // Redeem before earning, the order settle() uses at the till: otherwise
      // the point this visit just earned could pay for this visit's free cup.
      // Spending the card is what this visit was worth; it does not also earn.
      if (order.redeemDiscount) {
        const m = memberForUser(user);
        if (m) redeemPoints(m.id, order.orderId);
      } else {
        earnPointsForUser(user, order.orderId);
      }
    }
    setLines([]);
    const first = order.items[0];
    const itemsLabel = first ? (order.items.length > 1 ? `${first.name} +${order.items.length - 1}` : first.name) : "ออเดอร์กาแฟ";
    const live = {
      orderId: order.orderId,
      queueNo: order.queueNo,
      queueAhead: order.queueAhead,
      itemsLabel,
      startedAt: order.readyAt - order.waitMinutes * 60000,
      readyAt: order.readyAt,
    };
    // iOS Live Activity (Dynamic Island) countdown — no-op elsewhere.
    startOrderLiveActivity(live);
    // Android stand-in: sticky "preparing" card pinned until the ready push
    // (same identifier) replaces it. No-op elsewhere.
    startOrderLiveNotification(live);
    // Local "ready" push at readyAt (fires even if the app is closed).
    armedAt.current.set(order.orderId, order.readyAt);
    void scheduleCafeReadyNotification({ orderId: order.orderId, readyAt: order.readyAt, queueNo: order.queueNo, itemsLabel });
  };

  const completeOrder: Ctx["completeOrder"] = (orderId) => {
    if (!completeCafeOrder(orderId)) return;
    endOrderLiveActivity(orderId);
    endOrderLiveNotification(orderId);
    // Picked up — cancel the pending "ready" push if it hasn't fired yet.
    void cancelCafeReadyNotification(orderId);
  };

  const rateOrder: Ctx["rateOrder"] = (orderId, service, taste, comment) =>
    void rateCafeOrder(orderId, service, taste, comment);

  const toggleFavorite: Ctx["toggleFavorite"] = (fav) =>
    setFavorites((prev) => (prev.some((f) => f.itemId === fav.itemId) ? prev.filter((f) => f.itemId !== fav.itemId) : [fav, ...prev]));
  const isFavorite: Ctx["isFavorite"] = (itemId) => favorites.some((f) => f.itemId === itemId);

  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const totalPrice = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const qtyOfItem = (itemId: string) => lines.reduce((s, l) => (l.itemId === itemId ? s + l.qty : s), 0);

  const value = useMemo<Ctx>(
    () => ({ lines, add, incKey, decKey, removeKey, decItem, clear, totalQty, totalPrice, qtyOfItem, payMethod, setPayMethod, activeOrders, orderHistory, placeOrder, completeOrder, rateOrder, favorites, toggleFavorite, isFavorite, celebrate, fireCelebration }),
    [lines, totalQty, totalPrice, payMethod, activeOrders, orderHistory, favorites, celebrate],
  );
  return <CafeCartCtx.Provider value={value}>{children}</CafeCartCtx.Provider>;
}

export function useCafeCart(): Ctx {
  const ctx = useContext(CafeCartCtx);
  if (!ctx) throw new Error("useCafeCart must be used within CafeCartProvider");
  return ctx;
}
