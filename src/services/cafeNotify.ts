// Local "order ready" notification for META Caffe. Scheduled when an order is
// placed (fires at readyAt even if the app is closed) and cancelled if the
// customer picks it up early. Complements the Live Activity countdown — this is
// the actual push the success screen promises ("จะแจ้งเตือนเมื่อออเดอร์พร้อม").
//
// expo-notifications is loaded lazily (getNotifications guard) so anything here
// is a silent no-op on a build/permission that lacks it — Live Activity still
// covers the countdown.
import { getNotifications } from "../utils/notifications";

let handlerSet = false;
// orderId → scheduled notification id, so a pickup can cancel the pending one.
const scheduled = new Map<string, string>();

type NotifModule = NonNullable<ReturnType<typeof getNotifications>>;

async function ensurePermission(N: NotifModule): Promise<boolean> {
  const s = await N.getPermissionsAsync();
  if (s.granted) return true;
  const r = await N.requestPermissionsAsync();
  return r.granted;
}

export type CafeReadyNotif = {
  orderId: string;
  readyAt: number; // epoch ms
  queueNo: number;
  itemsLabel: string;
};

/** Schedule the "ready" notification for a café order. Fire-and-forget. */
export async function scheduleCafeReadyNotification(o: CafeReadyNotif): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  // Nothing to notify if it's already ready (or within a second of it).
  if (o.readyAt <= Date.now() + 1000) return;
  try {
    if (!handlerSet) {
      // Show the banner even when the app is in the foreground.
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerSet = true;
    }
    if (!(await ensurePermission(N))) return;
    // Replace any earlier schedule for the same order (idempotent placeOrder).
    await cancelCafeReadyNotification(o.orderId);
    const id = await N.scheduleNotificationAsync({
      content: {
        title: "ออเดอร์พร้อมแล้ว! ☕",
        body: `คิว #${o.queueNo} · ${o.itemsLabel} — รับได้ที่เคาน์เตอร์ครับ`,
        sound: true,
        data: { type: "cafe_ready", orderId: o.orderId },
      },
      trigger: { date: new Date(o.readyAt) } as never,
    });
    scheduled.set(o.orderId, id);
  } catch {
    /* notifications unavailable / denied — Live Activity still shows the countdown */
  }
}

/** Cancel a pending "ready" notification (order picked up before it fired). */
export async function cancelCafeReadyNotification(orderId: string): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  const id = scheduled.get(orderId);
  if (!id) return;
  try {
    await N.cancelScheduledNotificationAsync(id);
  } catch {
    /* already fired / gone */
  }
  scheduled.delete(orderId);
}
