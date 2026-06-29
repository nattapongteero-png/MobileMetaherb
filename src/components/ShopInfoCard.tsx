import { View, Text } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";

// Read-only info card — a white section with a title + label/value rows, used by
// the shop-registration detail screens (Supplier / Trial Brand). Display only.
export function InfoCard({ title, rows }: { title?: string; rows: { label: string; value: string }[] }) {
  return (
    <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      {title ? <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", marginBottom: 12 }}>{title}</Text> : null}
      {rows.map((r, i) => (
        <View key={r.label + i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} /> : null}
          <View style={{ gap: 3 }}>
            <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>{r.label}</Text>
            <Text style={{ fontSize: 14.5, fontWeight: "500", color: "#0a0a0a", lineHeight: 21 }}>{r.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// "อนุมัติแล้ว" status banner shown at the top of a registration detail.
export function ApprovedBanner({ when }: { when: string }) {
  return (
    <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(49,151,84,0.12)", alignItems: "center", justifyContent: "center" }}>
        <ShieldCheck size={22} color={BRAND_GREEN} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: BRAND_GREEN }}>อนุมัติแล้ว</Text>
        <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }}>สมัครเมื่อ {when}</Text>
      </View>
    </View>
  );
}
