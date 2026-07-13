import { GLASS_BAR_TINT } from "../theme/tokens";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View, Text, Pressable, Animated, PanResponder } from "react-native";
import { GlassView } from "expo-glass-effect";
import { FileText, ReceiptText, ShieldCheck } from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";

// GlassView isn't animatable on its own — wrap it so borderRadius can morph.
const AnimatedGlass = Animated.createAnimatedComponent(GlassView);

type Props = {
  selectedCount: number;
  /** Total pieces across selected lines (sum of quantities). */
  totalPieces: number;
  subtotal: number;
  discount: number;
  grandTotal: number;
  payDisabled: boolean;
  onPay: () => void;
  /** ออกใบ — Purchase Requisition. */
  onPR: () => void;
  /** ขอใบเสนอราคา — Request for Quotation. */
  onRFQ: () => void;
  /** Distinct suppliers in the selection — a PR is issued per supplier. */
  supplierCount: number;
};

/** Imperative handle so the cart list can collapse the sheet on scroll. */
export type CheckoutSheetHandle = { collapse: () => void };

/**
 * Apple Maps (iOS 26) style floating checkout sheet. A Liquid Glass card that
 * hovers above the bottom and can be dragged up to expand the order summary,
 * or tapped on its grabber to toggle. Collapsed it shows only the total + pay
 * action; expanded it reveals the full "สรุปคำสั่งซื้อ" breakdown above the row.
 *
 * Built on RN's own Animated + PanResponder (no extra gesture dep — see
 * AGENTS.md "Don't"). The summary height is animated on the JS driver because
 * layout height isn't supported by the native driver.
 */
export const CheckoutSheet = forwardRef<CheckoutSheetHandle, Props>(function CheckoutSheet(
  {
    selectedCount,
    totalPieces,
    subtotal,
    discount,
    grandTotal,
    payDisabled,
    onPay,
    onPR,
    onRFQ,
    supplierCount,
  }: Props,
  ref,
) {
  // Default to expanded — the order summary is open when the cart first appears.
  const expand = useRef(new Animated.Value(1)).current;
  const expandedRef = useRef(true);
  const [, force] = useState(0); // re-render when contentH first measured
  const [expanded, setExpanded] = useState(true); // collapsed = total+pay; expanded = full-width pay
  const contentHRef = useRef(0);

  const snapTo = (toExpanded: boolean, velocity = 0) => {
    expandedRef.current = toExpanded;
    setExpanded(toExpanded); // collapsed shows the total block; expanded grows pay full-width

    // Keep only the velocity component heading TOWARD the target, so a release
    // never kicks the sheet the wrong way first (the "spring back up one beat,
    // then go down" hitch) before settling.
    const v = toExpanded ? Math.max(0, velocity) : Math.min(0, velocity);
    Animated.spring(expand, {
      toValue: toExpanded ? 1 : 0,
      velocity: v,
      useNativeDriver: false,
      stiffness: 220,
      damping: 30, // ~critical: settles fast with no overshoot/bounce
      mass: 1,
      // Tight rest thresholds → the layout settles cleanly with no end-of-spring shimmer.
      restDisplacementThreshold: 0.0005,
      restSpeedThreshold: 0.0005,
    }).start();
  };

  // Drag the grabber to expand/collapse; a gesture that never actually moves is
  // treated as a tap. `movedRef` tracks whether the finger crossed the drag
  // threshold during this gesture so a drag-out-and-back (net ~0) snaps by
  // position/velocity instead of misfiring as a tap and flipping the sheet.
  const movedRef = useRef(false);
  // One gesture engine, two entry points. `movedRef` tracks whether the finger
  // crossed the drag threshold, so a drag-out-and-back (net ~0) snaps by
  // position/velocity instead of misfiring as a tap. Only the grabber allows a
  // no-move TAP to toggle; the larger drag zones (total block, summary body)
  // are drag-only, so tapping a label never surprises the user by flipping it.
  const makePan = (allowTap: boolean) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 3,
      onPanResponderGrant: () => {
        movedRef.current = false;
      },
      onPanResponderMove: (_e, g) => {
        if (Math.abs(g.dy) > 3) movedRef.current = true;
        const h = contentHRef.current;
        if (!h) return;
        const start = expandedRef.current ? 1 : 0;
        expand.setValue(Math.max(0, Math.min(1, start - g.dy / h)));
      },
      onPanResponderRelease: (_e, g) => {
        if (!movedRef.current) {
          if (allowTap) snapTo(!expandedRef.current); // grabber tap toggles
          return;
        }
        const h = contentHRef.current || 1;
        // Finger velocity (px/ms, up = negative) → expand units/sec, clamped so a
        // hard flick still settles smoothly instead of overshooting wildly.
        const v = Math.max(-6, Math.min(6, (-g.vy / h) * 1000));
        // A gentle flick is enough to commit either direction.
        if (g.vy < -0.25) return snapTo(true, v);
        if (g.vy > 0.25) return snapTo(false, v);
        const start = expandedRef.current ? 1 : 0;
        const cur = Math.max(0, Math.min(1, start - g.dy / h));
        snapTo(cur > 0.5, v); // past halfway → settle open, else closed
      },
    });
  const grabberPan = useRef(makePan(true)).current;
  const dragPan = useRef(makePan(false)).current;

  // Let the cart list collapse the sheet when the user scrolls to browse items.
  useImperativeHandle(ref, () => ({
    collapse: () => {
      if (expandedRef.current) snapTo(false);
    },
  }));

  const summaryHeight = expand.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHRef.current],
    extrapolate: "clamp",
  });

  // Apple Maps-style growth, all driven by `expand`. Collapsed = a floating pill
  // (24px side gaps, 18px bottom gap). Expanded = a bigger floating card that
  // moves CLOSER to the edges but still keeps a small gap (never fully flush) and
  // stays rounded on every corner. padBottom keeps it clear of the home indicator.
  const padX = expand.interpolate({ inputRange: [0, 1], outputRange: [24, 10], extrapolate: "clamp" });
  const padBottom = expand.interpolate({ inputRange: [0, 1], outputRange: [18, 10], extrapolate: "clamp" });
  // Expanded: top corners get a normal sheet radius (~32); bottom corners ~44 ≈
  // an iPhone screen-corner radius minus the inset, so the bottom looks concentric
  // with the phone's corners while the top stays a calm rounded edge.
  const rTop = expand.interpolate({ inputRange: [0, 1], outputRange: [48, 32], extrapolate: "clamp" });
  const rBottom = expand.interpolate({ inputRange: [0, 1], outputRange: [48, 44], extrapolate: "clamp" });
  // Inner CONTENT padding (content → box edge): collapsed stays a tight uniform
  // 12; expanded breathes to 16 on the sides/bottom (top is the grabber, normal).
  const glassPadX = expand.interpolate({ inputRange: [0, 1], outputRange: [12, 16], extrapolate: "clamp" });
  const glassPadBottom = expand.interpolate({ inputRange: [0, 1], outputRange: [12, 16], extrapolate: "clamp" });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        // Animate the container's own edges (not padding) — moving an absolute
        // view's frame reliably reaches the screen edge, whereas animating
        // padding around the native GlassView can leave it short of flush.
        left: padX,
        right: padX,
        bottom: padBottom,
      }}
    >
      <Animated.View
        style={{
          borderTopLeftRadius: rTop,
          borderTopRightRadius: rTop,
          borderBottomLeftRadius: rBottom,
          borderBottomRightRadius: rBottom,
          borderCurve: "continuous",
          shadowColor: "#0a3d22",
          shadowOffset: { width: 0, height: 9 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 14,
        }}
      >
        <AnimatedGlass
          glassEffectStyle="regular"
          colorScheme="light"
            tintColor={GLASS_BAR_TINT}
          style={{
            borderTopLeftRadius: rTop,
            borderTopRightRadius: rTop,
            borderBottomLeftRadius: rBottom,
            borderBottomRightRadius: rBottom,
            borderCurve: "continuous",
            overflow: "hidden",
            paddingLeft: glassPadX,
            paddingRight: glassPadX,
            paddingBottom: glassPadBottom,
          }}
        >
          {/* Grabber — 12px tall so the gap above the button equals the side/
              bottom gaps (uniform 12 around the action row). Tap toggles; the
              total block + summary body remain the larger drag targets. */}
          <View {...grabberPan.panHandlers} style={{ height: 12, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.2)" }} />
          </View>

          {/* Expandable order summary — height animates 0 → measured content.
              Its body is a drag handle too, so you can fling it back down. */}
          <Animated.View style={{ height: summaryHeight, opacity: expand, overflow: "hidden" }}>
            <View
              {...dragPan.panHandlers}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (h > 0 && Math.abs(h - contentHRef.current) > 0.5) {
                  contentHRef.current = h;
                  force((n) => n + 1); // bind the interpolation to the real height
                }
              }}
              style={{ paddingBottom: 10 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a", marginBottom: 10, lineHeight: 20 }}>
                สรุปคำสั่งซื้อ
              </Text>
              <SummaryRow label="รายการที่เลือก" value={`${selectedCount} รายการ`} color={BRAND_GREEN_DARK} />
              <SummaryRow label={`ยอดสินค้า (${totalPieces} ชิ้น)`} value={`฿${subtotal.toFixed(0)}`} color="#0a0a0a" />
              {discount > 0 ? (
                <SummaryRow label="ส่วนลด" value={`-฿${discount.toFixed(0)}`} color="#ee4d2d" />
              ) : null}
              <SummaryRow label="ค่าจัดส่ง" value="ฟรี" color={BRAND_GREEN_DARK} />

              <View
                className="flex-row items-center justify-between"
                style={{ borderTopWidth: 1, borderTopColor: "#ececec", marginTop: 6, paddingTop: 10 }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a", lineHeight: 18 }}>รวมทั้งสิ้น</Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#ee4d2d", lineHeight: 22 }}>
                  ฿{grandTotal.toFixed(0)}
                </Text>
              </View>

              <View className="flex-row items-center" style={{ marginTop: 10, gap: 6 }}>
                <ShieldCheck size={14} color={BRAND_GREEN} />
                <Text style={{ fontSize: 11, color: "#525252", lineHeight: 14 }}>คุ้มครองการสั่งซื้อโดย METAHERB</Text>
              </View>

              {/* Full-label PR / RFQ actions — below the protection note. */}
              <View className="flex-row" style={{ gap: 10, marginTop: 14 }}>
                <Pressable
                  onPress={onPR}
                  className="flex-1 flex-row items-center justify-center active:opacity-80"
                  style={{ height: 50, borderRadius: 999, backgroundColor: "rgba(49,151,84,0.1)", gap: 6 }}
                  accessibilityLabel="ออกใบ PR"
                >
                  <FileText size={16} color="#319754" strokeWidth={2.2} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: BRAND_GREEN_DARK }}>
                    ออกใบ PR{supplierCount > 0 ? ` (${supplierCount})` : ""}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onRFQ}
                  className="flex-1 flex-row items-center justify-center active:opacity-80"
                  style={{ height: 50, borderRadius: 999, backgroundColor: "rgba(37,99,235,0.1)", gap: 6 }}
                  accessibilityLabel="ขอใบเสนอราคา RFQ"
                >
                  <ReceiptText size={16} color="#1d4ed8" strokeWidth={2.2} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#1d4ed8" }}>ขอใบเสนอราคา</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Persistent action row — total + pay only (PR/RFQ live in the
              expanded summary; the collapsed bar stays minimal). */}
          <View className="flex-row items-center" style={{ gap: 6 }}>
            {/* Total — only while collapsed (the expanded summary already shows
                "รวมทั้งสิ้น", so it's redundant here). Drag-only handle. */}
            {!expanded ? (
              <View {...dragPan.panHandlers} style={{ flex: 1, paddingLeft: 16 }}>
                <Text numberOfLines={1} style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>
                  รวม <Text style={{ color: "#0a0a0a", fontWeight: "500" }}>{selectedCount}</Text> รายการ
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 20, fontWeight: "700", color: "#ee4d2d", lineHeight: 24 }}
                >
                  ฿{grandTotal.toFixed(0)}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => !payDisabled && onPay()}
              disabled={payDisabled}
              className="flex-row items-center justify-center active:opacity-80"
              style={{
                // Full width once expanded (total block hidden then); natural width collapsed.
                flex: expanded ? 1 : undefined,
                height: 50,
                borderRadius: 9999,
                backgroundColor: payDisabled ? "#d4d4d4" : "#319754",
                paddingHorizontal: 38,
                gap: 6,
              }}
            >
              <Text style={{ color: "white", fontSize: 13, fontWeight: "600", lineHeight: 18 }}>
                ชำระเงิน ({selectedCount})
              </Text>
            </Pressable>
          </View>
        </AnimatedGlass>
      </Animated.View>
    </Animated.View>
  );
});

function SummaryRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="flex-row items-center justify-between" style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 13, color: "#525252", lineHeight: 18 }}>{label}</Text>
      <Text style={{ fontSize: 13, color, fontWeight: "500", lineHeight: 18 }}>{value}</Text>
    </View>
  );
}
