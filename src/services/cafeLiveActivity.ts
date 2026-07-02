/**
 * Thin JS wrapper over the native `CafeLiveActivity` module (iOS Live Activity /
 * Dynamic Island for a café order's countdown + progress).
 *
 * Safe everywhere: on web / Android / Expo Go / before the native rebuild the
 * module is absent, so `requireOptionalNativeModule` returns null and every call
 * is a no-op. The countdown + progress render on-device from startedAt…readyAt
 * (ActivityKit's timerInterval APIs) — no per-second updates needed.
 */
import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

const LA = Platform.OS === "ios" ? requireOptionalNativeModule("CafeLiveActivity") : null;

export type LiveActivityOrder = {
  orderId: string;
  queueNo: number;
  queueAhead: number;
  itemsLabel: string;
  /** epoch ms */
  startedAt: number;
  /** epoch ms */
  readyAt: number;
};

/** Start (or restart) the Live Activity for an order. */
export function startOrderLiveActivity(o: LiveActivityOrder) {
  try {
    LA?.start?.(o.orderId, o.queueNo, o.queueAhead, o.itemsLabel, o.startedAt / 1000, o.readyAt / 1000);
  } catch {
    /* ignore */
  }
}

/** End the Live Activity for a picked-up / dismissed order. */
export function endOrderLiveActivity(orderId: string) {
  try {
    LA?.end?.(orderId);
  } catch {
    /* ignore */
  }
}

/** Ask native to flip any due order to "ready" (call on AppState 'active'). */
export function reconcileOrderLiveActivities() {
  try {
    LA?.reconcile?.();
  } catch {
    /* ignore */
  }
}

/** True when the native module is present (iOS custom build). */
export const liveActivitySupported = !!LA;
