import { modalTopPad } from "../theme/layout";
import { glassTint } from "../theme/tokens";
import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GlassView } from "expo-glass-effect";
import { X, Check } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { SORT_OPTIONS, type SortKey } from "../data/shopSort";
import { BRAND_GREEN } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

const GROUPED_BG = "#f2f2f7";
const LABEL = "#1c1c1e";
const SEP = "rgba(60,60,67,0.12)";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SortRoute = RouteProp<RootStackParamList, "ShopSort">;

function RadioRow({ label, selected, onPress, divider }: { label: string; selected: boolean; onPress: () => void; divider: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:opacity-70"
      style={[styles.row, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP }]}
    >
      <Text style={{ flex: 1, fontSize: 16, color: LABEL, fontWeight: selected ? "600" : "400" }}>{label}</Text>
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

/** Shop filter — iOS grouped sheet with category + sort sections (same shape as
 *  the Products filter). Applies both back to the Shop screen via popTo. */
export function ShopSortScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { current, category, categories } = useRoute<SortRoute>().params ?? {};

  const [sortSel, setSortSel] = useState<SortKey>(current ?? "popular");
  const [catSel, setCatSel] = useState<string>(category ?? "ทั้งหมด");
  const catList = categories && categories.length ? categories : ["ทั้งหมด"];

  // Apply both filters back to the Shop screen (dismisses this sheet). popTo
  // never pushes a duplicate, so sheets can't stack.
  const apply = () => nav.popTo("Shop", { sort: sortSel, category: catSel });

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* หมวดหมู่ */}
        <Text style={styles.group}>หมวดหมู่</Text>
        <View style={styles.card}>
          {catList.map((name, i) => (
            <RadioRow
              key={name}
              label={name === "ทั้งหมด" ? "ทุกหมวดหมู่" : name}
              selected={catSel === name}
              onPress={() => setCatSel(name)}
              divider={i > 0}
            />
          ))}
        </View>

        {/* เรียงลำดับ */}
        <Text style={styles.group}>เรียงลำดับ</Text>
        <View style={styles.card}>
          {SORT_OPTIONS.map((opt, i) => (
            <RadioRow
              key={opt.key}
              label={opt.label}
              selected={sortSel === opt.key}
              onPress={() => setSortSel(opt.key)}
              divider={i > 0}
            />
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
  card: { backgroundColor: "#fff", borderRadius: 20, marginHorizontal: 16, overflow: "hidden" },
  row: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 12 },
});
