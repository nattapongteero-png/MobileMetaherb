// Web shim for `react-native-bottom-tabs`. Only `useBottomTabBarHeight` is used
// across the app; the native package pulls in react-native internals that break
// the web bundle, so on web we return the default JS bottom-tab bar height.
export function useBottomTabBarHeight(): number {
  // Matches @react-navigation/bottom-tabs' default tab bar height.
  return 49;
}
