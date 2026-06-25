import { View, Text, Pressable } from "react-native";
import { GlassView } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { Delete } from "lucide-react-native";
import { BRAND_GREEN } from "../theme/tokens";

// Subtle Apple-style Taptic on key press. Guarded so it no-ops if the native
// module isn't in the current dev build yet (needs an iOS rebuild to feel it).
const buzz = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {
    /* native haptics not available — ignore */
  }
};

/** Error feedback (double-buzz) — e.g. wrong PIN. */
export const errorHaptic = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  } catch {
    /* native haptics not available — ignore */
  }
};

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "del"],
];
const KEY = 74; // key diameter
const GAP = 30; // gap between columns

/** The 6 (default) PIN dots — shown near the title, separate from the keypad. */
export function PinDots({
  value,
  length = 6,
  error = false,
  accent = BRAND_GREEN,
}: {
  value: string;
  length?: number;
  error?: boolean;
  accent?: string;
}) {
  const c = error ? "#dc2626" : accent;
  return (
    <View style={{ flexDirection: "row", gap: 18 }}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: i < value.length ? c : "transparent",
            borderWidth: 1.5,
            borderColor: i < value.length ? c : "#c4c9c4",
          }}
        />
      ))}
    </View>
  );
}

/** Numeric keypad — iOS 26 "Liquid Glass" keys, anchored at the bottom of the screen. */
export function PinKeypad({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}) {
  const press = (d: string) => { if (value.length < length) { buzz(); onChange(value + d); } };
  const del = () => { if (value.length > 0) buzz(); onChange(value.slice(0, -1)); };

  // Every key sits in an equal-width cell (KEY + GAP) with its content centered,
  // so all four rows share the exact same 3 columns — "0" is always dead-centre.
  const CELL = KEY + GAP;
  return (
    <View style={{ alignItems: "center" }}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row" }}>
          {row.map((d, ci) => (
            <View key={ci} style={{ width: CELL, height: CELL, alignItems: "center", justifyContent: "center" }}>
              {d === "" ? null : d === "del" ? (
                <Pressable
                  onPress={del}
                  style={({ pressed }) => ({ width: KEY, height: KEY, borderRadius: KEY / 2, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
                  accessibilityLabel="ลบ"
                >
                  <Delete size={28} color="#3a3a3a" strokeWidth={1.8} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => press(d)}
                  style={({ pressed }) => ({
                    width: KEY,
                    height: KEY,
                    borderRadius: KEY / 2,
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                    shadowColor: "#0a0a0a",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 9,
                    elevation: 3,
                  })}
                  accessibilityLabel={d}
                >
                  <GlassView
                    glassEffectStyle="regular"
                    colorScheme="light"
                    tintColor="rgba(255,255,255,0.5)"
                    isInteractive
                    style={{
                      width: KEY,
                      height: KEY,
                      borderRadius: KEY / 2,
                      overflow: "hidden",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.7)",
                    }}
                  >
                    <Text style={{ fontSize: 31, fontWeight: "500", color: "#1a1a1a", lineHeight: 37 }}>{d}</Text>
                  </GlassView>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
