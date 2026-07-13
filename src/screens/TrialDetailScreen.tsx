import { GLASS_BAR_TINT, GLASS_CHIP_GREEN } from "../theme/tokens";
import { useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Animated, Dimensions, Modal, Platform, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Sparkles,
  Clock,
  Users,
  Coins,
  Check,
  FlaskConical,
  Store,
  MessageCircle,
  Heart,
  Send,
  TriangleAlert,
  BadgeCheck,
  ListChecks,
  Beaker,
  TrendingUp,
  Star,
  Lightbulb,
  ShieldCheck,
  X,
} from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { BottomFade } from "../components/BottomFade";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED, STAR_YELLOW } from "../theme/tokens";
import { TRIAL_PRODUCTS as TRIAL_CARDS, TrialProduct as TrialCard } from "./TrialProductsScreen";
import { ShopAvatar } from "../components/ShopAvatar";
import { appWidth, gridColumns, gridCardWidth, isTablet } from "../theme/layout";

/** Resolve a local bundled image (require → number) or remote URL string. */
function imgSource(src: number | string | undefined): any {
  return typeof src === "number" ? src : { uri: src };
}

const SCREEN_WIDTH =
  appWidth();
const SCREEN_HEIGHT = Dimensions.get("window").height;
// Hero height: square on phones (the original design); tablets shorten it so
// the photo doesn't swallow the whole screen — same treatment as ProductDetail.
const HERO_H = isTablet() ? Math.round(SCREEN_WIDTH * 0.75) : SCREEN_WIDTH;

const BG = "#fafafa";
const GREEN_TINT = "rgba(49,151,84,0.10)";
const GREEN_TINT_BORDER = "rgba(49,151,84,0.20)";
const GREEN_LEAF_BG = "#f0fdf4";
const GREEN_DEEP = "#1d5b32";

/* ===================================================================
   Mock data — ported verbatim from web TRIAL_PRODUCTS (trial-1 profile +
   related list). figma:asset images are swapped for remote Unsplash URLs.
   =================================================================== */
type DetailRow = { label: string; value: string };
type StudyStat = { label: string; value: string; sub?: string };
type Ingredient = { name: string; isActive?: boolean };
type CriteriaRating = { criterion: string; rating: number };
type ScheduleItem = { day: string; focus: string };

type TrialProduct = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  image: string;
  imageSrc?: number;
  images: (number | string)[];
  spotsTotal: number;
  spotsTaken: number;
  endsInDays: number;
  rewardPoints: number;
  studioName?: string;
  prevAvgRating?: number;
  prevRatingCount?: number;
  whatToTest: string[];
  detail?: {
    developerName?: string;
    longDescription?: string;
    productInfo?: DetailRow[];
    certifications?: string[];
    benefits?: string[];
    howToUse?: string[];
    warnings?: string[];
    studyStats?: StudyStat[];
    safetyTests?: string[];
    ingredients?: Ingredient[];
    prevCriteriaRatings?: CriteriaRating[];
    testSchedule?: ScheduleItem[];
  };
};

/* Rich trial content keyed by product id. Base fields (name, tagline, image,
   studio, seats, ratings) come from the canonical TRIAL_CARDS so the detail
   page always matches the card the user tapped. Only the deep "study" content
   lives here; the lead trial (trial-1) is fully populated, the rest reuse a
   shared default set of test criteria. */
const DEFAULT_WHAT_TO_TEST = [
  "ความประทับใจแรกเมื่อได้ลองใช้",
  "เนื้อสัมผัส กลิ่น และการใช้งานจริง",
  "ผลลัพธ์ที่สังเกตได้เทียบกับก่อนใช้",
  "ผลข้างเคียง / อาการแพ้ (ถ้ามี)",
  "Purchase Intent — คุณจะซื้อจริงไหม",
  "ความพึงพอใจโดยรวม และแนะนำให้คนอื่น (NPS)",
];

type TrialExtra = { whatToTest: string[]; detail?: TrialProduct["detail"] };

/** Owner trial detail (ข้อมูลสินค้า tab) reuses the same rich per-product content. */
export type TrialRichDetail = NonNullable<TrialProduct["detail"]>;
export const getTrialRichDetail = (id: string): TrialRichDetail | undefined => TRIAL_EXTRAS[id]?.detail;

const TRIAL_EXTRAS: Record<string, TrialExtra> = {
  "trial-1": {
    whatToTest: [
      "ระดับความชุ่มชื้นผิวตอนนี้",
      "ปัญหาผิวที่ต้องการแก้ไข",
      "ผิวชุ่มชื้นขึ้นเทียบกับก่อนใช้",
      "ผลข้างเคียง / อาการแพ้",
      "First Impression",
      "Purchase Intent — คุณจะซื้อจริงไหม",
      "ความพึงพอใจโดยรวม",
      "แนะนำให้คนอื่น (NPS)",
    ],
    detail: {
      developerName: "ดร. วรรณา สุขสม",
      longDescription:
        "ครีมบำรุงผิวสูตรอโรมา กลิ่นลาเวนเดอร์ ผ่อนคลาย บำรุงผิวให้นุ่มชุ่มชื้น เหมาะสำหรับทุกสภาพผิว",
      productInfo: [
        { label: "ชื่อสินค้า", value: "ครีมบำรุงผิวอโรมา (ลาเวนเดอร์)" },
        { label: "แบรนด์", value: "METAHERB Store" },
        { label: "ผู้พัฒนา", value: "ดร. วรรณา สุขสม" },
        { label: "ประเภท", value: "ครีมบำรุงผิว" },
        { label: "ปริมาณสุทธิ", value: "50 ml" },
        { label: "วันที่ผลิต", value: "มีนาคม 2569" },
        { label: "วันหมดอายุ", value: "มีนาคม 2571" },
        { label: "รหัส Batch", value: "HL-2569-03-V2" },
      ],
      certifications: [
        "GMP Certified",
        "อย. เลขที่ 10-1-6200xxxxx",
        "Dermatologist Tested",
        "Cruelty Free",
        "No Paraben",
      ],
      benefits: [
        "บำรุงผิวให้นุ่มชุ่มชื้นยาวนานตลอดวัน",
        "กลิ่นลาเวนเดอร์ช่วยผ่อนคลาย",
        "ต้านอนุมูลอิสระ ชะลอริ้วรอยก่อนวัย",
        "เนื้อครีมบางเบา ซึมเร็ว ไม่เหนียวเหนอะหนะ",
      ],
      howToUse: [
        "ทำความสะอาดผิวให้สะอาด ซับให้แห้ง",
        "ตักครีมปริมาณพอเหมาะ",
        "ทาให้ทั่วบริเวณที่ต้องการบำรุง",
        "นวดเบาๆ จนซึม ใช้เช้า–เย็น",
        "ใช้ต่อเนื่องเพื่อผลลัพธ์ที่ดีที่สุด",
      ],
      warnings: [
        "หากเกิดการระคายเคือง ผื่นแดง หยุดใช้ทันทีและติดต่อทีม MetaHerb",
        "หลีกเลี่ยงบริเวณรอบดวงตา",
        "ทดสอบบริเวณข้อพับแขนก่อนใช้หากผิวแพ้ง่าย",
        "เก็บในที่เย็น หลีกเลี่ยงแสงแดดโดยตรง",
      ],
      studyStats: [
        { label: "ขนาดกลุ่มทดสอบ (Lab)", value: "120 คน", sub: "ทดสอบ in-vitro + อาสาสมัคร" },
        { label: "ระยะเวลาศึกษา", value: "8 สัปดาห์", sub: "ก่อนเปิด Beta Testing" },
        { label: "อัตราการระคายเคือง", value: "1.2%", sub: "ต่ำกว่าเกณฑ์มาตรฐาน (5%)" },
        { label: "ความชุ่มชื้นเพิ่มขึ้น", value: "+34%", sub: "เทียบกับ placebo ใน 4 สัปดาห์" },
      ],
      safetyTests: [
        "Patch Test — ผ่าน ไม่พบการระคายเคืองในกลุ่มผิวปกติ",
        "Heavy Metal Test — ไม่พบสารโลหะหนักเกินมาตรฐาน",
        "Microbial Test — ผ่านมาตรฐาน USP ไม่พบเชื้อโรค",
        "ผิวแพ้ง่าย (Sensitive Skin) — แนะนำทดสอบบริเวณข้อพับแขนก่อนใช้ 24 ชม.",
      ],
      ingredients: [
        { name: "Lavender Oil", isActive: true },
        { name: "Niacinamide 3%", isActive: true },
        { name: "Hyaluronic Acid", isActive: true },
        { name: "Glycerin" },
        { name: "Aloe Vera Extract" },
        { name: "Centella Asiatica" },
        { name: "Aqua" },
      ],
      prevCriteriaRatings: [
        { criterion: "กลิ่น", rating: 4.5 },
        { criterion: "เนื้อสัมผัส", rating: 4.8 },
        { criterion: "ผลลัพธ์", rating: 4.4 },
        { criterion: "ระคายเคือง", rating: 4.9 },
      ],
      testSchedule: [
        { day: "วันที่ 1", focus: "ความประทับใจแรก กลิ่น เนื้อสัมผัส การซึมของครีม" },
        { day: "วันที่ 7", focus: "การระคายเคือง ความชุ่มชื้น ความเปลี่ยนแปลงเบื้องต้น" },
        { day: "วันที่ 12", focus: "ผลลัพธ์โดยรวม ความนุ่มชุ่มชื้น ความพึงพอใจสุดท้าย" },
      ],
    },
  },
};

/* ===================================================================
   Small presentational helpers (module scope — none wrap TextInput here).
   =================================================================== */
function SectionCard({
  icon,
  title,
  tone = "default",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone?: "default" | "warning";
  children: React.ReactNode;
}) {
  const warning = tone === "warning";
  return (
    <View
      style={{
        marginHorizontal: -16,
        backgroundColor: warning ? "#fffbeb" : "#fff",
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
    >
      <View className="flex-row items-center" style={{ gap: 10, marginBottom: 14 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: GREEN_TINT,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </View>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function StatCard({
  icon,
  label,
  children,
  amber,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  amber?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: amber ? "#fffbeb" : "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: amber ? "#fde68a" : "#e5e7eb",
        padding: 14,
      }}
    >
      <View className="flex-row items-center" style={{ gap: 5, marginBottom: 4 }}>
        {icon}
        <Text style={{ fontSize: 11, fontWeight: "600", color: amber ? "#b45309" : "#525252" }}>
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}

const REL_TIER = {
  high: { bg: "#e6f5ec", bar: BRAND_GREEN, text: "#1d5b32" },
  mid: { bg: "#fff0db", bar: "#f59e0b", text: "#92400e" },
  low: { bg: "#ffe0e0", bar: "#dc2626", text: "#991b1b" },
  new: { bg: "#e0eaf5", bar: "#6b7280", text: "#1e3a5f" },
};

// Recommended trial card — same design as the home trial cards (hero + status
// badges + name + studio + rating + seat bar + CTA).
function RelatedTrialCard({ p, onPress, width }: { p: TrialCard; onPress: () => void; width?: number }) {
  const spotsLeft = p.spotsTotal - p.spotsTaken;
  const seatsTakenPct = (p.spotsTaken / p.spotsTotal) * 100;
  const seatsFreePct = 100 - seatsTakenPct;
  const isClosed = spotsLeft <= 0 || p.endsInDays <= 0;
  const isUrgent = !isClosed && spotsLeft > 0 && spotsLeft <= 5;
  const isFirstBatch = p.prevAvgRating == null;
  const rating = p.prevAvgRating ?? 0;
  const tier = isFirstBatch ? "new" : rating >= 4 ? "high" : rating >= 3 ? "mid" : "low";
  const palette = REL_TIER[tier];
  const satisfactionPct = isFirstBatch ? 0 : Math.round((rating / 5) * 100);
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-80"
      style={{ width: width ?? 188, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#d4d4d4", overflow: "hidden", opacity: isClosed ? 0.7 : 1 }}
    >
      <View style={{ width: "100%", height: 130, backgroundColor: palette.bg, borderTopLeftRadius: 15, borderTopRightRadius: 15, overflow: "hidden" }}>
        <Image source={imgSource(p.imageSrc ?? p.image)} style={{ width: "100%", height: "100%", borderTopLeftRadius: 15, borderTopRightRadius: 15 }} resizeMode="cover"
          resizeMethod="resize" />
        {(isClosed || isUrgent) && (
          <View style={{ position: "absolute", left: 10, top: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: isClosed ? "rgba(31,41,55,0.85)" : palette.bar, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
            {isUrgent && <Sparkles size={12} color="#fff" strokeWidth={2.4} />}
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
              {isClosed ? "ปิดรับสมัคร" : `เหลือ ${spotsLeft} ที่!`}
            </Text>
          </View>
        )}
        {!isClosed && (
          <View style={{ position: "absolute", left: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Clock size={12} color="#fff" strokeWidth={2.4} />
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>เหลือ {p.endsInDays} วัน</Text>
          </View>
        )}
      </View>
      <View style={{ padding: 12, gap: 8 }}>
        <View>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>{p.name}</Text>
          {p.studioName ? (
            <View className="flex-row items-center" style={{ gap: 6, marginTop: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND_GREEN }} />
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: "#6b7280" }}>{p.studioName}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={2} style={{ fontSize: 12, color: "#4b5563", lineHeight: 17, minHeight: 34 }}>{p.tagline}</Text>
        {isFirstBatch ? (
          <Text style={{ fontSize: 11, color: "#6b7280" }}>
            <Text style={{ color: palette.text, fontWeight: "700" }}>รุ่นแรก</Text> · ยังไม่มีคะแนน
          </Text>
        ) : (
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, color: "#f59e0b", fontWeight: "700" }}>★ {rating.toFixed(1)}</Text>
            <Text style={{ fontSize: 11, color: "#6b7280" }}>· {satisfactionPct}% พึงพอใจ</Text>
          </View>
        )}
        <View>
          <View className="flex-row items-center justify-between">
            <Text style={{ fontSize: 11, color: "#6b7280" }}>ที่นั่ง {p.spotsTaken}/{p.spotsTotal}</Text>
            <Text style={{ fontSize: 11, color: isUrgent ? palette.bar : "#6b7280", fontWeight: isUrgent ? "600" : "400" }}>
              {isUrgent ? `เหลือ ${spotsLeft} ที่นั่ง` : `${Math.round(seatsFreePct)}% ว่าง`}
            </Text>
          </View>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: "#f3f4f6", overflow: "hidden", marginTop: 6 }}>
            <View style={{ width: `${seatsTakenPct}%`, height: "100%", borderRadius: 3, backgroundColor: isUrgent ? palette.bar : "#9ca3af" }} />
          </View>
        </View>
        <View style={{ marginTop: 2, height: 38, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: isClosed ? "#d1d5db" : isUrgent ? palette.bar : BRAND_GREEN }}>
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
            {isClosed ? "ปิดรับสมัครแล้ว" : "ขอเข้าร่วมทดสอบ"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// Recommended trials — paged 2-per-page with animated dots (same UX as the
// product page's "สินค้าเหมาะกับคุณ").
function RelatedTrialPager({ products, onOpen }: { products: TrialCard[]; onOpen: (id: string) => void }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const perPage = gridColumns(190, 32, 12);
  const cardWidth = gridCardWidth(perPage, 32, 12);
  const pages: TrialCard[][] = [];
  for (let i = 0; i < products.length; i += perPage) pages.push(products.slice(i, i + perPage));

  return (
    <View>
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {pages.map((pair, pi) => (
          <View key={`rt-${pi}`} style={{ width: SCREEN_WIDTH, paddingHorizontal: 16, flexDirection: "row", gap: 12 }}>
            {pair.map((p) => (
              <RelatedTrialCard key={p.id} p={p} width={cardWidth} onPress={() => onOpen(p.id)} />
            ))}
            {pair.length < perPage
              ? Array.from({ length: perPage - pair.length }).map((_, i) => (
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
            const backgroundColor = scrollX.interpolate({ inputRange, outputRange: ["#d4d4d4", BRAND_GREEN, "#d4d4d4"], extrapolate: "clamp" });
            return <Animated.View key={i} style={{ height: 6, width, borderRadius: 3, backgroundColor }} />;
          })}
        </View>
      ) : null}
    </View>
  );
}

export function TrialDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const params = (route.params ?? {}) as { id?: string };

  const product = useMemo<TrialProduct>(() => {
    const card = TRIAL_CARDS.find((p) => p.id === params.id) ?? TRIAL_CARDS[0];
    const extra = TRIAL_EXTRAS[card.id] ?? { whatToTest: DEFAULT_WHAT_TO_TEST };
    // One real photo per trial; repeat it so the hero stays swipeable (dots +
    // counter signal "you can slide"). Same shot per slide on purpose.
    const base: number | string | null = card.imageSrc ?? card.image ?? null;
    const images: (number | string)[] = base ? [base, base, base] : [];
    return {
      ...card,
      images,
      whatToTest: extra.whatToTest,
      detail: extra.detail,
    };
  }, [params.id]);
  const galleryImages = product.images;
  const [mainImage, setMainImage] = useState(0);

  // Product-detail-style hero: stretchy on pull-down, fade app bar + scrim on
  // scroll, tap to open the full-screen viewer.
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const galleryScrollX = useRef(new Animated.Value(0)).current;
  const heroScale = scrollY.interpolate({
    inputRange: [-HERO_H, 0],
    outputRange: [2, 1],
    extrapolateLeft: "extend",
    extrapolateRight: "clamp",
  });
  const heroTranslateY = scrollY.interpolate({
    inputRange: [-HERO_H, 0],
    outputRange: [-HERO_H / 2, 0],
    extrapolateLeft: "extend",
    extrapolateRight: "clamp",
  });
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [HERO_H * 0.35, HERO_H * 0.6],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const headerScrimOpacity = scrollY.interpolate({
    inputRange: [0, HERO_H * 0.5],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState(0);

  const relatedTrials = useMemo(
    () => TRIAL_CARDS.filter((p) => p.id !== product.id).slice(0, 4),
    [product.id]
  );

  const spotsLeft = product.spotsTotal - product.spotsTaken;
  const pct = (product.spotsTaken / product.spotsTotal) * 100;
  const isClosed = spotsLeft <= 0 || product.endsInDays <= 0;
  const d = product.detail;

  const baseInfo: DetailRow[] = [
    { label: "หมวดหมู่", value: product.category },
    { label: "ระยะเวลาทดสอบ", value: `${product.endsInDays} วัน` },
    { label: "ที่นั่งทั้งหมด", value: `${product.spotsTotal} ที่` },
    { label: "ที่นั่งคงเหลือ", value: isClosed ? "ปิดรับสมัคร" : `${spotsLeft} ที่` },
    { label: "รหัส Trial", value: product.id.toUpperCase() },
    { label: "คะแนนที่ได้รับ", value: `+${product.rewardPoints.toLocaleString()} คะแนน` },
  ];

  const progressColor = pct >= 90 ? "#dc2626" : pct >= 60 ? "#f59e0b" : BRAND_GREEN;

  const onJoin = () => {
    if (isClosed) return;
    (nav.navigate as (route: string, params?: object) => void)("TrialApply", { id: product.id });
  };

  const onShare = () => Alert.alert("แชร์", "คัดลอกลิงก์สินค้าทดลองแล้ว");
  const comingSoon = (what: string) => Alert.alert("กำลังพัฒนา", what);

  return (
    <View className="flex-1" style={{ backgroundColor: BG }}>
      <StatusBar style="dark" />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}
      >
        {/* Stretchy full-bleed hero — tap to open the full-screen viewer */}
        <Animated.View
          style={{
            marginHorizontal: -16,
            marginTop: -16,
            marginBottom: -14,
            width: SCREEN_WIDTH,
            height: HERO_H,
            backgroundColor: "#f3f4f6",
            transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
          }}
        >
          <Animated.FlatList
            data={galleryImages}
            keyExtractor={(_: unknown, i: number) => `g-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: galleryScrollX } } }],
              { useNativeDriver: false },
            )}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) =>
              setMainImage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
            }
            renderItem={({ item, index }: { item: string | number; index: number }) => (
              <Pressable
                onPress={() => {
                  setViewerStart(index);
                  setViewerOpen(true);
                }}
              >
                <Image source={imgSource(item)} style={{ width: SCREEN_WIDTH, height: HERO_H }} resizeMode="cover"
          resizeMethod="resize" />
              </Pressable>
            )}
          />
          {/* Dots indicator */}
          {galleryImages.length > 1 && (
            <View className="absolute left-0 right-0 flex-row items-center justify-center" style={{ bottom: 14, gap: 6 }} pointerEvents="none">
              {galleryImages.map((_, i) => {
                const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
                const w = galleryScrollX.interpolate({ inputRange, outputRange: [6, 18, 6], extrapolate: "clamp" });
                const backgroundColor = galleryScrollX.interpolate({
                  inputRange,
                  outputRange: ["rgba(255,255,255,0.6)", "#ffffff", "rgba(255,255,255,0.6)"],
                  extrapolate: "clamp",
                });
                return <Animated.View key={i} style={{ height: 6, width: w, borderRadius: 3, backgroundColor }} />;
              })}
            </View>
          )}
          {/* Image counter pill */}
          {galleryImages.length > 1 && (
            <View
              pointerEvents="none"
              style={{ position: "absolute", bottom: 14, right: 12, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600", lineHeight: 16 }}>
                {(mainImage % galleryImages.length) + 1} / {galleryImages.length}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Intro — name, meta + stats in one full-bleed white section */}
        <View style={{ marginHorizontal: -16, backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>
        {/* Name + meta */}
        <View style={{ gap: 10 }}>
          <View className="flex-row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: "#0088ff",
                paddingHorizontal: 10,
                paddingVertical: 2,
                borderRadius: 999,
              }}
            >
              <Sparkles size={12} color="#fff" strokeWidth={2.4} />
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>Beta</Text>
            </View>
            <View
              style={{
                backgroundColor: GREEN_TINT,
                paddingHorizontal: 10,
                paddingVertical: 2,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: GREEN_DEEP, fontSize: 11, fontWeight: "600" }}>{product.category}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 22, fontWeight: "700", color: "#1a1a1a", lineHeight: 28 }}>
            {product.name}
          </Text>

          <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22 }}>
            {d?.longDescription ?? product.tagline}
          </Text>
        </View>

        {/* Reward + Time + Spots */}
        <View className="flex-row" style={{ gap: 10 }}>
          <StatCard amber icon={<Coins size={14} color="#d97706" strokeWidth={2.4} />} label="คะแนนที่ได้">
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>
              +{product.rewardPoints.toLocaleString()}
            </Text>
          </StatCard>
          <StatCard icon={<Clock size={14} color={TEXT_SECONDARY} strokeWidth={2.4} />} label="เหลือเวลา">
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>
              {product.endsInDays}{" "}
              <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_MUTED }}>วัน</Text>
            </Text>
          </StatCard>
          <StatCard icon={<Users size={14} color={TEXT_SECONDARY} strokeWidth={2.4} />} label="ที่นั่ง">
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>
              {product.spotsTaken}
              <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_MUTED }}>
                /{product.spotsTotal}
              </Text>
            </Text>
            <View
              style={{
                height: 4,
                borderRadius: 999,
                backgroundColor: "#f3f4f6",
                overflow: "hidden",
                marginTop: 6,
              }}
            >
              <View
                style={{
                  height: "100%",
                  borderRadius: 999,
                  width: `${Math.min(100, pct)}%`,
                  backgroundColor: progressColor,
                }}
              />
            </View>
          </StatCard>
        </View>
        </View>

        {/* Conditions */}
        <View
          style={{
            marginHorizontal: -16,
            backgroundColor: GREEN_LEAF_BG,
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: GREEN_DEEP, marginBottom: 8 }}>
            เงื่อนไขการเข้าร่วม
          </Text>
          <View style={{ gap: 4 }}>
            {[
              "· METAHERB จะคัดเลือก tester และติดต่อกลับภายใน 2 วันทำการ",
              "· ส่งผลิตภัณฑ์ฟรี ไม่มีค่าใช้จ่าย — กรุณายืนยันที่อยู่ให้ถูกต้อง",
              "· สมัครได้ครั้งละ 1 รายการ — รายการถัดไปสมัครได้หลังส่งแบบประเมินครบ",
              `· ต้องส่งแบบประเมินผลการทดสอบภายใน 30 วัน เพื่อรับ +${product.rewardPoints.toLocaleString()} คะแนน`,
              "· คะแนนสามารถใช้แลกของรางวัล/ส่วนลดในระบบสมาชิกได้",
            ].map((c) => (
              <Text key={c} style={{ fontSize: 13, color: "#374151", lineHeight: 20 }}>
                {c}
              </Text>
            ))}
          </View>
        </View>


        {/* ===== ข้อมูลผลิตภัณฑ์ ===== */}
        <SectionCard icon={<FlaskConical size={20} color={BRAND_GREEN} strokeWidth={2.2} />} title="ข้อมูลผลิตภัณฑ์">
          <View>
            {(d?.productInfo ?? baseInfo).map((row) => (
              <View
                key={row.label}
                className="flex-row"
                style={{ gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}
              >
                <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_MUTED, width: 110 }}>
                  {row.label}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#1a1a1a", flex: 1 }}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* ===== มาตรฐานการผลิต ===== */}
        {d?.certifications && d.certifications.length > 0 && (
          <SectionCard icon={<BadgeCheck size={20} color={BRAND_GREEN} strokeWidth={2.2} />} title="มาตรฐานการผลิต">
            <View className="flex-row" style={{ flexWrap: "wrap", gap: 8 }}>
              {d.certifications.map((c) => (
                <View
                  key={c}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: GREEN_TINT,
                    borderWidth: 1,
                    borderColor: GREEN_TINT_BORDER,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                  }}
                >
                  <ShieldCheck size={14} color={GREEN_DEEP} strokeWidth={2.4} />
                  <Text style={{ fontSize: 12.5, fontWeight: "500", color: GREEN_DEEP }}>{c}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* ===== สรรพคุณ ===== */}
        {d?.benefits && d.benefits.length > 0 && (
          <SectionCard icon={<Lightbulb size={20} color={STAR_YELLOW} strokeWidth={2.2} />} title="สรรพคุณ">
            <View style={{ gap: 8 }}>
              {d.benefits.map((b) => (
                <View key={b} className="flex-row items-start" style={{ gap: 10 }}>
                  <Check size={16} color={BRAND_GREEN} strokeWidth={2.6} style={{ marginTop: 2 }} />
                  <Text style={{ fontSize: 14, color: "#1a1a1a", lineHeight: 22, flex: 1 }}>{b}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* ===== วิธีใช้ ===== */}
        {d?.howToUse && d.howToUse.length > 0 && (
          <SectionCard icon={<ListChecks size={20} color={BRAND_GREEN} strokeWidth={2.2} />} title="วิธีใช้">
            <View style={{ gap: 10 }}>
              {d.howToUse.map((step, i) => (
                <View key={step} className="flex-row items-start" style={{ gap: 12 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: BRAND_GREEN,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{i + 1}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: "#1a1a1a", lineHeight: 22, flex: 1, paddingTop: 1 }}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* ===== คำเตือน ===== */}
        {d?.warnings && d.warnings.length > 0 && (
          <SectionCard
            icon={<TriangleAlert size={20} color="#d97706" strokeWidth={2.2} />}
            title="คำเตือน"
            tone="warning"
          >
            <View style={{ gap: 8 }}>
              {d.warnings.map((w) => (
                <View key={w} className="flex-row items-start" style={{ gap: 10 }}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#f59e0b",
                      marginTop: 7,
                    }}
                  />
                  <Text style={{ fontSize: 13.5, color: "#78350f", lineHeight: 21, flex: 1 }}>{w}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* ===== ข้อมูลการศึกษาและความปลอดภัย ===== */}
        {(d?.studyStats || d?.safetyTests || d?.ingredients) && (
          <SectionCard
            icon={<Beaker size={20} color={BRAND_GREEN} strokeWidth={2.2} />}
            title="ข้อมูลการศึกษาและความปลอดภัย"
          >
            {d?.studyStats && d.studyStats.length > 0 && (
              <View style={{ gap: 10, marginBottom: 18 }}>
                {d.studyStats.map((s) => (
                  <View
                    key={s.label}
                    style={{
                      backgroundColor: GREEN_LEAF_BG,
                      borderWidth: 1,
                      borderColor: GREEN_TINT_BORDER,
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: "600", color: GREEN_DEEP, marginBottom: 4 }}>
                      {s.label}
                    </Text>
                    <Text style={{ fontSize: 22, fontWeight: "700", color: "#1a1a1a" }}>{s.value}</Text>
                    {s.sub && (
                      <Text style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 6 }}>{s.sub}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {d?.safetyTests && d.safetyTests.length > 0 && (
              <View style={{ marginBottom: 18 }}>
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#1a1a1a", marginBottom: 10 }}>
                  ผลการทดสอบความปลอดภัย
                </Text>
                <View style={{ gap: 8 }}>
                  {d.safetyTests.map((t) => (
                    <View key={t} className="flex-row items-start" style={{ gap: 10 }}>
                      <BadgeCheck size={16} color={BRAND_GREEN} strokeWidth={2.4} style={{ marginTop: 2 }} />
                      <Text style={{ fontSize: 13.5, color: "#374151", lineHeight: 21, flex: 1 }}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {d?.ingredients && d.ingredients.length > 0 && (
              <View>
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#1a1a1a", marginBottom: 10 }}>
                  ส่วนประกอบหลัก (Key Ingredients)
                </Text>
                <View className="flex-row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  {d.ingredients.map((ing) => (
                    <View
                      key={ing.name}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 999,
                        borderWidth: 1,
                        backgroundColor: ing.isActive ? GREEN_TINT : "#f9fafb",
                        borderColor: ing.isActive ? GREEN_TINT_BORDER : "#e5e7eb",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: ing.isActive ? "600" : "500",
                          color: ing.isActive ? GREEN_DEEP : "#374151",
                        }}
                      >
                        {ing.name}
                      </Text>
                    </View>
                  ))}
                </View>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND_GREEN }} />
                  <Text style={{ fontSize: 11, color: TEXT_MUTED }}>สีเขียว = สารออกฤทธิ์หลัก</Text>
                </View>
              </View>
            )}
          </SectionCard>
        )}

        {/* ===== ผลความพึงพอใจจากเทสเตอร์รุ่นก่อน ===== */}
        {product.prevAvgRating != null && (
          <SectionCard
            icon={<TrendingUp size={20} color={BRAND_GREEN} strokeWidth={2.2} />}
            title="ผลความพึงพอใจจากเทสเตอร์รุ่นก่อน"
          >
            <View style={{ gap: 18 }}>
              <View
                style={{
                  backgroundColor: GREEN_LEAF_BG,
                  borderWidth: 1,
                  borderColor: GREEN_TINT_BORDER,
                  borderRadius: 16,
                  padding: 20,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 44, fontWeight: "700", color: GREEN_DEEP, lineHeight: 46 }}>
                  {product.prevAvgRating.toFixed(1)}
                </Text>
                <Text style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 }}>จาก 5.0</Text>
                <View className="flex-row" style={{ gap: 2, marginVertical: 8 }}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = n <= Math.round(product.prevAvgRating ?? 0);
                    return (
                      <Star
                        key={n}
                        size={16}
                        color={filled ? STAR_YELLOW : "#d1d5db"}
                        fill={filled ? STAR_YELLOW : "transparent"}
                        strokeWidth={2}
                      />
                    );
                  })}
                </View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: BRAND_GREEN }}>
                  {Math.round((product.prevAvgRating / 5) * 100)}% พึงพอใจโดยรวม
                </Text>
                {product.prevRatingCount != null && (
                  <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>
                    จากเทสเตอร์ {product.prevRatingCount} คน รุ่น v1
                  </Text>
                )}
              </View>

              {d?.prevCriteriaRatings && d.prevCriteriaRatings.length > 0 && (
                <View style={{ gap: 12 }}>
                  {d.prevCriteriaRatings.map((c) => {
                    const barColor = c.rating >= 4 ? BRAND_GREEN : c.rating >= 3 ? "#f59e0b" : "#dc2626";
                    return (
                      <View key={c.criterion}>
                        <View className="flex-row items-center justify-between" style={{ marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: "500", color: "#1a1a1a" }}>
                            {c.criterion}
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: "#1a1a1a" }}>
                            {c.rating.toFixed(1)}
                          </Text>
                        </View>
                        <View
                          style={{
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: "#f3f4f6",
                            overflow: "hidden",
                          }}
                        >
                          <View
                            style={{
                              height: "100%",
                              borderRadius: 999,
                              width: `${(c.rating / 5) * 100}%`,
                              backgroundColor: barColor,
                            }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </SectionCard>
        )}

        {/* ===== สิ่งที่ต้องประเมิน ===== */}
        <SectionCard icon={<ListChecks size={20} color={BRAND_GREEN} strokeWidth={2.2} />} title="สิ่งที่ต้องประเมิน">
          {d?.testSchedule && d.testSchedule.length > 0 ? (
            <View style={{ gap: 12 }}>
              {d.testSchedule.map((s) => (
                <View
                  key={s.day}
                  className="flex-row"
                  style={{ gap: 12, padding: 12, backgroundColor: "#f9fafb", borderRadius: 12 }}
                >
                  <View
                    style={{
                      backgroundColor: GREEN_TINT,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 999,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: BRAND_GREEN }}>{s.day}</Text>
                  </View>
                  <Text style={{ fontSize: 13.5, color: "#1a1a1a", lineHeight: 21, flex: 1, paddingTop: 1 }}>
                    {s.focus}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              {product.whatToTest.map((w) => (
                <View key={w} className="flex-row items-start" style={{ gap: 8 }}>
                  <Check size={16} color={BRAND_GREEN} strokeWidth={2.6} style={{ marginTop: 2 }} />
                  <Text style={{ fontSize: 14, color: "#1a1a1a", flex: 1 }}>{w}</Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        {/* ===== Studio profile (same layout as the product page shop profile) ===== */}
        <View style={{ marginHorizontal: -16, backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 16 }}>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <ShopAvatar name={product.studioName} size={52} />
            <View className="flex-1">
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", lineHeight: 20 }}>
                {product.studioName ?? "METAHERB Store"}
              </Text>
              <View className="flex-row flex-wrap items-center" style={{ gap: 12, marginTop: 4 }}>
                <View className="flex-row items-center" style={{ gap: 4 }}>
                  <Users size={12} color="#737373" strokeWidth={2} />
                  <Text style={{ fontSize: 11, color: "#737373", lineHeight: 15 }}>
                    ผู้ร่วมทดสอบ <Text style={{ color: "#d97706", fontWeight: "700" }}>1,200+</Text>
                  </Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 4 }}>
                  <Heart size={12} color="#737373" strokeWidth={2} />
                  <Text style={{ fontSize: 11, color: "#737373", lineHeight: 15 }}>
                    คะแนนเฉลี่ย <Text style={{ color: "#0a0a0a", fontWeight: "700" }}>4.8/5</Text>
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              onPress={() => comingSoon("ดูสตูดิโอ")}
              className="active:opacity-70"
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}
            >
              <Store size={18} color="#319754" />
            </Pressable>
          </View>
        </View>

        {/* ===== Recommended trials — full-bleed paged carousel ===== */}
        <View style={{ marginHorizontal: -16, backgroundColor: "#fff", paddingVertical: 16, borderTopWidth: 1, borderColor: "#f0f0f0" }}>
          <View className="flex-row items-end justify-between" style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#000" }}>สินค้าทดลองแนะนำ</Text>
            <Pressable
              onPress={() => comingSoon("ดูสินค้าทดลองทั้งหมด")}
              hitSlop={8}
              className="flex-row items-center"
              style={{ gap: 4 }}
            >
              <Text style={{ fontSize: 12, color: TEXT_MUTED }}>ดูทั้งหมด</Text>
              <ChevronRight size={16} color={TEXT_MUTED} />
            </Pressable>
          </View>
          <RelatedTrialPager
            products={relatedTrials}
            onOpen={(id) => (nav as unknown as { push: (route: string, params?: object) => void }).push("TrialDetail", { id })}
          />
        </View>
      </Animated.ScrollView>

      {/* Dark scrim over the hero so the glass buttons stay legible */}
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 64, opacity: headerScrimOpacity }}
      >
        <LinearGradient colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]} style={{ flex: 1 }} />
      </Animated.View>

      {/* App-bar — white gradient that fades in on scroll */}
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 72, opacity: headerBgOpacity }}
      >
        <LinearGradient colors={["#ffffff", "rgba(255,255,255,0)"]} style={{ flex: 1 }} />
      </Animated.View>

      {/* Floating glass back + share */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }} pointerEvents="box-none">
          <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
          </GlassIconButton>
          <GlassIconButton onPress={onShare} accessibilityLabel="แชร์">
            <Share2 size={20} color="#1a1a1a" />
          </GlassIconButton>
        </View>
      </SafeAreaView>

      {/* Black scroll-edge shade at the very bottom of the screen. */}
      <BottomFade />

      {/* Floating Liquid Glass action sheet — เข้าร่วมทดลองใช้ */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 18 }}>
        <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            tintColor={GLASS_BAR_TINT}
            style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}
          >
            <Pressable hitSlop={6} className="active:opacity-70" onPress={() => (nav.navigate as (route: string, params?: object) => void)("Chat", { shopName: "เมต้าเฮิร์บ" })}>
              <GlassView glassEffectStyle="regular" colorScheme="light" tintColor={GLASS_CHIP_GREEN} isInteractive style={{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" }}>
                <MessageCircle size={22} color="#319754" />
              </GlassView>
            </Pressable>
            <Pressable
              onPress={onJoin}
              disabled={isClosed}
              className="flex-1 flex-row items-center justify-center active:opacity-80"
              style={{ height: 50, borderRadius: 999, backgroundColor: isClosed ? "#d1d5db" : BRAND_GREEN, gap: 8 }}
            >
              {!isClosed && <Send size={16} color="#fff" strokeWidth={2.4} />}
              <Text style={{ fontSize: 14, fontWeight: "700", color: isClosed ? "#6b7280" : "#fff" }}>
                {isClosed ? "ปิดรับสมัครแล้ว" : "เข้าร่วมทดลองใช้"}
              </Text>
            </Pressable>
          </GlassView>
        </View>
      </View>

      {/* Full-screen image viewer */}
      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: viewerStart * SCREEN_WIDTH, y: 0 }}>
            {galleryImages.map((img, i) => (
              <View key={`viewer-${i}`} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, alignItems: "center", justifyContent: "center" }}>
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
