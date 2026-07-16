/**
 * Design tokens — colors, sizes, and other primitive values shared across
 * the app. Tokens don't need to clear the "rule of three" bar: a single
 * source of truth for a value prevents drift even when it's only referenced
 * in one place today.
 */

// Brand
export const BRAND_GREEN = "#319754";
export const BRAND_GREEN_DARK = "#267a43";
export const BRAND_GREEN_TINT = "rgba(49,151,84,0.1)";

// Accent colors
export const PRICE_RED = "#e62e05"; // discounted price + flash sale
export const PRICE_GREEN = "#226a3b"; // regular price
export const BADGE_RED = "#ee4d2d"; // count badges, discount tags
export const HEART_RED = "#ef4444"; // wishlist / favorite
export const WISH_HEART_RED = "#ff383c"; // product detail wishlist

// Rating
export const STAR_YELLOW = "#f59e0b"; // canonical yellow — used WITH star icon shape so contrast exception applies (WCAG 1.4.1 not relied on color alone)
export const RATING_BAR_FILL = "#d97706"; // amber-600, ≥3:1 vs #f0f0f0 — for non-iconic uses like progress bars

// Neutral
export const TEXT_PRIMARY = "#0a0a0a";
export const TEXT_SECONDARY = "#525252";
export const TEXT_MUTED = "#737373";
export const TEXT_DISABLED = "#a3a3a3";

export const SURFACE_GRAY = "#f5f5f5";
export const BORDER_GRAY = "#e5e7eb";
export const DIVIDER_GRAY = "#f0f0f0";

// Floating action bars (the height-68 Liquid Glass pills): Android has no real
// glass material, so they render opaque white there; iOS keeps the native glass.
import { Platform, type ViewStyle } from "react-native";
export const GLASS_BAR_TINT = Platform.OS === "android" ? "#ffffff" : undefined;
// Circular glass chip buttons inside floating bars: opaque pastels on Android
// (translucent tints let scrolled content bleed through); real tints on iOS.
export const GLASS_CHIP_GREEN = Platform.OS === "android" ? "#eaf4ee" : "rgba(49,151,84,0.1)";
export const GLASS_CHIP_AMBER = Platform.OS === "android" ? "#fbf1e2" : "rgba(219,139,10,0.1)";
/** Per-site glass tint: the real translucent tint on iOS, an opaque (or near-
 *  opaque) stand-in on Android, where fake glass lets content bleed through. */
export const glassTint = (ios: string, android: string) =>
  Platform.OS === "android" ? android : ios;

/**
 * Card drop shadow — the report/flash cards' two-layer soft shadow.
 *
 * iOS renders the CSS `boxShadow` string faithfully. Android's boxShadow is
 * buggy under `transform` (the summary carousel's rotateY/scale threw the
 * shadow off the card) AND the cards also carried `elevation`, so Android drew
 * the shadow twice. So: keep the exact boxShadow on iOS, and give Android the
 * native `elevation` alone — same split the teammate's Android glass sweep used.
 */
export const cardShadow = (elevation = 3): ViewStyle =>
  Platform.OS === "ios"
    ? ({ boxShadow: "0px 2px 4px rgba(0,0,0,0.15), 0px 6px 12px rgba(0,0,0,0.08)" } as ViewStyle)
    // Android draws the elevation shadow from the view's OWN rounded outline, so
    // the shadow-casting view needs an opaque background (a transparent wrapper
    // casts a square shadow that misses the card). Every cardShadow consumer is
    // a white card, so backing it with white is safe and gives a correct shadow.
    : { elevation, backgroundColor: "#fff" };

/**
 * Colored shadow (join CTA). iOS renders the colored boxShadow. Android's
 * elevation can't do a coloured shadow and draws a hard, square-ish light halo
 * on a prominent button — worse than none — so the button stays flat there,
 * matching how the teammate's Android sweep treats coloured CTAs.
 */
export const tintedCardShadow = (boxShadow: string): ViewStyle =>
  Platform.OS === "ios" ? ({ boxShadow } as ViewStyle) : {};
