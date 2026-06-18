import { type ReactNode } from "react";
import { View, Text, TextInput, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Search, ShoppingCart } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CountBadge } from "./CountBadge";
import { GlassIconButton } from "./GlassIconButton";
import { useCart } from "../context/CartContext";
import { BRAND_GREEN } from "../theme/tokens";

const LEAF = require("../../assets/herb-leaf-c.png");

/**
 * White minimal header for subpages — back + title (+subtitle), cart, an
 * optional search bar and an optional bottom slot. Soft shadow + a faint leaf
 * watermark give it a premium, on-brand feel.
 */
export function SubPageHeader({
  title,
  subtitle,
  onBack,
  onCart,
  showSearch = true,
  query = "",
  onChangeQuery,
  searchPlaceholder = "ค้นหาสินค้า, สมุนไพร, ร้านค้า...",
  bottomSlot,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  /** Provide on pushed subpages to show a back button; omit on tab/main pages. */
  onBack?: () => void;
  /** Omit to hide the cart button (e.g. when supplying a custom `rightSlot`). */
  onCart?: () => void;
  showSearch?: boolean;
  query?: string;
  onChangeQuery?: (s: string) => void;
  searchPlaceholder?: string;
  bottomSlot?: ReactNode;
  /** Custom right-side action; replaces the cart button when provided. */
  rightSlot?: ReactNode;
}) {
  const { count: cartCount } = useCart();

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ backgroundColor: "#fafafa", zIndex: 10 }}
    >
      {/* Soft light-green → white gradient backdrop */}
      <LinearGradient
        colors={["#d9f0e1", "#eaf6ee", "#fafafa"]}
        locations={[0, 0.55, 1]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* Faint leaf watermark — subtle brand texture */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
        <Image
          source={LEAF}
          style={{ position: "absolute", top: 2, right: -14, width: 96, height: 96, opacity: 0.08, transform: [{ rotate: "18deg" }] }}
          resizeMode="contain"
        />
      </View>

      {/* Title row */}
      <View
        className="flex-row items-center"
        style={{ minHeight: 56, paddingHorizontal: onBack ? 12 : 16, gap: 12 }}
      >
        {onBack ? (
          <GlassIconButton onPress={onBack} accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
          </GlassIconButton>
        ) : null}

        <View className="flex-1">
          <Text
            numberOfLines={1}
            style={{ fontSize: 19, fontWeight: "700", color: "#0a0a0a", lineHeight: 24, letterSpacing: 0.2 }}
          >
            {title}
          </Text>
          {subtitle ? (
            <View className="flex-row items-center" style={{ gap: 5, marginTop: 2 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: BRAND_GREEN }} />
              <Text numberOfLines={1} style={{ fontSize: 12, color: "#8a8f8a", lineHeight: 16 }}>
                {subtitle}
              </Text>
            </View>
          ) : null}
        </View>

        {rightSlot !== undefined ? (
          rightSlot
        ) : onCart ? (
          <View>
            <GlassIconButton onPress={onCart} accessibilityLabel="ตะกร้าสินค้า">
              <ShoppingCart size={20} color="#1a1a1a" />
            </GlassIconButton>
            <View style={{ position: "absolute", top: -2, right: -4 }} pointerEvents="none">
              <CountBadge count={cartCount} />
            </View>
          </View>
        ) : null}
      </View>

      {/* Search bar — white pill with hairline + soft shadow */}
      {showSearch ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: bottomSlot ? 8 : 14, paddingTop: 14 }}>
          <View
            className="flex-row items-center rounded-full px-4"
            style={{
              height: 46,
              backgroundColor: "#ffffff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Search size={18} color={BRAND_GREEN} />
            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor="#a3a3a3"
              returnKeyType="search"
              style={{ flex: 1, marginLeft: 10, fontSize: 13.5, color: "#374151" }}
            />
          </View>
        </View>
      ) : null}

      {/* Optional bottom slot (e.g. tab switcher) — even padding all round when
          it's the only content under the title (no search bar above it). */}
      {bottomSlot ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: showSearch ? 0 : 14 }}>{bottomSlot}</View>
      ) : null}
    </SafeAreaView>
  );
}
