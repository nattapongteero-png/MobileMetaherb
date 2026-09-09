import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
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

/**
 * The action that carries a count and a total — the café's cart bar, and the
 * POS's ชำระเงิน. Lifted from the customer's café screen: a gradient pill with
 * the number in a translucent chip, the label, and the amount at the far end.
 * The till used to put the amount in a block beside the button instead, which
 * made the same bar read as two different things.
 */
export function CountAction({ count, label, amount, onPress }: {
  count: number;
  label: string;
  amount: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="active:opacity-80" style={{ flex: 1, height: 50, borderRadius: 999, overflow: "hidden" }}>
      <LinearGradient
        colors={["#0b3d2e", "#1a7a4c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 }}
      >
        <View style={{ minWidth: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{count}</Text>
        </View>
        <Text style={{ flex: 1, color: "#fff", fontWeight: "800", fontSize: 15 }}>{label}</Text>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{amount}</Text>
      </LinearGradient>
    </Pressable>
  );
}

/**
 * The same pill as CountAction without a count or a total — for the steps that
 * only have one thing to say (ยืนยันรับเงิน, ลูกค้าชำระแล้ว, ขายรายการถัดไป).
 * They were flat green while the bill's button was a gradient, so the primary
 * changed colour as the cashier moved through the sale.
 */
export function GradientAction({ label, onPress, disabled, icon }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="active:opacity-80"
      style={{ flex: 1, height: 50, borderRadius: 999, overflow: "hidden", opacity: disabled ? 0.4 : 1 }}
    >
      <LinearGradient
        colors={["#0b3d2e", "#1a7a4c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }}
      >
        {icon}
        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}
