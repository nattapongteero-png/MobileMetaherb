import { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  Image,
  Pressable,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { BrandHeader } from "../components/BrandHeader";
import {
  Star,
  RotateCcw,
  BadgeCheck,
  MapPin,
  Beaker,
} from "lucide-react-native";
import { appWidth, gridColumns, gridCardWidth } from "../theme/layout";
import {
  BRAND_GREEN,
  BRAND_GREEN_DARK,
  TEXT_SECONDARY,
  TEXT_MUTED,
  STAR_YELLOW,
} from "../theme/tokens";

// 2-column grid: full width minus 16px page padding each side minus the gap.
const HERBAL_GRID_GAP = 14;
// Responsive grid — 2 columns on phones, more on tablets (flex-wrap fills rows).
const HERBAL_CARD_WIDTH = gridCardWidth(gridColumns(190, 32, HERBAL_GRID_GAP), 32, HERBAL_GRID_GAP);

/* ===== Types (ported from web data/herbalMaterials.ts) ===== */
type MaterialCategory =
  | "ราก/หัว"
  | "ใบ"
  | "ดอก"
  | "เปลือก"
  | "ผล/เมล็ด"
  | "เห็ด"
  | "สมุนไพรรวม";
type MaterialGrade = "พรีเมียม" | "คัดสรร" | "มาตรฐาน" | "ทั่วไป" | "ประหยัด";

export interface HerbalMaterial {
  id: string;
  name: string;
  scientificName: string;
  category: MaterialCategory;
  image: number;
  pricePerKg: number;
  moq: number;
  stock: number;
  grade: MaterialGrade;
  supplier: string;
  supplierVerified: boolean;
  location: string;
  rating: number;
  certifications: string[];
}

// Bundled herbal-market photos (provided by the user). The 3 real photos drive
// the featured materials below; they're also cycled across the 8 slots the
// remaining materials index into.
const HERBAL_SAFFRON = require("../../assets/products/herbal/herbal-saffron.jpg");
const HERBAL_CINNAMON = require("../../assets/products/herbal/herbal-cinnamon.jpg");
const HERBAL_GINGER = require("../../assets/products/herbal/herbal-ginger.jpg");
const HERBAL_IMMUNITY = require("../../assets/products/herbal/herbal-immunity.jpg");
const HERBAL_LAVENDER = require("../../assets/products/herbal/herbal-lavender.jpg");
const HERBAL_BUTTERFLYPEA = require("../../assets/products/herbal/herbal-butterflypea.jpg");
const HERBAL_LEMON = require("../../assets/products/herbal/herbal-lemon.jpg");
const HERBAL_VANILLA = require("../../assets/products/herbal/herbal-vanilla.jpg");
// New batch of dedicated photos (user-provided).
const HERBAL_JASMINE = require("../../assets/products/herbal/herbal-jasmine.jpg");
const HERBAL_BLACKPEPPER = require("../../assets/products/herbal/herbal-blackpepper.jpg");
const HERBAL_GOJI = require("../../assets/products/herbal/herbal-goji.jpg");
const HERBAL_SHIITAKE = require("../../assets/products/herbal/herbal-shiitake.jpg");
const HERBAL_PUMPKINSEED = require("../../assets/products/herbal/herbal-pumpkinseed.jpg");
const HERBAL_JUJUBE = require("../../assets/products/herbal/herbal-jujube.jpg");
const HERBAL_STARANISE = require("../../assets/products/herbal/herbal-staranise.jpg");
const HERBAL_BAYLEAF = require("../../assets/products/herbal/herbal-bayleaf.jpg");
const HERBAL_BAEL = require("../../assets/products/herbal/herbal-bael.jpg");
const HERBAL_CHAMOMILE = require("../../assets/products/herbal/herbal-chamomile.jpg");
const HERBAL_GINSENG = require("../../assets/products/herbal/herbal-ginseng.jpg");
const HERBAL_FINGERROOT = require("../../assets/products/herbal/herbal-fingerroot.jpg");
const HERBAL_CACAO = require("../../assets/products/herbal/herbal-cacao.jpg");
const HERBAL_COFFEE = require("../../assets/products/herbal/herbal-coffee.jpg");
const MATERIAL_IMAGES: number[] = [
  HERBAL_GINGER,
  HERBAL_CINNAMON,
  HERBAL_SAFFRON,
  HERBAL_IMMUNITY,
  HERBAL_LAVENDER,
  HERBAL_BUTTERFLYPEA,
  HERBAL_LEMON,
  HERBAL_VANILLA,
];

/* MATERIALS — ported verbatim from web (exported so HomeScreen's
   "ตลาดสมุนไพร" teaser can reuse the same single source of truth) */
export const MATERIALS: HerbalMaterial[] = [
  // Featured materials with dedicated real photos (user-provided).
  { id: "m-saffron", name: "หญ้าฝรั่นอิหร่าน (Saffron)", scientificName: "Crocus sativus", category: "ดอก", image: HERBAL_SAFFRON, pricePerKg: 98000, moq: 1, stock: 18, grade: "พรีเมียม", supplier: "METAHERB Store", supplierVerified: true, location: "กรุงเทพฯ", rating: 5.0, certifications: ["อย.", "Import Grade A", "HACCP"] },
  { id: "m-cinnamon-ceylon", name: "อบเชยซีลอนแท่ง (Ceylon Cinnamon)", scientificName: "Cinnamomum verum", category: "เปลือก", image: HERBAL_CINNAMON, pricePerKg: 880, moq: 5, stock: 320, grade: "พรีเมียม", supplier: "บ้านสมุนไพรไทย", supplierVerified: true, location: "กรุงเทพฯ", rating: 4.9, certifications: ["อย.", "Organic Thailand", "HACCP"] },
  { id: "m-ginger-old", name: "ขิงแก่แห้ง (ฝานหนา)", scientificName: "Zingiber officinale", category: "ราก/หัว", image: HERBAL_GINGER, pricePerKg: 290, moq: 20, stock: 2600, grade: "พรีเมียม", supplier: "กรีนลีฟ ออร์แกนิก", supplierVerified: true, location: "ลำปาง", rating: 4.8, certifications: ["อย.", "GAP", "Organic Thailand"] },
  { id: "m-immunity-mix", name: "ชุดสมุนไพรเสริมภูมิรวม", scientificName: "Immunity Herbal Blend", category: "สมุนไพรรวม", image: HERBAL_IMMUNITY, pricePerKg: 1250, moq: 5, stock: 280, grade: "พรีเมียม", supplier: "METAHERB Store", supplierVerified: true, location: "กรุงเทพฯ", rating: 4.9, certifications: ["อย.", "ISO 22000", "HACCP"] },
  { id: "m-lavender", name: "ลาเวนเดอร์แห้ง (Lavender)", scientificName: "Lavandula angustifolia", category: "ดอก", image: HERBAL_LAVENDER, pricePerKg: 1600, moq: 3, stock: 150, grade: "พรีเมียม", supplier: "บ้านสมุนไพรไทย", supplierVerified: true, location: "นครปฐม", rating: 4.9, certifications: ["อย.", "Organic Thailand"] },
  { id: "m-butterflypea", name: "ดอกอัญชันแห้ง (เกรดส่งออก)", scientificName: "Clitoria ternatea", category: "ดอก", image: HERBAL_BUTTERFLYPEA, pricePerKg: 580, moq: 5, stock: 360, grade: "พรีเมียม", supplier: "กรีนลีฟ ออร์แกนิก", supplierVerified: true, location: "เชียงราย", rating: 4.8, certifications: ["อย.", "Organic Thailand", "ECOCERT"] },
  { id: "m-lemon-dried", name: "มะนาวอบแห้ง (ฝาน)", scientificName: "Citrus limon", category: "ผล/เมล็ด", image: HERBAL_LEMON, pricePerKg: 340, moq: 10, stock: 540, grade: "คัดสรร", supplier: "METAHERB Store", supplierVerified: true, location: "น่าน", rating: 4.6, certifications: ["อย.", "GAP"] },
  { id: "m-vanilla", name: "วานิลลาฝัก (Vanilla Beans)", scientificName: "Vanilla planifolia", category: "ผล/เมล็ด", image: HERBAL_VANILLA, pricePerKg: 42000, moq: 1, stock: 35, grade: "พรีเมียม", supplier: "บ้านสมุนไพรไทย", supplierVerified: true, location: "กรุงเทพฯ", rating: 4.9, certifications: ["อย.", "Import Grade A", "HACCP"] },
  // New batch (user-provided photos).
  { id: "m-jasmine", name: "ดอกมะลิตูมแห้ง (Jasmine Buds)", scientificName: "Jasminum sambac", category: "ดอก", image: HERBAL_JASMINE, pricePerKg: 1200, moq: 3, stock: 140, grade: "พรีเมียม", supplier: "กรีนลีฟ ออร์แกนิก", supplierVerified: true, location: "นครปฐม", rating: 4.8, certifications: ["อย.", "Organic Thailand"] },
  { id: "m-blackpepper", name: "พริกไทยดำเม็ด (Black Pepper)", scientificName: "Piper nigrum", category: "ผล/เมล็ด", image: HERBAL_BLACKPEPPER, pricePerKg: 420, moq: 10, stock: 980, grade: "คัดสรร", supplier: "METAHERB Store", supplierVerified: true, location: "จันทบุรี", rating: 4.7, certifications: ["อย.", "GAP"] },
  { id: "m-goji", name: "เก๋ากี้อบแห้ง (Goji Berry)", scientificName: "Lycium barbarum", category: "ผล/เมล็ด", image: HERBAL_GOJI, pricePerKg: 680, moq: 5, stock: 420, grade: "พรีเมียม", supplier: "บ้านสมุนไพรไทย", supplierVerified: true, location: "กรุงเทพฯ", rating: 4.8, certifications: ["อย.", "Import Grade A"] },
  { id: "m-shiitake", name: "เห็ดหอมแห้ง (Shiitake)", scientificName: "Lentinula edodes", category: "เห็ด", image: HERBAL_SHIITAKE, pricePerKg: 750, moq: 5, stock: 260, grade: "พรีเมียม", supplier: "กรีนลีฟ ออร์แกนิก", supplierVerified: true, location: "เชียงใหม่", rating: 4.7, certifications: ["อย.", "Organic Thailand"] },
  { id: "m-pumpkinseed", name: "เมล็ดฟักทองอบ (Pumpkin Seeds)", scientificName: "Cucurbita pepo", category: "ผล/เมล็ด", image: HERBAL_PUMPKINSEED, pricePerKg: 390, moq: 10, stock: 700, grade: "คัดสรร", supplier: "METAHERB Store", supplierVerified: true, location: "น่าน", rating: 4.6, certifications: ["อย.", "GAP"] },
  { id: "m-jujube", name: "พุทราจีนแห้ง (Red Jujube)", scientificName: "Ziziphus jujuba", category: "ผล/เมล็ด", image: HERBAL_JUJUBE, pricePerKg: 520, moq: 5, stock: 480, grade: "พรีเมียม", supplier: "บ้านสมุนไพรไทย", supplierVerified: true, location: "กรุงเทพฯ", rating: 4.8, certifications: ["อย.", "Import Grade A", "HACCP"] },
  { id: "m-staranise", name: "โป๊ยกั๊ก (Star Anise)", scientificName: "Illicium verum", category: "ผล/เมล็ด", image: HERBAL_STARANISE, pricePerKg: 640, moq: 5, stock: 350, grade: "พรีเมียม", supplier: "กรีนลีฟ ออร์แกนิก", supplierVerified: true, location: "กรุงเทพฯ", rating: 4.9, certifications: ["อย.", "HACCP"] },
  { id: "m-bayleaf", name: "ใบกระวานเทศแห้ง (Bay Leaf)", scientificName: "Laurus nobilis", category: "ใบ", image: HERBAL_BAYLEAF, pricePerKg: 560, moq: 5, stock: 300, grade: "คัดสรร", supplier: "METAHERB Store", supplierVerified: true, location: "นครปฐม", rating: 4.6, certifications: ["อย.", "Organic Thailand"] },
  { id: "m-bael", name: "มะตูมอบแห้ง (Bael Fruit)", scientificName: "Aegle marmelos", category: "ผล/เมล็ด", image: HERBAL_BAEL, pricePerKg: 320, moq: 10, stock: 620, grade: "คัดสรร", supplier: "บ้านสมุนไพรไทย", supplierVerified: true, location: "เชียงราย", rating: 4.7, certifications: ["อย.", "GAP"] },
  { id: "m-chamomile", name: "ดอกคาโมมายล์แห้ง (Chamomile)", scientificName: "Matricaria chamomilla", category: "ดอก", image: HERBAL_CHAMOMILE, pricePerKg: 1450, moq: 3, stock: 170, grade: "พรีเมียม", supplier: "กรีนลีฟ ออร์แกนิก", supplierVerified: true, location: "นครปฐม", rating: 4.9, certifications: ["อย.", "Organic Thailand", "ECOCERT"] },
  // Third batch (user-provided photos).
  { id: "m-ginseng", name: "โสมแห้ง (Ginseng Root)", scientificName: "Panax ginseng", category: "ราก/หัว", image: HERBAL_GINSENG, pricePerKg: 8800, moq: 1, stock: 60, grade: "พรีเมียม", supplier: "METAHERB Store", supplierVerified: true, location: "กรุงเทพฯ", rating: 4.9, certifications: ["อย.", "Import Grade A", "HACCP"] },
  { id: "m-fingerroot", name: "กระชายฝานแห้ง (Fingerroot)", scientificName: "Boesenbergia rotunda", category: "ราก/หัว", image: HERBAL_FINGERROOT, pricePerKg: 420, moq: 15, stock: 1100, grade: "คัดสรร", supplier: "บ้านสมุนไพรไทย", supplierVerified: true, location: "น่าน", rating: 4.7, certifications: ["อย.", "GAP"] },
  { id: "m-cacao", name: "เมล็ดคาเคา/ผงโกโก้ (Cacao)", scientificName: "Theobroma cacao", category: "ผล/เมล็ด", image: HERBAL_CACAO, pricePerKg: 760, moq: 5, stock: 340, grade: "พรีเมียม", supplier: "กรีนลีฟ ออร์แกนิก", supplierVerified: true, location: "จันทบุรี", rating: 4.8, certifications: ["อย.", "Organic Thailand"] },
  { id: "m-coffee", name: "เมล็ดกาแฟคั่ว (Roasted Coffee Beans)", scientificName: "Coffea arabica", category: "ผล/เมล็ด", image: HERBAL_COFFEE, pricePerKg: 540, moq: 5, stock: 880, grade: "คัดสรร", supplier: "METAHERB Store", supplierVerified: true, location: "เชียงราย", rating: 4.8, certifications: ["อย.", "GAP", "Organic Thailand"] },
];

const CATEGORIES: ("ทั้งหมด" | MaterialCategory)[] = [
  "ทั้งหมด",
  "ราก/หัว",
  "ใบ",
  "ดอก",
  "เปลือก",
  "ผล/เมล็ด",
  "เห็ด",
  "สมุนไพรรวม",
];

type SortKey = "popular" | "price_asc" | "price_desc" | "moq_asc";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "ยอดนิยม" },
  { key: "price_asc", label: "ราคาน้อย" },
  { key: "price_desc", label: "ราคามาก" },
  { key: "moq_asc", label: "MOQ น้อย" },
];

// Grade pill color — solid tones approximating the web's metallic gradients.
const GRADE_BG: Record<MaterialGrade, string> = {
  พรีเมียม: "#d97706",
  คัดสรร: "#64748b",
  มาตรฐาน: "#c2410c",
  ทั่วไป: "#10b981",
  ประหยัด: "#94a3b8",
};

/* ===== Module-scope sub-components (declared outside the screen) ===== */
function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        height: 36,
        paddingHorizontal: 16,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? BRAND_GREEN : "#fff",
        borderWidth: 1,
        borderColor: active ? BRAND_GREEN : "#ececed",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: active ? "700" : "400",
          color: active ? "#fff" : TEXT_SECONDARY,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function MaterialCard({
  m,
  onPress,
  width,
}: {
  m: HerbalMaterial;
  onPress: () => void;
  width?: number;
}) {
  // Synthetic sold count — same formula as web.
  const sold = Math.floor(m.stock * (m.rating / 5) * 0.45);
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-80"
      style={{
        width,
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#ececed",
        overflow: "hidden",
      }}
    >
      {/* Image */}
      <View style={{ width: "100%", height: 176, backgroundColor: "#f3f4f6" }}>
        <Image
          source={m.image}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
        {/* Verified */}
        {m.supplierVerified && (
          <View
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              backgroundColor: "#fff",
              borderRadius: 999,
              padding: 4,
            }}
          >
            <BadgeCheck size={16} color={BRAND_GREEN} fill={BRAND_GREEN} strokeWidth={2.5} stroke="#fff" />
          </View>
        )}
        {/* Stock pill */}
        <View
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            backgroundColor: "rgba(0,0,0,0.7)",
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 10, color: "#fff" }}>
            คงเหลือ {m.stock.toLocaleString()} กก.
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={{ padding: 12, gap: 8, flex: 1 }}>
        <View>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>
            {m.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND_GREEN }} />
            <Text style={{ flex: 1, fontSize: 11, color: TEXT_MUTED }} numberOfLines={1}>
              {m.supplier}
            </Text>
          </View>
        </View>

        {/* Price + MOQ */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            backgroundColor: "#fafafa",
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 7,
          }}
        >
          <View style={{ flexShrink: 1 }}>
            <Text style={{ fontSize: 10, color: TEXT_MUTED }}>ราคา/กก.</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: BRAND_GREEN }} numberOfLines={1}>
              ฿{m.pricePerKg.toLocaleString()}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 10, color: TEXT_MUTED }}>MOQ</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }}>
              {m.moq} กก.
            </Text>
          </View>
        </View>

        {/* Rating + sold */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Star size={13} color={STAR_YELLOW} fill={STAR_YELLOW} strokeWidth={0} />
            <Text style={{ fontSize: 11, fontWeight: "500", color: "#0a0a0a" }}>
              {m.rating}/5
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: TEXT_MUTED }} numberOfLines={1}>
            ขาย {sold.toLocaleString()} กก.
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ===== Screen ===== */
export function HerbalMarketScreen() {
  const nav = useNavigation();

  const scrollY = useRef(new Animated.Value(0)).current;
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<"ทั้งหมด" | MaterialCategory>("ทั้งหมด");
  const [sortBy, setSortBy] = useState<SortKey>("popular");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MATERIALS.filter(
      (m) =>
        (selectedCategory === "ทั้งหมด" || m.category === selectedCategory) &&
        (q.length === 0 ||
          m.name.toLowerCase().includes(q) ||
          m.scientificName.toLowerCase().includes(q))
    ).sort((a, b) => {
      if (sortBy === "price_asc") return a.pricePerKg - b.pricePerKg;
      if (sortBy === "price_desc") return b.pricePerKg - a.pricePerKg;
      if (sortBy === "moq_asc") return a.moq - b.moq;
      return b.rating - a.rating; // popular
    });
  }, [query, selectedCategory, sortBy]);

  const resetFilters = () => {
    setSelectedCategory("ทั้งหมด");
    setSortBy("popular");
  };

  const openMaterial = (id: string) => {
    (nav.navigate as (route: string, params?: object) => void)("HerbalMarketDetail", { id });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND_GREEN }}>
      <StatusBar style="light" />
      <BrandHeader
        title="Herbal Market"
        subtitle="ตลาดวัตถุดิบสมุนไพรขายส่ง"
        titleSize={20}
        showLogo={false}
        showBell
        showCart
        query={query}
        onChangeQuery={setQuery}
        onBell={() => (nav.navigate as (r: string) => void)("Notification")}
        onCart={() => (nav.navigate as (r: string) => void)("Cart")}
        searchPlaceholder="ค้นหาวัตถุดิบสมุนไพร..."
        scrollY={scrollY}
      />
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
        contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 14 }}
      >
        {/* Grid — 2 columns */}
        {filtered.length === 0 ? (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#ececed",
              paddingVertical: 56,
              alignItems: "center",
              gap: 12,
            }}
          >
            <Beaker size={48} color="#a3a3a3" strokeWidth={1.5} />
            <Text style={{ fontSize: 14, color: TEXT_MUTED }}>
              ไม่พบวัตถุดิบที่ตรงกับเงื่อนไข
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap" style={{ gap: HERBAL_GRID_GAP }}>
            {filtered.map((m) => (
              <MaterialCard key={m.id} m={m} width={HERBAL_CARD_WIDTH} onPress={() => openMaterial(m.id)} />
            ))}
          </View>
        )}

      </Animated.ScrollView>
      </View>
    </View>
  );
}
