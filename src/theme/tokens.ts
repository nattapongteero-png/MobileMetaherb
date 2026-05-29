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
