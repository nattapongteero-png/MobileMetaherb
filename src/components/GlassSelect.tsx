import { glassTint } from "../theme/tokens";
import { useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, TextInput, type View as RNView } from "react-native";
import { ChevronDown, Check, Search } from "lucide-react-native";
import { GlassView } from "expo-glass-effect";
import { BRAND_GREEN } from "../theme/tokens";
import { PressableScale } from "./PressableScale";

/**
 * Apple iOS 26 style pull-down select for a form field. Tapping the pill opens a
 * frosted Liquid-Glass popover that floats just under the trigger (measured in
 * window coords so it works inside a ScrollView), with a leading checkmark on the
 * active row and tap-outside-to-dismiss. Mirrors ProductFilterScreen's PillSelect
 * so every dropdown in the app feels native.
 *
 * The closed trigger keeps the form's gray pill look; while open it gains a green
 * outline + a rotated green chevron. Long lists scroll inside the popover;
 * `searchable` adds a filter box pinned above the options.
 */
export function GlassSelect<T extends string>({
  value,
  options,
  onSelect,
  placeholder,
  searchable = false,
  searchPlaceholder = "ค้นหา...",
}: {
  value: T;
  options: { key: T; label: string }[];
  onSelect: (k: T) => void;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0 });
  const ref = useRef<RNView>(null);
  const current = options.find((o) => o.key === value)?.label ?? "";

  const openMenu = () => {
    ref.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y: y + h + 6, width: w });
      setQuery("");
      setOpen(true);
    });
  };

  const q = query.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  return (
    <View>
      <PressableScale
        ref={ref}
        onPress={() => (open ? setOpen(false) : openMenu())}
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
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 14, fontWeight: "500", color: open ? BRAND_GREEN : current ? "#374151" : "#9ca3af" }}
        >
          {current || placeholder || ""}
        </Text>
        <ChevronDown
          size={18}
          color={open ? BRAND_GREEN : "#9ca3af"}
          strokeWidth={2.4}
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </PressableScale>

      {/* Floating glass menu — transparent backdrop (no dim) closes it on tap-out. */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View style={[styles.popoverShadow, { left: anchor.x, top: anchor.y, width: anchor.width }]}>
            <GlassView glassEffectStyle="regular" colorScheme="light" isInteractive tintColor={glassTint("rgba(255,255,255,0.45)", "rgba(255,255,255,0.9)")} style={styles.popover}>
              {searchable ? (
                <View
                  className="flex-row items-center"
                  style={{ marginHorizontal: 10, marginTop: 6, marginBottom: 4, height: 38, borderRadius: 12, paddingHorizontal: 12, gap: 8, backgroundColor: "rgba(118,118,128,0.12)" }}
                >
                  <Search size={15} color="#8e8e93" strokeWidth={2.2} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={searchPlaceholder}
                    placeholderTextColor="#a3a3a3"
                    style={{ flex: 1, fontSize: 14, color: "#1c1c1e", padding: 0 }}
                  />
                </View>
              ) : null}
              <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {visible.length === 0 ? (
                  <View style={{ paddingHorizontal: 14, height: 46, justifyContent: "center" }}>
                    <Text style={{ fontSize: 14, color: "#8e8e93" }}>ไม่พบตัวเลือก</Text>
                  </View>
                ) : (
                  visible.map((o) => {
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
                          {active ? <Check size={18} color={BRAND_GREEN} strokeWidth={2.8} /> : null}
                        </View>
                        <Text style={{ flex: 1, fontSize: 15, color: "#1c1c1e", fontWeight: active ? "600" : "400" }}>{o.label}</Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </GlassView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingVertical: 4,
  },
});
