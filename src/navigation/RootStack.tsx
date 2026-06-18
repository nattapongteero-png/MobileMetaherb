import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createNativeBottomTabNavigator } from "@bottom-tabs/react-navigation";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ProductDetailScreen } from "../screens/ProductDetailScreen";
import { CartScreen } from "../screens/CartScreen";
import { PaymentScreen } from "../screens/PaymentScreen";
import { PaymentMethodScreen } from "../screens/PaymentMethodScreen";
import { ShippingMethodScreen } from "../screens/ShippingMethodScreen";
import { CouponSelectScreen } from "../screens/CouponSelectScreen";
import { AddressSelectScreen } from "../screens/AddressSelectScreen";
import { AddAddressScreen } from "../screens/AddAddressScreen";
import { PromptPayQRScreen } from "../screens/PromptPayQRScreen";
import { PaymentSuccessScreen } from "../screens/PaymentSuccessScreen";
import { AddCardScreen } from "../screens/AddCardScreen";
import { TrueMoneyLinkScreen } from "../screens/TrueMoneyLinkScreen";
import { NotificationScreen } from "../screens/NotificationScreen";
import { ShopScreen } from "../screens/ShopScreen";
import { ProductsScreen } from "../screens/ProductsScreen";
import { ProductFilterScreen } from "../screens/ProductFilterScreen";
import { KnowledgeScreen } from "../screens/KnowledgeScreen";
import { ArticleDetailScreen } from "../screens/ArticleDetailScreen";
import { OrdersScreen } from "../screens/OrdersScreen";
import { AccountScreen } from "../screens/AccountScreen";
import { AccountInfoScreen } from "../screens/AccountInfoScreen";
import { AddressScreen } from "../screens/AddressScreen";
import { WishlistScreen } from "../screens/WishlistScreen";
import { CouponsScreen } from "../screens/CouponsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { AboutScreen } from "../screens/AboutScreen";
import { VerifyPaymentScreen } from "../screens/VerifyPaymentScreen";
import { ComplaintSelectScreen } from "../screens/ComplaintSelectScreen";
import { ComplaintFormScreen } from "../screens/ComplaintFormScreen";
import { ComplaintStatusScreen } from "../screens/ComplaintStatusScreen";
import { CouponCollectScreen } from "../screens/CouponCollectScreen";
import { HerbalMarketScreen } from "../screens/HerbalMarketScreen";
import { HerbalMarketDetailScreen } from "../screens/HerbalMarketDetailScreen";
import { HerbalMarketPRScreen } from "../screens/HerbalMarketPRScreen";
import { HerbalMarketPurchaseScreen } from "../screens/HerbalMarketPurchaseScreen";
import { HerbalMarketQuoteScreen } from "../screens/HerbalMarketQuoteScreen";
import { HerbalMarketSampleScreen } from "../screens/HerbalMarketSampleScreen";
import { TrialProductsScreen } from "../screens/TrialProductsScreen";
import { TrialDetailScreen } from "../screens/TrialDetailScreen";
import { TrialApplyScreen } from "../screens/TrialApplyScreen";
import { MyTrialsScreen } from "../screens/MyTrialsScreen";
import { TrialRegisterScreen } from "../screens/TrialRegisterScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { AIAssistantScreen } from "../screens/AIAssistantScreen";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { GlassBackButton } from "../components/GlassBackButton";
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
  Settings: undefined;
  About: undefined;
  VerifyPayment: undefined;
  ComplaintSelect: { orderId?: string; shopName?: string } | undefined;
  ComplaintForm: undefined;
  ComplaintStatus: undefined;
  CouponCollect: undefined;
  // Pushed from Home "ดูทั้งหมด" (no longer bottom-tab screens).
  Products: undefined;
  ProductFilter: undefined;
  Knowledge: { tab?: "articles" | "videos" } | undefined;
  Account: undefined;
  HerbalMarket: undefined;
  HerbalMarketDetail: { id?: string } | undefined;
  HerbalMarketPR: { id?: string } | undefined;
  HerbalMarketPurchase: { id?: string; qty?: number } | undefined;
  HerbalMarketQuote: { id?: string } | undefined;
  HerbalMarketSample: { id?: string } | undefined;
  TrialProducts: undefined;
  TrialDetail: { id?: string } | undefined;
  TrialApply: { id?: string } | undefined;
  MyTrials: undefined;
  TrialRegister: undefined;
  Chat: undefined;
  AIAssistant: undefined;
  Cart: undefined;
  Payment: undefined;
  PromptPayQR: { total: number; orderId: string };
  PaymentSuccess: { orderId: string; total: number; methodLabel: string; methodDesc?: string };
  PaymentMethod: undefined;
  ShippingMethod: undefined;
  CouponSelect: undefined;
  AddressSelect: undefined;
  AddAddress: undefined;
  AddCard: undefined;
  TrueMoneyLink: undefined;
  Notification: undefined;
  Shop: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  TrialProducts: undefined;
  HerbalMarket: undefined;
  Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createNativeBottomTabNavigator<MainTabParamList>();

// Wrap each tab in its own ErrorBoundary so a render error shows on-screen
// instead of a blank tab.
const HomeTab = () => (<ErrorBoundary><HomeScreen /></ErrorBoundary>);
const TrialTab = () => (<ErrorBoundary><TrialProductsScreen /></ErrorBoundary>);
const HerbalTab = () => (<ErrorBoundary><HerbalMarketScreen /></ErrorBoundary>);
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
      // iOS 26 Liquid Glass material (content blurs through) instead of a solid bar.
      translucent
      scrollEdgeAppearance="transparent"
      // Eagerly mount every tab (default lazy:true leaves non-focused tabs blank
      // under iOS 26 + New Arch).
      screenOptions={{ lazy: false }}
    >
      <Tab.Screen
        name="Home"
        component={HomeTab}
        options={{ title: "หน้าแรก", tabBarIcon: () => ({ sfSymbol: "house.fill" }) }}
      />
      <Tab.Screen
        name="TrialProducts"
        component={TrialTab}
        options={{ title: "ผลิตภัณฑ์ทดสอบ", tabBarIcon: () => ({ sfSymbol: "gift.fill" }) }}
      />
      <Tab.Screen
        name="HerbalMarket"
        component={HerbalTab}
        options={{ title: "เฮอร์บัลมาร์เก็ต", tabBarIcon: () => ({ sfSymbol: "leaf.fill" }) }}
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
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#fafafa" },
        // Apple-style nav bar: centered title + a round Liquid Glass back button
        // (like the Health app). System renders the glass bar material on iOS 26.
        headerShadowVisible: false,
        headerTitleStyle: { color: "#1a1a1a" },
        headerTitleAlign: "center",
        headerBackVisible: false,
        headerLeft: () => <GlassBackButton />,
      }}
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
      <Stack.Screen name="AccountInfo" component={AccountInfoScreen} options={{ headerShown: true, title: "บัญชีของฉัน" }} />
      <Stack.Screen name="Address" component={AddressScreen} options={{ headerShown: true, title: "ที่อยู่ของฉัน" }} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ headerShown: true, title: "สินค้าที่ชอบ" }} />
      <Stack.Screen name="Coupons" component={CouponsScreen} options={{ headerShown: true, title: "คูปองของฉัน" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: "ตั้งค่า" }} />
      {/* Pushed from Home "ดูทั้งหมด" — they render their own green BrandHeader,
          so no stack header (iOS edge-swipe goes back). */}
      <Stack.Screen name="Products" component={ProductsScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ProductFilter" component={ProductFilterScreen} options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="Knowledge" component={KnowledgeScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: true, title: "เกี่ยวกับเรา", animation: "slide_from_right" }} />
      <Stack.Screen name="VerifyPayment" component={VerifyPaymentScreen} options={{ headerShown: true, title: "ยืนยันการชำระเงิน", animation: "slide_from_right" }} />
      <Stack.Screen name="ComplaintSelect" component={ComplaintSelectScreen} options={{ headerShown: true, title: "แจ้งปัญหาคำสั่งซื้อ", animation: "slide_from_right" }} />
      <Stack.Screen name="ComplaintForm" component={ComplaintFormScreen} options={{ headerShown: true, title: "กรอกเรื่องร้องเรียน", animation: "slide_from_right" }} />
      <Stack.Screen name="ComplaintStatus" component={ComplaintStatusScreen} options={{ headerShown: true, title: "สถานะการร้องเรียน", animation: "slide_from_right" }} />
      <Stack.Screen name="CouponCollect" component={CouponCollectScreen} options={{ headerShown: true, title: "เก็บคูปอง", animation: "slide_from_right" }} />
      <Stack.Screen name="HerbalMarketDetail" component={HerbalMarketDetailScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="HerbalMarketPR" component={HerbalMarketPRScreen} options={{ headerShown: true, title: "ลงประกาศรับซื้อ", animation: "slide_from_right" }} />
      <Stack.Screen name="HerbalMarketPurchase" component={HerbalMarketPurchaseScreen} options={{ headerShown: true, title: "สั่งซื้อสมุนไพร", animation: "slide_from_right" }} />
      <Stack.Screen name="HerbalMarketQuote" component={HerbalMarketQuoteScreen} options={{ headerShown: true, title: "เสนอราคา", animation: "slide_from_right" }} />
      <Stack.Screen name="HerbalMarketSample" component={HerbalMarketSampleScreen} options={{ headerShown: true, title: "ขอตัวอย่างสินค้า", animation: "slide_from_right" }} />
      <Stack.Screen name="TrialDetail" component={TrialDetailScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="TrialApply" component={TrialApplyScreen} options={{ headerShown: true, title: "สมัครทดลองใช้สินค้า", animation: "slide_from_right" }} />
      <Stack.Screen name="MyTrials" component={MyTrialsScreen} options={{ headerShown: true, title: "การทดลองของฉัน", animation: "slide_from_right" }} />
      <Stack.Screen name="TrialRegister" component={TrialRegisterScreen} options={{ headerShown: true, title: "ลงทะเบียนนักรีวิว", animation: "slide_from_right" }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true, title: "แชทกับร้านค้า", animation: "slide_from_right" }} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} options={{ headerShown: true, title: "ผู้ช่วย AI", animation: "slide_from_right" }} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="PromptPayQR"
        component={PromptPayQRScreen}
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="PaymentSuccess"
        component={PaymentSuccessScreen}
        options={{ headerShown: false, animation: "slide_from_right", gestureEnabled: false }}
      />
      {/* Slide-up modal — same presentation as the product filter (taps work). */}
      <Stack.Screen
        name="PaymentMethod"
        component={PaymentMethodScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }}
      />
      <Stack.Screen
        name="ShippingMethod"
        component={ShippingMethodScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }}
      />
      <Stack.Screen
        name="CouponSelect"
        component={CouponSelectScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }}
      />
      <Stack.Screen
        name="AddressSelect"
        component={AddressSelectScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }}
      />
      <Stack.Screen
        name="AddAddress"
        component={AddAddressScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }}
      />
      <Stack.Screen
        name="AddCard"
        component={AddCardScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }}
      />
      <Stack.Screen
        name="TrueMoneyLink"
        component={TrueMoneyLinkScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }}
      />
      <Stack.Screen name="Notification" component={NotificationScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
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
