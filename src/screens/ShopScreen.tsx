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
  TextInput,
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
  X,
} from "lucide-react-native";
import { GlassView } from "expo-glass-effect";
import { ProductCard } from "../components/ProductCard";
import { EmptyState } from "../components/EmptyState";
import { GlassIconButton } from "../components/GlassIconButton";
import { STAR_YELLOW, RATING_BAR_FILL, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";
import type { Product } from "../types/Product";
import { type SortKey } from "../data/shopSort";
import { type HerbalSortKey } from "../data/herbalSort";
import { MATERIALS, MaterialCard } from "./HerbalMarketScreen";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH =
  Platform.OS === "web"
    ? Math.min(Dimensions.get("window").width, 430)
    : Dimensions.get("window").width;

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
const SHOP = {
  id: "metaherb",
  name: "METAHERB Store",
  avatar: "🌿",
  banner: require("../../assets/banner/banner_18_1773366718.jpg"),
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

const REVIEWS: Review[] = [
  { id: "sr1", userName: "user01", rating: 5, comment: "ร้านดีมากค่ะ สินค้าคุณภาพ ส่งเร็ว แพ็คดี", date: "15 มี.ค. 2569", helpful: 24 },
  { id: "sr2", userName: "สมชาย", rating: 5, comment: "ซื้อประจำเลยครับ สินค้าออร์แกนิกจริง ไม่มีสารเคมี", date: "12 มี.ค. 2569", helpful: 18 },
  { id: "sr3", userName: "นุ่น", rating: 4, comment: "สินค้าดี แต่บางครั้งส่งช้าไปหน่อย", date: "10 มี.ค. 2569", helpful: 8 },
  { id: "sr4", userName: "วิชัย", rating: 5, comment: "ชาออร์แกนิกหอมมากครับ คุ้มค่าสุดๆ จะสั่งซ้ำแน่นอน", date: "8 มี.ค. 2569", helpful: 15 },
  { id: "sr5", userName: "มินนี่", rating: 4, comment: "แพ็คเกจสวย ให้เป็นของขวัญได้เลย ราคาดีด้วย", date: "5 มี.ค. 2569", helpful: 12 },
];

type ShopProduct = Product & { category: string };

const SHOP_PRODUCTS: ShopProduct[] = [
  { id: "sp1", name: "อบเชยเทศ Cinnamon Varum 150g", price: 199, originalPrice: 249, discountPercent: 20, rating: 4.8, sold: "1.2k", image: require("../../assets/products/catalog/product-37.jpg"), category: "ผลิตภัณฑ์สมุนไพร" },
  { id: "sp2", name: "ยาดมสมุนไพรเมต้าเฮิร์บ", price: 89, rating: 4.7, sold: "856", image: require("../../assets/products/catalog/product-10.jpg"), category: "ผลิตภัณฑ์สมุนไพร" },
  { id: "sp3", name: "ชามะลิอินทรีย์", price: 159, originalPrice: 199, discountPercent: 20, rating: 4.9, sold: "2.1k", image: require("../../assets/products/catalog/product-16.jpg"), category: "อาหารและเครื่องดื่ม" },
  { id: "sp4", name: "กาแฟอินทรีย์เมต้า", price: 220, rating: 4.6, sold: "640", image: require("../../assets/products/catalog/product-03.png"), category: "อาหารและเครื่องดื่ม" },
  { id: "sp5", name: "เลมอนซอฟต์เจล", price: 129, rating: 4.5, sold: "420", image: require("../../assets/products/catalog/product-01.png"), category: "ผลิตภัณฑ์สุขภาพ" },
  { id: "sp6", name: "ชุดของขวัญสมุนไพร", price: 399, originalPrice: 499, discountPercent: 20, rating: 4.9, sold: "320", image: require("../../assets/products/catalog/product-19.jpg"), category: "ชุดของชำร่วย/ของขวัญ" },
];

// Display order matches the web's category dropdown — same labels.
const CATEGORY_ORDER = [
  "ผลิตภัณฑ์สมุนไพร",
  "เครื่องหอม & อโรม่า",
  "อาหารและเครื่องดื่ม",
  "ผลิตภัณฑ์สุขภาพ",
  "วัตถุดิบสมุนไพร",
  "ชุดของชำร่วย/ของขวัญ",
];

type TabKey = "products" | "herbal" | "reviews";

export function ShopScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [following, setFollowing] = useState(false);
  const [showFollowToast, setShowFollowToast] = useState(false);
  const [tab, setTab] = useState<TabKey>("products");
  const [category, setCategory] = useState<string>("ทั้งหมด");
  const [sort, setSort] = useState<SortKey>("popular");
  const [search, setSearch] = useState("");
  // Herbal Market tab filters.
  const [herbalQuery, setHerbalQuery] = useState("");
  const [herbalCategory, setHerbalCategory] = useState<string>("ทั้งหมด");
  const [herbalSort, setHerbalSort] = useState<HerbalSortKey>("popular");

  // The native filter sheets hand their choices back via route params.
  const route = useRoute<RouteProp<RootStackParamList, "Shop">>();
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
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1600),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setShowFollowToast(false);
      });
    }
  };

  // Live followers count — visible system response to the user's action.
  const liveFollowers = SHOP.followers + (following ? 1 : 0);

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

  // Categories with counts derived from products (web pattern).
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    SHOP_PRODUCTS.forEach((p) => counts.set(p.category, (counts.get(p.category) || 0) + 1));
    // Only categories this shop actually stocks (drop empty ones).
    const ordered = CATEGORY_ORDER.map((name) => ({ name, count: counts.get(name) || 0 })).filter(
      (c) => c.count > 0,
    );
    return [{ name: "ทั้งหมด", count: SHOP_PRODUCTS.length }, ...ordered];
  }, []);

  // Herbal Market materials this shop supplies — only show the tab if it has any.
  const herbalMaterials = useMemo(() => MATERIALS.filter((m) => m.supplier === SHOP.name), []);
  const hasHerbal = herbalMaterials.length > 0;

  // Distinct material categories this shop stocks (for the herbal filter/chips).
  const herbalCategories = useMemo(
    () => ["ทั้งหมด", ...Array.from(new Set(herbalMaterials.map((m) => m.category)))],
    [herbalMaterials],
  );

  // Apply search + category + sort to the herbal materials (mirrors HerbalMarket).
  const filteredHerbal = useMemo(() => {
    const q = herbalQuery.trim().toLowerCase();
    let list = herbalMaterials.filter(
      (m) =>
        (herbalCategory === "ทั้งหมด" || m.category === herbalCategory) &&
        (q.length === 0 || m.name.toLowerCase().includes(q) || m.scientificName.toLowerCase().includes(q)),
    );
    if (herbalSort === "price_asc") list = [...list].sort((a, b) => a.pricePerKg - b.pricePerKg);
    else if (herbalSort === "price_desc") list = [...list].sort((a, b) => b.pricePerKg - a.pricePerKg);
    else if (herbalSort === "moq_asc") list = [...list].sort((a, b) => a.moq - b.moq);
    else list = [...list].sort((a, b) => b.rating - a.rating); // popular
    return list;
  }, [herbalMaterials, herbalQuery, herbalCategory, herbalSort]);

  // Apply category + search filter, then sort.
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = SHOP_PRODUCTS.filter((p) => {
      const inCategory = category === "ทั้งหมด" || p.category === category;
      const inSearch = !q || p.name.toLowerCase().includes(q);
      return inCategory && inSearch;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [category, search, sort]);

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
            <GlassIconButton accessibilityLabel="แชร์ร้านค้า">
              <Share2 size={18} color="#1a1a1a" strokeWidth={2.2} />
            </GlassIconButton>
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
            <Image source={SHOP.banner} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
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
              }}
            >
              <Text style={{ fontSize: 28, lineHeight: 34 }}>{SHOP.avatar}</Text>
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{ fontSize: 17, fontWeight: "700", color: "#0a0a0a", lineHeight: 22 }}
              >
                {SHOP.name}
              </Text>
              {SHOP.verified ? (
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
            {SHOP.description}
          </Text>

          {/* Meta row */}
          <View className="flex-row items-center flex-wrap" style={{ marginTop: 10, gap: 12 }}>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <MapPin size={12} color="#737373" />
              <Text style={{ fontSize: 11, color: "#737373" }}>{SHOP.location}</Text>
            </View>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <Clock size={12} color="#737373" />
              <Text style={{ fontSize: 11, color: "#737373" }}>
                เข้าร่วม {SHOP.joined}
              </Text>
            </View>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <MessageCircle size={12} color="#737373" />
              <Text style={{ fontSize: 11, color: "#737373" }}>
                ตอบ {SHOP.responseRate}%
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
            <Stat value={String(SHOP.rating)} label="คะแนน" highlight star />
            <Divider />
            <Stat
              value={formatNumber(liveFollowers)}
              label="ผู้ติดตาม"
              highlight={following}
            />
            <Divider />
            <Stat value={String(SHOP.totalProducts)} label="สินค้า" />
            <Divider />
            <Stat value={SHOP.totalSold} label="ยอดขาย" />
          </View>

        </View>

        {/* Tabs row — Products / [Herbal Market] / Reviews (Jakob's Law: same as web shop) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 16 }}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        >
          <TabPill
            active={tab === "products"}
            label="สินค้า"
            count={SHOP_PRODUCTS.length}
            Icon={Package}
            onPress={() => setTab("products")}
          />
          {hasHerbal ? (
            <TabPill
              active={tab === "herbal"}
              label="Herbal Market"
              count={herbalMaterials.length}
              Icon={Leaf}
              onPress={() => setTab("herbal")}
            />
          ) : null}
          <TabPill
            active={tab === "reviews"}
            label="รีวิวร้านค้า"
            count={REVIEWS.length}
            Icon={Star}
            badgeRed
            onPress={() => setTab("reviews")}
          />
        </ScrollView>

        {tab === "products" ? (
          <>
            {/* Search bar — white pill matching the other pages' header search */}
            <View
              className="flex-row items-center rounded-full px-4"
              style={{
                marginTop: 10,
                marginHorizontal: 12,
                height: 46,
                backgroundColor: "#ffffff",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Search size={18} color="#319754" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="ค้นหาสินค้าในร้านนี้"
                placeholderTextColor="#a3a3a3"
                returnKeyType="search"
                style={{ flex: 1, marginLeft: 10, fontSize: 13.5, color: "#374151" }}
              />
              {search ? (
                <Pressable onPress={() => setSearch("")} hitSlop={8} className="active:opacity-60">
                  <X size={16} color="#a3a3a3" />
                </Pressable>
              ) : null}
            </View>

            {/* Filter button (sort) + category chips — same language as the Products page */}
            <View className="flex-row items-center" style={{ marginTop: 14, gap: 10, paddingLeft: 12 }}>
              <Pressable
                onPress={() => nav.navigate("ShopSort", { current: sort, category, categories: categories.map((c) => c.name) })}
                hitSlop={6}
                accessibilityLabel="ตัวกรอง"
              >
                <GlassView
                  glassEffectStyle="regular"
                  colorScheme="light"
                  tintColor="rgba(255,255,255,0.45)"
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
            {/* Search bar — white pill matching the products tab */}
            <View
              className="flex-row items-center rounded-full px-4"
              style={{
                marginTop: 10,
                marginHorizontal: 12,
                height: 46,
                backgroundColor: "#ffffff",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Search size={18} color="#319754" />
              <TextInput
                value={herbalQuery}
                onChangeText={setHerbalQuery}
                placeholder="ค้นหาวัตถุดิบในร้านนี้"
                placeholderTextColor="#a3a3a3"
                returnKeyType="search"
                style={{ flex: 1, marginLeft: 10, fontSize: 13.5, color: "#374151" }}
              />
              {herbalQuery ? (
                <Pressable onPress={() => setHerbalQuery("")} hitSlop={8} className="active:opacity-60">
                  <X size={16} color="#a3a3a3" />
                </Pressable>
              ) : null}
            </View>

            {/* Filter button + material-category chips */}
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
                  tintColor="rgba(255,255,255,0.45)"
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
                subtitle="ลองเปลี่ยนหมวดหมู่หรือคำค้นหาดู"
              />
            ) : (
              <View className="flex-row flex-wrap" style={{ marginTop: 12, paddingHorizontal: 16, gap: 14 }}>
                {filteredHerbal.map((m) => (
                  <MaterialCard
                    key={m.id}
                    m={m}
                    width={(SCREEN_WIDTH - 16 * 2 - 14) / 2}
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
              shopRating={SHOP.rating}
              totalReviews={SHOP.totalReviews}
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
              ติดตามร้าน {SHOP.name} แล้ว
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function TabPill({
  active,
  label,
  count,
  Icon,
  badgeRed,
  onPress,
}: {
  active: boolean;
  label: string;
  count: number;
  Icon: typeof Package;
  badgeRed?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:opacity-80"
      style={{
        paddingLeft: 6,
        paddingRight: 14,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? "#319754" : "white",
        borderWidth: 1,
        borderColor: active ? "#319754" : "#e5e7eb",
        gap: 8,
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: active ? "rgba(255,255,255,0.22)" : "rgba(49,151,84,0.12)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={14} color={active ? "white" : "#319754"} strokeWidth={2.4} />
      </View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: active ? "600" : "500",
          color: active ? "white" : "#1d5b32",
        }}
      >
        {label}
      </Text>
      <View
        style={{
          minWidth: 22,
          height: 20,
          borderRadius: 10,
          paddingHorizontal: 6,
          backgroundColor: active
            ? "rgba(255,255,255,0.22)"
            : badgeRed
              ? "#ef4444"
              : "#f5f5f5",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: active ? "white" : badgeRed ? "white" : "#737373",
            includeFontPadding: false,
            lineHeight: 12,
          }}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
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

function ProductsGrid({ products }: { products: Product[] }) {
  // Match HomeScreen's 2-col grid (gap 12, horizontal padding 16) so card
  // dimensions are identical across screens.
  const cardWidth = (SCREEN_WIDTH - 16 * 2 - 12) / 2;

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
        <ProductCard key={p.id} product={p} width={cardWidth} />
      ))}
    </View>
  );
}

function ReviewsSection({
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
