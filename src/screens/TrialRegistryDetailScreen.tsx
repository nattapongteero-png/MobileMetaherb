/* =============================================================================
 *  TrialRegistryDetailScreen — owner "สินค้าทดลอง" detail page.
 *
 *  Composes the three tab components (ภาพรวม / ผู้ทดลอง / ข้อมูลสินค้า) under a
 *  shared header + green hero card + tab bar, ported 1:1 from the METAHERB web
 *  TrialDetailPage (../Metaherb/src/app/pages/owner/OwnerTrialTabs.tsx @ L2932).
 *
 *  RN translation notes (web is React-DOM):
 *    - div→View, p/span/h2→Text, img→Image, button→Pressable.
 *    - framer-motion active-tab pill → plain green-gradient View behind the label.
 *    - Sparkles HoverCard/Popover export menu → Alert.alert chooser (Excel / PDF).
 *    - Hero gradient + tab pill use expo-linear-gradient.
 *    - Hero KPI strip is inline label/value/sub groups split by thin vertical
 *      dividers (NO icons), matching the web "minimal inline labels" KPI strip.
 *    - takenReal / avgRating / review count are derived from
 *      getRegistrationsForTrial(product.id) EXACTLY like the web dashboard.
 *  ========================================================================== */

import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Pencil,
  Trash2,
  Download,
  BarChart3,
  Users,
  FileText,
  Store,
  Star,
  Sparkles,
  MoreHorizontal,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BottomFade } from "../components/BottomFade";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { AppleMenu, AppleMenuItem } from "../components/AppleMenu";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { TRIAL_PRODUCTS, type TrialProduct } from "./TrialProductsScreen";
import type { RootStackParamList } from "../navigation/RootStack";
import { TrialDetailOverview } from "./trialDetail/TrialDetailOverview";
import { TrialDetailApplicants } from "./trialDetail/TrialDetailApplicants";
import { TrialDetailInfo } from "./trialDetail/TrialDetailInfo";
import { getRegistrationsForTrial } from "../data/ownerTrialRegistrations";
import {
  BRAND_GREEN,
  BRAND_GREEN_DARK,
  DIVIDER_GRAY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Active tab pill — web: bg-gradient-to-br from-#3fb56b to-#267a43.
// Figma hero band green (node 8066:10951).
const FIG_GREEN = "#008e48";

const TABS = [
  { id: "overview", label: "ภาพรวม", Icon: BarChart3 },
  { id: "applicants", label: "ผู้ทดลอง", Icon: Users },
  { id: "info", label: "ข้อมูลสินค้า", Icon: FileText },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function TrialRegistryDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "TrialRegistryDetail">>();
  const id = route.params?.id;
  const product: TrialProduct = useMemo(
    () => TRIAL_PRODUCTS.find((p) => p.id === id) ?? TRIAL_PRODUCTS[0],
    [id],
  );
  const [tab, setTab] = useState<TabId>(route.params.initialTab ?? "overview");

  // Cohort — derived exactly like the web TrialDetailPage so the hero KPIs match
  // the dashboard. evaluated rows carry evaluatedAt; pending/rejected don't take
  // a seat (spotsTakenReal = applicants who are NOT rejected).
  const applicants = useMemo(
    () => getRegistrationsForTrial(product.id, product.category),
    [product.id, product.category],
  );
  const evaluated = useMemo(() => applicants.filter((r) => !!r.evaluatedAt), [applicants]);
  const avgRating = useMemo(
    () =>
      evaluated.length > 0
        ? evaluated.reduce((s, r) => s + (r.evaluation?.overall ?? 0), 0) / evaluated.length
        : 0,
    [evaluated],
  );
  const spotsTakenReal = useMemo(
    () => applicants.filter((r) => !r.rejectedAt).length,
    [applicants],
  );
  const spotsLeft = Math.max(0, product.spotsTotal - spotsTakenReal);

  const source = product.imageSrc ? product.imageSrc : { uri: product.image };

  const exportData = () =>
    Alert.alert("ส่งออกข้อมูล", `เลือกรูปแบบไฟล์สำหรับ "${product.name}"`, [
      { text: "Excel (.xlsx)", onPress: () => Alert.alert("ส่งออก Excel", product.name) },
      { text: "PDF (.pdf)", onPress: () => Alert.alert("ส่งออก PDF", product.name) },
      { text: "ยกเลิก", style: "cancel" },
    ]);
  const editProduct = () => nav.navigate("TrialAddProduct", { editId: product.id });
  const deleteProduct = () =>
    Alert.alert(
      "ลบสินค้าทดลอง",
      `ลบสินค้าทดลอง "${product.name}"?\nการลบจะนำคุณกลับไปที่ทะเบียนสินค้าทดลอง`,
      [
        {
          text: "ลบ",
          style: "destructive",
          onPress: () => {
            Alert.alert(`ลบ: ${product.name}`);
            nav.goBack();
          },
        },
        { text: "ยกเลิก", style: "cancel" },
      ],
    );

  // KPI tiles (Figma 8066:10882) — 3 stat chips. ความพึงพอใจ moved to the
  // rating badge on the avatar.
  const kpis = [
    { label: "คะแนนสะสม", value: `${product.rewardPoints}`, sub: "pts" },
    { label: "ที่นั่งเหลือ", value: `${spotsLeft}`, sub: "คน" },
    { label: "เวลาเหลือ", value: `${product.endsInDays}`, sub: "วัน" },
  ];
  const ratingText = avgRating > 0 ? avgRating.toFixed(1) : "—";
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      {/* Faint mint app bar (shared SubPageHeader) — back + title | ⋯ morph menu
          (same pattern as the coupon / promotion / product detail pages) */}
      <SubPageHeader
        title="สินค้าทดลอง"
        subtitle={product.name}
        onBack={() => nav.goBack()}
        showSearch={false}
        rightSlot={
          menuOpen ? (
            // The button "becomes" the menu — keep a spacer so the layout holds.
            <View style={{ width: 44, height: 44 }} />
          ) : (
            <GlassIconButton onPress={() => setMenuOpen(true)} accessibilityLabel="เพิ่มเติม">
              <MoreHorizontal size={20} color="#1a1a1a" strokeWidth={2.2} />
            </GlassIconButton>
          )
        }
      />

      <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          {/* ===== HERO CARD — all-green gradient box (web parity) ===== */}
          <View style={{ borderRadius: 24, marginTop: 12, overflow: "hidden" }}>
            {/* Green header band — web-parity gradient + Sparkles watermark,
                content keeps the mobile arrangement (avatar + badge | info) */}
            <LinearGradient
              colors={["#319754", "#287745", "#1d5b32"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 16,
                borderRadius: 24,
                overflow: "hidden",
              }}
            >
              <View pointerEvents="none" style={{ position: "absolute", top: -16, right: -16 }}>
                <Sparkles size={128} color="rgba(255,255,255,0.05)" strokeWidth={1.5} />
              </View>
              <View className="flex-row items-center" style={{ gap: 16 }}>
                {/* Round avatar + rating badge — sits fully inside the green band */}
                <View style={{ width: 88 }}>
                  <View
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 44,
                      borderWidth: 2,
                      borderColor: "rgba(255,255,255,0.3)",
                      backgroundColor: "rgba(255,255,255,0.2)",
                      overflow: "hidden",
                    }}
                  >
                    <Image source={source} style={{ width: "100%", height: "100%" }} resizeMode="cover"
          resizeMethod="resize" />
                  </View>
                  {/* rating badge — centered on the avatar's bottom edge */}
                  <View style={{ position: "absolute", left: 0, right: 0, bottom: -10, alignItems: "center" }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: "#fff",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        shadowColor: "#000",
                        shadowOpacity: 0.12,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 1 },
                        elevation: 2,
                      }}
                    >
                      <Star size={15} color="#f59e0b" fill="#f59e0b" strokeWidth={0} />
                      <Text style={{ fontSize: 14, fontWeight: "700", color: FIG_GREEN }}>{ratingText}</Text>
                    </View>
                  </View>
                </View>
                {/* category / title / store — centered against the avatar,
                    category as a translucent pill so the name reads first */}
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <View style={{ alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: "600", color: "#fff" }}>{product.category}</Text>
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "700", color: "#fff", lineHeight: 23 }}>
                    {product.name}
                  </Text>
                  <View className="flex-row items-center" style={{ gap: 5 }}>
                    <Store size={13} color="rgba(255,255,255,0.85)" strokeWidth={2.2} />
                    <Text numberOfLines={1} style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)" }}>{product.studioName || "METAHERB Store"}</Text>
                  </View>
                </View>
              </View>

              {/* เกี่ยวกับผลิตภัณฑ์ — tagline inside the green box (web hero) */}
              <Text style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", lineHeight: 18, marginTop: 14 }} numberOfLines={2}>
                {product.tagline}
              </Text>

              {/* KPI strip — inline label · value · sub with thin white dividers (web) */}
              <View className="flex-row items-center flex-wrap" style={{ columnGap: 14, rowGap: 6, marginTop: 12 }}>
                {kpis.map((k, i) => (
                  <View key={k.label} className="flex-row items-center" style={{ gap: 14 }}>
                    {i > 0 ? <View style={{ width: 1, height: 12, backgroundColor: "rgba(255,255,255,0.2)" }} /> : null}
                    <View className="flex-row items-baseline" style={{ gap: 5 }}>
                      <Text style={{ fontSize: 10, fontWeight: "500", color: "rgba(255,255,255,0.65)" }}>{k.label}</Text>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>{k.value}</Text>
                      <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.65)" }}>{k.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* ===== TABS NAV — white sliding-pill capsule on the green (web) ===== */}
              <View style={{ marginTop: 14 }}>
                <SegmentedTabs
                  tabs={TABS.map((t) => ({
                    id: t.id,
                    label: t.label,
                    count: t.id === "applicants" && applicants.length > 0 ? applicants.length : undefined,
                  }))}
                  active={tab}
                  onChange={setTab}
                />
              </View>
            </LinearGradient>
          </View>

          {/* ===== TAB CONTENT ===== */}
          {tab === "overview" ? <TrialDetailOverview product={product} /> : null}
          {tab === "applicants" ? <TrialDetailApplicants product={product} /> : null}
          {tab === "info" ? <TrialDetailInfo product={product} /> : null}
        </ScrollView>
        <BottomFade />
      </View>

      {/* App-bar ⋯ menu — iOS morph card (same as coupon/promotion detail) */}
      <AppleMenu visible={menuOpen} onClose={() => setMenuOpen(false)} anchorTop={insets.top + 6} menuHeight={160}>
        <AppleMenuItem label="แก้ไขข้อมูลสินค้า" Icon={Pencil} onPress={() => { setMenuOpen(false); editProduct(); }} />
        <AppleMenuItem label="ส่งออกข้อมูล" Icon={Download} onPress={() => { setMenuOpen(false); exportData(); }} />
        <AppleMenuItem label="ลบสินค้าทดลอง" Icon={Trash2} danger onPress={() => { setMenuOpen(false); deleteProduct(); }} />
      </AppleMenu>
    </View>
  );
}
