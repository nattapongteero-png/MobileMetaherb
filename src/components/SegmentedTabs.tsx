import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { BRAND_GREEN } from "../theme/tokens";
import { isTablet } from "../theme/layout";

// Capsule segmented control with a green pill that springs to the active tab —
// the app-wide tab-switcher look (สาระความรู้ / หน้าร้านค้า owner + customer).
// Equal-width tabs; optional count badge per tab.
export type SegmentedTab<T extends string> = { id: T; label: string; count?: number };

export function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
  style,
  size = "regular",
}: {
  tabs: SegmentedTab<T>[];
  active: T;
  onChange: (t: T) => void;
  style?: StyleProp<ViewStyle>;
  /** "compact" = small inline variant (e.g. chart-type switcher in a title row). */
  size?: "regular" | "compact";
}) {
  const GAP = 4;
  const compact = size === "compact";
  // iPad: the phone-sized control looks tiny on the wide canvas, so bump the
  // height + label (same isTablet() gate the rest of the app uses). Phones keep
  // the original sizes untouched.
  const tablet = isTablet();
  const PAD = compact ? 3 : 4;
  const H = compact ? (tablet ? 46 : 32) : (tablet ? 52 : 44);
  const fontSize = compact ? (tablet ? 15 : 11.5) : (tablet ? 15 : 13);
  const pillH = H - PAD * 2;
  const index = Math.max(0, tabs.findIndex((t) => t.id === active));
  const pos = useRef(new Animated.Value(index)).current;
  // Measure the track so the sliding pill matches the real segment width.
  const [trackW, setTrackW] = useState(0);
  const segW = trackW > 0 ? (trackW - PAD * 2 - GAP * (tabs.length - 1)) / tabs.length : 0;

  useEffect(() => {
    Animated.spring(pos, { toValue: index, useNativeDriver: true, friction: 9, tension: 90 }).start();
  }, [index, pos]);

  const translateX = pos.interpolate({ inputRange: [0, 1], outputRange: [0, segW + GAP] });

  return (
    <View
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      style={[
        compact
          ? { height: H, borderRadius: 999, backgroundColor: "#f7f7f8", padding: PAD }
          : { height: H, borderRadius: 999, backgroundColor: "#fff", padding: PAD, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 },
        style,
      ]}
    >
      {/* Sliding pill — width/offset derived from the measured track */}
      {segW > 0 ? (
        <Animated.View
          style={{ position: "absolute", top: PAD, left: PAD, width: segW, height: pillH, borderRadius: 999, backgroundColor: BRAND_GREEN, transform: [{ translateX }] }}
        />
      ) : null}
      <View style={{ flex: 1, flexDirection: "row", gap: GAP }}>
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => onChange(t.id)}
              className="active:opacity-90"
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }}
            >
              <Text numberOfLines={1} style={{ fontSize, fontWeight: isActive ? "700" : "600", color: isActive ? "#fff" : "#6b7280" }}>
                {t.label}
              </Text>
              {t.count !== undefined ? (
                <View style={{ minWidth: 18, height: 17, paddingHorizontal: 5, borderRadius: 9, backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "rgba(49,151,84,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "700", color: isActive ? "#fff" : BRAND_GREEN }}>{t.count > 99 ? "99+" : t.count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
