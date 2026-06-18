import { useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, type View as RNView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ChevronDown, Check, X } from "lucide-react-native";
import { CATEGORIES, type CategoryKey } from "../data/catalog";
import {
  useProductFilter,
  PRICE_MIN,
  PRICE_MAX,
  type CatFilter,
  type KindFilter,
  type SortKey,
} from "../context/ProductFilterContext";
import { RangeSlider } from "../components/RangeSlider";
import { GlassView } from "expo-glass-effect";
import { GlassIconButton } from "../components/GlassIconButton";
import { BRAND_GREEN } from "../theme/tokens";

const GROUPED_BG = "#f2f2f7"; // iOS systemGroupedBackground
const LABEL = "#1c1c1e";
const VALUE = "#8a8f8a";
const SEP = "rgba(60,60,67,0.12)";

const CAT_OPTIONS: { key: CatFilter; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  ...CATEGORIES.map((c) => ({ key: c.key as CatFilter, label: c.label })),
];

const KIND_OPTIONS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "flash", label: "สินค้า Flash Sale" },
  { key: "promo", label: "สินค้าโปรโมชัน" },
  { key: "recommended", label: "สินค้าแนะนำ" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "ใหม่ล่าสุด" },
  { key: "popular", label: "ยอดนิยม" },
  { key: "priceAsc", label: "ราคาน้อยไปมาก" },
  { key: "priceDesc", label: "ราคามากไปน้อย" },
];

// Oval (pill) select with an Apple-style floating pull-down menu: a frosted
// glass popover that overlays content, leading checkmark on the selected item,
// tap outside to dismiss.
function PillSelect<T extends string>({
  value,
  options,
  onSelect,
}: {
  value: T;
  options: { key: T; label: string }[];
  onSelect: (k: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0 });
  const ref = useRef<RNView>(null);
  const current = options.find((o) => o.key === value)?.label ?? "";

  const openMenu = () => {
    ref.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y: y + h + 6, width: w });
      setOpen(true);
    });
  };

  return (
    <View style={{ marginHorizontal: 16 }}>
      <Pressable ref={ref} onPress={() => (open ? setOpen(false) : openMenu())} className="active:opacity-80">
        <GlassView
          glassEffectStyle="regular"
          colorScheme="light"
          tintColor="rgba(255,255,255,0.6)"
          isInteractive
          style={{
            height: 50,
            paddingHorizontal: 18,
            borderRadius: 999,
            overflow: "hidden",
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: open ? BRAND_GREEN : "rgba(255,255,255,0.7)",
          }}
        >
          <Text style={{ flex: 1, fontSize: 16, color: LABEL }}>{current}</Text>
          <ChevronDown size={18} color="#6b7280" style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
        </GlassView>
      </Pressable>

      {/* Floating menu under the box — transparent backdrop (no dim) closes it;
          only one menu can be open at a time since the backdrop blocks others. */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View style={[styles.popoverShadow, { left: anchor.x, top: anchor.y, width: anchor.width }]}>
            <GlassView glassEffectStyle="regular" colorScheme="light" isInteractive tintColor="rgba(255,255,255,0.45)" style={styles.popover}>
              {options.map((o) => {
                const active = o.key === value;
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => {
                      onSelect(o.key);
                      setOpen(false);
                    }}
                    className="flex-row items-center active:opacity-50"
                    style={{ paddingHorizontal: 14, height: 46 }}
                  >
                    <View style={{ width: 26, alignItems: "flex-start" }}>
                      {active ? <Check size={18} color={LABEL} strokeWidth={2.8} /> : null}
                    </View>
                    <Text style={{ flex: 1, fontSize: 16, color: LABEL, fontWeight: active ? "600" : "400" }}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </GlassView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

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

// Price section keeps live drag values in local state so dragging only
// re-renders the slider + labels (not the whole filter list). Commits to the
// shared context when the finger lifts.
function PriceSection({
  valueMin,
  valueMax,
  onCommit,
}: {
  valueMin: number;
  valueMax: number;
  onCommit: (min: number, max: number) => void;
}) {
  const [lo, setLo] = useState(valueMin);
  const [hi, setHi] = useState(valueMax);
  // Sync when the external values change while not dragging (e.g. reset).
  const synced = useRef(`${valueMin}-${valueMax}`);
  if (synced.current !== `${valueMin}-${valueMax}`) {
    synced.current = `${valueMin}-${valueMax}`;
    if (lo !== valueMin) setLo(valueMin);
    if (hi !== valueMax) setHi(valueMax);
  }

  return (
    <View style={[styles.card, { paddingHorizontal: 16, paddingVertical: 14 }]}>
      <View className="flex-row items-center justify-between" style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: BRAND_GREEN }}>฿{lo.toLocaleString()}</Text>
        <View style={{ width: 18, height: 1.5, backgroundColor: "#cbd0cb" }} />
        <Text style={{ fontSize: 16, fontWeight: "700", color: BRAND_GREEN }}>฿{hi.toLocaleString()}</Text>
      </View>
      <RangeSlider
        min={PRICE_MIN}
        max={PRICE_MAX}
        low={lo}
        high={hi}
        step={10}
        onChange={(a, b) => {
          setLo(a);
          setHi(b);
        }}
        onRelease={(a, b) => onCommit(a, b)}
      />
    </View>
  );
}

export function ProductFilterScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const f = useProductFilter();

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      {/* Header — circular close / title / circular done (iOS sheet style) */}
      <View style={styles.header}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: LABEL }}>ตัวกรอง</Text>
        <Pressable onPress={() => nav.goBack()} hitSlop={8} accessibilityLabel="เสร็จ" className="active:opacity-80">
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            tintColor="rgba(49,151,84,0.92)"
            isInteractive
            style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center" }}
          >
            <Check size={22} color="#fff" strokeWidth={3} />
          </GlassView>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* หมวดหมู่ */}
        <Text style={styles.group}>หมวดหมู่</Text>
        <PillSelect value={f.cat} options={CAT_OPTIONS} onSelect={(k) => f.setCat(k as CategoryKey | "all")} />

        {/* ประเภทสินค้า */}
        <Text style={styles.group}>ประเภทสินค้า</Text>
        <View style={styles.card}>
          {KIND_OPTIONS.map((o, i) => (
            <RadioRow key={o.key} label={o.label} selected={f.kind === o.key} onPress={() => f.setKind(o.key)} divider={i > 0} />
          ))}
        </View>

        {/* ช่วงราคา */}
        <Text style={styles.group}>ช่วงราคา</Text>
        <PriceSection valueMin={f.priceMin} valueMax={f.priceMax} onCommit={(lo, hi) => f.setPrice(lo, hi)} />

        {/* เรียงตาม */}
        <Text style={styles.group}>เรียงตาม</Text>
        <PillSelect value={f.sort} options={SORT_OPTIONS} onSelect={(k) => f.setSort(k as SortKey)} />

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
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(118,118,128,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleBtnDone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND_GREEN,
    alignItems: "center",
    justifyContent: "center",
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
  popoverShadow: {
    position: "absolute",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 14,
  },
  popover: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.6)",
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: GROUPED_BG,
  },
  applyBtn: {
    height: 50,
    borderRadius: 9999,
    backgroundColor: BRAND_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  applyLabel: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
