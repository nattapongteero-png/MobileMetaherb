/**
 * A one-shot celebratory overlay: stars rain down from the top at random
 * x-positions, sizes, delays, speeds and spins. Pure react-native Animated
 * (native-driver) — no extra deps. Mount it to play; `onDone` fires once every
 * star has fallen off the bottom.
 */
import { useEffect, useMemo } from "react";
import { Animated, Dimensions, Easing, StyleSheet } from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const GLYPHS = ["⭐", "🌟", "✨"];

export function FallingStars({ count = 22, onDone }: { count?: number; onDone?: () => void }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        key: i,
        x: Math.random() * (SCREEN_W - 34),
        size: 16 + Math.random() * 22,
        delay: Math.random() * 400,
        duration: 1200 + Math.random() * 900,
        drift: (Math.random() - 0.5) * 90,
        spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
        glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        progress: new Animated.Value(0),
      })),
    [count],
  );

  useEffect(() => {
    const anims = stars.map((s) =>
      Animated.timing(s.progress, {
        toValue: 1,
        duration: s.duration,
        delay: s.delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    );
    Animated.parallel(anims).start(() => onDone?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((s) => (
        <Animated.Text
          key={s.key}
          style={{
            position: "absolute",
            left: s.x,
            top: 0,
            fontSize: s.size,
            opacity: s.progress.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: s.progress.interpolate({ inputRange: [0, 1], outputRange: [-50, SCREEN_H + 50] }) },
              { translateX: s.progress.interpolate({ inputRange: [0, 1], outputRange: [0, s.drift] }) },
              { rotate: s.progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${s.spin}deg`] }) },
            ],
          }}
        >
          {s.glyph}
        </Animated.Text>
      ))}
    </Animated.View>
  );
}
