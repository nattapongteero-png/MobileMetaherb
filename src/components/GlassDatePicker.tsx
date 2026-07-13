import { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import * as Haptics from "expo-haptics";
import { Calendar, X } from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";
import { PressableScale } from "./PressableScale";
import { Wheel, WheelHighlight, WheelFades } from "./WheelPicker";

const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Best-effort parse of the display string ("6 ก.ค. 2569") back to y/m/d. */
function parseDisplay(value: string): { y: number; m: number; d: number } | null {
  const match = value.match(/^(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (!match) return null;
  const m = MONTHS_SHORT.indexOf(match[2]);
  if (m < 0) return null;
  return { y: Number(match[3]) - 543, m, d: Number(match[1]) };
}

/**
 * Date field for forms: tapping the pill opens the app-wide WHEEL date picker
 * (same drum modal as the sales report) — three columns วัน / เดือน / ปี with
 * ยกเลิก / ตกลง. Scrolling never commits; only ตกลง emits the Thai,
 * Buddhist-year display string (e.g. "30 มิ.ย. 2569").
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
  // Pending (uncommitted) selection while the modal is up.
  const [pDay, setPDay] = useState(1);
  const [pMonth, setPMonth] = useState(0);
  const [pYear, setPYear] = useState(2026);

  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Forms pick nearby dates — a year back (for records) through 3 ahead (promos).
  const YEARS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i);

  const openModal = () => {
    const init = parseDisplay(value) ?? { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
    setPYear(init.y); setPMonth(init.m); setPDay(init.d);
    setOpen(true);
  };
  const close = () => setOpen(false);
  const confirm = () => {
    let y = pYear, m = pMonth, d = Math.min(pDay, daysIn(pYear, pMonth));
    // Past dates aren't valid for most forms — quietly lift them to today.
    if (minToday && new Date(y, m, d).getTime() < todayMid) {
      y = now.getFullYear(); m = now.getMonth(); d = now.getDate();
    }
    onChange(`${d} ${MONTHS_SHORT[m]} ${y + 543}`);
    setOpen(false);
  };

  const dim = daysIn(pYear, pMonth);
  const dayItems = Array.from({ length: dim }, (_, i) => `${i + 1}`);
  const yearIdx = Math.max(0, YEARS.indexOf(pYear));

  return (
    <View>
      <PressableScale
        onPress={openModal}
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

      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }}>
          {/* Fixed dialog width so the sheet doesn't stretch full-screen on iPad */}
          <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 400, backgroundColor: "#fff", borderRadius: 24, paddingTop: 18, paddingBottom: 16, paddingHorizontal: 16 }}>
            {/* Header — centered title, X top-right */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ textAlign: "center", fontSize: 16, fontWeight: "700", color: "#1a1a1a" }}>{placeholder}</Text>
              <Pressable onPress={close} hitSlop={10} className="active:opacity-60" style={{ position: "absolute", right: 2, top: 0 }}>
                <X size={22} color="#9ca3af" strokeWidth={2.2} />
              </Pressable>
            </View>
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

            {/* Wheels — วัน / เดือน / ปี with the shared highlight band */}
            <View style={{ marginVertical: 4 }}>
              <WheelHighlight />
              <View className="flex-row">
                <Wheel items={dayItems} index={Math.min(pDay, dim) - 1} onChange={(i) => setPDay(i + 1)} />
                <Wheel items={MONTHS_TH} index={pMonth} onChange={setPMonth} />
                <Wheel items={YEARS.map((y) => `${y + 543}`)} index={yearIdx} onChange={(i) => setPYear(YEARS[i])} />
              </View>
              <WheelFades />
            </View>
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

            {/* Footer — ยกเลิก (plain) / ตกลง (brand-green capsule) */}
            <View className="flex-row items-center" style={{ marginTop: 14, gap: 10 }}>
              <Pressable onPress={close} className="active:opacity-60" style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#9ca3af" }}>ยกเลิก</Text>
              </Pressable>
              <Pressable onPress={confirm} className="active:opacity-85" style={{ flex: 1.4, height: 46, borderRadius: 999, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>ตกลง</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ---------- Paired เริ่มต้น/สิ้นสุด fields (one shared wheel modal) ---------- */

type YMD = { y: number; m: number; d: number };
const ordYMD = (s: YMD) => s.y * 10000 + s.m * 100 + s.d;
const fmtDisplay = (s: YMD) => `${s.d} ${MONTHS_SHORT[s.m]} ${s.y + 543}`;
const fmtShort = (s: YMD) => `${s.d} ${MONTHS_SHORT[s.m]} ${String(s.y + 543).slice(-2)}`;

/**
 * เริ่มต้น/สิ้นสุด date pair sharing ONE wheel modal, with a hybrid flow:
 *   • start still empty → whichever field is tapped, the modal runs the GUIDED
 *     two-step flow (เลือกเริ่มต้น → ถัดไป → สิ้นสุด → ตกลง, or ใช้วันเดียว) —
 *     a range can't exist without its start.
 *   • start already set → the tapped field is edited DIRECTLY (single step,
 *     ยกเลิก/ตกลง) so fixing just the end date costs one step.
 * Invalid ranges are prevented at the input (สิ้นสุด is seeded from เริ่มต้น
 * and a backwards pick collapses to it) — no error states needed (Postel).
 */
export function GlassDateRangePicker({
  start,
  end,
  onChange,
  startLabel = "เริ่มต้น",
  endLabel = "สิ้นสุด",
  minToday = true,
  disabled = false,
}: {
  start: string;
  end: string;
  /** Receives BOTH display strings — a start edit may bump the end forward. */
  onChange: (start: string, end: string) => void;
  startLabel?: string;
  endLabel?: string;
  minToday?: boolean;
  /** Dates fixed by context (e.g. a flash round's window) — fields locked. */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"guided" | "direct">("direct");
  const [editing, setEditing] = useState<"start" | "end">("start");
  const [pStart, setPStart] = useState<YMD>({ y: 2026, m: 0, d: 1 });
  const [pEnd, setPEnd] = useState<YMD>({ y: 2026, m: 0, d: 1 });

  const now = new Date();
  const today: YMD = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
  const YEARS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i);

  const openFor = (field: "start" | "end") => {
    const s = parseDisplay(start);
    const e = parseDisplay(end);
    const s0 = s ? { y: s.y, m: s.m, d: s.d } : today;
    const e0 = e ? { y: e.y, m: e.m, d: e.d } : s0;
    setPStart(s0);
    setPEnd(ordYMD(e0) < ordYMD(s0) ? s0 : e0);
    if (!s) {
      // No start yet — guide the user through start → end, whatever they tapped.
      setMode("guided");
      setEditing("start");
    } else {
      setMode("direct");
      setEditing(field);
    }
    setOpen(true);
  };
  const close = () => setOpen(false);

  const clampDay = (s: YMD): YMD => ({ ...s, d: Math.min(s.d, daysIn(s.y, s.m)) });
  const lift = (s: YMD): YMD => (minToday && ordYMD(s) < ordYMD(today) ? today : s);
  const commit = (a0: YMD, b0: YMD) => {
    const a = lift(clampDay(a0));
    let b = lift(clampDay(b0));
    if (ordYMD(b) < ordYMD(a)) b = a; // backwards range → collapse to start
    onChange(fmtDisplay(a), fmtDisplay(b));
    setOpen(false);
  };
  const confirm = () => commit(pStart, pEnd);
  const confirmSingle = () => commit(pStart, pStart);
  const goNext = () => {
    Haptics.selectionAsync();
    if (ordYMD(pEnd) < ordYMD(pStart)) setPEnd(pStart);
    setEditing("end");
  };
  const goBack = () => { Haptics.selectionAsync(); setEditing("start"); };

  const cur = editing === "start" ? pStart : pEnd;
  const setCur = (patch: Partial<YMD>) =>
    (editing === "start" ? setPStart : setPEnd)((s) => ({ ...s, ...patch }));
  const dim = daysIn(cur.y, cur.m);
  const dayItems = Array.from({ length: dim }, (_, i) => `${i + 1}`);
  const yearIdx = Math.max(0, YEARS.indexOf(cur.y));
  const title = editing === "start" ? "เลือกวันเริ่มต้น" : "เลือกวันสิ้นสุด";

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
        <Text style={{ fontSize: 13.5, fontWeight: "700", color: on ? "#14532d" : "#6b7280" }}>{fmtShort(val)}</Text>
      </Pressable>
    );
  };

  const FieldPill = ({ field, label, val }: { field: "start" | "end"; label: string; val: string }) => (
    <View style={{ flex: 1, gap: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a" }}>{label}</Text>
      <PressableScale
        onPress={disabled ? undefined : () => openFor(field)}
        style={{
          backgroundColor: "#f5f5f5",
          height: 48,
          borderRadius: 999,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1.5,
          borderColor: open && editing === field ? BRAND_GREEN : "transparent",
        }}
      >
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: disabled ? "700" : val ? "500" : "400", color: disabled ? "#1a1a1a" : val ? "#374151" : "#a3a3a3" }}>
          {val || "เลือกวันที่"}
        </Text>
        {disabled ? null : (
          <Calendar size={18} color={open && editing === field ? BRAND_GREEN : "#9ca3af"} strokeWidth={2.2} />
        )}
      </PressableScale>
    </View>
  );

  const GreenBtn = ({ text, onPress }: { text: string; onPress: () => void }) => (
    <Pressable onPress={onPress} className="active:opacity-85" style={{ flex: 1.4, height: 46, borderRadius: 999, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{text}</Text>
    </Pressable>
  );
  const GhostBtn = ({ text, onPress }: { text: string; onPress: () => void }) => (
    <Pressable onPress={onPress} className="active:opacity-60" style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#9ca3af" }}>{text}</Text>
    </Pressable>
  );

  return (
    <View className="flex-row" style={{ gap: 12 }}>
      <FieldPill field="start" label={startLabel} val={start} />
      <FieldPill field="end" label={endLabel} val={end} />

      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }}>
          {/* Fixed dialog width so the sheet doesn't stretch full-screen on iPad */}
          <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 400, backgroundColor: "#fff", borderRadius: 24, paddingTop: 18, paddingBottom: 16, paddingHorizontal: 16 }}>
            {/* Header — step-aware title, X top-right */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ textAlign: "center", fontSize: 16, fontWeight: "700", color: "#1a1a1a" }}>{title}</Text>
              <Pressable onPress={close} hitSlop={10} className="active:opacity-60" style={{ position: "absolute", right: 2, top: 0 }}>
                <X size={22} color="#9ca3af" strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Endpoint pills — step indicator + direct switch */}
            <View className="flex-row" style={{ gap: 8, marginBottom: 10 }}>
              <EndpointPill id="start" label={startLabel} />
              <EndpointPill id="end" label={endLabel} />
            </View>
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

            {/* Wheels — วัน / เดือน / ปี editing the active endpoint */}
            <View style={{ marginVertical: 4 }}>
              <WheelHighlight />
              <View className="flex-row">
                <Wheel items={dayItems} index={Math.min(cur.d, dim) - 1} onChange={(i) => setCur({ d: i + 1 })} />
                <Wheel items={MONTHS_TH} index={cur.m} onChange={(i) => setCur({ m: i })} />
                <Wheel items={YEARS.map((y) => `${y + 543}`)} index={yearIdx} onChange={(i) => setCur({ y: YEARS[i] })} />
              </View>
              <WheelFades />
            </View>
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

            {/* Footer — guided: ใช้วันเดียว/ถัดไป then ย้อนกลับ/ตกลง;
                direct edit: ยกเลิก/ตกลง */}
            <View className="flex-row items-center" style={{ marginTop: 14, gap: 10 }}>
              {mode === "guided" && editing === "start" ? (
                <>
                  <GhostBtn text="ใช้วันเดียว" onPress={confirmSingle} />
                  <GreenBtn text="ถัดไป" onPress={goNext} />
                </>
              ) : mode === "guided" ? (
                <>
                  <GhostBtn text="ย้อนกลับ" onPress={goBack} />
                  <GreenBtn text="ตกลง" onPress={confirm} />
                </>
              ) : (
                <>
                  <GhostBtn text="ยกเลิก" onPress={close} />
                  <GreenBtn text="ตกลง" onPress={confirm} />
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
