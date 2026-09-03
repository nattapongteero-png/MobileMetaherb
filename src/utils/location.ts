import { requireOptionalNativeModule } from "expo-modules-core";

// Lazily load expo-location — same guard as utils/imagePicker and utils/webView.
// A bare dev build that predates the package has no native module, and a plain
// `import` would throw during module-eval and take the whole app down before
// AppRegistry runs. Probe first (returns null, never throws), require after.
let _location: typeof import("expo-location") | null | undefined;

export function getLocation() {
  if (_location !== undefined) return _location;
  if (!requireOptionalNativeModule("ExpoLocation")) {
    _location = null;
    return _location;
  }
  try {
    _location = require("expo-location") as typeof import("expo-location");
  } catch {
    _location = null;
  }
  return _location;
}
