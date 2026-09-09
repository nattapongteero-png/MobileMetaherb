/**
 * ช่องทางชำระเงิน — the picker list, as the customer's own screen draws it.
 *
 * The till and the app ask the same question and had two lists doing it. This
 * is the customer's, lifted unchanged: iOS-grouped card, 32pt mark, label over
 * a description, a 22pt radio on the right, hairlines between rows.
 */
import type { ComponentType } from "react";
import { View, Text, Pressable, Image, StyleSheet, type ImageSourcePropType } from "react-native";
import { BRAND_GREEN } from "../theme/tokens";

const LABEL = "#1c1c1e";
const VALUE = "#8a8f8a";
const SEP = "rgba(60,60,67,0.12)";

export type PayMethodOption = {
  id: string;
  label: string;
  desc: string;
  image?: ImageSourcePropType;
  Icon?: ComponentType<{ size?: number; color?: string }>;
};

export function PayMethodList({ options, selected, onSelect }: {
  options: PayMethodOption[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.card}>
      {options.map((m, i) => {
        const active = selected === m.id;
        return (
          <Pressable
            key={m.id}
            onPress={() => onSelect(m.id)}
            className="flex-row items-center active:opacity-70"
            style={[styles.row, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP } : null]}
          >
            <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
              {m.image ? (
                <Image source={m.image} style={{ width: 30, height: 30, borderRadius: 7 }} resizeMode="cover" resizeMethod="resize" />
              ) : m.Icon ? (
                <m.Icon size={22} color={active ? BRAND_GREEN : "#9ca3af"} />
              ) : null}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, color: LABEL, fontWeight: active ? "600" : "400" }}>{m.label}</Text>
              <Text style={{ fontSize: 12, color: VALUE, marginTop: 1 }}>{m.desc}</Text>
            </View>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: active ? BRAND_GREEN : "#cbd0cb", alignItems: "center", justifyContent: "center" }}>
              {active ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: BRAND_GREEN }} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 20, marginHorizontal: 16, overflow: "hidden" },
  row: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 12 },
});
