import { Fragment, useRef, useState } from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Line, Circle, Path, Text as SvgText } from "react-native-svg";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import type { Point, SeriesKey } from "../data/salesReport";

type Series = { key: SeriesKey; color: string; label: string };
const DEFAULT_SERIES: [Series, Series] = [
  { key: "sales", color: "#319754", label: "ยอดขาย (฿)" },
  { key: "orders", color: "#f7931d", label: "จำนวนคำสั่งซื้อ" },
];

// Shade a hex color by ±percent — same helper as the web Bar3D.
const shade = (hex: string, percent: number) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
};

const fmtLeft = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${Math.round(v)}`);

/** Shared fixed height for every chart mode (line / bar / donut) — one constant
 *  so the card below never moves when the user switches tabs. */
export const CHART_BLOCK_H = 290;

// Web's Bar3D: front rect + lighter top face + darker right face.
function Bar3D({ x, y, width, height, fill }: { x: number; y: number; width: number; height: number; fill: string }) {
  if (height <= 0 || width <= 0) return null;
  const depth = Math.min(Math.max(width * 0.28, 4), 9);
  const top = shade(fill, 12);
  const right = shade(fill, -18);
  return (
    <>
      <Path d={`M${x + width},${y} L${x + width + depth},${y - depth} L${x + width + depth},${y + height - depth} L${x + width},${y + height} Z`} fill={right} />
      <Path d={`M${x},${y} L${x + depth},${y - depth} L${x + width + depth},${y - depth} L${x + width},${y} Z`} fill={top} />
      <Rect x={x} y={y} width={width} height={height} fill={fill} />
    </>
  );
}

// Smooth "monotone"-style path (Catmull-Rom → cubic bézier), like recharts' curves.
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

/** Primary series (left scale) + secondary series (right scale) — web parity:
 *  smooth dual lines / grouped 3D bars, and a press-and-drag tooltip that
 *  scrubs across points (mobile version of the web hover tooltip). */
export function SalesChart({ data, type, series = DEFAULT_SERIES, onSelect }: { data: Point[]; type: "bar" | "line"; series?: [Series, Series]; onSelect?: (label: string) => void }) {
  const [p, sec] = series;
  const [w, setW] = useState(0);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const lastIdx = useRef<number | null>(null);
  const H = 240;
  const padL = 34, padR = 28, padT = 16, padB = 26;
  const plotH = H - padT - padB;
  const plotW = Math.max(0, w - padL - padR);
  const n = data.length;
  const pMax = Math.max(1, ...data.map((d) => d[p.key] as number));
  const sMax = Math.max(1, ...data.map((d) => d[sec.key] as number));
  const step = n > 0 ? plotW / n : plotW;
  const cx = (i: number) => padL + step * i + step / 2;
  const yP = (v: number) => padT + plotH - (v / pMax) * plotH;
  const yS = (v: number) => padT + plotH - (v / sMax) * plotH;

  const pPath = smoothPath(data.map((d, i) => ({ x: cx(i), y: yP(d[p.key] as number) })));
  const sPath = smoothPath(data.map((d, i) => ({ x: cx(i), y: yS(d[sec.key] as number) })));
  const fracs = [1, 0.75, 0.5, 0.25, 0];

  // Grouped bars — two per point (web: barGap 6, maxBarSize 36).
  const barW = Math.min(20, step * 0.28);
  const gap = 6;

  // ---- Press-and-drag scrubbing (tooltip follows the nearest point) ----
  const idxFromX = (x: number) => Math.max(0, Math.min(n - 1, Math.round((x - padL - step / 2) / Math.max(1, step))));
  const scrub = (x: number) => {
    const i = idxFromX(x);
    if (lastIdx.current !== i) {
      lastIdx.current = i;
      Haptics.selectionAsync();
      setActiveIdx(i);
    }
  };
  const clear = () => { lastIdx.current = null; setActiveIdx(null); };
  // Long-press then pan — quick vertical swipes still scroll the page.
  const scrubGesture = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(180)
    .onStart((e) => scrub(e.x))
    .onUpdate((e) => scrub(e.x))
    .onEnd(clear)
    .onFinalize(clear);
  // Tap a bucket to drill into it (mobile stand-in for the web's chart click).
  // Only armed when the host passes onSelect, so other charts keep their old
  // scrub-only behaviour.
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      if (!onSelect || n === 0) return;
      Haptics.selectionAsync();
      onSelect(data[idxFromX(e.x)].label);
    });
  const gesture = onSelect ? Gesture.Race(scrubGesture, tapGesture) : scrubGesture;

  const active = activeIdx != null ? data[activeIdx] : null;

  // Tooltip placement — follows the point, clamped inside the chart width.
  const TIP_W = 172;
  const tipLeft = activeIdx != null ? Math.max(2, Math.min(w - TIP_W - 2, cx(activeIdx) - TIP_W / 2)) : 0;

  return (
    // Fixed block height (shared with SalesDonut) so switching chart tabs
    // never shifts the layout below the card.
    <View style={{ height: CHART_BLOCK_H }}>
      <GestureDetector gesture={gesture}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <Svg width={w} height={H}>
            {/* Grid + dual axis labels (web: #eef2f6 dashed, ticks #94a3b8) */}
            {fracs.map((f, i) => {
              const gy = padT + plotH - f * plotH;
              return (
                <Fragment key={`g${i}`}>
                  <Line x1={padL} y1={gy} x2={w - padR} y2={gy} stroke="#eef2f6" strokeWidth={1} strokeDasharray="4 6" />
                  <SvgText x={padL - 6} y={gy + 3} fontSize={9} fill="#94a3b8" textAnchor="end">{fmtLeft(f * pMax)}</SvgText>
                  <SvgText x={w - padR + 6} y={gy + 3} fontSize={9} fill="#94a3b8" textAnchor="start">{Math.round(f * sMax)}</SvgText>
                </Fragment>
              );
            })}

            {/* Scrub cursor — dashed line (line mode) / soft band (bar mode), like the web */}
            {activeIdx != null ? (
              type === "bar" ? (
                <Rect x={cx(activeIdx) - step / 2} y={padT} width={step} height={plotH} fill="rgba(148,163,184,0.08)" />
              ) : (
                <Line x1={cx(activeIdx)} y1={padT} x2={cx(activeIdx)} y2={padT + plotH} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />
              )
            ) : null}

            {type === "bar" ? (
              data.map((d, i) => {
                const hP = ((d[p.key] as number) / pMax) * plotH;
                const hS = ((d[sec.key] as number) / sMax) * plotH;
                return (
                  <Fragment key={`b${i}`}>
                    <Bar3D x={cx(i) - gap / 2 - barW} y={padT + plotH - hP} width={barW} height={hP} fill={p.color} />
                    <Bar3D x={cx(i) + gap / 2} y={padT + plotH - hS} width={barW} height={hS} fill={sec.color} />
                  </Fragment>
                );
              })
            ) : (
              <>
                <Path d={pPath} fill="none" stroke={p.color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
                {data.map((d, i) => <Circle key={`pd${i}`} cx={cx(i)} cy={yP(d[p.key] as number)} r={4} fill="#fff" stroke={p.color} strokeWidth={2} />)}
                <Path d={sPath} fill="none" stroke={sec.color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
                {data.map((d, i) => <Circle key={`sd${i}`} cx={cx(i)} cy={yS(d[sec.key] as number)} r={4} fill="#fff" stroke={sec.color} strokeWidth={2} />)}
                {/* Enlarged active dots while scrubbing (web activeDot) */}
                {activeIdx != null ? (
                  <>
                    <Circle cx={cx(activeIdx)} cy={yP(data[activeIdx][p.key] as number)} r={7} fill={p.color} stroke="#fff" strokeWidth={3} />
                    <Circle cx={cx(activeIdx)} cy={yS(data[activeIdx][sec.key] as number)} r={7} fill={sec.color} stroke="#fff" strokeWidth={3} />
                  </>
                ) : null}
              </>
            )}

            {data.map((d, i) => (
              <SvgText key={`x${i}`} x={cx(i)} y={H - 8} fontSize={9} fill={activeIdx === i ? "#374151" : "#9ca3af"} fontWeight={activeIdx === i ? "700" : "400"} textAnchor="middle">{d.label}</SvgText>
            ))}
          </Svg>
        ) : (
          <View style={{ height: H }} />
        )}

        {/* Tooltip — web style: white rounded card, label + colored value rows */}
        {active ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 2,
              left: tipLeft,
              width: TIP_W,
              backgroundColor: "#fff",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#f3f4f6",
              padding: 10,
              boxShadow: "0px 8px 28px rgba(0,0,0,0.12)",
              elevation: 6,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "500", color: "#6b7280", marginBottom: 6 }}>{active.label}</Text>
            <View style={{ gap: 5 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.color }} />
                  <Text numberOfLines={1} style={{ fontSize: 12, color: "#4b5563" }}>{p.label}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: p.color }}>
                  {p.key === "sales" ? `฿${(active[p.key] as number).toLocaleString()}` : (active[p.key] as number).toLocaleString()}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sec.color }} />
                  <Text numberOfLines={1} style={{ fontSize: 12, color: "#4b5563" }}>{sec.label}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: sec.color }}>{(active[sec.key] as number).toLocaleString()}</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
      </GestureDetector>

      <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
        <LegendPill color={p.color} label={p.label} />
        <LegendPill color={sec.color} label={sec.label} />
      </View>
    </View>
  );
}

// Web legend: tinted pill, series-colored text, dot with a soft ring.
export function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center" style={{ gap: 7, backgroundColor: color + "10", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 }}>
      <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: color + "25", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: "600", color }}>{label}</Text>
    </View>
  );
}
