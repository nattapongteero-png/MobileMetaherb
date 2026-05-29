import { Platform, type ViewProps } from "react-native";
import { requireNativeView } from "expo";

export type AppleFilterListProps = ViewProps & {
  /** JSON string: [{ key, title, options: [{ key, label, selected }] }] */
  data: string;
  onSelect?: (event: { nativeEvent: { group: string; key: string } }) => void;
};

/** True only where the native SwiftUI module exists (iOS). */
export const isAppleFilterListAvailable = Platform.OS === "ios";

// Only resolve the native view on iOS; on Android/web it stays null and the
// caller renders a cross-platform fallback.
const AppleFilterList = isAppleFilterListAvailable
  ? requireNativeView<AppleFilterListProps>("AppleFilterList")
  : null;

export default AppleFilterList;
