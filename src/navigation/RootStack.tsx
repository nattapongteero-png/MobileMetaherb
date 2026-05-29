import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ProductDetailScreen } from "../screens/ProductDetailScreen";
import { CartScreen } from "../screens/CartScreen";
import { PaymentScreen } from "../screens/PaymentScreen";
import { NotificationScreen } from "../screens/NotificationScreen";
import { ShopScreen } from "../screens/ShopScreen";
import type { Product } from "../types/Product";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  ProductDetail: { product: Product };
  Cart: undefined;
  Payment: undefined;
  Notification: undefined;
  Shop: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fafafa" } }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
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
    </Stack.Navigator>
  );
}
