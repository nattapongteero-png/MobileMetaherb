import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  FlatList,
  TextInput,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

// On web cap viewport at mobile size so layout that uses SCREEN_WIDTH
// (cards, banner aspect, paged scroll) renders like the phone build.
const MOBILE_MAX_WIDTH = 430;
const SCREEN_WIDTH =
  Platform.OS === "web"
    ? Math.min(Dimensions.get("window").width, MOBILE_MAX_WIDTH)
    : Dimensions.get("window").width;

const CATEGORIES = [
  { label: "สมุนไพร", icon: "leaf", color: "#52b788" },
  { label: "อาหาร", icon: "restaurant", color: "#f97316" },
  { label: "ยา", icon: "medkit", color: "#ef4444" },
  { label: "เครื่องหอม", icon: "flower", color: "#ec4899" },
  { label: "ความสวย", icon: "sparkles", color: "#a855f7" },
  { label: "ของขวัญ", icon: "gift", color: "#06b6d4" },
  { label: "ชาสมุนไพร", icon: "cafe", color: "#16a34a" },
  { label: "น้ำมันสกัด", icon: "water", color: "#0ea5e9" },
];

const MAIN_BANNERS = [
  require("../../assets/banner/banner_6_1772117418.jpg"),
  require("../../assets/banner/banner_14_1773319227.jpg"),
  require("../../assets/banner/banner_15_1773319212.jpg"),
];

const SIDE_BANNERS = [
  require("../../assets/banner/banner_10_1773194888.jpg"),
  require("../../assets/banner/banner_26_1778215046.jpg"),
];

const IMAGE_POOL = [
  require("../../assets/products/cinnamon.png"),
  require("../../assets/products/coffee.png"),
  require("../../assets/products/gift-ribbon.png"),
  require("../../assets/products/gift-set.png"),
  require("../../assets/products/herb-jar.png"),
  require("../../assets/products/dokjun.png"),
  require("../../assets/products/lemon.png"),
];

const NAME_POOL = [
  "อบเชยเทศ Cinnamon Varum 150g",
  "กาแฟดริป Dark Roast Arabica 9 ซอง",
  "ชุดของขวัญพรีเมียม ผูกโบว์",
  "ชุดของขวัญคุกกี้สมุนไพร",
  "เมต้าเฮิร์บ ยาดมสมุนไพร แดง+น้ำเงิน",
  "ดอกจันอบแห้ง คัดพิเศษ 30g",
  "เปลือกมะนาวอบแห้ง 50g",
  "ขมิ้นชันแคปซูล 60 เม็ด",
  "ชาสมุนไพร 9 ชนิด รวมในซองเดียว",
  "น้ำผึ้งดิบจากป่าธรรมชาติ 350ml",
  "ใบบัวบกอบแห้ง 30g",
  "อัญชันแห้ง พรีเมียม 100g",
  "ตะไคร้แห้งหั่นฝอย 80g",
  "กระชายอบแห้ง 100g",
  "มะตูมแห้งหั่นชง 200g",
  "เมต้าเฮิร์บ Herbal Inhaler Classic",
  "ชุดของขวัญ Cookies & Tea Set",
];

type ProductImage = number | { uri: string };

type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  rating: number;
  sold: string;
  image: ProductImage;
  isFlashSale?: boolean;
  isRecommended?: boolean;
  isFreeShipping?: boolean;
  hasCoupon?: boolean;
  flashSaleEndsIn?: number;
};

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeProduct(
  idx: number,
  name: string,
  opts: { flashSale?: boolean; recommended?: boolean },
): Product {
  // Price rounded to nearest 5 baht between 45–445
  const price = Math.round((45 + Math.random() * 400) / 5) * 5;
  const hasDiscount = Math.random() > 0.25;
  const discountPercent = hasDiscount ? Math.floor(Math.random() * 30) + 15 : undefined;
  const originalPrice = discountPercent
    ? Math.round(price / (1 - discountPercent / 100) / 5) * 5
    : undefined;
  const rating = Math.round((Math.random() * 9 + 41)) / 10; // 4.1 - 5.0
  const soldCount = Math.floor(Math.random() * 380) + 40;
  return {
    id: `${opts.flashSale ? "fs" : "r"}${idx + 1}`,
    name,
    price,
    originalPrice,
    discountPercent,
    rating,
    sold: `ขายได้ ${soldCount}+`,
    image: IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)],
    isFlashSale: opts.flashSale,
    isRecommended: opts.recommended,
    isFreeShipping: Math.random() > 0.5,
    hasCoupon: Math.random() > 0.5,
    flashSaleEndsIn: opts.flashSale
      ? Math.floor(Math.random() * 50000) + 3600
      : undefined,
  };
}

// Random shuffle name pool once on module load → split into two sections
const SHUFFLED_NAMES = shuffleArr(NAME_POOL);
const FLASH_SALE: Product[] = SHUFFLED_NAMES.slice(0, 6).map((n, i) =>
  makeProduct(i, n, { flashSale: true }),
);
const RECOMMENDED: Product[] = SHUFFLED_NAMES.slice(6, 12).map((n, i) =>
  makeProduct(i, n, { recommended: true }),
);

function FlashSaleCountdown() {
  const [time, setTime] = useState({ h: 12, m: 13, s: 8 });
  useEffect(() => {
    const id = setInterval(() => {
      setTime((p) => {
        let { h, m, s } = p;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <View className="flex-row items-center" style={{ gap: 4 }}>
      {[pad(time.h), pad(time.m), pad(time.s)].map((t, i) => (
        <View key={i} className="flex-row items-center" style={{ gap: 4 }}>
          <View
            className="bg-[#bc1b06] items-center justify-center"
            style={{ width: 28, paddingVertical: 3, borderRadius: 6 }}
          >
            <Text className="text-[13px] text-white font-semibold">{t}</Text>
          </View>
          {i < 2 && <Text className="text-[14px] text-black font-semibold">:</Text>}
        </View>
      ))}
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
          <View className="rounded-[4px] bg-[#bc1b06] items-center justify-center" style={{ width: 18, height: 18 }}>
            <Text className="text-[10px] text-white font-bold" style={{ lineHeight: 12 }}>{t}</Text>
          </View>
          {i < 2 && <Text className="text-[11px] text-white font-semibold">:</Text>}
        </View>
      ))}
    </View>
  );
}

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

function TagPill({ color, label }: { color: string; label: string }) {
  // Mirrors web: px-2.5 py-0.5 rounded-full text-[10px] font-semibold + colored shadow.
  // includeFontPadding:false + explicit lineHeight removes Android extra top space
  // that otherwise makes top/bottom padding look uneven.
  return (
    <View
      style={{
        backgroundColor: color,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 9999,
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
          fontSize: 10,
          fontWeight: "600",
          lineHeight: 12,
          includeFontPadding: false,
          textAlignVertical: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ProductCard({ product, width }: { product: Product; width: number }) {
  const tag = getCardTag(product);
  const priceColor = product.discountPercent ? "#e62e05" : "#226a3b";
  return (
    <Pressable
      style={{
        width,
        height: 259,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      }}
      className="bg-white rounded-2xl border border-[#d4d4d4] overflow-hidden active:opacity-90"
    >
      {/* Image area (flex-1) */}
      <View className="flex-1 relative bg-gray-100">
        <Image source={product.image} className="w-full h-full" resizeMode="cover" />

        {/* Top-right tag pill */}
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

        {/* Bottom-left Flash Sale badge with countdown */}
        {tag === "flashsale" ? (
          <View
            className="absolute bottom-0 left-0 flex-row items-center bg-[#e62e05]/80"
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderTopRightRadius: 12,
              gap: 6,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 11,
                fontWeight: "600",
                lineHeight: 13,
                includeFontPadding: false,
              }}
            >
              Flash Sale
            </Text>
            <MiniCountdown initialSeconds={product.flashSaleEndsIn || 3600} />
          </View>
        ) : null}
      </View>

      {/* Info section */}
      <View className="p-2.5" style={{ gap: 4 }}>
        <Text numberOfLines={1} className="text-[14px] text-black font-medium">
          {product.name}
        </Text>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Text className="text-[14px] font-semibold" style={{ color: priceColor }}>
            ฿ {product.price.toFixed(2)}
          </Text>
          {product.originalPrice ? (
            <Text className="text-[10px] text-[#a3a3a3] line-through">
              ฿{product.originalPrice.toFixed(2)}
            </Text>
          ) : null}
          {product.hasCoupon ? <CouponIcon /> : null}
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Ionicons name="star" size={12} color="#F7C42B" />
            <Text className="text-[10px] text-black">{product.rating}/5</Text>
          </View>
          <Text className="text-[10px] text-black">{product.sold}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function SectionHeader({
  title,
  rightSlot,
  onSeeAll,
  showSeeAll = true,
}: {
  title: string;
  rightSlot?: React.ReactNode;
  onSeeAll?: () => void;
  showSeeAll?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <Text className="text-[20px] text-black font-medium">{title}</Text>
        {rightSlot}
      </View>
      {showSeeAll ? (
        <Pressable onPress={onSeeAll} className="flex-row items-center" style={{ gap: 6 }}>
          <Text className="text-[12px] text-gray-500">ดูทั้งหมด</Text>
          <Ionicons name="chevron-forward" size={16} color="#6b7280" />
        </Pressable>
      ) : null}
    </View>
  );
}

const HORIZONTAL_PADDING = 16;
const CARD_GAP = 12;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function PagedProductList({ products }: { products: Product[] }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const cardWidth = Math.floor(
    (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2,
  );
  const pages = chunk(products, 2);

  return (
    <View>
      <Animated.FlatList
        data={pages}
        keyExtractor={(_: Product[], i: number) => `page-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const pair = item as Product[];
          return (
            <View
              style={{
                width: SCREEN_WIDTH,
                paddingHorizontal: HORIZONTAL_PADDING,
                flexDirection: "row",
                gap: CARD_GAP,
              }}
            >
              {pair.map((p) => (
                <ProductCard key={p.id} product={p} width={cardWidth} />
              ))}
              {pair.length === 1 ? <View style={{ width: cardWidth }} /> : null}
            </View>
          );
        }}
      />
      {pages.length > 1 ? (
        <View
          className="flex-row items-center justify-center mt-3"
          style={{ gap: 6 }}
        >
          {pages.map((_, i) => {
            const inputRange = [
              (i - 1) * SCREEN_WIDTH,
              i * SCREEN_WIDTH,
              (i + 1) * SCREEN_WIDTH,
            ];
            const width = scrollX.interpolate({
              inputRange,
              outputRange: [6, 18, 6],
              extrapolate: "clamp",
            });
            const backgroundColor = scrollX.interpolate({
              inputRange,
              outputRange: ["#d4d4d4", "#319754", "#d4d4d4"],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={i}
                style={{
                  height: 6,
                  width,
                  borderRadius: 3,
                  backgroundColor,
                }}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function HomeScreen() {
  const [bannerIdx, setBannerIdx] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const id = setInterval(() => {
      setBannerIdx((p) => (p + 1) % MAIN_BANNERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const cardWidth = Math.floor((SCREEN_WIDTH - 16 * 2 - 12) / 2);

  return (
    <View className="flex-1 bg-[#fafafa]">
      <StatusBar style="dark" />
      <SafeAreaView edges={["top"]} className="bg-white">
        {/* Top bar */}
        <View className="flex-row items-center px-4 py-3 gap-3">
          <View className="size-9 rounded-full bg-[#319754] items-center justify-center">
            <Ionicons name="leaf" size={18} color="white" />
          </View>
          <View className="flex-1 flex-row items-center bg-[#f5f5f5] rounded-full px-4 h-10">
            <Ionicons name="search" size={16} color="#9ca3af" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ค้นหาสินค้า, สมุนไพร, ร้านค้า..."
              placeholderTextColor="#a3a3a3"
              className="flex-1 ml-2 text-[13px] text-gray-700"
            />
          </View>
          <Pressable hitSlop={6}>
            <Ionicons name="notifications-outline" size={22} color="#374151" />
          </Pressable>
          <Pressable hitSlop={6}>
            <Ionicons name="bag-outline" size={22} color="#374151" />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner section — main hero carousel + 2 side promo banners (web parity) */}
        {(() => {
          // Main banner width = SCREEN_WIDTH - 16*2 padding
          // Height derived from web's 775/160 aspect → side banners share this height.
          const BANNER_HEIGHT = ((SCREEN_WIDTH - 32) * 160) / 775;
          return (
            <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
              {/* Main hero carousel */}
              <View
                className="bg-[#faf8f5] overflow-hidden"
                style={{ height: BANNER_HEIGHT, borderRadius: 16 }}
              >
                <Image
                  source={MAIN_BANNERS[bannerIdx]}
                  className="w-full h-full"
                  resizeMode="cover"
                />
                <View
                  className="absolute left-0 right-0 flex-row items-center justify-center"
                  style={{ bottom: 8, gap: 6 }}
                >
                  {MAIN_BANNERS.map((_, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setBannerIdx(i)}
                      hitSlop={8}
                      style={{
                        height: 5,
                        width: i === bannerIdx ? 14 : 5,
                        borderRadius: 2.5,
                        backgroundColor:
                          i === bannerIdx ? "#ffffff" : "rgba(255,255,255,0.6)",
                      }}
                    />
                  ))}
                </View>
              </View>

              {/* 2 side promo banners — same height as main */}
              <View className="flex-row" style={{ gap: 10 }}>
                {SIDE_BANNERS.map((src, i) => (
                  <View
                    key={i}
                    className="flex-1 overflow-hidden bg-gray-100"
                    style={{ height: BANNER_HEIGHT, borderRadius: 16 }}
                  >
                    <Image
                      source={src}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Categories */}
        <View className="px-4 py-4">
          <View className="flex-row flex-wrap" style={{ rowGap: 16 }}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.label}
                className="w-1/4 items-center active:opacity-60"
                style={{ gap: 6 }}
              >
                <View
                  className="rounded-full items-center justify-center overflow-hidden"
                  style={{ width: 40, height: 40, backgroundColor: c.color + "1a" }}
                >
                  <Ionicons name={c.icon as any} size={20} color={c.color} />
                </View>
                <Text className="text-[11px] text-gray-600" numberOfLines={1}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recommended section (paged 2-per-page) */}
        <View className="mb-3 bg-white py-4">
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="แนะนำสำหรับคุณ" showSeeAll={false} />
          </View>
          <PagedProductList products={RECOMMENDED} />
        </View>

        {/* Flash Sale section (paged 2-per-page) */}
        <View className="mb-3 bg-white py-4">
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader
              title="Flash Sale"
              rightSlot={<FlashSaleCountdown />}
              showSeeAll={false}
            />
          </View>
          <PagedProductList products={FLASH_SALE} />
        </View>

        {/* Promo banners */}
        <View
          className="flex-row pb-6"
          style={{ paddingHorizontal: 16, gap: 10 }}
        >
          {[
            { color: "#319754", title: "คูปองส่วนลด", subtitle: "รับสูงสุด 100฿", icon: "pricetag" },
            { color: "#f59e0b", title: "ส่งฟรี", subtitle: "ทั่วประเทศ", icon: "rocket" },
          ].map((p) => (
            <Pressable
              key={p.title}
              className="flex-1 rounded-2xl p-4 flex-row items-center active:opacity-80"
              style={{ backgroundColor: p.color + "15", gap: 10 }}
            >
              <View
                className="rounded-full items-center justify-center"
                style={{ width: 40, height: 40, backgroundColor: p.color }}
              >
                <Ionicons name={p.icon as any} size={18} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-medium" style={{ color: p.color }}>
                  {p.title}
                </Text>
                <Text className="text-[11px] text-gray-600">{p.subtitle}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* More Recommended (full-bleed) */}
        <View className="mb-3 bg-white py-4">
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="สินค้ามาใหม่" />
          </View>
          <View
            className="flex-row flex-wrap"
            style={{ paddingHorizontal: 16, gap: 12 }}
          >
            {RECOMMENDED.slice(4).map((p) => (
              <ProductCard key={p.id} product={p} width={cardWidth} />
            ))}
          </View>
        </View>

        {/* Footer spacer */}
        <View className="h-6" />
      </ScrollView>

      {/* Bottom tab bar (visual mockup) */}
      <SafeAreaView edges={["bottom"]} className="bg-white border-t border-gray-200">
        <View className="flex-row items-center justify-around py-2">
          {[
            { icon: "home", label: "หน้าแรก", active: true },
            { icon: "leaf", label: "ผลิตภัณฑ์" },
            { icon: "book", label: "สาระความรู้" },
            { icon: "person", label: "บัญชี" },
          ].map((t) => (
            <Pressable
              key={t.label}
              className="items-center flex-1 py-1 active:opacity-60"
              style={{ gap: 2 }}
            >
              <Ionicons
                name={(t.active ? t.icon : `${t.icon}-outline`) as any}
                size={22}
                color={t.active ? "#319754" : "#9ca3af"}
              />
              <Text
                style={{
                  fontSize: 10,
                  color: t.active ? "#319754" : "#9ca3af",
                  includeFontPadding: false,
                  lineHeight: 12,
                }}
              >
                {t.label}
              </Text>
              {!t.active ? (
                <Text
                  style={{
                    fontSize: 8,
                    color: "#f59e0b",
                    fontWeight: "600",
                    includeFontPadding: false,
                    lineHeight: 10,
                  }}
                >
                  กำลังพัฒนา
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}
