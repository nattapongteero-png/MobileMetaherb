import { requireOptionalNativeModule } from "expo-modules-core";

// Lazily load expo-image-picker. On a bare dev build that hasn't been rebuilt
// since the package was added, its native module is missing — importing the
// package would throw a fatal at module-eval (which a try/catch around require
// can't reliably swallow under the New Architecture). So first probe for the
// native module with requireOptionalNativeModule (returns null, never throws);
// only require the JS wrapper when the native side is actually present.
let _picker: typeof import("expo-image-picker") | null | undefined;

export function getImagePicker() {
  if (_picker !== undefined) return _picker;
  if (!requireOptionalNativeModule("ExponentImagePicker")) {
    _picker = null;
    return _picker;
  }
  try {
    _picker = require("expo-image-picker") as typeof import("expo-image-picker");
  } catch {
    _picker = null;
  }
  return _picker;
}
