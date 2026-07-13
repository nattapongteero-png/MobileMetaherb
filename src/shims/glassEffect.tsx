// Shim for `expo-glass-effect` (iOS-26 UIGlassEffect), used on ANDROID and in
// Expo Go — neither has the native Liquid Glass module. The blur pane is an
// absolute-fill LAYER BEHIND the children (never a parent of them), so the
// content on the glass stays pin-sharp while the backdrop blurs.
import * as React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";

type GlassViewProps = ViewProps & {
  glassEffectStyle?: string;
  colorScheme?: string;
  isInteractive?: boolean;
  tintColor?: string;
};

export function GlassView({ children, style, tintColor, ...rest }: GlassViewProps) {
  return (
    <View {...rest} style={[style, { overflow: "hidden" }]}>
      <BlurView
        intensity={10}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={[StyleSheet.absoluteFill, { backgroundColor: tintColor ?? "rgba(255,255,255,0.45)" }]}
      />
      {children}
    </View>
  );
}

export function isLiquidGlassAvailable(): boolean {
  return false;
}
