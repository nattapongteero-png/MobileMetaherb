import { View, Text } from "react-native";

export type CardBrand = "visa" | "mastercard";

/** Lightweight card-brand mark — Mastercard's two interlocking circles, or the
 *  VISA wordmark. Used in the payment picker and the selected-card chip. */
export function CardBrandIcon({ brand, size = 30 }: { brand: CardBrand; size?: number }) {
  if (brand === "mastercard") {
    const d = size * 0.62;
    return (
      <View style={{ width: size, height: size, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: "#eb001b" }} />
        <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: "#f79e1b", marginLeft: -d * 0.42, opacity: 0.85 }} />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.4, fontWeight: "800", fontStyle: "italic", color: "#1a1f71", letterSpacing: -0.5 }}>
        VISA
      </Text>
    </View>
  );
}
