import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Flame } from "lucide-react-native";

/**
 * Flash Sale hero banner — replaces the plain SectionHeader for the Flash
 * Sale block. Designed to trigger urgency:
 *   • Gradient-style red/orange band (Aesthetic-Usability)
 *   • Flame icon with continuous pulse (Selective Attention)
 *   • Prominent countdown digits (Zeigarnik / Loss Aversion)
 *   • "ลดสูงสุด" subtitle anchors the discount expectation
 *   • Tappable "ดูทั้งหมด" CTA (Fitts's Law)
 */
export function FlashSaleHero({ onSeeAll }: { onSeeAll?: () => void }) {
  const [time, setTime] = useState({ h: 12, m: 13, s: 8 });
  const pulseScale = useRef(new Animated.Value(1)).current;

  // Countdown
  useEffect(() => {
    const id = setInterval(() => {
      setTime((p) => {
        let { h, m, s } = p;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Flame pulse — gentle heartbeat-style animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.15,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 600,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseScale]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <LinearGradient
      // Deep crimson → red → orange → amber, sweeping left → right
      colors={["#9a0e00", "#bc1b06", "#e62e05", "#f97316", "#fbbf24"]}
      locations={[0, 0.35, 0.7, 0.9, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        marginHorizontal: 16,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <View
        className="flex-row items-center"
        style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 12 }}
      >
        {/* Pulsing flame */}
        <Animated.View
          style={{
            transform: [{ scale: pulseScale }],
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "rgba(255,255,255,0.18)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Flame size={22} color="#fde68a" fill="#fbbf24" strokeWidth={2.2} />
        </Animated.View>

        {/* Title + sub */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: "white",
              fontSize: 18,
              fontWeight: "800",
              lineHeight: 22,
              letterSpacing: 0.3,
            }}
          >
            Flash Sale
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.88)",
              fontSize: 11,
              marginTop: 2,
              lineHeight: 14,
            }}
          >
            ลดสูงสุด 70% • รีบเลย ก่อนหมดเวลา
          </Text>
        </View>

        {/* Countdown */}
        <View className="flex-row items-center" style={{ gap: 3 }}>
          {[pad(time.h), pad(time.m), pad(time.s)].map((t, i) => (
            <View key={i} className="flex-row items-center" style={{ gap: 3 }}>
              <View
                style={{
                  minWidth: 26,
                  paddingHorizontal: 4,
                  paddingVertical: 4,
                  borderRadius: 5,
                  backgroundColor: "rgba(0,0,0,0.45)",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 13,
                    fontWeight: "700",
                    includeFontPadding: false,
                    lineHeight: 16,
                  }}
                >
                  {t}
                </Text>
              </View>
              {i < 2 ? (
                <Text style={{ color: "white", fontSize: 13, fontWeight: "700" }}>
                  :
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* See-all CTA */}
        {onSeeAll ? (
          <Pressable
            onPress={onSeeAll}
            hitSlop={6}
            className="active:opacity-70"
            style={{
              marginLeft: 4,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.22)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight size={18} color="white" />
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}
