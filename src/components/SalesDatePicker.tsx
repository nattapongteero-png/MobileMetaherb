import { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import type { Period } from "../data/salesReport";

export type DateSel = { day: number; month: number; year: number };

const TH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TH_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const DOW = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

/** Period-aware label for the selected scope. */
export function salesDateLabel(period: Period, s: DateSel): string {
  if (period === "daily") return `${s.day} ${TH_SHORT[s.month]} ${s.year}`;
  if (period === "weekly") return `${TH_FULL[s.month]} ${s.year}`;
  return `ปี ${s.year}`;
}

function DayGrid({ navYear, navMonth, sel, onNav, onPick }: { navYear: number; navMonth: number; sel: DateSel; onNav: (m: number, y: number) => void; onPick: (d: number) => void }) {
  const greg = navYear - 543;
  const firstDay = new Date(greg, navMonth, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // week starts Monday
  const days = new Date(greg, navMonth + 1, 0).getDate();
  const cells: number[] = [...Array(startOffset).fill(0), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(0);
  const prev = () => (navMonth === 0 ? onNav(11, navYear - 1) : onNav(navMonth - 1, navYear));
  const next = () => (navMonth === 11 ? onNav(0, navYear + 1) : onNav(navMonth + 1, navYear));
  return (
    <View>
      <View className="flex-row items-center justify-between" style={{ marginBottom: 10 }}>
        <Pressable onPress={prev} hitSlop={8} className="active:opacity-60"><ChevronLeft size={20} color={BRAND_GREEN_DARK} /></Pressable>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>{TH_FULL[navMonth]} {navYear}</Text>
        <Pressable onPress={next} hitSlop={8} className="active:opacity-60"><ChevronRight size={20} color={BRAND_GREEN_DARK} /></Pressable>
      </View>
      <View className="flex-row" style={{ marginBottom: 4 }}>
        {DOW.map((d) => <Text key={d} style={{ flex: 1, textAlign: "center", fontSize: 10.5, color: TEXT_MUTED }}>{d}</Text>)}
      </View>
      <View className="flex-row" style={{ flexWrap: "wrap" }}>
        {cells.map((d, i) => {
          const on = d === sel.day && navMonth === sel.month && navYear === sel.year;
          return (
            <View key={i} style={{ width: "14.28%", alignItems: "center", paddingVertical: 2 }}>
              {d ? (
                <Pressable onPress={() => onPick(d)} className="active:opacity-70" style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: on ? BRAND_GREEN : "transparent" }}>
                  <Text style={{ fontSize: 13, fontWeight: on ? "700" : "500", color: on ? "#fff" : "#1a1a1a" }}>{d}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MonthGrid({ navYear, onNavYear, sel, onPick }: { navYear: number; onNavYear: (y: number) => void; sel: DateSel; onPick: (m: number) => void }) {
  return (
    <View>
      <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
        <Pressable onPress={() => onNavYear(navYear - 1)} hitSlop={8} className="active:opacity-60"><ChevronLeft size={20} color={BRAND_GREEN_DARK} /></Pressable>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>ปี {navYear}</Text>
        <Pressable onPress={() => onNavYear(navYear + 1)} hitSlop={8} className="active:opacity-60"><ChevronRight size={20} color={BRAND_GREEN_DARK} /></Pressable>
      </View>
      <View className="flex-row" style={{ flexWrap: "wrap", gap: 8 }}>
        {TH_SHORT.map((m, i) => {
          const on = i === sel.month && navYear === sel.year;
          return (
            <Pressable key={i} onPress={() => onPick(i)} className="active:opacity-70" style={{ flexBasis: "30%", flexGrow: 1, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: on ? BRAND_GREEN : "#f5f5f5" }}>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: on ? "#fff" : "#374151" }}>{m}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function YearGrid({ sel, onPick }: { sel: DateSel; onPick: (y: number) => void }) {
  const years = [0, 1, 2, 3, 4, 5].map((i) => 2569 - i);
  return (
    <View className="flex-row" style={{ flexWrap: "wrap", gap: 8 }}>
      {years.map((y) => {
        const on = y === sel.year;
        return (
          <Pressable key={y} onPress={() => onPick(y)} className="active:opacity-70" style={{ flexBasis: "30%", flexGrow: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: on ? BRAND_GREEN : "#f5f5f5" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: on ? "#fff" : "#374151" }}>{y}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Date-range button + period-aware picker popover (mirrors the web sales report). */
export function SalesDatePicker({ period, sel, onChange }: { period: Period; sel: DateSel; onChange: (s: DateSel) => void }) {
  const [open, setOpen] = useState(false);
  const [navYear, setNavYear] = useState(sel.year);
  const [navMonth, setNavMonth] = useState(sel.month);

  const openModal = () => { setNavYear(sel.year); setNavMonth(sel.month); setOpen(true); };
  const close = () => setOpen(false);
  const pick = (next: DateSel) => { onChange(next); setOpen(false); };

  return (
    <>
      <Pressable onPress={openModal} className="flex-row items-center active:opacity-70" style={{ gap: 5, backgroundColor: "#f0f0f0", borderRadius: 999, paddingHorizontal: 12, height: 34 }}>
        <Calendar size={14} color={BRAND_GREEN_DARK} strokeWidth={2.2} />
        <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#1a1a1a" }}>{salesDateLabel(period, sel)}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", paddingHorizontal: 28 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: "#fff", borderRadius: 20, padding: 16 }}>
            <View className="flex-row items-center justify-between" style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>เลือกช่วงเวลา</Text>
              <Pressable onPress={close} hitSlop={8} className="active:opacity-60"><X size={20} color="#9ca3af" /></Pressable>
            </View>

            {period === "daily" ? (
              <DayGrid navYear={navYear} navMonth={navMonth} sel={sel} onNav={(m, y) => { setNavMonth(m); setNavYear(y); }} onPick={(d) => pick({ day: d, month: navMonth, year: navYear })} />
            ) : period === "weekly" ? (
              <MonthGrid navYear={navYear} onNavYear={setNavYear} sel={sel} onPick={(m) => pick({ day: sel.day, month: m, year: navYear })} />
            ) : (
              <YearGrid sel={sel} onPick={(y) => pick({ day: sel.day, month: sel.month, year: y })} />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
