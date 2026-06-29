import { View, Text } from "react-native";

type Props = {
  count: number;
  /** Visual size of the pill. Default 16. */
  size?: number;
  /** Optional max — values above this render as "99+". */
  max?: number;
  /** Override bg color. Default red `#ee4d2d`. */
  color?: string;
};

/**
 * Red count pill used on notification bells, cart icons, etc. Consolidates
 * the previously-duplicated 14×14 / 16×16 variants into one component with
 * a `size` prop, so visual size stays consistent across surfaces.
 */
export function CountBadge({ count, size = 16, max = 99, color = "#ee4d2d" }: Props) {
  // Nothing to badge when empty — hide the pill instead of showing "0".
  if (count <= 0) return null;
  const display = count > max ? `${max}+` : String(count);
  return (
    <View
      style={{
        minWidth: size,
        height: size,
        borderRadius: size / 2,
        paddingHorizontal: 4,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 9,
          fontWeight: "700",
          includeFontPadding: false,
          lineHeight: 11,
        }}
      >
        {display}
      </Text>
    </View>
  );
}
