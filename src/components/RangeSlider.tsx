import { useRef, useState } from "react";
import { View, PanResponder, type LayoutChangeEvent } from "react-native";
import { BRAND_GREEN } from "../theme/tokens";

const THUMB = 26;
const TRACK_H = 4;

/** Dual-thumb range slider (PanResponder, no native dep). Smooth because each
 *  thumb snapshots its start position on grant and moves by the gesture's dx;
 *  `onChange` fires live, `onRelease` fires once when the finger lifts. */
export function RangeSlider({
  min,
  max,
  low,
  high,
  step = 10,
  onChange,
  onRelease,
}: {
  min: number;
  max: number;
  low: number;
  high: number;
  step?: number;
  onChange: (low: number, high: number) => void;
  onRelease?: (low: number, high: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const span = Math.max(1, max - min);

  // Live values (refs so PanResponder closures read fresh values).
  const lowRef = useRef(low);
  const highRef = useRef(high);
  lowRef.current = low;
  highRef.current = high;
  const widthRef = useRef(0);
  // Start values captured when a drag begins (keeps motion 1:1 with the finger).
  const startLow = useRef(low);
  const startHigh = useRef(high);

  const usable = () => Math.max(1, widthRef.current - THUMB);
  const toX = (v: number) => ((v - min) / span) * usable();
  const snap = (v: number) => Math.round(v / step) * step;

  const makeResponder = (which: "low" | "high") =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startLow.current = lowRef.current;
        startHigh.current = highRef.current;
      },
      onPanResponderMove: (_e, g) => {
        const u = usable();
        if (which === "low") {
          let v = min + ((toX(startLow.current) + g.dx) / u) * span;
          v = snap(Math.max(min, Math.min(v, highRef.current - step)));
          if (v !== lowRef.current) onChange(v, highRef.current);
        } else {
          let v = min + ((toX(startHigh.current) + g.dx) / u) * span;
          v = snap(Math.min(max, Math.max(v, lowRef.current + step)));
          if (v !== highRef.current) onChange(lowRef.current, v);
        }
      },
      onPanResponderRelease: () => onRelease?.(lowRef.current, highRef.current),
      onPanResponderTerminate: () => onRelease?.(lowRef.current, highRef.current),
    });

  const lowPan = useRef(makeResponder("low")).current;
  const highPan = useRef(makeResponder("high")).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const lowX = width ? toX(low) : 0;
  const highX = width ? toX(high) : 0;

  return (
    <View onLayout={onLayout} style={{ height: THUMB, justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          left: THUMB / 2,
          right: THUMB / 2,
          height: TRACK_H,
          borderRadius: TRACK_H,
          backgroundColor: "#e3e6e3",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: THUMB / 2 + lowX,
          width: Math.max(0, highX - lowX),
          height: TRACK_H,
          borderRadius: TRACK_H,
          backgroundColor: BRAND_GREEN,
        }}
      />
      {(["low", "high"] as const).map((which) => {
        const x = which === "low" ? lowX : highX;
        const pan = which === "low" ? lowPan : highPan;
        return (
          <View
            key={which}
            {...pan.panHandlers}
            hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
            style={{
              position: "absolute",
              left: x,
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: "#fff",
              borderWidth: 2,
              borderColor: BRAND_GREEN,
              shadowColor: "#0a3d22",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 4,
              elevation: 3,
            }}
          />
        );
      })}
    </View>
  );
}
