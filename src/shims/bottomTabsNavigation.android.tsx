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
import {
  ChartColumn,
  CreditCard,
  Home,
  Leaf,
  Package,
  Settings,
  Store,
  User,
} from "lucide-react-native";

type AnyProps = Record<string, any>;

// Every SF Symbol used by the app's two tab bars, mapped to the lucide icon
// closest in meaning. An unmapped symbol just renders a label-only tab.
const SF_TO_LUCIDE: Record<string, React.ComponentType<AnyProps>> = {
  "house.fill": Home,
  "shippingbox.fill": Package,
  "leaf.fill": Leaf,
  "person.fill": User,
  "chart.bar.fill": ChartColumn,
  "creditcard.fill": CreditCard,
  "storefront.fill": Store,
  "gearshape.fill": Settings,
};

// Floating-pill geometry. Kept in sync with bottomTabs.android.ts (the height
// hook), which returns floatBottomFor(insets) + BAR_HEIGHT + SCENE_GAP.
const BAR_HEIGHT = 60;
const BAR_RADIUS = 28;
const SIDE_MARGIN = 14;
/** How high the pill floats above the very bottom (clears the gesture area). */
export const floatBottomFor = (insetBottom: number) => (insetBottom > 0 ? insetBottom : 14);

/** `tabBarIcon: () => ({ sfSymbol })` → a lucide element in the tab's tint. */
function toJsIcon(original: unknown) {
  if (typeof original !== "function") return undefined;
  const spec = original({}) ?? {};
  const Icon = SF_TO_LUCIDE[spec.sfSymbol];
  if (!Icon) return undefined;
  return ({ color }: { color: string }) => <Icon size={22} color={color} strokeWidth={2} />;
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
          backgroundColor: "rgba(255,255,255,0.80)",
          borderRadius: BAR_RADIUS,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: "rgba(0,0,0,0.08)",
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
  inactiveTintColor = "#8e8e93",
  labelStyle,
}: AnyProps) {
  const insets = useSafeAreaInsets();
  const floatBottom = floatBottomFor(insets.bottom);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: SIDE_MARGIN,
        right: SIDE_MARGIN,
        bottom: floatBottom,
        height: BAR_HEIGHT,
        borderRadius: BAR_RADIUS,
        // Shadow lives on this (un-clipped) layer so it isn't cut by the blur's
        // overflow:hidden.
        elevation: 14,
        shadowColor: "#0b3d24",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
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
              style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3 }}
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
            </Pressable>
          );
        })}
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
