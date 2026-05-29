import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Home as HomeIcon,
  Leaf,
  Search,
  ShoppingBag,
  Star,
  User,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Product, ProductImage } from "../types/Product";
import type { RootStackParamList } from "../navigation/RootStack";
import { ProductCard } from "../components/ProductCard";
import { FlashSaleHero } from "../components/FlashSaleHero";
import { IconButton } from "../components/IconButton";
import { CountBadge } from "../components/CountBadge";
import { STAR_YELLOW } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// On web cap viewport at mobile size so layout that uses SCREEN_WIDTH
// (cards, banner aspect, paged scroll) renders like the phone build.
const MOBILE_MAX_WIDTH = 430;
const SCREEN_WIDTH =
  Platform.OS === "web"
    ? Math.min(Dimensions.get("window").width, MOBILE_MAX_WIDTH)
    : Dimensions.get("window").width;

type Category =
  | { label: string; image: number; color: string }
  | { label: string; icon: string; color: string };

// Categories taken from the web menu — 6 entries that match the real catalog.
// `\n` placed manually so labels break at word boundaries, not mid-word.
const CATEGORIES: Category[] = [
  { label: "ผลิตภัณฑ์\nสุขภาพ", image: require("../../assets/IMG_4022.png"), color: "#319754" },
  { label: "อาหาร\n& เครื่องดื่ม", image: require("../../assets/IMG_4021.png"), color: "#16a34a" },
  { label: "เครื่องหอม\n& อโรม่า", image: require("../../assets/IMG_4020.png"), color: "#52b788" },
  { label: "ผลิตภัณฑ์\nสมุนไพร", image: require("../../assets/IMG_4023.png"), color: "#226a3b" },
  { label: "วัตถุดิบ\nสมุนไพร", image: require("../../assets/IMG_4024.png"), color: "#84cc16" },
  { label: "ชุดของชำร่วย\n& ของขวัญ", image: require("../../assets/IMG_4025.png"), color: "#06b6d4" },
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

const IMG_CINNAMON = require("../../assets/products/cinnamon.png");
const IMG_COFFEE = require("../../assets/products/coffee.png");
const IMG_GIFT_RIBBON = require("../../assets/products/gift-ribbon.png");
const IMG_GIFT_SET = require("../../assets/products/gift-set.png");
const IMG_HERB_JAR = require("../../assets/products/herb-jar.png");
const IMG_DOKJUN = require("../../assets/products/dokjun.png");
const IMG_LEMON = require("../../assets/products/lemon.png");

// Each entry pairs a name with the image that visually represents it,
// so shuffling stays coherent (no "coffee name + cinnamon image" mismatches).
const PRODUCT_POOL: { name: string; image: number }[] = [
  { name: "อบเชยเทศ Cinnamon Varum 150g", image: IMG_CINNAMON },
  { name: "มะตูมแห้งหั่นชง 200g", image: IMG_CINNAMON },
  { name: "ชาสมุนไพร 9 ชนิด รวมในซองเดียว", image: IMG_CINNAMON },

  { name: "กาแฟดริป Dark Roast Arabica 9 ซอง", image: IMG_COFFEE },
  { name: "กาแฟคั่วเข้ม Signature Blend 200g", image: IMG_COFFEE },

  { name: "ชุดของขวัญพรีเมียม ผูกโบว์", image: IMG_GIFT_RIBBON },
  { name: "ชุดของขวัญ Limited Edition", image: IMG_GIFT_RIBBON },

  { name: "ชุดของขวัญคุกกี้สมุนไพร", image: IMG_GIFT_SET },
  { name: "ชุดของขวัญ Cookies & Tea Set", image: IMG_GIFT_SET },

  { name: "เมต้าเฮิร์บ ยาดมสมุนไพร แดง+น้ำเงิน", image: IMG_HERB_JAR },
  { name: "เมต้าเฮิร์บ Herbal Inhaler Classic", image: IMG_HERB_JAR },
  { name: "ขมิ้นชันแคปซูล 60 เม็ด", image: IMG_HERB_JAR },
  { name: "น้ำผึ้งดิบจากป่าธรรมชาติ 350ml", image: IMG_HERB_JAR },

  { name: "ดอกจันอบแห้ง คัดพิเศษ 30g", image: IMG_DOKJUN },
  { name: "ใบบัวบกอบแห้ง 30g", image: IMG_DOKJUN },
  { name: "อัญชันแห้ง พรีเมียม 100g", image: IMG_DOKJUN },
  { name: "กระชายอบแห้ง 100g", image: IMG_DOKJUN },

  { name: "เปลือกมะนาวอบแห้ง 50g", image: IMG_LEMON },
  { name: "ตะไคร้แห้งหั่นฝอย 80g", image: IMG_LEMON },
];

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
  item: { name: string; image: number },
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
    name: item.name,
    price,
    originalPrice,
    discountPercent,
    rating,
    sold: `ขายได้ ${soldCount}+`,
    image: item.image,
    isFlashSale: opts.flashSale,
    isRecommended: opts.recommended,
    isFreeShipping: Math.random() > 0.5,
    hasCoupon: Math.random() > 0.5,
    flashSaleEndsIn: opts.flashSale
      ? Math.floor(Math.random() * 50000) + 3600
      : undefined,
    soldPercent: opts.flashSale ? Math.floor(Math.random() * 60) + 30 : undefined,
  };
}

// Shuffle the {name, image} pool once on module load → split into two sections
const SHUFFLED_POOL = shuffleArr(PRODUCT_POOL);
const FLASH_SALE: Product[] = SHUFFLED_POOL.slice(0, 6).map((p, i) =>
  makeProduct(i, p, { flashSale: true }),
);
const RECOMMENDED: Product[] = SHUFFLED_POOL.slice(6, 12).map((p, i) =>
  makeProduct(i, p, { recommended: true }),
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

// ProductCard moved to src/components/ProductCard.tsx (shared with ShopScreen).

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
          <ChevronRight size={16} color="#6b7280" />
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
  const nav = useNavigation<Nav>();
  const [bannerIdx, setBannerIdx] = useState(0);
  const [search, setSearch] = useState("");
  const scrollY = useRef(new Animated.Value(0)).current;
  // FlatList ref for the hero banner — used to programmatically scroll to the
  // next slide every 4s with a smooth animation. `any` ref because
  // Animated.FlatList's generic signature is `<unknown>` which clashes with
  // a typed inner array, but `scrollToOffset` is available at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bannerRef = useRef<any>(null);
  const bannerInnerWidth = SCREEN_WIDTH - 32; // outer paddingHorizontal:16
  // Drives the dot indicator interpolation so width + color blend smoothly
  // as the user swipes (or auto-advance scrolls) between banners.
  const bannerScrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => {
      const next = (bannerIdx + 1) % MAIN_BANNERS.length;
      bannerRef.current?.scrollToOffset({
        offset: next * bannerInnerWidth,
        animated: true,
      });
    }, 4000);
    return () => clearInterval(id);
  }, [bannerIdx, bannerInnerWidth]);

  const cardWidth = Math.floor((SCREEN_WIDTH - 16 * 2 - 12) / 2);

  // Collapsible header: logo + wordmark row shrinks to 0 as user scrolls past ~60px.
  const HEADER_TOP_ROW_HEIGHT = 60;
  const topRowHeight = scrollY.interpolate({
    inputRange: [0, HEADER_TOP_ROW_HEIGHT],
    outputRange: [HEADER_TOP_ROW_HEIGHT, 0],
    extrapolate: "clamp",
  });
  const topRowOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_TOP_ROW_HEIGHT * 0.6, HEADER_TOP_ROW_HEIGHT],
    outputRange: [1, 0.2, 0],
    extrapolate: "clamp",
  });
  // Crossfade icons between top row (scrollY=0) and search row (scrollY=60)
  // at the SAME screen pixel — translateY counter-acts the layout shift so
  // rendered y stays constant. Search bar's marginRight grows in step, so it's
  // full-width when icons are invisible and shrinks as icons appear.
  const searchIconsOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_TOP_ROW_HEIGHT * 0.4, HEADER_TOP_ROW_HEIGHT],
    outputRange: [0, 0.4, 1],
    extrapolate: "clamp",
  });
  const iconsTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_TOP_ROW_HEIGHT],
    outputRange: [-HEADER_TOP_ROW_HEIGHT, 0],
    extrapolate: "clamp",
  });
  // 106 = bell 38 + gap 12 + cart 38 + leading gap 12 + 6 margin for badge
  const searchBarMarginRight = scrollY.interpolate({
    inputRange: [0, HEADER_TOP_ROW_HEIGHT],
    outputRange: [0, 106],
    extrapolate: "clamp",
  });

  return (
    <View className="flex-1" style={{ backgroundColor: "#319754" }}>
      <StatusBar style="light" />
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#319754" }}>
        {/* Decorative herb leaves overlaid on the green header. Clipped to
            SafeAreaView bounds so leaves never bleed past the green band
            (which would otherwise be visible through the white surface's
            rounded corners). */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
          }}
        >
          {/* Header watermark — 5 leaves arranged for visual balance.
              Composition rules applied:
              • Diagonal flow (top-right ↘ bottom-left, top-left ↘ bottom-right)
              • Anchor leaves at opposite corners with similar weight
              • Center filler ties corners together (rule of thirds)
              • All leaves fully inside bounds — no clipping
              • Opacity gradient: anchors brighter (0.45), fillers subtler (0.28) */}

          {/* (1) Top-right anchor — frames the corner where bell+cart sit */}
          <Image
            source={require("../../assets/herb-leaf-d.png")}
            style={{
              position: "absolute",
              top: 4,
              right: 6,
              width: 100,
              height: 100,
              opacity: 0.45,
              transform: [{ rotate: "28deg" }],
            }}
            resizeMode="contain"
          />
          {/* (2) Top-left counter-weight — beside the logo */}
          <Image
            source={require("../../assets/herb-leaf-b.png")}
            style={{
              position: "absolute",
              top: 32,
              left: 24,
              width: 38,
              height: 38,
              opacity: 0.4,
              transform: [{ rotate: "-22deg" }],
            }}
            resizeMode="contain"
          />
          {/* (3) Center subtle filler — bridges top and bottom rows */}
          <Image
            source={require("../../assets/herb-leaf-c.png")}
            style={{
              position: "absolute",
              top: 60,
              left: "44%",
              width: 52,
              height: 52,
              opacity: 0.28,
              transform: [{ rotate: "60deg" }],
            }}
            resizeMode="contain"
          />
          {/* (5) Bottom-right balance — opposes bottom-left */}
          <Image
            source={require("../../assets/herb-leaf-c.png")}
            style={{
              position: "absolute",
              top: 92,
              right: 14,
              width: 78,
              height: 78,
              opacity: 0.4,
              transform: [{ rotate: "85deg" }],
            }}
            resizeMode="contain"
          />
        </View>

        {/* Collapsible top row — logo + wordmark fades + shrinks on scroll */}
        <Animated.View
          style={{
            height: topRowHeight,
            opacity: topRowOpacity,
            overflow: "hidden",
          }}
        >
          <View
            className="flex-row items-center"
            style={{
              height: HEADER_TOP_ROW_HEIGHT,
              paddingLeft: 16,
              paddingRight: 18,
              gap: 12,
            }}
          >
            <Image
              source={require("../../assets/logo.png")}
              style={{ width: 44, height: 44 }}
              resizeMode="contain"
            />
            <View className="flex-1">
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: "700",
                  includeFontPadding: false,
                  letterSpacing: 0.5,
                }}
              >
                METAHERB
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 11,
                  includeFontPadding: false,
                  lineHeight: 16,
                  marginTop: 2,
                }}
              >
                สมุนไพรไทยเพื่อสุขภาพดี
              </Text>
            </View>

            {/* Bell — same x as search-row bell (paddingRight 18 matches) */}
            <IconButton
              onPress={() => nav.navigate("Notification")}
              variant="translucentDark"
            >
              <Bell size={20} color="white" />
              <View style={{ position: "absolute", top: -2, right: -4 }}>
                <CountBadge count={3} />
              </View>
            </IconButton>

            {/* Cart — same x as search-row cart */}
            <IconButton
              onPress={() => nav.navigate("Cart")}
              variant="translucentDark"
            >
              <ShoppingBag size={20} color="white" />
              <View style={{ position: "absolute", top: -2, right: -4 }}>
                <CountBadge count={2} />
              </View>
            </IconButton>
          </View>
        </Animated.View>

        {/* Sticky search row. Search bar is full-width when icons are invisible
            (scrollY=0) thanks to animated marginRight. Icons are absolutely
            positioned at the same screen pixel as the top-row icons (right:18),
            and translate from -60 to 0 so they appear stationary during the
            crossfade. */}
        <View
          style={{
            paddingLeft: 12,
            paddingRight: 12,
            paddingBottom: 12,
            paddingTop: 4,
          }}
        >
          {/* Search bar — full-width pill with animated right margin */}
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
              <Search size={18} color="#319754" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="ค้นหาสินค้า, สมุนไพร, ร้านค้า..."
                placeholderTextColor="#a3a3a3"
                style={{
                  flex: 1,
                  marginLeft: 8,
                  fontSize: 13,
                  color: "#374151",
                }}
              />
            </View>
          </Animated.View>

          {/* Absolutely-positioned icons — overlap top-row icons exactly at
              scrollY=0 (right:18 + translateY:-60), reveal as scroll progresses */}
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
            <IconButton
              onPress={() => nav.navigate("Notification")}
              variant="translucentDark"
            >
              <Bell size={20} color="white" />
              <View style={{ position: "absolute", top: -2, right: -4 }}>
                <CountBadge count={3} />
              </View>
            </IconButton>
            <IconButton
              onPress={() => nav.navigate("Cart")}
              variant="translucentDark"
            >
              <ShoppingBag size={20} color="white" />
              <View style={{ position: "absolute", top: -2, right: -4 }}>
                <CountBadge count={2} />
              </View>
            </IconButton>
          </Animated.View>
        </View>
      </SafeAreaView>

      {/* White surface — rounded top corners reveal green underneath */}
      <View
        style={{
          flex: 1,
          backgroundColor: "#fafafa",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        }}
      >
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
        >
        {/* Banner section — hero locked to a single aspect so all 3 slides
            are the same height (no layout shift on swipe). Chosen to match
            the majority of banner images (banner_14, banner_15 = 3.825:1). */}
        {(() => {
          const innerWidth = SCREEN_WIDTH - 32; // outer paddingHorizontal:16 both sides
          const SIDE_WIDTH = (innerWidth - 10) / 2; // gap 10
          const HERO_ASPECT = 3.825; // 1530÷400 — fits banner_14/15 perfectly,
          // banner_6 (4.8:1) gets ~12% side crop in cover mode.
          const HERO_HEIGHT = innerWidth / HERO_ASPECT;
          // Side banners are uniform (3.39:1) so we can sample once.
          const SIDE_ASPECT =
            Image.resolveAssetSource(SIDE_BANNERS[0]).width /
            Image.resolveAssetSource(SIDE_BANNERS[0]).height;
          const SIDE_HEIGHT = SIDE_WIDTH / SIDE_ASPECT;
          return (
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 }}>
              {/* Hero carousel — FlatList paging gives a smooth slide
                  animation between banners (and lets the user swipe too). */}
              <View
                className="bg-[#faf8f5] overflow-hidden"
                style={{ height: HERO_HEIGHT, borderRadius: 16 }}
              >
                <Animated.FlatList
                  ref={bannerRef}
                  data={MAIN_BANNERS}
                  keyExtractor={(_: unknown, i: number) => `banner-${i}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: bannerScrollX } } }],
                    { useNativeDriver: false },
                  )}
                  scrollEventThrottle={16}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(
                      e.nativeEvent.contentOffset.x / bannerInnerWidth,
                    );
                    if (idx !== bannerIdx) setBannerIdx(idx);
                  }}
                  renderItem={({ item }) => (
                    <Image
                      source={item as number}
                      style={{
                        width: bannerInnerWidth,
                        height: HERO_HEIGHT,
                      }}
                      resizeMode="cover"
                    />
                  )}
                />
                <View
                  className="absolute left-0 right-0 flex-row items-center justify-center"
                  style={{ bottom: 10, gap: 6 }}
                  pointerEvents="box-none"
                >
                  {MAIN_BANNERS.map((_, i) => {
                    const inputRange = [
                      (i - 1) * bannerInnerWidth,
                      i * bannerInnerWidth,
                      (i + 1) * bannerInnerWidth,
                    ];
                    const width = bannerScrollX.interpolate({
                      inputRange,
                      outputRange: [6, 18, 6],
                      extrapolate: "clamp",
                    });
                    const backgroundColor = bannerScrollX.interpolate({
                      inputRange,
                      outputRange: [
                        "rgba(255,255,255,0.6)",
                        "#ffffff",
                        "rgba(255,255,255,0.6)",
                      ],
                      extrapolate: "clamp",
                    });
                    return (
                      <Pressable
                        key={i}
                        onPress={() => {
                          bannerRef.current?.scrollToOffset({
                            offset: i * bannerInnerWidth,
                            animated: true,
                          });
                        }}
                        hitSlop={14}
                      >
                        <Animated.View
                          style={{
                            height: 6,
                            width,
                            borderRadius: 3,
                            backgroundColor,
                          }}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 2 side promo banners — flatter, smaller below the hero */}
              <View className="flex-row" style={{ gap: 10 }}>
                {SIDE_BANNERS.map((src, i) => (
                  <View
                    key={i}
                    className="flex-1 overflow-hidden bg-gray-100"
                    style={{ height: SIDE_HEIGHT, borderRadius: 12 }}
                  >
                    <Image
                      source={src}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Categories — horizontal scroll, no title; items peek off-screen on the right
            to signal scrollability without an explicit hint. */}
        <View style={{ paddingTop: 16, paddingBottom: 16 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              // Pressable is 70px wide and items-center; the 56px circle sits
              // with 7px slack on each side. Subtract that 7 so the first
              // circle's left edge lands at x=16, aligning with section
              // headers above/below. Gap between items stays 14.
              paddingLeft: 9,
              paddingRight: 9,
              gap: 14,
            }}
            decelerationRate="fast"
          >
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.label}
                className="items-center active:opacity-60"
                // Width 70 + gap 14 → on a 390px screen 4 items fit fully and the
                // 5th peeks ~50% off the right edge, giving a clear scroll cue.
                style={{ width: 70, gap: 8 }}
              >
                <View
                  className="rounded-full items-center justify-center overflow-hidden"
                  style={{
                    width: 56,
                    height: 56,
                    backgroundColor: c.color + "1a",
                    borderWidth: 0.5,
                    borderColor: c.color + "33",
                  }}
                >
                  {"image" in c ? (
                    <Image
                      source={c.image}
                      style={{ width: 36, height: 36 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Leaf size={26} color={c.color} />
                  )}
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 11,
                    color: "#525252",
                    includeFontPadding: false,
                    lineHeight: 16,
                    textAlign: "center",
                  }}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Recommended section (paged 2-per-page) */}
        <View className="mb-4 bg-white py-4">
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="แนะนำสำหรับคุณ" />
          </View>
          <PagedProductList products={RECOMMENDED} />
        </View>

        {/* Flash Sale section — hero banner replaces plain SectionHeader to
            drive urgency (Scarcity + Loss Aversion + Zeigarnik). */}
        <View className="mb-4 bg-white py-4">
          <FlashSaleHero />
          <View style={{ height: 12 }} />
          <PagedProductList products={FLASH_SALE} />
        </View>

        {/* More Recommended (full-bleed) */}
        <View className="mb-4 bg-white py-4">
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
      </Animated.ScrollView>
      </View>

      {/* Bottom tab bar (visual mockup) */}
      <SafeAreaView edges={["bottom"]} className="bg-white border-t border-gray-200">
        <View className="flex-row items-center justify-around py-2">
          {[
            { Icon: HomeIcon, label: "หน้าแรก", active: true },
            { Icon: Leaf, label: "ผลิตภัณฑ์" },
            { Icon: BookOpen, label: "สาระความรู้" },
            { Icon: User, label: "บัญชี" },
          ].map((t) => (
            <Pressable
              key={t.label}
              className="items-center flex-1 py-1 active:opacity-60"
              style={{ gap: 2 }}
            >
              <t.Icon
                size={22}
                color={t.active ? "#319754" : "#9ca3af"}
                strokeWidth={t.active ? 2.4 : 2}
              />
              <Text
                style={{
                  fontSize: 10,
                  color: t.active ? "#319754" : "#9ca3af",
                  includeFontPadding: false,
                  lineHeight: 15,
                }}
              >
                {t.label}
              </Text>
              {!t.active ? (
                <Text
                  style={{
                    fontSize: 8,
                    color: STAR_YELLOW,
                    fontWeight: "600",
                    includeFontPadding: false,
                    lineHeight: 13,
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
