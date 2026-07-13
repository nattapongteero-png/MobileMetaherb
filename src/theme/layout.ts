import { Dimensions, Platform } from "react-native";

/**
 * Responsive layout helpers.
 *
 * Phones keep the original 430-canvas design untouched. Tablets get REAL
 * adaptive layouts: grids grow extra columns from the same card-width math,
 * and long-form content can clamp to a readable column.
 *
 * The helpers are plain functions (not hooks) so module-scope constants —
 * the codebase convention — keep working. Values are captured at import time
 * per the existing convention (initial orientation).
 */

/** Web demo renders inside a 430px phone frame (App.tsx); native uses the real window. */
export const APP_MAX_WIDTH = 430;

export const appWidth = () =>
  Platform.OS === "web"
    ? Math.min(Dimensions.get("window").width, APP_MAX_WIDTH)
    : Dimensions.get("window").width;

/** Tablet = shortest side ≥ 700pt (iPad mini and up). */
export const isTablet = () =>
  Platform.OS !== "web" &&
  Math.min(Dimensions.get("window").width, Dimensions.get("window").height) >= 700;

/**
 * Column count for a card grid: phones keep the designed 2 columns; tablets
 * show 4 per row (product grids + home rails alike).
 */
export const gridColumns = (_minCardWidth = 190, _padding = 32, _gap = 12) =>
  isTablet() ? 4 : 2;

/**
 * Card width for an N-column grid (floored — prevents flex-wrap breakage,
 * per project convention). Defaults mirror the standard 16px page padding
 * and 12px gap used by the product grids.
 */
export const gridCardWidth = (columns: number, padding = 32, gap = 12) =>
  Math.floor((appWidth() - padding - gap * (columns - 1)) / columns);

/** Readable max width for single-column content (forms / detail pages) on tablets. */
export const CONTENT_MAX_WIDTH = 680;

export const contentWidth = () => Math.min(appWidth(), CONTENT_MAX_WIDTH);

/**
 * Tablet header search-bar width — ONE deterministic value shared by every
 * main page's top-row search so the bars line up across tabs. Sized off the
 * window (leaves ~460pt for logo/title + action buttons), clamped to a
 * sensible range.
 */
export const tabletSearchBarWidth = () =>
  Math.min(Math.max(appWidth() - 460, 300), 560);

/**
 * Extra top padding for modal-presented surfaces (nav `presentation:"modal"`
 * screens and pageSheet-style <Modal> forms). iOS shows these as native cards
 * that already start below the status bar (top inset inside the card is 0),
 * so this adds nothing there. Android has no native card — the same surface
 * renders full-screen edge-to-edge and must clear the status bar / camera
 * cutout itself. Pass `useSafeAreaInsets().top`.
 */
export const modalTopPad = (insetTop: number): number =>
  Platform.OS === "android" ? insetTop : 0;
