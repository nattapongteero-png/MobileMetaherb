import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createNativeBottomTabNavigator } from "@bottom-tabs/react-navigation";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ProductDetailScreen } from "../screens/ProductDetailScreen";
import { CartScreen } from "../screens/CartScreen";
import { PaymentScreen } from "../screens/PaymentScreen";
import { NotificationScreen } from "../screens/NotificationScreen";
import { ShopScreen } from "../screens/ShopScreen";
import { ProductsScreen } from "../screens/ProductsScreen";
import { KnowledgeScreen } from "../screens/KnowledgeScreen";
import { ArticleDetailScreen } from "../screens/ArticleDetailScreen";
import { OrdersScreen } from "../screens/OrdersScreen";
import { AccountScreen } from "../screens/AccountScreen";
import { AccountInfoScreen } from "../screens/AccountInfoScreen";
import { AddressScreen } from "../screens/AddressScreen";
import { WishlistScreen } from "../screens/WishlistScreen";
import { CouponsScreen } from "../screens/CouponsScreen";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { BRAND_GREEN } from "../theme/tokens";
import type { Product } from "../types/Product";
import type { Article } from "../data/articles";
import type { OrderStatus } from "../data/orders";

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
  ProductDetail: { product: Product };
  ArticleDetail: { article: Article };
  Orders: { initialTab?: OrderStatus | "all" | "pending_group" } | undefined;
  AccountInfo: undefined;
  Address: undefined;
  Wishlist: undefined;
  Coupons: undefined;
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

// Wrap each tab in its own ErrorBoundary so a render error shows on-screen
// instead of a blank tab.
const HomeTab = () => (<ErrorBoundary><HomeScreen /></ErrorBoundary>);
const ProductsTab = () => (<ErrorBoundary><ProductsScreen /></ErrorBoundary>);
const KnowledgeTab = () => (<ErrorBoundary><KnowledgeScreen /></ErrorBoundary>);
const AccountTab = () => (<ErrorBoundary><AccountScreen /></ErrorBoundary>);


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
      // Eagerly mount every tab (default is lazy:true, which leaves non-focused
      // tabs as blank placeholders that never render under iOS 26 + New Arch).
      screenOptions={{ lazy: false }}
    >
      <Tab.Screen
        name="Home"
        component={HomeTab}
        options={{ title: "หน้าแรก", tabBarIcon: () => ({ sfSymbol: "house.fill" }) }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsTab}
        options={{ title: "ผลิตภัณฑ์", tabBarIcon: () => ({ sfSymbol: "leaf.fill" }) }}
      />
      <Tab.Screen
        name="Knowledge"
        component={KnowledgeTab}
        options={{ title: "สาระความรู้", tabBarIcon: () => ({ sfSymbol: "book.fill" }) }}
      />
      <Tab.Screen
        name="Account"
        component={AccountTab}
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
        name="Orders"
        component={OrdersScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen name="AccountInfo" component={AccountInfoScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Address" component={AddressScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Coupons" component={CouponsScreen} options={{ animation: "slide_from_right" }} />
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
      <Stack.Screen name="Login" component={LoginScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: "slide_from_right" }} />
    </Stack.Navigator>
  );
}
