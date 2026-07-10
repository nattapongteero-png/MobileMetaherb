import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { CafeCartLine } from "../data/cafeCart";
import type { CafePayMethodId, CafeFavorite } from "../data/cafePayment";
import { startOrderLiveActivity, endOrderLiveActivity, reconcileOrderLiveActivities } from "../services/cafeLiveActivity";
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
  type PlaceCafeOrderInput,
} from "../store/cafe";
import { currentUserId } from "../store/session";

/**
 * META Caffe cart — shared across the café landing, item-detail and cart screens.
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
    // Idempotent per orderId, enforced by the store.
    placeCafeOrder(order);
    setLines([]);
    const first = order.items[0];
    const itemsLabel = first ? (order.items.length > 1 ? `${first.name} +${order.items.length - 1}` : first.name) : "ออเดอร์กาแฟ";
    // iOS Live Activity (Dynamic Island) countdown — no-op elsewhere.
    startOrderLiveActivity({
      orderId: order.orderId,
      queueNo: order.queueNo,
      queueAhead: order.queueAhead,
      itemsLabel,
      startedAt: order.readyAt - order.waitMinutes * 60000,
      readyAt: order.readyAt,
    });
    // Local "ready" push at readyAt (fires even if the app is closed).
    void scheduleCafeReadyNotification({ orderId: order.orderId, readyAt: order.readyAt, queueNo: order.queueNo, itemsLabel });
  };

  const completeOrder: Ctx["completeOrder"] = (orderId) => {
    if (!completeCafeOrder(orderId)) return;
    endOrderLiveActivity(orderId);
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
