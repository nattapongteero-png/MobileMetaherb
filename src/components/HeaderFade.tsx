import { LinearGradient } from "expo-linear-gradient";

/**
 * ขอบบนของพื้นที่เลื่อน — content dissolves into the header instead of being
 * sliced by it.
 *
 * The counterpart to BottomFade, which existed while this one did not: 87
 * screens each wrote the same inline gradient, so a new screen only got the
 * effect if whoever wrote it remembered.
 *
 * Render it as a sibling AFTER the scroll view inside a flex:1 wrapper, and
 * pass the surface colour when the page isn't the usual #fafafa (a modal on
 * white, for instance) — otherwise the fade paints the wrong colour.
 */
export function HeaderFade({ height = 28, color = "#fafafa" }: { height?: number; color?: string }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[color, `${color}00`]}
      style={{ position: "absolute", top: 0, left: 0, right: 0, height }}
    />
  );
}
