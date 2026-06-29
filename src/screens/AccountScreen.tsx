import { type ReactNode } from "react";
import { View, Text, Image, Pressable, Dimensions, Alert, Switch } from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  User,
  Wallet,
  ClipboardCheck,
  Package,
  Truck,
  MapPin,
  Heart,
  Ticket,
  ChevronRight,
  LogOut,
  Store,
  Beaker,
  FlaskConical,
  Settings,
  FileText,
  ClipboardList,
  Receipt,
  MessageCircle,
  Sparkles,
  Bell,
  Crown,
  Camera,
  type LucideIcon,
} from "lucide-react-native";
import { BottomFade } from "../components/BottomFade";
import { BRAND_GREEN, TEXT_SECONDARY } from "../theme/tokens";
import { COUPONS } from "../data/coupons";
import { useOrders } from "../context/OrderContext";
import { useChat } from "../context/ChatContext";
import { useSeller } from "../context/SellerContext";
import type { OrderStatus } from "../data/orders";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// The profile row collapses to 0 on scroll, but the green safe-area strip + the
// utility bar (title + bell/settings) stay pinned; the FIXED white sheet sits
// right below and grows up to fill the rest — only the cards inside it scroll.
const PROFILE_BLOCK = 204;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const LEAF_B = require("../../assets/herb-leaf-b.png");
const LEAF_C = require("../../assets/herb-leaf-c.png");
const LEAF_D = require("../../assets/herb-leaf-d.png");

// Real member portrait — same Unsplash source the web AccountPage uses
// (avatarByRole.user). Remote uri loads fine in Expo Go; swap to a bundled
// require() asset if offline support is ever needed.
const AVATAR = {
  uri: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
};

// Member stats shown on the premium card. Coupon count is live (active codes in
// the same COUPONS source the coupon page reads); points are mock.
const POINTS = 1250;
const ACTIVE_COUPONS = COUPONS.filter((c) => c.status === "active").length;
const groupNum = (n: number) => n.toLocaleString("en-US");

type OrderTab = "all" | "pending_group" | "preparing" | "shipped";
// `status` drives the live count (from OrderContext); `tab` is the filter opened on tap.
const ORDER_STATUS: { label: string; Icon: LucideIcon; status: OrderStatus; tint: string; bg: string; tab: OrderTab }[] = [
  { label: "รอชำระเงิน", Icon: Wallet, status: "pending_payment", tint: "#f97316", bg: "rgba(249,115,22,0.12)", tab: "pending_group" },
  { label: "รอตรวจสอบ", Icon: ClipboardCheck, status: "pending_verify", tint: "#0ea5e9", bg: "rgba(14,165,233,0.12)", tab: "pending_group" },
  { label: "รอจัดส่ง", Icon: Package, status: "preparing", tint: "#a855f7", bg: "rgba(168,85,247,0.12)", tab: "preparing" },
  { label: "จัดส่งแล้ว", Icon: Truck, status: "shipped", tint: BRAND_GREEN, bg: "rgba(49,151,84,0.12)", tab: "shipped" },
];

function Card({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View
      style={[
        { backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type MenuItem = {
  label: string;
  Icon: LucideIcon;
  onPress?: () => void;
  badge?: number;
  sub?: string;
  /** Render a Switch on the right; the whole row toggles it. */
  toggle?: { value: boolean; onValueChange: (v: boolean) => void };
};

function MenuList({ items }: { items: MenuItem[] }) {
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {items.map((m, i) => (
        <View key={m.label}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0", marginLeft: 52 }} /> : null}
          <Pressable
            onPress={m.toggle ? () => m.toggle!.onValueChange(!m.toggle!.value) : m.onPress}
            className="flex-row items-center active:opacity-60"
            style={{ minHeight: 54, paddingHorizontal: 16, paddingVertical: m.sub ? 9 : 0, gap: 12 }}
          >
            <m.Icon size={20} color={BRAND_GREEN} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: "#0a0a0a" }}>{m.label}</Text>
              {m.sub ? <Text style={{ fontSize: 11.5, color: TEXT_SECONDARY, marginTop: 2, lineHeight: 16 }}>{m.sub}</Text> : null}
            </View>
            {m.toggle ? (
              <View pointerEvents="none">
                <Switch value={m.toggle.value} trackColor={{ true: BRAND_GREEN, false: "#d4d4d4" }} thumbColor="#fff" ios_backgroundColor="#d4d4d4" />
              </View>
            ) : (
              <>
                {m.badge && m.badge > 0 ? (
                  <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", marginRight: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff", lineHeight: 15 }}>{m.badge > 99 ? "99+" : m.badge}</Text>
                  </View>
                ) : null}
                <ChevronRight size={18} color="#c4c4c6" strokeWidth={2.2} />
              </>
            )}
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

const STORE_IMG = require("../../assets/products-store.png");
const REGIS_SUPPLIER = require("../../assets/regissupplier.png");
const REGIS_BRAND = require("../../assets/test-product.png");

/** CTA shown until the user registers as a seller — tap to apply (opens a shop).
 *  Same design language as the Herbal Market "สมัคร Supplier" card. */
function SellerApplyCard({ onApply }: { onApply: () => void }) {
  return (
    <Pressable onPress={onApply} className="active:opacity-90" style={{ borderRadius: 16, overflow: "hidden" }}>
      <LinearGradient
        colors={["#fb923c", "#f97316", "#ea580c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ padding: 16, minHeight: 104, justifyContent: "center", gap: 16 }}
      >
        <Image source={STORE_IMG} style={{ position: "absolute", right: 4, bottom: -16, width: 104, height: 104 }} resizeMode="contain" />
        <View style={{ width: 196, gap: 3 }}>
          <Text style={{ fontSize: 16.5, fontWeight: "800", color: "#fff", lineHeight: 21 }}>เปิดร้านกับ METAHERB</Text>
          <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", lineHeight: 16 }}>สมัครเป็นผู้ขาย ให้ยอดขายงอกงาม 🌱</Text>
        </View>
        <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#fff", borderRadius: 999, paddingLeft: 12, paddingRight: 9, height: 30 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#ea580c" }}>สมัครเป็นร้านค้า</Text>
          <ChevronRight size={15} color="#ea580c" strokeWidth={2.6} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/** Seller-feature card — same layout as SellerApplyCard (image bottom-right,
 *  text block + pill) but green; uses the web illustrations. */
function ShopFeatureCard({ image, title, subtitle, buttonLabel, onPress }: {
  image: number; title: string; subtitle: string; buttonLabel: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="active:opacity-90" style={{ borderRadius: 16, overflow: "hidden" }}>
      <LinearGradient
        colors={["#319754", "#2c884a", "#287745"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ padding: 16, minHeight: 104, justifyContent: "center", gap: 16 }}
      >
        <Image source={image} style={{ position: "absolute", right: 4, bottom: -16, width: 104, height: 104 }} resizeMode="contain" />
        <View style={{ width: 196, gap: 3 }}>
          <Text style={{ fontSize: 16.5, fontWeight: "800", color: "#fff", lineHeight: 21 }}>{title}</Text>
          <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", lineHeight: 16 }}>{subtitle}</Text>
        </View>
        <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#fff", borderRadius: 999, paddingLeft: 12, paddingRight: 9, height: 30 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: BRAND_GREEN }}>{buttonLabel}</Text>
          <ChevronRight size={15} color={BRAND_GREEN} strokeWidth={2.6} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export function AccountScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  // Live order counts from the shared store so the chips match the orders list/detail.
  const { orders } = useOrders();
  const { unreadTotal } = useChat();
  const countByStatus = (st: OrderStatus) => orders.filter((o) => o.status === st).length;

  // The native bottom-tab navigator doesn't reliably bubble navigate() up to
  // the parent stack, so reach the stack explicitly via getParent().
  const openOrders = (initialTab?: OrderTab) => {
    const target = (nav.getParent() ?? nav) as Nav;
    if (initialTab) target.navigate("Orders", { initialTab });
    else target.navigate("Orders");
  };
  const go = (
    route:
      | "AccountInfo"
      | "Address"
      | "Wishlist"
      | "Coupons"
      | "Login"
      | "Settings"
      | "AppSettings"
      | "About"
      | "HerbalMarket"
      | "TrialProducts"
      | "MyTrials"
      | "Chat"
      | "ChatList"
      | "AIAssistant"
      | "SellerRegister"
      | "SupplierRegister"
      | "BrandRegister"
      | "NotificationTest"
      | "MyShop",
  ) => {
    ((nav.getParent() ?? nav) as Nav).navigate(route);
  };
  const openDocs = (kind: "rfq" | "pr" | "po") =>
    ((nav.getParent() ?? nav) as Nav).navigate("B2BDocs", { kind });
  // Seller status (persisted) — must register before a shop can sell; switch simulates for testing.
  const { isSeller, setIsSeller, isSupplier, setIsSupplier, isTrialBrand, setIsTrialBrand } = useSeller();
  const COLLAPSE = PROFILE_BLOCK; // scroll distance to fully hide the profile

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Profile shrinks to 0 + fades; the safe-area strip above it never collapses.
  const profileStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, COLLAPSE], [PROFILE_BLOCK, 0], Extrapolation.CLAMP),
    opacity: interpolate(scrollY.value, [0, COLLAPSE * 0.7], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND_GREEN }}>
      <StatusBar style="light" />

      {/* Green header (matches Home) — the profile row collapses on scroll. */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: BRAND_GREEN }}>
        {/* Leaf watermark, clipped to the header */}
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
          <Image source={LEAF_D} style={{ position: "absolute", top: 2, right: 8, width: 96, height: 96, opacity: 0.4, transform: [{ rotate: "28deg" }] }} resizeMode="contain" />
          <Image source={LEAF_B} style={{ position: "absolute", top: 30, left: 18, width: 44, height: 44, opacity: 0.3, transform: [{ rotate: "-22deg" }] }} resizeMode="contain" />
          <Image source={LEAF_C} style={{ position: "absolute", top: 64, left: "44%", width: 52, height: 52, opacity: 0.2, transform: [{ rotate: "60deg" }] }} resizeMode="contain" />
        </View>

        {/* Premium membership card — gradient, gold "พรีเมียม" tier; collapses +
            fades on scroll. Whole card taps through to edit the account. */}
        <Reanimated.View style={[{ overflow: "hidden" }, profileStyle]}>
          <Pressable onPress={() => go("AccountInfo")} className="active:opacity-90" style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}>
            <LinearGradient
              colors={["#0e4a29", "#1c7a45", "#2ea35d"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 20,
                padding: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
                shadowColor: "#0a3d22",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.28,
                shadowRadius: 12,
                elevation: 10,
              }}
            >
              {/* Faint crown — premium texture */}
              <Crown size={84} color="rgba(255,255,255,0.08)" strokeWidth={1.5} style={{ position: "absolute", top: -12, right: -8 }} />

              {/* Top row — brand line + gold premium tier */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 10.5, fontWeight: "700", color: "rgba(255,255,255,0.7)", letterSpacing: 1.5 }}>
                  METAHERB MEMBER
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: "rgba(255,210,128,0.22)",
                    borderWidth: 1,
                    borderColor: "rgba(255,210,128,0.55)",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Crown size={12} color="#ffd27a" strokeWidth={2.4} />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#ffe6b0" }}>พรีเมียม</Text>
                </View>
              </View>

              {/* Main row — avatar + identity */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 }}>
                <View>
                  <Image
                    source={AVATAR}
                    style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#ffffff", borderWidth: 2, borderColor: "rgba(255,255,255,0.6)" }}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      right: -2,
                      bottom: -2,
                      width: 21,
                      height: 21,
                      borderRadius: 11,
                      backgroundColor: "#ffffff",
                      borderWidth: 2,
                      borderColor: "#1c7a45",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Camera size={10} color="#1c7a45" strokeWidth={2.2} />
                  </View>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#ffffff", lineHeight: 22 }} numberOfLines={1}>
                    Ethan Walker
                  </Text>
                  <Text style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", lineHeight: 16 }} numberOfLines={1}>
                    ethan.walker@gmail.com
                  </Text>
                </View>
              </View>

              {/* Stats — points + ready-to-use coupons (coupon side taps to list) */}
              <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginTop: 14 }} />
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Sparkles size={17} color="#ffd27a" strokeWidth={2.2} />
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#ffffff", lineHeight: 18 }}>{groupNum(POINTS)}</Text>
                    <Text style={{ fontSize: 10.5, color: "rgba(255,255,255,0.72)", lineHeight: 14 }}>แต้มสะสม</Text>
                  </View>
                </View>
                <View style={{ width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.18)" }} />
                <Pressable onPress={() => go("Coupons")} className="active:opacity-70" style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 16 }}>
                  <Ticket size={17} color="#ffd27a" strokeWidth={2.2} />
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#ffffff", lineHeight: 18 }}>{ACTIVE_COUPONS}</Text>
                    <Text style={{ fontSize: 10.5, color: "rgba(255,255,255,0.72)", lineHeight: 14 }}>คูปองพร้อมใช้</Text>
                  </View>
                </Pressable>
              </View>
            </LinearGradient>
          </Pressable>
        </Reanimated.View>
      </SafeAreaView>

      {/* White sheet — FIXED & pinned; grows up to fill the screen as the profile
          collapses. Only the cards inside scroll. Green peeks through the
          rounded corners, exactly like Home / Products / Knowledge. */}
      <View
        style={{
          flex: 1,
          backgroundColor: "#fafafa",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        }}
      >
        <Reanimated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14, minHeight: SCREEN_HEIGHT - insets.top + PROFILE_BLOCK }}
        >
          {/* Orders */}
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>การสั่งซื้อของฉัน</Text>
              <Pressable onPress={() => openOrders()} hitSlop={8} className="flex-row items-center active:opacity-60" style={{ gap: 2 }}>
                <Text style={{ fontSize: 13, color: BRAND_GREEN }}>ดูทั้งหมด</Text>
                <ChevronRight size={14} color={BRAND_GREEN} strokeWidth={2.4} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {ORDER_STATUS.map((s) => {
                const count = countByStatus(s.status);
                return (
                <Pressable key={s.label} onPress={() => openOrders(s.tab)} className="items-center active:opacity-70" style={{ flex: 1, gap: 7 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: s.bg, alignItems: "center", justifyContent: "center" }}>
                    <s.Icon size={22} color={s.tint} strokeWidth={2} />
                    {count > 0 ? (
                      <View
                        style={{
                          position: "absolute",
                          top: -5,
                          right: -5,
                          minWidth: 18,
                          height: 18,
                          borderRadius: 9,
                          paddingHorizontal: 4,
                          backgroundColor: "#ef4444",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", lineHeight: 14, includeFontPadding: false }}>
                          {count}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 11, color: TEXT_SECONDARY }} numberOfLines={1}>
                    {s.label}
                  </Text>
                </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Menu */}
          <MenuList
            items={[
              { label: "บัญชีของฉัน", Icon: User, onPress: () => go("AccountInfo") },
              { label: "ที่อยู่จัดส่ง", Icon: MapPin, onPress: () => go("Address") },
              { label: "สินค้าที่ชอบ", Icon: Heart, onPress: () => go("Wishlist") },
              { label: "คูปองของฉัน", Icon: Ticket, onPress: () => go("Coupons") },
              { label: "ตั้งค่า", Icon: Settings, onPress: () => go("AppSettings") },
            ]}
          />

          {/* More services */}
          <View>
            <Text style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 8, marginLeft: 4 }}>บริการเพิ่มเติม</Text>
            <MenuList
              items={[
                { label: "ใบเสนอราคา (RFQ)", Icon: FileText, onPress: () => openDocs("rfq") },
                { label: "ใบขอสั่งซื้อ (PR)", Icon: ClipboardList, onPress: () => openDocs("pr") },
                { label: "ใบสั่งซื้อ (PO)", Icon: Receipt, onPress: () => openDocs("po") },
                { label: "การทดลองของฉัน", Icon: ClipboardCheck, onPress: () => go("MyTrials") },
              ]}
            />
          </View>

          {/* Help */}
          <View>
            <Text style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 8, marginLeft: 4 }}>ช่วยเหลือ</Text>
            <MenuList
              items={[
                { label: "ผู้ช่วย AI (เมต้า)", Icon: Sparkles, onPress: () => go("AIAssistant") },
                { label: "แชทกับร้านค้า", Icon: MessageCircle, onPress: () => go("ChatList"), badge: unreadTotal },
              ]}
            />
          </View>

          {/* My shop — apply card until registered, then the normal seller menu */}
          <View>
            <Text style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 8, marginLeft: 4 }}>ร้านค้าของฉัน</Text>
            {isSeller ? (
              <View style={{ gap: 10 }}>
                <MenuList
                  items={[
                    { label: "แดชบอร์ดร้านค้า", Icon: Store, onPress: () => go("MyShop") },
                    ...(isSupplier ? [{ label: "จัดการ Herbal Market", Icon: Beaker, onPress: () => Alert.alert("กำลังพัฒนา", "แดชบอร์ด Herbal Market กำลังพัฒนา") }] : []),
                    ...(isTrialBrand ? [{ label: "จัดการแบรนด์ทดสอบ", Icon: FlaskConical, onPress: () => Alert.alert("กำลังพัฒนา", "แดชบอร์ดแบรนด์ทดสอบ กำลังพัฒนา") }] : []),
                  ]}
                />
                {/* Apply cards — shown only for features not yet registered */}
                {!isSupplier && (
                  <ShopFeatureCard
                    image={REGIS_SUPPLIER}
                    title="ขยายสู่ตลาด B2B"
                    subtitle="สมัคร Supplier ส่งวัตถุดิบขายส่ง 🌿"
                    buttonLabel="สมัคร Supplier"
                    onPress={() => go("SupplierRegister")}
                  />
                )}
                {!isTrialBrand && (
                  <ShopFeatureCard
                    image={REGIS_BRAND}
                    title="เปิดแบรนด์ทดสอบ"
                    subtitle="ลงสินค้าให้ลูกค้าทดลองก่อนขาย 🧪"
                    buttonLabel="สมัครแบรนด์ทดสอบ"
                    onPress={() => go("BrandRegister")}
                  />
                )}
              </View>
            ) : (
              <SellerApplyCard onApply={() => go("SellerRegister")} />
            )}

          </View>

          {/* App testing — everything test-related in one section */}
          <View>
            <Text style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 8, marginLeft: 4 }}>สำหรับทดสอบ</Text>
            <MenuList
              items={[
                { label: "ทดสอบการแจ้งเตือน", Icon: Bell, onPress: () => go("NotificationTest") },
                { label: "โหมดทดสอบร้านค้า", Icon: Store, toggle: { value: isSeller, onValueChange: setIsSeller } },
                { label: "โหมดทดสอบ Supplier", Icon: Beaker, toggle: { value: isSupplier, onValueChange: setIsSupplier } },
                { label: "โหมดทดสอบแบรนด์ทดสอบ", Icon: FlaskConical, toggle: { value: isTrialBrand, onValueChange: setIsTrialBrand } },
                { label: "Owner Console (จัดการร้าน)", Icon: Store, onPress: () => go("MyShop") },
                { label: "ตั้งค่าบนเว็บไซต์", Icon: Settings, onPress: () => go("Settings") },
              ]}
            />
          </View>

          {/* Logout */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <Pressable onPress={() => go("Login")} className="flex-row items-center justify-center active:opacity-60" style={{ height: 52, gap: 8 }}>
              <LogOut size={18} color="#ef4444" strokeWidth={2.2} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#ef4444" }}>ออกจากระบบ</Text>
            </Pressable>
          </Card>
        </Reanimated.ScrollView>
        {/* Black scroll-edge shade at the very bottom of the screen. */}
        <BottomFade />
      </View>
    </View>
  );
}
