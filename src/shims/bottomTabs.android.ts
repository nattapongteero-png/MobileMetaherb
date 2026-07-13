// Android shim for `react-native-bottom-tabs` (only the height hook is used).
// The Android tab bar (bottomTabsNavigation.android.tsx) floats over the scene
// but already pads every scene by its own height, so screens need zero EXTRA
// clearance — returning the real bar height here would double-pad them.
export function useBottomTabBarHeight(): number {
  return 0;
}
