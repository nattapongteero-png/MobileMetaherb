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
import { LinearGradient } from "expo-linear-gradient";
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
  MoreVertical,
} from "lucide-react-native";
import { BottomFade } from "../components/BottomFade";
import { BottomSheet } from "../components/BottomSheet";
import { SubPageHeader } from "../components/SubPageHeader";
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
const TAB_FROM = "#3fb56b";
const TAB_TO = "#267a43";
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
  const [tab, setTab] = useState<TabId>("overview");

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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      {/* Faint mint app bar (shared SubPageHeader) — back + title | edit / delete / export */}
      <SubPageHeader
        title="สินค้าทดลอง"
        subtitle={product.name}
        onBack={() => nav.goBack()}
        showSearch={false}
        rightSlot={
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="เมนู"
            hitSlop={6}
            className="items-center justify-center active:opacity-80"
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", borderWidth: 1, borderColor: DIVIDER_GRAY }}
          >
            <MoreVertical size={18} color={TEXT_SECONDARY} strokeWidth={2.4} />
          </Pressable>
        }
      />

      <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          {/* ===== HERO CARD (Figma 8066:10951) ===== */}
          <View style={{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: "#f0f0f0", marginTop: 12, overflow: "visible" }}>
            {/* Green header band — round avatar + rating badge | category / title / store */}
            <View
              style={{
                backgroundColor: FIG_GREEN,
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 16,
                borderRadius: 24,
              }}
            >
              <View className="flex-row items-start" style={{ gap: 16 }}>
                {/* Round avatar + rating badge — pops above the band top edge (Figma) */}
                <View style={{ width: 88, marginTop: -24 }}>
                  <View
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 44,
                      borderWidth: 2,
                      borderColor: FIG_GREEN,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      overflow: "hidden",
                    }}
                  >
                    <Image source={source} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  </View>
                  {/* rating badge — overlaps avatar bottom-left */}
                  <View
                    style={{
                      position: "absolute",
                      left: 4,
                      bottom: -10,
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
                    <Text style={{ fontSize: 14, fontWeight: "700", color: FIG_GREEN }}>
                      {ratingText}
                      <Text style={{ fontSize: 12, fontWeight: "400", color: FIG_GREEN }}> ({evaluated.length})</Text>
                    </Text>
                  </View>
                </View>
                {/* category / title / store */}
                <View style={{ flex: 1, minWidth: 0, gap: 4, paddingTop: 2 }}>
                  <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>{product.category}</Text>
                  <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: "700", color: "#fff", lineHeight: 19 }}>
                    {product.name}
                  </Text>
                  <View className="flex-row items-center" style={{ gap: 5, marginTop: 2 }}>
                    <Store size={15} color="#fff" strokeWidth={2} />
                    <Text style={{ fontSize: 12.5, color: "#fff" }}>{product.studioName || "METAHERB Store"}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* White body — about + KPI tiles + tabs */}
            <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16, gap: 14 }}>
              {/* เกี่ยวกับผลิตภัณฑ์ */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 13, color: "rgba(0,0,0,0.6)" }}>เกี่ยวกับผลิตภัณฑ์</Text>
                <Text style={{ fontSize: 14, fontWeight: "500", color: "rgba(0,0,0,0.85)", lineHeight: 20 }}>
                  {product.tagline}
                </Text>
              </View>

              {/* KPI tiles — 3 equal #fafafa chips */}
              <View className="flex-row" style={{ gap: 8 }}>
                {kpis.map((k) => (
                  <View
                    key={k.label}
                    style={{ flex: 1, backgroundColor: "#fafafa", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}
                  >
                    <Text style={{ fontSize: 13, color: "rgba(0,0,0,0.6)" }}>{k.label}</Text>
                    <View className="flex-row items-baseline" style={{ gap: 5, marginTop: 3 }}>
                      <Text style={{ fontSize: 17, fontWeight: "700", color: "#000" }}>{k.value}</Text>
                      <Text style={{ fontSize: 13, color: "rgba(0,0,0,0.6)" }}>{k.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* ===== TABS NAV — pill bar, green active ===== */}
              <View className="flex-row self-start" style={{ backgroundColor: "#f3f4f6", borderRadius: 999, padding: 4, gap: 4 }}>
              {TABS.map((t) => {
                const active = tab === t.id;
                const badge = t.id === "applicants" ? applicants.length : undefined;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTab(t.id)}
                    className="flex-row items-center justify-center active:opacity-90"
                    style={{ height: 34, paddingHorizontal: 16, borderRadius: 999, gap: 6, overflow: "hidden" }}
                  >
                    {active ? (
                      <LinearGradient
                        colors={[TAB_FROM, TAB_TO]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: "absolute", inset: 0 }}
                      />
                    ) : null}
                    <t.Icon size={14} color={active ? "#fff" : TEXT_MUTED} strokeWidth={2.2} />
                    <Text style={{ fontSize: 12.5, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>
                      {t.label}
                    </Text>
                    {badge !== undefined && badge > 0 ? (
                      <View
                        style={{
                          minWidth: 18,
                          height: 16,
                          paddingHorizontal: 6,
                          borderRadius: 8,
                          backgroundColor: active ? "rgba(255,255,255,0.25)" : "#ff4757",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: "600", color: "#fff" }}>{badge}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
              </View>
            </View>
          </View>

          {/* ===== TAB CONTENT ===== */}
          {tab === "overview" ? <TrialDetailOverview product={product} /> : null}
          {tab === "applicants" ? <TrialDetailApplicants product={product} /> : null}
          {tab === "info" ? <TrialDetailInfo product={product} /> : null}
        </ScrollView>
        <BottomFade />
      </View>

      {/* Action menu sheet */}
      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} centerTitle title="จัดการสินค้าทดลอง" minHeightRatio={0.3} maxHeightRatio={0.5}>
        <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 2 }}>
          <Pressable
            onPress={() => { setMenuOpen(false); editProduct(); }}
            className="flex-row items-center active:opacity-60"
            style={{ paddingVertical: 13, gap: 12 }}
          >
            <Pencil size={18} color={TEXT_MUTED} strokeWidth={2.2} />
            <Text style={{ fontSize: 14, fontWeight: "500", color: TEXT_PRIMARY }}>แก้ไขข้อมูลสินค้า</Text>
          </Pressable>
          <Pressable
            onPress={() => { setMenuOpen(false); exportData(); }}
            className="flex-row items-center active:opacity-60"
            style={{ paddingVertical: 13, gap: 12 }}
          >
            <Download size={18} color={TEXT_MUTED} strokeWidth={2.2} />
            <Text style={{ fontSize: 14, fontWeight: "500", color: TEXT_PRIMARY }}>ส่งออกข้อมูล</Text>
          </Pressable>
          <View style={{ height: 1, backgroundColor: DIVIDER_GRAY, marginVertical: 4 }} />
          <Pressable
            onPress={() => { setMenuOpen(false); deleteProduct(); }}
            className="flex-row items-center active:opacity-60"
            style={{ paddingVertical: 13, gap: 12 }}
          >
            <Trash2 size={18} color="#ff3b30" strokeWidth={2.2} />
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#ff3b30" }}>ลบสินค้าทดลอง</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}
