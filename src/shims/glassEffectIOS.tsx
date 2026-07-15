// iOS entry for the metro "expo-glass-effect" alias. iOS 26+ keeps the real
// UIGlassEffect GlassView; older iOS has no Liquid Glass, so it gets the same
// opaque fallback Android uses. Decided at RUNTIME — one bundle serves every
// iOS version. The subpath require dodges the metro alias, which matches the
// bare module name only.
import { GlassView as FallbackGlassView } from "./glassEffect";
import { LIQUID_GLASS } from "../theme/tokens";

const real = LIQUID_GLASS
  ? (require("expo-glass-effect/build/index") as typeof import("expo-glass-effect"))
  : null;

export const GlassView = real ? real.GlassView : FallbackGlassView;

export function isLiquidGlassAvailable(): boolean {
  return real ? real.isLiquidGlassAvailable() : false;
}
