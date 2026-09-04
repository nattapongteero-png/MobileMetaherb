import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { GlassView } from "expo-glass-effect";
import { BRAND_GREEN, GLASS_BAR_TINT } from "../theme/tokens";

/**
 * แถบปุ่มลอยท้ายจอ — the app's primary action bar, extracted.
 *
 * ProductDetail, CafeItemDetail, CafeMenuEdit, CafeOptionEdit, CafeArea and the
 * POS each had their own copy of the same recipe (glass capsule floating clear
 * of the bottom edge, its own drop shadow, round side actions + one wide pill).
 * Six copies meant six chances to drift, and they had: heights of 48 vs 50,
 * radius 34 vs 9999, some pinned flat to the edge instead of floating.
 *
 * `top` is the row above the buttons — จำนวน on the item page, ส่วนลด in the POS.
 */
export function GlassActionBar({ children, top }: { children: ReactNode; top?: ReactNode }) {
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
      <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
        <GlassView
          glassEffectStyle="regular"
          colorScheme="light"
          tintColor={GLASS_BAR_TINT}
          style={{ borderRadius: 34, overflow: "hidden", padding: 9, gap: 8 }}
        >
          {top}
          <View className="flex-row items-center" style={{ gap: 8 }}>{children}</View>
        </GlassView>
      </View>
    </View>
  );
}

/**
 * The one filled pill inside the bar — Von Restorff: exactly one thing on a
 * screen should look like THE action.
 */
export function PrimaryAction({ label, onPress, disabled, icon }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-1 flex-row items-center justify-center active:opacity-80"
      style={{ height: 50, borderRadius: 999, backgroundColor: BRAND_GREEN, gap: 7, opacity: disabled ? 0.4 : 1 }}
    >
      {icon}
      <Text style={{ color: "#fff", fontSize: 14.5, fontWeight: "700", lineHeight: 19 }}>{label}</Text>
    </Pressable>
  );
}
