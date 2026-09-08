// Web shim for `@bottom-tabs/react-navigation` (native iOS UITabBarController).
// That package imports react-native internals that don't exist on web, so on web
// we swap it for a JS bottom-tab navigator built on @react-navigation/bottom-tabs.
//
// Native-only bits are dropped: the `{ sfSymbol }` icon objects (invalid as a
// React child on web) and the iOS-26 appearance props (translucent /
// scrollEdgeAppearance / minimizeBehavior). Labels (options.title) still show.
import * as React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

type AnyProps = Record<string, any>;

// --- The glass bar, for web -------------------------------------------------
// A floating pill clear of the screen edges, the way the iOS 26 tab bar sits —
// the fill is translucent so the page shows through, and `backdropFilter` is
// what actually makes it read as glass rather than as a pale grey panel. The
// saturate() lifts the colour that bleeds through, matching how the system
// material behaves over the app's green header and product photography.
const GLASS_BLUR = "blur(22px) saturate(1.7)";
const GLASS_BAR: AnyProps = {
  position: "absolute",
  left: 12,
  right: 12,
  bottom: 10,
  height: 74,
  borderRadius: 37,
  borderTopWidth: 0,
  paddingHorizontal: 6,
  paddingBottom: 0,
  backgroundColor: "transparent",
  elevation: 0,
  // The lift under the pill: broad and soft, so the bar hovers over the page
  // instead of sitting on it.
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
};
// Each item is its own rounded slot, so the active fill reads as a pill inside
// the bar rather than a square block.
// No vertical padding here: react-navigation lays the icon and label out
// inside a height it derives from the bar, and padding on the item ate the
// label's row (it came out 2px tall and clipped).
const GLASS_ITEM: AnyProps = { borderRadius: 26 };
const GLASS_LABEL: AnyProps = { fontSize: 10, lineHeight: 13, marginTop: 2, marginBottom: 0 };

// The active slot's own rounding. react-navigation paints
// `tabBarActiveBackgroundColor` onto the pressable itself, which
// `tabBarItemStyle` does not reach — so the highlight came out as a square
// block poking through the bar's rounded ends. One rule, injected once, rounds
// and insets that element instead.
const TAB_PILL_CSS = `
a[role="tab"] { border-radius: 26px !important; margin: 8px 4px !important; }
`;
if (typeof document !== "undefined" && !document.getElementById("glass-tabbar-css")) {
  const tag = document.createElement("style");
  tag.id = "glass-tabbar-css";
  tag.textContent = TAB_PILL_CSS;
  document.head.appendChild(tag);
}

// The material itself, behind the items: the blurred, hairline-ringed surface.
function GlassBackdrop() {
  return (
    <View
      style={
        {
          flex: 1,
          borderRadius: 37,
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.72)",
          borderWidth: 0.5,
          borderColor: "rgba(255,255,255,0.85)",
          // Not a react-native style key — react-native-web passes it through
          // to CSS, which is the whole point: this is the blur.
          backdropFilter: GLASS_BLUR,
          WebkitBackdropFilter: GLASS_BLUR,
        } as AnyProps
      }
    />
  );
}

// Keep icons that web can actually draw, drop the ones it cannot.
//
// An icon that returns `{ sfSymbol: "..." }` is an Apple symbol name — invalid
// as a React child — so it is filtered to null. An icon that returns a real
// element (the web build passes <Image>) is kept and rendered. Deleting
// `tabBarIcon` outright, as this shim used to, is NOT the same as returning
// nothing: @react-navigation/bottom-tabs falls back to its own MissingIcon when
// the option is absent, which is where the ⏷ placeholder in every tab slot of
// the web build came from.
function cleanIcon(o: any) {
  const icon = o?.tabBarIcon;
  if (typeof icon !== "function") {
    if (o && "tabBarIcon" in o) delete o.tabBarIcon;
    return o;
  }
  o.tabBarIcon = (args: any) => {
    const rendered = icon(args);
    return React.isValidElement(rendered) ? rendered : null;
  };
  return o;
}

function cleanOptions(options: any) {
  if (typeof options === "function") {
    return (args: any) => cleanIcon({ ...(options(args) || {}) });
  }
  if (options && typeof options === "object") {
    return cleanIcon({ ...options });
  }
  return options;
}

export function createNativeBottomTabNavigator<T = AnyProps>() {
  const Tab = createBottomTabNavigator<any>();

  function Navigator(props: AnyProps) {
    // Pull the native-tab-bar tint props out and fold them into screenOptions;
    // ignore the iOS-26-only appearance flags the web tab bar has no concept of.
    const {
      tabBarActiveTintColor,
      tabBarInactiveTintColor,
      tabBarStyle,
      translucent: _translucent,
      scrollEdgeAppearance: _scrollEdgeAppearance,
      minimizeBehavior: _minimizeBehavior,
      screenOptions,
      children,
      ...rest
    } = props;
    // react-navigation only accepts its own Tab.Screen as a child, so we expose
    // the real Tab.Screen and strip the native `{ sfSymbol }` icon here by cloning.
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
          tabBarActiveTintColor,
          tabBarInactiveTintColor,
          // The iOS build gets Liquid Glass from the system. The web has no
          // such material, but it does have backdrop-filter — so the bar is
          // rebuilt here as the same floating pill, translucent over a blur,
          // instead of falling back to a flat opaque strip.
          tabBarStyle: [GLASS_BAR, tabBarStyle],
          tabBarBackground: GlassBackdrop,
          tabBarItemStyle: GLASS_ITEM,
          tabBarActiveBackgroundColor: "rgba(120,120,128,0.14)",
          tabBarLabelStyle: GLASS_LABEL,
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
