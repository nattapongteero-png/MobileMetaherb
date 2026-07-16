// iOS entry for the metro "react-native-bottom-tabs" alias. Native module on
// iOS 26+, the Android pill footprint on older iOS (which runs the pill
// navigator). Runtime choice; the subpath require dodges the metro alias
// (bare-name match only).
//
// NOTE: the real @bottom-tabs/react-navigation resolves its own
// "react-native-bottom-tabs" import through this alias too — it needs the
// default TabView export, not just the height hook, so re-export the whole
// surface. In pill mode nothing renders TabView, so null stand-ins are safe.
import { LIQUID_GLASS } from "../theme/tokens";

const impl = LIQUID_GLASS
  ? require("react-native-bottom-tabs/lib/module/index.js")
  : require("./bottomTabs.android");

export default (impl.default ?? null);
export const SceneMap = impl.SceneMap ?? null;
export const BottomTabBarHeightContext = impl.BottomTabBarHeightContext ?? null;
export const useBottomTabBarHeight: () => number = impl.useBottomTabBarHeight;
