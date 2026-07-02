import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { CafeCartLine } from "../data/cafeCart";
import { INITIAL_CAFE_HISTORY, type CafePayMethodId, type CafeOrder, type CafeHistoryOrder, type CafeFavorite } from "../data/cafePayment";
import { startOrderLiveActivity, endOrderLiveActivity, reconcileOrderLiveActivities } from "../services/cafeLiveActivity";

/**
 * META Caffe cart — shared across the café landing, item-detail and cart screens.
 * Lines are keyed by item + chosen options (identical lines merge). Item-level
 * helpers (qtyOfItem / decItem) power the quick +/- on the menu cards.
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
  /** Orders currently being prepared (drive the success screen + queue banners). */
  activeOrders: CafeOrder[];
  /** Past (picked-up) orders, newest first — with service/taste ratings. */
  orderHistory: CafeHistoryOrder[];
  /** Place an order: append it to the active list and empty the cart. */
  placeOrder: (order: CafeOrder) => void;
  /** Mark an active order picked up: move it into history (unrated). */
  completeOrder: (orderId: string) => void;
  /** Save the review (service + taste ratings 1–5 and a comment) on a history order. */
  rateOrder: (orderId: string, service: number, taste: number, comment: string) => void;
  /** Favourite menu items (with saved options), newest first. */
  favorites: CafeFavorite[];
  /** Add the item to favourites (with its options) or remove it if already saved. */
  toggleFavorite: (fav: CafeFavorite) => void;
  isFavorite: (itemId: string) => boolean;
  /** Counter that bumps to fire the falling-stars celebration overlay (e.g. after a review). */
  celebrate: number;
  fireCelebration: () => void;
};

const CafeCartCtx = createContext<Ctx | null>(null);

export function CafeCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CafeCartLine[]>([]);
  const [payMethod, setPayMethod] = useState<CafePayMethodId>("promptpay");
  const [activeOrders, setActiveOrders] = useState<CafeOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<CafeHistoryOrder[]>(INITIAL_CAFE_HISTORY);
  const [favorites, setFavorites] = useState<CafeFavorite[]>([]);
  const [celebrate, setCelebrate] = useState(0);
  const fireCelebration = () => setCelebrate((c) => c + 1);

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
    // Idempotent per orderId — a double-submit with the same id won't duplicate.
    setActiveOrders((prev) => (prev.some((o) => o.orderId === order.orderId) ? prev : [...prev, order]));
    setLines([]);
    // Kick off the iOS Live Activity (Dynamic Island) countdown (no-op elsewhere).
    const first = order.items[0];
    const itemsLabel = first ? (order.items.length > 1 ? `${first.name} +${order.items.length - 1}` : first.name) : "ออเดอร์กาแฟ";
    startOrderLiveActivity({
      orderId: order.orderId,
      queueNo: order.queueNo,
      queueAhead: order.queueAhead,
      itemsLabel,
      startedAt: order.readyAt - order.waitMinutes * 60000,
      readyAt: order.readyAt,
    });
  };
  const completeOrder: Ctx["completeOrder"] = (orderId) => {
    const done = activeOrders.find((o) => o.orderId === orderId);
    if (!done) return;
    endOrderLiveActivity(orderId);
    setActiveOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    setOrderHistory((prev) => (prev.some((o) => o.orderId === orderId) ? prev : [{ ...done, ratingService: 0, ratingTaste: 0, comment: "" }, ...prev]));
  };
  const rateOrder: Ctx["rateOrder"] = (orderId, service, taste, comment) =>
    setOrderHistory((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, ratingService: service, ratingTaste: taste, comment } : o)));
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
