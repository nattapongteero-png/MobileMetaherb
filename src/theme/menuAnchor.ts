import { Dimensions } from "react-native";

/**
 * Where to pin an AppleMenu that morphs out of a trigger button.
 *
 * The menu is hosted in a `statusBarTranslucent` Modal whose content spans the
 * full SCREEN (this app is edge-to-edge, `edgeToEdgeEnabled`), so its origin is
 * the physical screen top and its height is the screen height. On an
 * edge-to-edge app `measureInWindow` already reports screen-absolute
 * coordinates, so the trigger's rect drops straight in — the only thing to get
 * right is measuring against the SCREEN, not `Dimensions.get("window")`, which
 * on Android excludes the navigation bar. Using `window` there made the upward
 * ("flip") menu land too low and overlap its button.
 */
export function menuAnchor(
  x: number,
  y: number,
  w: number,
  h: number,
  gap = 6,
): { top?: number; bottom?: number; right: number } {
  const screen = Dimensions.get("screen");
  const right = Math.max(12, screen.width - (x + w));
  // Flip upward when the trigger sits low, so the card has room to grow; both
  // the threshold and the bottom offset measure against the true screen height.
  if (y > screen.height * 0.55) {
    return { bottom: screen.height - y + gap, right };
  }
  return { top: y + h + gap, right };
}

/**
 * Anchor for a menu opened at a TAP POINT (the flash / product ⋯ menus, which
 * pass the press coordinates rather than a button rect). Screen-absolute, so it
 * pairs with an AppleMenu hosted in a full-screen `statusBarTranslucent` Modal —
 * the same coordinate space the report menus use.
 */
export function pointMenuAnchor(
  pageX: number,
  pageY: number,
  gap = 8,
): { top?: number; bottom?: number; right: number } {
  const screen = Dimensions.get("screen");
  const right = Math.max(12, screen.width - pageX - 14);
  if (pageY > screen.height * 0.55) {
    return { bottom: screen.height - pageY + gap, right };
  }
  return { top: pageY + gap, right };
}
