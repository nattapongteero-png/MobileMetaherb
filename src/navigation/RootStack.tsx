import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NavigatorScreenParams } from "@react-navigation/native";
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
import { ShopNotificationScreen } from "../screens/ShopNotificationScreen";
import { ShopScreen } from "../screens/ShopScreen";
import { ShopSortScreen } from "../screens/ShopSortScreen";
import { ShopHerbalFilterScreen } from "../screens/ShopHerbalFilterScreen";
import type { SortKey } from "../data/shopSort";
import type { HerbalSortKey } from "../data/herbalSort";
import { ProductsScreen } from "../screens/ProductsScreen";
import { ProductFilterScreen } from "../screens/ProductFilterScreen";
import { KnowledgeScreen } from "../screens/KnowledgeScreen";
import { ArticleDetailScreen } from "../screens/ArticleDetailScreen";
import { OrdersScreen } from "../screens/OrdersScreen";
import { OrderDetailScreen } from "../screens/OrderDetailScreen";
import { OrderReviewScreen } from "../screens/OrderReviewScreen";
import { AccountScreen } from "../screens/AccountScreen";
import { AccountInfoScreen } from "../screens/AccountInfoScreen";
import { AddressScreen } from "../screens/AddressScreen";
import { WishlistScreen } from "../screens/WishlistScreen";
import { CouponsScreen } from "../screens/CouponsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { AboutScreen } from "../screens/AboutScreen";
import { ComplaintSelectScreen } from "../screens/ComplaintSelectScreen";
import { ComplaintFormScreen } from "../screens/ComplaintFormScreen";
import { ComplaintTypeSelectScreen } from "../screens/ComplaintTypeSelectScreen";
import { RefundChannelSelectScreen } from "../screens/RefundChannelSelectScreen";
import { AddBankAccountScreen } from "../screens/AddBankAccountScreen";
import { PaymentAccountsScreen } from "../screens/PaymentAccountsScreen";
import { SecuritySettingsScreen } from "../screens/SecuritySettingsScreen";
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
import { TrialSuccessScreen } from "../screens/TrialSuccessScreen";
import { TrialRequestDetailScreen } from "../screens/TrialRequestDetailScreen";
import { TrialEvalScreen } from "../screens/TrialEvalScreen";
import { TrialRegistryDetailScreen } from "../screens/TrialRegistryDetailScreen";
import { TrialAddProductScreen } from "../screens/TrialAddProductScreen";
import { TrialEvalSuccessScreen } from "../screens/TrialEvalSuccessScreen";
import { B2BDocsScreen } from "../screens/B2BDocsScreen";
import { B2BDocDetailScreen } from "../screens/B2BDocDetailScreen";
import { AppSettingsScreen } from "../screens/AppSettingsScreen";
import { NotificationSettingsScreen } from "../screens/NotificationSettingsScreen";
import { PrivacyPolicyScreen } from "../screens/PrivacyPolicyScreen";
import { TermsOfServiceScreen } from "../screens/TermsOfServiceScreen";
import { SellerRegisterScreen } from "../screens/SellerRegisterScreen";
import { SellerSuccessScreen } from "../screens/SellerSuccessScreen";
import { SupplierRegisterScreen } from "../screens/SupplierRegisterScreen";
import { SupplierSuccessScreen } from "../screens/SupplierSuccessScreen";
import { BrandRegisterScreen } from "../screens/BrandRegisterScreen";
import { BrandSuccessScreen } from "../screens/BrandSuccessScreen";
import { NotificationTestScreen } from "../screens/NotificationTestScreen";
import { AppInfoScreen } from "../screens/AppInfoScreen";
import { HelpCenterScreen } from "../screens/HelpCenterScreen";
import { ReportProblemScreen } from "../screens/ReportProblemScreen";
import { LanguageScreen } from "../screens/LanguageScreen";
import { MyTrialsScreen } from "../screens/MyTrialsScreen";
import { TrialRegisterScreen } from "../screens/TrialRegisterScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ChatListScreen } from "../screens/ChatListScreen";
import { AIAssistantScreen } from "../screens/AIAssistantScreen";
import { AIHistoryScreen } from "../screens/AIHistoryScreen";
import { MyShopScreen } from "../screens/MyShopScreen";
import type { MarketDoc, DocKind } from "../screens/MyShopScreen";
import { ShopDocDetailScreen } from "../screens/ShopDocDetailScreen";
import { MyShopMenuScreen } from "../screens/MyShopMenuScreen";
import { ShopAccountScreen } from "../screens/ShopAccountScreen";
import { ShopAddressScreen } from "../screens/ShopAddressScreen";
import { ShopNotificationsScreen } from "../screens/ShopNotificationsScreen";
import { ShopShippingScreen } from "../screens/ShopShippingScreen";
import { ShopPayoutScreen } from "../screens/ShopPayoutScreen";
import { ShopComplaintDetailScreen } from "../screens/ShopComplaintDetailScreen";
import { ShopComplaintsScreen } from "../screens/ShopComplaintsView";
import { ShopReportScreen } from "../screens/ShopReportView";
import { ShopManagerChatScreen } from "../screens/ShopManagerChatScreen";
import { CafeScreen } from "../screens/CafeScreen";
import { SupplierInfoScreen } from "../screens/SupplierInfoScreen";
import { BrandInfoScreen } from "../screens/BrandInfoScreen";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { GlassBackButton } from "../components/GlassBackButton";
import { BRAND_GREEN } from "../theme/tokens";
import type { Product } from "../types/Product";
import type { Article } from "../data/articles";
import type { OrderStatus } from "../data/orders";

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Login: undefined;
  Register: undefined;
  ProductDetail: { product: Product; preview?: boolean };
  ArticleDetail: { article: Article };
  Orders: { initialTab?: OrderStatus | "all" | "pending_group" } | undefined;
  OrderDetail: { orderId: string };
  OrderReview: { orderId: string };
  AccountInfo: undefined;
  Address: undefined;
  Wishlist: undefined;
  Coupons: undefined;
  Settings: undefined;
  About: undefined;
  ComplaintSelect: { orderId?: string; shopName?: string } | undefined;
  ComplaintForm: { orderId?: string; type?: "damaged" | "wrong_item" | "return" | "refund" } | undefined;
  ComplaintTypeSelect: { orderId?: string; current?: "damaged" | "wrong_item" | "return" | "refund" } | undefined;
  RefundChannelSelect: undefined;
  AddBankAccount: undefined;
  ComplaintStatus: undefined;
  CouponCollect: undefined;
  // Pushed from Home "ดูทั้งหมด" (no longer bottom-tab screens).
  Products: undefined;
  ProductFilter: undefined;
  Knowledge: { tab?: "articles" | "videos" } | undefined;
  Account: undefined;
  HerbalMarket: undefined;
  HerbalMarketDetail: { id?: string; preview?: boolean } | undefined;
  HerbalMarketPR: { id?: string; ids?: string[] } | undefined;
  HerbalMarketPurchase: { id?: string; qty?: number } | undefined;
  HerbalMarketQuote: { id?: string; ids?: string[] } | undefined;
  HerbalMarketSample: { id?: string } | undefined;
  TrialProducts: undefined;
  TrialDetail: { id?: string } | undefined;
  TrialApply: { id?: string } | undefined;
  TrialSuccess: { productName: string; rewardPoints: number };
  TrialRequestDetail: { id: string };
  TrialEval: { id: string; kind: "pre" | "post" };
  TrialRegistryDetail: { id: string };
  TrialAddProduct: { editId?: string } | undefined;
  TrialEvalSuccess: { productName: string; points: number; completed: boolean };
  B2BDocs: { kind: "rfq" | "pr" | "po" };
  B2BDocDetail: { kind: "rfq" | "pr" | "po"; id: string };
  AppSettings: undefined;
  NotificationSettings: undefined;
  PaymentAccounts: undefined;
  SecuritySettings: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  SellerRegister: undefined;
  SellerSuccess: undefined;
  SupplierRegister: undefined;
  SupplierSuccess: undefined;
  BrandRegister: undefined;
  BrandSuccess: undefined;
  NotificationTest: undefined;
  AppInfo: undefined;
  HelpCenter: undefined;
  ReportProblem: undefined;
  Language: undefined;
  MyTrials: undefined;
  TrialRegister: undefined;
  Chat: { shopId?: string; shopName?: string } | undefined;
  ChatList: undefined;
  AIAssistant: { context?: string } | undefined;
  AIHistory: undefined;
  MyShop: { section?: string } | undefined;
  ShopDocDetail: { doc: MarketDoc; kind: DocKind };
  MyShopMenu: { current?: string; onSelect?: (id: string) => void } | undefined;
  ShopAccount: undefined;
  ShopAddress: undefined;
  ShopNotifications: undefined;
  ShopShipping: undefined;
  ShopPayout: undefined;
  ShopComplaintDetail: { id: string };
  ShopComplaints: undefined;
  ShopReport: { kind: "sales" | "customers" | "products" | "market" };
  ShopManagerChat: undefined;
  Cafe: undefined;
  SupplierInfo: undefined;
  BrandInfo: undefined;
  Cart: undefined;
  Payment: undefined;
  PromptPayQR: { total: number; orderId: string };
  PaymentSuccess: { orderId: string; total: number; methodLabel: string; methodDesc?: string };
  PaymentMethod: undefined;
  ShippingMethod: undefined;
  CouponSelect: undefined;
  AddressSelect: undefined;
  AddAddress: { id?: string } | undefined;
  AddCard: undefined;
  TrueMoneyLink: undefined;
  Notification: undefined;
  ShopNotification: undefined;
  Shop: { shopName?: string; sort?: SortKey; category?: string; herbalSort?: HerbalSortKey; herbalCategory?: string } | undefined;
  ShopSort: { current?: SortKey; category?: string; categories?: string[] } | undefined;
  ShopHerbalFilter: { sort?: HerbalSortKey; category?: string; categories?: string[] } | undefined;
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
      // Solid opaque bar — translucent let the page content bleed up behind the
      // labels (looked cluttered). Opaque keeps the labels on a clean background.
      translucent={false}
      scrollEdgeAppearance="opaque"
      tabBarStyle={{ backgroundColor: "#ffffff" }}
      // Don't let the iOS 26 tab bar minimize on scroll — it leaves labels
      // half-collapsed (sunk to the bottom) when navigating between screens.
      minimizeBehavior="never"
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
        options={{ title: "ทดลอง", tabBarIcon: () => ({ sfSymbol: "shippingbox.fill" }) }}
      />
      <Tab.Screen
        name="HerbalMarket"
        component={HerbalTab}
        options={{ title: "Market", tabBarIcon: () => ({ sfSymbol: "leaf.fill" }) }}
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
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="OrderReview"
        component={OrderReviewScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen name="AccountInfo" component={AccountInfoScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Address" component={AddressScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Coupons" component={CouponsScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: "ตั้งค่า" }} />
      {/* Pushed from Home "ดูทั้งหมด" — they render their own green BrandHeader,
          so no stack header (iOS edge-swipe goes back). */}
      <Stack.Screen name="Products" component={ProductsScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ProductFilter" component={ProductFilterScreen} options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="Knowledge" component={KnowledgeScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ComplaintSelect" component={ComplaintSelectScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ComplaintForm" component={ComplaintFormScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ComplaintTypeSelect" component={ComplaintTypeSelectScreen} options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
      <Stack.Screen name="RefundChannelSelect" component={RefundChannelSelectScreen} options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
      <Stack.Screen name="AddBankAccount" component={AddBankAccountScreen} options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
      <Stack.Screen name="ComplaintStatus" component={ComplaintStatusScreen} options={{ headerShown: true, title: "สถานะการร้องเรียน", animation: "slide_from_right" }} />
      <Stack.Screen name="CouponCollect" component={CouponCollectScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="HerbalMarketDetail" component={HerbalMarketDetailScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="HerbalMarketPR" component={HerbalMarketPRScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="HerbalMarketPurchase" component={HerbalMarketPurchaseScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="HerbalMarketQuote" component={HerbalMarketQuoteScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="HerbalMarketSample" component={HerbalMarketSampleScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="TrialDetail" component={TrialDetailScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="TrialApply" component={TrialApplyScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="TrialSuccess" component={TrialSuccessScreen} options={{ headerShown: false, animation: "slide_from_right", gestureEnabled: false }} />
      <Stack.Screen name="TrialRequestDetail" component={TrialRequestDetailScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="TrialEval" component={TrialEvalScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="TrialRegistryDetail" component={TrialRegistryDetailScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="TrialAddProduct" component={TrialAddProductScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="TrialEvalSuccess" component={TrialEvalSuccessScreen} options={{ headerShown: false, animation: "slide_from_right", gestureEnabled: false }} />
      <Stack.Screen name="B2BDocs" component={B2BDocsScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="B2BDocDetail" component={B2BDocDetailScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="AppSettings" component={AppSettingsScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="PaymentAccounts" component={PaymentAccountsScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="SellerRegister" component={SellerRegisterScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="SellerSuccess" component={SellerSuccessScreen} options={{ animation: "slide_from_right", gestureEnabled: false }} />
      <Stack.Screen name="SupplierRegister" component={SupplierRegisterScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="SupplierSuccess" component={SupplierSuccessScreen} options={{ animation: "slide_from_right", gestureEnabled: false }} />
      <Stack.Screen name="BrandRegister" component={BrandRegisterScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="BrandSuccess" component={BrandSuccessScreen} options={{ animation: "slide_from_right", gestureEnabled: false }} />
      <Stack.Screen name="NotificationTest" component={NotificationTestScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="AppInfo" component={AppInfoScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ReportProblem" component={ReportProblemScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Language" component={LanguageScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="MyTrials" component={MyTrialsScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="TrialRegister" component={TrialRegisterScreen} options={{ headerShown: true, title: "ลงทะเบียนนักรีวิว", animation: "slide_from_right" }} />
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="AIHistory" component={AIHistoryScreen} options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
      <Stack.Screen name="MyShop" component={MyShopScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="ShopDocDetail" component={ShopDocDetailScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="MyShopMenu" component={MyShopMenuScreen} options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
      <Stack.Screen name="ShopAccount" component={ShopAccountScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="ShopAddress" component={ShopAddressScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="ShopNotifications" component={ShopNotificationsScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="ShopShipping" component={ShopShippingScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="ShopPayout" component={ShopPayoutScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="ShopComplaintDetail" component={ShopComplaintDetailScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="ShopComplaints" component={ShopComplaintsScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="ShopReport" component={ShopReportScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="ShopManagerChat" component={ShopManagerChatScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="Cafe" component={CafeScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="SupplierInfo" component={SupplierInfoScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="BrandInfo" component={BrandInfoScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
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
      <Stack.Screen name="ShopNotification" component={ShopNotificationScreen} options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen
        name="Shop"
        component={ShopScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="ShopSort"
        component={ShopSortScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }}
      />
      <Stack.Screen
        name="ShopHerbalFilter"
        component={ShopHerbalFilterScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }}
      />
      <Stack.Screen name="Login" component={LoginScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: "slide_from_right" }} />
    </Stack.Navigator>
  );
}
