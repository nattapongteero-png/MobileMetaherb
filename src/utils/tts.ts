import { requireOptionalNativeModule } from "expo-modules-core";

// Lazily load expo-speech (text-to-speech) only when its native module is
// present — guarded like getSpeech()/getNotifications() so JS never crashes.
let _mod: typeof import("expo-speech") | null | undefined;

export function getTts() {
  if (_mod !== undefined) return _mod;
  if (!requireOptionalNativeModule("ExpoSpeech")) {
    _mod = null;
    return _mod;
  }
  try {
    _mod = require("expo-speech") as typeof import("expo-speech");
  } catch {
    _mod = null;
  }
  return _mod;
}
