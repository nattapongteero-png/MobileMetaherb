import { GlassView } from "expo-glass-effect";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BookOpen,
  Home as HomeIcon,
  Leaf,
  User,
  type LucideIcon,
} from "lucide-react-native";
import { BRAND_GREEN } from "../theme/tokens";

export type TabKey = "home" | "products" | "knowledge" | "account";

const TABS: { key: TabKey; Icon: LucideIcon; label: string }[] = [
  { key: "home", Icon: HomeIcon, label: "หน้าแรก" },
  { key: "products", Icon: Leaf, label: "ผลิตภัณฑ์" },
  { key: "knowledge", Icon: BookOpen, label: "สาระความรู้" },
  { key: "account", Icon: User, label: "บัญชี" },
];

const INACTIVE = "#5b6472";

/**
 * Floating tab bar using Apple's real iOS 26 Liquid Glass material via
 * expo-glass-effect's <GlassView> (UIGlassEffect / UIVisualEffectView).
 * Falls back to a plain translucent view below iOS 26. First-party Expo
 * module — no config plugin (per AGENTS.md).
 */
export function LiquidGlassTabBar({
  activeKey = "home",
  onTabPress,
}: {
  activeKey?: TabKey;
  onTabPress?: (key: TabKey) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.shadow}>
        <GlassView
          glassEffectStyle="regular"
          colorScheme="light"
          isInteractive
          style={styles.bar}
        >
          <View style={styles.row}>
            {TABS.map((t) => {
              const active = t.key === activeKey;
              const color = active ? BRAND_GREEN : INACTIVE;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => onTabPress?.(t.key)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.item,
                    pressed && { opacity: 0.55 },
                  ]}
                >
                  <View style={[styles.itemInner, active && styles.itemActive]}>
                    <t.Icon size={23} color={color} strokeWidth={active ? 2.5 : 2} />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.label,
                        { color },
                        active && styles.labelActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </GlassView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    alignItems: "stretch",
  },
  // Shadow lives on a wrapper so it isn't clipped by the glass view's radius.
  shadow: {
    borderRadius: 31,
    shadowColor: "#0a3d22",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 14,
  },
  bar: {
    height: 62,
    borderRadius: 31,
    overflow: "hidden",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  itemActive: {
    backgroundColor: "rgba(49,151,84,0.16)",
  },
  label: {
    fontSize: 10,
    lineHeight: 14,
    includeFontPadding: false,
  },
  labelActive: {
    fontWeight: "600",
  },
});
