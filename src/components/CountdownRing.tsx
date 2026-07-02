import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";

/**
 * Circular countdown — remaining time (MM:SS) in the centre + a ring that
 * depletes as time runs out. When done the ring is full and reads "พร้อม".
 * Presentational: the parent ticks and passes frac/clock/done.
 * Styled white for a coloured (green) background.
 */
export function CountdownRing({
  frac,
  clock,
  done,
  size = 86,
}: {
  frac: number;
  clock: string;
  done: boolean;
  size?: number;
}) {
  const stroke = 6, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const shown = done ? 1 : frac;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.25)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#ffffff"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - shown)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ color: "#fff", fontSize: done ? size * 0.2 : size * 0.23, fontWeight: "900" }}>{done ? "พร้อม" : clock}</Text>
      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 9, fontWeight: "700", marginTop: 1 }}>{done ? "รับได้" : "เหลือ"}</Text>
    </View>
  );
}
