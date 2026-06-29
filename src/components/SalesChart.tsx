import { useState } from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Line, Polyline, Circle, Text as SvgText } from "react-native-svg";
import type { Point } from "../data/salesReport";

const GREEN = "#319754";
const ORANGE = "#f7931d";

/** Sales (bars or line, green) + orders (line, orange) over the period — dual-scaled. */
export function SalesChart({ data, type }: { data: Point[]; type: "bar" | "line" }) {
  const [w, setW] = useState(0);
  const H = 220;
  const padL = 6, padR = 6, padT = 14, padB = 26;
  const plotH = H - padT - padB;
  const plotW = Math.max(0, w - padL - padR);
  const n = data.length;
  const salesMax = Math.max(1, ...data.map((d) => d.sales));
  const ordersMax = Math.max(1, ...data.map((d) => d.orders));
  const step = n > 0 ? plotW / n : plotW;
  const cx = (i: number) => padL + step * i + step / 2;
  const ySales = (v: number) => padT + plotH - (v / salesMax) * plotH;
  const yOrders = (v: number) => padT + plotH - (v / ordersMax) * plotH;
  const barW = Math.min(26, step * 0.5);

  const salesPts = data.map((d, i) => `${cx(i)},${ySales(d.sales)}`).join(" ");
  const ordersPts = data.map((d, i) => `${cx(i)},${yOrders(d.orders)}`).join(" ");
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
                  const h = (d.sales / salesMax) * plotH;
                  return <Rect key={`b${i}`} x={cx(i) - barW / 2} y={padT + plotH - h} width={barW} height={h} rx={4} fill={GREEN} opacity={0.92} />;
                })
              : <Polyline points={salesPts} fill="none" stroke={GREEN} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />}
            {type === "line" && data.map((d, i) => <Circle key={`sd${i}`} cx={cx(i)} cy={ySales(d.sales)} r={4} fill="#fff" stroke={GREEN} strokeWidth={2} />)}

            <Polyline points={ordersPts} fill="none" stroke={ORANGE} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => <Circle key={`od${i}`} cx={cx(i)} cy={yOrders(d.orders)} r={3} fill="#fff" stroke={ORANGE} strokeWidth={2} />)}

            {data.map((d, i) => (
              <SvgText key={`x${i}`} x={cx(i)} y={H - 8} fontSize={9} fill="#9ca3af" textAnchor="middle">{d.label}</SvgText>
            ))}
          </Svg>
        ) : (
          <View style={{ height: H }} />
        )}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 6 }}>
        <Legend color={GREEN} label="ยอดขาย (฿)" />
        <Legend color={ORANGE} label="คำสั่งซื้อ" />
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
