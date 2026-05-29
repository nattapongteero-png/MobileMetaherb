import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Star,
  Store,
  Zap,
} from "lucide-react-native";
import type { RootStackParamList } from "../navigation/RootStack";
import { IconButton } from "../components/IconButton";
import { CountBadge } from "../components/CountBadge";
import { STAR_YELLOW, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";

const SCREEN_WIDTH =
  Platform.OS === "web"
    ? Math.min(Dimensions.get("window").width, 430)
    : Dimensions.get("window").width;

type Props = NativeStackScreenProps<RootStackParamList, "ProductDetail">;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const OPTIONS = ["50g", "100g", "250g", "500g"];

// Mock reviews — same shape as the web data but kept tiny for the mockup.
const REVIEWS = [
  { user: "user02", rating: 5, date: "15 ก.พ. 2569", comment: "ชื่นชอบมาก สินค้าดี ส่งเร็ว แพ็คเกจสวยงาม" },
  { user: "user03", rating: 5, date: "14 ก.พ. 2569", comment: "รสชาติดี กลิ่นหอมมาก ชอบ ๆ" },
  { user: "user04", rating: 4, date: "13 ก.พ. 2569", comment: "คุ้มค่ามาก สินค้าดีตามที่บอก แต่กล่องโดนกระแทกเล็กน้อย" },
];

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
    <View className="flex-row items-center" style={{ gap: 4 }}>
      {[h, m, s].map((t, i) => (
        <View key={i} className="flex-row items-center" style={{ gap: 4 }}>
          <View
            className="bg-white items-center justify-center"
            style={{ width: 28, paddingVertical: 3, borderRadius: 6 }}
          >
            <Text className="text-[13px] text-[#bc1b06] font-semibold" style={{ lineHeight: 16 }}>
              {t}
            </Text>
          </View>
          {i < 2 && <Text className="text-[14px] text-white font-semibold">:</Text>}
        </View>
      ))}
    </View>
  );
}

export function ProductDetailScreen({ route }: Props) {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { product } = route.params;

  const [galleryIdx, setGalleryIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [showWishToast, setShowWishToast] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [flying, setFlying] = useState(false);

  // Wishlist feedback — matches the shop-follow pattern (pulse + toast +
  // explicit confirmation) so the interaction model is consistent app-wide.
  const heartScale = useRef(new Animated.Value(1)).current;
  const wishToastOpacity = useRef(new Animated.Value(0)).current;

  const onToggleWishlist = () => {
    const next = !wishlisted;
    setWishlisted(next);

    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.35,
        damping: 8,
        stiffness: 220,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        damping: 12,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (next) {
      setShowWishToast(true);
      wishToastOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(wishToastOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1600),
        Animated.timing(wishToastOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setShowWishToast(false);
      });
    }
  };
  const galleryScrollX = useRef(new Animated.Value(0)).current;
  const flyAnim = useRef(new Animated.Value(0)).current;
  // Tracks vertical scroll so the sticky header fades from transparent over
  // the hero image to a solid green bar once the user scrolls past it.
  const detailScrollY = useRef(new Animated.Value(0)).current;
  const HEADER_FADE_START = SCREEN_WIDTH * 0.55;
  const HEADER_FADE_END = SCREEN_WIDTH * 0.92;
  const headerBg = detailScrollY.interpolate({
    inputRange: [HEADER_FADE_START, HEADER_FADE_END],
    outputRange: ["rgba(49,151,84,0)", "rgba(49,151,84,1)"],
    extrapolate: "clamp",
  });
  const headerTitleOpacity = detailScrollY.interpolate({
    inputRange: [HEADER_FADE_END - 30, HEADER_FADE_END],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const headerBorderOpacity = detailScrollY.interpolate({
    inputRange: [HEADER_FADE_END - 10, HEADER_FADE_END + 10],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  // Image counter pill — hidden by default; fades in on scroll, fades out 2s
  // after the user stops swiping. Times chosen per Laws of UX:
  //   • Show 180ms (Doherty: feels instant)
  //   • Stay 2000ms (Working Memory: enough to read "1/4" + glance again)
  //   • Hide 350ms (graceful fade, avoids jarring snap)
  const counterOpacity = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingCounter = () => {
    Animated.timing(counterOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      Animated.timing(counterOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }, 2000);
  };
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const stock = 10;
  const priceColor = product.discountPercent ? "#bc1b06" : "#226a3b";

  // 4-image gallery — reuse the product image (mockup) so user can swipe & see
  // the typical multi-angle pattern from real shops.
  const galleryImages = [product.image, product.image, product.image, product.image];

  const handleAddToCart = () => {
    // Peak-End: fly the product image to the cart icon (delightful moment),
    // then briefly flip the button to ✓ "เพิ่มแล้ว".
    setFlying(true);
    flyAnim.setValue(0);
    Animated.timing(flyAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start(() => {
      setFlying(false);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 1400);
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: detailScrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        {/* Hero gallery — full-width swipeable carousel */}
        <View style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: "#f5f5f5" }}>
          <Animated.FlatList
            data={galleryImages}
            keyExtractor={(_: unknown, i: number) => `g-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: galleryScrollX } } }],
              { useNativeDriver: false, listener: pingCounter },
            )}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              setGalleryIdx(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
            }}
            renderItem={({ item }) => (
              <Image
                source={item as number}
                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                resizeMode="cover"
              />
            )}
          />

          {/* Image counter pill — fades in on scroll, hides 2s after rest */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              opacity: counterOpacity,
              backgroundColor: "rgba(0,0,0,0.45)",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 9999,
            }}
          >
            <Text className="text-white" style={{ fontSize: 12, fontWeight: "600", lineHeight: 16 }}>
              {galleryIdx + 1} / {galleryImages.length}
            </Text>
          </Animated.View>

          {/* Dots indicator at bottom of gallery */}
          <View
            className="absolute left-0 right-0 flex-row items-center justify-center"
            style={{ bottom: 12, gap: 6 }}
            pointerEvents="none"
          >
            {galleryImages.map((_, i) => {
              const inputRange = [
                (i - 1) * SCREEN_WIDTH,
                i * SCREEN_WIDTH,
                (i + 1) * SCREEN_WIDTH,
              ];
              const width = galleryScrollX.interpolate({
                inputRange,
                outputRange: [6, 18, 6],
                extrapolate: "clamp",
              });
              const backgroundColor = galleryScrollX.interpolate({
                inputRange,
                outputRange: ["rgba(255,255,255,0.6)", "#ffffff", "rgba(255,255,255,0.6)"],
                extrapolate: "clamp",
              });
              return (
                <Animated.View
                  key={i}
                  style={{ height: 6, width, borderRadius: 3, backgroundColor }}
                />
              );
            })}
          </View>
        </View>

        {/* Flash sale strip — full-bleed (no padding L/R/top, no radius) */}
        {product.isFlashSale ? (
          <View>
            <View
              className="flex-row items-center justify-between"
              style={{
                backgroundColor: "#e62e05",
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
            >
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Zap size={18} color="white" fill="white" />
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "700",
                    lineHeight: 20,
                  }}
                >
                  Flash Sale
                </Text>
              </View>
              <MiniCountdown initialSeconds={product.flashSaleEndsIn || 43988} />
            </View>
            <View
              className="flex-row items-center"
              style={{
                backgroundColor: "#fff4ed",
                paddingHorizontal: 16,
                paddingVertical: 10,
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#bc1b06", lineHeight: 28 }}>
                ฿{product.price.toFixed(0)}
              </Text>
              {product.originalPrice ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: TEXT_MUTED,
                    textDecorationLine: "line-through",
                  }}
                >
                  ฿{product.originalPrice.toFixed(0)}
                </Text>
              ) : null}
              {product.discountPercent ? (
                <View
                  style={{
                    backgroundColor: "#e62e05",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 9999,
                  }}
                >
                  <Text style={{ color: "white", fontSize: 11, fontWeight: "600", lineHeight: 14 }}>
                    -{product.discountPercent}%
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Name + rating + (price if non-flash) section */}
        <View
          className="bg-white"
          style={{
            paddingHorizontal: 16,
            paddingTop: product.isFlashSale ? 12 : 16,
            paddingBottom: 12,
          }}
        >
          {!product.isFlashSale ? (
            <View className="flex-row items-center" style={{ gap: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 26, fontWeight: "700", color: priceColor, lineHeight: 30 }}>
                ฿{product.price.toFixed(0)}
              </Text>
              {product.originalPrice ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: TEXT_MUTED,
                    textDecorationLine: "line-through",
                  }}
                >
                  ฿{product.originalPrice.toFixed(0)}
                </Text>
              ) : null}
              {product.discountPercent ? (
                <View
                  style={{
                    backgroundColor: "#e62e05",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 9999,
                  }}
                >
                  <Text style={{ color: "white", fontSize: 11, fontWeight: "600", lineHeight: 14 }}>
                    -{product.discountPercent}%
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Name */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: "500",
              color: "#0a0a0a",
              lineHeight: 24,
              marginBottom: 8,
            }}
          >
            {product.name}
          </Text>

          {/* Rating + sold row */}
          <View className="flex-row items-center" style={{ gap: 16 }}>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <Star size={14} color={STAR_YELLOW} fill={STAR_YELLOW} />
              <Text style={{ fontSize: 12, color: "#0a0a0a", lineHeight: 16 }}>
                {product.rating}
              </Text>
              <Text style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>
                ({REVIEWS.length} รีวิว)
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>
              {product.sold}
            </Text>
            {product.hasCoupon ? (
              <View
                style={{
                  backgroundColor: "#fff7e6",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor: "#DF9723",
                }}
              >
                <Text style={{ fontSize: 10, color: "#DF9723", fontWeight: "600", lineHeight: 14 }}>
                  คูปอง
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Options + Quantity (Chunking: grouped in one card) */}
        <View
          className="bg-white"
          style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}
        >
          <Text style={{ fontSize: 14, color: "#525252", marginBottom: 10, lineHeight: 18 }}>
            ตัวเลือก
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8, marginBottom: 16 }}>
            {OPTIONS.map((opt, i) => {
              const active = selectedOption === i;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setSelectedOption(i)}
                  className="active:opacity-70"
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor: active ? "#319754" : "#e5e5e5",
                    backgroundColor: active ? "rgba(49,151,84,0.08)" : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: active ? "#319754" : "#0a0a0a",
                      fontWeight: active ? "600" : "400",
                      lineHeight: 18,
                    }}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ fontSize: 14, color: "#525252", marginBottom: 10, lineHeight: 18 }}>
            จำนวน
          </Text>
          <View className="flex-row items-center" style={{ gap: 14 }}>
            {/* Same stepper UI as CartScreen — consistent quantity control
                across surfaces so users only learn it once (Jakob's Law). */}
            <View
              className="flex-row items-center"
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Pressable
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                hitSlop={8}
                disabled={quantity <= 1}
                style={{
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: quantity <= 1 ? 0.4 : 1,
                }}
              >
                <Minus size={16} color="#0a0a0a" />
              </Pressable>
              <View
                style={{
                  width: 44,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: "#e5e7eb",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#0a0a0a",
                    lineHeight: 18,
                  }}
                >
                  {quantity}
                </Text>
              </View>
              <Pressable
                onPress={() => setQuantity(Math.min(stock, quantity + 1))}
                hitSlop={8}
                disabled={quantity >= stock}
                style={{
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: quantity >= stock ? 0.4 : 1,
                }}
              >
                <Plus size={16} color="#0a0a0a" />
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>
              เหลือ {stock} ชิ้น
            </Text>
          </View>
        </View>

        {/* Product description */}
        <View
          className="bg-white"
          style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#0a0a0a", marginBottom: 10, lineHeight: 24 }}>
            รายละเอียดสินค้า
          </Text>
          <Text style={{ fontSize: 13, color: "#525252", lineHeight: 22, marginBottom: 12 }}>
            สมุนไพรไทยคุณภาพพรีเมียม คัดสรรจากแหล่งผลิตธรรมชาติ ผ่านกระบวนการผลิตที่ได้มาตรฐาน
            สะอาด ปลอดภัย เพื่อสุขภาพที่ดีของคุณและคนที่คุณรัก
          </Text>
          {[
            ["น้ำหนัก", "150 กรัม"],
            ["ประเภท", "สมุนไพรอบแห้ง"],
            ["รหัสสินค้า", `MH-${product.id.toUpperCase()}-2569`],
            ["รูปแบบ", "แบ่งบรรจุ"],
          ].map(([k, v]) => (
            <View
              key={k}
              className="flex-row"
              style={{
                paddingVertical: 8,
                borderTopWidth: 1,
                borderTopColor: "#f0f0f0",
              }}
            >
              <Text style={{ fontSize: 13, color: "#737373", width: 100, lineHeight: 18 }}>{k}</Text>
              <Text style={{ fontSize: 13, color: "#0a0a0a", lineHeight: 18, flex: 1 }}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Shop info */}
        <View
          className="bg-white"
          style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}
        >
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#319754",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Store size={22} color="white" />
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a", lineHeight: 18 }}>
                METAHERB Store
              </Text>
              <Text style={{ fontSize: 11, color: "#737373", lineHeight: 14, marginTop: 2 }}>
                สมุนไพรไทย · ตอบกลับใน 1 ชม.
              </Text>
            </View>
          </View>
          <View className="flex-row" style={{ gap: 8, marginTop: 12 }}>
            <Pressable
              onPress={() => nav.navigate("Shop")}
              className="flex-1 flex-row items-center justify-center active:opacity-70"
              style={{
                borderWidth: 1,
                borderColor: "#319754",
                borderRadius: 9999,
                paddingVertical: 8,
                gap: 6,
              }}
            >
              <Store size={16} color="#319754" />
              <Text style={{ fontSize: 13, color: BRAND_GREEN_DARK, fontWeight: "500", lineHeight: 18 }}>
                เข้าชมร้าน
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 flex-row items-center justify-center active:opacity-70"
              style={{
                borderWidth: 1,
                borderColor: "#319754",
                borderRadius: 9999,
                paddingVertical: 8,
                gap: 6,
              }}
            >
              <MessageCircle size={16} color="#319754" />
              <Text style={{ fontSize: 13, color: BRAND_GREEN_DARK, fontWeight: "500", lineHeight: 18 }}>
                แชทเลย
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Reviews */}
        <View
          className="bg-white"
          style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}
        >
          <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#0a0a0a", lineHeight: 24 }}>
              รีวิวจากผู้ซื้อ
            </Text>
            <Pressable hitSlop={6} className="flex-row items-center active:opacity-60" style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>ดูทั้งหมด</Text>
              <ChevronRight size={14} color="#737373" />
            </Pressable>
          </View>

          <View className="flex-row items-center" style={{ gap: 8, marginBottom: 16 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#0a0a0a", lineHeight: 32 }}>
              {product.rating.toFixed(1)}
            </Text>
            <View>
              <View className="flex-row" style={{ gap: 2 }}>
                {[1, 2, 3, 4, 5].map((s) => {
                  const filled = s <= Math.round(product.rating);
                  return (
                    <Star
                      key={s}
                      size={14}
                      color={STAR_YELLOW}
                      fill={filled ? STAR_YELLOW : "transparent"}
                    />
                  );
                })}
              </View>
              <Text style={{ fontSize: 11, color: "#737373", marginTop: 2, lineHeight: 14 }}>
                จาก {REVIEWS.length} รีวิว
              </Text>
            </View>
          </View>

          {REVIEWS.map((r, i) => (
            <View
              key={r.user}
              style={{
                paddingVertical: 12,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: "#f0f0f0",
              }}
            >
              <View className="flex-row items-center" style={{ gap: 8, marginBottom: 4 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "#e5e7eb",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#525252", lineHeight: 14 }}>
                    {r.user.slice(-2).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text style={{ fontSize: 13, fontWeight: "500", color: "#0a0a0a", lineHeight: 18 }}>
                    {r.user}
                  </Text>
                  <View className="flex-row items-center" style={{ gap: 6, marginTop: 1 }}>
                    <View className="flex-row" style={{ gap: 1 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={10}
                          color={STAR_YELLOW}
                          fill={s <= r.rating ? STAR_YELLOW : "transparent"}
                        />
                      ))}
                    </View>
                    <Text style={{ fontSize: 10, color: TEXT_MUTED, lineHeight: 14 }}>{r.date}</Text>
                  </View>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: "#525252", lineHeight: 20, marginLeft: 36 }}>
                {r.comment}
              </Text>
            </View>
          ))}
        </View>
      </Animated.ScrollView>

      {/* Sticky header — transparent over the hero image, fades to solid
          green as the user scrolls past the gallery. Stays mounted outside
          ScrollView so it doesn't scroll away. */}
      <Animated.View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: headerBg,
        }}
      >
        <SafeAreaView edges={["top"]} pointerEvents="box-none">
          <View
            className="flex-row items-center"
            style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, gap: 8 }}
            pointerEvents="box-none"
          >
            <IconButton
              onPress={() => nav.canGoBack() && nav.goBack()}
              variant="translucentDark"
            >
              <ChevronLeft size={22} color="white" />
            </IconButton>

            {/* Product name — fades in once header turns solid */}
            <Animated.Text
              numberOfLines={1}
              style={{
                flex: 1,
                opacity: headerTitleOpacity,
                color: "white",
                fontSize: 15,
                fontWeight: "600",
                lineHeight: 20,
              }}
            >
              {product.name}
            </Animated.Text>

            <View className="flex-row" style={{ gap: 8 }}>
              <IconButton
                onPress={onToggleWishlist}
                variant="translucentDark"
                accessibilityLabel={wishlisted ? "นำออกจากรายการโปรด" : "เพิ่มเข้ารายการโปรด"}
                accessibilityState={{ selected: wishlisted }}
              >
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Heart
                    size={20}
                    color={wishlisted ? "#ff383c" : "white"}
                    fill={wishlisted ? "#ff383c" : "transparent"}
                  />
                </Animated.View>
              </IconButton>

              {/* Cart icon — destination of the fly-to-cart animation */}
              <IconButton
                onPress={() => nav.navigate("Cart")}
                variant="translucentDark"
              >
                <ShoppingBag size={20} color="white" />
                <View style={{ position: "absolute", top: -2, right: -4 }}>
                  <CountBadge count={2} />
                </View>
              </IconButton>

              <IconButton variant="translucentDark">
                <Share2 size={20} color="white" />
              </IconButton>
            </View>
          </View>
        </SafeAreaView>
        {/* Bottom border that fades in with the solid bg */}
        <Animated.View
          style={{
            height: 1,
            backgroundColor: "rgba(0,0,0,0.08)",
            opacity: headerBorderOpacity,
          }}
        />
      </Animated.View>

      {/* Sticky bottom action bar — always reachable (Fitts's Law) */}
      <SafeAreaView edges={["bottom"]} className="bg-white border-t border-gray-200">
        <View
          className="flex-row items-center"
          style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
        >
          {/* Small icon actions on the left */}
          <Pressable
            hitSlop={6}
            className="active:opacity-70 items-center"
            style={{ width: 48, gap: 2 }}
          >
            <Store size={22} color="#319754" />
            <Text style={{ fontSize: 10, color: BRAND_GREEN_DARK, lineHeight: 13 }}>ร้านค้า</Text>
          </Pressable>
          <Pressable
            hitSlop={6}
            className="active:opacity-70 items-center"
            style={{ width: 48, gap: 2 }}
          >
            <MessageCircle size={22} color="#319754" />
            <Text style={{ fontSize: 10, color: BRAND_GREEN_DARK, lineHeight: 13 }}>แชท</Text>
          </Pressable>

          {/* Add to Cart — outline secondary */}
          <Pressable
            onPress={handleAddToCart}
            disabled={addedToCart}
            className="flex-1 flex-row items-center justify-center active:opacity-80"
            style={{
              height: 44,
              borderRadius: 9999,
              backgroundColor: addedToCart ? "#319754" : "rgba(219,139,10,0.08)",
              borderWidth: 1,
              borderColor: addedToCart ? "#319754" : "#db8b0a",
              gap: 6,
            }}
          >
            {addedToCart ? (
              <>
                <CheckCircle2 size={18} color="white" />
                <Text style={{ color: "white", fontSize: 13, fontWeight: "600", lineHeight: 18 }}>
                  เพิ่มแล้ว
                </Text>
              </>
            ) : (
              <>
                <ShoppingBag size={18} color="#db8b0a" />
                <Text style={{ color: "#db8b0a", fontSize: 13, fontWeight: "600", lineHeight: 18 }}>
                  เพิ่มลงตะกร้า
                </Text>
              </>
            )}
          </Pressable>

          {/* Buy Now — primary CTA (Von Restorff: stands out as the one) */}
          <Pressable
            className="flex-1 flex-row items-center justify-center active:opacity-80"
            style={{
              height: 44,
              borderRadius: 9999,
              backgroundColor: "#319754",
              gap: 6,
            }}
          >
            <Zap size={16} color="white" fill="white" />
            <Text style={{ color: "white", fontSize: 13, fontWeight: "600", lineHeight: 18 }}>
              ซื้อเลย
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Fly-to-cart overlay — animates a copy of the product image from
          the gallery center toward the cart icon in the top bar. Outside
          ScrollView so it renders on top of every layer. */}
      {flying ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: SCREEN_WIDTH / 2 - 40,
            left: SCREEN_WIDTH / 2 - 40,
            width: 80,
            height: 80,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: "white",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 12,
            transform: [
              {
                translateX: flyAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, SCREEN_WIDTH / 2 - 77],
                }),
              },
              {
                // Arc trajectory — overshoot upward then settle at cart y.
                translateY: flyAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, -SCREEN_WIDTH / 2 + 20, 60 - SCREEN_WIDTH / 2],
                }),
              },
              {
                scale: flyAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.22],
                }),
              },
              {
                rotate: flyAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "25deg"],
                }),
              },
            ],
            opacity: flyAnim.interpolate({
              inputRange: [0, 0.85, 1],
              outputRange: [1, 1, 0],
            }),
          }}
        >
          <Image
            source={product.image}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </Animated.View>
      ) : null}

      {/* Wishlist toast — Peak-End Rule confirmation, mirrors the shop-follow
          toast so the user learns one "I did something" pattern app-wide. */}
      {showWishToast ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: insets.top + 58 + 8,
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 50,
            opacity: wishToastOpacity,
          }}
        >
          <View
            className="flex-row items-center"
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: "rgba(10,10,10,0.85)",
              gap: 8,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 5,
            }}
          >
            <Heart size={14} color="#ff383c" fill="#ff383c" />
            <Text style={{ color: "white", fontSize: 13, fontWeight: "500" }}>
              เพิ่มเข้ารายการโปรดแล้ว
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
