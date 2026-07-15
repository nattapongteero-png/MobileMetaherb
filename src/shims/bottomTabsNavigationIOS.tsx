// iOS entry for the metro "@bottom-tabs/react-navigation" alias: the native
// UITabBarController (real Liquid Glass floating bar) on iOS 26+, the Android
// floating-pill navigator on older iOS. Decided at RUNTIME — one bundle serves
// every iOS version. The subpath require dodges the metro alias, which matches
// the bare module name only.
import { LIQUID_GLASS } from "../theme/tokens";

const impl = LIQUID_GLASS
  ? require("@bottom-tabs/react-navigation/lib/commonjs/index.js")
  : require("./bottomTabsNavigation.android");

export const createNativeBottomTabNavigator: typeof import("@bottom-tabs/react-navigation").createNativeBottomTabNavigator =
  impl.createNativeBottomTabNavigator;
