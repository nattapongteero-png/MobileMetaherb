import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Modal,
  Dimensions,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Check, X } from "lucide-react-native";
import { GlassIconButton } from "./GlassIconButton";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 500;

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** When set, the header switches to the iOS filter-sheet style (close-X left,
   *  centered title, green ✓ done button right) and calls this on done. */
  onDone?: () => void;
  /** Close-X left + centered title + no right action (the detail-sheet header
   *  style). Ignored when onDone is set. */
  centerTitle?: boolean;
  /** Optional line under the title (centerTitle header only) — e.g. a summary. */
  centerSubtitle?: ReactNode;
  /** Min height as ratio of screen (default 0.6). */
  minHeightRatio?: number;
  /** Max height as ratio of screen (default 0.9). */
  maxHeightRatio?: number;
  /** Force a flex:1 content area (so a scrollable child fills + scrolls) even
   *  with centerTitle. Use for search+list picker sheets. (`fillContent` is an alias.) */
  fill?: boolean;
  /** Alias of `fill` — flex:1 content area so a footer can pin to the bottom. */
  fillContent?: boolean;
  /** Hide the drag handle + header entirely so children can render a full-bleed
   *  hero at the very top (children own the top rounded corners + close button). */
  noHeader?: boolean;
  /** Action for the header's right side (centerTitle style) — e.g. an add
   *  button on a picker sheet. Replaces the spacer that balances the close X. */
  rightSlot?: ReactNode;
};

/**
 * Shared bottom-sheet component. Consistent behavior everywhere it's used:
 *   • Backdrop fade-in only (background stays still)
 *   • Sheet slide-up from bottom on open, slide-down on close
 *   • Swipe-down anywhere on the sheet to dismiss (RNGH; works on web too)
 *   • Tap backdrop, tap X, or system back to dismiss
 *   • Safe-area bottom padding so content never hides behind home indicator
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  onDone,
  centerTitle,
  centerSubtitle,
  minHeightRatio = 0.6,
  maxHeightRatio = 0.9,
  fill,
  fillContent,
  noHeader,
  rightSlot,
}: Props) {
  const insets = useSafeAreaInsets();
  const winHeight = useWindowDimensions().height;
  // Android renders full-screen edge-to-edge (no iOS detent gap), so cap the
  // sheet below the status bar + a small breathing gap. 0 on iOS — the 0.9
  // ratio already clears the notch there; iOS output stays byte-identical.
  const topGuard = Platform.OS === "android" ? insets.top + 12 : 0;
  const sheetMaxHeight = Math.min(winHeight * maxHeightRatio, winHeight - topGuard);
  const sheetMinHeight = Math.min(winHeight * minHeightRatio, sheetMaxHeight);
  const [mounted, setMounted] = useState(false);
  // Android: mount children a couple of frames AFTER the modal's native window
  // is displayed (Modal onShow). Fabric drops async Fresco decode results for
  // images committed during a window's initial mount (same race as the
  // screen-level blank-image bug), so images inside sheets randomly blank.
  // A JS-side rAF fires too early — it can run before the dialog attaches —
  // so we anchor on onShow instead. The sheet is still at the very start of
  // its slide-up then, so the defer is invisible. iOS renders immediately.
  const [contentReady, setContentReady] = useState(Platform.OS !== "android");
  // Bumped once per open, after the slide-up lands: remounting the content is
  // the only reliable healer for a decode that still got dropped — painted
  // images redraw from Fresco's cache, dropped ones decode again and paint.
  const [contentEpoch, setContentEpoch] = useState(0);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const handleAndroidShow = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setContentReady(true));
    });
    setTimeout(() => setContentEpoch((e) => e + 1), 450);
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 180,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          // Reset only after the close animation so children stay visible
          // while the sheet slides down.
          if (Platform.OS === "android") setContentReady(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY(6)
    .failOffsetX([-25, 25])
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.setValue(e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        onClose();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 220,
          useNativeDriver: true,
        }).start();
      }
    });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onShow={Platform.OS === "android" ? handleAndroidShow : undefined}
      // Android: extend the modal window under both system bars so the dim
      // backdrop covers the whole screen and insets report real values.
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* Backdrop — fade only */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            opacity: backdropOpacity,
          }}
        >
          <Pressable onPress={onClose} style={{ flex: 1 }} />
        </Animated.View>

        {/* Sheet — slide up + swipe-down to dismiss */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              minHeight: sheetMinHeight,
              maxHeight: sheetMaxHeight,
              transform: [{ translateY }],
            }}
          >
            {/* Drag handle — hidden for the detail-sheet (centerTitle) style */}
            {noHeader ? null : centerTitle ? (
              <View style={{ height: 16 }} />
            ) : (
              <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 8 }}>
                <View
                  style={{
                    width: 40,
                    height: 5,
                    backgroundColor: "#d4d4d4",
                    borderRadius: 3,
                  }}
                />
              </View>
            )}

            {/* Header — iOS filter-sheet style (X / title / green ✓) when onDone
                is set, otherwise the default title + close. Skipped for noHeader. */}
            {noHeader ? null : onDone ? (
              <View
                className="flex-row items-center justify-between"
                style={{ paddingHorizontal: 16, paddingBottom: 12 }}
              >
                <Pressable
                  onPress={onClose}
                  hitSlop={6}
                  className="active:opacity-70"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "rgba(118,118,128,0.14)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={22} color="#1a1a1a" strokeWidth={2.4} />
                </Pressable>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>{title}</Text>
                <Pressable
                  onPress={onDone}
                  hitSlop={6}
                  className="active:opacity-80"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "#319754",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={22} color="#fff" strokeWidth={3} />
                </Pressable>
              </View>
            ) : centerTitle ? (
              // Detail-sheet style: glass close-X left, centered title, no right action.
              <View
                className="flex-row items-center justify-between"
                style={{ paddingHorizontal: 16, paddingBottom: 12 }}
              >
                <GlassIconButton onPress={onClose} size={44} accessibilityLabel="ปิด">
                  <X size={22} color="#1a1a1a" strokeWidth={2.6} />
                </GlassIconButton>
                <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 4 }}>
                  <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>{title}</Text>
                  {centerSubtitle ? <View style={{ marginTop: 8 }}>{centerSubtitle}</View> : null}
                </View>
                <View style={{ width: 44, alignItems: "flex-end" }}>{rightSlot}</View>
              </View>
            ) : (
              <View
                className="flex-row items-center justify-between"
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f0f0f0",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a", lineHeight: 22 }}>
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  className="active:opacity-60"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#f5f5f5",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={18} color="#525252" />
                </Pressable>
              </View>
            )}

            {/* Content area — caller controls padding/layout. centerTitle and
                noHeader sheets hug their content (no flex:1) so the sheet height
                fits exactly, unless fill/fillContent asks it to stretch. */}
            <View
              key={contentEpoch}
              style={{
                flex: fill || fillContent || (!centerTitle && !noHeader) ? 1 : undefined,
                paddingBottom: insets.bottom,
              }}
            >
              {contentReady ? children : null}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}
