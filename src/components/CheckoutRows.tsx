/**
 * The rows both checkouts are built from — the customer's page and the POS's
 * bill sheet. They ask the same questions (how are you paying, what does it come
 * to) and had answered them in two different shapes: the customer picked a
 * payment method on a screen of its own, the cashier picked one from a list in
 * front of them. One set of rows, so the two stay the same by construction.
 */
import { View, Text, Pressable, Image, type ImageSourcePropType } from "react-native";
import { Check } from "lucide-react-native";
import type { ComponentType } from "react";
import { BRAND_GREEN, TEXT_PRIMARY, TEXT_MUTED } from "../theme/tokens";

/** Lucide icons and the payment-method icons share this shape. */
type RowIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/** A labelled figure in a totals block. `strong` is the line that gets paid. */
export function SummaryRow({ label, value, strong, tint }: {
  label: string;
  value: string;
  strong?: boolean;
  /** Colours both halves — used by the redeem discount, which is a credit. */
  tint?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <Text style={{ fontSize: strong ? 14.5 : 13, fontWeight: strong ? "700" : "400", color: tint ?? (strong ? TEXT_PRIMARY : TEXT_MUTED), flexShrink: 1 }}>
        {label}
      </Text>
      <Text style={{ fontSize: strong ? 16 : 13, fontWeight: strong ? "800" : "600", color: tint ?? TEXT_PRIMARY }}>
        {value}
      </Text>
    </View>
  );
}

/** One choice in a list of them: pickup vs delivery, cash vs PromptPay. */
export function ChoiceRow({ Icon, image, label, desc, active, divider, onPress }: {
  Icon?: RowIcon;
  /** Some methods are a brand mark rather than an icon — PromptPay is a logo. */
  image?: ImageSourcePropType;
  label: string;
  desc?: string;
  active: boolean;
  divider?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:opacity-70"
      style={{
        minHeight: 60,
        paddingVertical: 12,
        gap: 12,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: "#f0f0f0",
      }}
    >
      {image ? (
        <View style={{ width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff", overflow: "hidden" }}>
          <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" resizeMethod="resize" />
        </View>
      ) : Icon ? (
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
          <Icon size={19} color={BRAND_GREEN} strokeWidth={2.2} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: TEXT_PRIMARY }}>{label}</Text>
        {desc ? <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }}>{desc}</Text> : null}
      </View>
      {/* A filled ring, not a tick: these are one-of-many, and the empty ring
          says the others are still available. */}
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: active ? BRAND_GREEN : "#cbd0cb", alignItems: "center", justifyContent: "center" }}>
        {active ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: BRAND_GREEN }} /> : null}
      </View>
    </Pressable>
  );
}

/** A switch you either take or leave — the free cup on a full stamp card. */
export function OfferRow({ Icon, label, desc, active, divider, onPress }: {
  Icon: RowIcon;
  label: string;
  desc?: string;
  active: boolean;
  divider?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:opacity-70"
      style={{ minHeight: 56, paddingVertical: 12, gap: 12, borderTopWidth: divider ? 1 : 0, borderTopColor: "#f0f0f0" }}
    >
      <Icon size={18} color={BRAND_GREEN} strokeWidth={2.2} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY }}>{label}</Text>
        {desc ? <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }}>{desc}</Text> : null}
      </View>
      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: active ? BRAND_GREEN : "#cbd0cb", backgroundColor: active ? BRAND_GREEN : "transparent", alignItems: "center", justifyContent: "center" }}>
        {active ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}
