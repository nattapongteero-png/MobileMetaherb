import { requireOptionalNativeModule } from "expo-modules-core";

// Lazily load expo-speech-recognition only when its native module is present,
// so the bundle/app never crashes on a build (or Expo Go) that lacks it.
// Mirrors the getImagePicker() / getNotifications() guards.
let _mod: typeof import("expo-speech-recognition") | null | undefined;

export function getSpeech() {
  if (_mod !== undefined) return _mod;
  if (!requireOptionalNativeModule("ExpoSpeechRecognition")) {
    _mod = null;
    return _mod;
  }
  try {
    _mod = require("expo-speech-recognition") as typeof import("expo-speech-recognition");
  } catch {
    _mod = null;
  }
  return _mod;
}
