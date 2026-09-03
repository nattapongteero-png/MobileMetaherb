import { requireOptionalNativeModule } from "expo-modules-core";

// Lazily load react-native-webview — same reason as utils/imagePicker: on a
// bare dev build that hasn't been rebuilt since the package was added, the
// native side (RNCWebViewModule) is missing and a plain `import` throws during
// module-eval, which kills the whole app with "App entry not found" before
// AppRegistry ever runs. Probe the native module first (returns null, never
// throws), and only then require the JS wrapper.
let _webview: typeof import("react-native-webview") | null | undefined;

export function getWebView() {
  if (_webview !== undefined) return _webview;
  if (!requireOptionalNativeModule("RNCWebViewModule")) {
    _webview = null;
    return _webview;
  }
  try {
    _webview = require("react-native-webview") as typeof import("react-native-webview");
  } catch {
    _webview = null;
  }
  return _webview;
}
