import { glassTint } from "../theme/tokens";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Check,
  ChevronLeft,
  Clock,
  Heart,
  Leaf,
  MapPin,
  MessageCircle,
  Package,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  ThumbsUp,
} from "lucide-react-native";
import { GlassView } from "expo-glass-effect";
import { ProductCard } from "../components/ProductCard";
import { EmptyState } from "../components/EmptyState";
import { GlassIconButton } from "../components/GlassIconButton";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { STAR_YELLOW, RATING_BAR_FILL, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";
import type { Product } from "../types/Product";
import { type SortKey } from "../data/shopSort";
import { webCategoryLabel } from "../data/catalog";
import { type HerbalSortKey } from "../data/herbalSort";
import { MATERIALS, MaterialCard } from "./HerbalMarketScreen";
import { SHOPS, getShop } from "../data/shops";
import { REAL_PRODUCTS } from "../data/realProducts";
import { useLiveProducts } from "../data/liveCatalog";
import { useSeller } from "../context/SellerContext";
import { appWidth, gridColumns, gridCardWidth } from "../theme/layout";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH =
  appWidth();

// Layout maths — the banner extends exactly to the vertical center of the
// shop avatar inside the card, so the green region "hugs" the profile pic.
//
//   ┌─── safe area top inset ──┐
//   │   header row (58px)       │   ← back/share buttons
//   ├──────── 40px gap ─────────┤   ← user-requested spacing
//   │ card padding-top (16)     │
//   │ avatar half (28)          │   ← banner ends HERE (avatar middle)
//   │ avatar bottom half (28)   │
//   │ ...                       │
//
const HEADER_ROW_HEIGHT = 58; // paddingVertical 10*2 + button 38
const HEADER_TO_CARD_GAP = 24;
const CARD_PADDING_TOP = 16;
const AVATAR_HALF = 28; // half of 56px avatar
const CARD_OVERLAP = CARD_PADDING_TOP + AVATAR_HALF; // = 44

// Mock shop data — mirrors the `Shop` shape from web's data/shops.ts so we
// can wire to the real store later by replacing this with a context/fetch.
export const SHOP = {
  id: "metaherb",
  name: "METAHERB Store",
  // The shop's logo IS the brand's main logo (same asset the app header uses),
  // so METAHERB Store presents one identity across the whole app.
  logo: require("../../assets/logo.png"),
  banner: SHOPS[0].banner, // METAHERB Store — single source of truth (data/shops)
  description:
    "ร้านค้าสมุนไพรออร์แกนิกคุณภาพระดับพรีเมียม คัดสรรวัตถุดิบจากแหล่งธรรมชาติทั่วประเทศไทย ผ่านมาตรฐาน อย. และ GMP รับประกันคุณภาพทุกชิ้น จัดส่งรวดเร็วภายใน 1-2 วัน",
  rating: 4.8,
  totalReviews: 1250,
  followers: 8520,
  joined: "ม.ค. 2567",
  responseRate: 98,
  responseTime: "ภายใน 5 นาที",
  totalProducts: 45,
  totalSold: "15K+",
  location: "กรุงเทพมหานคร",
  verified: true,
};

type Review = {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
};

export const REVIEWS: Review[] = [
  { id: "sr1", userName: "user01", rating: 5, comment: "ร้านดีมากค่ะ สินค้าคุณภาพ ส่งเร็ว แพ็คดี", date: "15 มี.ค. 2569", helpful: 24 },
  { id: "sr2", userName: "สมชาย", rating: 5, comment: "ซื้อประจำเลยครับ สินค้าออร์แกนิกจริง ไม่มีสารเคมี", date: "12 มี.ค. 2569", helpful: 18 },
  { id: "sr3", userName: "นุ่น", rating: 4, comment: "สินค้าดี แต่บางครั้งส่งช้าไปหน่อย", date: "10 มี.ค. 2569", helpful: 8 },
  { id: "sr4", userName: "วิชัย", rating: 5, comment: "ชาออร์แกนิกหอมมากครับ คุ้มค่าสุดๆ จะสั่งซ้ำแน่นอน", date: "8 มี.ค. 2569", helpful: 15 },
  { id: "sr5", userName: "มินนี่", rating: 4, comment: "แพ็คเกจสวย ให้เป็นของขวัญได้เลย ราคาดีด้วย", date: "5 มี.ค. 2569", helpful: 12 },
];

type ShopProduct = Product & { category: string; shop?: string };

// METAHERB Store's storefront products = its even share of the main catalog
// (split per shop via the `shop` field in realProducts). Sharing one source with
// the customer ShopScreen + the other shops keeps every surface consistent —
// owner console, storefront preview, product management, orders.
export const SHOP_PRODUCTS: ShopProduct[] = REAL_PRODUCTS.filter(
  (p) => p.shop === "METAHERB Store",
) as ShopProduct[];

type TabKey = "products" | "herbal" | "reviews";

export function ShopScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  // Which shop are we viewing? The route may target ANY of the three shops; when
  // absent we default to the flagship (METAHERB Store) for back-compat.
  const route = useRoute<RouteProp<RootStackParamList, "Shop">>();
  const shopName = route.params?.shopName ?? "METAHERB Store";
  const isMine = shopName === "METAHERB Store";
  const meta = getShop(shopName); // full identity from data/shops.ts

  // Reflect the owner's profile edits (name / desc / logo / banner) so the public
  // shop page always matches "จัดการร้านค้า" — but ONLY for METAHERB Store (the
  // owner console only edits the flagship). Other shops use their static identity.
  const { shopLogoUri, shopBannerUri, shopProfile } = useSeller();
  const displayName = isMine ? shopProfile?.shopName || meta.name : meta.name;
  const displayDesc = isMine
    ? shopProfile?.description || meta.description || ""
    : meta.description ?? "";
  const displayLogo = isMine && shopLogoUri ? { uri: shopLogoUri } : meta.avatar ?? SHOP.logo;
  const displayBanner =
    isMine && shopBannerUri ? { uri: shopBannerUri } : meta.banner ?? SHOP.banner;
  const [following, setFollowing] = useState(false);
  const [showFollowToast, setShowFollowToast] = useState(false);
  const [tab, setTab] = useState<TabKey>("products");
  const [category, setCategory] = useState<string>("ทั้งหมด");
  const [sort, setSort] = useState<SortKey>("popular");
  // Herbal Market tab filters.
  const [herbalCategory, setHerbalCategory] = useState<string>("ทั้งหมด");
  const [herbalSort, setHerbalSort] = useState<HerbalSortKey>("popular");

  // The native filter sheets hand their choices back via route params.
  const routeSort = route.params?.sort;
  const routeCategory = route.params?.category;
  const routeHerbalSort = route.params?.herbalSort;
  const routeHerbalCategory = route.params?.herbalCategory;
  useEffect(() => {
    if (routeSort) setSort(routeSort);
  }, [routeSort]);
  useEffect(() => {
    if (routeCategory) setCategory(routeCategory);
  }, [routeCategory]);
  useEffect(() => {
    if (routeHerbalSort) setHerbalSort(routeHerbalSort);
  }, [routeHerbalSort]);
  useEffect(() => {
    if (routeHerbalCategory) setHerbalCategory(routeHerbalCategory);
  }, [routeHerbalCategory]);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Heart "pop" feedback — pulses on toggle so the state change is felt, not
  // just seen. Visibility-of-System-Status + Aesthetic-Usability.
  const heartScale = useRef(new Animated.Value(1)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const onToggleFollow = () => {
    const next = !following;
    setFollowing(next);

    // Pulse the heart icon
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

    // Show + auto-hide inline confirmation toast (Peak-End Rule:
    // explicit "ติดตามแล้ว" makes the success memorable).
    if (next) {
      setShowFollowToast(true);
      toastOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1600),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setShowFollowToast(false);
      });
    }
  };

  // Live followers count — visible system response to the user's action.
  const liveFollowers = (meta.followers ?? SHOP.followers) + (following ? 1 : 0);

  // Banner height is dynamic — it depends on the device's safe-area inset so
  // the green region always ends at the avatar's vertical center regardless
  // of notch / status bar height.
  const bannerHeight =
    insets.top + HEADER_ROW_HEIGHT + HEADER_TO_CARD_GAP + CARD_OVERLAP;

  // Stretchy cover — pulling down (negative scrollY) scales the banner up,
  // anchored at its bottom so it expands to fill the overscroll gap.
  const bannerScale = scrollY.interpolate({
    inputRange: [-bannerHeight, 0],
    outputRange: [2, 1],
    extrapolate: "clamp",
  });
  const bannerTranslateY = scrollY.interpolate({
    inputRange: [-bannerHeight, 0],
    outputRange: [-bannerHeight / 2, 0],
    extrapolate: "clamp",
  });

  // This shop's storefront products — every shop (METAHERB included) draws its
  // share from the main catalog, split evenly per shop by the `shop` field, so
  // each of the three shops shows ~1/3 of the products.
  // Live catalog, so a product the owner adds/hides/renames in จัดการสินค้า
  // shows up (or disappears) on their public storefront.
  const liveProducts = useLiveProducts();
  const shopProducts = useMemo(
    () => liveProducts.filter((p) => p.shop === shopName) as ShopProduct[],
    [liveProducts, shopName],
  );

  // Categories with counts derived from products — same derivation as the web
  // ShopProfilePage (Map insertion order = first-appearance order) on the web's
  // 4-category Thai labels, so the chips match the web dropdown 1:1.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    shopProducts.forEach((p) => {
      const label = webCategoryLabel(p.category);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [
      { name: "ทั้งหมด", count: shopProducts.length },
      ...Array.from(counts.entries()).map(([name, count]) => ({ name, count })),
    ];
  }, [shopProducts]);

  // Herbal Market materials this shop supplies — only show the tab if it has any.
  const herbalMaterials = useMemo(
    () => MATERIALS.filter((m) => m.supplier === shopName),
    [shopName],
  );
  const hasHerbal = herbalMaterials.length > 0;

  // Distinct material categories this shop stocks (for the herbal filter/chips).
  const herbalCategories = useMemo(
    () => ["ทั้งหมด", ...Array.from(new Set(herbalMaterials.map((m) => m.category)))],
    [herbalMaterials],
  );

  // Apply category + sort to the herbal materials (mirrors HerbalMarket).
  // (Text search lives on the ShopSearch page.)
  const filteredHerbal = useMemo(() => {
    let list = herbalMaterials.filter(
      (m) => herbalCategory === "ทั้งหมด" || m.category === herbalCategory,
    );
    if (herbalSort === "price_asc") list = [...list].sort((a, b) => a.pricePerKg - b.pricePerKg);
    else if (herbalSort === "price_desc") list = [...list].sort((a, b) => b.pricePerKg - a.pricePerKg);
    else if (herbalSort === "moq_asc") list = [...list].sort((a, b) => a.moq - b.moq);
    else list = [...list].sort((a, b) => b.rating - a.rating); // popular
    return list;
  }, [herbalMaterials, herbalCategory, herbalSort]);

  // Apply category filter, then sort. (Text search lives on the ShopSearch page.)
  const filteredProducts = useMemo(() => {
    let list = shopProducts.filter(
      (p) => category === "ทั้งหมด" || webCategoryLabel(p.category) === category,
    );
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [shopProducts, category, sort]);

  const ratingBreakdown = useMemo(() => {
    return [5, 4, 3, 2, 1].map((s) => ({
      stars: s,
      count: REVIEWS.filter((r) => r.rating === s).length,
    }));
  }, []);

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="light" />

      {/* Single morphing header — cross-fades between "transparent over banner"
          and "white solid scrolled" states. One button position per side; two
          stacked icon copies + bg layers handle the visual swap. This avoids
          the double-stacking issues of two separate headers. */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <SafeAreaView edges={["top"]} pointerEvents="box-none">
          {/* Transparent app bar — only the floating glass buttons (no fill) */}
          <View
            className="flex-row items-center justify-between"
            style={{ paddingHorizontal: 12, paddingVertical: 10 }}
          >
            <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel="ย้อนกลับ">
              <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
            </GlassIconButton>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <GlassIconButton
                onPress={() => nav.navigate("ShopSearch", { shopName })}
                accessibilityLabel="ค้นหาสินค้าในร้านนี้"
              >
                <Search size={18} color="#1a1a1a" strokeWidth={2.2} />
              </GlassIconButton>
              <GlassIconButton accessibilityLabel="แชร์ร้านค้า">
                <Share2 size={18} color="#1a1a1a" strokeWidth={2.2} />
              </GlassIconButton>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
      >
        {/* Banner — solid brand green; height is computed to end at the
            avatar's vertical center (see layout maths above). */}
        {/* Shop cover image (natural herb banner) — stretches on pull-down */}
        <View style={{ height: bannerHeight, backgroundColor: "#319754" }}>
          <Animated.View style={{ width: "100%", height: "100%", transform: [{ translateY: bannerTranslateY }, { scale: bannerScale }] }}>
            <Image source={displayBanner} style={{ width: "100%", height: "100%" }} resizeMode="cover"
          resizeMethod="resize" />
            <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(13,49,29,0.28)" }} />
          </Animated.View>
        </View>

        {/* Shop info card — overlaps banner */}
        <View
          style={{
            marginTop: -CARD_OVERLAP,
            marginHorizontal: 12,
            backgroundColor: "white",
            borderRadius: 24,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          {/* Row 1: Avatar + Name + Verified + Action icons (Follow + Chat) */}
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "rgba(49,151,84,0.1)",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <Image source={displayLogo} style={{ width: "100%", height: "100%" }} resizeMode="cover"
          resizeMethod="resize" />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{ fontSize: 17, fontWeight: "700", color: "#0a0a0a", lineHeight: 22 }}
              >
                {displayName}
              </Text>
              {(meta.verified ?? SHOP.verified) ? (
                <View
                  className="flex-row items-center self-start"
                  style={{
                    marginTop: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: "rgba(49,151,84,0.1)",
                    gap: 4,
                  }}
                >
                  <ShieldCheck size={12} color="#319754" />
                  <Text style={{ fontSize: 11, color: BRAND_GREEN_DARK, fontWeight: "600" }}>
                    ยืนยันแล้ว
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Icon CTAs — share the row with the shop name (Law of Proximity:
                they act on this shop, so they sit beside its identity). */}
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Pressable
                onPress={onToggleFollow}
                hitSlop={6}
                className="active:opacity-80"
                accessibilityLabel={following ? "เลิกติดตามร้าน" : "ติดตามร้าน"}
                accessibilityState={{ selected: following }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: following ? "rgba(239,68,68,0.1)" : "#319754",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: following ? 1 : 0,
                  borderColor: following ? "#ef4444" : "transparent",
                }}
              >
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Heart
                    size={18}
                    color={following ? "#ef4444" : "white"}
                    fill={following ? "#ef4444" : "transparent"}
                  />
                </Animated.View>
              </Pressable>
              <Pressable
                hitSlop={6}
                className="active:opacity-80"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 1,
                  borderColor: "#319754",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MessageCircle size={18} color="#319754" />
              </Pressable>
            </View>
          </View>

          {/* Description */}
          <Text
            numberOfLines={2}
            style={{ fontSize: 13, color: "#525252", marginTop: 10, lineHeight: 19 }}
          >
            {displayDesc}
          </Text>

          {/* Meta row */}
          <View className="flex-row items-center flex-wrap" style={{ marginTop: 10, gap: 12 }}>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <MapPin size={12} color="#737373" />
              <Text style={{ fontSize: 11, color: "#737373" }}>{meta.location ?? SHOP.location}</Text>
            </View>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <Clock size={12} color="#737373" />
              <Text style={{ fontSize: 11, color: "#737373" }}>
                เข้าร่วม {meta.joined ?? SHOP.joined}
              </Text>
            </View>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <MessageCircle size={12} color="#737373" />
              <Text style={{ fontSize: 11, color: "#737373" }}>
                ตอบ {meta.responseRate ?? SHOP.responseRate}%
              </Text>
            </View>
          </View>

          {/* Stats — 4 columns with dividers (Law of Proximity) */}
          <View
            className="flex-row items-center"
            style={{
              marginTop: 14,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: "#f5f5f5",
            }}
          >
            <Stat value={String(meta.rating ?? SHOP.rating)} label="คะแนน" highlight star />
            <Divider />
            <Stat
              value={formatNumber(liveFollowers)}
              label="ผู้ติดตาม"
              highlight={following}
            />
            <Divider />
            <Stat value={String(meta.totalProducts ?? SHOP.totalProducts)} label="สินค้า" />
            <Divider />
            <Stat value={meta.totalSold ?? SHOP.totalSold} label="ยอดขาย" />
          </View>

        </View>

        {/* Tabs row — Products / [Herbal Market] / Reviews as an underline tab bar */}
        <ShopTabs
          tab={tab}
          onChange={setTab}
          hasHerbal={hasHerbal}
          counts={{ products: shopProducts.length, herbal: herbalMaterials.length, reviews: REVIEWS.length }}
        />

        {tab === "products" ? (
          <>
            {/* Filter button (sort) + category chips — same language as the Products page.
                (Search moved to the app-bar button → ShopSearch page.) */}
            <View className="flex-row items-center" style={{ marginTop: 14, gap: 10, paddingLeft: 12 }}>
              <Pressable
                onPress={() => nav.navigate("ShopSort", { current: sort, category, categories: categories.map((c) => c.name) })}
                hitSlop={6}
                accessibilityLabel="ตัวกรอง"
              >
                <GlassView
                  glassEffectStyle="regular"
                  colorScheme="light"
                  tintColor={glassTint("rgba(255,255,255,0.45)", "rgba(255,255,255,0.9)")}
                  isInteractive
                  style={{ width: 40, height: 40, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" }}
                >
                  <SlidersHorizontal size={18} color="#374151" strokeWidth={2.2} />
                </GlassView>
              </Pressable>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
                {categories.map((c) => {
                  const active = category === c.name;
                  return (
                    <Pressable key={c.name} onPress={() => setCategory(c.name)} hitSlop={4}>
                      <GlassView
                        glassEffectStyle="regular"
                        colorScheme="light"
                        tintColor={active ? "rgba(49,151,84,0.22)" : "rgba(255,255,255,0.45)"}
                        isInteractive
                        style={{ height: 34, paddingHorizontal: 16, borderRadius: 999, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: active ? "rgba(49,151,84,0.45)" : "rgba(0,0,0,0.06)" }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? BRAND_GREEN_DARK : "#374151" }}>{c.name}</Text>
                      </GlassView>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Products grid */}
            <View style={{ marginTop: 12 }}>
              <ProductsGrid products={filteredProducts} />
            </View>
          </>
        ) : tab === "herbal" ? (
          <>
            {/* Filter button + material-category chips.
                (Search moved to the app-bar button → ShopSearch page.) */}
            <View className="flex-row items-center" style={{ marginTop: 14, gap: 10, paddingLeft: 12 }}>
              <Pressable
                onPress={() =>
                  nav.navigate("ShopHerbalFilter", { sort: herbalSort, category: herbalCategory, categories: herbalCategories })
                }
                hitSlop={6}
                accessibilityLabel="ตัวกรอง"
              >
                <GlassView
                  glassEffectStyle="regular"
                  colorScheme="light"
                  tintColor={glassTint("rgba(255,255,255,0.45)", "rgba(255,255,255,0.9)")}
                  isInteractive
                  style={{ width: 40, height: 40, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" }}
                >
                  <SlidersHorizontal size={18} color="#374151" strokeWidth={2.2} />
                </GlassView>
              </Pressable>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
                {herbalCategories.map((name) => {
                  const active = herbalCategory === name;
                  return (
                    <Pressable key={name} onPress={() => setHerbalCategory(name)} hitSlop={4}>
                      <GlassView
                        glassEffectStyle="regular"
                        colorScheme="light"
                        tintColor={active ? "rgba(49,151,84,0.22)" : "rgba(255,255,255,0.45)"}
                        isInteractive
                        style={{ height: 34, paddingHorizontal: 16, borderRadius: 999, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: active ? "rgba(49,151,84,0.45)" : "rgba(0,0,0,0.06)" }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? BRAND_GREEN_DARK : "#374151" }}>{name}</Text>
                      </GlassView>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Materials grid */}
            {filteredHerbal.length === 0 ? (
              <EmptyState
                icon={<Leaf size={36} color="#d4d4d4" />}
                title="ไม่พบวัตถุดิบ"
                subtitle="ลองเปลี่ยนหมวดหมู่ดู"
              />
            ) : (
              <View className="flex-row flex-wrap" style={{ marginTop: 12, paddingHorizontal: 16, gap: 14 }}>
                {filteredHerbal.map((m) => (
                  <MaterialCard
                    key={m.id}
                    m={m}
                    width={gridCardWidth(gridColumns(190, 32, 14), 32, 14)}
                    onPress={() => nav.navigate("HerbalMarketDetail", { id: m.id })}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={{ marginTop: 12 }}>
            <ReviewsSection
              reviews={REVIEWS}
              ratingBreakdown={ratingBreakdown}
              shopRating={meta.rating ?? SHOP.rating}
              totalReviews={meta.totalReviews ?? SHOP.totalReviews}
            />
          </View>
        )}
      </Animated.ScrollView>

      {/* Floating toast — appears briefly under the header to confirm the
          follow action took effect (Peak-End Rule + Visibility of Status). */}
      {showFollowToast ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: insets.top + HEADER_ROW_HEIGHT + 8,
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 20,
            opacity: toastOpacity,
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
            <Heart size={14} color="#ef4444" fill="#ef4444" />
            <Text style={{ color: "white", fontSize: 13, fontWeight: "500" }}>
              ติดตามร้าน {displayName} แล้ว
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

// Storefront tab switcher — the shared sliding-pill segmented control, so the
// customer shop profile matches the owner's หน้าร้านค้า preview 1:1.
function ShopTabs({
  tab,
  onChange,
  counts,
  hasHerbal,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
  counts: Record<TabKey, number>;
  hasHerbal: boolean;
}) {
  const tabs = [
    { id: "products" as TabKey, label: "สินค้า", count: counts.products },
    ...(hasHerbal ? [{ id: "herbal" as TabKey, label: "Herbal", count: counts.herbal }] : []),
    { id: "reviews" as TabKey, label: "รีวิว", count: counts.reviews },
  ];
  return <SegmentedTabs tabs={tabs} active={tab} onChange={onChange} style={{ marginTop: 16, marginHorizontal: 16 }} />;
}

function Stat({
  value,
  label,
  highlight,
  star,
}: {
  value: string;
  label: string;
  highlight?: boolean;
  star?: boolean;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View className="flex-row items-center" style={{ gap: 3 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: highlight ? "#319754" : "#0a0a0a",
            lineHeight: 20,
          }}
        >
          {value}
        </Text>
        {star ? <Star size={12} color={STAR_YELLOW} fill={STAR_YELLOW} /> : null}
      </View>
      <Text style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ width: 1, height: 28, backgroundColor: "#f0f0f0" }} />;
}

export function ProductsGrid({ products, preview }: { products: Product[]; preview?: boolean }) {
  // Match HomeScreen's 2-col grid (gap 12, horizontal padding 16) so card
  // dimensions are identical across screens.
  // Responsive grid — 2 columns on phones, more on tablets (flex-wrap fills rows).
  const cardWidth = gridCardWidth(gridColumns(190, 32, 12), 32, 12);

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Package size={36} color="#d4d4d4" />}
        title="ไม่พบสินค้า"
        subtitle="ลองเปลี่ยนหมวดหมู่หรือคำค้นหาดู"
      />
    );
  }

  return (
    <View
      className="flex-row flex-wrap"
      style={{ paddingHorizontal: 16, gap: 12 }}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} width={cardWidth} preview={preview} />
      ))}
    </View>
  );
}

export function ReviewsSection({
  reviews,
  ratingBreakdown,
  shopRating,
  totalReviews,
}: {
  reviews: Review[];
  ratingBreakdown: { stars: number; count: number }[];
  shopRating: number;
  totalReviews: number;
}) {
  return (
    <View style={{ paddingHorizontal: 12, gap: 10 }}>
      {/* Rating summary card */}
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: 16,
          flexDirection: "row",
          gap: 16,
          borderWidth: 1,
          borderColor: "#f0f0f0",
        }}
      >
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 32, fontWeight: "700", color: BRAND_GREEN_DARK, lineHeight: 36 }}>
            {shopRating}
          </Text>
          <View className="flex-row" style={{ marginTop: 4, gap: 1 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={12}
                color={STAR_YELLOW}
                fill={i <= Math.round(shopRating) ? STAR_YELLOW : "transparent"}
              />
            ))}
          </View>
          <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>
            {formatNumber(totalReviews)} รีวิว
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center", gap: 6 }}>
          {ratingBreakdown.map(({ stars, count }) => {
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <View key={stars} className="flex-row items-center" style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, color: "#737373", width: 10 }}>{stars}</Text>
                <Star size={10} color={STAR_YELLOW} fill={STAR_YELLOW} />
                <View
                  style={{
                    flex: 1,
                    height: 6,
                    backgroundColor: "#f0f0f0",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      backgroundColor: RATING_BAR_FILL,
                    }}
                  />
                </View>
                <Text style={{ fontSize: 10, color: TEXT_MUTED, width: 20, textAlign: "right" }}>
                  {count}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Review list */}
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#f0f0f0",
      }}
    >
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(49,151,84,0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: BRAND_GREEN_DARK }}>
            {review.userName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }}>
            {review.userName}
          </Text>
          <View className="flex-row items-center" style={{ marginTop: 2, gap: 6 }}>
            <View className="flex-row" style={{ gap: 1 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={11}
                  color={STAR_YELLOW}
                  fill={i <= review.rating ? STAR_YELLOW : "transparent"}
                />
              ))}
            </View>
            <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{review.date}</Text>
          </View>
        </View>
      </View>
      <Text style={{ fontSize: 13, color: "#404040", marginTop: 10, lineHeight: 19 }}>
        {review.comment}
      </Text>
      <View className="flex-row items-center" style={{ marginTop: 10, gap: 4 }}>
        <ThumbsUp size={12} color="#737373" />
        <Text style={{ fontSize: 11, color: "#737373" }}>{review.helpful}</Text>
      </View>
    </View>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}
