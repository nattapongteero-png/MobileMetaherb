import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createNativeBottomTabNavigator } from "@bottom-tabs/react-navigation";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ProductDetailScreen } from "../screens/ProductDetailScreen";
import { CartScreen } from "../screens/CartScreen";
import { PaymentScreen } from "../screens/PaymentScreen";
import { NotificationScreen } from "../screens/NotificationScreen";
import { ShopScreen } from "../screens/ShopScreen";
import { ProductsScreen } from "../screens/ProductsScreen";
import { KnowledgeScreen } from "../screens/KnowledgeScreen";
import { ArticleDetailScreen } from "../screens/ArticleDetailScreen";
import { AccountScreen } from "../screens/AccountScreen";
import { BRAND_GREEN } from "../theme/tokens";
import type { Product } from "../types/Product";
import type { Article } from "../data/articles";

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  ProductDetail: { product: Product };
  ArticleDetail: { article: Article };
  Cart: undefined;
  Payment: undefined;
  Notification: undefined;
  Shop: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Products: undefined;
  Knowledge: undefined;
  Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createNativeBottomTabNavigator<MainTabParamList>();


/**
 * Native iOS tab bar (UITabBarController via react-native-bottom-tabs) — gets
 * the real iOS 26 Liquid Glass appearance for free when built with the iOS 26
 * SDK. Icons are Apple SF Symbols.
 */
function MainTabs() {
  return (
    <Tab.Navigator
      tabBarActiveTintColor={BRAND_GREEN}
      tabBarInactiveTintColor="#8e8e93"
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "หน้าแรก", tabBarIcon: () => ({ sfSymbol: "house.fill" }) }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{ title: "ผลิตภัณฑ์", tabBarIcon: () => ({ sfSymbol: "leaf.fill" }) }}
      />
      <Tab.Screen
        name="Knowledge"
        component={KnowledgeScreen}
        options={{ title: "สาระความรู้", tabBarIcon: () => ({ sfSymbol: "book.fill" }) }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: "ฉัน", tabBarIcon: () => ({ sfSymbol: "person.fill" }) }}
      />
    </Tab.Navigator>
  );
}

export function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fafafa" } }}
    >
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="Notification"
        component={NotificationScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="Shop"
        component={ShopScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
