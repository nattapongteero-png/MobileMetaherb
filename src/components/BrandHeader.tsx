import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Image, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Bell, ChevronLeft, Search, ShoppingCart, Sparkles } from "lucide-react-native";
import { isTablet, tabletSearchBarWidth } from "../theme/layout";
import { GlassIconButton } from "./GlassIconButton";
import { CountBadge } from "./CountBadge";
import { BRAND_GREEN } from "../theme/tokens";
import { useCart } from "../context/CartContext";

// Notification / cart header button — Liquid Glass (iOS 26) like the product
// detail screen, 44px, with a count badge pinned to the top-right corner.
function GlassHeaderButton({
  onPress,
  icon,
  count,
  accessibilityLabel,
}: {
  onPress: () => void;
  icon: ReactNode;
  count: number;
  accessibilityLabel: string;
}) {
  return (
    <View>
      <GlassIconButton onPress={onPress} size={44} accessibilityLabel={accessibilityLabel}>
        {icon}
      </GlassIconButton>
      <View style={{ position: "absolute", top: -2, right: -4 }} pointerEvents="none">
        <CountBadge count={count} />
      </View>
    </View>
  );
}

const LOGO = require("../../assets/logo.png");
const LEAF_B = require("../../assets/herb-leaf-b.png");
const LEAF_C = require("../../assets/herb-leaf-c.png");
const LEAF_D = require("../../assets/herb-leaf-d.png");

// Logo + wordmark row collapses to 0 as the user scrolls past this distance.
const TOP_ROW_HEIGHT = 60;

type Props = {
  query?: string;
  onChangeQuery?: (s: string) => void;
  onBell: () => void;
  onCart: () => void;
  /** When set, a back button appears at the left of the header (subpage mode). */
  onBack?: () => void;
  /** Show the search bar row. When false, the header is static (no collapse). */
  showSearch?: boolean;
  /** Custom control rendered in the header (green) where the search bar sits —
   *  e.g. a บทความ/วิดีโอ tab switcher. Used with showSearch={false}. */
  bottomSlot?: ReactNode;
  /** Wordmark line — defaults to the brand name; pass the page name on tabs. */
  title?: string;
  /** Secondary line under the title. */
  subtitle?: string;
  /** Title font size. Defaults to 18 (brand wordmark); pass 20 for a page heading. */
  titleSize?: number;
  /** Show the round brand logo to the left of the title. */
  showLogo?: boolean;
  /** Show the notification (bell) button. */
  showBell?: boolean;
  /** Show the เมต้า AI button (left of the bell). Navigates to AIAssistant. */
  showAI?: boolean;
  /** Show the cart button. */
  showCart?: boolean;
  /** Scroll position of the page below. When provided, the header collapses
   *  on scroll exactly like HomeScreen. Omit for a static header. */
  scrollY?: Animated.Value;
  searchPlaceholder?: string;
  bellCount?: number;
  cartCount?: number;
};

/**
 * Shared green brand header (logo + METAHERB wordmark + tagline + bell/cart +
 * search) with the SAME scroll-collapse behaviour as HomeScreen, so secondary
 * tabs feel identical to Home (Jakob's Law).
 */
export function BrandHeader({
  query = "",
  onChangeQuery,
  onBell,
  onCart,
  onBack,
  showSearch = true,
  bottomSlot,
  scrollY,
  title = "METAHERB",
  subtitle = "สมุนไพรไทยเพื่อสุขภาพดี",
  titleSize = 18,
  showLogo = true,
  showBell = true,
  showAI = true,
  showCart = true,
  searchPlaceholder = "ค้นหาสินค้า, สมุนไพร, ร้านค้า...",
  bellCount = 3,
  cartCount,
}: Props) {
  const nav = useNavigation();
  // Cart badge reflects the shared cart unless a screen overrides cartCount.
  const { count: liveCartCount } = useCart();
  const effectiveCartCount = cartCount ?? liveCartCount;
  // Fallback keeps the header in its expanded state when no scrollY is wired.
  const fallback = useRef(new Animated.Value(0)).current;
  const sy = scrollY ?? fallback;

  const topRowHeight = sy.interpolate({
    inputRange: [0, TOP_ROW_HEIGHT],
    outputRange: [TOP_ROW_HEIGHT, 0],
    extrapolate: "clamp",
  });
  const topRowOpacity = sy.interpolate({
    inputRange: [0, TOP_ROW_HEIGHT * 0.6, TOP_ROW_HEIGHT],
    outputRange: [1, 0.2, 0],
    extrapolate: "clamp",
  });
  // Direction-aware search row: hide when scrolling down, reveal when scrolling
  // up (always shown near the top). The top row (logo + actions) stays put.
  const SEARCH_ROW_HEIGHT = 70; // paddingTop 14 + bar 44 + paddingBottom 12
  const searchVisible = useRef(new Animated.Value(1)).current;
  const lastSearchY = useRef(0);
  const searchTarget = useRef(1);
  useEffect(() => {
    const id = sy.addListener(({ value }) => {
      const y = value;
      const prev = lastSearchY.current;
      lastSearchY.current = y;
      let t = searchTarget.current;
      if (y < 90) t = 1;
      else if (y - prev > 6) t = 0;
      else if (prev - y > 6) t = 1;
      if (t !== searchTarget.current) {
        searchTarget.current = t;
        Animated.timing(searchVisible, { toValue: t, duration: 300, useNativeDriver: false }).start();
      }
    });
    return () => sy.removeListener(id);
  }, [sy, searchVisible]);
  const searchRowHeight = searchVisible.interpolate({ inputRange: [0, 1], outputRange: [0, SEARCH_ROW_HEIGHT] });

  const leaves = (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}
    >
      <Image source={LEAF_D} style={{ position: "absolute", top: 4, right: 6, width: 100, height: 100, opacity: 0.45, transform: [{ rotate: "28deg" }] }} resizeMode="contain" />
      <Image source={LEAF_B} style={{ position: "absolute", top: 32, left: 24, width: 38, height: 38, opacity: 0.4, transform: [{ rotate: "-22deg" }] }} resizeMode="contain" />
      <Image source={LEAF_C} style={{ position: "absolute", top: 60, left: "44%", width: 52, height: 52, opacity: 0.28, transform: [{ rotate: "60deg" }] }} resizeMode="contain" />
      <Image source={LEAF_C} style={{ position: "absolute", top: 92, right: 14, width: 78, height: 78, opacity: 0.4, transform: [{ rotate: "85deg" }] }} resizeMode="contain" />
    </View>
  );

  const ai = showAI ? (
    <GlassIconButton
      onPress={() => (nav.navigate as (r: string) => void)("AIAssistant")}
      size={44}
      accessibilityLabel="ผู้ช่วย AI เมต้า"
    >
      <Sparkles size={20} color="#1a1a1a" />
    </GlassIconButton>
  ) : null;

  const bell = showBell ? (
    <GlassHeaderButton
      onPress={onBell}
      icon={<Bell size={20} color="#1a1a1a" />}
      count={bellCount}
      accessibilityLabel="การแจ้งเตือน"
    />
  ) : null;

  const cart = showCart ? (
    <GlassHeaderButton
      onPress={onCart}
      icon={<ShoppingCart size={20} color="#1a1a1a" />}
      count={effectiveCartCount}
      accessibilityLabel="ตะกร้าสินค้า"
    />
  ) : null;

  const back = onBack ? (
    <GlassIconButton onPress={onBack} size={40} accessibilityLabel="ย้อนกลับ">
      <ChevronLeft size={20} color="#1a1a1a" strokeWidth={2.4} />
    </GlassIconButton>
  ) : null;

  const titleBlock = (
    <View className="flex-1">
      <Text style={{ color: "white", fontSize: titleSize, fontWeight: "700", includeFontPadding: false, letterSpacing: 0.5 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, includeFontPadding: false, lineHeight: 16, marginTop: 2 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  // Static header (no search, no collapse) — used by tabs that show their own
  // controls (e.g. the Knowledge tab's บทความ/วิดีโอ switcher).
  if (!showSearch) {
    return (
      <SafeAreaView edges={["top"]} style={{ backgroundColor: BRAND_GREEN }}>
        {leaves}
        {/* Title row collapses on scroll (like Home), leaving the bottomSlot sticky */}
        <Animated.View style={{ height: topRowHeight, opacity: topRowOpacity, overflow: "hidden" }}>
          <View
            className="flex-row items-center"
            style={{ height: TOP_ROW_HEIGHT, paddingLeft: 16, paddingRight: 18, gap: 12 }}
          >
            {back}
            {showLogo ? <Image source={LOGO} style={{ width: 44, height: 44 }} resizeMode="contain" /> : null}
            {titleBlock}
            {ai}
            {bell}
            {cart}
          </View>
        </Animated.View>
        {bottomSlot ? (
          <View style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 12 }}>{bottomSlot}</View>
        ) : (
          <View style={{ height: 12 }} />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: BRAND_GREEN }}>
      {/* Decorative herb-leaf watermark — same composition as Home's header */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}
      >
        <Image source={LEAF_D} style={{ position: "absolute", top: 4, right: 6, width: 100, height: 100, opacity: 0.45, transform: [{ rotate: "28deg" }] }} resizeMode="contain" />
        <Image source={LEAF_B} style={{ position: "absolute", top: 32, left: 24, width: 38, height: 38, opacity: 0.4, transform: [{ rotate: "-22deg" }] }} resizeMode="contain" />
        <Image source={LEAF_C} style={{ position: "absolute", top: 60, left: "44%", width: 52, height: 52, opacity: 0.28, transform: [{ rotate: "60deg" }] }} resizeMode="contain" />
        <Image source={LEAF_C} style={{ position: "absolute", top: 92, right: 14, width: 78, height: 78, opacity: 0.4, transform: [{ rotate: "85deg" }] }} resizeMode="contain" />
      </View>

      {/* Persistent top row: logo + wordmark + bell + cart — always visible */}
      <View>
        <View
          className="flex-row items-center"
          style={{ height: TOP_ROW_HEIGHT, paddingLeft: 16, paddingRight: 18, gap: 12 }}
        >
          {back}
          {showLogo ? (
            <Image source={LOGO} style={{ width: 44, height: 44 }} resizeMode="contain" />
          ) : null}
          <View className={isTablet() ? "" : "flex-1"}>
            <Text style={{ color: "white", fontSize: titleSize, fontWeight: "700", includeFontPadding: false, letterSpacing: 0.5 }}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, includeFontPadding: false, lineHeight: 16, marginTop: 2 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {/* Push the action buttons to the right on tablets (title lost its
              flex-1; the search floats centered as an overlay below). */}
          {isTablet() ? <View style={{ flex: 1 }} /> : null}

          {ai}
          {showBell ? (
            <GlassHeaderButton
              onPress={onBell}
              icon={<Bell size={20} color="#1a1a1a" />}
              count={bellCount}
              accessibilityLabel="การแจ้งเตือน"
            />
          ) : null}
          <GlassHeaderButton
            onPress={onCart}
            icon={<ShoppingCart size={20} color="#1a1a1a" />}
            count={effectiveCartCount}
            accessibilityLabel="ตะกร้าสินค้า"
          />

          {/* iPad — search floats dead-center of the top row; phones keep the
              dedicated row below. */}
          {isTablet() ? (
            <View
              pointerEvents="box-none"
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
            >
              <View
                className="flex-row items-center rounded-full px-4"
                style={{
                  width: tabletSearchBarWidth(),
                  height: 42,
                  backgroundColor: "#ffffff",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                }}
              >
                <Search size={17} color={BRAND_GREEN} />
                <TextInput
                  value={query}
                  onChangeText={onChangeQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor="#a3a3a3"
                  returnKeyType="search"
                  style={{ flex: 1, marginLeft: 8, fontSize: 13, color: "#374151" }}
                />
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {/* iPad — extra green breathing room under the header (the search row
          moved up into the top row, so give some space back). */}
      {isTablet() ? <View style={{ height: 28 }} /> : null}

      {/* Search row — full-width bar that hides on scroll-down, returns on
          scroll-up. iPad puts the search in the top row instead. */}
      <Animated.View style={{ height: isTablet() ? 0 : searchRowHeight, opacity: searchVisible, overflow: "hidden" }}>
        <View style={{ paddingLeft: 12, paddingRight: 12, paddingBottom: 12, paddingTop: 14 }}>
          <View
            className="flex-row items-center rounded-full px-4"
            style={{
              height: 44,
              backgroundColor: "#ffffff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
            }}
          >
            <Search size={18} color={BRAND_GREEN} />
            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor="#a3a3a3"
              returnKeyType="search"
              style={{ flex: 1, marginLeft: 8, fontSize: 13, color: "#374151" }}
            />
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
