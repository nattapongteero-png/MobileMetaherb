import { useEffect, useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Star } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import type { Product } from "../types/Product";
import type { RootStackParamList } from "../navigation/RootStack";
import { STAR_YELLOW } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Coupon tag icon — same vector path as web (svg-7w99agzzp8 → p1939b280)
const COUPON_SVG_PATH =
  "M7.26822 14.3069L13.2794 8.03003C13.7418 7.54819 13.7727 7.27194 13.7727 6.59735V4.15596C13.7727 3.47495 13.6185 3.26293 13.15 2.77465L11.7319 1.29698C11.2695 0.815134 11.0661 0.648091 10.4125 0.648091H8.06351C7.41614 0.648091 7.15723 0.680215 6.69484 1.16206L0.66509 7.43253C-0.216556 8.35127 -0.228887 9.30211 0.671259 10.2401L4.57393 14.3005C5.48024 15.2385 6.38656 15.2257 7.26822 14.3069ZM6.60235 13.5296C6.16459 13.9921 5.68986 13.9986 5.23979 13.5231L1.4111 9.53981C0.961028 9.0708 0.967196 8.57614 1.40493 8.11996L7.39152 1.89448C7.52094 1.76598 7.64431 1.68246 7.85391 1.68246H10.4495C10.6468 1.68246 10.7701 1.75956 10.9058 1.89448L12.5827 3.64199C12.7122 3.7769 12.78 3.91182 12.78 4.11099V6.82221C12.78 7.03418 12.706 7.16912 12.5827 7.2976L6.60235 13.5296ZM9.69115 5.78783C10.1721 5.78783 10.5358 5.39592 10.5358 4.90765C10.5358 4.41295 10.1721 4.02747 9.69115 4.02747C9.21027 4.02747 8.84655 4.41295 8.84655 4.90765C8.84655 5.39592 9.21027 5.78783 9.69115 5.78783Z";

function CouponIcon() {
  return (
    <Svg width={14} height={15} viewBox="0 0 14 15" fill="none">
      <Path d={COUPON_SVG_PATH} fill="#DF9723" />
    </Svg>
  );
}

type CardTag = "flashsale" | "discount" | "recommended" | null;

function getCardTag(p: Product): CardTag {
  if (p.isFlashSale) return "flashsale";
  if (p.discountPercent) return "discount";
  if (p.isRecommended) return "recommended";
  return null;
}

// Uniform height for all image-overlay tags across the home cards so
// "ลด" / "แนะนำ" / "คงเหลือ" / "เหลือ …" pills line up at the same height.
const OVERLAY_TAG_H = 22;

function TagPill({ color, label }: { color: string; label: string }) {
  return (
    <View
      style={{
        backgroundColor: color,
        height: OVERLAY_TAG_H,
        paddingHorizontal: 9,
        borderRadius: 9999,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 11,
          fontWeight: "600",
          lineHeight: 14,
          includeFontPadding: false,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function MiniCountdown({ initialSeconds }: { initialSeconds: number }) {
  const [sec, setSec] = useState(initialSeconds);
  useEffect(() => {
    const t = setInterval(() => setSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return (
    <View className="flex-row items-center" style={{ gap: 3 }}>
      {[h, m, s].map((t, i) => (
        <View key={i} className="flex-row items-center" style={{ gap: 3 }}>
          <View
            className="rounded-[4px] bg-[#bc1b06] items-center justify-center"
            style={{ width: 18, height: 18 }}
          >
            <Text className="text-[10px] text-white font-bold" style={{ lineHeight: 12 }}>
              {t}
            </Text>
          </View>
          {i < 2 && <Text className="text-[11px] text-white font-semibold">:</Text>}
        </View>
      ))}
    </View>
  );
}

/**
 * Shared 2-column product card used by HomeScreen + ShopScreen. Keeping a
 * single definition avoids visual drift between surfaces (Jakob's Law +
 * Consistency Heuristic).
 */
export function ProductCard({ product, width }: { product: Product; width: number }) {
  const nav = useNavigation<Nav>();
  const tag = getCardTag(product);
  const priceColor = product.discountPercent ? "#e62e05" : "#226a3b";

  return (
    <Pressable
      onPress={() => nav.navigate("ProductDetail", { product })}
      style={{
        width,
        height: 259,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
      }}
      className="bg-white rounded-2xl border border-[#d4d4d4] overflow-hidden active:opacity-90 active:scale-95"
    >
      {/* Image area */}
      <View className="flex-1 relative bg-gray-100">
        <Image
          source={product.image as number}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />

        {/* Top-right discount tag — "ลด N%" (matches web home cards) */}
        {tag === "flashsale" || tag === "discount" ? (
          <View className="absolute top-0 right-0 p-1.5">
            <TagPill color="#e62e05" label={`ลด ${product.discountPercent}%`} />
          </View>
        ) : null}
        {tag === "recommended" ? (
          <View className="absolute top-0 right-0 p-1.5">
            <TagPill color="#319754" label="แนะนำ" />
          </View>
        ) : null}

        {/* Flash sale badge bottom-left with live per-card countdown — same as
            the web flash cards (rounded-tr corner, blurred red pill). */}
        {tag === "flashsale" ? (
          <View
            className="absolute bottom-0 left-0 flex-row items-center"
            style={{
              backgroundColor: "rgba(230,46,5,0.85)",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderTopRightRadius: 12,
              gap: 6,
            }}
          >
            <Text style={{ color: "white", fontSize: 11, fontWeight: "600", includeFontPadding: false }}>
              Flash Sale
            </Text>
            <MiniCountdown initialSeconds={product.flashSaleEndsIn || 3600} />
          </View>
        ) : null}
      </View>

      {/* Info */}
      <View className="p-2.5" style={{ gap: 4 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: "#0a0a0a",
            includeFontPadding: false,
            lineHeight: 20,
          }}
        >
          {product.name}
        </Text>

        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: priceColor,
              includeFontPadding: false,
              lineHeight: 19,
            }}
          >
            ฿ {product.price.toFixed(2)}
          </Text>
          {product.originalPrice ? (
            <Text
              style={{
                fontSize: 10,
                color: "#a3a3a3",
                textDecorationLine: "line-through",
                includeFontPadding: false,
              }}
            >
              ฿{product.originalPrice.toFixed(2)}
            </Text>
          ) : null}
          {product.hasCoupon ? <CouponIcon /> : null}
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Star size={14} color={STAR_YELLOW} fill={STAR_YELLOW} />
            <Text style={{ fontSize: 10, color: "#0a0a0a", includeFontPadding: false }}>
              {product.rating}/5
            </Text>
          </View>
          <Text
            style={{
              fontSize: 10,
              color: "#0a0a0a",
              includeFontPadding: false,
              lineHeight: 14,
            }}
          >
            {product.sold}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
