import { glassTint } from "../theme/tokens";
import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { Check, X } from "lucide-react-native";
import { GlassView } from "expo-glass-effect";
import { GlassIconButton } from "../components/GlassIconButton";
import { BRAND_GREEN } from "../theme/tokens";
import { modalTopPad } from "../theme/layout";
import type { RootStackParamList } from "../navigation/RootStack";
import type { PMStatus } from "./MyShopScreen";

const GROUPED_BG = "#f2f2f7"; // iOS systemGroupedBackground
const LABEL = "#1c1c1e";
const SEP = "rgba(60,60,67,0.12)";

const STATUS_OPTIONS: { key: "all" | PMStatus; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "เปิดขาย", label: "เปิดขาย" },
  { key: "ปิดขาย", label: "ปิดขาย" },
  { key: "สินค้าหมด", label: "สินค้าหมด" },
];

const TYPE_OPTIONS: { key: "regular" | "material"; label: string }[] = [
  { key: "regular", label: "ผลิตภัณฑ์" },
  { key: "material", label: "วัตถุดิบ (Herbal Market)" },
];

function RadioRow({ label, selected, onPress, divider, count }: { label: string; selected: boolean; onPress: () => void; divider: boolean; count?: number }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:opacity-70"
      style={[styles.row, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP }]}
    >
      <Text style={{ flex: 1, fontSize: 16, color: LABEL, fontWeight: selected ? "600" : "400" }}>{label}</Text>
      {count != null ? (
        <Text style={{ fontSize: 14, color: "#8a8f8a", marginRight: 12 }}>{count.toLocaleString()}</Text>
      ) : null}
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? BRAND_GREEN : "#cbd0cb",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: BRAND_GREEN }} /> : null}
      </View>
    </Pressable>
  );
}

/** ตัวกรองจัดการสินค้า — same iOS-sheet shell as the customer ผลิตภัณฑ์ filter
 *  (grouped bg, X / title / green ✓ header, white radio cards). X cancels;
 *  ✓ hands the picks back to the list via the onApply callback. */
export function ShopProductFilterScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { status, productType, counts, onApply } =
    useRoute<RouteProp<RootStackParamList, "ShopProductFilter">>().params;

  const [st, setSt] = useState<"all" | PMStatus>(status);
  const [tp, setTp] = useState<"regular" | "material">(productType);

  const apply = () => {
    nav.goBack();
    onApply?.(st, tp);
  };

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      {/* Header — circular close / title / circular done (iOS sheet style) */}
      {/* Android: clear the status bar (iOS modal card already starts below it) */}
      <View style={[styles.header, { paddingTop: 16 + modalTopPad(insets.top) }]}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: LABEL }}>ตัวกรอง</Text>
        <Pressable onPress={apply} hitSlop={8} accessibilityLabel="เสร็จ" className="active:opacity-80">
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            tintColor={glassTint("rgba(49,151,84,0.92)", "#319754")}
            isInteractive
            style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center" }}
          >
            <Check size={22} color="#fff" strokeWidth={3} />
          </GlassView>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* ประเภทสินค้า — ผลิตภัณฑ์ / วัตถุดิบ (switches the list's tab) */}
        <Text style={styles.group}>ประเภทสินค้า</Text>
        <View style={styles.card}>
          {TYPE_OPTIONS.map((t, i) => (
            <RadioRow key={t.key} label={t.label} count={counts[t.key].all} selected={tp === t.key} onPress={() => setTp(t.key)} divider={i > 0} />
          ))}
        </View>

        {/* สถานะสินค้า — counts follow the type picked above */}
        <Text style={styles.group}>สถานะสินค้า</Text>
        <View style={styles.card}>
          {STATUS_OPTIONS.map((o, i) => (
            <RadioRow key={o.key} label={o.label} count={counts[tp][o.key]} selected={st === o.key} onPress={() => setSt(o.key)} divider={i > 0} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  group: {
    fontSize: 13,
    color: "#6b6b70",
    marginTop: 18,
    marginBottom: 7,
    marginLeft: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
