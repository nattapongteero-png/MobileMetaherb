/**
 * StickyFilterList — the app-wide shell for "filter row + card list" sections.
 * One behavior everywhere (ported from the Flash Sale section):
 *
 *   [0] header   — optional content above the filter (scrolls away; measured)
 *   [1] filters  — STICKY full-bleed pill row (padding lives on the CONTENT so
 *                  overflowing pills slide to the screen edge, never cropped)
 *   [2] children — the list body (16px side padding)
 *
 * - `filterKey` change → slides back to the first card (deferred one frame so
 *   the scroll clamps against the NEW, possibly shorter list).
 * - `onEndReached` (optional) fires ~200px before the bottom for infinite scroll.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { View, ScrollView, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";

export function StickyFilterList({
  header,
  filters,
  filterKey,
  children,
  insetsBottom = 24,
  contentGap = 16,
  onEndReached,
}: {
  /** Content above the sticky bar (scrolls away). Rendered inside a 16px-padded block. */
  header?: ReactNode;
  /** Pill elements — laid out in the full-bleed horizontal scroller. */
  filters: ReactNode;
  /** Current filter id — when it changes the list slides back to the first card. */
  filterKey: string;
  children: ReactNode;
  insetsBottom?: number;
  /** Vertical gap between list items (default 16 — 8-point grid). */
  contentGap?: number;
  /** Infinite-scroll hook — called when the user nears the bottom. */
  onEndReached?: () => void;
}) {
  const listRef = useRef<ScrollView>(null);
  const headerH = useRef(0);
  const offsetY = useRef(0);
  const prevKey = useRef(filterKey);

  // Filter changed → jump back to the first card of the new context (list top,
  // just under the pinned bar). Deferred one frame so the scroll clamps against
  // the NEW list. Skips when the user is already above the sticky bar.
  useEffect(() => {
    if (prevKey.current === filterKey) return;
    prevKey.current = filterKey;
    if (offsetY.current > headerH.current) {
      requestAnimationFrame(() => listRef.current?.scrollTo({ y: headerH.current, animated: true }));
    }
  }, [filterKey]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    offsetY.current = contentOffset.y;
    if (onEndReached && layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) onEndReached();
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={listRef}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insetsBottom }}
      >
        {/* [0] header — measured so the slide-back knows where the list starts */}
        <View
          style={{ paddingHorizontal: 16, paddingTop: 12 }}
          onLayout={(e) => { headerH.current = e.nativeEvent.layout.height; }}
        >
          {header}
        </View>

        {/* [1] STICKY filter bar — bg so content scrolls under it */}
        <View style={{ backgroundColor: "#fafafa", paddingTop: 12, paddingBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {filters}
          </ScrollView>
        </View>

        {/* [2] list body */}
        <View style={{ paddingHorizontal: 16, gap: contentGap }}>{children}</View>
      </ScrollView>
    </View>
  );
}
