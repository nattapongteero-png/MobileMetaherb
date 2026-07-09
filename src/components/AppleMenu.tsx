import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

const MENU_W = 240;
const MENU_H = 112; // ~2 rows × 48 + vertical padding — used to pin the top-right corner

/**
 * iOS 26-style options menu — the trigger button itself morphs into the card:
 * the card's corner nearest the button stays pinned while it scales up from
 * button size (and collapses back on close). Pair with a trigger that hides
 * (renders a spacer / nothing) while `visible`.
 *
 * Anchoring: pass `anchorTop` for an app-bar button (pins the TOP-right
 * corner) or `anchorBottom` for a FAB (pins the BOTTOM-right corner and the
 * card expands upward). `originSize` = the trigger's diameter (44 app-bar
 * buttons, 58 FABs).
 */
export function AppleMenu({
  visible,
  onClose,
  anchorTop,
  anchorBottom,
  right = 12,
  originSize = 44,
  menuHeight = MENU_H,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  /** Absolute top of the app-bar button (e.g. insets.top + 6). */
  anchorTop?: number;
  /** Absolute bottom of a FAB trigger — the menu grows upward from it. */
  anchorBottom?: number;
  /** Distance from the right edge (matches the trigger's `right`). */
  right?: number;
  /** Trigger diameter the card scales up from. */
  originSize?: number;
  /** Approx card height (rows × 48 + 16) — keeps the pinned corner accurate. */
  menuHeight?: number;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, stiffness: 340, damping: 28, mass: 0.9 }).start();
    } else if (mounted) {
      Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  // Pin the corner nearest the trigger while scaling s0 → 1 (centre-origin
  // scale needs a compensating translation of (size/2)·(1−s0) toward it).
  const s0 = originSize / MENU_W;
  const fromBottom = anchorBottom != null;
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
      {/* Tap-outside catcher */}
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <Animated.View
        style={{
          position: "absolute",
          ...(fromBottom ? { bottom: anchorBottom } : { top: anchorTop }),
          right,
          width: MENU_W,
          opacity: anim.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [(MENU_W / 2) * (1 - s0), 0] }) },
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [(fromBottom ? 1 : -1) * (menuHeight / 2) * (1 - s0), 0],
              }),
            },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [s0, 1] }) },
          ],
          shadowColor: "#000",
          shadowOpacity: 0.16,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 12 },
          elevation: 12,
        }}
      >
        {/* Solid light-gray card (like the Notes menu) — GlassView breaks under
            animated opacity (UIVisualEffectView renders empty), so plain fill. */}
        <View style={{ borderRadius: 26, overflow: "hidden", paddingVertical: 8, backgroundColor: "#f4f4f5" }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

// Apple (Notes-style) menu row — icon on the left, roomy 48px row, 16px label.
export function AppleMenuItem({
  label,
  Icon,
  onPress,
  danger,
}: {
  label: string;
  Icon: LucideIcon;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger ? "#ff3b30" : "#1a1a1a";
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:opacity-60"
      style={{ height: 48, paddingHorizontal: 18, gap: 14 }}
    >
      <Icon size={20} color={color} strokeWidth={2} />
      <Text style={{ flex: 1, fontSize: 16, color }}>{label}</Text>
    </Pressable>
  );
}

/** Anchor for a card/press-point menu. */
export type CardMenuAnchor = { top?: number; bottom?: number; right: number };

/** Convert a tap's window coords to an AppleMenu anchor inside a host view —
 *  opens downward, or upward when the tap sits low on screen. */
export function cardMenuAnchor(pageX: number, pageY: number, rx: number, ry: number, rw: number, rh: number): CardMenuAnchor {
  const right = Math.max(12, rx + rw - pageX - 14);
  const localY = pageY - ry;
  return localY > rh * 0.55 ? { bottom: rh - localY + 10, right } : { top: localY + 10, right };
}
