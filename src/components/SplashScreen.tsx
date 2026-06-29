import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_GREEN } from "../theme/tokens";

const LOGO = require("../../assets/logo.png");
const LEAF = require("../../assets/herb-leaf-a.png");

// Splash-specific gradient stops (light → brand → deep green) for depth.
const GRADIENT = ["#3CAA63", BRAND_GREEN, "#1B5E32"] as const;

/**
 * Branded launch splash, shown while fonts (and any future startup work) load.
 * Pure JS / RN — no expo-splash-screen config plugin (per AGENTS.md). Avoids
 * <Text> so it renders correctly before the Thai font is ready.
 */
export function SplashScreen() {
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.86)).current;
  const leafOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(leafOpacity, {
        toValue: 0.55,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardScale, leafOpacity]);

  return (
    <LinearGradient colors={GRADIENT} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.root}>
      {/* Decorative herb-leaf watermarks */}
      <Animated.Image
        source={LEAF}
        resizeMode="contain"
        style={[styles.leaf, styles.leafTop, { opacity: leafOpacity }]}
      />
      <Animated.Image
        source={LEAF}
        resizeMode="contain"
        style={[styles.leaf, styles.leafBottom, { opacity: leafOpacity }]}
      />

      {/* Logo on a floating white disc */}
      <Animated.View
        style={[
          styles.card,
          { opacity: cardOpacity, transform: [{ scale: cardScale }] },
        ]}
      >
        <Animated.Image source={LOGO} resizeMode="contain" style={styles.logo} />
      </Animated.View>

      <LoadingDots />
    </LinearGradient>
  );
}

/** Three white dots pulsing in sequence — a calmer loader than a spinner. */
function LoadingDots() {
  const d0 = useRef(new Animated.Value(0)).current;
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dots = [d0, d1, d2];
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay((dots.length - 1 - i) * 160),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [d0, d1, d2]);

  return (
    <View style={styles.dots}>
      {[d0, d1, d2].map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  leaf: {
    position: "absolute",
  },
  leafTop: {
    width: 240,
    height: 240,
    top: -48,
    right: -56,
    transform: [{ rotate: "18deg" }],
  },
  leafBottom: {
    width: 300,
    height: 300,
    bottom: -70,
    left: -80,
    transform: [{ rotate: "-150deg" }],
  },
  card: {
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0a2e18",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  logo: {
    width: 150,
    height: 150,
  },
  dots: {
    position: "absolute",
    bottom: 84,
    flexDirection: "row",
    gap: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#ffffff",
  },
});
