import { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, type View as RNView } from "react-native";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";
import { GlassView } from "expo-glass-effect";
import { BRAND_GREEN } from "../theme/tokens";
import { PressableScale } from "./PressableScale";

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
 * Apple iOS 26 style date picker for a form field: tapping the pill opens a
 * frosted Liquid-Glass month calendar that floats under the trigger (same glass
 * popover as GlassSelect). Past days are dimmed when `minToday`. Emits a Thai,
 * Buddhist-year display string (e.g. "30 มิ.ย. 2569") — no manual typing.
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
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0 });
  const ref = useRef<RNView>(null);
  const [view, setView] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [picked, setPicked] = useState<{ y: number; m: number; d: number } | null>(null);

  const openMenu = () => {
    ref.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y: y + h + 6, width: w });
      setOpen(true);
    });
  };

  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta: number) =>
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
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
        onPress={() => (open ? setOpen(false) : openMenu())}
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

      {/* Floating glass calendar — backdrop tap closes; inner taps are caught. */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View style={[styles.popoverShadow, { left: anchor.x, top: anchor.y, width: anchor.width }]}>
            <Pressable onPress={() => {}}>
              <GlassView glassEffectStyle="regular" colorScheme="light" isInteractive tintColor="rgba(255,255,255,0.5)" style={styles.popover}>
                {/* Month header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} className="active:opacity-50" style={styles.navBtn}>
                    <ChevronLeft size={20} color="#1c1c1e" strokeWidth={2.4} />
                  </Pressable>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#1c1c1e" }}>
                    {MONTHS_TH[view.m]} {view.y + 543}
                  </Text>
                  <Pressable onPress={() => shiftMonth(1)} hitSlop={8} className="active:opacity-50" style={styles.navBtn}>
                    <ChevronRight size={20} color="#1c1c1e" strokeWidth={2.4} />
                  </Pressable>
                </View>

                {/* Weekday labels */}
                <View style={{ flexDirection: "row" }}>
                  {WEEKDAYS.map((w, i) => (
                    <View key={`${w}${i}`} style={styles.cell}>
                      <Text style={{ fontSize: 11, color: "#8a8f8a", fontWeight: "600" }}>{w}</Text>
                    </View>
                  ))}
                </View>

                {/* Day grid */}
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
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
                            width: 34,
                            height: 34,
                            borderRadius: 17,
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
              </GlassView>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  popoverShadow: {
    position: "absolute",
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 14,
  },
  popover: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.6)",
    padding: 12,
  },
  cell: { width: `${100 / 7}%`, height: 40, alignItems: "center", justifyContent: "center" },
  navBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
});
