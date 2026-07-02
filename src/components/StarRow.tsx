import { View, Pressable } from "react-native";
import { Star } from "lucide-react-native";

/** 1–5 star rating (0 = unrated). Amber, to match order reviews. Interactive
 *  when `onChange` is given; otherwise it renders as a read-only display. */
export function StarRow({ value, onChange, size = 22 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => {
        const star = <Star size={size} color="#f7931d" fill={s <= value ? "#f7931d" : "transparent"} strokeWidth={1.8} />;
        return onChange ? (
          <Pressable key={s} onPress={() => onChange(s)} hitSlop={4} className="active:opacity-70">
            {star}
          </Pressable>
        ) : (
          <View key={s}>{star}</View>
        );
      })}
    </View>
  );
}
