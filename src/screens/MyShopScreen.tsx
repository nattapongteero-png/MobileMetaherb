import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Animated,
  useWindowDimensions,
  type TextStyle,
  type ScrollViewProps,
} from "react-native";

type ScrollHandler = ScrollViewProps["onScroll"];
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightCircle,
  Ban,
  BarChart3,
  Beaker,
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Check,
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Info,
  MapPin,
  MessageCircle,
  Package,
  PackageCheck,
  PackageX,
  Pencil,
  Plus,
  PlusCircle,
  ScanSearch,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Ticket,
  Truck,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BottomSheet } from "../components/BottomSheet";
import type { RootStackParamList } from "../navigation/RootStack";
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

// Bottom navbar — 3 destinations for the owner console.
type Tab = "overview" | "shopfront" | "settings";
const NAV_ITEMS: { id: Tab; label: string; Icon: typeof BarChart3 }[] = [
  { id: "overview", label: "ภาพรวม", Icon: BarChart3 },
  { id: "shopfront", label: "หน้าร้านค้า", Icon: Store },
  { id: "settings", label: "ตั้งค่า", Icon: Settings },
];

// Owner-console menu tree — ported from the web OwnerDashboard sidebar.
// Surfaced on mobile via a bottom-sheet menu (scales to many items + the
// sub-menus render as accordion sections inside the sheet).
type SectionId =
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

type MenuNode = {
  id: SectionId;
  label: string;
  Icon: typeof BarChart3;
  children?: { id: SectionId; label: string }[];
};

// Order + structure match the web OwnerDashboard sidebar 1:1.
const SHOP_MENU: MenuNode[] = [
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
      { id: "report_market", label: "Market Report" },
    ],
  },
  {
    id: "finance_overview",
    label: "การเงิน",
    Icon: Wallet,
    children: [
      { id: "finance_tx", label: "ธุรกรรม" },
      { id: "finance_overview", label: "ภาพรวม" },
    ],
  },
  { id: "complaints", label: "เรื่องร้องเรียน", Icon: AlertTriangle },
];

// Flat label lookup for the section selector button.
const SECTION_LABEL: Record<SectionId, string> = {
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
  report_market: "Market Report",
  finance_overview: "ภาพรวมการเงิน",
  finance_tx: "ธุรกรรม",
  complaints: "เรื่องร้องเรียน",
};

// Shop identity — mirrors ShopScreen's SHOP shape so the owner sees the same
// storefront profile they present to customers.
const SHOP = {
  name: "METAHERB Store",
  avatar: "🌿",
  description:
    "ร้านค้าสมุนไพรออร์แกนิกคุณภาพระดับพรีเมียม คัดสรรวัตถุดิบจากแหล่งธรรมชาติทั่วประเทศไทย ผ่านมาตรฐาน อย. และ GMP รับประกันคุณภาพทุกชิ้น จัดส่งรวดเร็วภายใน 1-2 วัน",
  rating: 4.8,
  totalReviews: 1250,
  followers: 8520,
  totalProducts: 45,
  totalSold: "15K+",
  location: "กรุงเทพมหานคร",
  joined: "ม.ค. 2567",
  responseRate: 98,
  responseTime: "ภายใน 5 นาที",
  verified: true,
};

// Mock wallet figures — same shape as OwnerDashboard's `walletAvailable`,
// `walletEscrow`, `walletEscrowOrderCount`.
const WALLET = {
  available: 24580,
  escrow: 8920,
  escrowOrderCount: 14,
  totalIncome: 156200,
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

const TOP_PRODUCTS = [
  { name: "ขมิ้นชันแคปซูล", cat: "สมุนไพรแคปซูล", unit: 60, sold: 1842, revenue: 110520, image: require("../../assets/products/catalog/product-01.png") },
  { name: "ฟ้าทะลายโจร", cat: "สมุนไพรแคปซูล", unit: 145, sold: 1654, revenue: 82700, image: require("../../assets/products/catalog/product-02.png") },
  { name: "ชาเก๊กฮวยออร์แกนิก", cat: "ชาสมุนไพร", unit: 60, sold: 1523, revenue: 91380, image: require("../../assets/products/catalog/product-03.png") },
  { name: "น้ำผึ้งดอกลำไย", cat: "ผลิตภัณฑ์ออร์แกนิก", unit: 215, sold: 1389, revenue: 97230, image: require("../../assets/products/catalog/product-04.png") },
  { name: "ใบบัวบกแคปซูล", cat: "สมุนไพรแคปซูล", unit: 180, sold: 1245, revenue: 74700, image: require("../../assets/products/catalog/product-05.png") },
  { name: "กระชายขาวสกัด", cat: "สมุนไพรสกัด", unit: 245, sold: 1132, revenue: 79240, image: require("../../assets/products/catalog/product-06.jpg") },
  { name: "ชาตะไคร้แห้ง", cat: "ชาสมุนไพร", unit: 50, sold: 1048, revenue: 52400, image: require("../../assets/products/catalog/product-07.jpg") },
  { name: "ขิงผงออร์แกนิก", cat: "ผงสมุนไพร", unit: 80, sold: 962, revenue: 48100, image: require("../../assets/products/catalog/product-08.jpg") },
  { name: "น้ำมันมะพร้าวสกัดเย็น", cat: "น้ำมันสมุนไพร", unit: 140, sold: 874, revenue: 61180, image: require("../../assets/products/catalog/product-09.jpg") },
  { name: "เห็ดหลินจือสกัด", cat: "สมุนไพรสกัด", unit: 140, sold: 791, revenue: 39550, image: require("../../assets/products/catalog/product-10.jpg") },
];

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
const ORDER_STATUS_CFG: Record<
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
type ShopOrder = {
  id: string;
  status: OrderStatus;
  date: string;
  customer: string;
  phone: string;
  address: string;
  shippingMethod: "รับที่ร้าน" | "จัดส่งปกติ" | "จัดส่งด่วน";
  trackingNumber?: string;
  reviewScore?: number;
  items: OrderItem[];
};

const P = (i: number) => TOP_PRODUCTS[i].image; // reuse catalog thumbnails

const ORDERS: ShopOrder[] = [
  {
    id: "ORD-20260204-03521", status: "pending_payment", date: "4 ก.พ. 2569 - 08:12 น.",
    customer: "คุณสมชาย ใจดี", phone: "081-234-5678",
    address: "88/12 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
    shippingMethod: "จัดส่งปกติ",
    items: [{ name: "ขมิ้นชันแคปซูล", option: "60 แคปซูล", qty: 2, price: 440, image: P(0) }],
  },
  {
    id: "ORD-20260204-03520", status: "pending_verify", date: "4 ก.พ. 2569 - 11:08 น.",
    customer: "คุณสมหญิง รักสุขภาพ", phone: "089-876-5432",
    address: "120 หมู่ 5 ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
    shippingMethod: "จัดส่งด่วน",
    items: [
      { name: "ฟ้าทะลายโจร", option: "50 แคปซูล", qty: 1, price: 145, image: P(1) },
      { name: "ชาเก๊กฮวยออร์แกนิก", option: "20 ซอง", qty: 2, price: 250, image: P(2) },
    ],
  },
  {
    id: "ORD-20260203-03517", status: "ready_ship", date: "3 ก.พ. 2569 - 16:45 น.",
    customer: "คุณทานตะวัน งามดี", phone: "086-111-2233",
    address: "55/3 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
    shippingMethod: "จัดส่งปกติ",
    items: [{ name: "น้ำผึ้งดอกลำไย", option: "250 ml", qty: 1, price: 215, image: P(3) }],
  },
  {
    id: "ORD-20260202-03512", status: "shipping", date: "2 ก.พ. 2569 - 09:20 น.",
    customer: "คุณสายฝน พรหมมา", phone: "082-555-7788",
    address: "9 ซ.ลาดพร้าว 71 แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230",
    shippingMethod: "จัดส่งด่วน", trackingNumber: "TH6829-4471-220K",
    items: [
      { name: "ใบบัวบกแคปซูล", option: "60 แคปซูล", qty: 1, price: 180, image: P(4) },
      { name: "กระชายขาวสกัด", option: "60 แคปซูล", qty: 1, price: 245, image: P(5) },
    ],
  },
  {
    id: "ORD-20260131-03505", status: "shipped", date: "31 ม.ค. 2569 - 13:05 น.",
    customer: "คุณฟ้าใส แจ่มจันทร์", phone: "087-222-9090",
    address: "203/7 ถ.เพชรเกษม ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110",
    shippingMethod: "จัดส่งปกติ", trackingNumber: "TH1180-5523-901P", reviewScore: 5,
    items: [{ name: "ชาตะไคร้หอม", option: "30 ซอง", qty: 3, price: 390, image: P(6) }],
  },
  {
    id: "ORD-20260129-03498", status: "cancelled", date: "29 ม.ค. 2569 - 10:41 น.",
    customer: "คุณมานพ ตั้งใจ", phone: "081-444-1212",
    address: "17 หมู่ 2 ต.บางพระ อ.ศรีราชา จ.ชลบุรี 20110",
    shippingMethod: "รับที่ร้าน",
    items: [{ name: "ขิงผงสำเร็จรูป", option: "100 g", qty: 1, price: 120, image: P(7) }],
  },
];

const orderTotal = (o: ShopOrder) => o.items.reduce((s, it) => s + it.price, 0);

const fmtTHB = (n: number) =>
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
  duration = 650,
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

export function MyShopScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  // Overview section + menu sheet — lifted here so the header hamburger opens it.
  const [sub, setSub] = useState<SectionId>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  // Two-step scroll. Section 1 = the green header (with the tab bar). Section 2 =
  // the white content sheet. As the user scrolls, the sheet slides UP over the
  // tab bar (step 1: hide it). Once the sheet has fully covered the tab bar, only
  // then does the inner list scroll under the pinned title (step 2).
  const scrollY = useRef(new Animated.Value(0)).current;
  const [tabH, setTabH] = useState(56);
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false },
  );
  const sheetShift = scrollY.interpolate({ inputRange: [0, tabH], outputRange: [0, -tabH], extrapolate: "clamp" });
  const tabFade = scrollY.interpolate({ inputRange: [0, tabH * 0.7], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND_GREEN }}>
      <StatusBar style="light" />

      {/* ===== Section 1: green header — title + tab bar (fixed) ===== */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: BRAND_GREEN }}>
        <View
          className="flex-row items-center justify-between"
          style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 12 }}
        >
          <Pressable
            onPress={() => nav.canGoBack() && nav.goBack()}
            hitSlop={8}
            className="active:opacity-70"
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "rgba(0,0,0,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={22} color="white" />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>
            ร้านค้าของฉัน
          </Text>
          <View style={{ width: 38, height: 38 }} />
        </View>
        {/* Tab bar — stays in the header; the content sheet rises to cover it */}
        <Animated.View
          style={{ opacity: tabFade }}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - tabH) > 1) setTabH(h);
          }}
        >
          <ShopTopTabs tab={tab} setTab={setTab} />
        </Animated.View>
      </SafeAreaView>

      {/* ===== Section 2: white content sheet — slides up over the tab bar ===== */}
      <Animated.View
        style={{
          flex: 1,
          marginTop: sheetShift,
          backgroundColor: "#fafafa",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        }}
      >
        {tab === "overview" ? (
          <OverviewTab
            period={period}
            onPeriodChange={setPeriod}
            insetsBottom={insets.bottom + 16}
            sub={sub}
            setSub={setSub}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            onScroll={onScroll}
          />
        ) : tab === "shopfront" ? (
          <ShopFrontTab insetsBottom={insets.bottom + 16} onScroll={onScroll} />
        ) : (
          <SettingsTab insetsBottom={insets.bottom + 16} onScroll={onScroll} />
        )}
      </Animated.View>
    </View>
  );
}

// Top tabs in the green header — dark capsule track with a white pill that
// springs to the active tab (ported from the buyer OrdersScreen StatusTabs).
function ShopTopTabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const layouts = useRef<Record<string, { x: number; width: number }>>({}).current;
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const l = layouts[tab];
    if (!l) return;
    Animated.parallel([
      Animated.spring(pillX, { toValue: l.x, useNativeDriver: false, friction: 13, tension: 100 }),
      Animated.spring(pillW, { toValue: l.width, useNativeDriver: false, friction: 13, tension: 100 }),
    ]).start();
  }, [tab, ready, layouts, pillW, pillX]);

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 2, paddingBottom: 12 }}>
      <View style={{ borderRadius: 999, backgroundColor: "rgba(0,0,0,0.25)", padding: 4 }}>
        {/* Inner wrapper so the pill + tabs share one coordinate origin (the
            capsule's padding would otherwise offset the absolute pill). */}
        <View>
          {/* Sliding white pill — behind the labels */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: pillX,
              width: pillW,
              height: 36,
              borderRadius: 999,
              backgroundColor: "#ffffff",
              opacity: ready ? 1 : 0,
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }}
          />
          <View style={{ flexDirection: "row" }}>
            {NAV_ITEMS.map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  layouts[item.id] = { x, width };
                  if (item.id === tab) {
                    pillX.setValue(x);
                    pillW.setValue(width);
                    if (!ready) setReady(true);
                  }
                }}
                className="flex-row items-center justify-center active:opacity-80"
                style={{ flex: 1, height: 36, gap: 6 }}
              >
                <item.Icon
                  size={15}
                  color={active ? BRAND_GREEN : "#ffffff"}
                  strokeWidth={active ? 2.4 : 2}
                />
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: active ? "700" : "600",
                    color: active ? BRAND_GREEN : "#ffffff",
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
          </View>
        </View>
      </View>
    </View>
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

function ShopFrontTab({ insetsBottom, onScroll }: { insetsBottom: number; onScroll?: ScrollHandler }) {
  return (
    <ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 24 + insetsBottom,
        gap: 14,
      }}
      showsVerticalScrollIndicator={false}
    >
      <ProfileCard />

      {/* Shop management menu */}
      <MenuGroup
        title="จัดการร้านค้า"
        items={[
          { label: "สินค้าของฉัน", Icon: Package, hint: `${SHOP.totalProducts} รายการ` },
          { label: "เพิ่มสินค้าใหม่", Icon: Plus },
          { label: "Flash Sale / โปรโมชั่น", Icon: Tag },
          { label: "คูปองส่วนลด", Icon: Ticket },
        ]}
      />
      <MenuGroup
        title="ลูกค้าสัมพันธ์"
        items={[
          { label: "รีวิวร้านค้า", Icon: Star, hint: `${fmtNum(SHOP.totalReviews)} รีวิว` },
          { label: "ข้อความจากลูกค้า", Icon: MessageCircle },
          { label: "การแจ้งเตือน", Icon: Bell },
        ]}
      />
    </ScrollView>
  );
}

function ProfileCard() {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      {/* Row 1: Avatar + Name + Verified */}
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
            style={{ fontSize: 17, fontWeight: "700", color: TEXT_PRIMARY, lineHeight: 22 }}
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
              <ShieldCheck size={12} color={BRAND_GREEN} />
              <Text style={{ fontSize: 11, color: BRAND_GREEN_DARK, fontWeight: "600" }}>
                ยืนยันแล้ว
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Description */}
      <Text
        numberOfLines={2}
        style={{ fontSize: 13, color: TEXT_SECONDARY, marginTop: 10, lineHeight: 19 }}
      >
        {SHOP.description}
      </Text>

      {/* Meta row */}
      <View className="flex-row items-center flex-wrap" style={{ marginTop: 10, gap: 12 }}>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <MapPin size={12} color={TEXT_MUTED} />
          <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{SHOP.location}</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <Clock size={12} color={TEXT_MUTED} />
          <Text style={{ fontSize: 11, color: TEXT_MUTED }}>เข้าร่วม {SHOP.joined}</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <MessageCircle size={12} color={TEXT_MUTED} />
          <Text style={{ fontSize: 11, color: TEXT_MUTED }}>
            ตอบกลับ {SHOP.responseRate}%
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <Clock size={12} color={TEXT_MUTED} />
          <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{SHOP.responseTime}</Text>
        </View>
      </View>

      {/* Stats */}
      <View
        className="flex-row items-center"
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: SURFACE_GRAY,
        }}
      >
        <Stat
          value={String(SHOP.rating)}
          label={`${fmtNum(SHOP.totalReviews)} รีวิว`}
          highlight
          star
        />
        <Divider />
        <Stat value={fmtNum(SHOP.followers)} label="ผู้ติดตาม" />
        <Divider />
        <Stat value={String(SHOP.totalProducts)} label="สินค้า" />
        <Divider />
        <Stat value={SHOP.totalSold} label="ยอดขาย" />
      </View>
    </View>
  );
}

function SettingsTab({ insetsBottom, onScroll }: { insetsBottom: number; onScroll?: ScrollHandler }) {
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
      <MenuGroup
        title="ร้านค้า"
        items={[
          { label: "แก้ไขข้อมูลร้านค้า", Icon: Pencil },
          { label: "ที่อยู่จัดส่งสินค้า", Icon: MapPin },
          { label: "บัญชีรับเงิน", Icon: Wallet },
        ]}
      />
      <MenuGroup
        title="ทั่วไป"
        items={[
          { label: "การแจ้งเตือน", Icon: Bell },
          { label: "ตั้งค่าทั่วไป", Icon: Settings },
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
  items: { label: string; Icon: typeof Package; hint?: string }[];
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
        {items.map((m, i) => (
          <View key={m.label}>
            {i > 0 ? (
              <View style={{ height: 1, backgroundColor: DIVIDER_GRAY, marginLeft: 52 }} />
            ) : null}
            <Pressable
              className="flex-row items-center active:bg-gray-50"
              style={{ height: 54, paddingHorizontal: 16, gap: 12 }}
            >
              <m.Icon size={20} color={BRAND_GREEN} strokeWidth={2} />
              <Text style={{ flex: 1, fontSize: 15, color: TEXT_PRIMARY }}>{m.label}</Text>
              {m.hint ? (
                <Text style={{ fontSize: 12, color: TEXT_DISABLED }}>{m.hint}</Text>
              ) : null}
              <ChevronRight size={18} color="#c4c4c6" strokeWidth={2.2} />
            </Pressable>
          </View>
        ))}
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
                      aspectRatio: 1,
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
                    aspectRatio: 1.4,
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
      Animated.timing(scale, { toValue: 0.8, duration: 80, useNativeDriver: true }),
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

function OverviewTab({
  period,
  onPeriodChange,
  insetsBottom,
  sub,
  setSub,
  menuOpen,
  setMenuOpen,
  onScroll,
}: {
  period: "monthly" | "yearly";
  onPeriodChange: (p: "monthly" | "yearly") => void;
  insetsBottom: number;
  // Section + menu state lifted to MyShopScreen so the header hamburger drives it.
  sub: SectionId;
  setSub: (id: SectionId) => void;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  onScroll?: ScrollHandler;
}) {
  const periodLabel = period === "yearly" ? "ปีก่อน" : "เดือนก่อน";
  // Controlled calendar selection — drives every scoped figure below.
  const [cal, setCal] = useState<CalSel>({ month: 0, year: 2026, day: 16 });
  const { month, year, day } = cal;

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
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text style={{ fontSize: 12, color: TEXT_DISABLED }} numberOfLines={1}>
          ยอดขาย {ctxLabel}
        </Text>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(245,158,11,0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PlusCircle size={16} color="#f59e0b" />
        </View>
      </View>
      <View className="flex-row items-baseline" style={{ marginTop: 8, gap: 6 }}>
        <AnimatedNumber
          value={fmtNum(ctxSales)}
          style={{ fontSize: 26, fontWeight: "800", color: "#1a1a1a", letterSpacing: -0.5 }}
        />
        <Text style={{ fontSize: 13, color: TEXT_DISABLED }}>บาท</Text>
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
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text style={{ fontSize: 12, color: "#3d7d52", fontWeight: "500" }}>
          {period === "yearly" ? "ยอดขายรายปี" : "ยอดขายรายเดือน"}
        </Text>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(49,151,84,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <DollarSign size={16} color="#287745" />
        </View>
      </View>
      <View className="flex-row items-baseline" style={{ marginTop: 8, gap: 6 }}>
        <AnimatedNumber
          value={fmtNum(bigSales)}
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: "#287745",
            letterSpacing: -0.5,
          }}
        />
        <Text style={{ fontSize: 13, color: "rgba(61,125,82,0.8)" }}>บาท</Text>
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
      onSeeAll={() => {}}
    >
      <View
        className="flex-row flex-wrap"
        style={{ justifyContent: "space-between", rowGap: 8 }}
      >
        {ORDER_STATUS.map((s) => (
          <StatusTile key={s.id} {...s} width="31.5%" />
        ))}
      </View>
    </SectionCard>
  );

  const quotationCard = (
    <SectionCard
      title="สถานะใบเสนอราคา"
      count={QUOTATION_STATUS.reduce((a, b) => a + b.count, 0)}
      onSeeAll={() => {}}
    >
      <View className="flex-row" style={{ justifyContent: "space-between" }}>
        {QUOTATION_STATUS.map((s) => (
          <StatusTile key={s.id} {...s} width="31.5%" />
        ))}
      </View>
    </SectionCard>
  );

  const trialCard = (
    <SectionCard
      title="สถานะสินค้าทดลอง"
      count={TRIAL_STATUS.reduce((a, b) => a + b.count, 0)}
      onSeeAll={() => {}}
    >
      <View className="flex-row" style={{ justifyContent: "space-between" }}>
        {TRIAL_STATUS.map((s) => (
          <StatusTile key={s.id} {...s} width="31.5%" />
        ))}
      </View>
    </SectionCard>
  );

  const topProductsCard = (
    <TopListCard
      title="Top Product"
      subtitle={`10 อันดับสินค้าขายดี · ${ctxLabel}`}
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

  return (
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
          whether resting or pinned. */}
      <View
        className="flex-row items-center justify-between"
        style={{ backgroundColor: "#fafafa", paddingTop: 14, paddingBottom: 14 }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: TEXT_PRIMARY }}>
          {SECTION_LABEL[sub]}
        </Text>
        <AnimatedMenuButton open={menuOpen} onPress={() => setMenuOpen(true)} />
      </View>

      {/* Content wrapper holds the 14px rhythm; the header sits outside it so the
          first gap isn't doubled (header padding + wrapper gap). */}
      <View style={{ gap: 14 }}>
      {/* Wallet hero belongs to the Dashboard only. */}
      {sub === "dashboard" ? <WalletHeroCard /> : null}

      {/* ===== Per-section content (order mirrors the web OverviewTab) ===== */}
      {sub === "dashboard" ? (
        <>
          {orderTrackingCard}
          {quotationCard}
          {trialCard}
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
          {topProductsCard}
          {topCustomersCard}
        </>
      ) : null}

      {sub === "orders" ? <OrdersSection /> : null}

      {sub === "products_manage" ? <>{topProductsCard}</> : null}

      {sub === "report_sales" ? (
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
      ) : null}

      {sub === "report_customers" ? <>{topCustomersCard}</> : null}
      {sub === "report_products" ? <>{topProductsCard}</> : null}

      {sub === "finance_overview" ? (
        <>
          {salesCard}
          <View className="flex-row" style={{ gap: 10 }}>
            <KpiCard
              label="ยอดที่รอปล่อย"
              value={fmtTHBShort(WALLET.escrow)}
              unit=""
              delta={0}
              deltaLabel={periodLabel}
              accent="#f59e0b"
              Icon={Clock}
            />
            <KpiCard
              label="รายได้สะสม"
              value={fmtTHBShort(WALLET.totalIncome)}
              unit=""
              delta={delta.sales}
              deltaLabel={periodLabel}
              accent={BRAND_GREEN}
              Icon={Wallet}
            />
          </View>
        </>
      ) : null}

      {/* Herbal Market documents — quotation / PR / PO */}
      {sub === "hm_quotations" ? <QuotationSection /> : null}
      {sub === "hm_pr" ? <DocSection kind="pr" /> : null}
      {sub === "hm_po" ? <DocSection kind="po" /> : null}

      {/* Sections without a dedicated mockup view yet */}
      {sub === "flash_sale" ||
      sub === "promotions" ||
      sub === "coupons" ||
      sub === "trials_products" ||
      sub === "trials_tracking" ||
      sub === "report_market" ||
      sub === "finance_tx" ||
      sub === "complaints" ? (
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

      {/* Menu sheet — full sidebar tree with accordion sub-menus */}
      <MenuSheet
        visible={menuOpen}
        current={sub}
        onClose={() => setMenuOpen(false)}
        onSelect={(id) => {
          setSub(id);
          setMenuOpen(false);
        }}
      />

      {/* Sales breakdown sheet — opened by "ดูรายละเอียด" on the sales cards */}
      <SalesBreakdownSheet
        data={salesSheet}
        onClose={() => setSalesSheet(null)}
      />
    </ScrollView>
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

/* ============ Menu sheet (sidebar → bottom sheet) ============ */

function MenuSheet({
  visible,
  current,
  onClose,
  onSelect,
}: {
  visible: boolean;
  current: SectionId;
  onClose: () => void;
  onSelect: (id: SectionId) => void;
}) {
  // Auto-expand whichever group owns the current section.
  const ownerOf = (id: SectionId) =>
    SHOP_MENU.find((n) => n.id === id || n.children?.some((c) => c.id === id))?.id;
  const [expanded, setExpanded] = useState<SectionId | null>(() => ownerOf(current) ?? null);

  const toggle = (id: SectionId) =>
    setExpanded((cur) => (cur === id ? null : id));

  return (
    <BottomSheet visible={visible} onClose={onClose} title="เมนูร้านค้า">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}>
        {SHOP_MENU.map((node) => {
          const hasChildren = !!node.children?.length;
          const isOpen = expanded === node.id;
          const groupActive =
            current === node.id || node.children?.some((c) => c.id === current);
          return (
            <View key={node.id}>
              <Pressable
                onPress={() => (hasChildren ? toggle(node.id) : onSelect(node.id))}
                className="flex-row items-center active:bg-gray-50"
                style={{ height: 50, paddingHorizontal: 10, borderRadius: 10, gap: 12 }}
              >
                <node.Icon
                  size={20}
                  color={groupActive ? BRAND_GREEN : TEXT_SECONDARY}
                  strokeWidth={2}
                />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: groupActive ? "600" : "500",
                    color: groupActive ? BRAND_GREEN_DARK : TEXT_PRIMARY,
                  }}
                >
                  {node.label}
                </Text>
                {hasChildren ? (
                  <View style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}>
                    <ChevronDown size={18} color={TEXT_MUTED} />
                  </View>
                ) : current === node.id ? (
                  <Check size={18} color={BRAND_GREEN} strokeWidth={2.5} />
                ) : null}
              </Pressable>

              {/* Accordion children */}
              {hasChildren && isOpen ? (
                <View style={{ marginBottom: 4 }}>
                  {node.children!.map((child) => {
                    const active = current === child.id;
                    return (
                      <Pressable
                        key={child.id}
                        onPress={() => onSelect(child.id)}
                        className="flex-row items-center active:bg-gray-50"
                        style={{
                          height: 44,
                          paddingLeft: 42,
                          paddingRight: 10,
                          borderRadius: 10,
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 3,
                            backgroundColor: active ? BRAND_GREEN : "#d4d4d4",
                          }}
                        />
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 14,
                            fontWeight: active ? "600" : "400",
                            color: active ? BRAND_GREEN_DARK : TEXT_SECONDARY,
                          }}
                        >
                          {child.label}
                        </Text>
                        {active ? (
                          <Check size={16} color={BRAND_GREEN} strokeWidth={2.5} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </BottomSheet>
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
        height: 30,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: BORDER_GRAY,
        gap: 4,
      }}
    >
      <Eye size={12} color={TEXT_SECONDARY} />
      <Text style={{ fontSize: 11, fontWeight: "600", color: TEXT_SECONDARY }}>
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
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text style={{ fontSize: 11, color: TEXT_DISABLED }} numberOfLines={1}>
          {label}
        </Text>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: `${accent}1A`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={14} color={accent} />
        </View>
      </View>
      <View className="flex-row items-baseline" style={{ marginTop: 8, gap: 4 }}>
        <AnimatedNumber
          value={value}
          style={{
            fontSize: 24,
            fontWeight: "800",
            color: "#1a1a1a",
            letterSpacing: -0.3,
          }}
        />
        <Text style={{ fontSize: 12, color: TEXT_DISABLED }}>{unit}</Text>
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
      <Arrow size={compact ? 11 : 13} color={color} />
      <Text style={{ color, fontSize: compact ? 11 : 12, fontWeight: "600" }}>
        {Math.abs(value)}%
      </Text>
      <Text style={{ color: TEXT_DISABLED, fontSize: compact ? 10 : 11 }} numberOfLines={1}>
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
}: {
  label: string;
  count: number;
  accent: string;
  Icon: typeof Wallet;
  width: number | string;
}) {
  return (
    <Pressable
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
type DocKind = "qt" | "pr" | "po";

type DocItem = { name: string; grade: string; qty: number; unit: string; pricePerUnit: number };
type MarketDoc = {
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
};

// Status pill colors per document kind (ported from the web *_STATUS_CFG).
const DOC_STATUS: Record<DocKind, Record<string, { label: string; color: string }>> = {
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

const DOC_TITLE: Record<DocKind, string> = { qt: "ใบเสนอราคา", pr: "ใบ PR", po: "ใบ PO" };

// Pick a catalog thumbnail that loosely matches the raw-material name.
const matImg = (name: string): number => {
  const map: [string, number][] = [
    ["ขมิ้น", 0], ["ฟ้าทะลาย", 1], ["เก๊กฮวย", 2], ["น้ำผึ้ง", 3], ["บัวบก", 4],
    ["กระชาย", 5], ["ตะไคร้", 6], ["ขิง", 7], ["เห็ดหลินจือ", 8],
    ["อัญชัน", 9], ["คำฝอย", 9], ["มะรุม", 5],
  ];
  const hit = map.find(([k]) => name.includes(k));
  return TOP_PRODUCTS[hit ? hit[1] : 0].image;
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
const QUOTATIONS: MarketDoc[] = [
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
const PURCHASE_REQUESTS: MarketDoc[] = [
  { id: "PR-2569-3012", status: "converted", date: "11 มี.ค. 2569", ...CO.thaiDev, paymentTerms: "เครดิต 30 วัน", needBy: "26 มี.ค. 2569", refId: "PO-2569-3012",
    items: [{ name: "ขมิ้นชันแห้ง (ผง)", grade: "พรีเมียม", qty: 200, unit: "กก.", pricePerUnit: 320 }] },
  { id: "PR-2569-3019", status: "converted", date: "9 มี.ค. 2569", ...CO.banya, paymentTerms: "เครดิต 60 วัน", needBy: "22 มี.ค. 2569", refId: "PO-2569-3019", note: "ออก PR ตรงเข้ามาเลย — ไม่ผ่าน Quote",
    items: [
      { name: "ฟ้าทะลายโจร (ผง)", grade: "พรีเมียม", qty: 500, unit: "กก.", pricePerUnit: 240 },
      { name: "ใบบัวบกแห้ง", grade: "คัดสรร", qty: 150, unit: "กก.", pricePerUnit: 180 },
      { name: "ใบมะรุมแห้ง (ผง)", grade: "มาตรฐาน", qty: 80, unit: "กก.", pricePerUnit: 540 },
    ] },
  { id: "PR-2569-3023", status: "received", date: "8 มี.ค. 2569", ...CO.herbalSp, paymentTerms: "เครดิต 30 วัน", needBy: "22 มี.ค. 2569", note: "รอผู้ซื้อออก PO ใน Herbal ERP",
    items: [{ name: "ขิงผงออร์แกนิก", grade: "พรีเมียม", qty: 300, unit: "กก.", pricePerUnit: 280 }] },
  { id: "PR-2569-3028", status: "converted", date: "27 ก.พ. 2569", ...CO.nature, paymentTerms: "เครดิต 60 วัน", needBy: "15 มี.ค. 2569", refId: "PO-2569-3028",
    items: [
      { name: "เห็ดหลินจือสกัด", grade: "พรีเมียม", qty: 50, unit: "กก.", pricePerUnit: 2400 },
      { name: "เก๊กฮวยแห้ง", grade: "คัดสรร", qty: 80, unit: "กก.", pricePerUnit: 420 },
    ] },
  { id: "PR-2569-3035", status: "converted", date: "21 ก.พ. 2569", ...CO.asia, paymentTerms: "เครดิต 90 วัน", needBy: "8 มี.ค. 2569", refId: "PO-2569-3035",
    items: [
      { name: "ขมิ้นชันแคปซูล", grade: "GMP", qty: 1000, unit: "กก.", pricePerUnit: 380 },
      { name: "ฟ้าทะลายโจรสกัด", grade: "พรีเมียม", qty: 400, unit: "กก.", pricePerUnit: 520 },
    ] },
];

// ใบ PO (purchase orders) — MOCK_PURCHASE_ORDERS from the web.
const PURCHASE_ORDERS_DOC: MarketDoc[] = [
  { id: "PO-2569-3012", status: "received", date: "12 มี.ค. 2569", ...CO.thaiDev, paymentTerms: "เครดิต 30 วัน", needBy: "26 มี.ค. 2569", shippingMethod: "จัดส่งโดยผู้ขาย", note: "ขอให้บรรจุในกระสอบ 25 กก. ปิดผนึกแน่นหนา",
    items: [{ name: "ขมิ้นชันแห้ง (ผง)", grade: "พรีเมียม", qty: 200, unit: "กก.", pricePerUnit: 320 }] },
  { id: "PO-2569-3019", status: "preparing", date: "10 มี.ค. 2569", ...CO.banya, paymentTerms: "เครดิต 60 วัน", needBy: "22 มี.ค. 2569", shippingMethod: "จัดส่งโดยผู้ขาย",
    items: [
      { name: "ฟ้าทะลายโจร (ผง)", grade: "พรีเมียม", qty: 500, unit: "กก.", pricePerUnit: 240 },
      { name: "ใบบัวบกแห้ง", grade: "คัดสรร", qty: 150, unit: "กก.", pricePerUnit: 180 },
      { name: "ใบมะรุมแห้ง (ผง)", grade: "มาตรฐาน", qty: 80, unit: "กก.", pricePerUnit: 540 },
    ] },
  { id: "PO-2569-3028", status: "shipped", date: "28 ก.พ. 2569", ...CO.nature, paymentTerms: "เครดิต 60 วัน", needBy: "15 มี.ค. 2569", shippingMethod: "ขนส่งบริษัท Kerry", trackingNumber: "TH00125478963",
    items: [
      { name: "เห็ดหลินจือสกัด", grade: "พรีเมียม", qty: 50, unit: "กก.", pricePerUnit: 2400 },
      { name: "เก๊กฮวยแห้ง", grade: "คัดสรร", qty: 80, unit: "กก.", pricePerUnit: 420 },
    ] },
  { id: "PO-2569-3035", status: "delivered", date: "22 ก.พ. 2569", ...CO.asia, paymentTerms: "เครดิต 90 วัน", needBy: "8 มี.ค. 2569", shippingMethod: "ขนส่งโดยผู้ซื้อ", trackingNumber: "TH00124589632",
    items: [
      { name: "ขมิ้นชันแคปซูล", grade: "GMP", qty: 1000, unit: "กก.", pricePerUnit: 380 },
      { name: "ฟ้าทะลายโจรสกัด", grade: "พรีเมียม", qty: 400, unit: "กก.", pricePerUnit: 520 },
    ] },
  { id: "PO-2569-3038", status: "cancelled", date: "18 ก.พ. 2569", ...CO.modern, paymentTerms: "เครดิต 30 วัน", needBy: "5 มี.ค. 2569", shippingMethod: "จัดส่งโดยผู้ขาย", note: "ลูกค้ายกเลิกเนื่องจากเปลี่ยนสูตร",
    items: [{ name: "ดอกอัญชันแห้ง", grade: "พรีเมียม", qty: 100, unit: "กก.", pricePerUnit: 520 }] },
];

const docLineTotal = (it: DocItem) => it.qty * it.pricePerUnit;
const docSubtotal = (d: MarketDoc) => d.items.reduce((s, it) => s + docLineTotal(it), 0);

// ใบเสนอราคา — dedicated section with a search box + web-matching cards.
function QuotationSection() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = QUOTATIONS.filter((d) => {
    if (!q) return true;
    return (
      d.id.toLowerCase().includes(q) ||
      d.company.toLowerCase().includes(q) ||
      d.items.some((it) => it.name.toLowerCase().includes(q))
    );
  });
  return (
    <View style={{ gap: 14 }}>
      {/* Search */}
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

      {visible.length === 0 ? (
        <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, paddingVertical: 48, alignItems: "center", gap: 10 }}>
          <ClipboardList size={40} color={BORDER_GRAY} strokeWidth={1.5} />
          <Text style={{ fontSize: 14, color: TEXT_DISABLED }}>ไม่พบใบเสนอราคา</Text>
        </View>
      ) : (
        visible.map((d) => <QuotationCard key={d.id} doc={d} />)
      )}
    </View>
  );
}

// ใบเสนอราคา card — mirrors the web QuotationCard (pre-VAT, validity chip,
// buyer row, per-unit pricing, download action). No status pill / VAT.
function QuotationCard({ doc }: { doc: MarketDoc }) {
  const total = docSubtotal(doc);
  const days = doc.daysRemaining ?? 0;
  const daysColor = days <= 0 ? "#dc2626" : days <= 7 ? "#dc2626" : days <= 30 ? "#d97706" : "#319754";
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}>
      {/* Issuer label */}
      <View className="flex-row items-center" style={{ gap: 8, marginBottom: 8 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
          <ClipboardList size={13} color="#fff" strokeWidth={2.4} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>ใบเสนอราคา (Quotation)</Text>
      </View>

      {/* id + days chip + date */}
      <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
        <View className="flex-row items-center" style={{ gap: 8, flex: 1, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>{doc.id}</Text>
          <View style={{ backgroundColor: daysColor + "1a", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            <Text style={{ fontSize: 10.5, fontWeight: "700", color: daysColor }}>
              {days <= 0 ? "หมดอายุ" : `เหลือ ${days} วัน`}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 11.5, color: TEXT_DISABLED }}>{doc.date}</Text>
      </View>

      <View style={{ height: 1, backgroundColor: "#e7e7ea", marginVertical: 12 }} />

      {/* Buyer row */}
      <View className="flex-row items-center" style={{ gap: 10, marginBottom: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
          <User size={16} color={BRAND_GREEN} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#000" }} numberOfLines={1}>{doc.company}</Text>
          <Text style={{ fontSize: 11, color: TEXT_MUTED }} numberOfLines={1}>
            มีผลถึง {doc.validUntil}{doc.email ? ` · ${doc.email}` : ""}
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

      {/* Items */}
      <View style={{ gap: 12 }}>
        {doc.items.map((item, i) => (
          <View key={i} className="flex-row" style={{ gap: 10 }}>
            <Image source={matImg(item.name)} style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: "rgba(49,151,84,0.08)" }} resizeMode="cover" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#000" }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ fontSize: 10.5, color: TEXT_MUTED, marginTop: 2 }}>ราคา/หน่วย: ฿{fmtNum(item.pricePerUnit)} / {item.unit}</Text>
              <View className="flex-row items-center justify-between" style={{ marginTop: 3 }}>
                <Text style={{ fontSize: 10.5, color: TEXT_DISABLED }}>จำนวน {fmtNum(item.qty)} {item.unit}</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#000" }}>{fmtTHBShort(docLineTotal(item))}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 1, backgroundColor: "#e7e7ea", marginVertical: 12 }} />

      {/* Total + download */}
      <View className="flex-row items-center justify-between" style={{ flexWrap: "wrap", gap: 10 }}>
        <View className="flex-row items-baseline" style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: "500" }}>ยอดรวม:</Text>
          <Text style={{ fontSize: 22, fontWeight: "700", color: BRAND_GREEN }}>{fmtTHBShort(total)}</Text>
        </View>
        <Pressable
          className="flex-row items-center justify-center active:opacity-85"
          style={{ height: 40, paddingHorizontal: 18, borderRadius: 999, backgroundColor: BRAND_GREEN, gap: 6 }}
        >
          <Download size={16} color="#fff" strokeWidth={2.2} />
          <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#fff" }}>โหลดเอกสาร</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DocSection({ kind }: { kind: DocKind }) {
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
      {/* Search */}
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

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
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
        visible.map((d) => <DocCard key={d.id} doc={d} kind={kind} />)
      )}
    </View>
  );
}

// B2B document card (PR / PO) — matches the web supplier card: PR/PO id + status
// + ref-PO chip, grade & qty×price chips per item, required-by chip, full company
// block (tax id / contact / address), VAT-inclusive total + terms + actions.
function DocCard({ doc, kind }: { doc: MarketDoc; kind: DocKind }) {
  const cfg = DOC_STATUS[kind][doc.status];
  const accent = cfg.color;
  const subtotal = docSubtotal(doc);
  const vat = Math.round(subtotal * 0.07);
  const total = subtotal + vat;
  const needLabel = kind === "po" ? "กำหนดส่ง" : "ต้องการภายใน";
  const [expanded, setExpanded] = useState(false);

  const Chip = ({ text, color = TEXT_SECONDARY, bg = SURFACE_GRAY }: { text: string; color?: string; bg?: string }) => (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ fontSize: 10.5, fontWeight: "600", color }}>{text}</Text>
    </View>
  );

  const Btn = ({ label, variant, Icon, flex }: { label: string; variant: "primary" | "outline" | "blue"; Icon?: typeof BarChart3; flex?: boolean }) => {
    const s = variant === "primary"
      ? { bg: BRAND_GREEN, border: BRAND_GREEN, text: "#fff" }
      : variant === "blue"
        ? { bg: "#007aff", border: "#007aff", text: "#fff" }
        : { bg: "transparent", border: BORDER_GRAY, text: TEXT_SECONDARY };
    return (
      <Pressable className="flex-row items-center justify-center active:opacity-85"
        style={{ flex: flex ? 1 : undefined, height: 42, paddingHorizontal: 16, borderRadius: 999, backgroundColor: s.bg, borderWidth: 1, borderColor: s.border, gap: 5 }}>
        {Icon ? <Icon size={15} color={s.text} strokeWidth={2.2} /> : null}
        <Text style={{ fontSize: 13, fontWeight: "600", color: s.text }}>{label}</Text>
      </Pressable>
    );
  };

  // The forward CTA is the most important action → it gets the wider (flex) slot.
  const primaryBtn =
    kind === "pr" && doc.status === "received" ? <Btn label="ออกใบ PO" variant="primary" Icon={ArrowRightCircle} flex /> :
    kind === "pr" && doc.refId ? <Btn label={`ดูใบ ${doc.refId}`} variant="blue" Icon={FileText} flex /> :
    kind === "po" && doc.status === "received" ? <Btn label="เตรียมจัดส่ง" variant="primary" Icon={ArrowRightCircle} flex /> :
    kind === "po" && doc.status === "preparing" ? <Btn label="ยืนยันจัดส่ง" variant="primary" Icon={Truck} flex /> :
    null;

  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}>
      {/* Top line: id + date + expand toggle */}
      <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>{doc.id}</Text>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Text style={{ fontSize: 11.5, color: TEXT_DISABLED }}>{doc.date}</Text>
          <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} className="active:opacity-60">
            {expanded ? <ChevronUp size={16} color={TEXT_MUTED} /> : <ChevronDown size={16} color={TEXT_MUTED} />}
          </Pressable>
        </View>
      </View>

      {/* Status badge + ref-PO chip (same row) */}
      <View className="flex-row items-center" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <View style={{ backgroundColor: accent + "1a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: accent }}>{cfg.label}</Text>
        </View>
        {doc.refId ? (
          <View className="flex-row items-center" style={{ backgroundColor: "rgba(0,122,255,0.1)", paddingLeft: 7, paddingRight: 10, paddingVertical: 4, borderRadius: 999, gap: 4 }}>
            <FileText size={11} color="#007aff" strokeWidth={2.4} />
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#007aff" }}>{doc.refId}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Items — grade + qty×price chips */}
      <View style={{ gap: 14 }}>
        {doc.items.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image source={matImg(item.name)} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "rgba(49,151,84,0.08)" }} resizeMode="cover" />
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }} numberOfLines={1}>{item.name}</Text>
              <View className="flex-row items-center" style={{ gap: 6, flexWrap: "wrap" }}>
                <Chip text={`เกรด ${item.grade}`} color="#319754" bg="rgba(49,151,84,0.1)" />
                <Chip text={`${fmtNum(item.qty)} ${item.unit} × ฿${fmtNum(item.pricePerUnit)}/${item.unit}`} />
              </View>
            </View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{fmtTHBShort(docLineTotal(item))}</Text>
          </View>
        ))}
      </View>

      {/* Required-by / delivery chip */}
      {doc.needBy ? (
        <View className="flex-row items-center self-start" style={{ marginTop: 12, backgroundColor: "rgba(49,151,84,0.1)", paddingLeft: 8, paddingRight: 12, paddingVertical: 6, borderRadius: 999, gap: 6 }}>
          <Calendar size={13} color={BRAND_GREEN} strokeWidth={2.4} />
          <Text style={{ fontSize: 11.5, fontWeight: "600", color: BRAND_GREEN }}>{needLabel} {doc.needBy}</Text>
        </View>
      ) : null}

      {/* Company block — revealed on "รายละเอียด" to keep the card compact */}
      {expanded ? (
        <>
          <View style={{ backgroundColor: "#fafbfc", borderRadius: 14, padding: 12, marginTop: 12, gap: 12 }}>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={16} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }} numberOfLines={1}>{doc.company}</Text>
                {doc.taxId ? <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>เลขผู้เสียภาษี {doc.taxId}</Text> : null}
              </View>
            </View>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                <User size={16} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }} numberOfLines={1}>{doc.contact}</Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{doc.phone}</Text>
              </View>
            </View>
            <View className="flex-row items-start" style={{ gap: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                <MapPin size={16} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <Text style={{ flex: 1, fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 18, marginTop: 5 }}>{doc.address}</Text>
            </View>
          </View>

          {doc.note ? (
            <Text style={{ fontSize: 12, color: TEXT_MUTED, fontStyle: "italic", marginTop: 10 }}>“{doc.note}”</Text>
          ) : null}
        </>
      ) : null}

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Total + terms */}
      <View className="flex-row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
        <View className="flex-row items-baseline" style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: "500" }}>ยอดรวม:</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#ef4444" }}>{fmtTHBShort(total)}</Text>
        </View>
        <Chip text={doc.paymentTerms} color="#d97706" bg="rgba(245,158,11,0.12)" />
      </View>

      {/* Actions — secondary stays compact, the forward CTA takes the wide slot */}
      <View className="flex-row items-center" style={{ gap: 8, marginTop: 12 }}>
        <Btn label="ติดต่อลูกค้า" variant="outline" Icon={MessageCircle} flex={!primaryBtn} />
        {primaryBtn}
      </View>
    </View>
  );
}

// ===================== ORDERS SECTION =====================
// Mobile port of the web OrdersTab: filter pills (horizontal scroll) + search,
// then a stack of order cards filtered by the active tab + query.
function OrdersSection() {
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
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
      {/* Search */}
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

      {/* Filter pills — horizontal scroll (Fitts: 36px tall, generous padding) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
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
// seller-side data (customer + delivery slip instead of shop + timeline).
// Laws: Jakob's (matches the buyer card), Progressive Disclosure (slip + extra
// items behind the toggle), Von Restorff (one filled forward CTA), Fitts (38px).
function OrderCard({ order }: { order: ShopOrder }) {
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
  }: {
    label: string;
    variant: "primary" | "outline" | "danger" | "amber";
    Icon?: typeof BarChart3;
  }) => {
    const s = {
      primary: { bg: BRAND_GREEN, border: BRAND_GREEN, text: "#fff" },
      amber: { bg: "#f7931d", border: "#f7931d", text: "#fff" },
      outline: { bg: "transparent", border: BRAND_GREEN, text: BRAND_GREEN },
      danger: { bg: "transparent", border: "#ef4444", text: "#ef4444" },
    }[variant];
    return (
      <Pressable
        className="flex-row items-center justify-center active:opacity-80"
        style={{ height: 38, paddingHorizontal: 16, borderRadius: 999, backgroundColor: s.bg, borderWidth: 1, borderColor: s.border, gap: 5 }}
      >
        {Icon ? <Icon size={15} color={s.text} strokeWidth={2.2} {...(variant === "amber" ? { fill: "#fff" } : {})} /> : null}
        <Text style={{ fontSize: 13, fontWeight: "600", color: s.text }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}>
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

      {/* Order id · date + detail toggle */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED, flex: 1 }} numberOfLines={1}>
          {order.id}  ·  {order.date}
        </Text>
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={6} className="flex-row items-center active:opacity-60" style={{ gap: 2 }}>
          <Text style={{ fontSize: 12, color: BRAND_GREEN, fontWeight: "500" }}>{expanded ? "ย่อ" : "รายละเอียด"}</Text>
          {expanded ? <ChevronUp size={14} color={BRAND_GREEN} strokeWidth={2.4} /> : <ChevronDown size={14} color={BRAND_GREEN} strokeWidth={2.4} />}
        </Pressable>
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

      {/* Delivery slip (expanded) */}
      {expanded ? (
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
      ) : null}

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Total + actions */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <View>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>รวม {totalQty} ชิ้น</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#ef4444", marginTop: 1 }}>{fmtTHBShort(total)}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {order.status === "pending_payment" ? (
            <>
              <Btn label="ติดต่อ" variant="outline" Icon={MessageCircle} />
              <Btn label="ยกเลิก" variant="danger" Icon={Ban} />
            </>
          ) : null}
          {order.status === "pending_verify" ? (
            <>
              <Btn label="ยกเลิก" variant="danger" Icon={Ban} />
              <Btn label="เตรียมจัดส่ง" variant="primary" Icon={ArrowRightCircle} />
            </>
          ) : null}
          {order.status === "ready_ship" ? (
            <>
              <Btn label="ติดต่อ" variant="outline" Icon={MessageCircle} />
              <Btn label="ยืนยันจัดส่ง" variant="primary" Icon={Truck} />
            </>
          ) : null}
          {order.status === "shipping" ? <Btn label="ติดต่อลูกค้า" variant="outline" Icon={MessageCircle} /> : null}
          {order.status === "shipped" ? (
            <>
              <Btn label="ติดต่อ" variant="outline" Icon={MessageCircle} />
              {order.reviewScore ? <Btn label={`รีวิว ${order.reviewScore}/5`} variant="amber" Icon={Star} /> : null}
            </>
          ) : null}
          {order.status === "cancelled" ? <Btn label="บล็อกลูกค้า" variant="danger" Icon={Ban} /> : null}
        </View>
      </View>
    </View>
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
