import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, type View as RNView } from "react-native";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { BRAND_GREEN } from "../theme/tokens";
import { PressableScale } from "./PressableScale";
import { BottomSheet } from "./BottomSheet";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/**
 * Date field for forms: tapping the pill opens a bottom sheet month calendar.
 * The grid always renders 6 week-rows so the sheet height stays FIXED when the
 * month changes (a 5-row and 6-row month look identical height) — the sheet
 * never jumps. Emits a Thai, Buddhist-year display string (e.g. "30 มิ.ย. 2569").
 */
export function GlassDatePicker({
  value,
  onChange,
  placeholder = "เลือกวันที่",
  minToday = true,
}: {
  value: string;
  onChange: (display: string) => void;
  placeholder?: string;
  minToday?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<RNView>(null);
  const [view, setView] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [picked, setPicked] = useState<{ y: number; m: number; d: number } | null>(null);

  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  // Always pad to 42 cells (6 rows) → constant calendar height across months.
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length < 42) cells.push(null);

  // Grid slide+fade feedback when the month/year changes (Doherty / 100ms rule).
  const gridAnim = useRef(new Animated.Value(1)).current;
  const dirRef = useRef(0); // -1 prev, +1 next → grid enters from that side
  useEffect(() => {
    gridAnim.setValue(0);
    Animated.timing(gridAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [view.m, view.y, gridAnim]);

  const shiftMonth = (delta: number) => {
    dirRef.current = delta;
    Haptics.selectionAsync();
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });
  };
  const shiftYear = (delta: number) => {
    dirRef.current = delta;
    Haptics.selectionAsync();
    setView((v) => ({ ...v, y: v.y + delta }));
  };

  // Horizontal swipe on the calendar body changes month (left = next, right = prev).
  // failOffsetY yields vertical drags to the sheet's swipe-to-dismiss gesture.
  const monthSwipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-20, 20])
    .failOffsetY([-16, 16])
    .onEnd((e) => {
      if (e.translationX <= -40) shiftMonth(1);
      else if (e.translationX >= 40) shiftMonth(-1);
    });

  const pick = (d: number) => {
    setPicked({ y: view.y, m: view.m, d });
    onChange(`${d} ${MONTHS_SHORT[view.m]} ${view.y + 543}`);
    setOpen(false);
  };

  return (
    <View>
      <PressableScale
        ref={ref}
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: "#f5f5f5",
          height: 48,
          borderRadius: 999,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1.5,
          borderColor: open ? BRAND_GREEN : "transparent",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: value ? "500" : "400", color: value ? "#374151" : "#a3a3a3" }}>
          {value || placeholder}
        </Text>
        <Calendar size={18} color={open ? BRAND_GREEN : "#9ca3af"} strokeWidth={2.2} />
      </PressableScale>

      {/* Fixed-height bottom sheet — hugs its (always 6-row) content, so it never
          resizes when the month changes. */}
      <BottomSheet visible={open} onClose={() => setOpen(false)} title="" noHeader minHeightRatio={0.1} maxHeightRatio={0.9}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          {/* Header — year selector (center) */}
          <View className="flex-row items-center justify-center" style={{ height: 44, gap: 28, marginBottom: 8 }}>
            <Pressable onPress={() => shiftYear(-1)} hitSlop={8} className="active:opacity-50" style={styles.navBtn}>
              <ChevronLeft size={22} color="#1c1c1e" strokeWidth={2.4} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1c1e", lineHeight: 26, includeFontPadding: false }}>{view.y + 543}</Text>
            <Pressable onPress={() => shiftYear(1)} hitSlop={8} className="active:opacity-50" style={styles.navBtn}>
              <ChevronRight size={22} color="#1c1c1e" strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Month selector (center, no year) */}
          <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} className="active:opacity-50" style={styles.navBtn}>
              <ChevronLeft size={20} color="#8a8f8a" strokeWidth={2.4} />
            </Pressable>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#525252", lineHeight: 24, includeFontPadding: false }}>{MONTHS_TH[view.m]}</Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={8} className="active:opacity-50" style={styles.navBtn}>
              <ChevronRight size={20} color="#8a8f8a" strokeWidth={2.4} />
            </Pressable>
          </View>

          <GestureDetector gesture={monthSwipe}>
          <Animated.View style={{ opacity: gridAnim, transform: [{ translateX: gridAnim.interpolate({ inputRange: [0, 1], outputRange: [dirRef.current * 24, 0] }) }] }}>
          {/* Weekday labels */}
          <View className="flex-row" style={{ marginBottom: 4 }}>
            {WEEKDAYS.map((w, i) => (
              <View key={`${w}${i}`} style={styles.cell}>
                <Text style={{ fontSize: 12, color: "#8a8f8a", fontWeight: "600" }}>{w}</Text>
              </View>
            ))}
          </View>

          {/* Day grid — fixed 6 rows */}
          <View className="flex-row" style={{ flexWrap: "wrap" }}>
            {cells.map((d, i) => {
              if (d === null) return <View key={`b${i}`} style={styles.cell} />;
              const cellMid = new Date(view.y, view.m, d).getTime();
              const disabled = minToday && cellMid < todayMid;
              const isPicked = !!picked && picked.y === view.y && picked.m === view.m && picked.d === d;
              const isToday = cellMid === todayMid;
              return (
                <Pressable key={d} disabled={disabled} onPress={() => pick(d)} className="active:opacity-60" style={styles.cell}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isPicked ? BRAND_GREEN : "transparent",
                      borderWidth: isToday && !isPicked ? 1.5 : 0,
                      borderColor: BRAND_GREEN,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isPicked ? "700" : "500",
                        color: disabled ? "#c4c4c6" : isPicked ? "#fff" : "#1c1c1e",
                      }}
                    >
                      {d}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          </Animated.View>
          </GestureDetector>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = {
  cell: { width: `${100 / 7}%` as const, height: 46, alignItems: "center" as const, justifyContent: "center" as const },
  navBtn: { width: 36, height: 36, alignItems: "center" as const, justifyContent: "center" as const },
};
