import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Animated,
  Easing,
  Alert,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  Award,
  BadgeCheck,
  Check,
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
import {
  BRAND_GREEN,
  BRAND_GREEN_DARK,
  TEXT_SECONDARY,
  TEXT_MUTED,
  STAR_YELLOW,
} from "../theme/tokens";
import { GlassIconButton } from "../components/GlassIconButton";
import { CountBadge } from "../components/CountBadge";
import { BottomFade } from "../components/BottomFade";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { MATERIALS, HerbalMaterial, MaterialCard } from "./HerbalMarketScreen";
import { useCart } from "../context/CartContext";
import { getShop } from "../data/shops";
import { useShopName } from "../context/SellerContext";
import { ShopAvatar } from "../components/ShopAvatar";

/** Resolve a local bundled image (require → number) or remote URL string. */
function imgSource(src: number | string | undefined): any {
  return typeof src === "number" ? src : { uri: src };
}

// Phone-frame width parity with the rest of the app's web export.
const SCREEN_WIDTH =
  Platform.OS === "web"
    ? Math.min(Dimensions.get("window").width, 430)
    : Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const PRICE_ACCENT = "#db8b0a"; // amber price color, ported verbatim from web

// Materials come from the canonical HerbalMarketScreen list.

// Per-item packaging tiers — larger packs lower the effective price/kg.
const PRICE_TIERS = [
  { minGrams: 50000, multiplier: 0.9 },
  { minGrams: 25000, multiplier: 0.95 },
  { minGrams: 5000, multiplier: 1.0 },
  { minGrams: 0, multiplier: 1.0 },
];
const tierMultiplier = (grams: number) =>
  PRICE_TIERS.find((t) => grams >= t.minGrams)?.multiplier ?? 1;

const QUICK_PICKS = [
  { g: 5, label: "5g" },
  { g: 100, label: "100g" },
  { g: 1000, label: "1kg" },
  { g: 5000, label: "5kg" },
  { g: 25000, label: "25kg" },
  { g: 50000, label: "50kg" },
];

const baht = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Mock reviews — B2B buyers reviewing the raw material (mirrors ProductDetail).
const REVIEWS = [
  { user: "ร้านชาสมุนไพรอบอุ่น", rating: 5, date: "12 มิ.ย. 2569", comment: "วัตถุดิบคุณภาพดีมาก สะอาด แห้งสนิท บรรจุภัณฑ์แน่นหนา ส่งไว" },
  { user: "โรงงานอาหารเสริม Vita", rating: 5, date: "8 มิ.ย. 2569", comment: "สั่งประจำ คุณภาพสม่ำเสมอ มีใบรับรองครบ ราคาส่งคุ้มมาก" },
  { user: "คาเฟ่ออร์แกนิก", rating: 4, date: "3 มิ.ย. 2569", comment: "ของดีตรงปก กลิ่นหอมธรรมชาติ รอบนี้ส่งช้านิดหน่อยแต่โดยรวมโอเค" },
];

type Params = { id?: string; preview?: boolean };

// Full-bleed white section — same rhythm as ProductDetailScreen (paddingH 16,
// marginTop 8 between blocks) so the two detail pages feel like siblings.
const SECTION = {
  backgroundColor: "#fff",
  paddingHorizontal: 16,
  paddingVertical: 16,
  marginTop: 8,
} as const;

// Size pill with a springy press animation — same look as ProductDetail's
// "ตัวเลือกสินค้า" pills (outlined, green tint + green text when active).
function OptionPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, friction: 5, tension: 220 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => spring(0.9)} onPressOut={() => spring(1)}>
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

// Quantity −/+ button with a springy press animation — same as ProductDetail.
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
        style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : 1, transform: [{ scale }] }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Related materials — paged 2-per-page with animated dots, mirroring the
// product page's "สินค้าเหมาะกับคุณ" rail (Jakob's Law).
function RelatedMaterialPager({
  materials,
  onOpen,
}: {
  materials: HerbalMaterial[];
  onOpen: (id: string) => void;
}) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const cardWidth = Math.floor((SCREEN_WIDTH - 32 - 12) / 2);
  const pages: HerbalMaterial[][] = [];
  for (let i = 0; i < materials.length; i += 2) pages.push(materials.slice(i, i + 2));

  return (
    <View>
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        {pages.map((pair, pi) => (
          <View
            key={`relm-${pi}`}
            style={{ width: SCREEN_WIDTH, paddingHorizontal: 16, flexDirection: "row", gap: 12 }}
          >
            {pair.map((m) => (
              <MaterialCard key={m.id} m={m} width={cardWidth} onPress={() => onOpen(m.id)} />
            ))}
            {pair.length === 1 ? <View style={{ width: cardWidth }} /> : null}
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
              outputRange: ["#d4d4d4", BRAND_GREEN, "#d4d4d4"],
              extrapolate: "clamp",
            });
            return <Animated.View key={i} style={{ height: 6, width, borderRadius: 3, backgroundColor }} />;
          })}
        </View>
      ) : null}
    </View>
  );
}

export function HerbalMarketDetailScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { id, preview } = (route.params as Params) ?? {};
  const { addToCart, count: cartCount } = useCart();

  const material = useMemo(
    () => MATERIALS.find((m) => m.id === id) ?? MATERIALS[0],
    [id],
  );
  const shop = getShop(material.supplier);
  const shopName = useShopName(material.supplier); // own shop reflects the owner's edited name

  const [galleryIdx, setGalleryIdx] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState(0);
  const [gramPerItem, setGramPerItem] = useState(material.moq * 1000);
  const [itemCount, setItemCount] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [showWishToast, setShowWishToast] = useState(false);
  const [flying, setFlying] = useState(false);
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

  // One real photo per material; repeat it so the hero stays swipeable (the
  // dots + counter signal "you can slide"). Same shot per slide on purpose.
  const galleryImages = useMemo<(number | string)[]>(
    () => [material.image, material.image, material.image],
    [material],
  );
  const hasGallery = galleryImages.length > 1;

  // ── Stretchy swipeable hero + app-bar fade (ported from ProductDetail) ──
  const scrollY = useRef(new Animated.Value(0)).current;
  const galleryScrollX = useRef(new Animated.Value(0)).current;
  const heroScale = scrollY.interpolate({
    inputRange: [-SCREEN_WIDTH, 0],
    outputRange: [2, 1],
    extrapolateLeft: "extend",
    extrapolateRight: "clamp",
  });
  const heroTranslateY = scrollY.interpolate({
    inputRange: [-SCREEN_WIDTH, 0],
    outputRange: [-SCREEN_WIDTH / 2, 0],
    extrapolateLeft: "extend",
    extrapolateRight: "clamp",
  });
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [SCREEN_WIDTH * 0.35, SCREEN_WIDTH * 0.6],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const headerScrimOpacity = scrollY.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.5],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Image counter pill — fades in on swipe, fades out 2s after rest.
  const counterOpacity = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingCounter = () => {
    Animated.timing(counterOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      Animated.timing(counterOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 2000);
  };
  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  // Wishlist feedback — pulse + toast, mirroring ProductDetail.
  const heartScale = useRef(new Animated.Value(1)).current;
  const wishToastOpacity = useRef(new Animated.Value(0)).current;
  const onToggleWishlist = () => {
    const next = !wishlisted;
    setWishlisted(next);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, damping: 8, stiffness: 220, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, damping: 12, stiffness: 200, useNativeDriver: true }),
    ]).start();
    if (next) {
      setShowWishToast(true);
      wishToastOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(wishToastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(wishToastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setShowWishToast(false);
      });
    }
  };

  // ── Bulk pricing math (preserved verbatim) ──
  const totalGrams = gramPerItem * itemCount;
  const totalKg = totalGrams / 1000;
  const effectivePricePerKg = material.pricePerKg * tierMultiplier(gramPerItem);
  const totalPrice = totalKg * effectivePricePerKg;
  const belowMoq = totalKg < material.moq;

  // Per-item size must meet the MOQ: first quick-pick is exactly the MOQ, then
  // any larger presets (so the smallest option always matches the MOQ).
  const moqGrams = material.moq * 1000;
  const quickPicks = [
    { g: moqGrams, label: `${material.moq}kg` },
    ...QUICK_PICKS.filter((p) => p.g > moqGrams),
  ];

  const suggestion = useMemo(() => {
    const nextTier = PRICE_TIERS.find(
      (t) => gramPerItem < t.minGrams && totalGrams >= t.minGrams,
    );
    if (!nextTier) return null;
    const newGramPerItem = nextTier.minGrams;
    const newCount = Math.max(1, Math.floor(totalGrams / newGramPerItem));
    const newTotalKg = (newGramPerItem * newCount) / 1000;
    const newTotal = newTotalKg * (material.pricePerKg * nextTier.multiplier);
    const save = totalPrice - newTotal;
    return save > 0 ? { newGramPerItem, newCount, save } : null;
  }, [gramPerItem, totalGrams, totalPrice, material]);

  const recommended = useMemo(() => {
    const related = MATERIALS.filter(
      (m) => m.id !== material.id && m.category === material.category,
    ).slice(0, 4);
    return related.length > 0
      ? related
      : MATERIALS.filter((m) => m.id !== material.id).slice(0, 4);
  }, [material]);

  const handleAddToCart = () => {
    if (belowMoq) {
      Alert.alert("จำนวนต่ำกว่า MOQ", `ขั้นต่ำ ${material.moq} กก.`);
      return;
    }
    // Add the line to the shared cart (badge + CartScreen update). Herbal is
    // priced by weight: one "item" = gramPerItem grams, quantity = itemCount.
    const pricePerItem = Math.round((gramPerItem / 1000) * effectivePricePerKg);
    addToCart({
      id: `m-${material.id}-${gramPerItem}`,
      name: material.name,
      option: `${gramPerItem.toLocaleString()} กรัม/ชิ้น`,
      price: pricePerItem,
      image: material.image,
      quantity: itemCount,
      shop: material.supplier,
    });
    // Peak-End: fly the material image to the cart icon, then flip to ✓.
    setFlying(true);
    flyAnim.setValue(0);
    Animated.timing(flyAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(() => {
      setFlying(false);
      bumpCart();
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    });
  };

  // Deterministic mock review/sold/like counts (materials carry none here).
  const reviewCount = 8 + (material.stock % 50);
  const soldCount = 30 + (material.stock % 180);
  const likeCount = 60 + (material.stock % 240);

  const SPECS: [string, string][] = [
    ["ประเภทวัตถุดิบ", material.category],
    ["ชื่อวิทยาศาสตร์", material.scientificName],
    ["เกรด", material.grade],
    ["MOQ", `${material.moq} กก. / คำสั่งซื้อ`],
    ["คงเหลือในสต็อก", `${material.stock.toLocaleString()} กก.`],
    ["แหล่งผลิต", material.location],
    ["ราคา/กก.", `฿${material.pricePerKg.toLocaleString()}`],
    ["บรรจุภัณฑ์", "ถุงสุญญากาศ 5 / 10 / 25 กก."],
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: preview ? insets.bottom + 24 : 120 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        {/* Preview = view-only: block taps on content (scroll + close still work) */}
        <View pointerEvents={preview ? "none" : "auto"}>
        {/* Stretchy hero — scrolls away on scroll-up; zooms in on pull-down (iOS) */}
        <Animated.View
          style={{
            width: SCREEN_WIDTH,
            height: SCREEN_WIDTH,
            backgroundColor: "#f5f5f5",
            transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
          }}
        >
          <Animated.FlatList
            data={galleryImages}
            keyExtractor={(_: unknown, i: number) => `g-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: galleryScrollX } } }], {
              useNativeDriver: false,
              listener: pingCounter,
            })}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              setGalleryIdx(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
            }}
            renderItem={({ item, index }: { item: number | string; index: number }) => (
              <Pressable
                onPress={() => {
                  setViewerStart(index);
                  setViewerOpen(true);
                }}
              >
                <Image
                  source={imgSource(item)}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                  resizeMode="cover"
                />
              </Pressable>
            )}
          />

          {/* Image counter pill */}
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

          {/* Dots indicator */}
          {hasGallery ? (
            <View
              className="absolute left-0 right-0 flex-row items-center justify-center"
              style={{ bottom: 12, gap: 6 }}
              pointerEvents="none"
            >
              {galleryImages.map((_, i) => {
                const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
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
                return <Animated.View key={i} style={{ height: 6, width, borderRadius: 3, backgroundColor }} />;
              })}
            </View>
          ) : null}
        </Animated.View>

        {/* Content */}
        <View style={{ backgroundColor: "#fafafa" }}>
          {/* Price (total for the selected ปริมาณ × จำนวน) + per-kg + MOQ — above the name */}
          <View className="bg-white" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
            <View className="flex-row items-end" style={{ gap: 10 }}>
              <Text style={{ fontSize: 26, fontWeight: "700", color: PRICE_ACCENT, lineHeight: 30 }}>
                ฿{baht(totalPrice)}
              </Text>
              <View style={{ marginLeft: "auto", alignItems: "flex-end" }}>
                <Text style={{ fontSize: 9, color: PRICE_ACCENT, fontWeight: "600" }}>Price per kg:</Text>
                <Text style={{ fontSize: 11, color: PRICE_ACCENT, fontWeight: "700" }}>
                  ฿{baht(effectivePricePerKg)}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 18, fontWeight: "500", color: "#0a0a0a", lineHeight: 24, marginTop: 12 }}>
              {material.name}
            </Text>
            <View className="flex-row items-center" style={{ gap: 16, marginTop: 10 }}>
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <Star size={14} color={STAR_YELLOW} fill={STAR_YELLOW} />
                <Text style={{ fontSize: 12, color: "#0a0a0a", lineHeight: 16 }}>{material.rating}</Text>
                <Text style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>
                  ({reviewCount} รีวิว)
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>
                ขายแล้ว {soldCount}+ กก.
              </Text>
            </View>

            {suggestion ? (
              <View
                className="flex-row items-start"
                style={{
                  backgroundColor: "#fff7ed",
                  borderWidth: 1,
                  borderColor: "#fed7aa",
                  borderRadius: 14,
                  padding: 12,
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <Text style={{ fontSize: 14 }}>💡</Text>
                <Text style={{ flex: 1, fontSize: 12, color: "#92400e", lineHeight: 18 }}>
                  ถ้าเลือก{" "}
                  <Text style={{ fontWeight: "700" }}>{suggestion.newGramPerItem.toLocaleString()} กรัม</Text>{" "}
                  {suggestion.newCount} ชิ้น จะประหยัดกว่า{" "}
                  <Text style={{ color: PRICE_ACCENT, fontWeight: "700" }}>{baht(suggestion.save)}฿</Text>
                </Text>
              </View>
            ) : null}

            <View
              className="flex-row items-center"
              style={{ gap: 8, paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: "#f0f0f0" }}
            >
              <View
                className="flex-row items-center"
                style={{
                  backgroundColor: "rgba(245,158,11,0.12)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                  gap: 4,
                }}
              >
                <Package size={12} color="#b45309" strokeWidth={2.4} />
                <Text style={{ fontSize: 11, color: "#b45309", fontWeight: "600" }}>
                  MOQ: {material.moq} กก.
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: TEXT_MUTED }}>จำนวนสั่งซื้อขั้นต่ำต่อครั้ง</Text>
            </View>
          </View>

          {/* Quantity selector — ปริมาณ (g/ชิ้น) × จำนวน (ชิ้น) + quick picks */}
          <View className="bg-white" style={{ ...SECTION }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* ปริมาณ */}
              <View style={{ flex: 1, gap: 8 }}>
                <View className="flex-row items-baseline" style={{ gap: 6 }}>
                  <Text style={{ fontSize: 14, color: "#525252", lineHeight: 18 }}>ปริมาณ</Text>
                  <Text style={{ fontSize: 11, color: TEXT_MUTED }}>ขั้นต่ำ: {material.moq.toLocaleString()} กก.</Text>
                </View>
                <View
                  className="flex-row items-center"
                  style={{ height: 44, paddingHorizontal: 16, gap: 6, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb" }}
                >
                  <TextInput
                    value={gramPerItem ? String(gramPerItem) : ""}
                    onChangeText={(t) => {
                      const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
                      setGramPerItem(Number.isNaN(n) ? 0 : n);
                    }}
                    onEndEditing={() => setGramPerItem((g) => (g < material.moq * 1000 ? material.moq * 1000 : g))}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#0a0a0a", padding: 0, textAlign: "left" }}
                  />
                  <Text style={{ fontSize: 12, color: "#9ca3af", fontWeight: "600" }}>GRAM</Text>
                </View>
              </View>

              {/* จำนวน — full-width rounded stepper (−/+ at the ends, value fills) */}
              <View style={{ flex: 1, gap: 8 }}>
                <View className="flex-row items-baseline" style={{ gap: 6 }}>
                  <Text style={{ fontSize: 14, color: "#525252", lineHeight: 18 }}>จำนวน</Text>
                  <Text style={{ fontSize: 11, color: TEXT_MUTED }}>ชิ้น</Text>
                </View>
                <View
                  className="flex-row items-center"
                  style={{ height: 44, paddingHorizontal: 4, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}
                >
                  <StepButton onPress={() => setItemCount((c) => Math.max(1, c - 1))} disabled={itemCount <= 1}>
                    <Minus size={16} color="#0a0a0a" />
                  </StepButton>
                  <TextInput
                    value={itemCount ? String(itemCount) : ""}
                    onChangeText={(t) => {
                      const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
                      setItemCount(Number.isNaN(n) ? 0 : n);
                    }}
                    onEndEditing={() => setItemCount((c) => (c < 1 ? 1 : c))}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    placeholder="1"
                    placeholderTextColor="#9ca3af"
                    style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: "600", color: "#0a0a0a", padding: 0 }}
                  />
                  <StepButton onPress={() => setItemCount((c) => c + 1)}>
                    <Plus size={16} color="#0a0a0a" />
                  </StepButton>
                </View>
              </View>
            </View>

            {/* Quick-pick preset sizes — styled like ProductDetail's option pills.
                Stock shown here with a Package icon (like ProductDetail's stock). */}
            <View className="flex-row items-center justify-between" style={{ marginTop: 16, marginBottom: 10 }}>
              <Text style={{ fontSize: 14, color: "#525252", lineHeight: 18 }}>เลือกขนาดด่วน</Text>
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Package size={16} color="#737373" strokeWidth={2} />
                <Text style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>
                  คงเหลือ {material.stock.toLocaleString()} กก.
                </Text>
              </View>
            </View>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {quickPicks.map((p) => (
                <OptionPill
                  key={p.g}
                  label={p.label}
                  active={gramPerItem === p.g}
                  onPress={() => setGramPerItem(p.g)}
                />
              ))}
            </View>
          </View>

          {/* Description + specs + certifications */}
          <View className="bg-white" style={{ ...SECTION }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#0a0a0a", marginBottom: 10, lineHeight: 24 }}>
              รายละเอียดวัตถุดิบ
            </Text>
            <Text style={{ fontSize: 14, color: "#0a0a0a", lineHeight: 22, marginBottom: 18 }}>
              {material.name} ({material.scientificName}) เป็นวัตถุดิบสมุนไพรคุณภาพคัดสรร จากแหล่งปลูก
              {material.location} — ผ่านกระบวนการทำความสะอาด ตากแห้ง และคัดเกรดด้วยมาตรฐานระดับ
              {material.grade} — พร้อมใบรับรอง {material.certifications.join(" / ")}{" "}
              เหมาะสำหรับโรงงานผลิตอาหารเสริม / ชาสมุนไพร / เครื่องสำอาง
            </Text>

            <Text style={{ fontSize: 18, fontWeight: "600", color: "#0a0a0a", marginBottom: 10, lineHeight: 24 }}>
              ข้อมูลจำเพาะ
            </Text>
            {SPECS.map(([label, value]) => (
              <View
                key={label}
                className="flex-row"
                style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f0f0f0" }}
              >
                <Text style={{ fontSize: 13, color: "#737373", width: 130, lineHeight: 18 }}>{label}</Text>
                <Text style={{ fontSize: 13, color: "#0a0a0a", lineHeight: 18, flex: 1 }}>{value}</Text>
              </View>
            ))}

            <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a", marginTop: 18, marginBottom: 10 }}>
              ใบรับรองและมาตรฐาน
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {material.certifications.map((c) => (
                <View
                  key={c}
                  className="flex-row items-center"
                  style={{
                    backgroundColor: "rgba(49,151,84,0.08)",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    gap: 6,
                  }}
                >
                  <Award size={12} color={BRAND_GREEN_DARK} strokeWidth={2.4} />
                  <Text style={{ fontSize: 12, color: BRAND_GREEN_DARK, fontWeight: "600" }}>{c}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Supplier / shop profile — same layout as ProductDetail's shop info */}
          <View className="bg-white" style={{ ...SECTION }}>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View style={{ width: 52, height: 52 }}>
                <ShopAvatar name={shop.name} size={52} />
                {material.supplierVerified ? (
                  <View
                    style={{
                      position: "absolute",
                      right: -2,
                      bottom: -2,
                      backgroundColor: "#fff",
                      borderRadius: 999,
                      padding: 1.5,
                    }}
                  >
                    <BadgeCheck size={18} color="#fff" fill={BRAND_GREEN} strokeWidth={2.2} />
                  </View>
                ) : null}
              </View>
              <View className="flex-1" style={{ gap: 4 }}>
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

              {!preview && (
                <Pressable
                  onPress={() => (nav.navigate as (route: string, params?: object) => void)("Shop", { shopName: material.supplier })}
                  className="active:opacity-70"
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}
                >
                  <Store size={18} color={BRAND_GREEN} />
                </Pressable>
              )}
              {!preview && (
                <Pressable
                  onPress={() => (nav.navigate as (route: string, params?: object) => void)("Chat", { shopName })}
                  className="active:opacity-70"
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}
                >
                  <MessageCircle size={18} color={BRAND_GREEN} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Reviews — same layout as ProductDetail */}
          <View className="bg-white" style={{ ...SECTION }}>
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
                {material.rating.toFixed(1)}
              </Text>
              <View>
                <View className="flex-row" style={{ gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      color={STAR_YELLOW}
                      fill={s <= Math.round(material.rating) ? STAR_YELLOW : "transparent"}
                    />
                  ))}
                </View>
                <Text style={{ fontSize: 11, color: "#737373", marginTop: 2, lineHeight: 14 }}>
                  จาก {reviewCount} รีวิว
                </Text>
              </View>
            </View>

            {REVIEWS.map((r, i) => (
              <View
                key={r.user}
                style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "#f0f0f0" }}
              >
                <View className="flex-row items-center" style={{ gap: 8, marginBottom: 4 }}>
                  <View
                    style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#525252", lineHeight: 14 }}>
                      {r.user.charAt(0)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text style={{ fontSize: 13, fontWeight: "500", color: "#0a0a0a", lineHeight: 18 }}>
                      {r.user}
                    </Text>
                    <View className="flex-row items-center" style={{ gap: 6, marginTop: 1 }}>
                      <View className="flex-row" style={{ gap: 1 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={10} color={STAR_YELLOW} fill={s <= r.rating ? STAR_YELLOW : "transparent"} />
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

          {/* Related materials */}
          {!preview && recommended.length > 0 ? (
            <View className="bg-white" style={{ paddingVertical: 16, marginTop: 8 }}>
              <Text
                style={{ fontSize: 18, fontWeight: "600", color: "#0a0a0a", paddingHorizontal: 16, marginBottom: 12 }}
              >
                วัตถุดิบที่แนะนำ
              </Text>
              <RelatedMaterialPager
                materials={recommended}
                onOpen={(mid) =>
                  (nav as unknown as { push: (route: string, params?: object) => void }).push("HerbalMarketDetail", { id: mid })
                }
              />
            </View>
          ) : null}
        </View>
        </View>
      </Animated.ScrollView>

      {/* Dark scrim over the hero — keeps glass buttons legible; fades on scroll */}
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 64, opacity: headerScrimOpacity }}
      >
        <LinearGradient colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]} style={{ flex: 1 }} />
      </Animated.View>

      {/* App-bar — soft white→transparent gradient easing in on scroll */}
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 72, opacity: headerBgOpacity }}
      >
        <LinearGradient colors={["#ffffff", "rgba(255,255,255,0)"]} style={{ flex: 1 }} />
      </Animated.View>

      {/* Floating Liquid Glass controls over the cover (App Store style) */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <View
          className="flex-row items-center justify-between"
          style={{ paddingHorizontal: preview ? 16 : 12, paddingTop: preview ? 14 : 6, paddingBottom: 8 }}
          pointerEvents="box-none"
        >
          {preview ? (
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 14, height: 44, alignItems: "center", justifyContent: "center" }}>
              <GlassView glassEffectStyle="regular" colorScheme="light" style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#1a1a1a" }}>ตัวอย่างที่แสดงหน้าขาย</Text>
              </GlassView>
            </View>
          ) : null}
          <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel={preview ? "ปิด" : "ย้อนกลับ"}>
            {preview ? <X size={22} color="#1a1a1a" strokeWidth={2.6} /> : <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />}
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
                <GlassIconButton onPress={() => (nav.navigate as (r: string) => void)("Cart")} accessibilityLabel="ตะกร้าสินค้า">
                  <ShoppingCart size={20} color="#1a1a1a" />
                </GlassIconButton>
                <View style={{ position: "absolute", top: -2, right: -4 }} pointerEvents="none">
                  <CountBadge count={cartCount} />
                </View>
              </Animated.View>
            )}

            {!preview && (
              <GlassIconButton accessibilityLabel="แชร์">
                <Share2 size={20} color="#1a1a1a" />
              </GlassIconButton>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Black scroll-edge shade at the very bottom of the screen. */}
      <BottomFade />

      {/* Floating Liquid Glass action sheet — hovers above the bottom (Apple Maps).
          Hidden in shop-owner preview (no buy/chat controls). */}
      {!preview && (
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 18 }}>
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
            {/* Chat */}
            <Pressable hitSlop={6} className="active:opacity-70" onPress={() => (nav.navigate as (r: string, p?: object) => void)("Chat", { shopName })}>
              <GlassView
                glassEffectStyle="regular"
                colorScheme="light"
                tintColor="rgba(49,151,84,0.1)"
                isInteractive
                style={{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" }}
              >
                <MessageCircle size={22} color="#319754" />
              </GlassView>
            </Pressable>

            {/* Add to cart (solid green when added) */}
            <Pressable onPress={handleAddToCart} disabled={addedToCart} hitSlop={6} className="active:opacity-70">
              {addedToCart ? (
                <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#319754", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle2 size={22} color="white" />
                </View>
              ) : (
                <GlassView
                  glassEffectStyle="regular"
                  colorScheme="light"
                  tintColor="rgba(219,139,10,0.1)"
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

            {/* Buy now → purchase flow */}
            <Pressable
              onPress={() => (nav.navigate as (route: string, params?: object) => void)("HerbalMarketPurchase", { id: material.id })}
              className="flex-1 flex-row items-center justify-center active:opacity-80"
              style={{ height: 50, borderRadius: 9999, backgroundColor: "#319754", gap: 6 }}
            >
              <Zap size={16} color="white" fill="white" />
              <Text style={{ color: "white", fontSize: 13, fontWeight: "600", lineHeight: 18 }}>ซื้อเลย</Text>
            </Pressable>
          </GlassView>
        </View>
      </View>
      )}

      {/* Fly-to-cart overlay — animates a copy of the material image toward the
          cart icon in the top bar. Outside ScrollView so it renders on top. */}
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
                translateY: flyAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, -SCREEN_WIDTH / 2 + 20, 60 - SCREEN_WIDTH / 2],
                }),
              },
              { scale: flyAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.22] }) },
              { rotate: flyAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "25deg"] }) },
            ],
            opacity: flyAnim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
          }}
        >
          <Image source={imgSource(material.image)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        </Animated.View>
      ) : null}

      {/* Wishlist toast */}
      {showWishToast ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", top: insets.top + 58 + 8, left: 0, right: 0, alignItems: "center", zIndex: 50, opacity: wishToastOpacity }}
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
            <Text style={{ color: "white", fontSize: 13, fontWeight: "500" }}>เพิ่มเข้ารายการโปรดแล้ว</Text>
          </View>
        </Animated.View>
      ) : null}

      {/* Full-screen image viewer */}
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
                <Image source={imgSource(img)} style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
          <View style={{ position: "absolute", top: insets.top + 8, right: 16 }}>
            <GlassIconButton onPress={() => setViewerOpen(false)} accessibilityLabel="ปิด">
              <X size={20} color="#ffffff" strokeWidth={2.6} />
            </GlassIconButton>
          </View>
        </View>
      </Modal>
    </View>
  );
}
