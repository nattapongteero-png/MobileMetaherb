import type { ReactNode } from "react";
import { Pressable } from "react-native";

type Variant =
  | "lightGray" // #f5f5f5 bg, dark icon — used inside white headers/cards
  | "translucentDark" // rgba(0,0,0,0.4) — over images/photos
  | "translucentDarkLight" // rgba(0,0,0,0.2) — softer overlay (over solid bright bg)
  | "white45" // rgba(255,255,255,0.45) — legacy, kept for completeness
  | "ghost"; // no bg

type Props = {
  onPress?: () => void;
  size?: number;
  variant?: Variant;
  hitSlop?: number;
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean };
  children: ReactNode;
};

const BG: Record<Variant, string> = {
  lightGray: "#f5f5f5",
  translucentDark: "rgba(0,0,0,0.4)",
  translucentDarkLight: "rgba(0,0,0,0.2)",
  white45: "rgba(255,255,255,0.45)",
  ghost: "transparent",
};

/**
 * 38x38 (default) circular icon button — the single source for every round
 * icon affordance in the app: back, share, heart, cart, etc. Replacing
 * inline Pressable+style blocks keeps tap targets and visual treatment
 * identical everywhere (Jakob's Law + Fitts's Law).
 */
export function IconButton({
  onPress,
  size = 38,
  variant = "lightGray",
  hitSlop = 8,
  accessibilityLabel,
  accessibilityState,
  children,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      className="active:opacity-70"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: BG[variant],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </Pressable>
  );
}
