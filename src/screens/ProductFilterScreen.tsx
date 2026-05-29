import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Check } from "lucide-react-native";
import { CATEGORIES, TYPES, PRICE_RANGES, type CategoryKey, type TypeKey } from "../data/catalog";
import { useProductFilter, type SortKey } from "../context/ProductFilterContext";
import { BRAND_GREEN } from "../theme/tokens";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "ยอดนิยม" },
  { key: "priceAsc", label: "ราคาน้อยไปมาก" },
  { key: "priceDesc", label: "ราคามากไปน้อย" },
];

const GROUP_LABEL = "#6b6b70";
const TITLE = "#1c1c1e";

type Opt = { key: string; label: string; selected: boolean };
type Sect = { key: string; title: string; options: Opt[] };

/** Coupon-style selectable card (matches the picker in PaymentScreen). */
function OptionCard({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:opacity-80"
      style={{
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: selected ? BRAND_GREEN : "#e5e7eb",
        backgroundColor: selected ? "rgba(49,151,84,0.06)" : "#ffffff",
        gap: 12,
      }}
    >
      <Text style={{ flex: 1, fontSize: 15, color: "#0a0a0a", lineHeight: 20 }} numberOfLines={1}>
        {label}
      </Text>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderColor: selected ? BRAND_GREEN : "#a3a3a3",
          backgroundColor: selected ? BRAND_GREEN : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <Check size={14} color="white" strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

export function ProductFilterScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const f = useProductFilter();

  const sections: Sect[] = [
    {
      key: "sort",
      title: "เรียงตาม",
      options: SORT_OPTIONS.map((s) => ({ key: s.key, label: s.label, selected: f.sort === s.key })),
    },
    {
      key: "category",
      title: "หมวดหมู่",
      options: [
        { key: "all", label: "ทั้งหมด", selected: f.cat === "all" },
        ...CATEGORIES.map((c) => ({ key: c.key, label: c.label, selected: f.cat === c.key })),
      ],
    },
    {
      key: "type",
      title: "ประเภทสินค้า · เลือกได้หลายอย่าง",
      options: TYPES.map((t) => ({ key: t.key, label: t.label, selected: f.types.includes(t.key) })),
    },
    {
      key: "price",
      title: "ช่วงราคา",
      options: PRICE_RANGES.map((r) => ({ key: r.key, label: r.label, selected: f.priceKey === r.key })),
    },
  ];

  const onSelect = (group: string, key: string) => {
    if (group === "sort") f.setSort(key as SortKey);
    else if (group === "category") f.setCat(key as CategoryKey | "all");
    else if (group === "type") f.toggleType(key as TypeKey);
    else if (group === "price") f.setPriceKey(key);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <Pressable onPress={f.reset} hitSlop={12} style={styles.side}>
          <Text style={{ fontSize: 16, color: f.activeCount > 0 ? BRAND_GREEN : "#c4c4c6" }}>ล้าง</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "700", color: TITLE }}>ตัวกรอง</Text>
        <Pressable onPress={() => nav.goBack()} hitSlop={12} style={[styles.side, { alignItems: "flex-end" }]}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: BRAND_GREEN }}>เสร็จ</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.key} style={{ marginBottom: 22 }}>
            <Text style={styles.groupTitle}>{section.title}</Text>
            <View style={{ gap: 10 }}>
              {section.options.map((o) => (
                <OptionCard
                  key={o.key}
                  label={o.label}
                  selected={o.selected}
                  onPress={() => onSelect(section.key, o.key)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Apply */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={() => nav.goBack()} style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.applyLabel}>ดูสินค้า ({f.products.length})</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  side: { minWidth: 64, justifyContent: "center" },
  groupTitle: { fontSize: 13, lineHeight: 18, color: GROUP_LABEL, marginBottom: 10 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
  },
  applyBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  applyLabel: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
});
