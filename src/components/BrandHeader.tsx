import { useRef, type ReactNode } from "react";
import { Animated, Image, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, ChevronLeft, Search, ShoppingCart } from "lucide-react-native";
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
  showCart = true,
  searchPlaceholder = "ค้นหาสินค้า, สมุนไพร, ร้านค้า...",
  bellCount = 3,
  cartCount,
}: Props) {
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
  // Icons crossfade from the top row into the search row at the same pixel.
  const searchIconsOpacity = sy.interpolate({
    inputRange: [0, TOP_ROW_HEIGHT * 0.4, TOP_ROW_HEIGHT],
    outputRange: [0, 0.4, 1],
    extrapolate: "clamp",
  });
  const iconsTranslateY = sy.interpolate({
    inputRange: [0, TOP_ROW_HEIGHT],
    outputRange: [-TOP_ROW_HEIGHT, 0],
    extrapolate: "clamp",
  });
  // Room the 44px glass icons need in the search row (at right:18, gap 12),
  // keeping a ~12px gap from the search bar: 2 icons ≈ 118, 1 icon ≈ 64.
  const iconsRoom = showBell ? 118 : 64;
  const searchBarMarginRight = sy.interpolate({
    inputRange: [0, TOP_ROW_HEIGHT],
    outputRange: [0, iconsRoom],
    extrapolate: "clamp",
  });

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

      {/* Collapsible top row: logo + wordmark + bell + cart */}
      <Animated.View style={{ height: topRowHeight, opacity: topRowOpacity, overflow: "hidden" }}>
        <View
          className="flex-row items-center"
          style={{ height: TOP_ROW_HEIGHT, paddingLeft: 16, paddingRight: 18, gap: 12 }}
        >
          {back}
          {showLogo ? (
            <Image source={LOGO} style={{ width: 44, height: 44 }} resizeMode="contain" />
          ) : null}
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
        </View>
      </Animated.View>

      {/* Sticky search row — bar grows to full width as the icons fade out */}
      <View style={{ paddingLeft: 12, paddingRight: 12, paddingBottom: 12, paddingTop: 14 }}>
        <Animated.View style={{ marginRight: searchBarMarginRight }}>
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
        </Animated.View>

        {/* Icons revealed in the search row as the top row collapses */}
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: 4,
            right: 18,
            height: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            opacity: searchIconsOpacity,
            transform: [{ translateY: iconsTranslateY }],
          }}
        >
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
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
