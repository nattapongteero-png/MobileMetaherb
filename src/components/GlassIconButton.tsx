import type { ReactNode } from "react";
import { Pressable } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
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
  tintColor,
  disabled,
}: {
  onPress?: () => void;
  children: ReactNode;
  size?: number;
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean };
  /** Optional glass tint (e.g. a green wash for a primary/confirm action). */
  tintColor?: string;
  /** Dim + block presses (e.g. a save action with nothing to save). */
  disabled?: boolean;
}) {
  // Soft SVG ground shadow — Android elevation bleeds through translucent
  // fills and boxShadow doesn't render here, so the shadow is its own layer.
  const pad = 5;
  const d = size + pad * 2;
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} accessibilityLabel={accessibilityLabel} accessibilityState={{ ...accessibilityState, disabled }} style={disabled ? { opacity: 0.4 } : undefined}>
      <Svg width={d} height={d} pointerEvents="none" style={{ position: "absolute", left: -pad, top: -pad + 3 }}>
        <Defs>
          <RadialGradient id="glassBtnShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="68%" stopColor="#000" stopOpacity="0.09" />
            <Stop offset="100%" stopColor="#000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={d / 2} cy={d / 2} r={d / 2} fill="url(#glassBtnShadow)" />
      </Svg>
      <GlassView
        glassEffectStyle="regular"
        colorScheme="light"
        isInteractive
        tintColor={tintColor}
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
      >
        {children}
      </GlassView>
    </Pressable>
  );
}
