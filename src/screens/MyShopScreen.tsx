import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Animated,
  Alert,
  Modal,
  Switch,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
  useWindowDimensions,
  type TextStyle,
  type ScrollViewProps,
  type LayoutChangeEvent,
} from "react-native";
import { GestureHandlerRootView, GestureDetector, Gesture, ScrollView as GHScrollView } from "react-native-gesture-handler";
import Reanimated, { runOnJS, useSharedValue, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

type ScrollHandler = ScrollViewProps["onScroll"];

// Enable smooth LayoutAnimation on Android (iOS has it on by default).
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { createNativeBottomTabNavigator } from "@bottom-tabs/react-navigation";
import { useBottomTabBarHeight } from "react-native-bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightCircle,
  BarChart3,
  Beaker,
  Bell,
  Building2,
  Calendar,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  ClipboardList,
  Clock,
  Banknote,
  Percent,
  DollarSign,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FlaskConical,
  Info,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  EyeOff,
  Boxes,
  Trash2,
  Plus,
  Package,
  PackageCheck,
  PackageX,
  Pencil,
  Sprout,
  SlidersHorizontal,
  GripVertical,
  PlusCircle,
  ScanSearch,
  Search,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Settings,
  CreditCard,
  Star,
  Store,
  Truck,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  Ticket,
  Zap,
  X,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { GlassIconButton } from "../components/GlassIconButton";
import { GlassView } from "expo-glass-effect";
import { SubPageHeader } from "../components/SubPageHeader";
import { BottomSheet } from "../components/BottomSheet";
import { Skeleton } from "../components/Skeleton";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { useAllPromotions, computedStatus as promoStatus } from "../data/promotions";
import { showToast } from "../components/Toast";
import { GlassDatePicker } from "../components/GlassDatePicker";
import { getImagePicker } from "../utils/imagePicker";
import { useSeller } from "../context/SellerContext";
import { BottomFade } from "../components/BottomFade";
import { MATERIALS, MaterialCard } from "./HerbalMarketScreen";
import { SHOP, SHOP_PRODUCTS, REVIEWS, ProductsGrid, ReviewsSection } from "./ShopScreen";
import { webCategoryLabel, SHOP_STOCK } from "../data/catalog";
import { GROUP_BY_ID } from "../data/productVariants";
import { RAW_PRODUCT_BY_ID } from "../data/realProducts";
import { SETTLEMENTS, FINANCE_TOTALS, MONTH_OPTIONS, DEFAULT_MONTH, fmtBaht, fmtSigned, type Settlement, type SettlementStatus } from "../data/financeTransactions";
import { ShopSalesReportView } from "./ShopSalesReportView";
import { ShopReportView } from "./ShopReportView";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TrialRegistryOwnerSection } from "./TrialRegistryView";
import { TrialTrackingOwnerSection } from "./TrialTrackingView";
import { PromotionsOwnerSection } from "./PromotionsView";
import { CouponsOwnerSection } from "./CouponsView";
import { SalesDatePicker, type DateSel } from "../components/SalesDatePicker";
import type { Period } from "../data/salesReport";
import type { RootStackParamList } from "../navigation/RootStack";
import { gridColumns, gridCardWidth, isTablet } from "../theme/layout";
import {
  BRAND_GREEN,
  BRAND_GREEN_DARK,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  TEXT_DISABLED,
  BORDER_GRAY,
  DIVIDER_GRAY,
  SURFACE_GRAY,
} from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Decorative leaves for the green header (matches the home app bar).
const LEAF_C = require("../../assets/herb-leaf-c.png");
const LEAF_D = require("../../assets/herb-leaf-d.png");
const SHOP_TABS = [
  { id: "products", label: "สินค้า" },
  { id: "herbal", label: "Herbal" },
  { id: "reviews", label: "รีวิว" },
] as const;



// Owner-console menu tree — ported from the web OwnerDashboard sidebar.
// Surfaced on mobile via a bottom-sheet menu (scales to many items + the
// sub-menus render as accordion sections inside the sheet).
export type SectionId =
  | "dashboard"
  | "orders"
  | "hm_quotations"
  | "hm_pr"
  | "hm_po"
  | "products_manage"
  | "flash_sale"
  | "promotions"
  | "coupons"
  | "trials_products"
  | "trials_tracking"
  | "report_sales"
  | "report_customers"
  | "report_products"
  | "report_market"
  | "finance_overview"
  | "finance_tx"
  | "complaints";

export type MenuNode = {
  id: SectionId;
  label: string;
  Icon: typeof BarChart3;
  children?: { id: SectionId; label: string }[];
};

// Order + structure match the web OwnerDashboard sidebar 1:1.
export const SHOP_MENU: MenuNode[] = [
  { id: "dashboard", label: "Dashboard", Icon: BarChart3 },
  { id: "orders", label: "คำสั่งซื้อ", Icon: ShoppingCart },
  {
    id: "hm_quotations",
    label: "เฮอร์บัลมาร์เก็ต",
    Icon: Beaker,
    children: [
      { id: "hm_quotations", label: "ใบเสนอราคา" },
      { id: "hm_pr", label: "ใบ PR" },
      { id: "hm_po", label: "ใบ PO" },
    ],
  },
  {
    id: "products_manage",
    label: "สินค้า",
    Icon: Package,
    children: [
      { id: "products_manage", label: "จัดการสินค้า" },
      { id: "flash_sale", label: "Flash Sale" },
      { id: "promotions", label: "โปรโมชั่น" },
      { id: "coupons", label: "คูปอง" },
    ],
  },
  {
    id: "trials_products",
    label: "สินค้าทดลอง",
    Icon: FlaskConical,
    children: [
      { id: "trials_products", label: "สินค้าทดลอง" },
      { id: "trials_tracking", label: "ติดตามสินค้าทดลอง" },
    ],
  },
  {
    id: "report_sales",
    label: "รายงาน",
    Icon: FileText,
    children: [
      { id: "report_sales", label: "รายงานผลยอดขาย" },
      { id: "report_customers", label: "รายงานข้อมูลลูกค้า" },
      { id: "report_products", label: "รายงานข้อมูลสินค้า" },
      { id: "report_market", label: "รายงานการตลาด" },
    ],
  },
  { id: "complaints", label: "เรื่องร้องเรียน", Icon: AlertTriangle },
];

// Flattened sections for the overview menu grid (8 per page, 4×2, swipeable).
const SHOP_MENU_GRID: { id: SectionId; label: string; Icon: typeof BarChart3 }[] = [
  { id: "orders", label: "คำสั่งซื้อ", Icon: ShoppingCart },
  { id: "products_manage", label: "สินค้า", Icon: Package },
  { id: "flash_sale", label: "Flash Sale", Icon: Zap },
  { id: "promotions", label: "โปรโมชั่น", Icon: Percent },
  { id: "coupons", label: "คูปอง", Icon: Ticket },
  { id: "hm_quotations", label: "ใบเสนอราคา", Icon: FileText },
  { id: "hm_pr", label: "ใบ PR", Icon: ClipboardList },
  { id: "hm_po", label: "ใบ PO", Icon: PackageCheck },
  { id: "trials_products", label: "สินค้าทดลอง", Icon: FlaskConical },
  { id: "trials_tracking", label: "ติดตามทดลอง", Icon: ScanSearch },
  { id: "report_sales", label: "รายงานขาย", Icon: BarChart3 },
  { id: "report_customers", label: "รายงานลูกค้า", Icon: User },
  { id: "report_products", label: "รายงานสินค้า", Icon: Package },
  { id: "report_market", label: "รายงานตลาด", Icon: Beaker },
  { id: "complaints", label: "ร้องเรียน", Icon: AlertTriangle },
];

type MenuItem = (typeof SHOP_MENU_GRID)[number];
type Cell = { kind: "menu"; m: MenuItem } | { kind: "reorder" };
const MENU_BY_ID: Record<string, MenuItem> = {};
SHOP_MENU_GRID.forEach((m) => { MENU_BY_ID[m.id] = m; });
const DEFAULT_MENU_ORDER = SHOP_MENU_GRID.map((m) => m.id);
const MENU_ORDER_KEY = "shop_menu_order_v1";

// Report sections open as their own subpage (ShopReport route).
const REPORT_KIND: Partial<Record<SectionId, "sales" | "customers" | "products" | "market">> = {
  report_sales: "sales",
  report_customers: "customers",
  report_products: "products",
  report_market: "market",
};

const META_CHAR = require("../../assets/meta-character.gif");

/** น้องเมต้า — AI shop-manager entry on the overview (placeholder → opens the เมต้า chat). */
function MetaManagerCard({ onPress }: { onPress: () => void }) {
  // Replay the character once each time the overview gains focus (gif itself doesn't loop).
  const [playKey, setPlayKey] = useState(0);
  useFocusEffect(useCallback(() => { setPlayKey((k) => k + 1); }, []));
  return (
    <Pressable onPress={onPress} className="active:opacity-90" style={{ borderRadius: 18, overflow: "hidden" }}>
      <LinearGradient
        colors={["#c2410c", "#ea580c", "#fb923c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flexDirection: "row", alignItems: "center", minHeight: 116, paddingLeft: 16, paddingVertical: 12, paddingRight: 4 }}
      >
        <View style={{ flex: 1, paddingRight: 6 }}>
          <View className="flex-row items-center" style={{ gap: 6, flexWrap: "wrap" }}>
            <Text style={{ fontSize: 19, fontWeight: "800", color: "#fff" }}>น้องเมต้า</Text>
            <View className="flex-row items-center" style={{ gap: 3 }}>
              <Sparkles size={12} color="rgba(255,255,255,0.9)" strokeWidth={2.4} />
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: "rgba(255,255,255,0.9)" }}>ผู้จัดการ AI</Text>
            </View>
          </View>
          <Text numberOfLines={2} style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 5, lineHeight: 16 }}>
            ช่วยจัดการข้อมูลร้านค้า · ถามยอดขาย สรุปออเดอร์ จัดการสินค้า
          </Text>
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            isInteractive
            style={{ alignSelf: "flex-start", marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingLeft: 16, paddingRight: 13, paddingVertical: 9 }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#fff" }}>เริ่มแชท</Text>
            <ArrowRightCircle size={16} color="#fff" strokeWidth={2.4} />
          </GlassView>
        </View>
        <Image key={playKey} source={META_CHAR} style={{ width: 110, height: 116 }} resizeMode="contain" />
      </LinearGradient>
    </Pressable>
  );
}

const RROW_H = 56; // reorder row slot height

/** One reorder row — drag handled on the UI thread via reanimated (no re-render → no jank). */
function ReorderRow({ i, m, n, activeSV, hoverSV, dragSV, onReorder }: {
  i: number;
  m: MenuItem;
  n: number;
  activeSV: SharedValue<number>;
  hoverSV: SharedValue<number>;
  dragSV: SharedValue<number>;
  onReorder: (from: number, to: number) => void;
}) {
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(160)
        .onStart(() => { activeSV.value = i; hoverSV.value = i; dragSV.value = 0; })
        .onUpdate((e) => {
          dragSV.value = e.translationY;
          let h = Math.round((i * RROW_H + e.translationY) / RROW_H);
          if (h < 0) h = 0;
          if (h > n - 1) h = n - 1;
          hoverSV.value = h;
        })
        .onEnd(() => { runOnJS(onReorder)(activeSV.value, hoverSV.value); })
        .onFinalize(() => { activeSV.value = -1; hoverSV.value = -1; dragSV.value = 0; }),
    [i, n, activeSV, hoverSV, dragSV, onReorder],
  );

  const containerStyle = useAnimatedStyle(() => {
    const a = activeSV.value, h = hoverSV.value;
    let ty = 0;
    if (a === i) ty = dragSV.value;
    else if (a !== -1) {
      if (a < h && i > a && i <= h) ty = -RROW_H;
      else if (a > h && i >= h && i < a) ty = RROW_H;
    }
    return { transform: [{ translateY: ty }], zIndex: a === i ? 20 : 1 };
  });
  const pillStyle = useAnimatedStyle(() => ({ backgroundColor: activeSV.value === i ? "#e3f3e9" : "#f5f5f5" }));

  return (
    <GestureDetector gesture={gesture}>
      <Reanimated.View style={[{ position: "absolute", left: 0, right: 0, top: i * RROW_H, height: RROW_H, justifyContent: "center" }, containerStyle]}>
        <Reanimated.View className="flex-row items-center" style={[{ gap: 10, borderRadius: 999, padding: 8 }, pillStyle]}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
            <m.Icon size={18} color={BRAND_GREEN_DARK} strokeWidth={2} />
          </View>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{m.label}</Text>
          <GripVertical size={20} color="#c4c4c4" strokeWidth={2} />
        </Reanimated.View>
      </Reanimated.View>
    </GestureDetector>
  );
}

/** Drag-and-drop reorder list — gesture-handler Pan + reanimated (smooth, UI-thread). */
function MenuReorderList({ initial, onSave, onClose }: { initial: SectionId[]; onSave: (o: SectionId[]) => void; onClose: () => void }) {
  const [data, setData] = useState<SectionId[]>(initial);
  const dataRef = useRef(data); dataRef.current = data;
  const activeSV = useSharedValue(-1);
  const hoverSV = useSharedValue(-1);
  const dragSV = useSharedValue(0);

  const applyReorder = (from: number, to: number) => {
    if (from < 0 || to < 0 || from === to) return;
    const next = [...dataRef.current];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setData(next);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
        <GlassIconButton onPress={onClose} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>จัดลำดับเมนู</Text>
        <GlassIconButton onPress={() => onSave(dataRef.current)} size={44} accessibilityLabel="บันทึก" tintColor="rgba(49,151,84,0.22)">
          <Check size={22} color={BRAND_GREEN_DARK} strokeWidth={3} />
        </GlassIconButton>
      </View>
      <GHScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginBottom: 10 }}>กดแถวค้างแล้วลากเพื่อจัดลำดับ</Text>
        <View style={{ height: data.length * RROW_H }}>
          {data.map((id, i) => {
            const m = MENU_BY_ID[id];
            if (!m) return null;
            return <ReorderRow key={id} i={i} m={m} n={data.length} activeSV={activeSV} hoverSV={hoverSV} dragSV={dragSV} onReorder={applyReorder} />;
          })}
        </View>
      </GHScrollView>
    </GestureHandlerRootView>
  );
}

/** Paged menu grid (8 per page · 4×2), swipeable, with a customizable order. */
function ShopMenuGrid({ onSelect }: { onSelect?: (id: SectionId) => void }) {
  const [w, setW] = useState(0);
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState<SectionId[]>(DEFAULT_MENU_ORDER);
  const [editing, setEditing] = useState(false);

  // Restore saved order; reconcile with the current menu (drop removed, append new).
  useEffect(() => {
    AsyncStorage.getItem(MENU_ORDER_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = (JSON.parse(raw) as SectionId[]).filter((id) => MENU_BY_ID[id]);
        setOrder([...saved, ...DEFAULT_MENU_ORDER.filter((id) => !saved.includes(id))]);
      } catch {
        /* keep default */
      }
    });
  }, []);

  const items = order.map((id) => MENU_BY_ID[id]).filter(Boolean);
  // "จัดลำดับ" rides as the last cell — a circular tile like its menu peers.
  const cells: Cell[] = [...items.map((m) => ({ kind: "menu" as const, m })), { kind: "reorder" as const }];
  // iPad: 5 tiles per row (slightly larger, like the Home categories); phones 4.
  const perRow = isTablet() ? 5 : 4;
  const pageSize = perRow * 2;
  const tileW = `${100 / perRow}%` as const;
  const circle = isTablet() ? 56 : 52;
  const labelSize = isTablet() ? 12 : 10.5;
  const pages: Cell[][] = [];
  for (let i = 0; i < cells.length; i += pageSize) pages.push(cells.slice(i, i + pageSize));

  const openEdit = () => setEditing(true);
  const saveOrder = (o: SectionId[]) => {
    setOrder(o);
    AsyncStorage.setItem(MENU_ORDER_KEY, JSON.stringify(o)).catch(() => {});
    setEditing(false);
  };

  return (
    <View style={{ paddingVertical: 2 }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}>
            {pages.map((pg, pi) => (
              <View key={pi} style={{ width: w, flexDirection: "row", flexWrap: "wrap" }}>
                {pg.map((cell) =>
                  cell.kind === "reorder" ? (
                    <Pressable key="reorder" onPress={openEdit} className="active:opacity-60" style={{ width: tileW, alignItems: "center", paddingVertical: 10 }}>
                      <View style={{ width: circle, height: circle, borderRadius: circle / 2, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                        <Pencil size={isTablet() ? 22 : 20} color={BRAND_GREEN_DARK} strokeWidth={2.2} />
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: labelSize, color: TEXT_SECONDARY, textAlign: "center", marginTop: 6, maxWidth: "98%" }}>จัดลำดับ</Text>
                    </Pressable>
                  ) : (
                    <Pressable key={cell.m.id} onPress={() => onSelect?.(cell.m.id)} className="active:opacity-60" style={{ width: tileW, alignItems: "center", paddingVertical: 10 }}>
                      <View style={{ width: circle, height: circle, borderRadius: circle / 2, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                        <cell.m.Icon size={isTablet() ? 24 : 22} color={BRAND_GREEN_DARK} strokeWidth={2} />
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: labelSize, color: TEXT_SECONDARY, textAlign: "center", marginTop: 6, maxWidth: "98%" }}>{cell.m.label}</Text>
                    </Pressable>
                  ),
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={{ height: 168 }} />
        )}
      </View>

      {pages.length > 1 ? (
        <View className="flex-row items-center justify-center" style={{ gap: 6, marginTop: 6 }}>
          {pages.map((_, i) => (
            <View key={i} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? BRAND_GREEN : "#d4d4d4" }} />
          ))}
        </View>
      ) : null}

      {/* Reorder sheet — drag & drop */}
      <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(false)}>
        <MenuReorderList initial={order} onSave={saveOrder} onClose={() => setEditing(false)} />
      </Modal>
    </View>
  );
}

// Flat label lookup for the section selector button.
export const SECTION_LABEL: Record<SectionId, string> = {
  dashboard: "Dashboard",
  orders: "จัดการคำสั่งซื้อ",
  hm_quotations: "ใบเสนอราคา",
  hm_pr: "ใบ PR",
  hm_po: "ใบ PO",
  products_manage: "จัดการสินค้า",
  flash_sale: "Flash Sale",
  promotions: "โปรโมชั่น",
  coupons: "คูปอง",
  trials_products: "สินค้าทดลอง",
  trials_tracking: "ติดตามสินค้าทดลอง",
  report_sales: "รายงานผลยอดขาย",
  report_customers: "รายงานข้อมูลลูกค้า",
  report_products: "รายงานข้อมูลสินค้า",
  report_market: "รายงานการตลาด",
  finance_overview: "ภาพรวมการเงิน",
  finance_tx: "ธุรกรรม",
  complaints: "เรื่องร้องเรียน",
};

// Sections that open as their own pushed subpage (generic ShopSection screen)
// instead of swapping inside the console — same slide-in chrome as ร้องเรียน.
export const SHOP_SUBPAGE_SECTIONS = new Set<SectionId>([
  "flash_sale", "hm_quotations", "hm_pr", "hm_po",
  "trials_products", "trials_tracking", "promotions", "coupons",
]);

// Shop identity is a single source of truth: the owner console reuses the exact
// SHOP the customer-facing ShopScreen presents, so name/avatar/banner/description
// never drift between the live shop and "จัดการร้านค้า".

// Mock wallet figures — same shape as OwnerDashboard's `walletAvailable`,
// `walletEscrow`, `walletEscrowOrderCount`.
// Single source: derived from the finance transactions so the dashboard wallet
// and the การเงิน tab always agree.
const WALLET = {
  available: FINANCE_TOTALS.available,
  escrow: FINANCE_TOTALS.escrow,
  escrowOrderCount: FINANCE_TOTALS.escrowCount,
  totalIncome: FINANCE_TOTALS.totalIncome,
};

// Per-month figures (index 0 = Jan) — same arrays as the web OverviewTab.
// Selecting a month/day re-scopes everything off these.
const MONTHLY_VISITS = [3200, 2800, 4100, 3600, 2900, 3500, 4500, 3100, 2600, 3800, 4200, 2700];
const MONTHLY_ORDERS = [480, 390, 620, 510, 430, 560, 710, 450, 370, 580, 640, 400];
const MONTHLY_SALES_DATA = [96000, 78000, 124000, 102000, 86000, 112000, 142000, 90000, 74000, 116000, 128000, 80000];

// Order status grid — exact same 6 buckets as the web Order tracking card.
const ORDER_STATUS = [
  { id: "pending_payment", label: "รอชำระเงิน", count: 5, accent: "#ff3b30", Icon: Wallet },
  { id: "pending_verify", label: "รอตรวจสอบ", count: 3, accent: "#f59e0b", Icon: ScanSearch },
  { id: "ready_ship", label: "รอจัดส่ง", count: 12, accent: "#3b82f6", Icon: PackageCheck },
  { id: "shipping", label: "กำลังส่ง", count: 7, accent: BRAND_GREEN, Icon: Truck },
  { id: "shipped", label: "จัดส่งแล้ว", count: 23, accent: "#10b981", Icon: Check },
  { id: "cancelled", label: "ยกเลิก", count: 1, accent: "#6b7280", Icon: PackageX },
];

// Quotation status (3 buckets) — same set as the web.
const QUOTATION_STATUS = [
  { id: "sent", label: "รอตอบกลับ", count: 4, accent: "#f59e0b", Icon: Clock },
  { id: "accepted", label: "ตอบรับแล้ว", count: 9, accent: "#10b981", Icon: Check },
  { id: "expired", label: "หมดอายุ", count: 2, accent: "#9ca3af", Icon: AlertCircle },
];

// Trial registrations (3 buckets) — same set as the web.
const TRIAL_STATUS = [
  { id: "pending_approval", label: "รออนุมัติ", count: 3, accent: "#f59e0b", Icon: Clock },
  { id: "approved", label: "อนุมัติแล้ว", count: 6, accent: "#3b82f6", Icon: Check },
  { id: "evaluated", label: "ประเมินแล้ว", count: 11, accent: "#10b981", Icon: PackageCheck },
];

// "สินค้าขายดี" = the SAME products the customer shop sells (name + image come
// straight from SHOP_PRODUCTS), with sales stats derived from the catalog sold
// figure, so the owner console matches the live web shop 1:1.
const parseSold = (s: string) => (/k/i.test(s) ? Math.round(parseFloat(s) * 1000) : Math.round(parseFloat(s)) || 0);
const TOP_PRODUCTS = SHOP_PRODUCTS.map((p) => {
  const sold = parseSold(p.sold);
  return { name: p.name, cat: webCategoryLabel(p.category), unit: p.price, sold, revenue: p.price * sold, image: p.image as number };
});

// ===================== PRODUCT MANAGEMENT (sidebar → จัดการสินค้า) ==========
// Ported from the web OwnerDashboard ProductsTab. Two product types share one
// list shape: regular shop products (SHOP_PRODUCTS) and Herbal Market materials
// (MATERIALS). Status is derived from stock the same way the web does.
export type PMStatus = "เปิดขาย" | "ปิดขาย" | "สินค้าหมด";
export type PMProduct = {
  id: string;
  name: string;
  category: string;
  image: number;
  type: string;
  typeColor: string;
  priceText: string;
  stockText: string;
  status: PMStatus;
  statusColor: string;
  flash: boolean;
  recommended: boolean;
};

export const PM_STATUS_COLOR: Record<PMStatus, string> = {
  เปิดขาย: "#319754",
  ปิดขาย: "#8a8f8a",
  สินค้าหมด: "#dc2626",
};

// Stock comes from the shared SHOP_STOCK map (data/catalog.ts); the Flash Sale /
// แนะนำ flags come straight off the catalog product, so the จัดการสินค้า tags
// always match what the storefront cards actually display. Products whose
// detail page offers variant options (VARIANT_GROUPS) show "มีตัวเลือก" with
// the min–max price across their SKUs instead of "ราคาเดียว".
export const PM_REGULAR: PMProduct[] = SHOP_PRODUCTS.map((p) => {
  const m = SHOP_STOCK[p.id] ?? { stock: 200 };
  const status: PMStatus = m.closed ? "ปิดขาย" : m.stock === 0 ? "สินค้าหมด" : "เปิดขาย";
  const group = GROUP_BY_ID[p.id];
  let priceText = `฿ ${p.price.toFixed(2)}`;
  if (group) {
    const prices = group.items.map((it) => it.custom?.price ?? RAW_PRODUCT_BY_ID[it.id]?.price ?? p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    priceText = min === max ? `฿ ${min.toFixed(2)}` : `฿ ${min.toFixed(2)} - ${max.toFixed(2)}`;
  }
  return {
    id: p.id,
    name: p.name,
    category: webCategoryLabel(p.category),
    image: p.image as number,
    type: group ? "มีตัวเลือก" : "ราคาเดียว",
    typeColor: group ? "#0088ff" : "#ff9500",
    priceText,
    stockText: `${m.stock.toLocaleString()} ชิ้น`,
    status,
    statusColor: PM_STATUS_COLOR[status],
    flash: !!p.isFlashSale,
    recommended: !!p.isRecommended,
  };
});

const GRADE_ACCENT: Record<string, string> = {
  พรีเมียม: "#d97706", คัดสรร: "#475569", มาตรฐาน: "#c2410c", ทั่วไป: "#047857", ประหยัด: "#475569",
};

export const PM_MATERIAL: PMProduct[] = MATERIALS.map((m) => {
  const status: PMStatus = m.stock === 0 ? "สินค้าหมด" : "เปิดขาย";
  return {
    id: m.id,
    name: m.name,
    category: m.category,
    image: m.image as number,
    type: `วัตถุดิบ · ${m.grade}`,
    typeColor: GRADE_ACCENT[m.grade] ?? "#0088ff",
    priceText: `฿ ${m.pricePerKg.toLocaleString()} / กก.`,
    stockText: `${m.stock.toLocaleString()} กก.`,
    status,
    statusColor: PM_STATUS_COLOR[status],
    flash: false,
    recommended: false,
  };
});

/* ── PM store — status overrides + deletions shared by the list, search, and
   detail pages (same in-memory pattern as the coupons/promotions stores).
   Base data stays the derived PM_REGULAR / PM_MATERIAL arrays; overrides
   layer on top so every surface re-renders together. ── */
type PMOverrides = Record<string, { status?: PMStatus; recommended?: boolean; deleted?: boolean }>;
let pmOverrides: PMOverrides = {};
const pmListeners = new Set<() => void>();
const pmEmit = () => pmListeners.forEach((l) => l());
const pmSubscribe = (l: () => void) => {
  pmListeners.add(l);
  return () => {
    pmListeners.delete(l);
  };
};
export function setPMStatus(id: string, status: PMStatus) {
  pmOverrides = { ...pmOverrides, [id]: { ...pmOverrides[id], status } };
  pmEmit();
}
export function deletePMProduct(id: string) {
  pmOverrides = { ...pmOverrides, [id]: { ...pmOverrides[id], deleted: true } };
  pmEmit();
}
export function setPMRecommended(id: string, recommended: boolean) {
  pmOverrides = { ...pmOverrides, [id]: { ...pmOverrides[id], recommended } };
  pmEmit();
}
function applyPMOverrides(base: PMProduct[], o: PMOverrides): PMProduct[] {
  return base
    .filter((p) => !o[p.id]?.deleted)
    .map((p) => {
      const ov = o[p.id];
      if (!ov) return p;
      return {
        ...p,
        ...(ov.status ? { status: ov.status, statusColor: PM_STATUS_COLOR[ov.status] } : null),
        ...(ov.recommended != null ? { recommended: ov.recommended } : null),
      };
    });
}
/** Live product list (overrides applied) — re-renders on toggle / delete. */
export function usePMProducts(type: "regular" | "material"): PMProduct[] {
  const o = useSyncExternalStore(pmSubscribe, () => pmOverrides, () => pmOverrides);
  return useMemo(() => applyPMOverrides(type === "regular" ? PM_REGULAR : PM_MATERIAL, o), [type, o]);
}

// ===================== FLASH SALE (sidebar → Flash Sale) ====================
// Ported from the web FlashSaleTab: platform events + the shop's joined products.
type FlashEventStatus = "join" | "pending" | "active" | "ended";
type FlashEvent = { id: string; name: string; status: FlashEventStatus; itemCount: number; dateRange: string; hms?: [number, number, number] };
const FLASH_EVENTS: FlashEvent[] = [
  { id: "fe1", name: "Flash Sale 7.1", status: "active", itemCount: 3, dateRange: "1-3 ก.ค. 69", hms: [39, 5, 53] },
  { id: "fe2", name: "Flash Sale 12.12", status: "join", itemCount: 0, dateRange: "12 ธ.ค. 69" },
  { id: "fe3", name: "Flash Sale 11.11", status: "join", itemCount: 0, dateRange: "11 พ.ย. 69" },
  { id: "fe4", name: "Flash Sale 10.10", status: "join", itemCount: 0, dateRange: "10 ต.ค. 69" },
];

type FlashStatus = "active" | "scheduled" | "soldout";
export type FlashProduct = {
  id: string; name: string; image: number;
  normalPrice: number; flashPrice: number; discount: number;
  total: number; sold: number; remaining: number; revenue: number;
  status: FlashStatus; timeRange: string; startText: string; endText: string;
};
const FLASH_STATUS_CFG: Record<FlashStatus, { label: string; color: string }> = {
  active: { label: "กำลังขาย", color: "#319754" },
  scheduled: { label: "กำหนดไว้ล่วงหน้า", color: "#f59e0b" },
  soldout: { label: "สินค้าหมด", color: "#dc2626" },
};
// Joined flash products = exactly the storefront's flash-sale cards (catalog
// isFlashSale flags): normal/flash prices and the discount % mirror the card's
// strikethrough + "ลด N%" pill, and sold tracks the same deterministic
// soldPercent that drives the card's progress bar.
const FLASH_QUOTA: Record<string, number> = { "1": 300, "9": 300, "33": 150 };
export const FLASH_PRODUCTS: FlashProduct[] = SHOP_PRODUCTS.filter((p) => p.isFlashSale).map((p) => {
  const total = FLASH_QUOTA[p.id] ?? 200;
  const sold = Math.round((total * (p.soldPercent ?? 50)) / 100);
  const startText = "01 ก.ค. 69 - 00:00"; // Flash Sale 7.1 window (fe1)
  const endText = "03 ก.ค. 69 - 23:59";
  return {
    id: p.id, name: p.name, image: p.image as number,
    normalPrice: p.originalPrice ?? p.price, flashPrice: p.price, discount: p.discountPercent ?? 0,
    total, sold, remaining: Math.max(0, total - sold), revenue: p.price * sold,
    status: "active" as FlashStatus, timeRange: `${startText} – ${endText}`,
    startText, endText,
  };
});

const TOP_CUSTOMERS = [
  { name: "คุณสมชาย", email: "somchai@email.com", orders: 184, total: 25520 },
  { name: "คุณสมหญิง", email: "somying@email.com", orders: 165, total: 22700 },
  { name: "คุณทานตะวัน", email: "tantawan@email.com", orders: 152, total: 21380 },
  { name: "คุณสายฝน", email: "saifon@email.com", orders: 138, total: 19230 },
  { name: "คุณฟ้าใส", email: "fasai@email.com", orders: 124, total: 18700 },
  { name: "คุณมานพ", email: "manop@email.com", orders: 112, total: 16840 },
  { name: "คุณวิภา", email: "wipha@email.com", orders: 98, total: 14720 },
  { name: "คุณกิตติ", email: "kitti@email.com", orders: 87, total: 13050 },
  { name: "คุณนภา", email: "napha@email.com", orders: 76, total: 11400 },
  { name: "คุณเอกชัย", email: "ekachai@email.com", orders: 64, total: 9620 },
];

// ===================== ORDERS (sidebar → คำสั่งซื้อ) =====================
// Ported from the web OwnerDashboard OrdersTab. Same 6 statuses, status pill +
// note colors, filter tabs, and order-card layout — adapted for a phone width.
type OrderStatus =
  | "pending_payment"
  | "pending_verify"
  | "ready_ship"
  | "shipping"
  | "shipped"
  | "cancelled";

// Status pill bg + footer note tag (exact web values from statusConfig).
export const ORDER_STATUS_CFG: Record<
  OrderStatus,
  { label: string; pillBg: string; note: string; noteColor: string }
> = {
  pending_payment: { label: "รอชำระเงิน", pillBg: "#ff8d28", note: "ยังไม่ชำระเงิน", noteColor: "#ff9500" },
  pending_verify: { label: "รอตรวจสอบ", pillBg: "#ff9500", note: "รอร้านตรวจสอบ", noteColor: "#ff9500" },
  ready_ship: { label: "พร้อมจัดส่ง", pillBg: "#007aff", note: "พร้อมส่งให้ลูกค้า", noteColor: "#007aff" },
  shipping: { label: "กำลังจัดส่ง", pillBg: "#319754", note: "ระหว่างจัดส่ง", noteColor: "#319754" },
  shipped: { label: "ส่งสำเร็จ", pillBg: "#10b981", note: "ส่งสำเร็จแล้ว", noteColor: "#10b981" },
  cancelled: { label: "ยกเลิก", pillBg: "#ff3b30", note: "ยกเลิกแล้ว", noteColor: "#ff3b30" },
};

// Filter tabs — "all" + each status, with the same icons as the web.
const ORDER_TABS: { id: "all" | OrderStatus; label: string; Icon: typeof BarChart3 }[] = [
  { id: "all", label: "ทั้งหมด", Icon: ClipboardList },
  { id: "pending_payment", label: "รอชำระเงิน", Icon: Wallet },
  { id: "pending_verify", label: "รอตรวจสอบ", Icon: ScanSearch },
  { id: "ready_ship", label: "พร้อมจัดส่ง", Icon: Package },
  { id: "shipping", label: "กำลังจัดส่ง", Icon: Truck },
  { id: "shipped", label: "ส่งสำเร็จ", Icon: PackageCheck },
  { id: "cancelled", label: "ยกเลิก", Icon: PackageX },
];

type OrderItem = { name: string; option: string; qty: number; price: number; image: number };
export type ShopOrder = {
  id: string;
  status: OrderStatus;
  date: string;
  customer: string;
  phone: string;
  address: string;
  shippingMethod: "รับที่ร้าน" | "จัดส่งปกติ" | "จัดส่งด่วน";
  trackingNumber?: string;
  reviewScore?: number;
  // Detail-page fields (same shape as the web OwnerDashboard order).
  paymentMethod?: string;
  note?: string;
  cancelReason?: string;
  cancelNote?: string;
  cancelledBy?: "shop" | "customer";
  // Customer-requested cancellations await the shop's decision ("pending");
  // deny reverts the order to previousStatus (web flow).
  cancellationStatus?: "pending" | "approved" | "denied";
  previousStatus?: OrderStatus;
  // Customer review (web ReviewModal data) — per-item ratings reference items[].
  review?: {
    reviewerName: string;
    reviewedAt: string;
    shopRating: number;
    items: { itemIndex: number; rating: number; comment: string }[];
  };
  items: OrderItem[];
};

// Order line built from the matching shop product — name/image/price always come
// from the live catalog (SHOP_PRODUCTS), so orders match the web shop. Index wraps.
const oi = (i: number, option: string, qty: number): OrderItem => {
  const p = TOP_PRODUCTS[i % TOP_PRODUCTS.length];
  return { name: p.name, option, qty, price: p.unit * qty, image: p.image };
};

export const ORDERS: ShopOrder[] = [
  {
    id: "ORD-20260204-03521", status: "pending_payment", date: "4 ก.พ. 2569 - 08:12 น.",
    customer: "คุณสมชาย ใจดี", phone: "081-234-5678",
    address: "88/12 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
    shippingMethod: "จัดส่งปกติ", paymentMethod: "พร้อมเพย์ PromptPay",
    items: [oi(0, "150 g", 2)],
  },
  {
    id: "ORD-20260204-03520", status: "pending_verify", date: "4 ก.พ. 2569 - 11:08 น.",
    customer: "คุณสมหญิง รักสุขภาพ", phone: "089-876-5432",
    address: "120 หมู่ 5 ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
    shippingMethod: "จัดส่งด่วน", paymentMethod: "บัญชีธนาคาร",
    note: "ฝากแพ็คกันกระแทกด้วยนะคะ สั่งไปเป็นของฝากค่ะ",
    items: [oi(1, "1 หลอด", 1), oi(2, "20 ซอง", 2)],
  },
  {
    id: "ORD-20260203-03517", status: "ready_ship", date: "3 ก.พ. 2569 - 16:45 น.",
    customer: "คุณทานตะวัน งามดี", phone: "086-111-2233",
    address: "55/3 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
    shippingMethod: "จัดส่งปกติ", paymentMethod: "บัตรเครดิต/บัตรเดบิต",
    items: [oi(3, "200 g", 1)],
  },
  {
    id: "ORD-20260202-03512", status: "shipping", date: "2 ก.พ. 2569 - 09:20 น.",
    customer: "คุณสายฝน พรหมมา", phone: "082-555-7788",
    address: "9 ซ.ลาดพร้าว 71 แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230",
    shippingMethod: "จัดส่งด่วน", trackingNumber: "TH6829-4471-220K", paymentMethod: "พร้อมเพย์ PromptPay",
    items: [oi(4, "30 แคปซูล", 1), oi(5, "1 ชุด", 1)],
  },
  {
    id: "ORD-20260131-03505", status: "shipped", date: "31 ม.ค. 2569 - 13:05 น.",
    customer: "คุณฟ้าใส แจ่มจันทร์", phone: "087-222-9090",
    address: "203/7 ถ.เพชรเกษม ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110",
    shippingMethod: "จัดส่งปกติ", trackingNumber: "TH1180-5523-901P", reviewScore: 5, paymentMethod: "ชำระเงินปลายทาง",
    review: {
      reviewerName: "คุณฟ้าใส แจ่มจันทร์",
      reviewedAt: "2 ก.พ. 2569",
      shopRating: 5,
      items: [{ itemIndex: 0, rating: 5, comment: "หอมอร่อยมากค่ะ ชงง่าย แพ็คมาดีมาก ส่งไวกว่าที่คิด จะกลับมาซื้อซ้ำแน่นอนค่ะ" }],
    },
    items: [oi(6, "150 g", 3)],
  },
  {
    // Shipped-but-not-yet-reviewed example — no reviewScore/review, so the
    // detail page shows no review section and no "ดูคะแนน" button.
    id: "ORD-20260130-03501", status: "shipped", date: "30 ม.ค. 2569 - 09:18 น.",
    customer: "คุณพิมพ์ใจ บุญมา", phone: "085-666-2211",
    address: "99/1 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
    shippingMethod: "จัดส่งด่วน", trackingNumber: "TH2244-8810-455M", paymentMethod: "บัตรเครดิต/บัตรเดบิต",
    items: [oi(9, "1 ชุด", 1), oi(10, "1 ขวด", 2)],
  },
  {
    id: "ORD-20260129-03498", status: "cancelled", date: "29 ม.ค. 2569 - 10:41 น.",
    customer: "คุณมานพ ตั้งใจ", phone: "081-444-1212",
    address: "17 หมู่ 2 ต.บางพระ อ.ศรีราชา จ.ชลบุรี 20110",
    shippingMethod: "รับที่ร้าน", paymentMethod: "พร้อมเพย์ PromptPay",
    cancelledBy: "customer", cancelReason: "ลูกค้าเปลี่ยนใจ", cancelNote: "เปลี่ยนใจ ขอยกเลิกค่ะ",
    cancellationStatus: "pending", previousStatus: "pending_verify",
    items: [oi(7, "1 หลอด", 1)],
  },
  {
    // Reviewed multi-item example — 3 products in one order, per-item ratings
    // (exercises the card's "ดูอีก N รายการ" collapse + the multi-item review page).
    id: "ORD-20260128-03495", status: "shipped", date: "28 ม.ค. 2569 - 14:02 น.",
    customer: "คุณชลธิชา แก้วใส", phone: "089-333-8877",
    address: "8/15 ถ.ศรีจันทร์ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
    shippingMethod: "จัดส่งปกติ", trackingNumber: "TH7731-0092-114D", paymentMethod: "พร้อมเพย์ PromptPay",
    reviewScore: 4,
    review: {
      reviewerName: "คุณชลธิชา แก้วใส",
      reviewedAt: "31 ม.ค. 2569",
      shopRating: 4,
      items: [
        { itemIndex: 0, rating: 5, comment: "กลิ่นหอมมาก ใช้แล้วผ่อนคลายสุด ๆ ซื้อซ้ำแน่นอนค่ะ" },
        { itemIndex: 1, rating: 4, comment: "คุณภาพดี รสชาติเข้มข้น แต่ซองเล็กกว่าที่คิดนิดหน่อย" },
        { itemIndex: 2, rating: 3, comment: "สินค้าโอเคค่ะ แต่กล่องมาถึงบุบมุมนึง อยากให้แพ็คแน่นกว่านี้" },
      ],
    },
    items: [oi(11, "1 กล่อง", 1), oi(12, "2 ซอง", 2), oi(13, "1 ชุด", 1)],
  },
  {
    // Shop-cancelled example — shows the red "ยกเลิกแล้ว" variant with full
    // details (ยกเลิกโดย: ร้านค้า + เหตุผล + หมายเหตุ) on the detail page.
    id: "ORD-20260126-03484", status: "cancelled", date: "26 ม.ค. 2569 - 15:22 น.",
    customer: "คุณวรรณา สายทอง", phone: "084-777-3344",
    address: "42/8 ถ.รัถการ ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110",
    shippingMethod: "จัดส่งปกติ", paymentMethod: "บัญชีธนาคาร",
    cancelledBy: "shop", cancelReason: "สินค้าหมดสต็อก",
    cancelNote: "วัตถุดิบล็อตล่าสุดหมด ทางร้านคืนเงินเต็มจำนวนให้แล้ว ขออภัยในความไม่สะดวกค่ะ",
    cancellationStatus: "approved",
    items: [oi(8, "250 g", 1)],
  },
];

export const orderTotal = (o: ShopOrder) => o.items.reduce((s, it) => s + it.price, 0);

export const fmtTHB = (n: number) =>
  `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtTHBShort = (n: number) => `฿${n.toLocaleString("th-TH")}`;
const fmtNum = (n: number) => n.toLocaleString("th-TH");

/**
 * Count-up number — ports the web `AnimatedValue`. Parses an already-formatted
 * string ("฿24,580.00", "4,500"), then tweens from the previous value to the
 * new one with easeOutCubic whenever it changes.
 */
function AnimatedNumber({
  value,
  style,
  // Data-reveal count-up → major tier ~500 ms (Animation Timing rule).
  duration = 500,
}: {
  value: string;
  style?: TextStyle;
  duration?: number;
}) {
  const match = value.match(/^([฿]?\s*)([\d,]+(?:\.\d+)?)(.*)$/);
  const target = match ? parseFloat(match[2].replace(/,/g, "")) : 0;
  const decimals = match && match[2].includes(".") ? (match[2].split(".")[1] || "").length : 0;
  const prefix = match ? match[1] : "";
  const suffix = match ? match[3] : "";

  const prevTarget = useRef(target);
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (!match) return;
    const from = prevTarget.current;
    const to = target;
    prevTarget.current = target;
    if (from === to) {
      setDisplay(to);
      return;
    }
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (!match) return <Text style={style}>{value}</Text>;

  const formatted =
    decimals > 0
      ? display.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      : Math.round(display).toLocaleString("en-US");

  return (
    <Text style={style}>
      {prefix}
      {formatted}
      {suffix}
    </Text>
  );
}

// Shared green header for every owner-console tab — back + title + leaves.
// `title`/`subtitle` default to "ร้านค้าของฉัน" + shop name; sub-sections pass the
// section name as title and "" as subtitle so the page name rides on the app bar.
// `onBack` defaults to leaving the console; sub-sections override it to step back
// to the dashboard instead of all the way to the home tab.
function ShopHeader({ title, subtitle, onBack, headerRight }: { title?: string; subtitle?: string; onBack?: () => void; headerRight?: ReactNode }) {
  const nav = useNavigation<Nav>();
  const { shopProfile } = useSeller();
  const shopName = shopProfile?.shopName?.trim() || "ร้านค้าของคุณ";
  const titleText = title ?? "ร้านค้าของฉัน";
  const subText = subtitle ?? shopName;
  const back = onBack ?? (() => (nav.getParent() ?? nav).goBack());
  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: BRAND_GREEN }}>
      {/* Decorative herb leaves — same watermark as the home app bar */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
        <Image source={LEAF_D} style={{ position: "absolute", top: 0, right: 2, width: 96, height: 96, opacity: 0.4, transform: [{ rotate: "28deg" }] }} resizeMode="contain" />
        <Image source={LEAF_C} style={{ position: "absolute", top: 60, right: 40, width: 58, height: 58, opacity: 0.26, transform: [{ rotate: "76deg" }] }} resizeMode="contain" />
      </View>
      <View className="flex-row items-center" style={{ paddingLeft: 8, paddingRight: 16, paddingTop: 4, paddingBottom: 12, gap: 8 }}>
        <GlassIconButton onPress={back} accessibilityLabel="ย้อนกลับ">
          <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
        </GlassIconButton>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: "white", fontSize: 18, fontWeight: "700", letterSpacing: 0.3, includeFontPadding: false }}>{titleText}</Text>
          {subText ? <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 1, includeFontPadding: false }}>{subText}</Text> : null}
        </View>
        {headerRight}
      </View>
      {/* iPad — extra green breathing room under the app bar, same as the
          main pages' headers. */}
      {isTablet() ? <View style={{ height: 28 }} /> : null}
    </SafeAreaView>
  );
}

// Green header + rounded white content area, shared by every tab screen.
// Full-width bottom nav bar (custom) — solid white, edge-to-edge, with an active
// green capsule. The nested iOS 26 native bar floats/centres (no full-width prop),
// so we draw a guaranteed full-width bar styled to match.
// Green header + rounded white content area, shared by every tab screen.
// Full-width bottom nav bar (custom) — edge-to-edge. The native iOS 26 bar
// auto-sizes to its tab count (can't be forced wider with only 3 tabs), so a
// custom bar is the only way to get a guaranteed full-width 3-tab bar.
// Green header + rounded white content area, shared by every tab screen.
function ShopShell({ children, title, subtitle, onBack, headerRight }: { children: ReactNode; title?: string; subtitle?: string; onBack?: () => void; headerRight?: ReactNode }) {
  return (
    <View className="flex-1" style={{ backgroundColor: BRAND_GREEN }}>
      <StatusBar style="light" />
      <ShopHeader title={title} subtitle={subtitle} onBack={onBack} headerRight={headerRight} />
      <View style={{ flex: 1, backgroundColor: "#fafafa", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" }}>
        {children}
        <BottomFade />
      </View>
    </View>
  );
}

function OverviewScreen() {
  const nav = useNavigation<Nav>();
  const tabBarHeight = useBottomTabBarHeight();
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [sub, setSub] = useState<SectionId>("dashboard");
  // Product-management active tab (lifted so the add FAB adds the right type).
  const [pmType, setPmType] = useState<"regular" | "material">("regular");
  // เรื่องร้องเรียน opens as its own subpage; everything else swaps in-console.
  const selectSection = (id: SectionId) => {
    if (id === "complaints") { nav.navigate("ShopComplaints"); return; }
    if (id === "products_manage") { nav.navigate("ShopProducts"); return; }
    if (id === "orders") { nav.navigate("ShopOrders"); return; }
    if (SHOP_SUBPAGE_SECTIONS.has(id)) { nav.navigate("ShopSection", { section: id }); return; }
    const rk = REPORT_KIND[id];
    if (rk) { nav.navigate("ShopReport", { kind: rk }); return; }
    setSub(id);
  };
  const openMenu = () => nav.navigate("MyShopMenu", { current: sub, onSelect: (id) => selectSection(id as SectionId) });
  const isDash = sub === "dashboard";

  // Sub-sections (คำสั่งซื้อ / สินค้า / PR / PO / ใบเสนอราคา) use the white
  // SubPageHeader — same chrome as the report subpages — instead of the green
  // shop app bar. Dashboard keeps the green "ร้านค้าของฉัน" header.
  if (!isDash) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
        <StatusBar style="dark" />
        <SubPageHeader title={SECTION_LABEL[sub]} onBack={() => setSub("dashboard")} showSearch={false} />
        <OverviewTab
          period={period}
          onPeriodChange={setPeriod}
          insetsBottom={tabBarHeight + (sub === "products_manage" || sub === "flash_sale" ? 84 : 16)}
          sub={sub}
          onOpenMenu={openMenu}
          onSelectSection={selectSection}
          hideMenuButton
          titleInAppBar
          pmType={pmType}
          onPmType={setPmType}
        />
        {/* FAB — expands into the add menu (ผลิตภัณฑ์ / วัตถุดิบ) */}
        {sub === "products_manage" ? (
          <PMAddMenuFab
            bottom={tabBarHeight + 16}
            onAdd={(mode) => nav.navigate("AddProduct", { mode })}
          />
        ) : null}
        {sub === "flash_sale" ? (
          <PMAddFab bottom={tabBarHeight + 16} onPress={() => nav.navigate("FlashAddProduct")} />
        ) : null}
      </View>
    );
  }

  return (
    <ShopShell>
      <OverviewTab
        period={period}
        onPeriodChange={setPeriod}
        insetsBottom={tabBarHeight + 16}
        sub={sub}
        onOpenMenu={openMenu}
        onSelectSection={selectSection}
        hideMenuButton
        titleInAppBar
      />
    </ShopShell>
  );
}

// "การเงิน" tab — same owner-console shell as ภาพรวม, but lands on the finance
// section (กระเป๋าเงิน / ธุรกรรม). Reuses OverviewTab so visuals stay identical.
function FinanceScreen() {
  const nav = useNavigation<Nav>();
  const tabBarHeight = useBottomTabBarHeight();
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [sub, setSub] = useState<SectionId>("finance_overview");
  const selectSection = (id: SectionId) => {
    if (id === "complaints") { nav.navigate("ShopComplaints"); return; }
    if (id === "products_manage") { nav.navigate("ShopProducts"); return; }
    if (id === "orders") { nav.navigate("ShopOrders"); return; }
    if (SHOP_SUBPAGE_SECTIONS.has(id)) { nav.navigate("ShopSection", { section: id }); return; }
    const rk = REPORT_KIND[id];
    if (rk) { nav.navigate("ShopReport", { kind: rk }); return; }
    setSub(id);
  };
  return (
    <ShopShell
      headerRight={
        <GlassIconButton onPress={() => Alert.alert("ดาวน์โหลดเอกสาร", "ส่งออกข้อมูลธุรกรรมเรียบร้อย")} accessibilityLabel="ส่งออกเอกสาร">
          <Download size={22} color="#1a1a1a" strokeWidth={2.4} />
        </GlassIconButton>
      }
    >
      <OverviewTab
        period={period}
        onPeriodChange={setPeriod}
        insetsBottom={tabBarHeight + 16}
        sub={sub}
        onOpenMenu={() => nav.navigate("MyShopMenu", { current: sub, onSelect: (id) => selectSection(id as SectionId) })}
        onSelectSection={selectSection}
        hideHeader
      />
    </ShopShell>
  );
}

// Edit-sheet primitives — mirror AccountInfoScreen's "แก้ไขข้อมูลผู้ใช้" sheet so
// the shop profile editor looks identical (native page-sheet + same field style).
const SHEET_INPUT = { minHeight: 50, backgroundColor: "#f5f5f5", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: "#374151" } as const;

function FieldLabel({ children }: { children: string }) {
  return <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>{children}</Text>;
}

function SheetHeader({ title, onClose, onSave, canSave }: { title: string; onClose: () => void; onSave: () => void; canSave: boolean }) {
  return (
    <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
      <GlassIconButton onPress={onClose} size={44} accessibilityLabel="ปิด">
        <X size={22} color="#1a1a1a" strokeWidth={2.6} />
      </GlassIconButton>
      <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>{title}</Text>
      <GlassIconButton onPress={onSave} disabled={!canSave} size={44} accessibilityLabel="บันทึก" tintColor="rgba(49,151,84,0.22)">
        <Check size={22} color={BRAND_GREEN_DARK} strokeWidth={3} />
      </GlassIconButton>
    </View>
  );
}

// Edit-profile sheet — native page-sheet (same shell as "แก้ไขข้อมูลผู้ใช้"). The
// owner edits the storefront banner, logo, name and description (→ SellerContext).
function ShopProfileEditSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { shopLogoUri, setShopLogoUri, shopBannerUri, setShopBannerUri, shopProfile, setShopProfile } = useSeller();
  const [name, setName] = useState(shopProfile?.shopName ?? SHOP.name);
  const [desc, setDesc] = useState(shopProfile?.description ?? SHOP.description);
  const [logo, setLogo] = useState<string | null>(shopLogoUri);
  const [banner, setBanner] = useState<string | null>(shopBannerUri);

  // Re-sync local fields from context each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setName(shopProfile?.shopName ?? SHOP.name);
    setDesc(shopProfile?.description ?? SHOP.description);
    setLogo(shopLogoUri);
    setBanner(shopBannerUri);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (onPick: (uri: string) => void) => {
    const P = getImagePicker();
    if (!P) { Alert.alert("ยังเปลี่ยนรูปไม่ได้", "ตัวรันนี้ยังไม่มีโมดูลคลังรูป — ต้อง build แอปใหม่จึงจะเปลี่ยนรูปได้"); return; }
    const res = await P.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) onPick(res.assets[0].uri);
  };

  const save = () => {
    setShopLogoUri(logo);
    setShopBannerUri(banner);
    setShopProfile({
      shopName: name.trim() || SHOP.name,
      ownerName: shopProfile?.ownerName ?? "",
      taxId: shopProfile?.taxId ?? "",
      address: shopProfile?.address ?? "",
      email: shopProfile?.email ?? "",
      phone: shopProfile?.phone ?? "",
      description: desc.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <SheetHeader title="แก้ไขโปรไฟล์ร้านค้า" onClose={onClose} onSave={save} canSave={name.trim().length > 0} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
          {/* Banner + logo hero — gradient banner with a floating, shadowed logo
              overlapping its bottom-left (mirrors the real storefront layout). */}
          <View style={{ gap: 10 }}>
            <FieldLabel>แบนเนอร์และโลโก้ร้าน</FieldLabel>
            <View>
              {/* Banner — shows the CURRENT live banner (custom upload, else the
                  storefront's default image) so the preview matches the real shop. */}
              <Pressable onPress={() => pick(setBanner)} className="active:opacity-95" style={{ height: 158, borderRadius: 22, overflow: "hidden", backgroundColor: "#eef7f1" }}>
                <Image source={banner ? { uri: banner } : SHOP.banner} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
                <LinearGradient pointerEvents="none" colors={["transparent", "rgba(0,0,0,0.30)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 72 }} />
                <View style={{ position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.42)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 }}>
                  <Camera size={13} color="#fff" strokeWidth={2.3} />
                  <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#fff" }}>เปลี่ยนแบนเนอร์</Text>
                </View>
              </Pressable>
              {/* Logo — floating, shadowed, overlapping the banner's bottom-left */}
              <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: -48, paddingHorizontal: 18, gap: 13 }}>
                <Pressable onPress={() => pick(setLogo)} className="active:opacity-80">
                  <View style={{ width: 94, height: 94, borderRadius: 47, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 9, elevation: 7 }}>
                    <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: "#eef7f1", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                      {logo ? <Image source={{ uri: logo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <Image source={SHOP.logo} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
                    </View>
                  </View>
                  <View style={{ position: "absolute", bottom: 1, right: 1, width: 31, height: 31, borderRadius: 15.5, backgroundColor: BRAND_GREEN, borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                    <Camera size={14} color="#fff" strokeWidth={2.3} />
                  </View>
                </Pressable>
                <Text style={{ flex: 1, fontSize: 12, color: TEXT_MUTED, lineHeight: 17, marginBottom: 12 }}>แตะโลโก้หรือแบนเนอร์{"\n"}เพื่อเปลี่ยนรูป</Text>
              </View>
            </View>
          </View>

          {/* ชื่อร้านค้า */}
          <View style={{ gap: 8 }}>
            <FieldLabel>ชื่อร้านค้า</FieldLabel>
            <TextInput value={name} onChangeText={setName} placeholder="ชื่อร้านค้า" placeholderTextColor="#a3a3a3" style={SHEET_INPUT} />
          </View>

          {/* รายละเอียดร้านค้า */}
          <View style={{ gap: 8 }}>
            <FieldLabel>รายละเอียดร้านค้า</FieldLabel>
            <TextInput value={desc} onChangeText={setDesc} placeholder="อธิบายร้านค้าของคุณ" placeholderTextColor="#a3a3a3" multiline textAlignVertical="top" style={[SHEET_INPUT, { minHeight: 120, borderRadius: 20, paddingTop: 14 }]} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ShopFrontScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const nav = useNavigation<Nav>();
  const [editOpen, setEditOpen] = useState(false);
  // Storefront = web ShopProfilePage hero: banner + card scroll together (the
  // card overlaps the banner). Floating back/share buttons over the banner.
  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="light" />
      <ShopFrontTab insetsBottom={tabBarHeight + 16} bannerTop={insets.top} />
      {/* Bottom black fade behind the floating native tab bar — same as the other
          owner-console tabs (ShopShell). ShopFront has its own layout, so add it here. */}
      <BottomFade />
      <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 4, left: 8 }}>
        <GlassIconButton onPress={() => (nav.getParent() ?? nav).goBack()} accessibilityLabel="ย้อนกลับ">
          <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
        </GlassIconButton>
      </View>
      {/* Owner is viewing their OWN shop → the top-right action edits the profile
          (not share, which is for customers): opens the profile-edit sheet. */}
      <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 4, right: 8 }}>
        <GlassIconButton onPress={() => setEditOpen(true)} accessibilityLabel="แก้ไขโปรไฟล์">
          <Pencil size={19} color="#1a1a1a" strokeWidth={2.2} />
        </GlassIconButton>
      </View>

      <ShopProfileEditSheet visible={editOpen} onClose={() => setEditOpen(false)} />
    </View>
  );
}

function SettingsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  return (
    <ShopShell>
      <SettingsTab insetsBottom={tabBarHeight + 16} />
    </ShopShell>
  );
}

// Native iOS tab bar — same setup as the app's main tabs; only the 3 destinations
// + labels differ, so iOS 26 renders the identical Liquid Glass / floating bar.
const ShopTab = createNativeBottomTabNavigator();

export function MyShopScreen() {
  return (
    <ShopTab.Navigator
      tabBarActiveTintColor={BRAND_GREEN}
      tabBarInactiveTintColor="#8e8e93"
      translucent={false}
      scrollEdgeAppearance="opaque"
      tabBarStyle={{ backgroundColor: "#ffffff" }}
      minimizeBehavior="never"
      // iPad — same label treatment as the main tab bar (small + Thai Medium);
      // stacked icon-over-label + icon size come from the shared native patch.
      {...(isTablet()
        ? { tabLabelStyle: { fontSize: 11, fontFamily: "IBMPlexSansThaiLooped_500Medium" } }
        : null)}
      screenOptions={{ lazy: false }}
    >
      <ShopTab.Screen name="ShopOverview" component={OverviewScreen} options={{ title: "ภาพรวม", tabBarIcon: () => ({ sfSymbol: "chart.bar.fill" }) }} />
      <ShopTab.Screen name="ShopFinance" component={FinanceScreen} options={{ title: "การเงิน", tabBarIcon: () => ({ sfSymbol: "creditcard.fill" }) }} />
      <ShopTab.Screen name="ShopFront" component={ShopFrontScreen} options={{ title: "หน้าร้านค้า", tabBarIcon: () => ({ sfSymbol: "storefront.fill" }) }} />
      <ShopTab.Screen name="ShopSettings" component={SettingsScreen} options={{ title: "ตั้งค่า", tabBarIcon: () => ({ sfSymbol: "gearshape.fill" }) }} />
    </ShopTab.Navigator>
  );
}

/* ============ Overlap header cards ============ */

function WalletHeroCard() {
  return (
    <View
      style={{
        backgroundColor: BRAND_GREEN,
        borderRadius: 18,
        padding: 16,
        overflow: "hidden",
        shadowColor: BRAND_GREEN,
        shadowOpacity: 0.22,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 16,
        elevation: 4,
      }}
    >
      {/* Decorative wallet illustration — top-right, bleeds off the card edge */}
      <Image
        source={require("../../assets/wallet-illust.png")}
        style={{
          position: "absolute",
          width: 130,
          height: 130,
          top: -14,
          right: -18,
          opacity: 0.9,
        }}
        resizeMode="contain"
      />

      <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
        กระเป๋าตังค์
      </Text>

      <View className="flex-row items-end justify-between" style={{ marginTop: 14, gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>
            ยอดเงินคงเหลือ
          </Text>
          <AnimatedNumber
            value={fmtTHB(WALLET.available)}
            style={{
              color: "white",
              fontSize: 30,
              fontWeight: "800",
              marginTop: 4,
              letterSpacing: -0.5,
            }}
          />
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 }}>
            พร้อมถอนเข้าบัญชี
          </Text>
        </View>

        <Pressable
          className="flex-row items-center justify-center active:opacity-80"
          style={{
            paddingHorizontal: 18,
            height: 36,
            borderRadius: 999,
            backgroundColor: "white",
            gap: 6,
          }}
        >
          <Wallet size={14} color={BRAND_GREEN_DARK} />
          <Text style={{ color: BRAND_GREEN_DARK, fontSize: 13, fontWeight: "700" }}>
            ถอนเงิน
          </Text>
        </Pressable>
      </View>

      <View className="flex-row" style={{ marginTop: 16, gap: 10 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 14,
            padding: 12,
          }}
        >
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Text style={{ color: "white", fontSize: 10 }}>ยอดที่รอปล่อย</Text>
            <Info size={10} color="rgba(255,255,255,0.7)" />
          </View>
          <AnimatedNumber
            value={fmtTHBShort(WALLET.escrow)}
            style={{ color: "white", fontSize: 18, fontWeight: "700", marginTop: 6 }}
          />
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, marginTop: 2 }}>
            {WALLET.escrowOrderCount} คำสั่งซื้อ
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 14,
            padding: 12,
          }}
        >
          <Text style={{ color: "white", fontSize: 10 }}>รายได้สะสม</Text>
          <AnimatedNumber
            value={fmtTHBShort(WALLET.totalIncome)}
            style={{ color: "white", fontSize: 18, fontWeight: "700", marginTop: 6 }}
          />
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, marginTop: 2 }}>
            รายได้สุทธิทั้งหมด
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ============ หน้าร้านค้า (Shop front) ============ */

// Segmented tab control for the storefront — the shared sliding-pill switcher
// (same component the customer ShopScreen + Knowledge-style headers use).
function ShopFrontTabs({
  tab,
  onChange,
  counts,
}: {
  tab: "products" | "herbal" | "reviews";
  onChange: (t: "products" | "herbal" | "reviews") => void;
  counts: Record<"products" | "herbal" | "reviews", number>;
}) {
  return (
    <SegmentedTabs
      tabs={SHOP_TABS.map((tb) => ({ id: tb.id, label: tb.label, count: counts[tb.id] }))}
      active={tab}
      onChange={onChange}
      style={{ marginHorizontal: 16 }}
    />
  );
}

// Storefront — how the shop looks to customers (ported from the web ShopProfilePage):
// cover banner + shop info card (avatar/name/verified/stats) + product grid.
function ShopFrontTab({ insetsBottom, bannerTop = 0 }: { insetsBottom: number; bannerTop?: number }) {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  // Display fields reflect the owner's profile edits (logo / banner / name / desc);
  // fall back to the canonical SHOP defaults when not customized.
  const { shopLogoUri, shopBannerUri, shopProfile } = useSeller();
  const displayName = shopProfile?.shopName || SHOP.name;
  const displayDesc = shopProfile?.description || SHOP.description;
  const bannerSource = shopBannerUri ? { uri: shopBannerUri } : SHOP.banner;
  const META = [
    { Icon: MapPin, t: SHOP.location },
    { Icon: Clock, t: `เข้าร่วม ${SHOP.joined}` },
    { Icon: MessageCircle, t: `ตอบกลับ ${SHOP.responseRate}%` },
  ];
  const STATS = [
    { v: String(SHOP.rating), l: `${fmtNum(SHOP.totalReviews)} รีวิว`, green: true },
    { v: fmtNum(SHOP.followers), l: "ผู้ติดตาม" },
    { v: String(SHOP.totalProducts), l: "สินค้า" },
    { v: SHOP.totalSold, l: "ขายแล้ว" },
  ];
  const [shopTab, setShopTab] = useState<"products" | "herbal" | "reviews">("products");
  // Canonical storefront data — same source the customer-facing ShopScreen uses,
  // so the owner's "หน้าร้านค้า" preview matches the real shop 1:1.
  const herbalMaterials = MATERIALS.filter((m) => m.supplier === SHOP.name);
  const ratingBreakdown = [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: REVIEWS.filter((r) => r.rating === s).length }));
  const BANNER_H = bannerTop + 150;
  const scrollY = useRef(new Animated.Value(0)).current;
  // Stretch the banner on pull-down (overscroll) so no gap shows above it.
  const bannerXf = {
    transform: [
      { translateY: scrollY.interpolate({ inputRange: [-BANNER_H, 0], outputRange: [-BANNER_H / 2, 0], extrapolate: "clamp" as const }) },
      { scale: scrollY.interpolate({ inputRange: [-BANNER_H, 0], outputRange: [2, 1], extrapolate: "clamp" as const }) },
    ],
  };
  return (
    <Animated.ScrollView
      style={{ backgroundColor: "#fafafa" }}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingBottom: 24 + insetsBottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* Banner — scrolls with the content; stretches on pull-down (overscroll) */}
      <View style={{ height: BANNER_H, backgroundColor: "#e5e7eb" }}>
        {/* No gradient/shade on the banner — show the raw image. The floating
            back/share buttons rely on their own glass background for contrast. */}
        <Animated.Image source={bannerSource} style={[{ position: "absolute", top: 0, left: 0, right: 0, height: BANNER_H }, bannerXf]} resizeMode="cover" />
      </View>

      {/* Shop info card — overlaps the banner (web hero) */}
      <View style={{ marginTop: -44, marginHorizontal: 14, backgroundColor: "#fff", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(49,151,84,0.1)", borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {shopLogoUri ? (
                <Image source={{ uri: shopLogoUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : (
                <Image source={SHOP.logo} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              )}
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: "800", color: "#101828" }}>{displayName}</Text>
              {SHOP.verified ? (
                <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(49,151,84,0.1)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                  <ShieldCheck size={12} color={BRAND_GREEN} strokeWidth={2.4} />
                  <Text style={{ fontSize: 10.5, color: BRAND_GREEN, fontWeight: "600" }}>ยืนยันแล้ว</Text>
                </View>
              ) : null}
            </View>
          </View>

          <Text numberOfLines={2} style={{ fontSize: 12.5, color: "#6a7282", marginTop: 10, lineHeight: 18 }}>{displayDesc}</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
            {META.map((m, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <m.Icon size={13} color="#99a1af" strokeWidth={2} />
                <Text style={{ fontSize: 11.5, color: "#6a7282" }}>{m.t}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }}>
            {STATS.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                {i > 0 ? <View style={{ width: 1, height: 28, backgroundColor: "#eee" }} /> : null}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: s.green ? BRAND_GREEN : "#101828" }}>{s.v}</Text>
                  <Text style={{ fontSize: 9.5, color: "#99a1af", marginTop: 1 }}>{s.l}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Tabs — segmented control (same sliding-pill style as the Knowledge page) */}
        <View style={{ marginTop: 18 }}>
          <ShopFrontTabs
            tab={shopTab}
            onChange={setShopTab}
            counts={{ products: SHOP_PRODUCTS.length, herbal: herbalMaterials.length, reviews: REVIEWS.length }}
          />
        </View>

        {shopTab === "products" ? (
          <View style={{ marginTop: 16 }}>
            <ProductsGrid products={SHOP_PRODUCTS} preview />
          </View>
        ) : shopTab === "herbal" ? (
          <View className="flex-row flex-wrap" style={{ marginTop: 16, paddingHorizontal: 16, gap: 14 }}>
            {herbalMaterials.map((m) => (
              <MaterialCard
                key={m.id}
                m={m}
                width={gridCardWidth(gridColumns(190, 32, 14), 32, 14)}
                onPress={() => nav.navigate("HerbalMarketDetail", { id: m.id, preview: true })}
              />
            ))}
          </View>
        ) : (
          <View style={{ marginTop: 16 }}>
            <ReviewsSection reviews={REVIEWS} ratingBreakdown={ratingBreakdown} shopRating={SHOP.rating} totalReviews={SHOP.totalReviews} />
          </View>
        )}
    </Animated.ScrollView>
  );
}

function SettingsTab({ insetsBottom, onScroll }: { insetsBottom: number; onScroll?: ScrollHandler }) {
  const nav = useNavigation<Nav>();
  const { shopLogoUri, shopProfile } = useSeller();
  const displayName = shopProfile?.shopName || SHOP.name;
  return (
    <ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24 + insetsBottom,
        gap: 14,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Shop summary card */}
      <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 16, gap: 14 }}>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <View style={{ width: 54, height: 54, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: DIVIDER_GRAY }}>
            <Image source={shopLogoUri ? { uri: shopLogoUri } : SHOP.logo} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          </View>
          <View style={{ flex: 1 }}>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "700", color: TEXT_PRIMARY, flexShrink: 1 }}>{displayName}</Text>
              {SHOP.verified ? (
                <View style={{ backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "800", color: BRAND_GREEN }}>✓ ยืนยัน</Text>
                </View>
              ) : null}
            </View>
            <View className="flex-row items-center" style={{ gap: 4, marginTop: 3 }}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text numberOfLines={1} style={{ fontSize: 12, color: TEXT_MUTED, flex: 1 }}>{`${SHOP.rating} · ${SHOP.totalReviews} รีวิว · ${SHOP.location}`}</Text>
            </View>
          </View>
        </View>
        <View className="flex-row items-center" style={{ borderTopWidth: 1, borderTopColor: DIVIDER_GRAY, paddingTop: 12 }}>
          <Stat value={String(SHOP.totalProducts)} label="สินค้า" />
          <Divider />
          <Stat value={`${(SHOP.followers / 1000).toFixed(1)}K`} label="ผู้ติดตาม" />
          <Divider />
          <Stat value={SHOP.totalSold} label="ขายแล้ว" />
        </View>
      </View>

      <MenuGroup
        title="ข้อมูลร้านค้า"
        items={[
          { label: "บัญชีร้านค้า", subtitle: "ข้อมูลร้าน เอกสาร และการสมัคร", Icon: Store, tint: "#319754", onPress: () => nav.navigate("ShopAccount") },
          { label: "ที่อยู่ร้านค้า", subtitle: "ที่อยู่สำหรับจัดส่งและออกบิล", Icon: MapPin, tint: "#0088ff", onPress: () => nav.navigate("ShopAddress") },
        ]}
      />
      <MenuGroup
        title="การขายและจัดส่ง"
        items={[
          { label: "การจัดส่ง", subtitle: "ขนส่ง รับที่ร้าน และ COD", Icon: Truck, tint: "#8b5cf6", onPress: () => nav.navigate("ShopShipping") },
          { label: "บัญชีรับเงิน", subtitle: "ธนาคารรับเงินจากการขาย", Icon: Wallet, tint: "#f59e0b", onPress: () => nav.navigate("ShopPayout") },
        ]}
      />
      <MenuGroup
        title="ทั่วไป"
        items={[
          { label: "การแจ้งเตือน", subtitle: "ออเดอร์ โปรโมชัน และระบบ", Icon: Bell, tint: "#ef4444", onPress: () => nav.navigate("ShopNotifications") },
        ]}
      />
    </ScrollView>
  );
}

function MenuGroup({
  title,
  items,
}: {
  title: string;
  items: { label: string; Icon: typeof Package; subtitle?: string; tint?: string; hint?: string; onPress?: () => void }[];
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: 11,
          color: TEXT_MUTED,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          fontWeight: "600",
          marginBottom: 8,
          marginLeft: 4,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: DIVIDER_GRAY,
          overflow: "hidden",
        }}
      >
        {items.map((m, i) => {
          const tint = m.tint ?? BRAND_GREEN;
          return (
            <View key={m.label}>
              {i > 0 ? (
                <View style={{ height: 1, backgroundColor: DIVIDER_GRAY, marginLeft: 64 }} />
              ) : null}
              <Pressable
                onPress={m.onPress}
                className="flex-row items-center active:bg-gray-50"
                style={{ minHeight: 64, paddingHorizontal: 14, gap: 12 }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: `${tint}1a`, alignItems: "center", justifyContent: "center" }}>
                  <m.Icon size={20} color={tint} strokeWidth={2.1} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: TEXT_PRIMARY, fontWeight: "600" }}>{m.label}</Text>
                  {m.subtitle ? (
                    <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{m.subtitle}</Text>
                  ) : null}
                </View>
                {m.hint ? (
                  <Text style={{ fontSize: 11, color: "#f59e0b", fontWeight: "600" }}>{m.hint}</Text>
                ) : null}
                <ChevronRight size={18} color="#c4c4c6" strokeWidth={2.2} />
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
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
            color: highlight ? BRAND_GREEN_DARK : TEXT_PRIMARY,
            lineHeight: 20,
          }}
        >
          {value}
        </Text>
        {star ? <Star size={12} color="#f59e0b" fill="#f59e0b" /> : null}
      </View>
      <Text style={{ fontSize: 10, color: TEXT_DISABLED, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ width: 1, height: 28, backgroundColor: DIVIDER_GRAY }} />;
}

/* ============ Sales heatmap calendar (ported from web OverviewTab) ============ */

const MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const MONTH_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const DAY_NAMES = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

// Per-day sales intensity (1 low → 5 high). Same seed values as the web.
const HEAT_DATA: Record<number, number> = {
  1: 5, 2: 5, 3: 5, 4: 4, 5: 2, 6: 3, 7: 4,
  8: 1, 9: 2, 10: 2, 11: 3, 12: 1, 13: 2, 14: 2,
  15: 1, 16: 5, 17: 3, 18: 4, 19: 2, 20: 1, 21: 1,
  22: 2, 23: 4, 24: 4, 25: 4, 26: 1, 27: 1, 28: 1,
  29: 2, 30: 5, 31: 5,
};
const MONTH_HEAT: Record<number, number> = {
  0: 5, 1: 4, 2: 3, 3: 4, 4: 2, 5: 3, 6: 2, 7: 3, 8: 1, 9: 1, 10: 2, 11: 1,
};

function heatColor(level: number): string {
  switch (level) {
    case 5: return "#ea6549";
    case 4: return "#ee846d";
    case 3: return "rgba(234,101,73,0.5)";
    case 2: return "#fbe0db";
    case 1: return "#fcefec";
    default: return SURFACE_GRAY;
  }
}

// Deterministic mock figures (same seed formula as the web OverviewTab).
const seed = (a: number, b: number) => (a * 137 + b * 293 + 7) % 100;
const dailyVisits = (month: number, day: number) => 50 + seed(month, day) * 3;
const dailyOrders = (month: number, day: number) => 5 + Math.round(seed(month + 3, day) * 0.5);
const dailySales = (month: number, day: number) => 1000 + seed(month + 7, day) * 120;

// ---- Per-day sales line items (the "ดูรายละเอียด" breakdown). Deterministic so
// the same day always shows the same basket; total drives the contextual card.
export type SalesLine = {
  name: string;
  cat: string;
  unit: number;
  qty: number;
  sales: number;
  cost: number;
  image: number;
};

function dayLines(month: number, day: number): SalesLine[] {
  const s0 = seed(month + 5, day);
  const count = 3 + (s0 % 4); // 3–6 distinct products
  const start = s0 % TOP_PRODUCTS.length;
  const lines: SalesLine[] = [];
  for (let i = 0; i < count; i++) {
    const p = TOP_PRODUCTS[(start + i) % TOP_PRODUCTS.length];
    const s = seed(month + i + 1, day + i * 3);
    const qty = 1 + (s % 4); // 1–4 pcs
    const sales = p.unit * qty;
    // Cost ≈ 45% (margin 55%); a rare day sells one item at a loss → red row.
    const lossy = s % 11 === 0;
    const cost = lossy ? Math.round(sales * 1.54) : Math.round(sales * 0.45);
    lines.push({ name: p.name, cat: p.cat, unit: p.unit, qty, sales, cost, image: p.image });
  }
  return lines.sort((a, b) => b.sales - a.sales);
}

// Aggregate a whole month's lines by product (for the monthly/“ดูรายละเอียด” scope).
function monthLines(month: number, year: number): SalesLine[] {
  const dim = new Date(year, month + 1, 0).getDate();
  const byName = new Map<string, SalesLine>();
  for (let d = 1; d <= dim; d++) {
    for (const l of dayLines(month, d)) {
      const cur = byName.get(l.name);
      if (cur) {
        cur.qty += l.qty;
        cur.sales += l.sales;
        cur.cost += l.cost;
      } else {
        byName.set(l.name, { ...l });
      }
    }
  }
  return [...byName.values()].sort((a, b) => b.sales - a.sales);
}

const linesTotal = (ls: SalesLine[]) => ls.reduce((s, l) => s + l.sales, 0);
const linesQty = (ls: SalesLine[]) => ls.reduce((s, l) => s + l.qty, 0);

type CalSel = { month: number; year: number; day: number };

// Segmented monthly/yearly toggle with a green pill that springs between the two
// segments (instead of an instant background swap).
function PeriodToggle({
  period,
  onChange,
}: {
  period: "monthly" | "yearly";
  onChange: (p: "monthly" | "yearly") => void;
}) {
  const SEG_W = 62;
  const anim = useRef(new Animated.Value(period === "monthly" ? 0 : 1)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: period === "monthly" ? 0 : 1,
      useNativeDriver: true,
      friction: 9,
      tension: 90,
    }).start();
  }, [period, anim]);
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, SEG_W] });

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: SURFACE_GRAY,
        borderRadius: 999,
        padding: 3,
      }}
    >
      {/* Sliding indicator */}
      <Animated.View
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          width: SEG_W,
          bottom: 3,
          borderRadius: 999,
          backgroundColor: BRAND_GREEN,
          transform: [{ translateX }],
        }}
      />
      {(["monthly", "yearly"] as const).map((p) => {
        const active = period === p;
        return (
          <Pressable
            key={p}
            onPress={() => onChange(p)}
            className="active:opacity-80"
            style={{
              width: SEG_W,
              paddingVertical: 5,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: active ? "700" : "500",
                color: active ? "white" : TEXT_SECONDARY,
              }}
            >
              {p === "monthly" ? "รายเดือน" : "รายปี"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DashboardCalendar({
  period,
  onPeriodChange,
  sel,
  onChange,
}: {
  period: "monthly" | "yearly";
  onPeriodChange: (p: "monthly" | "yearly") => void;
  // Controlled selection — lifted so the dashboard can re-scope its data.
  sel: CalSel;
  onChange: (next: CalSel) => void;
}) {
  const { month, year, day: selectedDate } = sel;
  const setMonth = (fn: (m: number) => number) => onChange({ ...sel, month: fn(month) });
  const setYear = (fn: (y: number) => number) => onChange({ ...sel, year: fn(year) });
  const setSelectedDate = (d: number) => onChange({ ...sel, day: d });

  // Build month grid (with leading days from previous month for alignment).
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // week starts Monday
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { day: number; inMonth: boolean; heat: number }[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ day: prevMonthDays - startOffset + 1 + i, inMonth: false, heat: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, heat: HEAT_DATA[d] || 0 });
  }
  // Trailing days belong to next month → count from 1, not from cells.length.
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay++, inMonth: false, heat: 0 });
  }

  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: DIVIDER_GRAY,
        padding: 16,
      }}
    >
      {/* Row 1: period label + heat legend (high → low, web order) */}
      <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, color: TEXT_MUTED }}>
          {period === "monthly" ? "ประจำเดือน" : "ประจำปี"}
        </Text>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <Text style={{ fontSize: 10, color: TEXT_MUTED }}>สูง</Text>
          {[5, 4, 3, 2, 1].map((lv) => (
            <View
              key={lv}
              style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: heatColor(lv) }}
            />
          ))}
          <Text style={{ fontSize: 10, color: TEXT_MUTED }}>ต่ำ</Text>
        </View>
      </View>

      {/* Row 2: month/year nav (left) + monthly/yearly toggle (right) */}
      <View className="flex-row items-center justify-between" style={{ marginBottom: 14 }}>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Pressable
            onPress={() =>
              period === "yearly"
                ? setYear((y) => y - 1)
                : setMonth((m) => (m > 0 ? m - 1 : 11))
            }
            hitSlop={8}
            className="active:opacity-60"
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: "#f4f4f4",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={15} color={TEXT_SECONDARY} />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: "700", color: TEXT_PRIMARY }}>
            {period === "yearly" ? year + 543 : `${MONTH_NAMES[month]} ${year + 543}`}
          </Text>
          <Pressable
            onPress={() =>
              period === "yearly"
                ? setYear((y) => y + 1)
                : setMonth((m) => (m < 11 ? m + 1 : 0))
            }
            hitSlop={8}
            className="active:opacity-60"
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: "#f4f4f4",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight size={15} color={TEXT_SECONDARY} />
          </Pressable>
        </View>

        {/* Monthly / Yearly toggle — animated sliding pill */}
        <PeriodToggle period={period} onChange={onPeriodChange} />
      </View>

      {period === "monthly" ? (
        <>
          {/* Day-of-week headers */}
          <View className="flex-row" style={{ marginBottom: 6 }}>
            {DAY_NAMES.map((d) => (
              <Text
                key={d}
                style={{ flex: 1, textAlign: "center", fontSize: 11, color: TEXT_MUTED }}
              >
                {d}
              </Text>
            ))}
          </View>
          {/* Day grid */}
          <View className="flex-row flex-wrap">
            {cells.map((cell, i) => {
              const selected = cell.inMonth && cell.day === selectedDate;
              return (
                <View key={i} style={{ width: `${100 / 7}%`, padding: 2 }}>
                  <Pressable
                    onPress={() => cell.inMonth && setSelectedDate(cell.day)}
                    disabled={!cell.inMonth}
                    className="active:opacity-70"
                    style={{
                      aspectRatio: isTablet() ? 0.8 : 1,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: !cell.inMonth
                        ? "#fafafa"
                        : selected
                          ? "#f1340c"
                          : heatColor(cell.heat),
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: selected ? "700" : "400",
                        color: !cell.inMonth
                          ? "#d4d4d4"
                          : selected
                            ? "white"
                            : TEXT_PRIMARY,
                      }}
                    >
                      {cell.day}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        /* Yearly: 4-col month grid */
        <View className="flex-row flex-wrap">
          {MONTH_SHORT.map((mName, mi) => {
            const selected = mi === month;
            return (
              <View key={mi} style={{ width: "25%", padding: 3 }}>
                <Pressable
                  onPress={() => setMonth(() => mi)}
                  className="active:opacity-70"
                  style={{
                    aspectRatio: isTablet() ? 1.1 : 1.4,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? "#f1340c" : heatColor(MONTH_HEAT[mi] || 0),
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: selected ? "700" : "500",
                      color: selected ? "white" : TEXT_PRIMARY,
                    }}
                  >
                    {mName}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// Custom hamburger that morphs into an X when the menu opens — the 3 bars
// converge to centre, the middle fades, and top/bottom rotate ±45°, so the
// icon literally "opens" into a close affordance (springs back on close).
function AnimatedMenuButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  const p = useRef(new Animated.Value(0)).current; // 0 = ☰, 1 = ✕
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(p, {
      toValue: open ? 1 : 0,
      friction: 6,
      tension: 130,
      useNativeDriver: true,
    }).start();
  }, [open, p]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 150, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const BAR = { position: "absolute" as const, left: 0, right: 0, height: 2, borderRadius: 2, backgroundColor: TEXT_PRIMARY };
  const deg = (a: string, b: string) => p.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const num = (a: number, b: number) => p.interpolate({ inputRange: [0, 1], outputRange: [a, b] });

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={16}
      style={{ width: 28, height: 26, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View style={{ width: 20, height: 16, transform: [{ scale }] }}>
        {/* top bar → rotates to "\" of the X */}
        <Animated.View
          style={[BAR, { top: 2, transform: [{ translateY: num(0, 6) }, { rotate: deg("0deg", "45deg") }] }]}
        />
        {/* middle bar → fades + collapses */}
        <Animated.View
          style={[BAR, { top: 8, opacity: num(1, 0), transform: [{ scaleX: num(1, 0) }] }]}
        />
        {/* bottom bar → rotates to "/" of the X */}
        <Animated.View
          style={[BAR, { top: 14, transform: [{ translateY: num(0, -6) }, { rotate: deg("0deg", "-45deg") }] }]}
        />
      </Animated.View>
    </Pressable>
  );
}

// Minimal white stat card for the finance view — decorated with a corner coin.
function FinStat({ label, value, hint, Icon, coin }: { label: string; value: string; hint: string; Icon: typeof Wallet; coin?: number }) {
  return (
    <View style={{ flex: 1, borderRadius: 16, padding: 14, gap: 6, backgroundColor: "white", borderWidth: 1, borderColor: DIVIDER_GRAY, overflow: "hidden" }}>
      {coin ? (
        <>
          <Image source={coin} resizeMode="contain" style={{ position: "absolute", width: 56, height: 56, right: -10, bottom: -10, opacity: 0.9, transform: [{ rotate: "-12deg" }] }} />
          {/* Fade the coin's bottom edge softly into the white card */}
          <LinearGradient pointerEvents="none" colors={["rgba(255,255,255,0)", "#ffffff"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: "absolute", right: 0, bottom: 0, width: 88, height: 46 }} />
        </>
      ) : null}
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Icon size={14} color={TEXT_MUTED} strokeWidth={2.2} />
        <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: "600", color: TEXT_MUTED, flex: 1 }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 19, fontWeight: "800", color: TEXT_PRIMARY, fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ fontSize: 10.5, color: TEXT_DISABLED }}>{hint}</Text>
    </View>
  );
}

// "ธุรกรรม" view — wallet hero + GP/withdrawn stats + the transaction movement list.
// One settlement row — mirrors the web TransactionsTab columns
// (order no/id, created/paid dates, ยอดรับ / GP / ยอดการชำระเงิน, type pill).
function SettlementCard({ s, onPress }: { s: Settlement; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="active:opacity-70" style={{ backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 14 }}>
      <View>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: BRAND_GREEN }}>{s.orderNo}</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>{s.paid ? `ชำระ ${s.paid}` : "รอชำระเงิน"}</Text>
          <ChevronRight size={18} color="#c4c4c6" strokeWidth={2.2} />
        </View>
        <Text style={{ fontSize: 11, color: TEXT_DISABLED, marginTop: 2 }}>{`ID: ${s.idCode}`}</Text>
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      <View className="flex-row items-end justify-between">
        <View>
          <Text style={{ fontSize: 10.5, color: TEXT_DISABLED }}>ยอดรับ</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a", marginTop: 2, fontVariant: ["tabular-nums"] }}>{fmtBaht(s.gross)}</Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 10.5, color: TEXT_DISABLED }}>GP</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#ef4444", marginTop: 2, fontVariant: ["tabular-nums"] }}>{fmtSigned(s.gp)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 10.5, color: TEXT_DISABLED }}>ยอดการชำระเงิน</Text>
          <Text style={{ fontSize: 15, fontWeight: "800", color: BRAND_GREEN, marginTop: 2, fontVariant: ["tabular-nums"] }}>{fmtBaht(s.payout)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// Breakdown line — label + signed amount (negative = red).
function BkRow({ label, amount, sub }: { label: string; amount: number; sub?: boolean }) {
  return (
    <View className="flex-row items-center justify-between" style={{ paddingVertical: 5 }}>
      <Text style={{ flex: 1, fontSize: 13, color: sub ? TEXT_MUTED : "#0a0a0a", paddingLeft: sub ? 12 : 0 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: amount < 0 ? "#ef4444" : "#0a0a0a", fontVariant: ["tabular-nums"] }}>{fmtSigned(amount)}</Text>
    </View>
  );
}

// Label–value meta row (settlement detail).
function InfoLine({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View className="flex-row items-center justify-between" style={{ paddingVertical: 7, gap: 12 }}>
      <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: valueColor ?? "#0a0a0a", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

// Settlement detail — page-sheet with the full earnings breakdown (web SettlementBreakdownPanel).
function SettlementDetailSheet({ s, onClose }: { s: Settlement; onClose: () => void }) {
  const b = s.breakdown;
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "white" }}>
        <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          <GlassIconButton onPress={onClose} size={44} accessibilityLabel="ปิด">
            <X size={22} color="#1a1a1a" strokeWidth={2.6} />
          </GlassIconButton>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>รายละเอียดการชำระเงิน</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}>
          {/* Order header */}
          <View style={{ paddingVertical: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: BRAND_GREEN }}>หมายเลขคำสั่งซื้อ</Text>
            <View className="flex-row items-center" style={{ marginTop: 4, gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1d5b32", flex: 1 }}>{s.orderNo}</Text>
              <View style={{ borderWidth: 1, borderColor: "rgba(49,151,84,0.25)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10.5, fontWeight: "600", color: BRAND_GREEN }}>คำสั่งซื้อ</Text>
              </View>
            </View>
            <Text style={{ fontSize: 11.5, color: TEXT_DISABLED, marginTop: 4 }}>{`ID: ${s.idCode}`}</Text>
          </View>

          <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

          {/* Meta */}
          <View style={{ paddingVertical: 6 }}>
            <InfoLine label="สถานะ" value={s.status === "settled" ? "ชำระเงินแล้ว" : "รอชำระเงิน"} valueColor={s.status === "settled" ? BRAND_GREEN : "#ff9500"} />
            <InfoLine label="วันที่สร้าง" value={`${s.created} · ${s.time} น.`} />
            <InfoLine label="วันที่ใบแจ้งยอด" value={s.paid ?? "—"} />
          </View>

          <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

          {/* ราคาสุทธิ */}
          <View style={{ paddingTop: 12 }}>
            <View className="flex-row items-center justify-between" style={{ paddingVertical: 4 }}>
              <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#0a0a0a" }}>ราคาสุทธิ</Text>
              <Text style={{ fontSize: 14.5, fontWeight: "700", color: BRAND_GREEN, fontVariant: ["tabular-nums"] }}>{fmtSigned(b.netPrice)}</Text>
            </View>
            <BkRow label="ราคาสินค้า (ก่อนหักส่วนลด)" amount={b.productPrice} sub />
            {b.shopDiscount < 0 ? <BkRow label="ส่วนลดจากร้านค้า" amount={b.shopDiscount} sub /> : null}
            {b.platformDiscount > 0 ? <BkRow label="ส่วนลดจากแพลตฟอร์ม" amount={b.platformDiscount} sub /> : null}
            {b.couponDiscount < 0 ? <BkRow label="ส่วนลดจากคูปอง" amount={b.couponDiscount} sub /> : null}
          </View>

          <View style={{ height: 1, backgroundColor: "#f0f0f0", marginTop: 12 }} />

          {/* ค่าจัดส่ง */}
          <View style={{ paddingTop: 12 }}>
            <View className="flex-row items-center justify-between" style={{ paddingVertical: 4 }}>
              <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#0a0a0a" }}>ค่าจัดส่ง</Text>
              <Text style={{ fontSize: 14.5, fontWeight: "700", color: BRAND_GREEN, fontVariant: ["tabular-nums"] }}>{fmtSigned(b.customerShippingFee + b.platformShippingDiscount)}</Text>
            </View>
            <BkRow label="ค่าขนส่งของลูกค้า" amount={b.customerShippingFee} sub />
            {b.platformShippingDiscount > 0 ? <BkRow label="ส่วนลดค่าขนส่งจากแพลตฟอร์ม" amount={b.platformShippingDiscount} sub /> : null}
          </View>

          <View style={{ height: 1, backgroundColor: "#f0f0f0", marginTop: 12 }} />

          {/* ค่าธรรมเนียมแพลตฟอร์ม */}
          <View style={{ paddingTop: 12 }}>
            <View className="flex-row items-center justify-between" style={{ paddingVertical: 4 }}>
              <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#0a0a0a" }}>ค่าธรรมเนียมแพลตฟอร์ม</Text>
              <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#ef4444", fontVariant: ["tabular-nums"] }}>{fmtSigned(b.commission)}</Text>
            </View>
            <BkRow label="ค่าธรรมเนียม GP (MetaHerb 7%)" amount={b.commission} sub />
          </View>

          <View style={{ height: 1, backgroundColor: "#f0f0f0", marginTop: 12 }} />

          {/* VAT note */}
          <View className="flex-row items-start" style={{ gap: 8, paddingVertical: 12 }}>
            <Info size={14} color="#9ca3af" strokeWidth={2.2} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, color: "#9ca3af", lineHeight: 18 }}>{`ภาษีมูลค่าเพิ่ม VAT 7% (รวมในราคาแล้ว) ≈ ${fmtBaht(b.vat)}`}</Text>
          </View>
        </ScrollView>

        {/* Footer — total payout (floating bar) */}
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "white", borderTopWidth: 1, borderTopColor: DIVIDER_GRAY, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 14 }}>
          <View style={{ backgroundColor: BRAND_GREEN, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "500" }}>จำนวนเงินที่ชำระทั้งหมด</Text>
              <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, marginTop: 1 }}>{s.status === "settled" ? "เข้ากระเป๋าร้านค้าแล้ว" : "รอปล่อยยอด"}</Text>
            </View>
            <Text style={{ color: "white", fontSize: 23, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{fmtBaht(s.payout)}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Compact month dropdown (icon + month + chevron) → glass-ish popover anchored under it.
function MonthSelect({ value, onSelect }: { value: string; onSelect: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ y: 0, right: 12 });
  const ref = useRef<View>(null);
  const { width } = useWindowDimensions();
  const openMenu = () =>
    ref.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ y: y + h + 6, right: Math.max(12, width - x - w) });
      setOpen(true);
    });
  return (
    <View>
      <Pressable ref={ref} onPress={() => (open ? setOpen(false) : openMenu())} className="flex-row items-center active:opacity-70" style={{ gap: 5 }}>
        <Calendar size={13} color={TEXT_MUTED} strokeWidth={2.2} />
        <Text style={{ fontSize: 12.5, fontWeight: "600", color: TEXT_MUTED }}>{value}</Text>
        <ChevronDown size={13} color={TEXT_MUTED} strokeWidth={2.4} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View style={{ position: "absolute", top: anchor.y, right: anchor.right, minWidth: 162, backgroundColor: "white", borderRadius: 14, paddingVertical: 4, borderWidth: 1, borderColor: "#f0f0f0", shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 12 }}>
            {MONTH_OPTIONS.map((m) => {
              const active = m === value;
              return (
                <Pressable key={m} onPress={() => { onSelect(m); setOpen(false); }} className="flex-row items-center active:opacity-50" style={{ paddingHorizontal: 14, height: 42, gap: 8 }}>
                  <View style={{ width: 18 }}>{active ? <Check size={16} color={BRAND_GREEN} strokeWidth={2.8} /> : null}</View>
                  <Text style={{ fontSize: 14, color: "#1c1c1e", fontWeight: active ? "600" : "400" }}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function FinanceTransactionsView() {
  const [tab, setTab] = useState<SettlementStatus>("settled");
  const [selected, setSelected] = useState<Settlement | null>(null);
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const rows = SETTLEMENTS.filter((s) => s.status === tab && s.monthLabel === month);
  const tabs: { id: SettlementStatus; label: string }[] = [
    { id: "settled", label: "ชำระเงินแล้ว" },
    { id: "pending", label: "ที่จะชำระเงิน" },
  ];
  const [segW, setSegW] = useState(0);
  const indicator = useRef(new Animated.Value(0)).current;
  const listFade = useRef(new Animated.Value(1)).current;
  const pillW = segW > 0 ? (segW - 6) / 2 : 0;
  const switchTab = (id: SettlementStatus) => {
    if (id === tab) return;
    setTab(id);
    Animated.timing(indicator, { toValue: id === "settled" ? 0 : 1, duration: 100, useNativeDriver: true }).start();
    listFade.setValue(0);
    Animated.timing(listFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };
  return (
    <>
      {/* Wallet hero — same card as the ภาพรวม dashboard */}
      <WalletHeroCard />

      {/* GP fee + withdrawn */}
      <View className="flex-row" style={{ gap: 10 }}>
        <FinStat label="ค่าธรรมเนียม GP" value={fmtBaht(FINANCE_TOTALS.gpFees)} hint="หักแพลตฟอร์ม 7%" Icon={Percent} coin={require("../../assets/coins/cion1.png")} />
        <FinStat label="ถอนไปแล้ว" value={fmtBaht(FINANCE_TOTALS.withdrawn)} hint="โอนเข้าบัญชีแล้ว" Icon={Banknote} coin={require("../../assets/coins/cion3.png")} />
      </View>

      {/* Settlements — tabs + list (web TransactionsTab) */}
      <View>
        <View className="flex-row items-center justify-between" style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY }}>ธุรกรรม</Text>
          <MonthSelect value={month} onSelect={setMonth} />
        </View>
        <View
          onLayout={(e) => setSegW(e.nativeEvent.layout.width)}
          className="flex-row"
          style={{ backgroundColor: "#eef0ee", borderRadius: 999, padding: 3 }}
        >
          {pillW > 0 ? (
            <Animated.View
              style={{
                position: "absolute",
                top: 3,
                bottom: 3,
                left: 3,
                width: pillW,
                borderRadius: 999,
                backgroundColor: "white",
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 3,
                elevation: 2,
                transform: [{ translateX: indicator.interpolate({ inputRange: [0, 1], outputRange: [0, pillW] }) }],
              }}
            />
          ) : null}
          {tabs.map((tb) => {
            const active = tab === tb.id;
            return (
              <Pressable
                key={tb.id}
                onPress={() => switchTab(tb.id)}
                className="flex-row items-center justify-center active:opacity-80"
                style={{ flex: 1, height: 38, borderRadius: 999 }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#0a0a0a" : TEXT_MUTED }}>{tb.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Animated.View style={{ gap: 10, marginTop: 12, opacity: listFade }}>
          {rows.length > 0 ? (
            rows.map((s) => <SettlementCard key={s.idCode} s={s} onPress={() => setSelected(s)} />)
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 28 }}>
              <Text style={{ fontSize: 13, color: TEXT_DISABLED }}>ไม่มีรายการในเดือนนี้</Text>
            </View>
          )}
        </Animated.View>
        <Text style={{ fontSize: 11.5, color: TEXT_DISABLED, marginTop: 12 }}>{`แถวทั้งหมด: ${rows.length}`}</Text>
      </View>

      {selected ? <SettlementDetailSheet s={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function OverviewTab({
  period,
  onPeriodChange,
  insetsBottom,
  sub,
  onOpenMenu,
  onSelectSection,
  onScroll,
  hideHeader,
  headerRight,
  headerTitle,
  hideMenuButton,
  titleInAppBar,
  pmType,
  onPmType,
}: {
  period: "monthly" | "yearly";
  onPeriodChange: (p: "monthly" | "yearly") => void;
  insetsBottom: number;
  // Active section + the full-screen menu opener, driven from MyShopScreen.
  sub: SectionId;
  onOpenMenu: () => void;
  // Navigate straight to a section (e.g. from the overview menu grid).
  onSelectSection?: (id: SectionId) => void;
  onScroll?: ScrollHandler;
  // Hide the section title + burger menu (e.g. the การเงิน tab is single-purpose).
  hideHeader?: boolean;
  // Optional action shown on the right of the (slim) app bar when hideHeader.
  headerRight?: ReactNode;
  // Page name shown on the left of the app bar when hideHeader.
  headerTitle?: string;
  // Hide the in-content burger (e.g. it's moved onto the ร้านค้าของฉัน app bar).
  hideMenuButton?: boolean;
  // The section title is shown on the green app bar instead of inside the content,
  // so drop the in-content title row (keep only right-side controls like the
  // report date picker).
  titleInAppBar?: boolean;
  // Product-management active tab (controlled by MyShopScreen so the add FAB
  // knows which type to create).
  pmType?: "regular" | "material";
  onPmType?: (t: "regular" | "material") => void;
}) {
  const nav = useNavigation<Nav>();
  const periodLabel = period === "yearly" ? "ปีก่อน" : "เดือนก่อน";
  // Controlled calendar selection — drives every scoped figure below.
  const [cal, setCal] = useState<CalSel>({ month: 0, year: 2026, day: 16 });
  const { month, year, day } = cal;
  // Sales-report scope — lifted so its date picker can ride on the page title row.
  const [salesPeriod, setSalesPeriod] = useState<Period>("daily");
  const [salesDate, setSalesDate] = useState<DateSel>(() => {
    const d = new Date();
    return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() + 543 };
  });

  // ----- Top-level KPI: depend on the selected month (monthly) or whole year.
  const yearlySales = MONTHLY_SALES_DATA.reduce((a, b) => a + b, 0);
  const yearlyVisits = MONTHLY_VISITS.reduce((a, b) => a + b, 0);
  const yearlyOrders = MONTHLY_ORDERS.reduce((a, b) => a + b, 0);
  const kpi = period === "yearly"
    ? { sales: yearlySales, visits: yearlyVisits, orders: yearlyOrders }
    : { sales: MONTHLY_SALES_DATA[month], visits: MONTHLY_VISITS[month], orders: MONTHLY_ORDERS[month] };

  // % change vs previous month (monthly) — simple deterministic mock.
  const prevMonth = month > 0 ? month - 1 : 11;
  const pct = (cur: number, prev: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;
  const delta = period === "yearly"
    ? { sales: 15, visits: 12, orders: 9 }
    : {
        sales: pct(MONTHLY_SALES_DATA[month], MONTHLY_SALES_DATA[prevMonth]),
        visits: pct(MONTHLY_VISITS[month], MONTHLY_VISITS[prevMonth]),
        orders: pct(MONTHLY_ORDERS[month], MONTHLY_ORDERS[prevMonth]),
      };

  // ----- Line-item breakdowns (memoised) — every sales total below is the sum
  // of these, so each card matches its "ดูรายละเอียด" sheet exactly.
  const monthBd = useMemo(() => monthLines(month, year), [month, year]);
  const yearBd = useMemo(() => {
    const byName = new Map<string, SalesLine>();
    for (let m = 0; m < 12; m++)
      for (const l of monthLines(m, year)) {
        const cur = byName.get(l.name);
        if (cur) { cur.qty += l.qty; cur.sales += l.sales; cur.cost += l.cost; }
        else byName.set(l.name, { ...l });
      }
    return [...byName.values()].sort((a, b) => b.sales - a.sales);
  }, [year]);

  // Contextual (small) card: day in monthly view, month in yearly view.
  const ctxLines = period === "yearly" ? monthBd : dayLines(month, day);
  const ctxSales = linesTotal(ctxLines);
  const ctxLabel = period === "yearly"
    ? `${MONTH_NAMES[month]} ${year + 543}`
    : `${day} ${MONTH_SHORT[month]} ${year + 543}`;

  // Big sales card: month in monthly view, year in yearly view.
  const bigLines = period === "yearly" ? yearBd : monthBd;
  const bigSales = linesTotal(bigLines);

  // Sales-breakdown sheet state (opened by the "ดูรายละเอียด" buttons).
  const [salesSheet, setSalesSheet] = useState<{
    title: string;
    lines: SalesLine[];
  } | null>(null);
  const openContextSheet = () =>
    setSalesSheet({ title: `รายการขาย ${ctxLabel}`, lines: ctxLines });
  const openSalesSheet = () =>
    setSalesSheet({
      title:
        period === "yearly"
          ? `รายการขาย ปี ${year + 543}`
          : `รายการขาย ${MONTH_NAMES[month]} ${year + 543}`,
      lines: bigLines,
    });

  // ----- Top products / customers RE-SCOPED to the selection (web logic:
  // rotate the base list by a seed + scale down for a day-level view).
  const scopeSeed = period === "monthly"
    ? seed(month + 13, day)
    : seed(year + 17, month);
  const scopeScale = period === "monthly" ? 1 / 30 : 1;
  const rotate = <T,>(arr: T[], by: number) => [...arr.slice(by), ...arr.slice(0, by)];

  const topProducts = rotate(TOP_PRODUCTS, scopeSeed % TOP_PRODUCTS.length)
    .map((p, i) => ({
      ...p,
      sold: Math.max(1, Math.round(p.sold * scopeScale * (1 - i * 0.04))),
      revenue: Math.max(1, Math.round(p.revenue * scopeScale * (1 - i * 0.04))),
    }))
    .sort((a, b) => b.sold - a.sold);

  const topCustomers = rotate(TOP_CUSTOMERS, (scopeSeed + 3) % TOP_CUSTOMERS.length)
    .map((c, i) => ({
      ...c,
      orders: Math.max(1, Math.round(c.orders * scopeScale * (1 - i * 0.04))),
      total: Math.max(1, Math.round(c.total * scopeScale * (1 - i * 0.04))),
    }))
    .sort((a, b) => b.orders - a.orders);

  const maxSold = Math.max(...topProducts.map((p) => p.sold));
  const maxCustomerOrders = Math.max(...topCustomers.map((c) => c.orders));

  const contextualSalesCard = (
    <LinearGradient
      colors={["#ffffff", "#fef9f0"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#f0e6d4",
        padding: 16,
        ...(isTablet()
          ? ({
              padding: 20,
              shadowColor: "#f59e0b",
              shadowOpacity: 0.1,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            } as const)
          : null),
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text style={{ fontSize: isTablet() ? 13.5 : 12, color: TEXT_DISABLED }} numberOfLines={1}>
          ยอดขาย {ctxLabel}
        </Text>
        <View
          style={{
            width: isTablet() ? 38 : 32,
            height: isTablet() ? 38 : 32,
            borderRadius: 19,
            backgroundColor: "rgba(245,158,11,0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PlusCircle size={isTablet() ? 19 : 16} color="#f59e0b" />
        </View>
      </View>
      <View className="flex-row items-baseline" style={{ marginTop: 8, gap: 6 }}>
        <AnimatedNumber
          value={fmtNum(ctxSales)}
          style={{ fontSize: isTablet() ? 24 : 26, fontWeight: "800", color: "#1a1a1a", letterSpacing: -0.5 }}
        />
        <Text style={{ fontSize: isTablet() ? 14.5 : 13, color: TEXT_DISABLED }}>บาท</Text>
      </View>
      <View className="flex-row items-center justify-between">
        <DeltaRow
          value={delta.sales}
          label={period === "yearly" ? "เดือนก่อน" : "วันก่อน"}
        />
        <DetailButton onPress={openContextSheet} />
      </View>
    </LinearGradient>
  );

  const kpiPair = (
    <View className="flex-row" style={{ gap: 10 }}>
      <KpiCard
        label={period === "yearly" ? "ยอดเข้าชมรายปี" : "ยอดเข้าชมรายเดือน"}
        value={fmtNum(kpi.visits)}
        unit="ครั้ง"
        delta={delta.visits}
        deltaLabel={periodLabel}
        accent="#319754"
        Icon={Eye}
      />
      <KpiCard
        label={period === "yearly" ? "คำสั่งซื้อรายปี" : "คำสั่งซื้อรายเดือน"}
        value={fmtNum(kpi.orders)}
        unit="รายการ"
        delta={delta.orders}
        deltaLabel={periodLabel}
        accent="#3b82f6"
        Icon={ShoppingBag}
      />
    </View>
  );

  // Sub-level KPI — daily (monthly view) / monthly (yearly view), updates on selection.
  const subKpiPair = (
    <View className="flex-row" style={{ gap: 10 }}>
      <KpiCard
        label={period === "yearly" ? "ยอดเข้าชมรายเดือน" : "ยอดเข้าชมรายวัน"}
        value={fmtNum(period === "yearly" ? MONTHLY_VISITS[month] : dailyVisits(month, day))}
        unit="ครั้ง"
        delta={delta.visits}
        deltaLabel={period === "yearly" ? "เดือนก่อน" : "วันก่อน"}
        accent="#f59e0b"
        Icon={Eye}
      />
      <KpiCard
        label={period === "yearly" ? "คำสั่งซื้อรายเดือน" : "คำสั่งซื้อรายวัน"}
        value={fmtNum(period === "yearly" ? MONTHLY_ORDERS[month] : dailyOrders(month, day))}
        unit="รายการ"
        delta={delta.orders}
        deltaLabel={period === "yearly" ? "เดือนก่อน" : "วันก่อน"}
        accent="#8b5cf6"
        Icon={ShoppingBag}
      />
    </View>
  );

  const salesCard = (
    <LinearGradient
      colors={["#ffffff", "#f0faf3"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e0f0e5",
        padding: 16,
        // iPad split layout: web card's soft green glow + roomier padding.
        ...(isTablet()
          ? ({
              padding: 20,
              shadowColor: "#319754",
              shadowOpacity: 0.1,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            } as const)
          : null),
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text style={{ fontSize: isTablet() ? 13.5 : 12, color: "#3d7d52", fontWeight: "500" }}>
          {period === "yearly" ? "ยอดขายรายปี" : "ยอดขายรายเดือน"}
        </Text>
        <View
          style={{
            width: isTablet() ? 38 : 32,
            height: isTablet() ? 38 : 32,
            borderRadius: 19,
            backgroundColor: "rgba(49,151,84,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <DollarSign size={isTablet() ? 19 : 16} color="#287745" />
        </View>
      </View>
      <View className="flex-row items-baseline" style={{ marginTop: 8, gap: 6 }}>
        <AnimatedNumber
          value={fmtNum(bigSales)}
          style={{
            fontSize: isTablet() ? 24 : 28,
            fontWeight: "800",
            color: "#287745",
            letterSpacing: -0.5,
          }}
        />
        <Text style={{ fontSize: isTablet() ? 14.5 : 13, color: "rgba(61,125,82,0.8)" }}>บาท</Text>
      </View>
      <View className="flex-row items-center justify-between">
        <DeltaRow value={delta.sales} label={periodLabel} />
        <DetailButton onPress={openSalesSheet} />
      </View>
    </LinearGradient>
  );

  const orderTrackingCard = (
    <SectionCard
      title="ออเดอร์ล่าสุด"
      count={ORDER_STATUS.reduce((a, b) => a + b.count, 0)}
      onSeeAll={() => nav.navigate("ShopOrders")}
    >
      {/* iPad: all 6 stages fit one row; phones wrap 3-per-row into two rows. */}
      <View
        className="flex-row flex-wrap"
        style={{ justifyContent: "space-between", rowGap: 8 }}
      >
        {ORDER_STATUS.map((s) => (
          <StatusTile key={s.id} {...s} width={isTablet() ? "15.8%" : "31.5%"} onPress={() => nav.navigate("ShopOrders", { initialFilter: s.id })} />
        ))}
      </View>
    </SectionCard>
  );

  const quotationCard = (
    <SectionCard
      title="สถานะใบเสนอราคา"
      count={QUOTATION_STATUS.reduce((a, b) => a + b.count, 0)}
      onSeeAll={() => nav.navigate("ShopSection", { section: "hm_quotations" })}
    >
      <View className="flex-row" style={{ justifyContent: "space-between" }}>
        {QUOTATION_STATUS.map((s) => (
          <StatusTile key={s.id} {...s} width="31.5%" onPress={() => nav.navigate("ShopSection", { section: "hm_quotations", initialFilter: s.id })} />
        ))}
      </View>
    </SectionCard>
  );

  const trialCard = (
    <SectionCard
      title="สถานะสินค้าทดลอง"
      count={TRIAL_STATUS.reduce((a, b) => a + b.count, 0)}
      onSeeAll={() => nav.navigate("ShopSection", { section: "trials_products" })}
    >
      <View className="flex-row" style={{ justifyContent: "space-between" }}>
        {TRIAL_STATUS.map((s) => (
          <StatusTile key={s.id} {...s} width="31.5%" onPress={() => nav.navigate("ShopSection", { section: "trials_products" })} />
        ))}
      </View>
    </SectionCard>
  );

  const topProductsCard = (
    <TopListCard
      title="Top Product"
      subtitle={`อันดับสินค้าขายดี · ${ctxLabel}`}
      mainLabel="สินค้า"
      metricLabel="ยอดขาย(ชิ้น)"
      valueLabel="รายได้ (฿)"
    >
      {topProducts.map((p, i) => (
        <TopRow
          key={p.name}
          rank={i + 1}
          image={p.image}
          title={p.name}
          sub={p.cat}
          barRatio={p.sold / maxSold}
          metric={fmtNum(p.sold)}
          value={fmtNum(p.revenue)}
        />
      ))}
    </TopListCard>
  );

  const topCustomersCard = (
    <TopListCard
      title="Top Customers"
      subtitle={`ยอดขายลูกค้าประจำ · ${ctxLabel}`}
      mainLabel="ลูกค้า"
      metricLabel="คำสั่งซื้อ"
      valueLabel="ยอดรวม (฿)"
    >
      {topCustomers.map((c, i) => (
        <TopRow
          key={c.email}
          rank={i + 1}
          title={c.name}
          sub={c.email}
          barRatio={c.orders / maxCustomerOrders}
          metric={fmtNum(c.orders)}
          value={fmtNum(c.total)}
        />
      ))}
    </TopListCard>
  );

  // Flash Sale has its own scroll layout (sticky filter) — render it directly.
  if (sub === "flash_sale") return <FlashSaleSection insetsBottom={insetsBottom} />;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      stickyHeaderIndices={[0]}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 24 + insetsBottom,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* [0] Section heading + menu — pins to the top (step 2). ALL spacing around
          the title lives on this header so the title↔content gap is identical
          whether resting or pinned. Hidden on single-purpose tabs (การเงิน) —
          still index 0 so stickyHeaderIndices stays valid (thin spacer instead). */}
      {hideHeader ? (
        headerTitle || headerRight ? (
          <View className="flex-row items-center justify-between" style={{ backgroundColor: "#fafafa", paddingTop: 14, paddingBottom: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: TEXT_PRIMARY }}>{headerTitle}</Text>
            {headerRight}
          </View>
        ) : (
          <View style={{ height: 16, backgroundColor: "#fafafa" }} />
        )
      ) : sub === "dashboard" ? (
        <View style={{ height: 16, backgroundColor: "#fafafa" }} />
      ) : titleInAppBar ? (
        // Title lives on the app bar — keep only right-side controls (date picker).
        sub.startsWith("report_") ? (
          <View className="flex-row items-center justify-end" style={{ backgroundColor: "#fafafa", paddingTop: 14, paddingBottom: 14 }}>
            <SalesDatePicker period={salesPeriod} sel={salesDate} onChange={setSalesDate} />
          </View>
        ) : (
          <View style={{ height: 14, backgroundColor: "#fafafa" }} />
        )
      ) : (
        <View
          className="flex-row items-center justify-between"
          style={{ backgroundColor: "#fafafa", paddingTop: 14, paddingBottom: 14 }}
        >
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 20, fontWeight: "700", color: TEXT_PRIMARY }}>
            {SECTION_LABEL[sub]}
          </Text>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {sub.startsWith("report_") ? <SalesDatePicker period={salesPeriod} sel={salesDate} onChange={setSalesDate} /> : null}
            {hideMenuButton ? null : <AnimatedMenuButton open={false} onPress={onOpenMenu} />}
          </View>
        </View>
      )}

      {/* Content wrapper holds the 14px rhythm; the header sits outside it so the
          first gap isn't doubled (header padding + wrapper gap). */}
      <View style={{ gap: 14 }}>

      {/* ===== Per-section content (order mirrors the web OverviewTab) ===== */}
      {sub === "dashboard" ? (
        <>
          <ShopMenuGrid onSelect={onSelectSection} />
          <MetaManagerCard onPress={() => nav.navigate("ShopManagerChat")} />
          <Text style={{ fontSize: 16, fontWeight: "700", color: TEXT_PRIMARY, marginTop: 10, marginBottom: -6 }}>ภาพรวม</Text>
          {orderTrackingCard}
          {/* iPad: quotation (left) + trial (right) share a row; phones stack. */}
          {isTablet() ? (
            <View className="flex-row" style={{ gap: 14 }}>
              <View style={{ flex: 1 }}>{quotationCard}</View>
              <View style={{ flex: 1 }}>{trialCard}</View>
            </View>
          ) : (
            <>
              {quotationCard}
              {trialCard}
            </>
          )}
          {/* iPad: heatmap calendar (left) + KPI stack (right), like the web
              dashboard's "Calendar + Stats" split. Phones keep the stack. */}
          {isTablet() ? (
            // The calendar's natural height drives the row; the KPI column is
            // absolute-filled to that exact height so its four flex:1 blocks
            // split it evenly (flex children inside an auto-height column
            // collapse under Yoga — the absolute fill gives them a definite
            // height to divide).
            <View className="flex-row" style={{ gap: 14 }}>
              {/* iPad: taller day cells give the calendar (and thus the whole
                  row) more height — the KPI stack follows automatically. */}
              <View style={{ flex: 1 }}>
                <DashboardCalendar
                  period={period}
                  onPeriodChange={onPeriodChange}
                  sel={cal}
                  onChange={setCal}
                />
              </View>
              <View style={{ flex: 1, gap: 14 }}>
                {salesCard}
                {kpiPair}
                {subKpiPair}
                {contextualSalesCard}
              </View>
            </View>
          ) : (
            <>
              <DashboardCalendar
                period={period}
                onPeriodChange={onPeriodChange}
                sel={cal}
                onChange={setCal}
              />
              {salesCard}
              {kpiPair}
              {subKpiPair}
              {contextualSalesCard}
            </>
          )}
          {topProductsCard}
          {topCustomersCard}
        </>
      ) : null}

      {sub === "orders" ? <OrdersSection /> : null}

      {sub === "products_manage" ? <ProductsManageSection type={pmType ?? "regular"} setType={onPmType ?? (() => {})} /> : null}


      {sub === "report_sales" ? <ShopSalesReportView period={salesPeriod} setPeriod={setSalesPeriod} dateSel={salesDate} /> : null}

      {sub === "report_customers" ? <ShopReportView kind="customers" period={salesPeriod} setPeriod={setSalesPeriod} dateSel={salesDate} /> : null}
      {sub === "report_products" ? <ShopReportView kind="products" period={salesPeriod} setPeriod={setSalesPeriod} dateSel={salesDate} /> : null}
      {sub === "report_market" ? <ShopReportView kind="market" period={salesPeriod} setPeriod={setSalesPeriod} dateSel={salesDate} /> : null}

      {sub === "finance_overview" ? <FinanceTransactionsView /> : null}

      {/* Herbal Market documents — quotation / PR / PO */}
      {sub === "hm_quotations" ? <QuotationSection /> : null}
      {sub === "hm_pr" ? <DocSection kind="pr" /> : null}
      {sub === "hm_po" ? <DocSection kind="po" /> : null}

      {/* เรื่องร้องเรียน — owner view (linked to customer แจ้งปัญหาสินค้า) */}

      {/* สินค้าทดลอง — ทะเบียนสินค้าทดลอง (ported from web owner console) */}
      {sub === "trials_products" ? <TrialRegistryOwnerSection /> : null}

      {/* สินค้าทดลอง — ติดตามสินค้าทดลอง (registration roster, ported from web) */}
      {sub === "trials_tracking" ? <TrialTrackingOwnerSection /> : null}

      {/* โปรโมชั่น — list/manage view (ported from web PromotionsTab) */}
      {sub === "promotions" ? <PromotionsOwnerSection /> : null}

      {/* คูปอง — list/manage view (ported from web CouponsTab) */}
      {sub === "coupons" ? <CouponsOwnerSection /> : null}

      {/* Sections without a dedicated mockup view yet */}
      {sub === "report_market" ||
      sub === "finance_tx" ? (
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: DIVIDER_GRAY,
            paddingVertical: 48,
            alignItems: "center",
          }}
        >
          <Info size={32} color="#d4d4d4" />
          <Text style={{ marginTop: 12, fontSize: 14, color: TEXT_MUTED }}>
            {SECTION_LABEL[sub]} · กำลังพัฒนา
          </Text>
        </View>
      ) : null}
      </View>


      {/* Sales breakdown sheet — opened by "ดูรายละเอียด" on the sales cards */}
      <SalesBreakdownSheet
        data={salesSheet}
        onClose={() => setSalesSheet(null)}
      />
    </ScrollView>

    {/* Floating "เพิ่มสินค้าทดลอง" FAB — only on the ทะเบียนสินค้าทดลอง section.
        Fixed bottom-right, expanded pill (Fitts's Law: large always-reachable target). */}
    {sub === "trials_products" ? (
      <Pressable
        onPress={() => nav.navigate("TrialAddProduct")}
        accessibilityLabel="เพิ่มสินค้าทดลอง"
        className="items-center justify-center active:opacity-90"
        style={{
          position: "absolute",
          right: 16,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: BRAND_GREEN,
          shadowColor: "#000",
          shadowOpacity: 0.22,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Plus size={26} color="#fff" strokeWidth={2.6} />
      </Pressable>
    ) : null}

    {/* Floating "สร้างโปรโมชั่น" FAB — only on the โปรโมชั่น section. */}
    {sub === "promotions" ? (
      <Pressable
        onPress={() => nav.navigate("PromotionCreate")}
        accessibilityLabel="สร้างโปรโมชั่น"
        className="items-center justify-center active:opacity-90"
        style={{
          position: "absolute",
          right: 16,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: BRAND_GREEN,
          shadowColor: "#000",
          shadowOpacity: 0.22,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Plus size={26} color="#fff" strokeWidth={2.6} />
      </Pressable>
    ) : null}

    {/* Floating "สร้างคูปอง" FAB — only on the คูปอง section. */}
    {sub === "coupons" ? (
      <Pressable
        onPress={() => nav.navigate("CouponCreate")}
        accessibilityLabel="สร้างคูปอง"
        className="items-center justify-center active:opacity-90"
        style={{
          position: "absolute",
          right: 16,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: BRAND_GREEN,
          shadowColor: "#000",
          shadowOpacity: 0.22,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Plus size={26} color="#fff" strokeWidth={2.6} />
      </Pressable>
    ) : null}
    </View>
  );
}

/* ============ Sales breakdown sheet ("ดูรายละเอียด") ============ */

// Responsive product-sales grid inside a bottom sheet:
//   • phone  → 1 column (readable, big tap targets — Fitts's Law)
//   • large phone / small tablet → 2 columns
//   • iPad   → 3 columns
// Laws: Jakob's (matches the web popup), Law of Proximity (each product is a
// self-contained card), Aesthetic-Usability, Doherty (animated sheet < 250ms).
function SalesBreakdownSheet({
  data,
  onClose,
}: {
  data: { title: string; lines: SalesLine[] } | null;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  // Min card width controls column count via flex-wrap: ~1 col on phones,
  // 2 on large phones / small tablets, 3 on iPad — fully fluid.
  const minCardW = width >= 600 ? 240 : 9999; // 9999 → force single column on phones
  const lines = data?.lines ?? [];
  const total = linesTotal(lines);
  const qty = linesQty(lines);

  return (
    <BottomSheet
      visible={!!data}
      onClose={onClose}
      title={data?.title ?? ""}
      minHeightRatio={0.7}
      maxHeightRatio={0.7}
    >
      {/* Summary line */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ fontSize: 13, color: TEXT_MUTED }}>
          ยอดรวม{" "}
          <Text style={{ color: BRAND_GREEN, fontWeight: "700" }}>
            {fmtNum(total)} บาท
          </Text>{" "}
          · {fmtNum(qty)} ชิ้น · {lines.length} รายการ
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 12 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: "#fafafa" }}
      >
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {lines.map((l, i) => (
            <View
              key={i}
              style={{ flexGrow: 1, flexBasis: 0, minWidth: minCardW === 9999 ? "100%" : minCardW }}
            >
              <SalesLineCard line={l} />
            </View>
          ))}
        </View>
        {lines.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: TEXT_DISABLED }}>
              ไม่มีรายการขายในช่วงนี้
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

function SalesLineCard({ line }: { line: SalesLine }) {
  const profit = line.sales - line.cost;
  const margin = line.sales > 0 ? (profit / line.sales) * 100 : 0;
  const loss = profit < 0;
  const profitColor = loss ? "#dc2626" : "#15803d";
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: DIVIDER_GRAY,
        padding: 14,
      }}
    >
      {/* Identity */}
      <View className="flex-row" style={{ gap: 10 }}>
        <Image
          source={line.image}
          style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: SURFACE_GRAY }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}
            numberOfLines={1}
          >
            {line.name}
          </Text>
          <Text style={{ fontSize: 11, color: TEXT_DISABLED }} numberOfLines={1}>
            {line.cat}
          </Text>
          <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>
            {fmtNum(line.unit)} ฿/ชิ้น
          </Text>
        </View>
      </View>

      {/* Metrics: qty · sales · cost */}
      <View
        className="flex-row"
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: "#f5f5f5",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: TEXT_DISABLED }}>จำนวน</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a", marginTop: 2 }}>
            {fmtNum(line.qty)} <Text style={{ fontSize: 10, color: TEXT_DISABLED }}>ชิ้น</Text>
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: TEXT_DISABLED }}>ยอดขาย</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: BRAND_GREEN, marginTop: 2 }}>
            ฿{fmtNum(line.sales)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: TEXT_DISABLED }}>ต้นทุน</Text>
          <Text style={{ fontSize: 14, fontWeight: "500", color: TEXT_SECONDARY, marginTop: 2 }}>
            ฿{fmtNum(line.cost)}
          </Text>
        </View>
      </View>

      {/* Profit / margin */}
      <View
        className="flex-row items-center justify-between"
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: "#f5f5f5",
        }}
      >
        <Text style={{ fontSize: 11, color: TEXT_DISABLED }}>กำไร / มาร์จิ้น</Text>
        <Text style={{ fontSize: 14, fontWeight: "700", color: profitColor }}>
          ฿{fmtNum(profit)}{" "}
          <Text style={{ fontSize: 11 }}>· {margin.toFixed(1)}%</Text>
        </Text>
      </View>
    </View>
  );
}

// "ดูรายละเอียด" pill — used on the gradient sales cards (web parity).
function DetailButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center active:opacity-70"
      style={{
        marginTop: 8,
        height: isTablet() ? 34 : 30,
        paddingHorizontal: isTablet() ? 14 : 12,
        borderRadius: 999,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: BORDER_GRAY,
        gap: 4,
      }}
    >
      <Eye size={isTablet() ? 13.5 : 12} color={TEXT_SECONDARY} />
      <Text style={{ fontSize: isTablet() ? 12.5 : 11, fontWeight: "600", color: TEXT_SECONDARY }}>
        ดูรายละเอียด
      </Text>
    </Pressable>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: DIVIDER_GRAY,
        padding: 16,
      }}
    >
      {children}
    </View>
  );
}

function SectionCard({
  title,
  count,
  onSeeAll,
  children,
}: {
  title: string;
  /** Gray "ทั้งหมด N" label shown right after the title (web pattern). */
  count?: number;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: DIVIDER_GRAY,
        padding: 16,
      }}
    >
      <View
        className="flex-row items-center justify-between"
        style={{ marginBottom: 12, gap: 8 }}
      >
        {/* Left group: title + gray "ทั้งหมด N" */}
        <View className="flex-row items-center" style={{ gap: 8, flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY }}
          >
            {title}
          </Text>
          {typeof count === "number" ? (
            <Text style={{ fontSize: 11, color: TEXT_DISABLED }}>
              ทั้งหมด {fmtNum(count)}
            </Text>
          ) : null}
        </View>

        {/* Right: ดูทั้งหมด link */}
        {onSeeAll ? (
          <Pressable
            onPress={onSeeAll}
            hitSlop={8}
            className="flex-row items-center active:opacity-60"
            style={{ gap: 2 }}
          >
            <Text style={{ fontSize: 12, color: BRAND_GREEN_DARK, fontWeight: "600" }}>
              ดูทั้งหมด
            </Text>
            <ChevronRight size={14} color={BRAND_GREEN_DARK} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function KpiCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  accent,
  Icon,
}: {
  label: string;
  value: string;
  unit: string;
  delta: number;
  deltaLabel: string;
  accent: string;
  Icon: typeof Eye;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: DIVIDER_GRAY,
        padding: 14,
        ...(isTablet()
          ? ({
              padding: 18,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 1 },
              elevation: 1,
            } as const)
          : null),
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text style={{ fontSize: isTablet() ? 13 : 11, color: TEXT_DISABLED }} numberOfLines={1}>
          {label}
        </Text>
        <View
          style={{
            width: isTablet() ? 34 : 28,
            height: isTablet() ? 34 : 28,
            borderRadius: isTablet() ? 17 : 14,
            backgroundColor: `${accent}1A`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={isTablet() ? 17 : 14} color={accent} />
        </View>
      </View>
      <View className="flex-row items-baseline" style={{ marginTop: 8, gap: 4 }}>
        <AnimatedNumber
          value={value}
          style={{
            fontSize: isTablet() ? 24 : 24,
            fontWeight: "800",
            color: "#1a1a1a",
            letterSpacing: -0.3,
          }}
        />
        <Text style={{ fontSize: isTablet() ? 13.5 : 12, color: TEXT_DISABLED }}>{unit}</Text>
      </View>
      <DeltaRow value={delta} label={deltaLabel} compact />
    </View>
  );
}

function DeltaRow({
  value,
  label,
  compact,
}: {
  value: number;
  label: string;
  compact?: boolean;
}) {
  const up = value >= 0;
  const color = up ? BRAND_GREEN : "#ea6549";
  const Arrow = up ? TrendingUp : TrendingDown;
  return (
    <View className="flex-row items-center" style={{ marginTop: 6, gap: 4 }}>
      <Arrow size={(compact ? 11 : 13) + (isTablet() ? 2 : 0)} color={color} />
      <Text style={{ color, fontSize: (compact ? 11 : 12) + (isTablet() ? 1.5 : 0), fontWeight: "600" }}>
        {Math.abs(value)}%
      </Text>
      <Text style={{ color: TEXT_DISABLED, fontSize: (compact ? 10 : 11) + (isTablet() ? 1.5 : 0) }} numberOfLines={1}>
        เทียบกับ{label}
      </Text>
    </View>
  );
}

function StatusTile({
  label,
  count,
  accent,
  Icon,
  width,
  onPress,
}: {
  label: string;
  count: number;
  accent: string;
  Icon: typeof Wallet;
  width: number | string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-70"
      style={{
        width: width as never,
        backgroundColor: "#fafbfc",
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: "transparent",
      }}
    >
      <View className="flex-row items-center justify-between" style={{ gap: 4 }}>
        <Text
          style={{ fontSize: 10, color: TEXT_SECONDARY, flexShrink: 1 }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: `${accent}1A`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={12} color={accent} />
        </View>
      </View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "800",
          color: TEXT_PRIMARY,
          marginTop: 6,
          letterSpacing: -0.3,
        }}
      >
        {count}
      </Text>
    </Pressable>
  );
}

// ===================== HERBAL MARKET DOCS (QT / PR / PO) =====================
// B2B documents from the Herbal Market. Same card language as the orders, with
// a counterparty company, raw-material line items and VAT totals.
export type DocKind = "qt" | "pr" | "po";

type DocItem = {
  name: string; grade: string; qty: number; unit: string; pricePerUnit: number;
  erpCode?: string;   // ERP item code (shown on the PR detail line)
  vendor?: string;    // ผู้ขาย — defaults to our store
  itemNote?: string;  // per-line note (e.g. "ตัวเลือก 1")
};
export type MarketDoc = {
  id: string;
  status: string;
  date: string;
  company: string;
  taxId?: string;
  contact: string;
  phone: string;
  email?: string;
  address: string;
  paymentTerms: string;
  note?: string;
  items: DocItem[];
  // QT only
  validUntil?: string;
  daysRemaining?: number;
  poNumber?: string;
  // PR / PO
  needBy?: string; // requiredBy (PR) / deliveryDate (PO)
  refId?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  // PR detail (web PRDetailTab fields)
  priority?: string;       // ความเร่งด่วน
  approver?: string;       // ผู้อนุมัติ
  validityDays?: number;   // ระยะเวลาใบ PR
  description?: string;    // รายละเอียด
  justification?: string;  // เหตุผลในการขออนุมัติ
};

// Status pill colors per document kind (ported from the web *_STATUS_CFG).
export const DOC_STATUS: Record<DocKind, Record<string, { label: string; color: string }>> = {
  qt: {
    sent: { label: "รอตอบกลับ", color: "#f59e0b" },
    accepted: { label: "ตอบรับแล้ว", color: "#10b981" },
    expired: { label: "หมดอายุ", color: "#9ca3af" },
    rejected: { label: "ปฏิเสธ", color: "#ef4444" },
  },
  pr: {
    received: { label: "PR ใหม่", color: "#ff9500" },
    converted: { label: "ออก PO แล้ว", color: "#007aff" },
    expired: { label: "หมดอายุ", color: "#9ca3af" },
  },
  po: {
    received: { label: "PO ใหม่", color: "#ff9500" },
    preparing: { label: "พร้อมจัดส่ง", color: "#007aff" },
    shipped: { label: "กำลังจัดส่ง", color: "#319754" },
    delivered: { label: "ส่งสำเร็จ", color: "#10b981" },
    cancelled: { label: "ยกเลิก", color: "#ff3b30" },
  },
};

export const DOC_TITLE: Record<DocKind, string> = { qt: "ใบเสนอราคา", pr: "ใบ PR", po: "ใบ PO" };

// Pick a catalog thumbnail that loosely matches the raw-material name.
export const matImg = (name: string): number => {
  const map: [string, number][] = [
    ["ขมิ้น", 0], ["ฟ้าทะลาย", 1], ["เก๊กฮวย", 2], ["น้ำผึ้ง", 3], ["บัวบก", 4],
    ["กระชาย", 5], ["ตะไคร้", 6], ["ขิง", 7], ["เห็ดหลินจือ", 8],
    ["อัญชัน", 9], ["คำฝอย", 9], ["มะรุม", 5],
  ];
  const hit = map.find(([k]) => name.includes(k));
  return TOP_PRODUCTS[(hit ? hit[1] : 0) % TOP_PRODUCTS.length].image;
};

// Counterparty companies — ported verbatim from the web BUYER_PROFILES.
const CO = {
  thaiDev: { company: "บริษัท สมุนไพรไทยพัฒนา จำกัด", taxId: "0105563012345", contact: "คุณวิภาดา จันทร์เพ็ญ", phone: "02-555-1234", email: "purchasing@thaihealthherb.co.th", address: "55 หมู่ 9 ถ.พหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120" },
  banya: { company: "บริษัท บ้านยาไทย คอมพานี จำกัด", taxId: "0105561098765", contact: "คุณสรณ์สิริ พรหมโชติ", phone: "02-987-6543", email: "po@banyathai.co.th", address: "234/12 ถ.พระราม 2 แขวงท่าข้าม เขตบางขุนเทียน กรุงเทพฯ 10150" },
  herbalSp: { company: "หจก. เฮอร์บัลซัพพลาย", taxId: "0993000456789", contact: "คุณธีระ ศรีบุญรอด", phone: "081-234-5678", email: "thira@herbalsupply.co.th", address: "78 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000" },
  nature: { company: "บริษัท ธรรมชาติเฮิร์บส์ จำกัด", taxId: "0105560123456", contact: "คุณณัฐณิชา รุ่งอรุณ", phone: "02-444-5678", email: "purchasing@naturalherbs.co.th", address: "100 ถ.รามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240" },
  asia: { company: "บริษัท ผลิตภัณฑ์สมุนไพร เอเชีย จำกัด (มหาชน)", taxId: "0107556789123", contact: "คุณพชรพล อินทรพิทักษ์", phone: "02-666-7890", email: "supply@asianherbs.com", address: "999 อาคารเอเชียทาวเวอร์ ชั้น 18 ถ.สาทรใต้ แขวงทุ่งมหาเมฆ เขตสาทร กรุงเทพฯ 10120" },
  modern: { company: "บริษัท แพทย์แผนไทยร่วมสมัย จำกัด", taxId: "0105562345678", contact: "คุณสมหญิง วิจิตรกุล", phone: "02-333-2222", email: "po@modernthai.co.th", address: "456 ถ.รัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310" },
  factory: { company: "บริษัท โรงงานสมุนไพรไทย จำกัด", taxId: "0105563912345", contact: "คุณพิมพ์ชนก รุ่งเรือง", phone: "02-111-2233", email: "purchase@thaifactory.co.th", address: "200 หมู่ 5 ถ.บางนา-ตราด ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540" },
  cosmetic: { company: "บริษัท เครื่องสำอางไทยเฮิร์บ จำกัด", taxId: "0105561567890", contact: "คุณกานต์ชนก พงศ์ธารา", phone: "02-666-1212", email: "kanchanok@thaiherbcosmetic.com", address: "456 ถ.เพชรเกษม แขวงบางหว้า เขตภาษีเจริญ กรุงเทพฯ 10160" },
};

// ใบเสนอราคา (issued quotations) — RAW_QTS from the web.
export const QUOTATIONS: MarketDoc[] = [
  { id: "QT-2569-3012", status: "accepted", date: "10 มี.ค. 2569", ...CO.thaiDev, paymentTerms: "เครดิต 30 วัน",
    validUntil: "10 เม.ย. 2569", daysRemaining: 28, poNumber: "PO-2569-3012",
    items: [{ name: "ขมิ้นชันแห้ง (ผง)", grade: "พรีเมียม", qty: 200, unit: "กก.", pricePerUnit: 320 }] },
  { id: "QT-2569-3028", status: "accepted", date: "26 ก.พ. 2569", ...CO.nature, paymentTerms: "เครดิต 60 วัน",
    validUntil: "26 มี.ค. 2569", daysRemaining: 14, poNumber: "PO-2569-3028",
    items: [
      { name: "เห็ดหลินจือสกัด", grade: "พรีเมียม", qty: 50, unit: "กก.", pricePerUnit: 2400 },
      { name: "เก๊กฮวยแห้ง", grade: "คัดสรร", qty: 80, unit: "กก.", pricePerUnit: 420 },
    ] },
  { id: "QT-2569-3035", status: "accepted", date: "20 ก.พ. 2569", ...CO.asia, paymentTerms: "เครดิต 90 วัน",
    validUntil: "20 มี.ค. 2569", daysRemaining: 8, poNumber: "PO-2569-3035",
    items: [
      { name: "ขมิ้นชันแคปซูล", grade: "GMP", qty: 1000, unit: "กก.", pricePerUnit: 380 },
      { name: "ฟ้าทะลายโจรสกัด", grade: "พรีเมียม", qty: 400, unit: "กก.", pricePerUnit: 520 },
    ] },
  { id: "QT-2569-3042", status: "sent", date: "11 มี.ค. 2569", ...CO.factory, paymentTerms: "เครดิต 30 วัน",
    validUntil: "10 เม.ย. 2569", daysRemaining: 29,
    items: [
      { name: "ตะไคร้แห้ง (สับ)", grade: "คัดสรร", qty: 250, unit: "กก.", pricePerUnit: 180 },
      { name: "ดอกอัญชันแห้ง", grade: "พรีเมียม", qty: 60, unit: "กก.", pricePerUnit: 520 },
    ] },
  { id: "QT-2569-3045", status: "expired", date: "5 ก.พ. 2569", ...CO.cosmetic, paymentTerms: "เงินสด",
    validUntil: "7 มี.ค. 2569", daysRemaining: -5,
    items: [{ name: "ใบบัวบกแห้ง", grade: "คัดสรร", qty: 80, unit: "กก.", pricePerUnit: 450 }] },
  { id: "QT-2569-3048", status: "rejected", date: "18 ก.พ. 2569", company: "บริษัท Wellness Brand Studio จำกัด", contact: "ฝ่ายจัดซื้อ", phone: "02-700-9000", address: "อาคารเวลเนส ชั้น 5 ถ.สุขุมวิท กรุงเทพฯ 10110", paymentTerms: "เงินสด",
    validUntil: "20 มี.ค. 2569", daysRemaining: 8, note: "ลูกค้าแจ้งว่าไปสั่งกับ Supplier อื่นแล้ว",
    items: [{ name: "ดอกอัญชันแห้ง", grade: "พรีเมียม", qty: 16, unit: "กก.", pricePerUnit: 520 }] },
];

// ใบ PR (purchase requisitions) — MOCK_PURCHASE_REQUISITIONS from the web.
export const PURCHASE_REQUESTS: MarketDoc[] = [
  { id: "PR-2569-3012", status: "converted", date: "11 มี.ค. 2569", ...CO.thaiDev, paymentTerms: "เครดิต 30 วัน", priority: "Normal", approver: "คุณวิชัย ใจกล้า", validityDays: 15, description: "วัตถุดิบสำหรับสายการผลิตชาขมิ้นล็อตเดือนหน้า", justification: "สต๊อกขมิ้นคงเหลือต่ำกว่าจุดสั่งซื้อ ต้องเติมเพื่อไม่ให้ไลน์ผลิตสะดุด", needBy: "26 มี.ค. 2569", refId: "PO-2569-3012",
    items: [{ name: "ขมิ้นชันแห้ง (ผง)", grade: "พรีเมียม", qty: 200, unit: "กก.", pricePerUnit: 320 }] },
  { id: "PR-2569-3019", status: "converted", date: "9 มี.ค. 2569", ...CO.banya, paymentTerms: "เครดิต 60 วัน", priority: "High", approver: "คุณสมศักดิ์ ดวงดี", validityDays: 10, description: "วัตถุดิบรวมสำหรับสูตรเครื่องดื่มสมุนไพรใหม่ — รวมหลายร้านในใบเดียว", justification: "เตรียมผลิตตัวอย่างเสนอลูกค้ารายใหญ่ภายในเดือนนี้", needBy: "22 มี.ค. 2569", refId: "PO-2569-3019", note: "ออก PR ตรงเข้ามาเลย — ไม่ผ่าน Quote",
    items: [
      { name: "ฟ้าทะลายโจร (ผง)", grade: "พรีเมียม", qty: 500, unit: "กก.", pricePerUnit: 240 },
      { name: "ใบบัวบกแห้ง", grade: "คัดสรร", qty: 150, unit: "กก.", pricePerUnit: 180 },
      { name: "ใบมะรุมแห้ง (ผง)", grade: "มาตรฐาน", qty: 80, unit: "กก.", pricePerUnit: 540 },
    ] },
  { id: "PR-2569-3023", status: "received", date: "8 มี.ค. 2569", ...CO.herbalSp, paymentTerms: "เครดิต 30 วัน", priority: "Normal", approver: "คุณอนันต์ พิทักษ์", validityDays: 10, description: "วัตถุดิบขิงผงสำหรับไลน์ชาชง", justification: "รอผู้ซื้อออก PO ใน Herbal ERP", needBy: "22 มี.ค. 2569", note: "รอผู้ซื้อออก PO ใน Herbal ERP",
    items: [{ name: "ขิงผงออร์แกนิก", grade: "พรีเมียม", qty: 300, unit: "กก.", pricePerUnit: 280 }] },
  { id: "PR-2569-3028", status: "converted", date: "27 ก.พ. 2569", ...CO.nature, paymentTerms: "เครดิต 60 วัน", priority: "High", approver: "คุณณัฐ ธรรมรักษ์", validityDays: 15, description: "สารสกัดสำหรับผลิตภัณฑ์เสริมอาหาร", justification: "ออเดอร์ลูกค้ายืนยันแล้ว ต้องผลิตให้ทันกำหนดส่ง", needBy: "15 มี.ค. 2569", refId: "PO-2569-3028",
    items: [
      { name: "เห็ดหลินจือสกัด", grade: "พรีเมียม", qty: 50, unit: "กก.", pricePerUnit: 2400 },
      { name: "เก๊กฮวยแห้ง", grade: "คัดสรร", qty: 80, unit: "กก.", pricePerUnit: 420 },
    ] },
  { id: "PR-2569-3035", status: "converted", date: "21 ก.พ. 2569", ...CO.asia, paymentTerms: "เครดิต 90 วัน", priority: "Urgent", approver: "คุณพิไล วงศ์ใหญ่", validityDays: 20, description: "วัตถุดิบล็อตใหญ่สำหรับคำสั่งซื้อส่งออก", justification: "สัญญาส่งออกกำหนดส่งต้นเดือนหน้า ห้ามล่าช้า", needBy: "8 มี.ค. 2569", refId: "PO-2569-3035",
    items: [
      { name: "ขมิ้นชันแคปซูล", grade: "GMP", qty: 1000, unit: "กก.", pricePerUnit: 380 },
      { name: "ฟ้าทะลายโจรสกัด", grade: "พรีเมียม", qty: 400, unit: "กก.", pricePerUnit: 520 },
    ] },
];

// ใบ PO (purchase orders) — MOCK_PURCHASE_ORDERS from the web.
export const PURCHASE_ORDERS_DOC: MarketDoc[] = [
  { id: "PO-2569-3012", status: "received", date: "12 มี.ค. 2569", ...CO.thaiDev, paymentTerms: "เครดิต 30 วัน", priority: "Normal", approver: "คุณวิชัย ใจกล้า", validityDays: 15, needBy: "26 มี.ค. 2569", shippingMethod: "จัดส่งโดยผู้ขาย", note: "ขอให้บรรจุในกระสอบ 25 กก. ปิดผนึกแน่นหนา",
    items: [{ name: "ขมิ้นชันแห้ง (ผง)", grade: "พรีเมียม", qty: 200, unit: "กก.", pricePerUnit: 320 }] },
  { id: "PO-2569-3019", status: "preparing", date: "10 มี.ค. 2569", ...CO.banya, paymentTerms: "เครดิต 60 วัน", priority: "High", approver: "คุณสมศักดิ์ ดวงดี", validityDays: 10, needBy: "22 มี.ค. 2569", shippingMethod: "จัดส่งโดยผู้ขาย",
    items: [
      { name: "ฟ้าทะลายโจร (ผง)", grade: "พรีเมียม", qty: 500, unit: "กก.", pricePerUnit: 240 },
      { name: "ใบบัวบกแห้ง", grade: "คัดสรร", qty: 150, unit: "กก.", pricePerUnit: 180 },
      { name: "ใบมะรุมแห้ง (ผง)", grade: "มาตรฐาน", qty: 80, unit: "กก.", pricePerUnit: 540 },
    ] },
  { id: "PO-2569-3028", status: "shipped", date: "28 ก.พ. 2569", ...CO.nature, paymentTerms: "เครดิต 60 วัน", priority: "High", approver: "คุณณัฐ ธรรมรักษ์", validityDays: 15, needBy: "15 มี.ค. 2569", shippingMethod: "ขนส่งบริษัท Kerry", trackingNumber: "TH00125478963",
    items: [
      { name: "เห็ดหลินจือสกัด", grade: "พรีเมียม", qty: 50, unit: "กก.", pricePerUnit: 2400 },
      { name: "เก๊กฮวยแห้ง", grade: "คัดสรร", qty: 80, unit: "กก.", pricePerUnit: 420 },
    ] },
  { id: "PO-2569-3035", status: "delivered", date: "22 ก.พ. 2569", ...CO.asia, paymentTerms: "เครดิต 90 วัน", priority: "Urgent", approver: "คุณพิไล วงศ์ใหญ่", validityDays: 20, needBy: "8 มี.ค. 2569", shippingMethod: "ขนส่งโดยผู้ซื้อ", trackingNumber: "TH00124589632",
    items: [
      { name: "ขมิ้นชันแคปซูล", grade: "GMP", qty: 1000, unit: "กก.", pricePerUnit: 380 },
      { name: "ฟ้าทะลายโจรสกัด", grade: "พรีเมียม", qty: 400, unit: "กก.", pricePerUnit: 520 },
    ] },
  { id: "PO-2569-3038", status: "cancelled", date: "18 ก.พ. 2569", ...CO.modern, paymentTerms: "เครดิต 30 วัน", priority: "Normal", approver: "คุณสมหญิง วิจิตรกุล", validityDays: 10, needBy: "5 มี.ค. 2569", shippingMethod: "จัดส่งโดยผู้ขาย", note: "ลูกค้ายกเลิกเนื่องจากเปลี่ยนสูตร",
    items: [{ name: "ดอกอัญชันแห้ง", grade: "พรีเมียม", qty: 100, unit: "กก.", pricePerUnit: 520 }] },
];

// Look up a PO document by its number (e.g. a PR's refId / a quote's poNumber).
export const findPoDoc = (id?: string): MarketDoc | undefined => (id ? PURCHASE_ORDERS_DOC.find((d) => d.id === id) : undefined);

export const docLineTotal = (it: MarketDoc["items"][number]) => it.qty * it.pricePerUnit;
export const docSubtotal = (d: MarketDoc) => d.items.reduce((s, it) => s + docLineTotal(it), 0);

// Quotation filter chips — web QT_STATUS_STYLE statuses + "ทั้งหมด".
const QT_TABS = [
  { id: "all", label: "ทั้งหมด", Icon: FileText },
  { id: "sent", label: "รอตอบกลับ", Icon: Clock },
  { id: "accepted", label: "ตอบรับแล้ว", Icon: Check },
  { id: "expired", label: "หมดอายุ", Icon: AlertCircle },
  { id: "rejected", label: "ปฏิเสธ", Icon: X },
] as const;

// ใบเสนอราคา — status filter chips + web-matching cards. The pushed subpage
// hides the inline search (its app-bar button opens ShopQuoteSearch instead).
export function QuotationSection({ showSearch = true, initialFilter }: { showSearch?: boolean; initialFilter?: string }) {
  const nav = useNavigation<Nav>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof QT_TABS)[number]["id"]>(
    (initialFilter as (typeof QT_TABS)[number]["id"]) ?? "all",
  );

  const count = (id: string) =>
    id === "all" ? QUOTATIONS.length : QUOTATIONS.filter((d) => d.status === id).length;

  const q = query.trim().toLowerCase();
  const visible = QUOTATIONS.filter((d) => {
    if (filter !== "all" && d.status !== filter) return false;
    if (!q) return true;
    return (
      d.id.toLowerCase().includes(q) ||
      d.company.toLowerCase().includes(q) ||
      d.items.some((it) => it.name.toLowerCase().includes(q))
    );
  });
  return (
    <View style={{ gap: 14 }}>
      {/* Search — hidden on the pushed subpage (app-bar button → ShopQuoteSearch) */}
      {showSearch ? (
      <View
        className="flex-row items-center"
        style={{
          backgroundColor: "white",
          borderWidth: 1,
          borderColor: DIVIDER_GRAY,
          borderRadius: 999,
          height: 44,
          paddingLeft: 16,
          paddingRight: 6,
          gap: 8,
        }}
      >
        <TextInput
          style={{ flex: 1, fontSize: 13, color: TEXT_PRIMARY, padding: 0 }}
          placeholder="ค้นหาเลขใบเสนอ ชื่อลูกค้า หรือสินค้า"
          placeholderTextColor={TEXT_DISABLED}
          value={query}
          onChangeText={setQuery}
        />
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
          <Search size={16} color="white" />
        </View>
      </View>
      ) : null}

      {/* Status filter chips — same pill language as the orders list (Fitts: 36px) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      >
        {QT_TABS.map((tb) => {
          const active = filter === tb.id;
          const c = count(tb.id);
          return (
            <Pressable
              key={tb.id}
              onPress={() => setFilter(tb.id)}
              className="flex-row items-center active:opacity-80"
              style={{
                height: 36,
                paddingHorizontal: 14,
                borderRadius: 999,
                gap: 6,
                backgroundColor: active ? BRAND_GREEN : "white",
                borderWidth: 1,
                borderColor: active ? BRAND_GREEN : DIVIDER_GRAY,
              }}
            >
              <tb.Icon size={14} color={active ? "white" : TEXT_MUTED} />
              <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "white" : TEXT_SECONDARY }}>
                {tb.label}
              </Text>
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  paddingHorizontal: 5,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? "rgba(255,255,255,0.25)" : SURFACE_GRAY,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "white" : TEXT_MUTED }}>{c}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {visible.length === 0 ? (
        <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, paddingVertical: 48, alignItems: "center", gap: 10 }}>
          <ClipboardList size={40} color={BORDER_GRAY} strokeWidth={1.5} />
          <Text style={{ fontSize: 14, color: TEXT_DISABLED }}>ไม่พบใบเสนอราคา</Text>
        </View>
      ) : (
        visible.map((d) => <QuotationCard key={d.id} doc={d} onOpenDetail={() => nav.navigate("ShopDocDetail", { doc: d, kind: "qt" })} />)
      )}
    </View>
  );
}

// ใบเสนอราคา card — web QuotationCard layout (issuer header, requester block,
// validity chip) with the id · date row and item rows in the customer order
// card's language.
export function QuotationCard({ doc, onOpenDetail }: { doc: MarketDoc; onOpenDetail?: () => void }) {
  const total = docSubtotal(doc);
  const days = doc.daysRemaining ?? 0;
  const daysColor = days <= 7 ? "#dc2626" : days <= 30 ? "#d97706" : "#319754";
  const cfg = DOC_STATUS.qt[doc.status] ?? { label: doc.status, color: TEXT_MUTED };
  return (
    <Pressable onPress={onOpenDetail} className="active:opacity-90" style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}>
      {/* Header — doc icon + quote number (big bold) + status pill (tinted),
          exactly like the customer RFQ card */}
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
          <FileText size={14} color="#fff" strokeWidth={2.4} />
        </View>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>{doc.id}</Text>
        <View style={{ backgroundColor: cfg.color + "1a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: cfg.color }}>{cfg.label}</Text>
        </View>
      </View>

      {/* Days-remaining chip (left) · date (right) */}
      <View className="flex-row items-center justify-between" style={{ marginTop: 8, gap: 8 }}>
        <View style={{ backgroundColor: daysColor + "1a", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
          <Text style={{ fontSize: 10.5, fontWeight: "700", color: daysColor }}>
            {days <= 0 ? "หมดอายุ" : `เหลือ ${days} วัน`}
          </Text>
        </View>
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED }} numberOfLines={1}>{doc.date}</Text>
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Requester — company / contact person / phone */}
      <View className="flex-row items-center" style={{ gap: 10, marginBottom: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
          <User size={16} color={BRAND_GREEN} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#000" }} numberOfLines={1}>{doc.company}</Text>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }} numberOfLines={1}>
            {doc.contact}{doc.phone ? ` · ${doc.phone}` : ""}
          </Text>
        </View>
      </View>

      {/* Reject / note */}
      {doc.note ? (
        <View className="flex-row" style={{ gap: 8, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fee2e2", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 }}>
          <AlertCircle size={16} color="#ef4444" strokeWidth={2.4} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#dc2626" }}>หมายเหตุจากลูกค้า</Text>
            <Text style={{ fontSize: 12.5, color: "#b91c1c", marginTop: 1 }}>{doc.note}</Text>
          </View>
        </View>
      ) : null}

      {/* Items — name + จำนวน below, line total right (customer RFQ card rows) */}
      <View style={{ gap: 12 }}>
        {doc.items.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image source={matImg(item.name)} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 3 }} numberOfLines={1}>
                จำนวน {fmtNum(item.qty)} {item.unit}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{fmtTHBShort(docLineTotal(item))}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Total — muted label left, green total right (customer card sizes) */}
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ยอดรวม</Text>
        <Text style={{ fontSize: 20, fontWeight: "700", color: BRAND_GREEN }}>{fmtTHBShort(total)}</Text>
      </View>
    </Pressable>
  );
}

// ===================== จัดการสินค้า — list management view =====================
// Mirrors the web ProductsTab: product-type segmented tabs (ผลิตภัณฑ์ / วัตถุดิบ),
// status filter pills + search, and a card list with a 3-dot action menu.
// Per-status product counts for the ShopProductFilter sheet's rows.
const statusCounts = (list: PMProduct[]): Record<"all" | PMStatus, number> => ({
  all: list.length,
  เปิดขาย: list.filter((p) => p.status === "เปิดขาย").length,
  ปิดขาย: list.filter((p) => p.status === "ปิดขาย").length,
  สินค้าหมด: list.filter((p) => p.status === "สินค้าหมด").length,
});

// Skeleton placeholder mirroring a product card while the list loads.
function PMCardSkeleton() {
  return (
    <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <Skeleton width={52} height={52} radius={12} />
        <View style={{ flex: 1, gap: 7 }}>
          <Skeleton width="70%" height={14} />
          <Skeleton width="45%" height={11} />
        </View>
        <Skeleton width={64} height={22} radius={999} />
      </View>
      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />
      <View className="flex-row items-center justify-between">
        <Skeleton width={90} height={20} radius={999} />
        <Skeleton width={72} height={16} />
      </View>
    </View>
  );
}

// ===================== FLASH SALE SECTION =====================
const FLASH_RED = "#e62e05";
const FLASH_ICON = require("../../assets/flash/flash.png");
const FLASH_COIN = require("../../assets/wallet-illust.png");
const FLASH_TERMS_IMG = require("../../assets/flash/terms.png");

// Platform event card — red (or gray if ended) gradient + status + item count.
function FlashEventCard({ ev, onPress }: { ev: FlashEvent; onPress?: () => void }) {
  const ended = ev.status === "ended";
  const Badge = () => {
    if (ev.status === "join") {
      return (
        <View style={{ backgroundColor: "#fff", paddingHorizontal: 20, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center", shadowColor: "#fff", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: FLASH_RED }}>เข้าร่วมเลย</Text>
        </View>
      );
    }
    if (ev.status === "active" && ev.hms) {
      return (
        <View className="flex-row items-center" style={{ gap: 4 }}>
          {ev.hms.map((n, i) => (
            <View key={i} className="flex-row items-center" style={{ gap: 4 }}>
              <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: "#bc1b06", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{String(n).padStart(2, "0")}</Text>
              </View>
              {i < 2 ? <Text style={{ fontSize: 14, fontWeight: "400", color: "#0a0a0a" }}>:</Text> : null}
            </View>
          ))}
        </View>
      );
    }
    const label = ev.status === "pending" ? "เข้าร่วมแล้ว · รอเวลา" : "สิ้นสุดแล้ว";
    return (
      <View style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.55)", backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
        <Text style={{ fontSize: 10, fontWeight: "600", color: "#fff" }}>{label}</Text>
      </View>
    );
  };
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={onPress ? "active:opacity-90" : undefined}
      style={{ width: 230, borderRadius: 20, overflow: "hidden", shadowColor: ended ? "#525252" : FLASH_RED, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 12 }}
    >
      <LinearGradient
        colors={ended ? ["rgba(115,115,115,0.85)", "#525252"] : ["rgba(230,46,5,0.82)", "#e62e05"]}
        style={{ padding: 16, minHeight: 132, justifyContent: "space-between" }}
      >
        <Image source={FLASH_ICON} style={{ position: "absolute", right: 4, bottom: 8, width: 103, height: 97 }} resizeMode="contain" />
        {/* Top: name + date stacked in one column */}
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#fff" }} numberOfLines={1}>{ev.name}</Text>
          <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.95)" }} numberOfLines={1}>{ev.dateRange}</Text>
        </View>
        {/* Bottom: item count, then the join button / countdown below it */}
        <View style={{ gap: 8 }}>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Package size={12} color="rgba(255,255,255,0.9)" strokeWidth={2.4} />
            <Text style={{ fontSize: 10.5, color: "rgba(255,255,255,0.95)" }} numberOfLines={1}>
              {ev.status === "join" ? "ยังไม่มีสินค้าเข้าร่วม" : `จำนวน ${ev.itemCount} รายการ`}
            </Text>
          </View>
          <View className="flex-row" style={{ alignItems: "flex-start" }}>
            <Badge />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// Flash sale card colors (from Figma node 8123:11626).
const FS_GREEN = "#008e48";        // header + progress ring + "sold" dot
const FS_DISCOUNT_RED = "#e34646"; // -X% pill text
const FS_DATE_TEXT = "#3b3b3b";    // date pill text
const FS_MUTED = "rgba(0,0,0,0.6)"; // stat labels / units
const FS_DOT_GRAY = "#cdcdcd";     // "remaining" dot

// Sold ring — white arc = sold/total over a translucent track (on the dark-green footer).
function FlashRing({ pct, size }: { pct: number; size: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="#e3e6e3" strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={BRAND_GREEN} strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - clamped)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

// White pill used in the green header (discount / date range).
function FSHeaderPill({ children, color }: { children: ReactNode; color: string }) {
  return (
    <View style={{ backgroundColor: "white", borderRadius: 999, paddingHorizontal: 12, height: 31, justifyContent: "center" }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color }}>{children}</Text>
    </View>
  );
}

// One stat column (label + value + unit). `light` = white text for dark/colored bg.
function FSStat({ dot, label, value, unit, onLayout, light }: { dot?: string; label: string; value: string; unit: string; onLayout?: (e: LayoutChangeEvent) => void; light?: boolean }) {
  const muted = light ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.5)";
  const strong = light ? "#ffffff" : "#0a0a0a";
  return (
    <View style={{ gap: 8 }} onLayout={onLayout}>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /> : null}
        <Text style={{ fontSize: 14, color: muted }}>{label}</Text>
      </View>
      <View className="flex-row items-baseline" style={{ gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: strong }}>{value}</Text>
        <Text style={{ fontSize: 14, color: muted }}>{unit}</Text>
      </View>
    </View>
  );
}

// Flash product card — ported from Figma: green header (image + name + price/
// discount/date pills) over a white footer (progress ring + sold/remaining/revenue).
export function FlashProductCard({ p, onMenu }: { p: FlashProduct; onMenu: () => void }) {
  // Full date + time, web-style (e.g. "08 พ.ค. 69 00:00 - 09 พ.ค. 69 23:59").
  const clean = (s: string) => s.replace(" - ", " ").trim();
  const sd = clean(p.startText);
  const ed = clean(p.endText);
  const dateRange = !ed || sd === ed ? sd : `${sd} - ${ed}`;
  const st = FLASH_STATUS_CFG[p.status]; // base tint + date color follow the status
  const statusLabel = p.status === "active" ? "กำลังขาย" : p.status === "soldout" ? "สินค้าหมด" : "ล่วงหน้า";
  // Measure the widest status label so every card's status block is the same, snug width.
  const [labelW, setLabelW] = useState(0);
  const measureLabel = (e: LayoutChangeEvent) => {
    const w = Math.ceil(e.nativeEvent.layout.width);
    setLabelW((prev) => Math.max(prev, w));
  };
  return (
    <View style={{ borderRadius: 24, boxShadow: "0px 2px 4px rgba(0,0,0,0.15), 0px 6px 12px rgba(0,0,0,0.08)", elevation: 3 }}>
    <LinearGradient colors={[st.color + "26", st.color + "12"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 24 }}>
    <Pressable
      onPress={onMenu}
      className="active:opacity-95"
      style={{ backgroundColor: "white", borderRadius: 24, padding: 14, gap: 12 }}
    >
      {/* Header — image + name + price/-% + 3-dot */}
      <View className="flex-row" style={{ gap: 12 }}>
        <View style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", backgroundColor: SURFACE_GRAY }}>
          <Image source={p.image} style={{ width: "100%", height: "100%", opacity: p.status === "soldout" ? 0.55 : 1 }} resizeMode="cover" />
          {p.status === "soldout" ? (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" }}>
              <Text style={{ color: "white", fontSize: 12, fontWeight: "800" }}>หมด</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>{p.name}</Text>
            <Pressable onPress={onMenu} hitSlop={8} className="items-center justify-center active:opacity-70" style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(118,118,128,0.14)" }}>
              <MoreHorizontal size={16} color={TEXT_SECONDARY} />
            </Pressable>
          </View>
          <View className="flex-row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
            <View className="flex-row items-baseline" style={{ gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: FS_DISCOUNT_RED }}>฿{p.flashPrice.toLocaleString()}</Text>
              <Text style={{ fontSize: 14, color: TEXT_DISABLED, textDecorationLine: "line-through" }}>฿{p.normalPrice.toLocaleString()}</Text>
            </View>
            <View style={{ backgroundColor: "rgba(230,46,5,0.1)", borderRadius: 999, paddingHorizontal: 8, height: 22, justifyContent: "center" }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: FS_DISCOUNT_RED }}>-{p.discount}%</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

      {/* Stats */}
      <View className="flex-row items-start justify-between">
        <FSStat dot={BRAND_GREEN} label="ขายแล้ว" value={p.sold.toLocaleString()} unit="ชิ้น" />
        {/* คงเหลือ — with a smaller/gray "/total" behind */}
        <View style={{ gap: 8 }}>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#c9cdc9" }} />
            <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)" }}>คงเหลือ</Text>
          </View>
          <View className="flex-row items-baseline" style={{ gap: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a" }}>{p.remaining.toLocaleString()}</Text>
            <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)" }}>/{p.total.toLocaleString()}</Text>
            <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", marginLeft: 6 }}>ชิ้น</Text>
          </View>
        </View>
        <FSStat label="ยอดขาย" value={p.revenue.toLocaleString()} unit="บาท" />
      </View>
    </Pressable>

    {/* Hidden measurers — widest status label sets the block width */}
    <View style={{ position: "absolute", opacity: 0 }} pointerEvents="none">
      {["กำลังขาย", "สินค้าหมด", "ล่วงหน้า"].map((l) => (
        <Text key={l} onLayout={measureLabel} style={{ fontSize: 12, fontWeight: "700" }}>{l}</Text>
      ))}
    </View>

    {/* Base peek — status (fixed width = widest label) + Flash Sale date range, left-aligned */}
    <View className="flex-row items-center" style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 8 }}>
      <View className="flex-row items-center" style={{ gap: 5, width: labelW ? labelW + 18 : undefined, flexShrink: 0 }}>
        <Package size={13} color={st.color} strokeWidth={2.4} />
        <Text style={{ fontSize: 12, fontWeight: "700", color: st.color }} numberOfLines={1}>{statusLabel}</Text>
      </View>
      <View className="flex-row items-center" style={{ gap: 5, flexShrink: 1 }}>
        <Calendar size={13} color={st.color} strokeWidth={2.2} />
        <Text style={{ fontSize: 12, fontWeight: "600", color: st.color }} numberOfLines={1}>{dateRange}</Text>
      </View>
    </View>
    </LinearGradient>
    </View>
  );
}

export function FlashSaleSection({ insetsBottom = 16 }: { insetsBottom?: number }) {
  const nav = useNavigation<Nav>();
  const [filter, setFilter] = useState<"all" | FlashStatus>("all");
  const [query, setQuery] = useState("");
  const [menuFor, setMenuFor] = useState<FlashProduct | null>(null);
  const [termsFor, setTermsFor] = useState<FlashEvent | null>(null); // join terms sheet
  const filters: { id: "all" | FlashStatus; label: string; Icon: typeof Package }[] = [
    { id: "all", label: "ทั้งหมด", Icon: Package },
    { id: "active", label: "กำลังขาย", Icon: Zap },
    { id: "soldout", label: "สินค้าหมด", Icon: AlertTriangle },
    { id: "scheduled", label: "กำหนดไว้", Icon: Clock },
  ];
  const count = (id: "all" | FlashStatus) => (id === "all" ? FLASH_PRODUCTS.length : FLASH_PRODUCTS.filter((p) => p.status === id).length);
  const q = query.trim().toLowerCase();
  const visible = FLASH_PRODUCTS.filter((p) => (filter === "all" || p.status === filter) && (!q || p.name.toLowerCase().includes(q)));
  const sumSold = visible.reduce((s, p) => s + p.sold, 0);
  const sumRemaining = visible.reduce((s, p) => s + p.remaining, 0);
  const sumRevenue = visible.reduce((s, p) => s + p.revenue, 0);
  const sumTotal = sumSold + sumRemaining;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: insetsBottom }}
      >
        {/* [0] Events strip + search (scrolls away) */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {FLASH_EVENTS.map((ev) => (
              <FlashEventCard
                key={ev.id}
                ev={ev}
                onPress={ev.status === "join"
                  ? () => setTermsFor(ev)
                  : () => nav.navigate("FlashEventDetail", { name: ev.name, dateRange: ev.dateRange, joined: true })}
              />
            ))}
          </ScrollView>

          <View className="flex-row items-center" style={{ backgroundColor: "white", borderWidth: 1, borderColor: DIVIDER_GRAY, borderRadius: 999, height: 44, paddingLeft: 16, paddingRight: 8, gap: 8 }}>
            <TextInput style={{ flex: 1, fontSize: 13, color: TEXT_PRIMARY, padding: 0 }} placeholder="ค้นหาสินค้า Flash Sale" placeholderTextColor={TEXT_DISABLED} value={query} onChangeText={setQuery} />
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
              <Search size={16} color="white" />
            </View>
          </View>
        </View>

        {/* [1] Filter pills — STICKY (bg so content scrolls under it) */}
        <View style={{ backgroundColor: "#fafafa", paddingTop: 12, paddingBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {filters.map(({ id, label, Icon }) => {
              const active = filter === id;
              return (
                <Pressable key={id} onPress={() => setFilter(id)} className="flex-row items-center active:opacity-80"
                  style={{ height: 36, paddingHorizontal: 16, borderRadius: 999, gap: 8, backgroundColor: active ? BRAND_GREEN : "white", borderWidth: 1, borderColor: active ? BRAND_GREEN : DIVIDER_GRAY }}>
                  <Icon size={14} color={active ? "white" : TEXT_MUTED} strokeWidth={2.2} />
                  <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "white" : TEXT_SECONDARY }}>{label}</Text>
                  <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", backgroundColor: active ? "rgba(255,255,255,0.25)" : SURFACE_GRAY }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "white" : TEXT_MUTED }}>{count(id)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* [2] Summary + product list (scrolls under the sticky filter) */}
        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          {/* Summary card — 2-layer style (flash header over gray base + ring + totals) */}
          {visible.length > 0 ? (
            <View style={{ borderRadius: 24, boxShadow: "0px 2px 4px rgba(0,0,0,0.15), 0px 6px 12px rgba(0,0,0,0.08)", elevation: 3 }}>
              <LinearGradient colors={["#ffffff", "#ffffff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 24 }}>
                <LinearGradient colors={["#e62e05", "rgba(230,46,5,0.82)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 24, padding: 14, gap: 8, overflow: "hidden" }}>
                  <Image source={FLASH_COIN} style={{ position: "absolute", right: 4, bottom: 4, width: 120, height: 120, opacity: 0.95 }} resizeMode="contain" />
                  <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>ยอดขาย</Text>
                  <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>฿{sumRevenue.toLocaleString()}</Text>
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>สินค้าในร้านที่เข้าร่วม Flash Sale</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "rgba(255,255,255,0.9)" }}>{visible.length} รายการ</Text>
                  </View>
                </LinearGradient>

                <View className="flex-row items-center" style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 14 }}>
                  <FlashRing pct={sumTotal > 0 ? sumSold / sumTotal : 0} size={40} />
                  <View className="flex-row items-center" style={{ flex: 1, flexWrap: "wrap", rowGap: 8, columnGap: 16 }}>
                    <FSStat dot={BRAND_GREEN} label="ขายแล้ว" value={sumSold.toLocaleString()} unit="ชิ้น" />
                    {/* คงเหลือ — with a smaller/gray "/total" behind */}
                    <View style={{ gap: 8 }}>
                      <View className="flex-row items-center" style={{ gap: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#c9cdc9" }} />
                        <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)" }}>คงเหลือ</Text>
                      </View>
                      <View className="flex-row items-baseline" style={{ gap: 2 }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a" }}>{sumRemaining.toLocaleString()}</Text>
                        <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)" }}>/{sumTotal.toLocaleString()}</Text>
                        <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", marginLeft: 6 }}>ชิ้น</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>
          ) : null}

          {visible.length === 0 ? (
            <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, paddingVertical: 48, alignItems: "center", gap: 8 }}>
              <Zap size={40} color={BORDER_GRAY} strokeWidth={1.5} />
              <Text style={{ fontSize: 14, color: TEXT_DISABLED }}>ไม่พบสินค้า Flash Sale</Text>
            </View>
          ) : (
            visible.map((p) => <FlashProductCard key={p.id} p={p} onMenu={() => setMenuFor(p)} />)
          )}
        </View>
      </ScrollView>

      {/* Action sheet */}
      <FlashActionSheet product={menuFor} onClose={() => setMenuFor(null)} />

      {/* Join flow: terms sheet → เข้าร่วม → FlashEventDetail page → เพิ่มสินค้า page */}
      <FlashTermsSheet
        event={termsFor}
        onClose={() => setTermsFor(null)}
        onJoin={() => { const ev = termsFor; setTermsFor(null); if (ev) nav.navigate("FlashEventDetail", { name: ev.name, dateRange: ev.dateRange }); }}
      />
    </View>
  );
}

// Flash product action sheet (edit discount/qty, stats, remove).
export function FlashActionSheet({ product, onClose, onRemove }: { product: FlashProduct | null; onClose: () => void; onRemove?: (p: FlashProduct) => void }) {
  const p = product;
  const Row = ({ Icon, label, color = "#0a0a0a", divider, onPress }: { Icon: typeof Package; label: string; color?: string; divider?: boolean; onPress: () => void }) => (
    <Pressable onPress={onPress} className="flex-row items-center active:bg-neutral-50" style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 16, borderTopWidth: divider ? 0.5 : 0, borderTopColor: "#ececec" }}>
      <Icon size={20} color={color === "#0a0a0a" ? TEXT_SECONDARY : color} strokeWidth={2.2} />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color }}>{label}</Text>
    </Pressable>
  );
  return (
    <BottomSheet
      visible={!!p}
      onClose={onClose}
      centerTitle
      title={p?.name ?? ""}
      centerSubtitle={p ? (
        <Text style={{ fontSize: 12.5, color: TEXT_MUTED }} numberOfLines={1}>
          <Text style={{ color: "#ff3b30", fontWeight: "700" }}>฿{p.flashPrice.toLocaleString()}</Text>
          {" · "}-{p.discount}%{" · "}เหลือ {p.remaining.toLocaleString()}/{p.total.toLocaleString()}
        </Text>
      ) : undefined}
      minHeightRatio={0.1}
      maxHeightRatio={0.6}
    >
      {p ? (
        <View style={{ paddingTop: 4 }}>
          <Row Icon={Pencil} label="แก้ไขส่วนลด / จำนวน" onPress={() => { onClose(); Alert.alert("แก้ไข Flash Sale", `${p.name}\n(กำลังพัฒนา)`); }} />
          <Row divider Icon={BarChart3} label="ดูสถิติการขาย" onPress={() => { onClose(); Alert.alert("สถิติการขาย", `${p.name}\nขาย ${p.sold} · รายได้ ฿${p.revenue.toLocaleString()}`); }} />
          <Row divider Icon={Trash2} label="นำออกจาก Flash Sale" color="#ff3b30" onPress={() => { onClose(); if (onRemove) onRemove(p); else Alert.alert("นำออก", `นำ "${p.name}" ออกจาก Flash Sale? (กำลังพัฒนา)`); }} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

// Join terms & benefits sheet — ported from web "Flash Sale Join Popup".
function FlashTermsSheet({ event, onClose, onJoin }: { event: FlashEvent | null; onClose: () => void; onJoin: () => void }) {
  const BENEFITS = [
    "รับส่วนลดสูงสุดในช่วง Flash Sale ตามอัตราที่ METAHERB กำหนด",
    "สินค้าจะถูกโปรโมตบนหน้าแรกและช่องทางสื่อสารของ METAHERB โดยไม่มีค่าใช้จ่าย",
    "เข้าถึงลูกค้าใหม่ พร้อมกระตุ้นยอดขายในเวลาจำกัด",
    "เสริมความน่าเชื่อถือของร้านด้วยตราสัญลักษณ์ Flash Sale",
  ];
  const CONDITIONS = [
    "รอบกิจกรรม Flash Sale ถูกกำหนดโดยผู้ดูแลระบบ (Admin) ของ METAHERB",
    "ร้านค้าต้องเลือกสินค้าและตั้งราคาส่วนลดให้เสร็จก่อนเวลาเริ่มกิจกรรม",
    "ราคาและส่วนลดต้องเป็นไปตามมาตรฐานที่ METAHERB กำหนด",
    "เมื่อกิจกรรมเริ่มแล้ว ไม่สามารถยกเลิกหรือแก้ไขสินค้าที่เข้าร่วมได้",
    "สินค้าต้องมีสต็อกเพียงพอตลอดระยะเวลาของกิจกรรม",
  ];
  const Bullet = ({ text }: { text: string }) => (
    <View className="flex-row" style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, color: "#4b5563", lineHeight: 20 }}>•</Text>
      <Text style={{ flex: 1, fontSize: 13, color: "#4b5563", lineHeight: 20 }}>{text}</Text>
    </View>
  );
  return (
    <BottomSheet visible={!!event} onClose={onClose} title="" noHeader fillContent minHeightRatio={0.9} maxHeightRatio={0.9}>
      <View style={{ flex: 1 }}>
        {/* Full-bleed hero — glass close + glass title float on top of the image */}
        <View style={{ height: 210, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" }}>
          <LinearGradient colors={["rgba(230,46,5,0.7)", "#e62e05"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
            <Image source={FLASH_TERMS_IMG} style={{ position: "absolute", left: "50%", marginLeft: -140, bottom: -30, width: 280, height: 240 }} resizeMode="contain" />
          </LinearGradient>
          {/* close — floats top-left */}
          <View style={{ position: "absolute", top: 16, left: 16, zIndex: 2 }}>
            <GlassIconButton onPress={onClose} size={40} accessibilityLabel="ปิด">
              <X size={20} color="#1a1a1a" strokeWidth={2.6} />
            </GlassIconButton>
          </View>
          {/* title — centered glass pill */}
          <View style={{ position: "absolute", top: 16, left: 0, right: 0, alignItems: "center" }}>
            <GlassView glassEffectStyle="regular" colorScheme="light" style={{ height: 40, borderRadius: 20, paddingHorizontal: 16, justifyContent: "center", overflow: "hidden" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>เงื่อนไขและสิทธิประโยชน์</Text>
            </GlassView>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>สิทธิประโยชน์ที่ร้านค้าจะได้รับ</Text>
            {BENEFITS.map((t, i) => <Bullet key={i} text={t} />)}
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>เงื่อนไขการเข้าร่วม</Text>
            {CONDITIONS.map((t, i) => <Bullet key={i} text={t} />)}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: "#f1f1f1" }}>
          <Pressable onPress={onJoin} className="items-center justify-center active:opacity-90" style={{ height: 49, borderRadius: 999, backgroundColor: "#008c45" }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "white" }}>เข้าร่วม</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}



export function ProductsManageSection({ type, setType, showSearch = true }: { type: "regular" | "material"; setType: (t: "regular" | "material") => void; showSearch?: boolean }) {
  const nav = useNavigation<Nav>();
  // Product-type chips (ผลิตภัณฑ์ / วัตถุดิบ) switch the list; status + category
  // live behind the "กรองเพิ่มเติม" button → ShopProductFilter sheet (same
  // filter shell as the customer ผลิตภัณฑ์ page).
  const [filter, setFilter] = useState<"all" | PMStatus>("all");
  const [query, setQuery] = useState("");
  // Store-backed lists — toggle/delete from any page updates here live.
  const regular = usePMProducts("regular");
  const material = usePMProducts("material");
  const [menuFor, setMenuFor] = useState<PMProduct | null>(null);

  // Brief skeleton-load whenever the tab changes (or on first mount).
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 280);
    return () => clearTimeout(t);
  }, [type]);

  const list = type === "regular" ? regular : material;

  const q = query.trim().toLowerCase();
  const visible = list.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });
  const filterActive = filter !== "all";

  const remove = (p: PMProduct) =>
    Alert.alert("ลบสินค้า", `ต้องการลบ "${p.name}" ใช่หรือไม่?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => { deletePMProduct(p.id); setMenuFor(null); } },
    ]);

  return (
    <View style={{ gap: 14 }}>
      {/* Add action is a floating FAB rendered by OverviewScreen (above the tab bar). */}

      {/* Search — hidden on the pushed subpage (app-bar button → ShopProductManageSearch) */}
      {showSearch ? (
      <View
        className="flex-row items-center"
        style={{ backgroundColor: "white", borderWidth: 1, borderColor: DIVIDER_GRAY, borderRadius: 999, height: 44, paddingLeft: 16, paddingRight: 6, gap: 8 }}
      >
        <TextInput
          style={{ flex: 1, fontSize: 13, color: TEXT_PRIMARY, padding: 0 }}
          placeholder="ค้นหาชื่อสินค้า หรือหมวดหมู่"
          placeholderTextColor={TEXT_DISABLED}
          value={query}
          onChangeText={setQuery}
        />
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
          <Search size={16} color="white" />
        </View>
      </View>
      ) : null}

      {/* Filter row — "กรองเพิ่มเติม" button (status filter) + product-type
          chips (ผลิตภัณฑ์ / วัตถุดิบ — the old segmented tabs, now as chips) */}
      <View className="flex-row items-center" style={{ marginHorizontal: -16, paddingHorizontal: 16, gap: 8 }}>
        <Pressable
          onPress={() =>
            nav.navigate("ShopProductFilter", {
              status: filter,
              productType: type,
              counts: {
                regular: statusCounts(regular),
                material: statusCounts(material),
              },
              onApply: (s, t) => {
                setFilter(s);
                if (t !== type) setType(t);
              },
            })
          }
          accessibilityLabel="กรองเพิ่มเติม"
          className="items-center justify-center active:opacity-80"
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: filterActive ? BRAND_GREEN : "white", borderWidth: 1, borderColor: filterActive ? BRAND_GREEN : DIVIDER_GRAY }}
        >
          <SlidersHorizontal size={16} color={filterActive ? "white" : TEXT_SECONDARY} strokeWidth={2.2} />
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
          {([
            { id: "regular" as const, label: "ผลิตภัณฑ์", Icon: Package, n: regular.length },
            { id: "material" as const, label: "วัตถุดิบ", Icon: Sprout, n: material.length },
          ]).map(({ id, label, Icon, n }) => {
            const active = type === id;
            return (
              <Pressable
                key={id}
                onPress={() => { setType(id); setFilter("all"); }}
                className="flex-row items-center active:opacity-80"
                style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, gap: 6, backgroundColor: active ? BRAND_GREEN : "white", borderWidth: 1, borderColor: active ? BRAND_GREEN : DIVIDER_GRAY }}
              >
                <Icon size={14} color={active ? "white" : TEXT_MUTED} strokeWidth={2.2} />
                <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "white" : TEXT_SECONDARY }}>{label}</Text>
                <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", backgroundColor: active ? "rgba(255,255,255,0.25)" : SURFACE_GRAY }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "white" : TEXT_MUTED }}>{n}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Card list */}
      {loading ? (
        [0, 1, 2, 3].map((i) => <PMCardSkeleton key={i} />)
      ) : visible.length === 0 ? (
        <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, paddingVertical: 48, alignItems: "center", gap: 10 }}>
          <PackageX size={40} color={BORDER_GRAY} strokeWidth={1.5} />
          <Text style={{ fontSize: 14, color: TEXT_DISABLED }}>ไม่พบสินค้า</Text>
        </View>
      ) : (
        visible.map((p) => (
          <PMCard key={p.id} p={p} onMenu={() => setMenuFor(p)} onPreview={() => nav.navigate("ShopProductDetail", { productId: p.id, type })} />
        ))
      )}

      {/* Long-press action menu */}
      <PMActionSheet
        product={menuFor}
        onClose={() => setMenuFor(null)}
        onToggle={(prod) => {
          const next: PMStatus = prod.status === "เปิดขาย" ? "ปิดขาย" : "เปิดขาย";
          setPMStatus(prod.id, next);
          // Update the open sheet's product so the switch reflects the new state.
          setMenuFor({ ...prod, status: next, statusColor: PM_STATUS_COLOR[next] });
        }}
        onDelete={remove}
      />

    </View>
  );
}

// Floating "+" add button (FAB) — sits above the bottom tab bar on the
// product-management page.
export function PMAddFab({ bottom, onPress }: { bottom: number; onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <View style={{ position: "absolute", right: 16, bottom, borderRadius: 30, shadowColor: BRAND_GREEN, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 14 }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityLabel="เพิ่มสินค้า"
        style={{
          width: 58, height: 58, borderRadius: 29, backgroundColor: BRAND_GREEN,
          alignItems: "center", justifyContent: "center",
          transform: [{ scale: pressed ? 0.92 : 1 }],
          shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 6,
        }}
      >
        <Plus size={26} color="white" strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

// Speed-dial add button — pressing + springs TWO separate pill actions out
// above the FAB (เพิ่มผลิตภัณฑ์ / เพิ่มวัตถุดิบ), each its own floating button
// with a tinted icon tile, while the plus rotates into a close ×. Tap-outside
// or the × collapses everything back into the FAB.
export function PMAddMenuFab({ bottom, onAdd }: { bottom: number; onAdd: (mode: "regular" | "material") => void }) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const toggle = (to: boolean) => {
    setOpen(to);
    Animated.spring(anim, { toValue: to ? 1 : 0, useNativeDriver: true, stiffness: 330, damping: 24, mass: 0.9 }).start();
  };
  const pick = (mode: "regular" | "material") => {
    toggle(false);
    onAdd(mode);
  };

  // lift = final distance above the FAB; each button travels up from the FAB.
  const ACTIONS = [
    { key: "regular" as const, label: "เพิ่มผลิตภัณฑ์", Icon: Package, tint: BRAND_GREEN, lift: 70 },
    { key: "material" as const, label: "เพิ่มวัตถุดิบ", Icon: Sprout, tint: "#14b8a6", lift: 140 },
  ];

  return (
    <>
      {/* Tap-outside catcher */}
      {open ? (
        <Pressable onPress={() => toggle(false)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} />
      ) : null}

      {/* Action pills — separate floating buttons springing out of the FAB */}
      {ACTIONS.map((a) => (
        <Animated.View
          key={a.key}
          pointerEvents={open ? "auto" : "none"}
          style={{
            position: "absolute",
            right: 16,
            bottom: bottom + a.lift,
            zIndex: 41,
            opacity: anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [a.lift - 6, 0] }) },
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
            ],
          }}
        >
          {/* Label chip on the left · FAB-sized icon circle on the right
              (the circle stacks in the same column as the + button) */}
          <Pressable onPress={() => pick(a.key)} className="flex-row items-center active:opacity-80" style={{ gap: 10 }}>
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 999,
                height: 38,
                paddingHorizontal: 14,
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.14,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#1a1a1a" }}>{a.label}</Text>
            </View>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: a.tint,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: a.tint,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.32,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              <a.Icon size={24} color="#fff" strokeWidth={2.4} />
            </View>
          </Pressable>
        </Animated.View>
      ))}

      {/* The FAB — plus rotates into × while open */}
      <View style={{ position: "absolute", right: 16, bottom, zIndex: 42, borderRadius: 30, shadowColor: BRAND_GREEN, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 14 }}>
        <Pressable
          onPress={() => toggle(!open)}
          accessibilityLabel={open ? "ปิดเมนูเพิ่ม" : "เพิ่มสินค้า"}
          className="active:opacity-90"
          style={{
            width: 58, height: 58, borderRadius: 29, backgroundColor: BRAND_GREEN,
            alignItems: "center", justifyContent: "center",
            shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 6,
          }}
        >
          <Animated.View style={{ transform: [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] }) }] }}>
            <Plus size={26} color="white" strokeWidth={2.6} />
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

// Product card — same layout language as the order / quotation cards: flat
// white card, header row (image + name / category / chip row: status + type +
// participation tags), divider, then stock flush left with the price flush
// right. Tap = product detail page; long-press = action menu.
export function PMCard({ p, onMenu, onPreview }: { p: PMProduct; onMenu: () => void; onPreview: () => void }) {
  const dimmed = p.status !== "เปิดขาย";
  const overlay = p.status === "สินค้าหมด" ? "หมด" : p.status === "ปิดขาย" ? "ปิด" : null;
  // In a RUNNING product-scoped promotion? (store-backed, live). Scheduled
  // promos don't count — the tag mirrors what the storefront shows right now.
  // A flash-sale product can never simultaneously be in a promotion, so the
  // flash flag wins if the data ever conflicts.
  const promotions = useAllPromotions();
  const inPromo =
    !p.flash &&
    promotions.some(
      (pr) => pr.enabled && promoStatus(pr) === "active" && pr.scope === "products" && pr.products.some((x) => x.productId === p.id),
    );

  return (
    <Pressable
      onPress={onPreview}
      onLongPress={onMenu}
      className="active:opacity-90"
      style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}
    >
      {/* Header — image + name / category / status + type + participation chips */}
      <View className="flex-row items-center" style={{ gap: 12 }}>
        {/* iPad gets a larger thumbnail so the photo reads in the wider card. */}
        <View style={{ width: isTablet() ? 84 : 52, height: isTablet() ? 84 : 52, borderRadius: 12, overflow: "hidden", backgroundColor: "#f0f0f0" }}>
          <Image source={p.image} style={{ width: "100%", height: "100%", opacity: dimmed ? 0.55 : 1 }} resizeMode="cover" />
          {overlay ? (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.32)" }}>
              <Text style={{ color: "white", fontSize: 11, fontWeight: "800" }}>{overlay}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Name row — status pill sits flush right of the name */}
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>{p.name}</Text>
            <View style={{ backgroundColor: p.statusColor + "1a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: p.statusColor }}>{p.status}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }} numberOfLines={1}>{p.category}</Text>
          {/* Chip row — type + participation tags, under the category. Pill
              sizing matches the peer list cards (order/coupon status pills). */}
          <View className="flex-row items-center" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <View style={{ backgroundColor: p.typeColor + "1a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: p.typeColor }}>{p.type}</Text>
            </View>
            {p.flash ? (
              <View className="flex-row items-center" style={{ gap: 4, backgroundColor: "rgba(230,46,5,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <Zap size={11} color="#e62e05" strokeWidth={2.6} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#e62e05" }}>Flash Sale</Text>
              </View>
            ) : null}
            {p.recommended ? (
              <View style={{ backgroundColor: "rgba(49,151,84,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: BRAND_GREEN }}>★ แนะนำ</Text>
              </View>
            ) : null}
            {inPromo ? (
              <View style={{ backgroundColor: "rgba(245,158,11,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#d97706" }}>โปรโมชั่น</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Footer — stock left · price right (menu moved to long-press) */}
      <View className="flex-row items-center justify-between" style={{ gap: 10 }}>
        <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED }}>คงเหลือ {p.stockText}</Text>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "800", color: "#0a0a0a" }}>{p.priceText}</Text>
      </View>
    </Pressable>
  );
}

// Bottom-sheet action menu for a product (toggle sale / edit / stock / delete).
export function PMActionSheet({
  product, onClose, onToggle, onDelete,
}: {
  product: PMProduct | null;
  onClose: () => void;
  onToggle: (p: PMProduct) => void;
  onDelete: (p: PMProduct) => void;
}) {
  const p = product;
  const Row = ({ Icon, label, color = "#0a0a0a", divider, onPress }: { Icon: typeof Package; label: string; color?: string; divider?: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:bg-neutral-50"
      style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 14, borderTopWidth: divider ? 1 : 0, borderTopColor: "#f0f0f0" }}
    >
      <Icon size={20} color={color === "#0a0a0a" ? TEXT_SECONDARY : color} strokeWidth={2.2} />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color }}>{label}</Text>
    </Pressable>
  );

  return (
    <BottomSheet
      visible={!!p}
      onClose={onClose}
      centerTitle
      title={p?.name ?? ""}
      centerSubtitle={p ? (
        <Text style={{ fontSize: 12.5, color: TEXT_MUTED }} numberOfLines={1}>
          {p.type}{" · "}
          <Text style={{ color: BRAND_GREEN, fontWeight: "700" }}>{p.priceText}</Text>
          {" · "}{p.stockText}
        </Text>
      ) : undefined}
      minHeightRatio={0.1}
      maxHeightRatio={0.85}
    >
      {p ? (
        <View style={{ paddingTop: 4 }}>
          {/* Plain white rows with hairline dividers (same as other sheets) */}
          <View style={{ borderTopWidth: 1, borderTopColor: "#f0f0f0" }}>
            {/* Sale on/off — switch toggle */}
            <View className="flex-row items-center" style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 14 }}>
              <PackageCheck size={20} color={p.status === "เปิดขาย" ? BRAND_GREEN : TEXT_SECONDARY} strokeWidth={2.2} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: "#0a0a0a" }}>เปิดการขาย</Text>
              <Switch
                value={p.status === "เปิดขาย"}
                onValueChange={() => onToggle(p)}
                trackColor={{ false: "#e9e9ea", true: BRAND_GREEN }}
                thumbColor="#ffffff"
                ios_backgroundColor="#e9e9ea"
              />
            </View>
            <Row divider Icon={Pencil} label="แก้ไขสินค้า" onPress={() => { onClose(); Alert.alert("แก้ไขสินค้า", `${p.name}\n(แบบฟอร์มกำลังพัฒนา)`); }} />
            <Row divider Icon={Boxes} label="จัดการสตอกสินค้า" onPress={() => { onClose(); Alert.alert("จัดการสตอก", `${p.name}\n(กำลังพัฒนา)`); }} />
            <Row divider Icon={Trash2} label="ลบสินค้า" color="#ff3b30" onPress={() => onDelete(p)} />
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

export function DocSection({ kind, showSearch = true }: { kind: DocKind; showSearch?: boolean }) {
  const nav = useNavigation<Nav>();
  const docs = kind === "qt" ? QUOTATIONS : kind === "pr" ? PURCHASE_REQUESTS : PURCHASE_ORDERS_DOC;
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const statuses = Object.keys(DOC_STATUS[kind]);
  const count = (id: string) => (id === "all" ? docs.length : docs.filter((d) => d.status === id).length);

  const q = query.trim().toLowerCase();
  const visible = docs.filter((d) => {
    if (filter !== "all" && d.status !== filter) return false;
    if (!q) return true;
    return (
      d.id.toLowerCase().includes(q) ||
      d.company.toLowerCase().includes(q) ||
      d.items.some((it) => it.name.toLowerCase().includes(q))
    );
  });

  return (
    <View style={{ gap: 14 }}>
      {/* Search — hidden on the pushed subpage (app-bar button → ShopDocSearch) */}
      {showSearch ? (
      <View
        className="flex-row items-center"
        style={{ backgroundColor: "white", borderWidth: 1, borderColor: DIVIDER_GRAY, borderRadius: 999, height: 44, paddingLeft: 16, paddingRight: 6, gap: 8 }}
      >
        <TextInput
          style={{ flex: 1, fontSize: 13, color: TEXT_PRIMARY, padding: 0 }}
          placeholder={`ค้นหาเลข${DOC_TITLE[kind]} ชื่อลูกค้า หรือสินค้า`}
          placeholderTextColor={TEXT_DISABLED}
          value={query}
          onChangeText={setQuery}
        />
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
          <Search size={16} color="white" />
        </View>
      </View>
      ) : null}

      {/* Filter pills — full-bleed so the row scrolls edge-to-edge (not cropped) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {["all", ...statuses].map((id) => {
          const active = filter === id;
          const label = id === "all" ? "ทั้งหมด" : DOC_STATUS[kind][id].label;
          const c = count(id);
          return (
            <Pressable
              key={id}
              onPress={() => setFilter(id)}
              className="flex-row items-center active:opacity-80"
              style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, gap: 6, backgroundColor: active ? BRAND_GREEN : "white", borderWidth: 1, borderColor: active ? BRAND_GREEN : DIVIDER_GRAY }}
            >
              <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "white" : TEXT_SECONDARY }}>{label}</Text>
              <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", backgroundColor: active ? "rgba(255,255,255,0.25)" : SURFACE_GRAY }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "white" : TEXT_MUTED }}>{c}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {visible.length === 0 ? (
        <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, paddingVertical: 48, alignItems: "center", gap: 10 }}>
          <FileText size={40} color={BORDER_GRAY} strokeWidth={1.5} />
          <Text style={{ fontSize: 14, color: TEXT_DISABLED }}>ไม่พบ{DOC_TITLE[kind]}</Text>
        </View>
      ) : (
        visible.map((d) => (
          <DocCard key={d.id} doc={d} kind={kind} onOpenDetail={() => nav.navigate("ShopDocDetail", { doc: d, kind })} />
        ))
      )}
    </View>
  );
}

// Priority chip colors — same as the customer B2BDocsScreen (PRIORITY_STYLE).
const DOC_PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  Low: { bg: "#f3f4f6", color: "#6b7280" },
  Normal: { bg: "rgba(59,130,246,0.10)", color: "#2563eb" },
  High: { bg: "rgba(245,158,11,0.10)", color: "#d97706" },
  Urgent: { bg: "rgba(239,68,68,0.10)", color: "#dc2626" },
};
const DOC_KIND_ICON: Record<DocKind, typeof FileText> = { qt: FileText, pr: ClipboardList, po: FileCheck2 };

// B2B document card (PR / PO) — same layout language as the customer
// B2BDocsScreen card: icon + doc id + status pill, meta chips + date,
// requester block, item preview rows, green total.
export function DocCard({ doc, kind, onOpenDetail }: { doc: MarketDoc; kind: DocKind; onOpenDetail: () => void }) {
  const cfg = DOC_STATUS[kind][doc.status];
  const accent = cfg.color;
  const total = docSubtotal(doc);
  const Icon = DOC_KIND_ICON[kind];
  const prio = doc.priority ? DOC_PRIORITY_STYLE[doc.priority] ?? DOC_PRIORITY_STYLE.Normal : null;
  const shown = doc.items.slice(0, 2);

  return (
    <Pressable
      onPress={onOpenDetail}
      className="active:opacity-90"
      style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}
    >
      {/* Header — kind icon + doc id (bold) + status pill (customer card) */}
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
          <Icon size={14} color="#fff" strokeWidth={2.4} />
        </View>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>{doc.id}</Text>
        <View style={{ backgroundColor: accent + "1a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: accent }}>{cfg.label}</Text>
        </View>
      </View>

      {/* Meta — priority chip left · date right (needBy / payment terms live
          on the detail page, not the card) */}
      <View className="flex-row items-center justify-between" style={{ marginTop: 8, gap: 8 }}>
        {prio && doc.priority ? (
          <View className="flex-row items-center" style={{ gap: 3, backgroundColor: prio.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            {doc.priority === "Urgent" ? <AlertCircle size={10} color={prio.color} strokeWidth={2.6} /> : null}
            <Text style={{ fontSize: 10.5, fontWeight: "700", color: prio.color }}>{doc.priority}</Text>
          </View>
        ) : (
          <View />
        )}
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>{doc.date}</Text>
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Requester — company / contact person / phone */}
      <View className="flex-row items-center" style={{ gap: 10, marginBottom: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
          <Building2 size={16} color={BRAND_GREEN} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#000" }} numberOfLines={1}>{doc.company}</Text>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }} numberOfLines={1}>
            {doc.contact}{doc.phone ? ` · ${doc.phone}` : ""}
          </Text>
        </View>
      </View>

      {/* Items preview — first two, customer-card rows */}
      <View style={{ gap: 12 }}>
        {shown.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image source={matImg(item.name)} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 3 }} numberOfLines={1}>
                จำนวน {fmtNum(item.qty)} {item.unit}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{fmtTHBShort(docLineTotal(item))}</Text>
          </View>
        ))}
        {doc.items.length > 2 ? (
          <Text style={{ fontSize: 12, color: TEXT_MUTED, textAlign: "center" }}>+ อีก {doc.items.length - 2} รายการ</Text>
        ) : null}
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Total — muted label left, green total right (customer card sizes) */}
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ยอดรวม</Text>
        <Text style={{ fontSize: 20, fontWeight: "700", color: BRAND_GREEN }}>{fmtTHBShort(total)}</Text>
      </View>
    </Pressable>
  );
}

// Full PR/PO detail — SUPPLIER view (ported from the web PRDetailTab on the shop
// owner side): item lines + cost (VAT) + payment/reference + customer + actions.
// Buyer-internal fields (approver / justification / urgency / ERP) are NOT shown
// to the supplier.
export function DocDetailView({ doc, kind, insetsBottom = 24 }: { doc: MarketDoc; kind: DocKind; insetsBottom?: number }) {
  const nav = useNavigation<Nav>();
  // push (not navigate): we're already on a ShopDocDetail screen, so navigate to
  // the same route would only swap params in place (no push, no transition).
  const goPo = (id?: string) => {
    const po = findPoDoc(id);
    if (!po) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    nav.push("ShopDocDetail", { doc: po, kind: "po" });
  };
  const cfg = DOC_STATUS[kind][doc.status];
  const subtotal = docSubtotal(doc);
  const vat = Math.round(subtotal * 0.07);
  const total = subtotal + vat;
  const needLabel = kind === "po" ? "วันที่จัดส่ง" : "ต้องการภายใน";
  const KindIcon = kind === "po" ? Package : FileText;

  // Primary contextual action for the floating bottom bar (User-page style).
  const primaryAction: { label: string; Icon: typeof BarChart3; onPress?: () => void } | null =
    kind === "po" && doc.status === "received" ? { label: "พร้อมจัดส่ง", Icon: ArrowRightCircle } :
    kind === "po" && doc.status === "preparing" ? { label: "ยืนยันจัดส่ง", Icon: Truck } :
    kind === "pr" && doc.refId ? { label: doc.refId, Icon: FileText, onPress: () => goPo(doc.refId) } :
    null;

  const canCancel =
    (kind === "po" && (doc.status === "received" || doc.status === "preparing")) ||
    (kind === "pr" && doc.status === "received");

  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", marginBottom: 12 }}>{title}</Text>
      {children}
    </View>
  );
  const InfoRow = ({ label, value, valueColor = "#0a0a0a" }: { label: string; value: string; valueColor?: string }) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 13.5, color: valueColor, fontWeight: "500", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insetsBottom + 110 }}
      style={{ backgroundColor: "#fafafa" }}
    >
      {/* Status banner */}
      <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: cfg.color + "1a", alignItems: "center", justifyContent: "center" }}>
            <KindIcon size={18} color={cfg.color} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>
              {kind === "po" ? "สถานะใบสั่งซื้อ" : kind === "qt" ? "สถานะใบเสนอราคา" : "สถานะใบขอสั่งซื้อ"}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: cfg.color, marginTop: 1 }}>{cfg.label}</Text>
          </View>
        </View>
      </View>

      {/* Items + cost breakdown */}
      <Section title={`รายการสินค้า (${doc.items.length})`}>
        <View style={{ gap: 14 }}>
          {doc.items.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Image source={matImg(item.name)} style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <Text style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }} numberOfLines={2}>{item.name}</Text>
                <View className="flex-row items-center" style={{ gap: 6, flexWrap: "wrap" }}>
                  <View style={{ backgroundColor: "rgba(49,151,84,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#319754" }}>เกรด {item.grade}</Text>
                  </View>
                  <View style={{ backgroundColor: SURFACE_GRAY, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: "600", color: TEXT_SECONDARY }}>{fmtNum(item.qty)} {item.unit} × ฿{fmtNum(item.pricePerUnit)}/{item.unit}</Text>
                  </View>
                </View>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{fmtTHBShort(docLineTotal(item))}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 14 }} />
        {kind === "qt" ? (
          // Quotation = pre-VAT (mirrors the buyer's ใบเสนอราคา).
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>ยอดรวมทั้งสิ้น</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: BRAND_GREEN }}>{fmtTHBShort(subtotal)}</Text>
          </View>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <InfoRow label="ยอดรวม" value={fmtTHBShort(subtotal)} />
              <InfoRow label="VAT 7%" value={fmtTHBShort(vat)} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>รวมทั้งสิ้น</Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#ff383c" }}>{fmtTHBShort(total)}</Text>
            </View>
          </>
        )}
      </Section>

      {/* Quotation info (qt) — validity; or payment/reference (pr/po) */}
      {kind === "qt" ? (
        <Section title="ข้อมูลใบเสนอราคา">
          <InfoRow label="วันที่เสนอราคา" value={doc.date} />
          {doc.validUntil ? <InfoRow label="มีผลถึง" value={doc.validUntil} /> : null}
          {doc.daysRemaining !== undefined ? (
            <InfoRow
              label="คงเหลือ"
              value={doc.daysRemaining <= 0 ? "หมดอายุแล้ว" : `${doc.daysRemaining} วัน`}
              valueColor={doc.daysRemaining <= 7 ? "#dc2626" : doc.daysRemaining <= 30 ? "#d97706" : "#319754"}
            />
          ) : null}
          <InfoRow label="เงื่อนไขชำระเงิน" value={doc.paymentTerms} valueColor="#d97706" />
        </Section>
      ) : (
        <Section title="ข้อมูลการชำระเงิน / อ้างอิง">
          <InfoRow label="เงื่อนไขชำระเงิน" value={doc.paymentTerms} valueColor="#d97706" />
          {doc.needBy ? <InfoRow label={needLabel} value={doc.needBy} /> : null}
          {doc.shippingMethod ? <InfoRow label="วิธีจัดส่ง" value={doc.shippingMethod} /> : null}
          {doc.trackingNumber ? <InfoRow label="เลขพัสดุ" value={doc.trackingNumber} /> : null}
          {doc.refId ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, color: TEXT_MUTED }}>เลข PO ที่ออกแล้ว</Text>
              <View className="flex-row items-center" style={{ gap: 2 }}>
                <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#007aff" }}>{doc.refId}</Text>
                <ChevronRight size={15} color="#007aff" />
              </View>
            </View>
          ) : null}
        </Section>
      )}

      {/* Delivery status timeline — PO only */}
      {kind === "po" ? (
        <Section title="สถานะการจัดส่ง">
          {(() => {
            const STEPS = ["PO เข้าระบบ", "พร้อมจัดส่ง", "กำลังจัดส่ง", "ส่งสำเร็จ"];
            const order: Record<string, number> = { received: 1, preparing: 2, shipped: 3, delivered: 4, cancelled: 0 };
            const cur = order[doc.status] ?? 0;
            return STEPS.map((label, i) => {
              const n = i + 1;
              const done = n < cur;
              const current = n === cur;
              const active = done || current;
              const last = i === STEPS.length - 1;
              return (
                <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ alignItems: "center", width: 28 }}>
                    <View
                      style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: done ? BRAND_GREEN : "#fff",
                        borderWidth: 2, borderColor: active ? BRAND_GREEN : "#d4d4d4",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: done ? "#fff" : active ? BRAND_GREEN : "#a3a3a3" }}>{n}</Text>
                    </View>
                    {!last ? (
                      <View style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: n < cur ? BRAND_GREEN : "#e5e5e5", marginVertical: 2 }} />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: last ? 0 : 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: active ? BRAND_GREEN : "#a3a3a3" }}>{label}</Text>
                    <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{n <= cur ? doc.date : "-"}</Text>
                  </View>
                </View>
              );
            });
          })()}
        </Section>
      ) : null}

      {/* Customer */}
      <Section title="ข้อมูลลูกค้า">
        <View style={{ gap: 12 }}>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Store size={18} color={BRAND_GREEN} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={2}>{doc.company}</Text>
              {doc.taxId ? <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>เลขผู้เสียภาษี {doc.taxId}</Text> : null}
            </View>
          </View>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
              <User size={18} color={BRAND_GREEN} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>{doc.contact}</Text>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>{doc.phone}</Text>
            </View>
          </View>
          {doc.email ? (
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                <MessageCircle size={18} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: TEXT_SECONDARY }}>{doc.email}</Text>
            </View>
          ) : null}
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
              <MapPin size={18} color={BRAND_GREEN} strokeWidth={2.2} />
            </View>
            <Text style={{ flex: 1, fontSize: 13, color: TEXT_SECONDARY, lineHeight: 19 }}>{doc.address}</Text>
          </View>
        </View>
      </Section>

      {/* Cancel — bottom-most action (outline danger) */}
      {canCancel ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Pressable
            className="flex-row items-center justify-center active:opacity-80"
            style={{ height: 46, borderRadius: 999, borderWidth: 1, borderColor: "#ef4444", gap: 6 }}
          >
            <X size={16} color="#ef4444" strokeWidth={2.2} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#ef4444" }}>ยกเลิกสินค้า</Text>
          </Pressable>
        </View>
      ) : null}

    </ScrollView>

      {/* Floating glass action bar — User-page style (circular contact icon +
          primary pill). Download lives on the top-right of the header now. */}
      <LinearGradient pointerEvents="none" colors={["transparent", "#fafafa"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90 }} />
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: insetsBottom + 8 }}>
        <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
          <GlassView glassEffectStyle="regular" colorScheme="light" style={{ borderRadius: 34, overflow: "hidden", padding: 9, flexDirection: "row", alignItems: "center", gap: 8 }}>
            {primaryAction ? (
              <>
                {/* Contact — circular icon button (only when a primary pill is shown) */}
                <Pressable
                  hitSlop={6}
                  className="active:opacity-70"
                  style={{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(49,151,84,0.1)" }}
                >
                  <MessageCircle size={22} color={BRAND_GREEN} />
                </Pressable>
                {/* Primary action — green pill */}
                <Pressable
                  onPress={primaryAction.onPress}
                  className="active:opacity-90"
                  style={{ flex: 1, height: 50, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, backgroundColor: BRAND_GREEN }}
                >
                  <primaryAction.Icon size={18} color="#fff" strokeWidth={2.3} />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{primaryAction.label}</Text>
                </Pressable>
              </>
            ) : (
              // No primary action — single full-width "ติดต่อลูกค้า" pill (no duplicate)
              <Pressable
                className="active:opacity-90"
                style={{ flex: 1, height: 50, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, backgroundColor: BRAND_GREEN }}
              >
                <MessageCircle size={18} color="#fff" strokeWidth={2.3} />
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>ติดต่อลูกค้า</Text>
              </Pressable>
            )}
          </GlassView>
        </View>
      </View>
    </View>
  );
}




// ===================== ORDERS SECTION =====================
// Mobile port of the web OrdersTab: filter pills (horizontal scroll) + search,
// then a stack of order cards filtered by the active tab + query.
export function OrdersSection({ showSearch = true, initialFilter }: { showSearch?: boolean; initialFilter?: string }) {
  const [filter, setFilter] = useState<"all" | OrderStatus>((initialFilter as OrderStatus) ?? "all");
  const [query, setQuery] = useState("");

  const count = (id: "all" | OrderStatus) =>
    id === "all" ? ORDERS.length : ORDERS.filter((o) => o.status === id).length;

  const q = query.trim().toLowerCase();
  const visible = ORDERS.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (!q) return true;
    return (
      o.id.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q) ||
      o.items.some((it) => it.name.toLowerCase().includes(q))
    );
  });

  return (
    <View style={{ gap: 14 }}>
      {/* Search — hidden on the pushed จัดการคำสั่งซื้อ page (its app-bar search
          button opens the ShopOrderSearch page instead) */}
      {showSearch ? (
      <View
        className="flex-row items-center"
        style={{
          backgroundColor: "white",
          borderWidth: 1,
          borderColor: DIVIDER_GRAY,
          borderRadius: 999,
          height: 44,
          paddingLeft: 16,
          paddingRight: 6,
          gap: 8,
        }}
      >
        <TextInput
          style={{ flex: 1, fontSize: 13, color: TEXT_PRIMARY, padding: 0 }}
          placeholder="ค้นหาเลขที่ออเดอร์ / ลูกค้า / สินค้า"
          placeholderTextColor={TEXT_DISABLED}
          value={query}
          onChangeText={setQuery}
        />
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: BRAND_GREEN,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Search size={16} color="white" />
        </View>
      </View>
      ) : null}

      {/* Filter pills — full-bleed horizontal scroll (Fitts: 36px tall) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      >
        {ORDER_TABS.map((tb) => {
          const active = filter === tb.id;
          const c = count(tb.id);
          return (
            <Pressable
              key={tb.id}
              onPress={() => setFilter(tb.id)}
              className="flex-row items-center active:opacity-80"
              style={{
                height: 36,
                paddingHorizontal: 14,
                borderRadius: 999,
                gap: 6,
                backgroundColor: active ? BRAND_GREEN : "white",
                borderWidth: 1,
                borderColor: active ? BRAND_GREEN : DIVIDER_GRAY,
              }}
            >
              <tb.Icon size={14} color={active ? "white" : TEXT_MUTED} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: active ? "700" : "500",
                  color: active ? "white" : TEXT_SECONDARY,
                }}
              >
                {tb.label}
              </Text>
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  paddingHorizontal: 5,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? "rgba(255,255,255,0.25)" : SURFACE_GRAY,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: active ? "white" : TEXT_MUTED,
                  }}
                >
                  {c}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Order cards / empty state */}
      {visible.length === 0 ? (
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: DIVIDER_GRAY,
            paddingVertical: 56,
            alignItems: "center",
            gap: 10,
          }}
        >
          <ClipboardList size={40} color={BORDER_GRAY} strokeWidth={1.5} />
          <Text style={{ fontSize: 14, color: TEXT_DISABLED }}>ไม่พบคำสั่งซื้อ</Text>
        </View>
      ) : (
        visible.map((o) => <OrderCard key={o.id} order={o} />)
      )}
    </View>
  );
}

// Order card — same visual language as the buyer "คำสั่งซื้อของฉัน" screen, with
// seller-side data (customer + delivery slip instead of shop + timeline). The
// delivery slip is always visible (owner needs it at a glance to fulfil); only
// extra items collapse ("ดูอีก N รายการ"). Laws: Jakob's (matches the buyer
// card), Von Restorff (one filled forward CTA), Fitts (38px).
export function OrderCard({ order }: { order: ShopOrder }) {
  const nav = useNavigation<Nav>();
  const cfg = ORDER_STATUS_CFG[order.status];
  const accent = cfg.pillBg;
  const total = orderTotal(order);
  const totalQty = order.items.reduce((s, it) => s + it.qty, 0);
  const [expanded, setExpanded] = useState(false);
  const shownItems = expanded ? order.items : order.items.slice(0, 2);

  const Btn = ({
    label,
    variant,
    Icon,
    onPress,
  }: {
    label: string;
    variant: "primary" | "outline" | "danger" | "amber";
    Icon?: typeof BarChart3;
    onPress?: () => void;
  }) => {
    const s = {
      primary: { bg: BRAND_GREEN, border: BRAND_GREEN, text: "#fff" },
      amber: { bg: "transparent", border: "#f59e0b", text: "#f59e0b" },
      outline: { bg: "transparent", border: BRAND_GREEN, text: BRAND_GREEN },
      danger: { bg: "transparent", border: "#ef4444", text: "#ef4444" },
    }[variant];
    return (
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-center active:opacity-80"
        style={{ height: 38, paddingHorizontal: 16, borderRadius: 999, backgroundColor: s.bg, borderWidth: 1, borderColor: s.border, gap: 5 }}
      >
        {Icon ? <Icon size={15} color={s.text} strokeWidth={2.2} {...(variant === "amber" ? { fill: "#f59e0b" } : {})} /> : null}
        <Text style={{ fontSize: 13, fontWeight: "600", color: s.text }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <Pressable
      onPress={() => nav.navigate("ShopOrderDetail", { orderId: order.id })}
      className="active:opacity-90"
      style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}
    >
      {/* Customer + status badge (top-right) */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
            <User size={14} color="#fff" strokeWidth={2.4} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>{order.customer}</Text>
        </View>
        <View style={{ backgroundColor: accent + "1a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: accent }}>{cfg.label}</Text>
        </View>
      </View>

      {/* Order id (left) · date (right) */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 8 }}>
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED, flexShrink: 1 }} numberOfLines={1}>{order.id}</Text>
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED }} numberOfLines={1}>{order.date}</Text>
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Items */}
      <View style={{ gap: 14 }}>
        {shownItems.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image source={item.image} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 3 }} numberOfLines={1}>{item.option}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{fmtTHBShort(item.price)}</Text>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>x{item.qty}</Text>
            </View>
          </View>
        ))}
        {order.items.length > 2 && !expanded ? (
          <Pressable
            onPress={() => setExpanded(true)}
            className="flex-row items-center justify-center active:opacity-70"
            style={{ gap: 4, paddingVertical: 7, backgroundColor: "#f6f6f6", borderRadius: 10 }}
          >
            <Text style={{ fontSize: 12, color: TEXT_SECONDARY, fontWeight: "500" }}>ดูอีก {order.items.length - 2} รายการ</Text>
            <ChevronDown size={14} color={TEXT_SECONDARY} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>

      {/* Delivery slip — always visible */}
      <View style={{ borderTopWidth: 1, borderTopColor: "#f0f0f0", marginTop: 12, paddingTop: 12, gap: 10 }}>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View
            className="flex-row items-center"
            style={{ backgroundColor: "rgba(49,151,84,0.1)", paddingLeft: 8, paddingRight: 10, paddingVertical: 4, borderRadius: 999, gap: 5 }}
          >
            {order.shippingMethod === "รับที่ร้าน" ? <Store size={12} color={BRAND_GREEN} /> : <Truck size={12} color={BRAND_GREEN} />}
            <Text style={{ fontSize: 11, fontWeight: "600", color: BRAND_GREEN }}>{order.shippingMethod}</Text>
          </View>
          {order.trackingNumber ? (
            <View className="flex-row items-center" style={{ gap: 4, marginLeft: "auto" }}>
              <Package size={12} color={TEXT_MUTED} />
              <Text style={{ fontSize: 11, fontWeight: "500", color: TEXT_MUTED }}>{order.trackingNumber}</Text>
            </View>
          ) : null}
        </View>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <MapPin size={15} color={BRAND_GREEN} />
          <Text style={{ flex: 1, fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 18 }}>{order.address}</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <MessageCircle size={15} color={BRAND_GREEN} />
          <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY }}>{order.phone}</Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Total + actions */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <View>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>รวม {totalQty} ชิ้น</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#ef4444", marginTop: 1 }}>{fmtTHBShort(total)}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {order.status === "pending_payment" ? (
            <Btn label="ยกเลิก" variant="danger" onPress={() => nav.navigate("CancelOrder", { orderId: order.id })} />
          ) : null}
          {order.status === "pending_verify" ? (
            <Btn label="เตรียมจัดส่ง" variant="primary" Icon={ArrowRightCircle} />
          ) : null}
          {order.status === "ready_ship" ? (
            <Btn label="ยืนยันจัดส่ง" variant="primary" Icon={Truck} onPress={() => nav.navigate("ConfirmShip", { orderId: order.id })} />
          ) : null}
          {order.status === "shipped" && order.reviewScore ? (
            <Btn
              label={`รีวิว ${order.reviewScore}/5`}
              variant="amber"
              Icon={Star}
              onPress={() => nav.navigate("ShopOrderReview", { orderId: order.id })}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// Top Product / Top Customers card — white card, English title + scope subtitle,
// then table-style rows (web parity).
function TopListCard({
  title,
  subtitle,
  mainLabel,
  metricLabel,
  valueLabel,
  children,
}: {
  title: string;
  subtitle: string;
  mainLabel: string;
  metricLabel: string;
  valueLabel: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: DIVIDER_GRAY,
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "700", color: TEXT_PRIMARY }}>
        {title}
      </Text>
      <Text style={{ fontSize: 12, color: TEXT_DISABLED, marginTop: 2, marginBottom: 8 }}>
        {subtitle}
      </Text>
      {/* Column header — widths mirror TopRow so labels sit over their values. */}
      <View
        className="flex-row items-center"
        style={{ gap: 10, paddingBottom: 8 }}
      >
        <Text style={{ width: 26, fontSize: 11, color: TEXT_MUTED, textAlign: "center" }}>
          #
        </Text>
        <Text style={{ flex: 1, fontSize: 11, color: TEXT_MUTED }}>{mainLabel}</Text>
        <Text style={{ width: 90, fontSize: 11, color: TEXT_MUTED, textAlign: "right" }}>
          {metricLabel}
        </Text>
        <Text style={{ width: 58, fontSize: 11, color: TEXT_MUTED, textAlign: "right" }}>
          {valueLabel}
        </Text>
      </View>
      {/* Divider between the column header and the list (matches row borders) */}
      <View style={{ height: 1, backgroundColor: "#fafafa" }} />
      <View>{children}</View>
    </View>
  );
}

/**
 * One ranked row: rank badge (top-3 = #ea6549 filled) + optional thumbnail +
 * title/sub + a blue progress bar with its metric + a trailing value column.
 * Mirrors the web Top Product / Top Customers table row.
 */
function TopRow({
  rank,
  image,
  title,
  sub,
  barRatio,
  metric,
  value,
}: {
  rank: number;
  image?: number;
  title: string;
  sub: string;
  barRatio: number;
  metric: string;
  value: string;
}) {
  const top3 = rank <= 3;
  return (
    <View
      className="flex-row items-center"
      style={{
        gap: 10,
        paddingVertical: 8,
        borderTopWidth: rank === 1 ? 0 : 1,
        borderTopColor: "#fafafa",
      }}
    >
      {/* Rank badge */}
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: top3 ? "#ea6549" : SURFACE_GRAY,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: top3 ? "white" : TEXT_MUTED,
          }}
        >
          {rank}
        </Text>
      </View>

      {/* Thumbnail (products only) */}
      {image != null ? (
        <Image
          source={image}
          style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: SURFACE_GRAY }}
        />
      ) : null}

      {/* Title + sub */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={{ fontSize: 11, color: TEXT_DISABLED }} numberOfLines={1}>
          {sub}
        </Text>
      </View>

      {/* Bar + metric */}
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <View
          style={{
            width: 44,
            height: 6,
            borderRadius: 3,
            backgroundColor: SURFACE_GRAY,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.max(6, barRatio * 100)}%`,
              height: "100%",
              backgroundColor: "#4a90d9",
              borderRadius: 3,
            }}
          />
        </View>
        <Text
          style={{ fontSize: 12, color: TEXT_PRIMARY, width: 40, textAlign: "right" }}
          numberOfLines={1}
        >
          {metric}
        </Text>
      </View>

      {/* Trailing value (revenue / total) */}
      <Text
        style={{ fontSize: 12, color: TEXT_PRIMARY, width: 58, textAlign: "right" }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
