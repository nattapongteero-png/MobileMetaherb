import { LinearGradient } from "expo-linear-gradient";

/**
 * Black scroll-edge shade pinned to the very bottom of the screen, sitting
 * BEHIND a floating bottom bar/sheet so the list dissolves into the edge.
 *
 * The multi-stop opacity follows an ease (t²) curve so the transparent→dark
 * ramp reads smooth with no visible start line. Render it as the sibling right
 * BEFORE the floating bar (so the bar stays on top) inside the screen's root /
 * a flex:1 wrapper over the scroll view.
 */
export function BottomFade({ height = 72 }: { height?: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[
        "rgba(0,0,0,0)",
        "rgba(0,0,0,0.011)",
        "rgba(0,0,0,0.045)",
        "rgba(0,0,0,0.10)",
        "rgba(0,0,0,0.18)",
      ]}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      style={{ position: "absolute", bottom: 0, left: 0, right: 0, height }}
    />
  );
}
