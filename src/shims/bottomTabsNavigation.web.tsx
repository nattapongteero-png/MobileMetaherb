// Web shim for `@bottom-tabs/react-navigation` (native iOS UITabBarController).
// That package imports react-native internals that don't exist on web, so on web
// we swap it for a JS bottom-tab navigator built on @react-navigation/bottom-tabs.
//
// Native-only bits are dropped: the `{ sfSymbol }` icon objects (invalid as a
// React child on web) and the iOS-26 appearance props (translucent /
// scrollEdgeAppearance / minimizeBehavior). Labels (options.title) still show.
import * as React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

type AnyProps = Record<string, any>;

// Strip the sfSymbol icon so @react-navigation never tries to render the
// `{ sfSymbol: "..." }` object as a tab icon. Works for object or function options.
function cleanOptions(options: any) {
  if (typeof options === "function") {
    return (args: any) => {
      const o = { ...(options(args) || {}) };
      delete o.tabBarIcon;
      return o;
    };
  }
  if (options && typeof options === "object") {
    const o = { ...options };
    delete o.tabBarIcon;
    return o;
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
          tabBarStyle,
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
