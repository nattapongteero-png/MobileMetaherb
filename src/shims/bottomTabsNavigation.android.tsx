// Android shim for `@bottom-tabs/react-navigation`. iOS keeps the native
// UITabBarController (real Liquid Glass); Android has no such thing, so the
// same API is rebuilt on @react-navigation/bottom-tabs and dressed as frosted
// glass — a floating translucent bar with a real BlurView behind it, and the
// `{ sfSymbol }` icons swapped for their lucide equivalents.
//
// Scenes are padded by exactly the bar's height (BAR_HEIGHT + bottom inset),
// so no screen needs its own tab-bar-height handling. The paired
// `bottomTabs.android.ts` shim returns 0 from useBottomTabBarHeight for the
// same reason — the navigator has already made room.
import * as React from "react";
import { StyleSheet } from "react-native";
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

// Icon area (22) + label (10) + breathing room — matches the iOS bar's compact
// icon-over-label proportions.
const BAR_HEIGHT = 54;

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

/** The frosted pane behind the floating bar. */
function FrostedGlass() {
  return (
    <BlurView
      intensity={50}
      tint="light"
      // Real blur on Android needs the experimental renderer; without it the
      // rgba overlay below still gives the translucent-milk fallback.
      experimentalBlurMethod="dimezisBlurView"
      style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.72)" }]}
    />
  );
}

export function createNativeBottomTabNavigator<T = AnyProps>() {
  const Tab = createBottomTabNavigator<any>();

  function Navigator(props: AnyProps) {
    const {
      tabBarActiveTintColor,
      tabBarInactiveTintColor,
      // Native-bar knobs with no JS-bar equivalent:
      tabBarStyle: _tabBarStyle, // callers pass an opaque white bg — glass overrides it
      translucent: _translucent,
      scrollEdgeAppearance: _scrollEdgeAppearance,
      minimizeBehavior: _minimizeBehavior,
      tabLabelStyle,
      screenOptions,
      children,
      ...rest
    } = props;
    const insets = useSafeAreaInsets();
    const barTotal = BAR_HEIGHT + insets.bottom;

    const cleanedChildren = React.Children.map(children, (child: any) =>
      child && child.props && "options" in child.props
        ? React.cloneElement(child, { options: cleanOptions(child.props.options) })
        : child
    );

    return (
      <Tab.Navigator
        {...rest}
        screenOptions={{
          headerShown: false,
          ...screenOptions,
          tabBarActiveTintColor,
          tabBarInactiveTintColor,
          tabBarBackground: () => <FrostedGlass />,
          tabBarStyle: {
            position: "absolute",
            height: barTotal,
            backgroundColor: "transparent",
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: "rgba(0,0,0,0.10)",
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: "IBMPlexSansThaiLooped_500Medium",
            ...(tabLabelStyle ?? null),
          },
          // The bar floats, so give every scene its footprint back — this is
          // what lets screens stay hook-free (see bottomTabs.android.ts).
          sceneStyle: { paddingBottom: barTotal },
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
