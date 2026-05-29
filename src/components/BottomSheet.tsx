import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Modal,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { X } from "lucide-react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 500;

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Min height as ratio of screen (default 0.6). */
  minHeightRatio?: number;
  /** Max height as ratio of screen (default 0.9). */
  maxHeightRatio?: number;
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
  minHeightRatio = 0.6,
  maxHeightRatio = 0.9,
}: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
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
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
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
              minHeight: SCREEN_HEIGHT * minHeightRatio,
              maxHeight: SCREEN_HEIGHT * maxHeightRatio,
              transform: [{ translateY }],
            }}
          >
            {/* Drag handle */}
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

            {/* Header */}
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

            {/* Content area — caller controls padding/layout */}
            <View
              style={{
                flex: 1,
                paddingBottom: insets.bottom,
              }}
            >
              {children}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}
