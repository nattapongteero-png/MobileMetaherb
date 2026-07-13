// Android shim for `react-native-bottom-tabs` (only the height hook is used).
// The Android tab bar (bottomTabsNavigation.android.tsx) is a FLOATING pill that
// hovers over the scene, so screens must reserve its full footprint at the
// bottom of their scroll content. This hook reports that footprint — matching
// the geometry constants in the navigator shim:
//     floatBottom(insets) + BAR_HEIGHT + SCENE_GAP
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { floatBottomFor } from "./bottomTabsNavigation.android";

const BAR_HEIGHT = 60;
const SCENE_GAP = 10;

export function useBottomTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return floatBottomFor(insets.bottom) + BAR_HEIGHT + SCENE_GAP;
}
