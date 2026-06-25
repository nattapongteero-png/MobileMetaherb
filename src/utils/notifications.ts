import { requireOptionalNativeModule } from "expo-modules-core";

// Lazily load expo-notifications only when its native module is actually
// present, so the app never crashes on a build (or Expo Go variant) that lacks
// it. First probe with requireOptionalNativeModule (returns null, never throws
// under the New Architecture); only then require the JS wrapper. Mirrors the
// getImagePicker() guard.
let _mod: typeof import("expo-notifications") | null | undefined;

export function getNotifications() {
  if (_mod !== undefined) return _mod;
  if (!requireOptionalNativeModule("ExpoNotificationScheduler")) {
    _mod = null;
    return _mod;
  }
  try {
    _mod = require("expo-notifications") as typeof import("expo-notifications");
  } catch {
    _mod = null;
  }
  return _mod;
}
