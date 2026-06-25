import { Text } from "react-native";
import { BRAND_GREEN, TEXT_SECONDARY } from "../theme/tokens";
import { PressableScale } from "./PressableScale";

/**
 * Selectable option chip — the form standard across the app: a rounded pill that
 * fills solid brand-green with white bold text when active, soft gray otherwise.
 * (The glass-outlined chip in ProductsScreen is reserved for the glass header bar;
 * on flat white form cards this solid-fill reads more clearly as "selected".)
 *
 * Pass `minWidth` to keep a row of short labels (e.g. "7 วัน".."60 วัน") uniform.
 */
export function Chip({
  label,
  active,
  onPress,
  minWidth,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  minWidth?: number;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={{
        height: 38,
        minWidth,
        paddingHorizontal: 16,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? BRAND_GREEN : "#f5f5f5",
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>
        {label}
      </Text>
    </PressableScale>
  );
}
