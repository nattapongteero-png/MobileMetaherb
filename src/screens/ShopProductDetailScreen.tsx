import { useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ban, Check, Eye, MoreHorizontal, Package, PackageX, Pencil, Star, Trash2, Zap, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { AppleMenu, AppleMenuItem } from "../components/AppleMenu";
import { GlassIconButton } from "../components/GlassIconButton";
import { EmptyState } from "../components/EmptyState";
import { BottomFade } from "../components/BottomFade";
import { showToast } from "../components/Toast";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";
import { usePMProducts, setPMStatus, setPMRecommended, deletePMProduct, type PMStatus } from "./MyShopScreen";
import { SettingCard, IMG_SELL, IMG_RECOMMEND } from "./AddProductScreen";
import { SHOP_PRODUCTS } from "./ShopScreen";
import { GROUP_BY_ID } from "../data/productVariants";
import { RAW_PRODUCT_BY_ID } from "../data/realProducts";
import { useAllPromotions, computedStatus as promoStatus } from "../data/promotions";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_ICON: Record<PMStatus, LucideIcon> = {
  เปิดขาย: Check,
  ปิดขาย: Ban,
  สินค้าหมด: PackageX,
};

// Same section / row language as the coupon & promotion detail pages.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", marginBottom: 12 }}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 13.5, color: valueColor ?? "#0a0a0a", fontWeight: "500", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

/** รายละเอียดสินค้า (ฝั่งร้าน) — pushed from the จัดการสินค้า card. Mirrors the
 *  add-product form's sections as read-only info + a ตั้งค่า switch, with the
 *  app-bar ⋯ morph menu (ดูตัวอย่าง / แก้ไข / ลบ) like the coupon detail. */
export function ShopProductDetailScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { productId, type } = useRoute<RouteProp<RootStackParamList, "ShopProductDetail">>().params;
  const [menuOpen, setMenuOpen] = useState(false);
  // Subscribe to the store so toggle/delete updates re-render this page live.
  const p = usePMProducts(type).find((x) => x.id === productId);
  const promotions = useAllPromotions();

  if (!p) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <StatusBar style="dark" />
        <SubPageHeader title="รายละเอียดสินค้า" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
        <EmptyState icon={<Package size={34} color={TEXT_MUTED} />} title="ไม่พบสินค้า" subtitle="สินค้านี้อาจถูกลบไปแล้ว" />
      </View>
    );
  }

  const StIcon = STATUS_ICON[p.status];
  const isOpen = p.status === "เปิดขาย";

  // Participation — same rules as the list card (running promos only).
  const inPromo =
    !p.flash &&
    promotions.some(
      (pr) => pr.enabled && promoStatus(pr) === "active" && pr.scope === "products" && pr.products.some((x) => x.productId === p.id),
    );
  const hasCampaign = p.flash || p.recommended || inPromo;

  // Variant options (regular products only) — image + price + stock per SKU.
  // Per-option stock splits the product's total evenly (remainder on the first
  // option) so the sum always equals the คงเหลือ shown on the list card.
  const group = type === "regular" ? GROUP_BY_ID[p.id] : undefined;
  const basePrice = SHOP_PRODUCTS.find((x) => x.id === p.id)?.price ?? 0;
  const totalStock = parseInt(p.stockText.replace(/[^0-9]/g, ""), 10) || 0;
  const optionStock = (i: number) => {
    if (!group) return totalStock;
    const n = group.items.length;
    const base = Math.floor(totalStock / n);
    return i === 0 ? totalStock - base * (n - 1) : base;
  };

  const openPreview = () => {
    setMenuOpen(false);
    if (type === "material") {
      nav.navigate("HerbalMarketPreview", { id: p.id, preview: true });
    } else {
      const sp = SHOP_PRODUCTS.find((x) => x.id === p.id);
      if (sp) nav.navigate("ProductPreview", { product: sp, preview: true });
    }
  };

  const onDelete = () => {
    setMenuOpen(false);
    Alert.alert("ลบสินค้า", `ต้องการลบ "${p.name}" ใช่หรือไม่?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => {
          deletePMProduct(p.id);
          showToast(`ลบ: ${p.name}`, "info");
          nav.goBack();
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="รายละเอียดสินค้า"
        subtitle={p.name}
        onBack={() => nav.canGoBack() && nav.goBack()}
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

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {/* Status banner — same language as the other detail pages */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: p.statusColor + "1a", alignItems: "center", justifyContent: "center" }}>
                <StIcon size={18} color={p.statusColor} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>สถานะสินค้า</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: p.statusColor, marginTop: 1 }}>{p.status}</Text>
              </View>
            </View>
          </View>

          {/* รูปภาพสินค้า — cover shot, mirrors the add-form's upload section */}
          <Section title="รูปภาพสินค้า">
            <View style={{ borderRadius: 14, overflow: "hidden", backgroundColor: "#f0f0f0" }}>
              <Image source={p.image} style={{ width: "100%", height: 190 }} resizeMode="cover" />
            </View>
            <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 8 }}>รูปปก</Text>
          </Section>

          {/* ข้อมูลสินค้า */}
          <Section title="ข้อมูลสินค้า">
            <InfoRow label="ชื่อสินค้า" value={p.name} />
            <InfoRow label="หมวดหมู่" value={p.category} />
            <InfoRow label="ประเภทสินค้า" value={p.type} valueColor={p.typeColor} />
          </Section>

          {/* ตัวเลือกสินค้า — only when the detail page sells multiple SKUs */}
          {group ? (
            <Section title={`ตัวเลือกสินค้า (${group.items.length})`}>
              <View style={{ gap: 14 }}>
                {group.items.map((it, i) => {
                  const price = it.custom?.price ?? RAW_PRODUCT_BY_ID[it.id]?.price ?? basePrice;
                  const image = it.custom?.image ?? RAW_PRODUCT_BY_ID[it.id]?.image ?? p.image;
                  return (
                    <View key={it.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Image source={image} style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }}>{it.label}</Text>
                        <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>คงเหลือ {optionStock(i).toLocaleString()} ชิ้น</Text>
                      </View>
                      <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN }}>{`฿ ${price.toFixed(2)}`}</Text>
                    </View>
                  );
                })}
              </View>
            </Section>
          ) : null}

          {/* ราคาและสต็อก */}
          <Section title="ราคาและสต็อก">
            <InfoRow label="ราคาขาย" value={p.priceText} valueColor={BRAND_GREEN} />
            <InfoRow label="คงเหลือ" value={p.stockText} />
          </Section>

          {/* การเข้าร่วมแคมเปญ — same pills as the list card */}
          {type === "regular" ? (
            <Section title="การเข้าร่วมแคมเปญ">
              {hasCampaign ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {p.flash ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(230,46,5,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
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
              ) : (
                <Text style={{ fontSize: 13, color: TEXT_MUTED }}>ไม่ได้เข้าร่วมแคมเปญ</Text>
              )}
            </Section>
          ) : null}

          {/* ตั้งค่าสินค้า — same setting cards as the add-product form
              (store-backed, updates every page live) */}
          <Section title="ตั้งค่าสินค้า">
            <View style={{ gap: 12 }}>
              <SettingCard
                Icon={Eye}
                label="เปิดขาย"
                subtitle="แสดงสินค้านี้บนหน้าร้านให้ลูกค้ามองเห็นและสั่งซื้อได้"
                value={isOpen}
                onValueChange={(v) => {
                  const next: PMStatus = v ? "เปิดขาย" : "ปิดขาย";
                  setPMStatus(p.id, next);
                  showToast(v ? `เปิดการขาย: ${p.name}` : `ปิดการขาย: ${p.name}`);
                }}
                accent={BRAND_GREEN}
                image={IMG_SELL}
              />
              {type === "regular" ? (
                <SettingCard
                  Icon={Star}
                  label="สินค้าแนะนำ"
                  subtitle="ปักหมุดสินค้านี้ในส่วนแนะนำบนหน้าร้าน"
                  value={p.recommended}
                  onValueChange={(v) => {
                    setPMRecommended(p.id, v);
                    showToast(v ? `ตั้งเป็นสินค้าแนะนำ: ${p.name}` : `เอาออกจากสินค้าแนะนำ: ${p.name}`);
                  }}
                  accent="#f7931d"
                  image={IMG_RECOMMEND}
                />
              ) : null}
            </View>
          </Section>
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <BottomFade />
      </View>

      {/* More menu — the app-bar ⋯ button morphs into this options card */}
      <AppleMenu visible={menuOpen} onClose={() => setMenuOpen(false)} anchorTop={insets.top + 6}>
        <AppleMenuItem label="ดูตัวอย่าง" Icon={Eye} onPress={openPreview} />
        <AppleMenuItem
          label="แก้ไข"
          Icon={Pencil}
          onPress={() => {
            setMenuOpen(false);
            nav.navigate("AddProduct", { mode: type });
          }}
        />
        <AppleMenuItem label="ลบ" Icon={Trash2} danger onPress={onDelete} />
      </AppleMenu>
    </View>
  );
}
