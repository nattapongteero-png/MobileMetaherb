// Shim for `expo-glass-effect` (iOS-26 UIGlassEffect) used in Expo Go, which
// has no native ExpoGlassEffect module. Renders a plain translucent View so the
// glass controls/cards still show (just without the real blur). Native dev
// builds keep the real GlassView; this only swaps in via the Metro resolver.
import * as React from "react";
import { View, type ViewProps } from "react-native";

type GlassViewProps = ViewProps & {
  glassEffectStyle?: string;
  colorScheme?: string;
  isInteractive?: boolean;
  tintColor?: string;
};

export function GlassView({ children, style, tintColor, ...rest }: GlassViewProps) {
  // Fallback fill first so a caller's own `style` backgroundColor still wins.
  return (
    <View
      {...rest}
      style={[{ backgroundColor: tintColor ?? "rgba(255,255,255,0.55)", overflow: "hidden" }, style]}
    >
      {children}
    </View>
  );
}

export function isLiquidGlassAvailable(): boolean {
  return false;
}
