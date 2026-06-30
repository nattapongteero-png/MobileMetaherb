import { useState } from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Line, Polyline, Circle, Text as SvgText } from "react-native-svg";
import type { Point, SeriesKey } from "../data/salesReport";

type Series = { key: SeriesKey; color: string; label: string };
const DEFAULT_SERIES: [Series, Series] = [
  { key: "sales", color: "#319754", label: "ยอดขาย (฿)" },
  { key: "orders", color: "#f7931d", label: "คำสั่งซื้อ" },
];

/** Primary series (bars or line, left scale) + secondary series (line, right scale). */
export function SalesChart({ data, type, series = DEFAULT_SERIES }: { data: Point[]; type: "bar" | "line"; series?: [Series, Series] }) {
  const [p, sec] = series;
  const [w, setW] = useState(0);
  const H = 220;
  const padL = 6, padR = 6, padT = 14, padB = 26;
  const plotH = H - padT - padB;
  const plotW = Math.max(0, w - padL - padR);
  const n = data.length;
  const pMax = Math.max(1, ...data.map((d) => d[p.key] as number));
  const sMax = Math.max(1, ...data.map((d) => d[sec.key] as number));
  const step = n > 0 ? plotW / n : plotW;
  const cx = (i: number) => padL + step * i + step / 2;
  const yP = (v: number) => padT + plotH - (v / pMax) * plotH;
  const yS = (v: number) => padT + plotH - (v / sMax) * plotH;
  const barW = Math.min(26, step * 0.5);

  const pPts = data.map((d, i) => `${cx(i)},${yP(d[p.key] as number)}`).join(" ");
  const sPts = data.map((d, i) => `${cx(i)},${yS(d[sec.key] as number)}`).join(" ");
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => padT + plotH - f * plotH);

  return (
    <View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <Svg width={w} height={H}>
            {grid.map((gy, i) => (
              <Line key={`g${i}`} x1={padL} y1={gy} x2={w - padR} y2={gy} stroke="#eef2f6" strokeWidth={1} strokeDasharray="4 6" />
            ))}

            {type === "bar"
              ? data.map((d, i) => {
                  const h = ((d[p.key] as number) / pMax) * plotH;
                  return <Rect key={`b${i}`} x={cx(i) - barW / 2} y={padT + plotH - h} width={barW} height={h} rx={4} fill={p.color} opacity={0.92} />;
                })
              : <Polyline points={pPts} fill="none" stroke={p.color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />}
            {type === "line" && data.map((d, i) => <Circle key={`pd${i}`} cx={cx(i)} cy={yP(d[p.key] as number)} r={4} fill="#fff" stroke={p.color} strokeWidth={2} />)}

            <Polyline points={sPts} fill="none" stroke={sec.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => <Circle key={`sd${i}`} cx={cx(i)} cy={yS(d[sec.key] as number)} r={3} fill="#fff" stroke={sec.color} strokeWidth={2} />)}

            {data.map((d, i) => (
              <SvgText key={`x${i}`} x={cx(i)} y={H - 8} fontSize={9} fill="#9ca3af" textAnchor="middle">{d.label}</SvgText>
            ))}
          </Svg>
        ) : (
          <View style={{ height: H }} />
        )}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 6 }}>
        <Legend color={p.color} label={p.label} />
        <Legend color={sec.color} label={sec.label} />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontSize: 11, color: "#6b7280" }}>{label}</Text>
    </View>
  );
}
