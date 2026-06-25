import { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, type View as RNView } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
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
 * outline + a rotated green chevron.
 */
export function GlassSelect<T extends string>({
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
        <Text style={{ fontSize: 14, fontWeight: "500", color: open ? BRAND_GREEN : "#374151" }}>{current}</Text>
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
                      {active ? <Check size={18} color={BRAND_GREEN} strokeWidth={2.8} /> : null}
                    </View>
                    <Text style={{ flex: 1, fontSize: 15, color: "#1c1c1e", fontWeight: active ? "600" : "400" }}>{o.label}</Text>
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
