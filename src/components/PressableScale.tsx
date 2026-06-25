import { forwardRef, useRef, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type View as RNView,
  type ViewStyle,
  type StyleProp,
} from "react-native";

/**
 * Pressable with the app's standard tactile press animation: the content springs
 * down to `scaleTo` on press-in and back on release (Animated, native driver —
 * matches the friction:5/tension:220 feel used in NotificationScreen / ProductDetail).
 *
 * The visual `style` lives on an inner Animated.View, so the Pressable itself stays
 * a transparent touch wrapper sized to its content — and a forwarded ref still
 * measures the content bounds (used by GlassSelect / GlassDatePicker popovers).
 */
export const PressableScale = forwardRef<
  RNView,
  Omit<PressableProps, "style" | "children"> & {
    style?: StyleProp<ViewStyle>;
    scaleTo?: number;
    children?: ReactNode;
  }
>(function PressableScale({ children, style, scaleTo = 0.94, onPressIn, onPressOut, ...rest }, ref) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, friction: 5, tension: 220 }).start();

  return (
    <Pressable
      ref={ref}
      onPressIn={(e) => {
        spring(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        spring(1);
        onPressOut?.(e);
      }}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
});
