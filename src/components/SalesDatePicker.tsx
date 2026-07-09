import { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import * as Haptics from "expo-haptics";
import { Calendar, X } from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";
import { Wheel, WheelHighlight, WheelFades } from "./WheelPicker";
import type { Period } from "../data/salesReport";

export type DateSel = { day: number; month: number; year: number };
/** Report scope — เริ่มต้น/สิ้นสุด. start === end means a single day/month/year. */
export type DateRange = { start: DateSel; end: DateSel };

const TH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TH_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const YEARS = [2564, 2565, 2566, 2567, 2568, 2569];

const yy = (y: number) => String(y).slice(-2);
// Orderable scalar for comparing endpoints.
const ord = (s: DateSel) => s.year * 10000 + s.month * 100 + s.day;

/** Period-aware label for the selected scope (single point or range). */
export function salesDateLabel(period: Period, r: DateRange): string {
  const a = r.start, b = r.end;
  if (period === "daily") {
    if (ord(a) === ord(b)) return `${a.day} ${TH_SHORT[a.month]} ${a.year}`;
    if (a.month === b.month && a.year === b.year) return `${a.day}–${b.day} ${TH_SHORT[a.month]} ${a.year}`;
    return `${a.day} ${TH_SHORT[a.month]} ${yy(a.year)} – ${b.day} ${TH_SHORT[b.month]} ${yy(b.year)}`;
  }
  if (period === "weekly" || period === "monthly") {
    if (a.month === b.month && a.year === b.year) return `${TH_FULL[a.month]} ${a.year}`;
    // Month ranges carry the year on BOTH endpoints so neither reads ambiguous.
    return `${TH_SHORT[a.month]} ${yy(a.year)} – ${TH_SHORT[b.month]} ${yy(b.year)}`;
  }
  return a.year === b.year ? `ปี ${a.year}` : `ปี ${a.year}–${b.year}`;
}

/** Date range of week N (0-based) in a month — e.g. "1–7 ก.ค.". */
export function weekRangeLabel(weekIdx: number, s: DateSel): string {
  const gy = s.year > 2400 ? s.year - 543 : s.year; // พ.ศ. → ค.ศ. for month length
  const dim = new Date(gy, s.month + 1, 0).getDate();
  const start = weekIdx * 7 + 1;
  if (start > dim) return "";
  return `${start}–${Math.min(start + 6, dim)} ${TH_SHORT[s.month]}`;
}

const daysInMonth = (month: number, beYear: number) => new Date(beYear - 543, month + 1, 0).getDate();

// Endpoint pill caption — what one end of the range reads as, per period.
function fmtPoint(period: Period, s: DateSel): string {
  if (period === "daily") return `${s.day} ${TH_SHORT[s.month]} ${yy(s.year)}`;
  if (period === "weekly" || period === "monthly") return `${TH_SHORT[s.month]} ${s.year}`;
  return `ปี ${s.year}`;
}

/** Date button + period-aware WHEEL range picker (drum columns + ยกเลิก/ตกลง).
 *  One modal, two endpoint pills (เริ่มต้น/สิ้นสุด) above the wheels — the
 *  wheels edit whichever pill is active. Leaving สิ้นสุด = เริ่มต้น picks a
 *  single point. Columns adapt to the period: daily = วัน/เดือน/ปี,
 *  weekly & monthly = เดือน/ปี, yearly = ปี. Commits only on ตกลง. */
export function SalesDatePicker({ period, sel, onChange }: { period: Period; sel: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<"start" | "end">("start");
  const [pStart, setPStart] = useState<DateSel>(sel.start);
  const [pEnd, setPEnd] = useState<DateSel>(sel.end);

  // Weekly picks a SINGLE month/year — the report already lays out that
  // month's weeks as groups, so a start–end range would be redundant.
  const isRange = period !== "weekly";

  const openModal = () => { setPStart(sel.start); setPEnd(sel.end); setEditing("start"); setOpen(true); };
  const close = () => setOpen(false);
  const clampDay = (s: DateSel): DateSel => ({ ...s, day: Math.min(s.day, daysInMonth(s.month, s.year)) });
  const confirm = () => {
    const a = clampDay(pStart);
    let b = isRange ? clampDay(pEnd) : a; // single-point periods mirror start
    if (ord(b) < ord(a)) b = a; // backwards range → collapse to a single point
    onChange({ start: a, end: b });
    setOpen(false);
  };
  // Two-step flow: pick เริ่มต้น → ถัดไป auto-advances to สิ้นสุด (seeded from
  // the start so the user only rolls forward) → ตกลง. "ใช้X เดียว" commits a
  // single point without the second step.
  const confirmSingle = () => {
    const a = clampDay(pStart);
    onChange({ start: a, end: a });
    setOpen(false);
  };
  const goNext = () => {
    Haptics.selectionAsync();
    if (ord(pEnd) < ord(pStart)) setPEnd(pStart);
    setEditing("end");
  };
  const goBack = () => { Haptics.selectionAsync(); setEditing("start"); };

  const unitWord = period === "daily" ? "วัน" : period === "monthly" ? "เดือน" : "ปี";
  const title = !isRange ? "เลือกเดือน" : editing === "start" ? `เลือก${unitWord}เริ่มต้น` : `เลือก${unitWord}สิ้นสุด`;

  const cur = editing === "start" ? pStart : pEnd;
  const setCur = (patch: Partial<DateSel>) =>
    (editing === "start" ? setPStart : setPEnd)((s) => ({ ...s, ...patch }));

  const dim = daysInMonth(cur.month, cur.year);
  const dayItems = Array.from({ length: dim }, (_, i) => `${i + 1}`);
  const yearIdx = Math.max(0, YEARS.indexOf(cur.year));

  const EndpointPill = ({ id, label }: { id: "start" | "end"; label: string }) => {
    const on = editing === id;
    const val = id === "start" ? pStart : pEnd;
    return (
      <Pressable
        onPress={() => { if (!on) { Haptics.selectionAsync(); setEditing(id); } }}
        className="active:opacity-80"
        style={{
          flex: 1,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: on ? BRAND_GREEN : "transparent",
          backgroundColor: on ? BRAND_GREEN + "0d" : "#f5f5f5",
          paddingVertical: 8,
          alignItems: "center",
          gap: 1,
        }}
      >
        <Text style={{ fontSize: 10.5, fontWeight: "600", color: on ? BRAND_GREEN_DARK : "#9ca3af" }}>{label}</Text>
        <Text style={{ fontSize: 13.5, fontWeight: "700", color: on ? "#14532d" : "#6b7280" }}>{fmtPoint(period, val)}</Text>
      </Pressable>
    );
  };

  return (
    <>
      <Pressable onPress={openModal} className="flex-row items-center active:opacity-60" style={{ gap: 5, paddingHorizontal: 6, height: 34 }}>
        <Calendar size={15} color={BRAND_GREEN_DARK} strokeWidth={2.2} />
        <Text style={{ fontSize: 12.5, fontWeight: "700", color: BRAND_GREEN_DARK }}>{salesDateLabel(period, sel)}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", paddingHorizontal: 28 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: "#fff", borderRadius: 24, paddingTop: 18, paddingBottom: 16, paddingHorizontal: 16 }}>
            {/* Header — step-aware title, X top-right */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ textAlign: "center", fontSize: 16, fontWeight: "700", color: "#1a1a1a" }}>{title}</Text>
              <Pressable onPress={close} hitSlop={10} className="active:opacity-60" style={{ position: "absolute", right: 2, top: 0 }}>
                <X size={22} color="#9ca3af" strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Endpoint pills — the wheels edit the active one. Hidden for
                weekly (single month/year → its weeks are shown automatically). */}
            {isRange ? (
              <View className="flex-row" style={{ gap: 8, marginBottom: 10 }}>
                <EndpointPill id="start" label="เริ่มต้น" />
                <EndpointPill id="end" label="สิ้นสุด" />
              </View>
            ) : null}
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

            {/* Wheels — highlight band behind the center row spans all columns */}
            <View style={{ marginVertical: 4 }}>
              <WheelHighlight />
              <View className="flex-row">
                {period === "daily" ? (
                  <Wheel items={dayItems} index={Math.min(cur.day, dim) - 1} onChange={(i) => setCur({ day: i + 1 })} />
                ) : null}
                {period !== "yearly" ? (
                  <Wheel items={TH_FULL} index={cur.month} onChange={(i) => setCur({ month: i })} />
                ) : null}
                <Wheel items={YEARS.map(String)} index={yearIdx} onChange={(i) => setCur({ year: YEARS[i] })} />
              </View>
              <WheelFades />
            </View>
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

            {/* Footer — two-step for ranges:
                step 1: ใช้Xเดียว / ถัดไป · step 2: ย้อนกลับ / ตกลง
                weekly (single month): ยกเลิก / ตกลง */}
            <View className="flex-row items-center" style={{ marginTop: 14, gap: 10 }}>
              {!isRange ? (
                <>
                  <Pressable onPress={close} className="active:opacity-60" style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#9ca3af" }}>ยกเลิก</Text>
                  </Pressable>
                  <Pressable onPress={confirm} className="active:opacity-85" style={{ flex: 1.4, height: 46, borderRadius: 999, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>ตกลง</Text>
                  </Pressable>
                </>
              ) : editing === "start" ? (
                <>
                  <Pressable onPress={confirmSingle} className="active:opacity-60" style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#6b7280" }}>ใช้{unitWord}เดียว</Text>
                  </Pressable>
                  <Pressable onPress={goNext} className="active:opacity-85" style={{ flex: 1.4, height: 46, borderRadius: 999, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>ถัดไป</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={goBack} className="active:opacity-60" style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#6b7280" }}>ย้อนกลับ</Text>
                  </Pressable>
                  <Pressable onPress={confirm} className="active:opacity-85" style={{ flex: 1.4, height: 46, borderRadius: 999, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>ตกลง</Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
