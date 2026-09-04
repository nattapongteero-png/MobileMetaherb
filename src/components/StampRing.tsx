import { View, Image } from "react-native";
import Svg, { Circle, Path, Text as SvgText, TextPath } from "react-native-svg";
import { BRAND_GREEN_DARK } from "../theme/tokens";

const CUP = require("../../assets/coffeecup.png");

/** Sweep the bar uses for 0–100%, centred on 12 o'clock. */
const GAUGE_DEG = 200;
/** Fraction of the ring that is ever on screen — the rest is cropped away. */
const CROP = 0.56;

/**
 * The stamp card as a ring: a dark arc that opens from 12 o'clock to both
 * sides, the count curved along it, and a coffee cup on the green disc inside,
 * clipped by the disc's own edge.
 *
 * One component so the member card and the member page cannot drift apart; the
 * whole thing scales off `size`.
 */
export function StampRing({
  size,
  points,
  redeemAt,
  showCount = true,
  crop = CROP,
}: {
  size: number;
  points: number;
  redeemAt: number;
  /** The list card is too small for legible text on the arc. */
  showCount?: boolean;
  /** Fraction of the ring left visible; the rest is cropped away. */
  crop?: number;
}) {
  const ringW = Math.round(size * 0.123);
  const ringR = (size - ringW) / 2;
  const ringC = 2 * Math.PI * ringR;
  const disc = size - ringW * 2 - Math.round(size * 0.045);
  const pct = Math.min(1, redeemAt > 0 ? points / redeemAt : 0);

  const arcLen = (deg: number) => (ringC * deg) / 360;
  const arcRot = (deg: number) => -90 - deg / 2;

  // Invisible arc the count is set on, so the label bends with the bar.
  const lblPt = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [size / 2 + ringR * Math.cos(a), size / 2 + ringR * Math.sin(a)];
  };
  const [x1, y1] = lblPt(-60);
  const [x2, y2] = lblPt(60);
  const lblPath = `M ${x1} ${y1} A ${ringR} ${ringR} 0 0 1 ${x2} ${y2}`;
  const pathId = `countArc-${Math.round(size)}`;

  const cupW = disc * 0.52;
  const cupH = cupW * 1.33;
  // The disc's own crop hides the bottom of the cup, so a fill measured from
  // the true bottom spends its first third where nobody can see it — 3/10
  // looked identical to 0/10. Measure from the crop line instead.
  const discTop = ringW + Math.round(size * 0.022);
  const cupTop = discTop + disc * 0.12;
  const hidden = Math.max(0, cupTop + cupH - size * crop);
  const visibleCupH = cupH - hidden;
  const countSize = Math.max(11, Math.round(size * 0.047));

  return (
    <View style={{ height: size * crop, width: size, overflow: "hidden" }}>
      <View style={{ width: size, height: size, alignItems: "center" }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Circle cx={size / 2} cy={size / 2} r={ringR} stroke="#f0f2f0" strokeWidth={ringW} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={ringR}
            stroke="#171717"
            strokeWidth={ringW}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${arcLen(GAUGE_DEG * pct)} ${ringC}`}
            transform={`rotate(${arcRot(GAUGE_DEG * pct)} ${size / 2} ${size / 2})`}
          />
          {showCount ? (
            <>
              <Path id={pathId} d={lblPath} fill="none" stroke="none" />
              <SvgText fill="#fff" fontSize={countSize} fontWeight="800" textAnchor="middle" dy={countSize * 0.36}>
                <TextPath href={`#${pathId}`} startOffset="50%">
                  {`${points}/${redeemAt}`}
                </TextPath>
              </SvgText>
            </>
          ) : null}
        </Svg>

        {/* Green disc with the cup hanging past its bottom edge, clipped by it */}
        <View
          style={{
            position: "absolute",
            top: discTop,
            width: disc,
            height: disc,
            borderRadius: disc / 2,
            backgroundColor: BRAND_GREEN_DARK,
            overflow: "hidden",
            alignItems: "center",
          }}
        >
          {/* The cup fills from the bottom as points come in: a dimmed copy is
              the empty part, and a bottom-anchored crop of the same image at
              full strength is the earned part. At 10/10 the whole cup is solid. */}
          <View style={{ width: cupW, height: cupH, marginTop: disc * 0.12 }}>
            <Image source={CUP} resizeMode="contain" style={{ width: cupW, height: cupH, opacity: 0.22 }} />
            <View style={{ position: "absolute", left: 0, right: 0, bottom: hidden, height: visibleCupH * pct, overflow: "hidden" }}>
              <Image source={CUP} resizeMode="contain" style={{ position: "absolute", bottom: -hidden, width: cupW, height: cupH }} />
            </View>
          </View>
        </View>
      </View>

    </View>
  );
}
