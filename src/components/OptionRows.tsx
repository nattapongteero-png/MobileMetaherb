/**
 * ตัวเลือกเพิ่มเติม — the group heading and the radio row inside it.
 *
 * The customer's item page and the POS's item page ask the same question, and
 * each carried its own private copy of these two, byte for byte identical.
 * Lifted here unchanged — the rendering is exactly what both pages already
 * drew — so that a change to one can no longer leave the other behind.
 */
import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";

export function OptionGroup({ title, required, children }: { title: string; required?: boolean; children: ReactNode }) {
  return (
    <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <Text style={{ fontSize: 14, color: "#525252", lineHeight: 18 }}>{title}</Text>
        {required ? (
          <View style={{ backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
            <Text style={{ fontSize: 9.5, fontWeight: "700", color: BRAND_GREEN }}>เลือก 1</Text>
          </View>
        ) : null}
      </View>
      <View>{children}</View>
    </View>
  );
}

export function RadioRow({ label, addon, active, divider, onPress }: { label: string; addon?: number; active: boolean; divider?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="active:opacity-70" style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11, borderTopWidth: divider ? 1 : 0, borderTopColor: "#f3f4f6" }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: active ? BRAND_GREEN : "#cbd5d1", alignItems: "center", justifyContent: "center" }}>
        {active ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND_GREEN }} /> : null}
      </View>
      <Text style={{ flex: 1, fontSize: 14, color: active ? "#0a0a0a" : "#374151", fontWeight: active ? "600" : "400" }}>{label}</Text>
      {addon ? <Text style={{ fontSize: 13, fontWeight: "600", color: active ? BRAND_GREEN : TEXT_MUTED }}>+{addon}</Text> : null}
    </Pressable>
  );
}
