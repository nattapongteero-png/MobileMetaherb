import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Coffee, Package, Search } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { StickyFilterList } from "../components/StickyFilterList";
import { BottomFade } from "../components/BottomFade";
import { PMAddFab, FSStat } from "./MyShopScreen";
import { BORDER_GRAY, BRAND_GREEN, DIVIDER_GRAY, TEXT_DISABLED, TEXT_PRIMARY, TEXT_SECONDARY, cardShadow } from "../theme/tokens";
import { useStore } from "../store/db";
import { cafeAdminStore, type CafeItemTag } from "../store/cafeAdmin";
import { adminCafeMenu, type AdminCafeItem } from "../data/cafeAdminMenu";
import { CAFE_SUBS } from "../data/cafeMenu";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SUB_BY_ID = Object.fromEntries(CAFE_SUBS.map((s) => [s.id, s]));

/** SalesChart's second series colour — reused for the ยอดขาย stat dot. */
const CHART_ORANGE = "#f7931d";

// Café menu card — the Flash Sale product card, ported verbatim (MyShopScreen's
// FlashProductCard): status-tinted gradient frame around a white card with a
// 56px thumb + name + price header, a hairline, a 3-up stats row, and a base
// peek strip carrying the category. Tap = open the menu's edit form, which is
// also where ลบเมนูนี้ lives — one card, one way in.
//
// Exported because the console's เมนูขายดี list shows the same card. There it's
// read-only (no onEdit), passes `stats` so the row reports the selected
// period's numbers, and turns the selling status off — a sales report is about
// what sold, not about which menus are open right now.
export function CafeMenuCard({ item, onEdit, stats, showStatus = true }: {
  item: AdminCafeItem;
  onEdit?: () => void;
  stats?: { sold: number; revenue: number };
  showStatus?: boolean;
}) {
  const sub = SUB_BY_ID[item.subId];
  const off = showStatus && !!item.off;
  const onSale = item.fullPrice != null && item.fullPrice > item.price;
  const discountPct = onSale ? Math.round((((item.fullPrice ?? 0) - item.price) / (item.fullPrice ?? 1)) * 100) : 0;
  // Status drives the frame tint + the base-peek colour, exactly like the flash
  // card's กำลังขาย / สินค้าหมด / ยังไม่เข้าร่วม states.
  const statusColor = off ? "#6b7280" : BRAND_GREEN;
  const statusLabel = off ? "ปิดขาย" : "เปิดขาย";
  const sold = stats ? stats.sold : item.sold ?? 0;
  const revenue = stats ? stats.revenue : item.price * (item.sold ?? 0);

  const TAGS: { id: CafeItemTag | "custom"; label: string; color: string; on: boolean }[] = [
    { id: "recommended", label: "★ แนะนำ", color: BRAND_GREEN, on: !!item.tags?.includes("recommended") },
    { id: "bestseller", label: "ขายดี", color: "#ea580c", on: !!item.tags?.includes("bestseller") || !!item.popular },
    { id: "new", label: "มาใหม่", color: "#0284c7", on: !!item.tags?.includes("new") },
    { id: "custom", label: "เพิ่มเอง", color: "#d97706", on: !!item.custom },
  ];

  return (
    <Pressable onPress={onEdit} disabled={!onEdit} className={onEdit ? "active:opacity-90" : undefined} style={{ borderRadius: 24, ...cardShadow() }}>
      <LinearGradient colors={[statusColor + "26", statusColor + "12"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 24 }}>
        <View style={{ backgroundColor: "white", borderRadius: 24, padding: 14, gap: 12 }}>
          {/* Header — image + name + price / ลดราคา + 3-dot */}
          <View className="flex-row" style={{ gap: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", backgroundColor: "#f0f0f0" }}>
              {item.imageUri || item.image != null ? (
                <Image source={item.imageUri ? { uri: item.imageUri } : item.image} style={{ width: "100%", height: "100%", opacity: off ? 0.55 : 1 }} resizeMode="cover" resizeMethod="resize" />
              ) : (
                <View style={{ flex: 1, backgroundColor: `${sub?.accent ?? BRAND_GREEN}1a`, alignItems: "center", justifyContent: "center", opacity: off ? 0.55 : 1 }}>
                  <Coffee size={24} color={sub?.accent ?? BRAND_GREEN} strokeWidth={2} />
                </View>
              )}
              {off ? (
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" }}>
                  <Text style={{ color: "white", fontSize: 12, fontWeight: "800" }}>ปิด</Text>
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>{item.name}</Text>
              <View className="flex-row items-center" style={{ gap: 8, flexWrap: "wrap" }}>
                {onSale ? (
                  <>
                    <View className="flex-row items-baseline" style={{ gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: "#e34646" }}>฿{item.price.toLocaleString()}</Text>
                      <Text style={{ fontSize: 14, color: TEXT_DISABLED, textDecorationLine: "line-through" }}>฿{(item.fullPrice ?? 0).toLocaleString()}</Text>
                    </View>
                    <View style={{ backgroundColor: "rgba(230,46,5,0.1)", borderRadius: 999, paddingHorizontal: 8, height: 22, justifyContent: "center" }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#e34646" }}>-{discountPct}%</Text>
                    </View>
                  </>
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a" }}>฿{item.price.toLocaleString()}</Text>
                )}
                {/* หมวดหมู่ — tinted with that category's own accent, the same
                    colour its section uses elsewhere in the café */}
                {sub ? (
                  <View style={{ backgroundColor: sub.accent + "1a", borderRadius: 999, paddingHorizontal: 8, height: 22, justifyContent: "center" }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: sub.accent }}>{sub.label}</Text>
                  </View>
                ) : null}
                {/* แท็กหน้าร้าน — same pill size as the -% chip beside them */}
                {TAGS.filter((t) => t.on).map((t) => (
                  <View key={t.id} style={{ backgroundColor: t.color + "1a", borderRadius: 999, paddingHorizontal: 8, height: 22, justifyContent: "center" }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: t.color }}>{t.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />

          {/* Stats — ขายแล้ว · คงเหลือ · ยอดขาย */}
          <View className="flex-row items-start justify-between">
            <FSStat dot={BRAND_GREEN} label="ขายแล้ว" value={sold.toLocaleString()} unit="ชิ้น" />
            {/* ยอดขาย carries the chart's orange, so a number and its bar read
                as the same series across the console. */}
            <FSStat dot={CHART_ORANGE} label="ยอดขาย" value={revenue.toLocaleString()} unit="บาท" />
            {item.trackStock ? (
              <FSStat dot={(item.stockQty ?? 0) <= 5 ? "#dc2626" : "#c9cdc9"} label="คงเหลือ" value={(item.stockQty ?? 0).toLocaleString()} unit="ชิ้น" />
            ) : (
              <FSStat dot="#c9cdc9" label="คงเหลือ" value="ไม่จำกัด" unit="" />
            )}
          </View>
        </View>

        {/* Base peek — สถานะ: it shares the frame's tint, so the whole card
            changes colour together (หมวดหมู่ moved up beside the price) */}
        {showStatus ? (
          <View className="flex-row items-center" style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 5 }}>
            <Package size={13} color={statusColor} strokeWidth={2.4} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: statusColor }} numberOfLines={1}>{statusLabel}</Text>
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

/**
 * จัดการเมนู Meta Cafe (17.1) — same shell as จัดการสินค้า (ShopProductsScreen
 * + ProductsManageSection): SubPageHeader, StickyFilterList with a search pill
 * header + sticky category chips, PMCard-style item cards with a long-press
 * card tapping straight into the edit form (where ลบเมนู lives too), and the
 * shared green add-FAB pushing the
 * AddProduct-style CafeMenuEdit form.
 */
export function CafeMenuManageScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [subFilter, setSubFilter] = useState<string>("all");

  const state = useStore(cafeAdminStore);
  const menu = useMemo(() => adminCafeMenu(state), [state]);

  const q = query.trim().toLowerCase();
  const visible = menu.filter((i) => {
    if (subFilter !== "all" && i.subId !== subFilter) return false;
    if (!q) return true;
    return i.name.toLowerCase().includes(q) || (SUB_BY_ID[i.subId]?.label ?? "").includes(q);
  });
  const offCount = menu.filter((i) => i.off).length;

  const openEdit = (item: AdminCafeItem) => nav.navigate("CafeMenuEdit", { itemId: item.id });

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="จัดการเมนู"
        subtitle={`${menu.length} เมนู${offCount > 0 ? ` · ปิดขาย ${offCount}` : ""}`}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <StickyFilterList
          filterKey={subFilter}
          insetsBottom={insets.bottom + 100}
          contentGap={14}
          header={
            /* Search pill — same recipe as ProductsManageSection's header */
            <View
              className="flex-row items-center"
              style={{ backgroundColor: "white", borderWidth: 1, borderColor: DIVIDER_GRAY, borderRadius: 999, height: 44, paddingLeft: 16, paddingRight: 6, gap: 8 }}
            >
              <TextInput
                style={{ flex: 1, fontSize: 13, color: TEXT_PRIMARY, padding: 0 }}
                placeholder="ค้นหาชื่อเมนู หรือหมวดหมู่"
                placeholderTextColor={TEXT_DISABLED}
                value={query}
                onChangeText={setQuery}
              />
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                <Search size={16} color="white" />
              </View>
            </View>
          }
          filters={[
            { id: "all", label: "ทั้งหมด" },
            ...CAFE_SUBS.map((s) => ({ id: s.id, label: s.label })),
          ].map(({ id, label }) => {
            const active = subFilter === id;
            return (
              <Pressable
                key={id}
                onPress={() => setSubFilter(id)}
                className="active:opacity-80"
                style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center", backgroundColor: active ? BRAND_GREEN : "white", borderWidth: 1, borderColor: active ? BRAND_GREEN : DIVIDER_GRAY }}
              >
                <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "white" : TEXT_SECONDARY }}>{label}</Text>
              </Pressable>
            );
          })}
        >
          {visible.length === 0 ? (
            <View style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, paddingVertical: 48, alignItems: "center", gap: 10 }}>
              <Coffee size={40} color={BORDER_GRAY} strokeWidth={1.5} />
              <Text style={{ fontSize: 14, color: TEXT_DISABLED }}>ไม่พบเมนู</Text>
            </View>
          ) : (
            visible.map((item) => (
              <CafeMenuCard key={item.id} item={item} onEdit={() => openEdit(item)} />
            ))
          )}
        </StickyFilterList>

        <HeaderFade />
        <BottomFade />
      </View>

      <PMAddFab bottom={18} onPress={() => nav.navigate("CafeMenuEdit", {})} />
    </View>
  );
}
