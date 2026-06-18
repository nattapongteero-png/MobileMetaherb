import { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { BrandHeader } from "../components/BrandHeader";
import {
  Sparkles,
  Clock,
  Check,
  Ban,
  Coins,
  Pencil,
  RotateCcw,
  ChevronRight,
} from "lucide-react-native";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED, STAR_YELLOW } from "../theme/tokens";

/* ----------------------------------------------------------------------------
 * Data — ported verbatim from web src/app/data/trialProducts.ts
 * Local figma:asset images don't exist here, so trial imagery uses Unsplash.
 * -------------------------------------------------------------------------- */

// 2-column trial grid: full width minus 16px page padding each side minus the gap.
const TRIAL_GRID_GAP = 14;
const TRIAL_CARD_WIDTH = Math.floor(
  (Dimensions.get("window").width - 16 * 2 - TRIAL_GRID_GAP) / 2,
);

type ConcernKey = "cosmetic" | "health" | "aroma" | "food" | "equipment";

const TRIAL_CONCERNS: { key: ConcernKey; emoji: string; label: string }[] = [
  { key: "cosmetic", emoji: "💄", label: "เครื่องสำอาง" },
  { key: "health", emoji: "💊", label: "สุขภาพ / อาหารเสริม" },
  { key: "aroma", emoji: "🌸", label: "อโรมา / เครื่องหอม" },
  { key: "food", emoji: "🍵", label: "อาหาร / เครื่องดื่ม" },
  { key: "equipment", emoji: "🛠️", label: "อุปกรณ์ / เครื่องมือ" },
];

export type TrialProduct = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  image: string;
  /** Bundled local product photo — preferred over `image` when present. */
  imageSrc?: number;
  spotsTotal: number;
  spotsTaken: number;
  endsInDays: number;
  rewardPoints: number;
  studioName?: string;
  prevAvgRating?: number;
  prevRatingCount?: number;
  concerns?: ConcernKey[];
};

export const TRIAL_PRODUCTS: TrialProduct[] = [
  // Featured first — newest products with the nicest studio photos.
  {
    id: "trial-12",
    name: "ชาดอกคาเมลเลีย Camellia Flower Tea",
    tagline: "ชาดอกคาเมลเลียคัดดอกทั้งดอก กลิ่นหอมละมุน — ทดลองชิมก่อนวางขาย",
    category: "อาหาร / เครื่องดื่ม",
    image: "",
    imageSrc: require("../../assets/products/trial/trial-camellia-tea.jpg"),
    spotsTotal: 60,
    spotsTaken: 21,
    endsInDays: 16,
    rewardPoints: 240,
    concerns: ["food"],
    studioName: "METAHERB Store",
    prevAvgRating: 4.8,
    prevRatingCount: 18,
  },
  {
    id: "trial-13",
    name: "ครีมบำรุงผิว DEW Hydration Cream",
    tagline: "ครีมเติมน้ำให้ผิว เนื้อบางเบา ซึมไว ชุ่มชื้นยาวนาน — หาผู้ทดสอบผิวแห้ง",
    category: "เครื่องสำอาง",
    image: "",
    imageSrc: require("../../assets/products/trial/trial-dew-cream.jpg"),
    spotsTotal: 80,
    spotsTaken: 44,
    endsInDays: 11,
    rewardPoints: 280,
    concerns: ["cosmetic"],
    studioName: "บ้านสมุนไพรไทย",
    prevAvgRating: 4.7,
    prevRatingCount: 26,
  },
  {
    id: "trial-14",
    name: "ผงมัทฉะญี่ปุ่น Authentic Matcha",
    tagline: "ผงมัทฉะอุจิเกรดพรีเมียม บดละเอียด สีเขียวสด — ทดลองชงก่อนเปิดจำหน่าย",
    category: "อาหาร / เครื่องดื่ม",
    image: "",
    imageSrc: require("../../assets/products/trial/trial-matcha.jpg"),
    spotsTotal: 50,
    spotsTaken: 33,
    endsInDays: 8,
    rewardPoints: 300,
    concerns: ["food"],
    studioName: "กรีนลีฟ ออร์แกนิก",
    prevAvgRating: 4.9,
    prevRatingCount: 24,
  },
  {
    id: "trial-15",
    name: "โฟมล้างหน้า Nature's Cleanse",
    tagline: "โฟมล้างหน้าสูตรชาเขียว + แตงกวา + ว่านหางจระเข้ อ่อนโยน — หาผู้ทดสอบผิวบอบบาง",
    category: "เครื่องสำอาง",
    image: "",
    imageSrc: require("../../assets/products/trial/trial-facewash.jpg"),
    spotsTotal: 90,
    spotsTaken: 38,
    endsInDays: 20,
    rewardPoints: 200,
    concerns: ["cosmetic"],
    studioName: "METAHERB Store",
    prevAvgRating: 4.6,
    prevRatingCount: 29,
  },
  {
    id: "trial-1",
    name: "ครีมบำรุงผิวอโรมา (ลาเวนเดอร์)",
    tagline:
      "ครีมบำรุงผิวสูตรอโรมา กลิ่นลาเวนเดอร์ ผ่อนคลาย บำรุงผิวนุ่มชุ่มชื้น",
    category: "เครื่องสำอาง",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
    imageSrc: require("../../assets/products/trial/trial-cream-1.png"),
    spotsTotal: 50,
    spotsTaken: 32,
    endsInDays: 12,
    rewardPoints: 200,
    concerns: ["cosmetic"],
    studioName: "บ้านสมุนไพรไทย",
    prevAvgRating: 4.7,
    prevRatingCount: 32,
  },
  {
    id: "trial-2",
    name: "ครีมอาบน้ำอโรมา Shower Cream",
    tagline: "ครีมอาบน้ำสูตรอโรมา ไม่มีสบู่ pH สมดุล อ่อนโยนต่อผิว",
    category: "เครื่องสำอาง",
    image: "https://images.unsplash.com/photo-1610643625267-aee6dae3ca22?w=800&q=80",
    imageSrc: require("../../assets/products/trial/product-test1.png"),
    spotsTotal: 100,
    spotsTaken: 78,
    endsInDays: 7,
    rewardPoints: 150,
    concerns: ["food"],
    studioName: "กรีนลีฟ ออร์แกนิก",
    prevAvgRating: 4.2,
    prevRatingCount: 28,
  },
  {
    id: "trial-4",
    name: "แคปซูลฟ้าทะลายโจร Daily",
    tagline: "ปริมาณ andrographolide สูง — รับสมัครเฉพาะคนเป็นหวัดบ่อย",
    category: "สุขภาพ / อาหารเสริม",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    imageSrc: require("../../assets/products/trial/trial-capsule-1.png"),
    spotsTotal: 40,
    spotsTaken: 40,
    endsInDays: 0,
    rewardPoints: 250,
    concerns: ["health"],
    studioName: "METAHERB Store",
    prevAvgRating: 4.6,
    prevRatingCount: 41,
  },
  {
    id: "trial-6",
    name: "ครีมบำรุงผิวอโรมา (มะลิ-เลมอน)",
    tagline: "ครีมบำรุงผิวกลิ่นมะลิและเลมอน บำรุงผิวนุ่มชุ่มชื้น สดชื่น",
    category: "เครื่องสำอาง",
    image: "https://images.unsplash.com/photo-1645693091199-77a764e1ea16?w=800&q=80",
    imageSrc: require("../../assets/products/trial/trial-cream-2.png"),
    spotsTotal: 25,
    spotsTaken: 9,
    endsInDays: 30,
    rewardPoints: 350,
    concerns: ["aroma"],
    studioName: "บ้านสมุนไพรไทย",
  },
  {
    id: "trial-eq",
    name: "ยาสีฟันสมุนไพร Herbal Toothpaste",
    tagline:
      "ยาสีฟันสมุนไพร สูตรเย็นสดชื่น ลดกลิ่นปาก ดูแลเหงือกและฟัน",
    category: "เครื่องสำอาง",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80",
    imageSrc: require("../../assets/products/trial/product-test1-1.png"),
    spotsTotal: 20,
    spotsTaken: 12,
    endsInDays: 21,
    rewardPoints: 450,
    concerns: ["cosmetic"],
    studioName: "กรีนลีฟ ออร์แกนิก",
    prevAvgRating: 4.5,
    prevRatingCount: 8,
  },
  {
    id: "trial-3",
    name: "อาหารเสริมตรีผลา-มะขามป้อม",
    tagline: "แคปซูลสารสกัดตรีผลา + มะขามป้อม วิตามินซีสูง เสริมภูมิคุ้มกัน",
    category: "สุขภาพ / อาหารเสริม",
    image: "",
    imageSrc: require("../../assets/products/trial/trial-capsule-2.png"),
    spotsTotal: 60,
    spotsTaken: 24,
    endsInDays: 15,
    rewardPoints: 220,
    concerns: ["health"],
    studioName: "METAHERB Store",
    prevAvgRating: 4.4,
    prevRatingCount: 19,
  },
  {
    id: "trial-5",
    name: "แชมพูสมุนไพร Herbal Shampoo",
    tagline: "แชมพูสมุนไพร อ่อนโยน ลดผมร่วง บำรุงหนังศีรษะให้แข็งแรง",
    category: "เครื่องสำอาง",
    image: "",
    imageSrc: require("../../assets/products/trial/product-test1-2.png"),
    spotsTotal: 80,
    spotsTaken: 51,
    endsInDays: 9,
    rewardPoints: 120,
    concerns: ["cosmetic"],
    studioName: "บ้านสมุนไพรไทย",
    prevAvgRating: 4.3,
    prevRatingCount: 26,
  },
  {
    id: "trial-7",
    name: "ครีมบำรุงหน้าสมุนไพร Face Cream",
    tagline: "ครีมบำรุงผิวหน้าสมุนไพร ลดเลือนริ้วรอย ผิวกระจ่างใส",
    category: "เครื่องสำอาง",
    image: "",
    imageSrc: require("../../assets/products/trial/product-test1-3.png"),
    spotsTotal: 120,
    spotsTaken: 88,
    endsInDays: 5,
    rewardPoints: 180,
    concerns: ["cosmetic"],
    studioName: "กรีนลีฟ ออร์แกนิก",
    prevAvgRating: 4.6,
    prevRatingCount: 34,
  },
  {
    id: "trial-8",
    name: "สเปรย์น้ำตบสมุนไพร Facial Mist",
    tagline: "สเปรย์น้ำตบสมุนไพร เพิ่มความชุ่มชื้น สดชื่นทันที พกพาสะดวก",
    category: "เครื่องสำอาง",
    image: "",
    imageSrc: require("../../assets/products/trial/product-test1-4.png"),
    spotsTotal: 45,
    spotsTaken: 15,
    endsInDays: 18,
    rewardPoints: 300,
    concerns: ["cosmetic", "health"],
    studioName: "METAHERB Store",
    prevAvgRating: 4.7,
    prevRatingCount: 12,
  },
  {
    id: "trial-9",
    name: "เทียนหอมสมุนไพร Soy Candle",
    tagline: "เทียนถั่วเหลือง กลิ่นตะไคร้หอม + ลาเวนเดอร์ — ทดลองกลิ่นใหม่ก่อนวางขาย",
    category: "อโรมา / เครื่องหอม",
    image: "",
    imageSrc: require("../../assets/products/trial/trial-extra-1.png"),
    spotsTotal: 40,
    spotsTaken: 18,
    endsInDays: 14,
    rewardPoints: 260,
    concerns: ["aroma"],
    studioName: "บ้านสมุนไพรไทย",
    prevAvgRating: 4.6,
    prevRatingCount: 22,
  },
  {
    id: "trial-10",
    name: "ก้านไม้กระจายกลิ่น Reed Diffuser",
    tagline: "น้ำมันหอมระเหยสูตรอบเชย + ส้ม กระจายกลิ่นได้ 60 วัน — หาผู้ทดลองใช้ที่บ้าน",
    category: "อโรมา / เครื่องหอม",
    image: "",
    imageSrc: require("../../assets/products/trial/trial-extra-2.png"),
    spotsTotal: 35,
    spotsTaken: 11,
    endsInDays: 24,
    rewardPoints: 320,
    concerns: ["aroma"],
    studioName: "กรีนลีฟ ออร์แกนิก",
    prevAvgRating: 4.8,
    prevRatingCount: 16,
  },
  {
    id: "trial-11",
    name: "น้ำหอม Floral Bliss Eau de Parfum",
    tagline: "กลิ่นดอกไม้สดจากกุหลาบ + มะลิ สกัดธรรมชาติ — ทดลองก่อนเปิดตัวคอลเลกชันใหม่",
    category: "เครื่องสำอาง",
    image: "",
    imageSrc: require("../../assets/products/trial/trial-extra-3.png"),
    spotsTotal: 30,
    spotsTaken: 27,
    endsInDays: 4,
    rewardPoints: 400,
    concerns: ["cosmetic", "aroma"],
    studioName: "METAHERB Store",
    prevAvgRating: 4.9,
    prevRatingCount: 31,
  },
];

/* ----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

const URGENCY_RED = "#dc2626"; // used only for closed/urgent seat states

type Tier = "high" | "mid" | "low" | "new";

function tierFor(p: TrialProduct): Tier {
  if (p.prevAvgRating == null) return "new";
  if (p.prevAvgRating >= 4.0) return "high";
  if (p.prevAvgRating >= 3.0) return "mid";
  return "low";
}

const PALETTE: Record<Tier, { bg: string; bar: string; text: string }> = {
  high: { bg: "#e6f5ec", bar: BRAND_GREEN, text: "#1d5b32" },
  mid: { bg: "#fff0db", bar: "#f59e0b", text: "#92400e" },
  low: { bg: "#ffe0e0", bar: URGENCY_RED, text: "#991b1b" },
  new: { bg: "#e0eaf5", bar: "#6b7280", text: "#1e3a5f" },
};

/* ----------------------------------------------------------------------------
 * Module-scope sub-components
 * -------------------------------------------------------------------------- */

function KpiCard({
  label,
  value,
  amber = false,
}: {
  label: string;
  value: string;
  amber?: boolean;
}) {
  return (
    <View
      style={{
        flexBasis: "48%",
        flexGrow: 1,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.7)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.85)",
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontSize: 10.5, color: "#4b5563", lineHeight: 14 }}>{label}</Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          marginTop: 8,
          color: amber ? "#d97706" : "#1a1a1a",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function ConcernPill({
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
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        marginRight: 8,
        backgroundColor: active ? BRAND_GREEN : "#fff",
        borderColor: active ? BRAND_GREEN : "#e5e7eb",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: active ? "#fff" : "#374151",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function RadioRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 6,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: checked ? BRAND_GREEN : "#d1d5db",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: BRAND_GREEN,
            }}
          />
        )}
      </View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: checked ? "500" : "400",
          color: checked ? BRAND_GREEN : "#374151",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TrialCard({ p, onOpen, width }: { p: TrialProduct; onOpen: () => void; width?: number }) {
  const spotsLeft = p.spotsTotal - p.spotsTaken;
  const seatsTakenPct = (p.spotsTaken / p.spotsTotal) * 100;
  const seatsFreePct = 100 - seatsTakenPct;
  const isClosed = spotsLeft <= 0 || p.endsInDays <= 0;
  const isUrgent = !isClosed && spotsLeft > 0 && spotsLeft <= 5;
  const isFirstBatch = p.prevAvgRating == null;
  const tier = tierFor(p);
  const palette = PALETTE[tier];
  const satisfactionPct = isFirstBatch
    ? 0
    : Math.round(((p.prevAvgRating ?? 0) / 5) * 100);

  return (
    <Pressable
      onPress={onOpen}
      style={{
        width,
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#d4d4d4",
        overflow: "hidden",
        opacity: isClosed ? 0.75 : 1,
      }}
    >
      {/* Hero — fixed 176px tall to match the general ProductCard image area.
          Own top radius + overflow so the image clips to rounded corners on iOS
          (a parent's overflow:hidden alone won't clip a child with its own bg). */}
      <View
        style={{
          width: "100%",
          height: 176,
          backgroundColor: palette.bg,
          borderTopLeftRadius: 15,
          borderTopRightRadius: 15,
          overflow: "hidden",
        }}
      >
        <Image
          source={p.imageSrc ?? { uri: p.image }}
          style={{ width: "100%", height: "100%", borderTopLeftRadius: 15, borderTopRightRadius: 15 }}
          resizeMode="cover"
        />

        {/* Top-left status badge */}
        {(isClosed || isUrgent) && (
          <View style={{ position: "absolute", top: 12, left: 12 }}>
            {isClosed ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "rgba(31,41,55,0.85)",
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Ban size={12} color="#fff" strokeWidth={2.4} />
                <Text style={{ fontSize: 11, color: "#fff", fontWeight: "600" }}>
                  ปิดรับสมัคร
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: palette.bar,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Sparkles size={12} color="#fff" strokeWidth={2.4} />
                <Text style={{ fontSize: 11, color: "#fff", fontWeight: "600" }}>
                  เหลือ {spotsLeft} ที่!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Bottom-left days badge */}
        {!isClosed && (
          <View
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: "rgba(0,0,0,0.65)",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
            }}
          >
            <Clock size={12} color="#fff" strokeWidth={2.4} />
            <Text style={{ fontSize: 11, color: "#fff", fontWeight: "600" }}>
              เหลือ {p.endsInDays} วัน
            </Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={{ padding: 12, gap: 8, flex: 1 }}>
        <View>
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}
          >
            {p.name}
          </Text>
          {p.studioName ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 4,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: BRAND_GREEN,
                }}
              />
              <Text style={{ fontSize: 12, color: TEXT_MUTED }}>{p.studioName}</Text>
            </View>
          ) : null}
        </View>

        <Text
          numberOfLines={2}
          style={{ fontSize: 12, color: "#4b5563", lineHeight: 17, minHeight: 34 }}
        >
          {p.tagline}
        </Text>

        {/* Rating block */}
        {isFirstBatch ? (
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>
            <Text style={{ color: palette.text, fontWeight: "700" }}>รุ่นแรก</Text>
            {" · ยังไม่มีคะแนน"}
          </Text>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 12, color: STAR_YELLOW, fontWeight: "700" }}>
              ★ {p.prevAvgRating?.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 12, color: TEXT_MUTED }}>
              · {satisfactionPct}% พึงพอใจ
            </Text>
            <Text style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>
              ({p.prevRatingCount})
            </Text>
          </View>
        )}

        {/* Seats block */}
        <View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 11, color: TEXT_MUTED }}>
              ที่นั่ง {p.spotsTaken}/{p.spotsTotal}
            </Text>
            {isUrgent ? (
              <Text style={{ fontSize: 11, color: palette.bar, fontWeight: "600" }}>
                เหลือ {spotsLeft} ที่นั่ง
              </Text>
            ) : (
              <Text style={{ fontSize: 11, color: TEXT_MUTED }}>
                {Math.round(seatsFreePct)}% ว่าง
              </Text>
            )}
          </View>
          <View
            style={{
              height: 5,
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
                width: `${seatsTakenPct}%`,
                backgroundColor: isUrgent ? palette.bar : "#9ca3af",
              }}
            />
          </View>
        </View>

        {/* CTA */}
        <Pressable
          onPress={onOpen}
          disabled={isClosed}
          style={{
            marginTop: 4,
            height: 40,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isClosed
              ? "#d1d5db"
              : isUrgent
              ? palette.bar
              : BRAND_GREEN,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
            {isClosed
              ? "ปิดรับสมัครแล้ว"
              : isUrgent
              ? `รับด่วน — เหลือ ${spotsLeft} ที่นั่ง!`
              : "ขอเข้าร่วมทดสอบ"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

/* ----------------------------------------------------------------------------
 * Screen
 * -------------------------------------------------------------------------- */

const CARD_STYLE = {
  backgroundColor: "#fff",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#ececed",
  padding: 16,
} as const;

export function TrialProductsScreen() {
  const nav = useNavigation();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [query, setQuery] = useState("");
  const [concernFilter, setConcernFilter] = useState<ConcernKey | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "joined" | "needsEval">("all");

  // No persisted registrations on mobile mock — tester not registered by default.
  const testerRegistered = false;

  const filteredTrials = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRIAL_PRODUCTS.filter((p) => {
      if (q.length > 0 && !p.name.toLowerCase().includes(q)) return false;
      if (concernFilter !== "all" && !p.concerns?.includes(concernFilter))
        return false;
      // joined / needsEval would filter by registration; no data on mock → empty.
      if (typeFilter !== "all") return false;
      return true;
    });
  }, [query, concernFilter, typeFilter]);

  const resetFilters = () => {
    setConcernFilter("all");
    setTypeFilter("all");
  };

  // Platform-level KPI strip (ported from the web hero)
  const openCount = TRIAL_PRODUCTS.filter(
    (p) => p.spotsTotal - p.spotsTaken > 0 && p.endsInDays > 0
  ).length;
  const quotaTotal = TRIAL_PRODUCTS.reduce((s, p) => s + p.spotsTotal, 0);
  const appliedTotal = TRIAL_PRODUCTS.reduce((s, p) => s + p.spotsTaken, 0);
  const pointsTotal = TRIAL_PRODUCTS.reduce((s, p) => s + p.rewardPoints, 0);

  const openTrial = (id: string) =>
    (nav.navigate as (route: string, params?: object) => void)("TrialDetail", { id });

  const typeOptions: { key: typeof typeFilter; label: string }[] = [
    { key: "all", label: "ทั้งหมด" },
    { key: "joined", label: "สินค้าที่เข้าร่วมทดสอบ" },
    { key: "needsEval", label: "สินค้าที่ต้องทำแบบทดสอบ" },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND_GREEN }}>
      <StatusBar style="light" />
      <BrandHeader
        title="ผลิตภัณฑ์ทดสอบ"
        subtitle="ทดลองใช้ฟรี ก่อนวางขายจริง"
        titleSize={20}
        showLogo={false}
        showBell
        showCart
        query={query}
        onChangeQuery={setQuery}
        onBell={() => (nav.navigate as (r: string) => void)("Notification")}
        onCart={() => (nav.navigate as (r: string) => void)("Cart")}
        searchPlaceholder="ค้นหาสินค้าทดลอง..."
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
        {/* Hero — green tint header + KPI strip */}
        <View
          style={{
            backgroundColor: "#eaf3ee",
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 18,
            gap: 14,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <KpiCard label="ผลิตภัณฑ์ที่เปิดรับ" value={openCount.toLocaleString()} />
            <KpiCard label="โควตาผู้ทดสอบ" value={quotaTotal.toLocaleString()} />
            <KpiCard label="ผู้สมัครเข้าร่วม" value={appliedTotal.toLocaleString()} />
            <KpiCard
              label="คะแนนสะสมรวม"
              value={`${pointsTotal.toLocaleString()} pts`}
              amber
            />
          </View>
        </View>

        {/* Trial grid — 2 columns */}
        {filteredTrials.length === 0 ? (
          <View
            style={{
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#d4d4d4",
              borderStyle: "dashed",
              borderRadius: 16,
              paddingVertical: 48,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, color: TEXT_MUTED }}>
              ไม่พบสินค้าทดลองในหมวดนี้
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap" style={{ gap: TRIAL_GRID_GAP }}>
            {filteredTrials.map((p) => (
              <TrialCard key={p.id} p={p} width={TRIAL_CARD_WIDTH} onOpen={() => openTrial(p.id)} />
            ))}
          </View>
        )}
      </Animated.ScrollView>
      </View>
    </View>
  );
}
