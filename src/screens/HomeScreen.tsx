import { useEffect, useRef, useState, type ComponentType } from "react";
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
  ChevronRight,
  Search,
  ShoppingCart,
  Star,
  Eye,
  Play,
  Store,
  FlaskConical,
  BadgeCheck,
  Clock,
  Ban,
  Sparkles,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Product, ProductImage } from "../types/Product";
import type { RootStackParamList } from "../navigation/RootStack";
import { ProductCard } from "../components/ProductCard";
import { BottomFade } from "../components/BottomFade";
import { GlassIconButton } from "../components/GlassIconButton";
import { CountBadge } from "../components/CountBadge";
import { ARTICLES, VIDEOS, type Article, type VideoItem } from "../data/articles";
import { useFlashSaleProducts, useRecommendedProducts, usePromoProducts } from "../data/liveCatalog";
import { MATERIALS, type HerbalMaterial } from "./HerbalMarketScreen";
import { TRIAL_PRODUCTS, type TrialProduct } from "./TrialProductsScreen";
import { useCart } from "../context/CartContext";
import { useProductFilter, type KindFilter } from "../context/ProductFilterContext";
import { appWidth, gridColumns, gridCardWidth, isTablet, tabletSearchBarWidth } from "../theme/layout";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// appWidth: full window on native (tablet rails add columns via gridColumns);
// web stays capped to the 430 demo frame.
const SCREEN_WIDTH = appWidth();

type Category =
  | { label: string; image: number; color: string }
  | { label: string; Icon: ComponentType<{ size?: number; color?: string }>; color: string };

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

// Home rails now draw from the real METAHERB product samples (real names,
// prices, photos) ported from the web app — see src/data/realProducts.ts.
// Each rail is paged 2-per-page, so we cap at 6 items (3 pages).
// The three storefront rails now derive from the live catalog, so an owner
// toggling "แนะนำ" or running a discount changes what the customer sees.

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
            className="bg-[#e62e05] items-center justify-center"
            style={{ width: 30, paddingVertical: 4, borderRadius: 8 }}
          >
            <Text className="text-[15px] text-white font-semibold" style={{ includeFontPadding: false }}>{t}</Text>
          </View>
          {i < 2 && <Text className="text-[15px] text-black font-semibold">:</Text>}
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

/**
 * Generic horizontal pager with the animated dot indicator — the same UX as
 * the Flash Sale / Recommended product rows. Phones page 2 cards at a time
 * (the original design); tablets fit more columns per page via gridColumns so
 * the rails stay dense instead of stretching two giant cards. Used by the
 * product rails AND the ตลาดสมุนไพร / ผลิตภัณฑ์ทดสอบ teasers so paging feels
 * identical across the home page (Jakob's Law).
 */
const RAIL_PER_PAGE = gridColumns(190, HORIZONTAL_PADDING * 2, CARD_GAP);
function PagedPairs<T>({
  data,
  keyOf,
  renderCard,
}: {
  data: T[];
  keyOf: (item: T) => string;
  renderCard: (item: T, width: number) => React.ReactNode;
}) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const cardWidth = gridCardWidth(RAIL_PER_PAGE, HORIZONTAL_PADDING * 2, CARD_GAP);
  const pages = chunk(data, RAIL_PER_PAGE);

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
        {pages.map((page, pageIdx) => (
          <View
            key={`page-${pageIdx}`}
            style={{
              width: SCREEN_WIDTH,
              paddingHorizontal: HORIZONTAL_PADDING,
              flexDirection: "row",
              alignItems: "stretch",
              gap: CARD_GAP,
            }}
          >
            {page.map((it) => (
              <View key={keyOf(it)}>{renderCard(it, cardWidth)}</View>
            ))}
            {/* Pad the last page so remaining cards keep their column width */}
            {page.length < RAIL_PER_PAGE
              ? Array.from({ length: RAIL_PER_PAGE - page.length }).map((_, i) => (
                  <View key={`pad-${i}`} style={{ width: cardWidth }} />
                ))
              : null}
          </View>
        ))}
      </Animated.ScrollView>
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

function PagedProductList({ products }: { products: Product[] }) {
  return (
    <PagedPairs
      data={products}
      keyOf={(p) => p.id}
      renderCard={(p, w) => <ProductCard product={p} width={w} />}
    />
  );
}

/** One article per page, paging-snapped + animated dots — same swipe feel as
 *  the Flash Sale rail, but full-width cards (one at a time). */
function PagedArticles({
  articles,
  onOpen,
}: {
  articles: Article[];
  onOpen: (a: Article) => void;
}) {
  const scrollX = useRef(new Animated.Value(0)).current;
  // iPad shows two article cards per page; phones keep the single full-width row.
  const perPage = isTablet() ? 2 : 1;
  const pages = chunk(articles, perPage);
  const itemWidth = Math.floor((SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP * (perPage - 1)) / perPage);
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
        {pages.map((page, pageIdx) => (
          <View
            key={`article-page-${pageIdx}`}
            style={{ width: SCREEN_WIDTH, paddingHorizontal: HORIZONTAL_PADDING, flexDirection: "row", gap: CARD_GAP }}
          >
            {page.map((a) => (
              <View key={a.id} style={{ width: itemWidth }}>
                <ArticleRow a={a} onPress={() => onOpen(a)} />
              </View>
            ))}
            {page.length < perPage
              ? Array.from({ length: perPage - page.length }).map((_, i) => (
                  <View key={`pad-${i}`} style={{ width: itemWidth }} />
                ))
              : null}
          </View>
        ))}
      </Animated.ScrollView>
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
                style={{ height: 6, width, borderRadius: 3, backgroundColor }}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const AMBER = "#af6f08"; // articles accent (matches web blog cards)
// Uniform height for image-overlay tags (ลด / แนะนำ / คงเหลือ / เหลือ …) so they
// all line up at the same height across the home cards.
const OVERLAY_TAG_H = 22;

function MarketCard({ m, width, onPress }: { m: HerbalMaterial; width: number; onPress: () => void }) {
  // Synthetic "sold" — same formula the web uses for the home market card.
  const sold = Math.floor(m.stock * (m.rating / 5) * 0.45);
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-80"
      style={{ width, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden" }}
    >
      {/* Image — 4:3 like the web market card */}
      <View style={{ width: "100%", height: 176, backgroundColor: "#f3f4f6" }}>
        <Image source={m.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        {m.supplierVerified ? (
          <View
            style={{
              position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12,
              backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
              shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
            }}
          >
            <BadgeCheck size={15} color="#319754" />
          </View>
        ) : null}
        <View style={{ position: "absolute", left: 8, bottom: 8, height: OVERLAY_TAG_H, paddingHorizontal: 9, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600", lineHeight: 14, includeFontPadding: false }}>คงเหลือ {m.stock.toLocaleString()} กก.</Text>
        </View>
      </View>
      {/* Body */}
      <View style={{ padding: 12, gap: 8 }}>
        <View style={{ gap: 4 }}>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>{m.name}</Text>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#319754" }} />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: "#6b7280" }}>{m.supplier}</Text>
          </View>
        </View>
        {/* Price / MOQ panel */}
        <View className="flex-row items-end justify-between" style={{ backgroundColor: "#fafafa", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
          <View>
            <Text style={{ fontSize: 10, color: "#6b7280" }}>ราคา/กก.</Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#319754", lineHeight: 22 }}>฿{m.pricePerKg.toLocaleString()}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 10, color: "#6b7280" }}>MOQ</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }}>{m.moq} กก.</Text>
          </View>
        </View>
        {/* Rating + sold */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Star size={14} color="#f59e0b" fill="#f59e0b" strokeWidth={0} />
            <Text style={{ fontSize: 11, color: "#0a0a0a" }}>{m.rating}/5</Text>
          </View>
          <Text numberOfLines={1} style={{ fontSize: 10, color: "#6b7280" }}>ขายแล้ว {sold.toLocaleString()} กก.</Text>
        </View>
      </View>
    </Pressable>
  );
}

// Tier palette keyed by prior rating — same as the web TrialCard.
const TRIAL_TIER = {
  high: { bg: "#e6f5ec", bar: "#319754", text: "#1d5b32" },
  mid: { bg: "#fff0db", bar: "#f59e0b", text: "#92400e" },
  low: { bg: "#ffe0e0", bar: "#dc2626", text: "#991b1b" },
  new: { bg: "#e0eaf5", bar: "#6b7280", text: "#1e3a5f" },
} as const;

function TrialMiniCard({ p, width, onPress }: { p: TrialProduct; width: number; onPress: () => void }) {
  const spotsLeft = p.spotsTotal - p.spotsTaken;
  const seatsTakenPct = (p.spotsTaken / p.spotsTotal) * 100;
  const seatsFreePct = 100 - seatsTakenPct;
  const isClosed = spotsLeft <= 0 || p.endsInDays <= 0;
  const isUrgent = !isClosed && spotsLeft > 0 && spotsLeft <= 5;
  const isFirstBatch = p.prevAvgRating == null;
  const rating = p.prevAvgRating ?? 0;
  const tier = isFirstBatch ? "new" : rating >= 4 ? "high" : rating >= 3 ? "mid" : "low";
  const palette = TRIAL_TIER[tier];
  const satisfactionPct = isFirstBatch ? 0 : Math.round((rating / 5) * 100);

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-80"
      style={{ width, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#d4d4d4", overflow: "hidden", opacity: isClosed ? 0.7 : 1 }}
    >
      {/* Hero — tier-colored bg + image (own top radius so the image clips on iOS) */}
      <View style={{ width: "100%", height: 176, backgroundColor: palette.bg, borderTopLeftRadius: 15, borderTopRightRadius: 15, overflow: "hidden" }}>
        <Image source={p.imageSrc ?? { uri: p.image }} style={{ width: "100%", height: "100%", borderTopLeftRadius: 15, borderTopRightRadius: 15 }} resizeMode="cover" />
        {/* Top-left status badge — only meaningful states */}
        {isClosed ? (
          <View style={{ position: "absolute", left: 10, top: 10, height: OVERLAY_TAG_H, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(31,41,55,0.85)", borderRadius: 999, paddingHorizontal: 9 }}>
            <Ban size={12} color="#fff" strokeWidth={2.4} />
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600", lineHeight: 14, includeFontPadding: false }}>ปิดรับสมัคร</Text>
          </View>
        ) : isUrgent ? (
          <View style={{ position: "absolute", left: 10, top: 10, height: OVERLAY_TAG_H, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: palette.bar, borderRadius: 999, paddingHorizontal: 9 }}>
            <Sparkles size={12} color="#fff" strokeWidth={2.4} />
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600", lineHeight: 14, includeFontPadding: false }}>เหลือ {spotsLeft} ที่!</Text>
          </View>
        ) : null}
        {/* Bottom-left days-left badge */}
        {!isClosed ? (
          <View style={{ position: "absolute", left: 10, bottom: 10, height: OVERLAY_TAG_H, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 999, paddingHorizontal: 9 }}>
            <Clock size={12} color="#fff" strokeWidth={2.4} />
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600", lineHeight: 14, includeFontPadding: false }}>เหลือ {p.endsInDays} วัน</Text>
          </View>
        ) : null}
      </View>

      {/* Body */}
      <View style={{ padding: 12, gap: 8, flex: 1 }}>
        <View>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>{p.name}</Text>
          {p.studioName ? (
            <View className="flex-row items-center" style={{ gap: 6, marginTop: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#319754" }} />
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: "#6b7280" }}>{p.studioName}</Text>
            </View>
          ) : null}
        </View>

        <Text numberOfLines={2} style={{ fontSize: 12, color: "#4b5563", lineHeight: 17, minHeight: 34 }}>{p.tagline}</Text>

        {/* Rating block */}
        {isFirstBatch ? (
          <Text style={{ fontSize: 11, color: "#6b7280" }}>
            <Text style={{ color: palette.text, fontWeight: "700" }}>รุ่นแรก</Text> · ยังไม่มีคะแนน
          </Text>
        ) : (
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, color: "#f59e0b", fontWeight: "700" }}>★ {p.prevAvgRating!.toFixed(1)}</Text>
            <Text style={{ fontSize: 11, color: "#6b7280" }}>· {satisfactionPct}% พึงพอใจ</Text>
            <Text style={{ flex: 1, textAlign: "right", fontSize: 11, color: "#9ca3af" }}>({p.prevRatingCount})</Text>
          </View>
        )}

        {/* Seats block */}
        <View>
          <View className="flex-row items-center justify-between">
            <Text style={{ fontSize: 11, color: "#6b7280" }}>ที่นั่ง {p.spotsTaken}/{p.spotsTotal}</Text>
            {isUrgent ? (
              <Text style={{ fontSize: 11, color: palette.bar, fontWeight: "600" }}>เหลือ {spotsLeft} ที่นั่ง</Text>
            ) : (
              <Text style={{ fontSize: 11, color: "#6b7280" }}>{Math.round(seatsFreePct)}% ว่าง</Text>
            )}
          </View>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: "#f3f4f6", overflow: "hidden", marginTop: 6 }}>
            <View style={{ width: `${seatsTakenPct}%`, height: "100%", borderRadius: 3, backgroundColor: isUrgent ? palette.bar : "#9ca3af" }} />
          </View>
        </View>

        {/* CTA */}
        <Pressable
          onPress={onPress}
          disabled={isClosed}
          className="active:opacity-90"
          style={{ marginTop: 4, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: isClosed ? "#d1d5db" : isUrgent ? palette.bar : "#319754" }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
            {isClosed ? "ปิดรับสมัครแล้ว" : isUrgent ? `รับด่วน — เหลือ ${spotsLeft} ที่นั่ง!` : "ขอเข้าร่วมทดสอบ"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// Header notification / cart button — Liquid Glass (iOS 26) like the product
// detail screen, with a count badge pinned to the top-right corner.
function HeaderGlassButton({
  onPress,
  icon,
  count,
  accessibilityLabel,
}: {
  onPress: () => void;
  icon: React.ReactNode;
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

// Small dark overlay pill (views / date) — matches the สาระความรู้ article card.
function ArticleOverlayPill({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="flex-row items-center self-start"
      style={{ gap: 5, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}
    >
      {children}
    </View>
  );
}

// Article card styled to match the หน้าสาระความรู้ (Knowledge) blog cards:
// wide image on the left with views + date overlaid, content centered on the right.
function ArticleRow({ a, onPress }: { a: Article; onPress: () => void }) {
  // iPad — taller card + bigger cover so the artwork suits the wider layout.
  const tablet = isTablet();
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-90"
      style={{ flexDirection: "row", height: tablet ? 200 : 132, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#d4d4d4", overflow: "hidden" }}
    >
      {/* Image left with views (top) + date (bottom) overlay pills. */}
      <View style={{ width: tablet ? 175 : 130 }}>
        <Image source={{ uri: a.image }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
        <View style={{ flex: 1, justifyContent: "space-between", padding: 8 }}>
          <ArticleOverlayPill>
            <Eye size={11} color="#fff" />
            <Text style={{ fontSize: 10, color: "#fff" }}>{a.views.toLocaleString()}</Text>
          </ArticleOverlayPill>
          <ArticleOverlayPill>
            <Text style={{ fontSize: 10, color: "#fff" }}>{a.date}</Text>
          </ArticleOverlayPill>
        </View>
      </View>

      {/* Content right — title (1 line), desc (2-3 lines), อ่านเพิ่มเติม pinned bottom. */}
      <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: tablet ? 14 : 12 }}>
        <Text numberOfLines={tablet ? 2 : 1} style={{ fontSize: tablet ? 15 : 14, fontWeight: "600", color: "#0a0a0a", lineHeight: tablet ? 21 : 19 }}>{a.title}</Text>
        <Text numberOfLines={tablet ? 3 : 2} style={{ fontSize: tablet ? 12.5 : 12, color: "#525252", lineHeight: tablet ? 18 : 17, marginTop: 4 }}>{a.desc}</Text>
        <View
          className="flex-row items-center self-start"
          style={{ gap: 4, marginTop: "auto", backgroundColor: "rgba(175,111,8,0.1)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: AMBER }}>อ่านเพิ่มเติม</Text>
          <ChevronRight size={13} color={AMBER} strokeWidth={2.4} />
        </View>
      </View>
    </Pressable>
  );
}

// Video card matching the สาระความรู้ (Knowledge) video tab: 4:5 portrait tile,
// views pill top-left, full-width centered title at the bottom, center play button.
function VideoTile({ v, width, onPress }: { v: VideoItem; width: number; onPress: () => void }) {
  const height = Math.round((width * 5) / 4); // 4:5 portrait — same as Knowledge
  return (
    <Pressable onPress={onPress} className="active:opacity-90" style={{ width, height, borderRadius: 16, overflow: "hidden", backgroundColor: "#e5e5e5" }}>
      <Image source={{ uri: v.image }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
      <View style={{ flex: 1, justifyContent: "space-between", padding: 10 }}>
        <View className="flex-row items-center self-start" style={{ gap: 5, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Eye size={12} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 11 }}>{v.views}</Text>
        </View>
        <View style={{ backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text numberOfLines={1} style={{ color: "#fff", fontSize: 11, textAlign: "center" }}>{v.title}</Text>
        </View>
      </View>
      <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
          <Play size={20} color="#fff" fill="#fff" />
        </View>
      </View>
    </Pressable>
  );
}

/** Recommended videos — paged 2-per-page with dots, same swipe feel as the web. */
function PagedVideoList({ videos, onOpen }: { videos: VideoItem[]; onOpen: (v: VideoItem) => void }) {
  return (
    <PagedPairs
      data={videos}
      keyOf={(v) => String(v.id)}
      renderCard={(v, w) => <VideoTile v={v} width={w} onPress={() => onOpen(v)} />}
    />
  );
}

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { count: cartCount } = useCart();
  const filter = useProductFilter();
  const FLASH_SALE: Product[] = useFlashSaleProducts().slice(0, 6);
  const RECOMMENDED: Product[] = useRecommendedProducts().slice(0, 6);
  const PROMO: Product[] = usePromoProducts().slice(0, 6);
  // Products & Knowledge are no longer bottom tabs — push them as stack screens
  // from a section's "ดูทั้งหมด". Knowledge takes a tab param (articles/videos).
  // Open Products pre-filtered to the section's kind (all/flash/promo/recommended).
  const goProducts = (kind: KindFilter = "all") => {
    filter.setCat("all");
    filter.setKind(kind);
    nav.navigate("Products");
  };
  const goKnowledge = (tab: "articles" | "videos") =>
    nav.navigate("Knowledge", { tab });
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

  // Collapsible header: logo + wordmark row shrinks to 0 as user scrolls past ~60px.
  const HEADER_TOP_ROW_HEIGHT = 60;
  // The top row (logo + wordmark + bell/cart) is now persistent — only the
  // search bar below it hides/shows with scroll direction.

  // Direction-aware search row: collapse it when scrolling down (reading), bring
  // it back when scrolling up — and always show it near the top.
  const SEARCH_ROW_HEIGHT = 70; // paddingTop 14 + bar 44 + paddingBottom 12
  const searchVisible = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const searchTarget = useRef(1);
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const y = value;
      const prev = lastScrollY.current;
      lastScrollY.current = y;
      let target = searchTarget.current;
      if (y < 90) target = 1; // near the top → always visible
      else if (y - prev > 6) target = 0; // scrolling down → hide
      else if (prev - y > 6) target = 1; // scrolling up → show
      if (target !== searchTarget.current) {
        searchTarget.current = target;
        Animated.timing(searchVisible, { toValue: target, duration: 300, useNativeDriver: false }).start();
      }
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, searchVisible]);
  const searchRowHeight = searchVisible.interpolate({ inputRange: [0, 1], outputRange: [0, SEARCH_ROW_HEIGHT] });

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

        {/* Persistent top row — logo + wordmark + actions always visible */}
        <View>
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
            <View className={isTablet() ? "" : "flex-1"}>
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

            {/* Push the action buttons to the right on tablets (title lost
                its flex-1; the search floats centered as an overlay below). */}
            {isTablet() ? <View style={{ flex: 1 }} /> : null}

            {/* เมต้า AI — left of the bell */}
            <GlassIconButton
              onPress={() => nav.navigate("AIAssistant")}
              size={44}
              accessibilityLabel="ผู้ช่วย AI เมต้า"
            >
              <Sparkles size={20} color="#1a1a1a" />
            </GlassIconButton>

            {/* Bell — same x as search-row bell (paddingRight 18 matches) */}
            <HeaderGlassButton
              onPress={() => nav.navigate("Notification")}
              icon={<Bell size={20} color="#1a1a1a" />}
              count={3}
              accessibilityLabel="การแจ้งเตือน"
            />

            {/* Cart — same x as search-row cart */}
            <HeaderGlassButton
              onPress={() => nav.navigate("Cart")}
              icon={<ShoppingCart size={20} color="#1a1a1a" />}
              count={cartCount}
              accessibilityLabel="ตะกร้าสินค้า"
            />

            {/* iPad — search floats dead-center of the top row; phones keep
                the dedicated row below. */}
            {isTablet() ? (
              <View
                pointerEvents="box-none"
                style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
              >
                <View
                  className="flex-row items-center rounded-full px-4"
                  style={{
                    width: tabletSearchBarWidth(),
                    height: 42,
                    backgroundColor: "#ffffff",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                  }}
                >
                  <Search size={17} color="#319754" />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="ค้นหาสินค้า, สมุนไพร, ร้านค้า..."
                    placeholderTextColor="#a3a3a3"
                    returnKeyType="search"
                    style={{ flex: 1, marginLeft: 8, fontSize: 13, color: "#374151" }}
                  />
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* iPad — extra green breathing room under the header (the search row
            moved up into the top row, so give some space back). */}
        {isTablet() ? <View style={{ height: 28 }} /> : null}

        {/* Search row — full-width search bar that hides on scroll-down and
            returns on scroll-up. iPad puts the search in the top row instead. */}
        <Animated.View style={{ height: isTablet() ? 0 : searchRowHeight, opacity: searchVisible, overflow: "hidden" }}>
        <View
          style={{
            paddingLeft: 12,
            paddingRight: 12,
            paddingBottom: 12,
            paddingTop: 14,
          }}
        >
          {/* Search bar — full-width pill */}
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
              style={{ flex: 1, marginLeft: 8, fontSize: 13, color: "#374151" }}
            />
          </View>
        </View>
        </Animated.View>
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
          // Heights scale with width at the phone design's aspect ratios
          // (398×120 hero, 194×70 side) so bigger screens enlarge the banners
          // proportionally instead of cropping them thinner.
          const HERO_HEIGHT = Math.round((bannerInnerWidth * 120) / 398);
          const SIDE_HEIGHT = Math.round((((bannerInnerWidth - 10) / 2) * 70) / 194);
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

              {/* 2 side promo banners — bigger (2.2:1) below the hero */}
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
            to signal scrollability without an explicit hint. Tablets get
            larger tiles (bigger circle/icon/label) to match the wider canvas. */}
        {(() => {
          const tablet = isTablet();
          const ITEM_W = tablet ? 96 : 70;
          const CIRCLE = tablet ? 56 : 40;
          const ICON = tablet ? 34 : 26;
          const IMG = tablet ? 44 : 32;
          // Align the first circle's left edge at x=16 (slack = item padding
          // around the circle), matching the section headers above/below.
          const edgePad = Math.max(0, 16 - (ITEM_W - CIRCLE) / 2);
          return (
            <View style={{ paddingTop: 16, paddingBottom: 16 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: edgePad, paddingRight: edgePad, gap: 14 }}
                decelerationRate="fast"
              >
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.label}
                    className="items-center active:opacity-60"
                    // Width 70 + gap 14 → on a 390px screen 4 items fit fully and the
                    // 5th peeks ~50% off the right edge, giving a clear scroll cue.
                    style={{ width: ITEM_W, gap: 8 }}
                  >
                    <View
                      className="rounded-full items-center justify-center overflow-hidden"
                      style={{
                        width: CIRCLE,
                        height: CIRCLE,
                        backgroundColor: c.color + "1a",
                        borderWidth: 0.5,
                        borderColor: c.color + "33",
                      }}
                    >
                      {"image" in c ? (
                        <Image
                          source={c.image}
                          style={{ width: IMG, height: IMG }}
                          resizeMode="contain"
                        />
                      ) : (
                        <c.Icon size={ICON} color={c.color} />
                      )}
                    </View>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: tablet ? 12.5 : 11,
                        color: "#525252",
                        includeFontPadding: false,
                        lineHeight: tablet ? 18 : 16,
                        textAlign: "center",
                      }}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          );
        })()}

        {/* Recommended section (paged 2-per-page) */}
        <View className="mb-4 bg-white py-4">
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="แนะนำสำหรับคุณ" onSeeAll={() => goProducts("recommended")} />
          </View>
          <PagedProductList products={RECOMMENDED} />
        </View>

        {/* สินค้าโปรโมชั่น — discounted products (paged 2-per-page).
            Web order: Recommended → Promotion → Flash Sale. */}
        <View className="mb-4 bg-white py-4">
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="สินค้าโปรโมชั่น" onSeeAll={() => goProducts("promo")} />
          </View>
          <PagedProductList products={PROMO} />
        </View>

        {/* Flash Sale section — header is "Flash Sale" + live countdown +
            ดูทั้งหมด (matches the web home; not a separate gradient hero). */}
        <View className="mb-4 bg-white py-4">
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader
              title="Flash Sale"
              rightSlot={<FlashSaleCountdown />}
              onSeeAll={() => goProducts("flash")}
            />
          </View>
          <PagedProductList products={FLASH_SALE} />
        </View>

        {/* ตลาดสมุนไพร — B2B herbal materials teaser (paged 2-per-page) */}
        <View className="mb-4 bg-white py-4">
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[20px] text-black font-medium">ตลาดสมุนไพร</Text>
                <Text style={{ fontSize: 11, color: "#737373" }}>วัตถุดิบสมุนไพรคุณภาพสำหรับผู้ผลิต</Text>
              </View>
              <Pressable onPress={() => nav.navigate("HerbalMarket")} className="flex-row items-center" style={{ gap: 6 }}>
                <Text className="text-[12px] text-gray-500">ดูทั้งหมด</Text>
                <ChevronRight size={16} color="#6b7280" />
              </Pressable>
            </View>
          </View>
          <PagedPairs
            data={MATERIALS.slice(0, 6)}
            keyOf={(m) => m.id}
            renderCard={(m, w) => (
              <MarketCard m={m} width={w} onPress={() => nav.navigate("HerbalMarketDetail", { id: m.id })} />
            )}
          />
        </View>

        {/* ผลิตภัณฑ์ทดสอบ — free trial products teaser (paged 2-per-page) */}
        <View className="mb-4 bg-white py-4">
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                  <FlaskConical size={20} color="#319754" />
                </View>
                <View>
                  <Text className="text-[20px] text-black font-medium">ผลิตภัณฑ์ทดสอบ</Text>
                  <Text style={{ fontSize: 11, color: "#737373" }}>ทดลองสินค้าฟรี — แลกรีวิวสะสมแต้ม</Text>
                </View>
              </View>
              <Pressable onPress={() => nav.navigate("TrialProducts")} className="flex-row items-center" style={{ gap: 6 }}>
                <Text className="text-[12px] text-gray-500">ดูทั้งหมด</Text>
                <ChevronRight size={16} color="#6b7280" />
              </Pressable>
            </View>
          </View>
          <PagedPairs
            data={TRIAL_PRODUCTS}
            keyOf={(p) => p.id}
            renderCard={(p, w) => (
              <TrialMiniCard p={p} width={w} onPress={() => (nav.navigate as (r: string, params?: object) => void)("TrialDetail", { id: p.id })} />
            )}
          />
        </View>

        {/* บทความแนะนำ — recommended blog articles (paged carousel, 1 per page,
            swipeable like the Flash Sale rail) */}
        <View className="mb-4 bg-white py-4">
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="บทความแนะนำ" onSeeAll={() => goKnowledge("articles")} />
          </View>
          <PagedArticles
            articles={ARTICLES.slice(0, 5)}
            onOpen={(a) => nav.navigate("ArticleDetail", { article: a })}
          />
        </View>

        {/* วีดีโอแนะนำ — recommended videos (paged 2-per-page, like the web) */}
        <View className="mb-4 bg-white py-4">
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="วีดีโอแนะนำ" onSeeAll={() => goKnowledge("videos")} />
          </View>
          <PagedVideoList videos={VIDEOS} onOpen={() => goKnowledge("videos")} />
        </View>

        {/* Footer spacer — clears the floating Liquid Glass tab bar */}
        <View style={{ height: 104 }} />
      </Animated.ScrollView>
        {/* Black scroll-edge shade at the very bottom of the screen. */}
        <BottomFade />
      </View>
    </View>
  );
}
