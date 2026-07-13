// Shim for `expo-glass-effect` (iOS-26 UIGlassEffect), used on ANDROID and in
// Expo Go — neither has the native Liquid Glass module. Renders a real
// BlurView so glass controls actually blur what's behind them (the dimezis
// renderer does the work on Android; Expo Go ships expo-blur too). Native iOS
// dev builds keep the real GlassView; this only swaps in via the Metro resolver.
import * as React from "react";
import { type ViewProps } from "react-native";
import { BlurView } from "expo-blur";

type GlassViewProps = ViewProps & {
  glassEffectStyle?: string;
  colorScheme?: string;
  isInteractive?: boolean;
  tintColor?: string;
};

export function GlassView({ children, style, tintColor, ...rest }: GlassViewProps) {
  // Fallback fill first so a caller's own `style` backgroundColor still wins.
  return (
    <BlurView
      {...rest}
      intensity={20}
      tint="light"
      experimentalBlurMethod="dimezisBlurView"
      style={[{ backgroundColor: tintColor ?? "rgba(255,255,255,0.45)", overflow: "hidden" }, style]}
    >
      {children}
    </BlurView>
  );
}

export function isLiquidGlassAvailable(): boolean {
  return false;
}
