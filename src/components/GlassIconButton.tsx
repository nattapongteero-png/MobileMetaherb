import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { GlassView } from "expo-glass-effect";

/**
 * Circular Liquid Glass icon button (iOS 26 UIGlassEffect) — the floating glass
 * controls Apple uses over hero images (App Store / Health). Use for back, share,
 * cart, wishlist, etc. on cover-image detail screens.
 */
export function GlassIconButton({
  onPress,
  children,
  size = 44,
  accessibilityLabel,
  accessibilityState,
}: {
  onPress?: () => void;
  children: ReactNode;
  size?: number;
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean };
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel={accessibilityLabel} accessibilityState={accessibilityState}>
      <GlassView
        glassEffectStyle="regular"
        colorScheme="light"
        isInteractive
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
      >
        {children}
      </GlassView>
    </Pressable>
  );
}
