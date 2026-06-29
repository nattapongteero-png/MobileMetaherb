import "./src/styles/global.css";
import { useEffect, useState } from "react";
import { Platform, Text, View, TextInput } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  IBMPlexSansThaiLooped_400Regular,
  IBMPlexSansThaiLooped_500Medium,
  IBMPlexSansThaiLooped_600SemiBold,
  IBMPlexSansThaiLooped_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-thai-looped";
import { RootStack } from "./src/navigation/RootStack";
import { SplashScreen } from "./src/components/SplashScreen";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { CartProvider } from "./src/context/CartContext";
import { ProductFilterProvider } from "./src/context/ProductFilterContext";
import { PaymentProvider } from "./src/context/PaymentContext";
import { OrderProvider } from "./src/context/OrderContext";
import { RefundProvider } from "./src/context/RefundContext";
import { WishlistProvider } from "./src/context/WishlistContext";
import { TrialProvider } from "./src/context/TrialContext";
import { LanguageProvider } from "./src/context/LanguageContext";
import { ChatProvider } from "./src/context/ChatContext";
import { AIAssistantProvider } from "./src/context/AIAssistantContext";
import { SecurityProvider } from "./src/context/SecurityContext";
import { SellerProvider } from "./src/context/SellerContext";
import { ComplaintProvider } from "./src/context/ComplaintContext";

// Keep the branded splash up at least this long so a fast font load doesn't
// flash it for a single frame.
const MIN_SPLASH_MS = 1200;

const MOBILE_MAX_WIDTH = 430;

// Map fontWeight values to the loaded Thai font family — RN doesn't auto-pick
// a weight variant from a base family, so we resolve via fontWeight at render.
function applyThaiFontDefault() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TextAny = Text as any;
  if (TextAny.__thaiPatched) return;
  TextAny.__thaiPatched = true;
  const original = TextAny.render;

  const resolveFamily = (weight?: string | number): string => {
    const w = String(weight ?? "400");
    if (w === "700" || w === "bold") return "IBMPlexSansThaiLooped_700Bold";
    if (w === "600") return "IBMPlexSansThaiLooped_600SemiBold";
    if (w === "500") return "IBMPlexSansThaiLooped_500Medium";
    return "IBMPlexSansThaiLooped_400Regular";
  };

  // Inject default fontFamily on every <Text>. The user's explicit fontFamily
  // (if any) still wins because it's spread AFTER our default.
  TextAny.render = function (...args: unknown[]) {
    const element = original.apply(this, args);
    const flat = Array.isArray(element.props.style)
      ? Object.assign({}, ...element.props.style.filter(Boolean))
      : { ...(element.props.style || {}) };
    const family = flat.fontFamily || resolveFamily(flat.fontWeight);
    return {
      ...element,
      props: {
        ...element.props,
        style: [{ fontFamily: family }, element.props.style],
      },
    };
  };

  // Same default for TextInput so placeholders + values use the Thai font.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (TextInput as any).defaultProps.style = [
    { fontFamily: "IBMPlexSansThaiLooped_400Regular" },
    (TextInput as any).defaultProps.style,
  ];
}

export default function App() {
  const [fontsLoaded] = useFonts({
    IBMPlexSansThaiLooped_400Regular,
    IBMPlexSansThaiLooped_500Medium,
    IBMPlexSansThaiLooped_600SemiBold,
    IBMPlexSansThaiLooped_700Bold,
  });

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (fontsLoaded) applyThaiFontDefault();

  if (!fontsLoaded || !minTimeElapsed) {
    return <SplashScreen />;
  }

  const tree = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <ErrorBoundary>
            <LanguageProvider>
            <ChatProvider>
            <CartProvider>
              <ProductFilterProvider>
                <PaymentProvider>
                  <OrderProvider>
                    <AIAssistantProvider>
                      <RefundProvider>
                        <WishlistProvider>
                          <TrialProvider>
                            <SecurityProvider>
                              <SellerProvider>
                                <ComplaintProvider>
                                  <RootStack />
                                </ComplaintProvider>
                              </SellerProvider>
                            </SecurityProvider>
                          </TrialProvider>
                        </WishlistProvider>
                      </RefundProvider>
                    </AIAssistantProvider>
                  </OrderProvider>
                </PaymentProvider>
              </ProductFilterProvider>
            </CartProvider>
            </ChatProvider>
            </LanguageProvider>
          </ErrorBoundary>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  if (Platform.OS === "web") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          backgroundColor: "#1f2937",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: MOBILE_MAX_WIDTH,
            height: "100%",
            backgroundColor: "#fafafa",
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
          }}
        >
          {tree}
        </View>
      </View>
    );
  }

  return tree;
}
