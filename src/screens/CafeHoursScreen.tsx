import { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Platform, Modal } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { Wheel, WheelHighlight, WheelFades } from "../components/WheelPicker";
import { showToast } from "../components/Toast";
import { BRAND_GREEN, DIVIDER_GRAY, TEXT_MUTED } from "../theme/tokens";
import { useStore } from "../store/db";
import {
  cafeAdminStore,
  cafeHours,
  setCafeDayHours,
  CAFE_DAYS,
  type CafeDayId,
} from "../store/cafeAdmin";

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

const splitTime = (t: string): [number, number] => {
  const [h, m] = t.split(":").map(Number);
  return [Math.min(23, h || 0), Math.max(0, MINUTES.indexOf(String(m).padStart(2, "0")))];
};
const joinTime = (h: number, mIdx: number) => `${HOURS[h]}:${MINUTES[Math.max(0, mIdx)]}`;

/**
 * ตั้งค่าเวลาเปิด/ปิดร้าน + ตั้งค่าเวลารับสินค้า — parity with the Metaherb-Cafe
 * web console's settings. Per-day open/close with an on/off switch, edited in a
 * drum-wheel sheet (the app-wide picker style), plus the pickup lead time the
 * POS/queue quotes to customers.
 */
export function CafeHoursScreen() {
  const nav = useNavigation();
  const state = useStore(cafeAdminStore);
  const hours = cafeHours(state);

  // Which day the wheel sheet is editing (null = closed).
  const [editDay, setEditDay] = useState<CafeDayId | null>(null);
  const [editing, setEditing] = useState<"open" | "close">("open");
  const [pH, setPH] = useState(8);
  const [pM, setPM] = useState(0);
  // Pending values for both endpoints while the sheet is up — commit on ตกลง.
  const [pOpen, setPOpen] = useState("08:00");
  const [pClose, setPClose] = useState("17:00");

  const openEditor = (day: CafeDayId) => {
    const d = hours[day];
    setPOpen(d.open);
    setPClose(d.close);
    const [h, m] = splitTime(d.open);
    setPH(h); setPM(m);
    setEditing("open");
    setEditDay(day);
  };

  const switchEndpoint = (which: "open" | "close") => {
    // Stash the current wheels into the endpoint being left.
    if (editing === "open") setPOpen(joinTime(pH, pM));
    else setPClose(joinTime(pH, pM));
    const [h, m] = splitTime(which === "open" ? pOpen : pClose);
    setPH(h); setPM(m);
    setEditing(which);
    Haptics.selectionAsync().catch(() => {});
  };

  const confirm = () => {
    if (!editDay) return;
    const open = editing === "open" ? joinTime(pH, pM) : pOpen;
    const close = editing === "close" ? joinTime(pH, pM) : pClose;
    if (close <= open) {
      showToast("เวลาปิดต้องอยู่หลังเวลาเปิด", "error");
      return;
    }
    setCafeDayHours(editDay, { open, close });
    setEditDay(null);
    showToast("บันทึกเวลาเปิด-ปิดแล้ว");
  };

  const dayLabel = editDay ? CAFE_DAYS.find((d) => d.id === editDay)?.label : "";

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="เวลาเปิด-ปิดร้าน"
        subtitle="ตั้งเวลาขายรายวัน และเวลารับสินค้า"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Per-day hours — iOS-grouped card, hairline separators */}
        <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: DIVIDER_GRAY, overflow: "hidden" }}>
          {CAFE_DAYS.map((d, i) => {
            const dh = hours[d.id];
            return (
              <View
                key={d.id}
                className="flex-row items-center"
                style={{ minHeight: 60, paddingHorizontal: 16, paddingVertical: 10, gap: 12, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: "rgba(60,60,67,0.12)" }}
              >
                <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: dh.enabled ? "#0a0a0a" : "#a3a3a3" }}>{d.label}</Text>
                {dh.enabled ? (
                  <Pressable
                    onPress={() => openEditor(d.id)}
                    className="active:opacity-70"
                    style={{ height: 36, borderRadius: 999, backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#ececec", paddingHorizontal: 14, justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: "600", color: BRAND_GREEN }}>
                      {dh.open} – {dh.close} น.
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{ fontSize: 13, color: "#a3a3a3" }}>ปิดร้าน</Text>
                )}
                <Switch
                  value={dh.enabled}
                  onValueChange={(on) => setCafeDayHours(d.id, { enabled: on })}
                  trackColor={{ true: BRAND_GREEN, false: "#d4d4d4" }}
                  // iOS gives the switch a taller intrinsic box than it draws,
                  // so a flex row lines the BOX up and the control reads high.
                  // alignSelf centres the control itself (same fix as the
                  // promotion form's switches).
                  style={{ alignSelf: "center" }}
                  {...(Platform.OS === "web" ? { activeThumbColor: "#fff" } : {})}
                />
              </View>
            );
          })}
        </View>

      </ScrollView>
      <HeaderFade />
      </View>

      {/* Time editor — the app's date-picker dialog, in time form: centred card,
          two endpoint pills, drum wheels, ยกเลิก/ตกลง. Same shell as
          SalesDatePicker so picking a time and picking a date feel identical. */}
      <Modal visible={editDay !== null} transparent animationType="fade" onRequestClose={() => setEditDay(null)} statusBarTranslucent navigationBarTranslucent>
        <Pressable onPress={() => setEditDay(null)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }}>
          <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 400, backgroundColor: "#fff", borderRadius: 24, paddingTop: 18, paddingBottom: 16, paddingHorizontal: 16 }}>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ textAlign: "center", fontSize: 16, fontWeight: "700", color: "#1a1a1a" }}>
                {editing === "open" ? "เลือกเวลาเปิด" : "เลือกเวลาปิด"} · {dayLabel}
              </Text>
              <Pressable onPress={() => setEditDay(null)} hitSlop={10} className="active:opacity-60" style={{ position: "absolute", right: 2, top: 0 }}>
                <X size={22} color="#9ca3af" strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Endpoint pills — the wheels edit whichever one is active */}
            <View className="flex-row" style={{ gap: 8, marginBottom: 10 }}>
              {(["open", "close"] as const).map((w) => {
                const on = editing === w;
                const value = w === "open"
                  ? (on ? joinTime(pH, pM) : pOpen)
                  : (on ? joinTime(pH, pM) : pClose);
                return (
                  <Pressable
                    key={w}
                    onPress={() => { if (!on) switchEndpoint(w); }}
                    className="active:opacity-80"
                    style={{ flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: on ? BRAND_GREEN : "transparent", backgroundColor: on ? BRAND_GREEN + "0d" : "#f5f5f5", paddingVertical: 8, alignItems: "center", gap: 1 }}
                  >
                    <Text style={{ fontSize: 11.5, color: on ? BRAND_GREEN : "#6b7280" }}>{w === "open" ? "เวลาเปิด" : "เวลาปิด"}</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: "700", color: on ? "#14532d" : "#6b7280" }}>{value} น.</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

            <View style={{ marginVertical: 4 }}>
              <WheelHighlight />
              <View className="flex-row">
                <Wheel items={HOURS.map((h) => `${h} น.`)} index={pH} onChange={setPH} />
                <Wheel items={MINUTES.map((m) => `${m} นาที`)} index={pM} onChange={setPM} />
              </View>
              <WheelFades />
            </View>
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

            {/* Footer — mirrors the date picker: เวลาเปิด hands off to เวลาปิด,
                then ตกลง commits both. */}
            <View className="flex-row items-center" style={{ marginTop: 14, gap: 10 }}>
              {editing === "open" ? (
                <>
                  <Pressable onPress={() => setEditDay(null)} className="active:opacity-60" style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#9ca3af" }}>ยกเลิก</Text>
                  </Pressable>
                  <Pressable onPress={() => switchEndpoint("close")} className="active:opacity-85" style={{ flex: 1.4, height: 46, borderRadius: 999, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>ถัดไป</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => switchEndpoint("open")} className="active:opacity-60" style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center" }}>
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
    </View>
  );
}
