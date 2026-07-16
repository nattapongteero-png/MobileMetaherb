const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Expo Go can't load third-party native modules. Start with `EXPO_GO=1 expo start`
// to swap them for JS shims so the app runs in Expo Go (a native dev build, run
// without the flag, keeps the real native modules).
const EXPO_GO = process.env.EXPO_GO === "1";

const p = (rel) => path.resolve(__dirname, rel);

// Native tab bar — breaks on web (codegenNativeComponent) AND is absent from
// Expo Go. Swap on web, and on native when in Expo Go.
const BOTTOM_TABS = {
  "@bottom-tabs/react-navigation": p("src/shims/bottomTabsNavigation.web.tsx"),
  "react-native-bottom-tabs": p("src/shims/bottomTabs.web.tsx"),
};

// Android has no UITabBarController — swap the native tab bar for a JS one
// dressed as frosted glass. iOS keeps the real Liquid Glass bar.
const BOTTOM_TABS_ANDROID = {
  "@bottom-tabs/react-navigation": p("src/shims/bottomTabsNavigation.android.tsx"),
  "react-native-bottom-tabs": p("src/shims/bottomTabs.android.ts"),
};

// pdf-lib / fontkit ship ESM "module" builds that break tslib interop under
// Metro web (`tslib.default.__extends` undefined). Web only — native is fine.
const WEB_ONLY = {
  "pdf-lib": p("node_modules/pdf-lib/cjs/index.js"),
  "@pdf-lib/fontkit": p("node_modules/@pdf-lib/fontkit/dist/fontkit.umd.js"),
};

// expo-glass-effect (iOS-26 UIGlassEffect) has no native module in Expo Go and
// no Liquid Glass on ANDROID either — swap for the translucent-View shim in
// both. Web has a working glass build; native iOS dev builds keep the real one.
const EXPO_GO_ONLY = {
  "expo-glass-effect": p("src/shims/glassEffect.tsx"),
};

// Native iOS dev builds serve ONE bundle to every iOS version, but Liquid
// Glass / the native tab bar only exist on iOS 26+. These selector modules
// pick real-vs-Android-pill at RUNTIME (theme/tokens LIQUID_GLASS); they reach
// the real packages via subpath requires, which this bare-name alias skips.
const IOS_RUNTIME_SELECT = {
  "expo-glass-effect": p("src/shims/glassEffectIOS.tsx"),
  "@bottom-tabs/react-navigation": p("src/shims/bottomTabsNavigationIOS.tsx"),
  "react-native-bottom-tabs": p("src/shims/bottomTabsIOS.ts"),
};

function resolveShim(moduleName, platform) {
  const isWeb = platform === "web";
  if (BOTTOM_TABS[moduleName] && (isWeb || EXPO_GO)) return BOTTOM_TABS[moduleName];
  if (BOTTOM_TABS_ANDROID[moduleName] && platform === "android") return BOTTOM_TABS_ANDROID[moduleName];
  if (WEB_ONLY[moduleName] && isWeb) return WEB_ONLY[moduleName];
  if (EXPO_GO_ONLY[moduleName] && (EXPO_GO || platform === "android")) return EXPO_GO_ONLY[moduleName];
  if (IOS_RUNTIME_SELECT[moduleName] && platform === "ios" && !EXPO_GO) return IOS_RUNTIME_SELECT[moduleName];
  return null;
}

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const filePath = resolveShim(moduleName, platform);
  if (filePath) return { type: "sourceFile", filePath };
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./src/styles/global.css" });
