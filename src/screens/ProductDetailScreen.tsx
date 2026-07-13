import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Animated,
  Easing,
  Dimensions,
  Modal,
  Platform,
  Alert,
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
  Package,
  Plus,
  Share2,
  ShoppingCart,
  Star,
  Store,
  X,
  Zap,
} from "lucide-react-native";
import type { RootStackParamList } from "../navigation/RootStack";
import { GlassIconButton } from "../components/GlassIconButton";
import { CountBadge } from "../components/CountBadge";
import { BottomFade } from "../components/BottomFade";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { ProductCard } from "../components/ProductCard";
import { REAL_PRODUCTS, RAW_PRODUCT_BY_ID } from "../data/realProducts";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { shopForKey, getShop } from "../data/shops";
import { useShopName } from "../context/SellerContext";
import { GROUP_BY_ID, GALLERY_OVERRIDE } from "../data/productVariants";
import { ShopAvatar } from "../components/ShopAvatar";
import type { Product } from "../types/Product";
import { STAR_YELLOW, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import { appWidth, isTablet, gridColumns, gridCardWidth } from "../theme/layout";

const SCREEN_WIDTH =
  appWidth();
const SCREEN_HEIGHT = Dimensions.get("window").height;

type Props = NativeStackScreenProps<RootStackParamList, "ProductDetail">;
type Nav = NativeStackNavigationProp<RootStackParamList>;

// Recommended products — paged rail with animated dots, same UX as the home
// product rails (Jakob's Law). Phones page 2 cards; tablets 4 (gridColumns).
const REC_PER_PAGE = gridColumns(190, 32, 12);
function RecommendedPager({ products }: { products: Product[] }) {
  const nav = useNavigation<Nav>();
  const scrollX = useRef(new Animated.Value(0)).current;
  const cardWidth = gridCardWidth(REC_PER_PAGE, 32, 12);
  const pages: Product[][] = [];
  for (let i = 0; i < products.length; i += REC_PER_PAGE) pages.push(products.slice(i, i + REC_PER_PAGE));

  return (
    <View>
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        {pages.map((page, pi) => (
          <View
            key={`rec-${pi}`}
            style={{ width: SCREEN_WIDTH, paddingHorizontal: 16, flexDirection: "row", gap: 12 }}
          >
            {page.map((p) => (
              <View key={p.id}>
                <ProductCard product={p} width={cardWidth} onPress={() => nav.push("ProductDetail", { product: p })} />
              </View>
            ))}
            {/* Pad the last page so remaining cards keep their column width */}
            {page.length < REC_PER_PAGE
              ? Array.from({ length: REC_PER_PAGE - page.length }).map((_, i) => (
                  <View key={`pad-${i}`} style={{ width: cardWidth }} />
                ))
              : null}
          </View>
        ))}
      </Animated.ScrollView>
      {pages.length > 1 ? (
        <View className="flex-row items-center justify-center mt-3" style={{ gap: 6 }}>
          {pages.map((_, i) => {
            const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
            const width = scrollX.interpolate({ inputRange, outputRange: [6, 18, 6], extrapolate: "clamp" });
            const backgroundColor = scrollX.interpolate({
              inputRange,
              outputRange: ["#d4d4d4", "#319754", "#d4d4d4"],
              extrapolate: "clamp",
            });
            return <Animated.View key={i} style={{ height: 6, width, borderRadius: 3, backgroundColor }} />;
          })}
        </View>
      ) : null}
    </View>
  );
}

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

// Product option pill with a springy press animation (scale down on press,
// bounce back on release).
function OptionPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, friction: 5, tension: 220 }).start();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => spring(0.9)}
      onPressOut={() => spring(1)}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          paddingHorizontal: 16,
          paddingVertical: 6,
          borderRadius: 9999,
          borderWidth: 1,
          borderColor: active ? "#319754" : "#e5e5e5",
          backgroundColor: active ? "rgba(49,151,84,0.08)" : "transparent",
        }}
      >
        <Text style={{ fontSize: 13, color: active ? "#319754" : "#0a0a0a", fontWeight: active ? "600" : "400", lineHeight: 18 }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// Quantity −/+ button with a springy press animation.
function StepButton({ onPress, disabled, children }: { onPress: () => void; disabled?: boolean; children: ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, friction: 5, tension: 220 }).start();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      disabled={disabled}
      onPressIn={() => { if (!disabled) spring(0.8); }}
      onPressOut={() => spring(1)}
    >
      <Animated.View
        style={{
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale }],
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function ProductDetailScreen({ route }: Props) {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { product, preview } = route.params;
  const { addToCart, count: cartCount } = useCart();
  // A storefront product carries its own shop; catalog products fall back to the
  // deterministic hash. Either way the seller shown matches where it's listed.
  const ownShop = (product as { shop?: string }).shop;
  const shop = ownShop ? getShop(ownShop) : shopForKey(product.id);
  const shopName = useShopName(shop.name); // own shop reflects the owner's edited name
  // Some products (coffee, honey, aromatic, …) merge several SKUs into one page.
  const group = GROUP_BY_ID[product.id];
  const variants = group
    ? group.items.map((it) => ({
        ...(RAW_PRODUCT_BY_ID[it.id] ?? product),
        ...(it.custom ?? {}),
        id: it.id,
        label: it.label,
      }))
    : undefined;
  // Only variant-group products show options; everything else is single-price
  // with no option picker (no default sizes).
  const noOptions = !variants;

  const [galleryIdx, setGalleryIdx] = useState(0);
  // Full-screen image viewer (tap a hero image to open; swipe between images).
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState(0);
  // No option pre-selected — the user must pick one (standard e-commerce UX).
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [variantIdx, setVariantIdx] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  // Liked state comes from the shared wishlist so the heart reflects products
  // already in "สินค้าที่ชอบ" and stays in sync when toggled.
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);
  const [showWishToast, setShowWishToast] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [flying, setFlying] = useState(false);

  // Wishlist feedback — matches the shop-follow pattern (pulse + toast +
  // explicit confirmation) so the interaction model is consistent app-wide.
  const heartScale = useRef(new Animated.Value(1)).current;
  const wishToastOpacity = useRef(new Animated.Value(0)).current;

  const onToggleWishlist = () => {
    const next = !wishlisted;
    toggleWishlist(product.id);

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
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1600),
        Animated.timing(wishToastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setShowWishToast(false);
      });
    }
  };
  const galleryScrollX = useRef(new Animated.Value(0)).current;
  // Hero height: square on phones (the original design); tablets shorten it so
  // the photo doesn't swallow the whole screen.
  const HERO_H = isTablet() ? Math.round(SCREEN_WIDTH * 0.75) : SCREEN_WIDTH;
  // Stretchy hero (iOS style): scrolls away normally on scroll-up, zooms in on
  // pull-down. Driven by the vertical scroll position.
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroScale = scrollY.interpolate({
    inputRange: [-HERO_H, 0],
    outputRange: [2, 1],
    extrapolateLeft: "extend", // keep filling if pulled further down
    extrapolateRight: "clamp", // no zoom while scrolling up
  });
  const heroTranslateY = scrollY.interpolate({
    inputRange: [-HERO_H, 0],
    outputRange: [-HERO_H / 2, 0],
    extrapolateLeft: "extend",
    extrapolateRight: "clamp",
  });
  // App-bar background + title fade in as the hero scrolls past (Apple style).
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [HERO_H * 0.35, HERO_H * 0.6],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  // Dark scrim at the very top — keeps the glass buttons legible over a bright
  // hero image; fades out as the (light) app-bar background fades in.
  const headerScrimOpacity = scrollY.interpolate({
    inputRange: [0, HERO_H * 0.5],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const flyAnim = useRef(new Animated.Value(0)).current;
  // Cart icon bounce when the flown image lands.
  const cartBump = useRef(new Animated.Value(1)).current;
  const bumpCart = () => {
    cartBump.setValue(1);
    Animated.sequence([
      Animated.timing(cartBump, {
        toValue: 1.28,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(cartBump, {
        toValue: 1,
        useNativeDriver: true,
        damping: 9,
        stiffness: 170,
        mass: 0.7,
      }),
    ]).start();
  };
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
      duration: 300,
      useNativeDriver: true,
    }).start();
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      Animated.timing(counterOpacity, {
        toValue: 0,
        duration: 300,
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
  // Active view = the selected variant merged onto the product (no variants → the
  // product itself). Image / name / price all follow the selected variant.
  // Selected variant → its data. No variant chosen yet → cover/first photo +
  // generic name, priced from the cheapest variant. Non-variant product → itself.
  const cheapest = variants ? variants.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  const view =
    variants && variantIdx !== null
      ? { ...product, ...variants[variantIdx] }
      : group && cheapest
      ? {
          ...product,
          image: group.cover ?? cheapest.image,
          name: group.name,
          price: cheapest.price,
          originalPrice: cheapest.originalPrice,
          discountPercent: cheapest.discountPercent,
        }
      : product;
  const priceColor = view.discountPercent ? "#bc1b06" : "#226a3b";
  // The headline price reflects the chosen quantity (× unit price).
  const qty = Math.max(1, quantity);
  // "สินค้าเหมาะกับคุณ" — other catalog products, excluding the current one.
  const recommended = REAL_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 8);

  // Each product ships one real photo; repeat it so the hero stays swipeable
  // (the dots + counter signal "you can slide"). Same shot per slide on purpose.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const galleryRef = useRef<any>(null);
  // Variant products show every related photo (cover, if any, + each variant);
  // plain products repeat their single shot so the hero still reads as swipeable.
  const coverCount = group?.cover ? 1 : 0;
  const galleryImages = group
    ? group.cover
      ? [group.cover, ...variants!.map((v) => v.image)]
      : variants!.map((v) => v.image)
    : GALLERY_OVERRIDE[product.id] ?? [view.image, view.image, view.image];
  const hasGallery = galleryImages.length > 1;

  // Picking a variant scrolls the hero to its photo; deselecting returns to the
  // first image. Manual swiping is unaffected.
  useEffect(() => {
    if (!group) return;
    const target = variantIdx === null ? 0 : variantIdx + coverCount;
    galleryRef.current?.scrollToOffset({ offset: target * SCREEN_WIDTH, animated: true });
    setGalleryIdx(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantIdx]);

  const handleAddToCart = () => {
    // Require an option choice first (no default is pre-selected), unless the
    // product has no options at all.
    const noChoice = !noOptions && (variants ? variantIdx === null : selectedOption === null);
    if (noChoice) {
      Alert.alert("เลือกตัวเลือกสินค้า", "กรุณาเลือกตัวเลือกก่อนเพิ่มลงตะกร้า");
      return;
    }
    // Actually add the line to the shared cart (badge + CartScreen update).
    addToCart({
      id: `p-${view.id}-${variants ? variantIdx : selectedOption}`,
      productId: view.id,
      name: view.name,
      option: noOptions ? "" : variants ? variants[variantIdx!].label : `ขนาด ${OPTIONS[selectedOption!]}`,
      price: view.price,
      originalPrice: view.originalPrice,
      image: view.image,
      quantity,
      shop: shop.name,
    });
    // Peak-End: fly the product image to the cart icon (delightful moment),
    // then briefly flip the button to ✓ "เพิ่มแล้ว".
    setFlying(true);
    flyAnim.setValue(0);
    Animated.timing(flyAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setFlying(false);
      bumpCart();
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 1400);
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: preview ? insets.bottom + 24 : 120 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        {/* Content stays interactive even in owner preview — gallery swipe, image
            viewer + option picker all work; only the buy/chat bar is hidden. */}
        <View>
        {/* Stretchy hero — scrolls away on scroll-up; zooms in on pull-down (iOS) */}
        <Animated.View
          style={{
            width: SCREEN_WIDTH,
            height: HERO_H,
            backgroundColor: "#f5f5f5",
            transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
          }}
        >
          <Animated.FlatList
            ref={galleryRef}
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
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => {
                  setViewerStart(index);
                  setViewerOpen(true);
                }}
              >
                <Image
                  source={item as number}
                  style={{ width: SCREEN_WIDTH, height: HERO_H }}
                  resizeMode="cover"
          resizeMethod="resize"
                />
              </Pressable>
            )}
          />

          {/* Image counter pill — only when there's more than one photo */}
          {hasGallery ? (
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
          ) : null}

          {/* Dots indicator at bottom of gallery — only when multi-image */}
          {hasGallery ? (
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
          ) : null}
        </Animated.View>

        {/* Content */}
        <View style={{ backgroundColor: "#fafafa" }}>

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
                ฿{(view.price * qty).toFixed(0)}
              </Text>
              {view.originalPrice ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: TEXT_MUTED,
                    textDecorationLine: "line-through",
                  }}
                >
                  ฿{(view.originalPrice * qty).toFixed(0)}
                </Text>
              ) : null}
              {view.discountPercent ? (
                <View
                  style={{
                    backgroundColor: "#e62e05",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 9999,
                  }}
                >
                  <Text style={{ color: "white", fontSize: 11, fontWeight: "600", lineHeight: 14 }}>
                    -{view.discountPercent}%
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
            <View className="flex-row items-center" style={{ gap: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 26, fontWeight: "700", color: priceColor, lineHeight: 30 }}>
                ฿{(view.price * qty).toFixed(0)}
              </Text>
              {view.originalPrice ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: TEXT_MUTED,
                    textDecorationLine: "line-through",
                  }}
                >
                  ฿{(view.originalPrice * qty).toFixed(0)}
                </Text>
              ) : null}
              {view.discountPercent ? (
                <View
                  style={{
                    backgroundColor: "#e62e05",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 9999,
                  }}
                >
                  <Text style={{ color: "white", fontSize: 11, fontWeight: "600", lineHeight: 14 }}>
                    -{view.discountPercent}%
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
              marginBottom: 10,
            }}
          >
            {view.name}
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
          {!noOptions ? (
            <>
              <Text style={{ fontSize: 14, color: "#525252", marginBottom: 10, lineHeight: 18 }}>
                ตัวเลือกสินค้า
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8, marginBottom: 16 }}>
                {variants
                  ? variants.map((v, i) => (
                      <OptionPill
                        key={v.id}
                        label={v.label}
                        active={variantIdx === i}
                        onPress={() => setVariantIdx((cur) => (cur === i ? null : i))}
                      />
                    ))
                  : OPTIONS.map((opt, i) => (
                      <OptionPill
                        key={opt}
                        label={opt}
                        active={selectedOption === i}
                        onPress={() => setSelectedOption((cur) => (cur === i ? null : i))}
                      />
                    ))}
              </View>
            </>
          ) : null}

          <Text style={{ fontSize: 14, color: "#525252", marginBottom: 10, lineHeight: 18 }}>
            จำนวนสินค้า
          </Text>
          <View className="flex-row items-center" style={{ gap: 14 }}>
            {/* Same stepper UI as CartScreen — consistent quantity control
                across surfaces so users only learn it once (Jakob's Law). */}
            <View
              className="flex-row items-center"
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <StepButton onPress={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                <Minus size={16} color="#0a0a0a" />
              </StepButton>
              <TextInput
                value={quantity ? String(quantity) : ""}
                onChangeText={(t) => {
                  const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
                  setQuantity(Number.isNaN(n) ? 0 : Math.min(stock, n));
                }}
                onEndEditing={() => setQuantity((q) => (q < 1 ? 1 : q))}
                keyboardType="number-pad"
                selectTextOnFocus
                placeholder="1"
                placeholderTextColor="#9ca3af"
                style={{
                  width: 44,
                  height: 36,
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#0a0a0a",
                  padding: 0,
                }}
              />
              <StepButton onPress={() => setQuantity(Math.min(stock, quantity + 1))} disabled={quantity >= stock}>
                <Plus size={16} color="#0a0a0a" />
              </StepButton>
            </View>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Package size={16} color="#737373" strokeWidth={2} />
              <Text style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>
                เหลือเพียง {stock} ชิ้น
              </Text>
            </View>
          </View>
        </View>

        {/* Product description */}
        <View
          className="bg-white"
          style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#0a0a0a", marginBottom: 10, lineHeight: 24 }}>
            รายละเอียดผลิตภัณฑ์
          </Text>
          <Text style={{ fontSize: 13, color: "#525252", lineHeight: 22, marginBottom: 18 }}>
            สมุนไพรไทยคุณภาพพรีเมียม คัดสรรจากแหล่งผลิตธรรมชาติ ผ่านกระบวนการผลิตที่ได้มาตรฐาน
            สะอาด ปลอดภัย เพื่อสุขภาพที่ดีของคุณและคนที่คุณรัก
          </Text>

          {/* ข้อมูลจำเพาะ — specs sub-section (separate heading like the web) */}
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#0a0a0a", marginBottom: 10, lineHeight: 24 }}>
            ข้อมูลจำเพาะ
          </Text>
          {[
            ["น้ำหนักสุทธิ:", "150 กรัม"],
            ["ประเภท:", "สมุนไพรอบแห้ง"],
            ["รหัสสินค้า:", `MH-${view.id.toUpperCase()}-2569`],
            ["รูปแบบ:", "แบ่งบรรจุ"],
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
              <Text style={{ fontSize: 13, color: "#737373", width: 110, lineHeight: 18 }}>{k}</Text>
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
            {/* Avatar — shop logo / initial */}
            <ShopAvatar name={shop.name} size={52} />

            {/* Name + metrics below the name */}
            <View className="flex-1">
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", lineHeight: 20 }}>
                {shopName}
              </Text>
              <View className="flex-row flex-wrap items-center" style={{ gap: 12, marginTop: 4 }}>
                <View className="flex-row items-center" style={{ gap: 4 }}>
                  <Star size={12} color={STAR_YELLOW} fill={STAR_YELLOW} />
                  <Text style={{ fontSize: 11, color: "#737373", lineHeight: 15 }}>
                    คะแนนร้านค้า <Text style={{ color: "#0a0a0a", fontWeight: "700" }}>{shop.rating}/5</Text>
                  </Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 4 }}>
                  <Heart size={12} color="#737373" strokeWidth={2} />
                  <Text style={{ fontSize: 11, color: "#737373", lineHeight: 15 }}>
                    ถูกใจสินค้า <Text style={{ color: "#0a0a0a", fontWeight: "700" }}>{shop.likes}</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Circular action buttons — hidden in shop-owner preview */}
            {!preview && (
              <>
                <Pressable
                  onPress={() => nav.navigate("Shop", { shopName: shop.name })}
                  className="active:opacity-70"
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}
                >
                  <Store size={18} color="#319754" />
                </Pressable>
                <Pressable
                  onPress={() => nav.navigate("Chat", { shopName })}
                  className="active:opacity-70"
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}
                >
                  <MessageCircle size={18} color="#319754" />
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Reviews */}
        <View
          className="bg-white"
          style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}
        >
          <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#0a0a0a", lineHeight: 24 }}>
              รีวิวสินค้า
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

        {/* สินค้าเหมาะกับคุณ — recommended products rail (hidden in preview) */}
        {!preview && (
          <View className="bg-white" style={{ paddingVertical: 16, marginTop: 8 }}>
            <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#0a0a0a", lineHeight: 24 }}>
                สินค้าเหมาะกับคุณ
              </Text>
              <Pressable
                onPress={() => nav.navigate("Products")}
                hitSlop={6}
                className="flex-row items-center active:opacity-60"
                style={{ gap: 4 }}
              >
                <Text style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>ดูทั้งหมด</Text>
                <ChevronRight size={14} color="#737373" />
              </Pressable>
            </View>
            <RecommendedPager products={recommended} />
          </View>
        )}
        </View>
        </View>
      </Animated.ScrollView>

      {/* Dark scrim over the hero so the glass buttons stay legible; fades out
          as you scroll (the light app-bar takes over). */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top + 64,
          opacity: headerScrimOpacity,
        }}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* App-bar — soft white→transparent gradient that eases in as you scroll up */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top + 72,
          opacity: headerBgOpacity,
        }}
      >
        <LinearGradient
          colors={["#ffffff", "rgba(255,255,255,0)"]}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Floating Liquid Glass controls over the cover (App Store style) */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <View
          className="flex-row items-center justify-between"
          style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}
          pointerEvents="box-none"
        >
          <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
          </GlassIconButton>

          <View className="flex-row" style={{ gap: 8 }}>
            {!preview && (
              <GlassIconButton
                onPress={onToggleWishlist}
                accessibilityLabel={wishlisted ? "นำออกจากรายการโปรด" : "เพิ่มเข้ารายการโปรด"}
                accessibilityState={{ selected: wishlisted }}
              >
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Heart size={20} color={wishlisted ? "#ff383c" : "#1a1a1a"} fill={wishlisted ? "#ff383c" : "transparent"} />
                </Animated.View>
              </GlassIconButton>
            )}

            {!preview && (
              <Animated.View style={{ transform: [{ scale: cartBump }] }}>
                <GlassIconButton onPress={() => nav.navigate("Cart")} accessibilityLabel="ตะกร้าสินค้า">
                  <ShoppingCart size={20} color="#1a1a1a" />
                </GlassIconButton>
                <View style={{ position: "absolute", top: -2, right: -4 }} pointerEvents="none">
                  <CountBadge count={cartCount} />
                </View>
              </Animated.View>
            )}

            <GlassIconButton accessibilityLabel="แชร์">
              <Share2 size={20} color="#1a1a1a" />
            </GlassIconButton>
          </View>
        </View>
      </SafeAreaView>

      {/* Black scroll-edge shade at the very bottom of the screen. */}
      <BottomFade />

      {/* Floating Liquid Glass action sheet — hovers above the bottom (Apple Maps).
          Hidden entirely in shop-owner preview (no buy/chat controls). */}
      {!preview && (
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 24,
          paddingBottom: 18,
        }}
      >
        <View
          style={{
            borderRadius: 34,
            shadowColor: "#0a3d22",
            shadowOffset: { width: 0, height: 9 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 14,
          }}
        >
        <GlassView
          glassEffectStyle="regular"
          colorScheme="light"
          // Android: 95% white so the floating bar reads bright with a hint of
          // see-through; iOS keeps the real Liquid Glass material untinted.
          tintColor={Platform.OS === "android" ? "#ffffff" : undefined}
          style={{
            height: 68,
            borderRadius: 34,
            overflow: "hidden",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          {/* Chat — Liquid Glass circular button */}
          <Pressable hitSlop={6} className="active:opacity-70" onPress={() => nav.navigate("Chat", { shopName })}>
            <GlassView
              glassEffectStyle="regular"
              colorScheme="light"
              tintColor={Platform.OS === "android" ? "#eaf4ee" : "rgba(49,151,84,0.1)"}
              isInteractive
              style={{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" }}
            >
              <MessageCircle size={22} color="#319754" />
            </GlassView>
          </Pressable>

          {/* Add to cart — Liquid Glass circular button (solid green when added) */}
          <Pressable
            onPress={handleAddToCart}
            disabled={addedToCart}
            hitSlop={6}
            className="active:opacity-70"
          >
            {addedToCart ? (
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#319754", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={22} color="white" />
              </View>
            ) : (
              <GlassView
                glassEffectStyle="regular"
                colorScheme="light"
                tintColor={Platform.OS === "android" ? "#fbf1e2" : "rgba(219,139,10,0.1)"}
                isInteractive
                style={{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" }}
              >
                <ShoppingCart size={22} color="#db8b0a" strokeWidth={2} />
                <View
                  style={{
                    position: "absolute",
                    top: 9,
                    right: 9,
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: "#db8b0a",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={8} color="#fff" strokeWidth={3.5} />
                </View>
              </GlassView>
            )}
          </Pressable>

          {/* Buy Now — primary CTA (Von Restorff: stands out as the one) */}
          <Pressable
            className="flex-1 flex-row items-center justify-center active:opacity-80"
            style={{
              height: 50,
              borderRadius: 9999,
              backgroundColor: "#319754",
              gap: 6,
            }}
          >
            <Zap size={16} color="white" fill="white" />
            <Text style={{ color: "white", fontSize: 13, fontWeight: "600", lineHeight: 18 }}>
              ซื้อสินค้า
            </Text>
          </Pressable>
        </GlassView>
        </View>
      </View>
      )}

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
            source={view.image}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          resizeMethod="resize"
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

      {/* Full-screen image viewer — tap a hero image to open; swipe between them */}
      <Modal
        visible={viewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerOpen(false)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: viewerStart * SCREEN_WIDTH, y: 0 }}
          >
            {galleryImages.map((img, i) => (
              <View
                key={`viewer-${i}`}
                style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, alignItems: "center", justifyContent: "center" }}
              >
                <Image
                  source={img as number}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
          {/* Close button — Liquid Glass (iOS 26), top-right */}
          <View style={{ position: "absolute", top: insets.top + 8, right: 16 }}>
            <GlassIconButton onPress={() => setViewerOpen(false)} accessibilityLabel="ปิด">
              {/* Android glass shim = white circle → X must be dark there. */}
              <X size={20} color={Platform.OS === "android" ? "#1a1a1a" : "#ffffff"} strokeWidth={2.6} />
            </GlassIconButton>
          </View>
        </View>
      </Modal>
    </View>
  );
}
