// Android shim for `@bottom-tabs/react-navigation`. iOS keeps the native
// UITabBarController (real iOS-26 Liquid Glass floating bar); Android has no
// such thing, so the same API is rebuilt on @react-navigation/bottom-tabs with
// a CUSTOM tab bar that matches: a FLOATING, rounded, frosted-glass pill —
// inset from the screen edges, hovering above the bottom, with a BlurView
// behind it and the `{ sfSymbol }` icons swapped for their lucide equivalents.
//
// react-navigation's default BottomTabBar pins itself edge-to-edge even when
// position:absolute, so a floating pill needs a custom `tabBar`. The bar floats
// over the scene, so the paired `bottomTabs.android.ts` hook reports the pill's
// full footprint and screens pad their scroll content by it.
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";

type AnyProps = Record<string, any>;

// Every SF Symbol used by the app's two tab bars, mapped to the closest
// FILLED Ionicons glyph — Ionicons' solid style mirrors Apple's .fill symbols,
// which read much clearer at tab-bar size than outline strokes.
// An unmapped symbol just renders a label-only tab.
const SF_TO_IONICON: Record<string, string> = {
  "house.fill": "home",
  "shippingbox.fill": "cube",
  "leaf.fill": "leaf",
  "person.fill": "person",
  "chart.bar.fill": "bar-chart",
  "creditcard.fill": "card",
  "storefront.fill": "storefront",
  "gearshape.fill": "settings",
};

// Floating-pill geometry. Kept in sync with bottomTabs.android.ts (the height
// hook), which returns floatBottomFor(insets) + BAR_HEIGHT + SCENE_GAP.
const BAR_HEIGHT = 60;
const BAR_RADIUS = 30;
const SIDE_MARGIN = 16;
/** How high the pill floats above the very bottom — always a clear gap above
 *  the gesture area, so it reads as floating on every device (iOS-26 feel). */
export const floatBottomFor = (insetBottom: number) => Math.max(insetBottom, 10) + 14;

/** `tabBarIcon: () => ({ sfSymbol })` → a filled Ionicons glyph in the tab's tint. */
function toJsIcon(original: unknown) {
  if (typeof original !== "function") return undefined;
  const spec = original({}) ?? {};
  const name = SF_TO_IONICON[spec.sfSymbol];
  if (!name) return undefined;
  return ({ color }: { color: string }) => <Ionicons name={name as any} size={23} color={color} />;
}

function cleanOptions(options: any) {
  if (typeof options === "function") {
    return (args: any) => {
      const o = { ...(options(args) || {}) };
      o.tabBarIcon = toJsIcon(o.tabBarIcon);
      return o;
    };
  }
  if (options && typeof options === "object") {
    return { ...options, tabBarIcon: toJsIcon(options.tabBarIcon) };
  }
  return options;
}

/** The frosted pane behind the floating pill — rounded + clipped to match. */
function FrostedGlass() {
  return (
    <BlurView
      intensity={50}
      tint="light"
      // Real blur on Android needs the experimental renderer; without it the
      // rgba overlay below still gives the translucent-milk fallback.
      experimentalBlurMethod="dimezisBlurView"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: "rgba(255,255,255,0.82)",
          borderRadius: BAR_RADIUS,
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.10)",
          overflow: "hidden",
        },
      ]}
    />
  );
}

/** The floating pill itself — a custom react-navigation tab bar. */
function FloatingPillTabBar({
  state,
  descriptors,
  navigation,
  activeTintColor = "#319754",
  labelStyle,
}: AnyProps) {
  // The iOS 26 native bar renders unselected items near-black regardless of the
  // inactive tint the app passes — mirror that here instead of the passed gray,
  // so both platforms read the same.
  const inactiveTintColor = "#2f3032";
  const insets = useSafeAreaInsets();
  const floatBottom = floatBottomFor(insets.bottom);

  return (
    // Full-width overlay anchored to the bottom; the pill sits INSIDE it with
    // plain margins, so the side insets can't be overridden by the navigator.
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: SIDE_MARGIN,
        paddingBottom: floatBottom,
        alignItems: "stretch",
      }}
    >
    <View
      pointerEvents="box-none"
      style={{
        height: BAR_HEIGHT,
        borderRadius: BAR_RADIUS,
        // Shadow lives on this (un-clipped) layer so it isn't cut by the blur's
        // overflow:hidden. Strong enough to read against a white page.
        elevation: 18,
        shadowColor: "#0b3d24",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        backgroundColor: "transparent",
      }}
    >
      <FrostedGlass />
      <View style={{ flex: 1, flexDirection: "row", borderRadius: BAR_RADIUS, overflow: "hidden" }}>
        {state.routes.map((route: AnyProps, index: number) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? activeTintColor : inactiveTintColor;
          const label = options.title ?? route.name;
          const icon = options.tabBarIcon?.({ focused, color, size: 22 });

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              android_ripple={{ color: "rgba(49,151,84,0.12)", borderless: true }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            >
              {/* iOS-26-style selection: the focused tab sits in a soft green capsule */}
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  paddingHorizontal: 16,
                  paddingVertical: 5,
                  borderRadius: 16,
                  backgroundColor: focused ? "rgba(0,0,0,0.08)" : "transparent",
                }}
              >
              {icon}
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 10,
                  color,
                  fontFamily: "IBMPlexSansThaiLooped_500Medium",
                  ...(labelStyle ?? null),
                }}
              >
                {label}
              </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
    </View>
  );
}

export function createNativeBottomTabNavigator<T = AnyProps>() {
  const Tab = createBottomTabNavigator<any>();

  function Navigator(props: AnyProps) {
    const {
      tabBarActiveTintColor,
      tabBarInactiveTintColor,
      // Native-bar knobs with no JS-bar equivalent:
      tabBarStyle: _tabBarStyle,
      translucent: _translucent,
      scrollEdgeAppearance: _scrollEdgeAppearance,
      minimizeBehavior: _minimizeBehavior,
      tabLabelStyle,
      screenOptions,
      children,
      ...rest
    } = props;

    const cleanedChildren = React.Children.map(children, (child: any) =>
      child && child.props && "options" in child.props
        ? React.cloneElement(child, { options: cleanOptions(child.props.options) })
        : child
    );

    return (
      <Tab.Navigator
        {...rest}
        tabBar={(barProps: AnyProps) => (
          <FloatingPillTabBar
            {...barProps}
            activeTintColor={tabBarActiveTintColor}
            inactiveTintColor={tabBarInactiveTintColor}
            labelStyle={tabLabelStyle}
          />
        )}
        screenOptions={{
          headerShown: false,
          ...screenOptions,
        }}
      >
        {cleanedChildren}
      </Tab.Navigator>
    );
  }

  return { Navigator, Screen: Tab.Screen, Group: Tab.Group } as unknown as {
    Navigator: (props: AnyProps) => React.JSX.Element;
    Screen: typeof Tab.Screen;
  };
}

