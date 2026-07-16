// Android stand-in for the iOS café Live Activity: a STICKY (ongoing)
// notification pinned while the order is being prepared, updated once a
// minute with the remaining time while the app is in the foreground. The
// "ready" push scheduled by cafeNotify (from placeOrder) uses the SAME
// identifier, so when it fires at readyAt it REPLACES this card with a
// normal, dismissible one.
//
// Runs on its own low-importance channel so the minute updates never beep or
// heads-up; the ready push stays on the default (sound) channel. No-op on
// every platform except Android, mirroring cafeLiveActivity.
import { Platform } from "react-native";
import { getNotifications } from "../utils/notifications";
import type { LiveActivityOrder } from "./cafeLiveActivity";

const CHANNEL_ID = "cafe-live";
/** Shared with cafeNotify so the ready push replaces the sticky card. */
export const cafeLiveNotifId = (orderId: string) => `cafe_live_${orderId}`;

// orderId → minute ticker updating the remaining-time line.
const tickers = new Map<string, ReturnType<typeof setInterval>>();

const timeLabel = (epochMs: number) =>
  new Date(epochMs).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

function bodyFor(o: LiveActivityOrder): string {
  const minsLeft = Math.max(1, Math.ceil((o.readyAt - Date.now()) / 60000));
  const queuePart = o.queueAhead > 0 ? ` · รออีก ${o.queueAhead} คิว` : "";
  return `คิว #${o.queueNo} · ${o.itemsLabel}${queuePart}\nอีกประมาณ ${minsLeft} นาที · พร้อมรับ ~${timeLabel(o.readyAt)} น.`;
}

async function ensureChannel(N: NonNullable<ReturnType<typeof getNotifications>>) {
  await N.setNotificationChannelAsync(CHANNEL_ID, {
    name: "สถานะออเดอร์คาเฟ่",
    importance: N.AndroidImportance.LOW, // silent updates, no heads-up
    sound: null,
    vibrationPattern: [0],
    showBadge: false,
  });
}

async function present(o: LiveActivityOrder) {
  const N = getNotifications();
  if (!N) return;
  // Presenting under this identifier is safe next to the scheduled "ready"
  // push that shares it: a channel-trigger present never touches the scheduled
  // store (ExpoSchedulingDelegate.scheduleNotification returns before saving),
  // so the readyAt alarm survives every card update.
  await N.scheduleNotificationAsync({
    identifier: cafeLiveNotifId(o.orderId),
    content: {
      title: "กำลังเตรียมออเดอร์... ☕",
      body: bodyFor(o),
      sticky: true,
      sound: false,
      data: { type: "cafe_live", orderId: o.orderId },
    },
    trigger: { channelId: CHANNEL_ID },
  });
}

/** Pin the live "preparing" card for an order. Fire-and-forget. */
export function startOrderLiveNotification(o: LiveActivityOrder): void {
  if (Platform.OS !== "android") return;
  // Already (about to be) ready — the ready push covers it, nothing to pin.
  if (o.readyAt <= Date.now() + 1000) return;
  void (async () => {
    const N = getNotifications();
    if (!N) return;
    try {
      // Permission is requested by cafeNotify right after this in placeOrder;
      // ask here too so the sticky card works even if that path changes.
      const s = await N.getPermissionsAsync();
      if (!s.granted && !(await N.requestPermissionsAsync()).granted) return;
      await ensureChannel(N);
      await present(o);
      // Foreground minute ticker — keeps "อีกประมาณ X นาที" honest. Stops at
      // readyAt (the scheduled ready push replaces the card from there).
      stopTicker(o.orderId);
      const t = setInterval(() => {
        if (o.readyAt - Date.now() <= 1000) {
          stopTicker(o.orderId);
          return;
        }
        void present(o);
      }, 60000);
      tickers.set(o.orderId, t);
    } catch {
      /* notifications unavailable / denied — the ready push may still fire */
    }
  })();
}

/** Remove the live card (picked up / dismissed). Fire-and-forget. */
export function endOrderLiveNotification(orderId: string): void {
  if (Platform.OS !== "android") return;
  stopTicker(orderId);
  const N = getNotifications();
  if (!N) return;
  // Same identifier also clears the fired "ready" card if it's in the tray.
  void N.dismissNotificationAsync(cafeLiveNotifId(orderId)).catch(() => {});
}

function stopTicker(orderId: string) {
  const t = tickers.get(orderId);
  if (t) clearInterval(t);
  tickers.delete(orderId);
}
