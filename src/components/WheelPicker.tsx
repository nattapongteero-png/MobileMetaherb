import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

export const WHEEL_ITEM_H = 44;
export const WHEEL_VISIBLE = 5; // rows shown — selected row sits dead-center

/**
 * One snapping drum column (iOS wheel style) with real depth: every row's
 * tilt (rotateX + perspective), scale, opacity and squeeze are interpolated
 * CONTINUOUSLY from the scroll position, so rows curl away above/below the
 * center like a physical cylinder — the selected value visibly sits on the
 * front face. Snaps a row per tick with haptics; tap a row to spin to it.
 */
export function Wheel({ items, index, onChange }: { items: string[]; index: number; onChange: (i: number) => void }) {
  const ref = useRef<any>(null);
  const scrollY = useRef(new Animated.Value(index * WHEEL_ITEM_H)).current;
  // Everything scroll-related lives in refs — a drag must NEVER re-render the
  // wheel (state updates mid-gesture caused stutter, and re-applying a
  // prop-derived contentOffset made it fight the finger and drift on its own).
  const centerRef = useRef(index);
  const lastHaptic = useRef(index);
  const initialY = useRef(index * WHEEL_ITEM_H); // frozen — applied once at mount

  const clamp = (i: number) => Math.max(0, Math.min(items.length - 1, i));

  // Re-align only on EXTERNAL changes (list shrinks 31 → 28 days, or switching
  // เริ่มต้น ↔ สิ้นสุด). centerRef guard keeps user scrolls (already reported
  // via onChange) from triggering a feedback jump.
  useEffect(() => {
    const clamped = clamp(index);
    if (clamped !== centerRef.current) {
      centerRef.current = clamped;
      lastHaptic.current = clamped;
      ref.current?.scrollTo({ y: clamped * WHEEL_ITEM_H, animated: false });
      scrollY.setValue(clamped * WHEEL_ITEM_H);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, index]);

  // During the gesture: only haptic ticks (no state, no parent updates).
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
    listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = clamp(Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_H));
      if (i !== lastHaptic.current) { lastHaptic.current = i; Haptics.selectionAsync(); }
    },
  });

  // Commit to the parent only once the wheel settles.
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = clamp(Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_H));
    if (i !== centerRef.current) { centerRef.current = i; onChange(i); }
  };

  return (
    <Animated.ScrollView
      ref={ref}
      style={{ flex: 1, height: WHEEL_ITEM_H * WHEEL_VISIBLE }}
      contentContainerStyle={{ paddingVertical: WHEEL_ITEM_H * Math.floor(WHEEL_VISIBLE / 2) }}
      contentOffset={{ x: 0, y: initialY.current }}
      showsVerticalScrollIndicator={false}
      snapToInterval={WHEEL_ITEM_H}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={onScroll}
      onMomentumScrollEnd={settle}
      onScrollEndDrag={settle}
    >
      {items.map((it, i) => {
        const c = i * WHEEL_ITEM_H; // scrollY at which this row is centered
        const input = [c - 2 * WHEEL_ITEM_H, c - WHEEL_ITEM_H, c, c + WHEEL_ITEM_H, c + 2 * WHEEL_ITEM_H];
        // Row above center (scrollY > c): top edge rolls back into the drum;
        // below center: bottom edge rolls back. Edge rows also squeeze toward
        // the middle (translateY) like foreshortened cylinder faces.
        const rotateX = scrollY.interpolate({ inputRange: input, outputRange: ["-58deg", "-32deg", "0deg", "32deg", "58deg"], extrapolate: "clamp" });
        const scale = scrollY.interpolate({ inputRange: input, outputRange: [0.72, 0.86, 1, 0.86, 0.72], extrapolate: "clamp" });
        const opacity = scrollY.interpolate({ inputRange: input, outputRange: [0.22, 0.45, 1, 0.45, 0.22], extrapolate: "clamp" });
        const translateY = scrollY.interpolate({ inputRange: input, outputRange: [-14, -6, 0, 6, 14], extrapolate: "clamp" });
        return (
          <Pressable
            key={`${it}-${i}`}
            onPress={() => ref.current?.scrollTo({ y: c, animated: true })}
            style={{ height: WHEEL_ITEM_H, alignItems: "center", justifyContent: "center" }}
          >
            <Animated.View style={{ opacity, transform: [{ perspective: 650 }, { translateY }, { rotateX }, { scale }] }}>
              {/* Fixed weight — center emphasis comes from the animated
                  scale/opacity, so scrolling never needs a re-render. */}
              <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: "600", color: "#1a1a1a" }}>
                {it}
              </Text>
            </Animated.View>
          </Pressable>
        );
      })}
    </Animated.ScrollView>
  );
}

/** The gray highlight band behind the wheels' center row — render once behind
 *  a flex-row of <Wheel>s. */
export function WheelHighlight() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: WHEEL_ITEM_H * Math.floor(WHEEL_VISIBLE / 2),
        left: 6,
        right: 6,
        height: WHEEL_ITEM_H,
        borderRadius: 12,
        backgroundColor: "#f4f4f5",
      }}
    />
  );
}

/** White fades over the drum's top/bottom edges — rows dissolve into the card
 *  as they roll away, selling the cylinder depth. Render AFTER the wheels row. */
export function WheelFades() {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={["#ffffff", "rgba(255,255,255,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: WHEEL_ITEM_H * 1.4 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0)", "#ffffff"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: WHEEL_ITEM_H * 1.4 }}
      />
    </>
  );
}
