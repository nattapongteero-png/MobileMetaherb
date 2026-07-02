/**
 * NumberStepper — numeric field with a value display + −/+ stepper group (pill
 * style). Extracted from PromotionCreateScreen so both the promotion and coupon
 * create screens share one implementation.
 */
import { View, TextInput, Pressable } from "react-native";
import { Plus, Minus } from "lucide-react-native";
import { TEXT_PRIMARY } from "../theme/tokens";

const FAFAFA = "#fafafa";
const PLACEHOLDER = "#a3a3a3";

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  const atMin = value <= min;
  const atMax = max != null && value >= max;
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(max != null ? Math.min(max, value + step) : value + step);
  const onType = (t: string) => {
    const n = Number(t.replace(/[^0-9]/g, "")) || 0;
    onChange(max != null ? Math.min(max, n) : n);
  };
  return (
    <View
      className="flex-row items-center"
      style={{ backgroundColor: FAFAFA, borderRadius: 999, height: 46, paddingLeft: 18, paddingRight: 6 }}
    >
      <TextInput
        value={value ? String(value) : ""}
        onChangeText={onType}
        keyboardType="number-pad"
        placeholder={placeholder ?? "0"}
        placeholderTextColor={PLACEHOLDER}
        style={{ flex: 1, fontSize: 14, color: TEXT_PRIMARY, paddingVertical: 0 }}
      />
      <View
        className="flex-row items-center"
        style={{ backgroundColor: "#fff", borderRadius: 999, height: 34, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden" }}
      >
        <Pressable onPress={dec} disabled={atMin} hitSlop={6} className="items-center justify-center active:opacity-70" style={{ width: 44, height: 34, opacity: atMin ? 0.35 : 1 }}>
          <Minus size={16} color={TEXT_PRIMARY} strokeWidth={2.6} />
        </Pressable>
        <View style={{ width: 1, height: 18, backgroundColor: "#e5e7eb" }} />
        <Pressable onPress={inc} disabled={atMax} hitSlop={6} className="items-center justify-center active:opacity-70" style={{ width: 44, height: 34, opacity: atMax ? 0.35 : 1 }}>
          <Plus size={16} color={TEXT_PRIMARY} strokeWidth={2.6} />
        </Pressable>
      </View>
    </View>
  );
}
