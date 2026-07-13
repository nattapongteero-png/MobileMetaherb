/**
 * FlashAddProductScreen — full-page "เพิ่มสินค้า Flash Sale" flow (2 steps).
 *
 * Ported from the web AddFlashSaleModal (OwnerDashboard). Was a BottomSheet in
 * the mockup; now a pushed screen: step 1 = เลือกสินค้า (search + product list),
 * step 2 = กำหนดส่วนลด (product header + date pickers + discount/qty fields).
 */
import { useState, type ReactNode } from "react";
import { View, Text, ScrollView, Pressable, Image, TextInput } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, ChevronRight, Boxes, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassDateRangePicker } from "../components/GlassDatePicker";
import { showToast } from "../components/Toast";
import { SHOP_PRODUCTS } from "./ShopScreen";
import { useAllPromotions, computedStatus } from "../data/promotions";
import type { FlashProduct } from "./MyShopScreen";
import { upsertFlash } from "../store/promotions";

const TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** "01 ก.ค. 69 - 00:00" → epoch ms. Falls back when the field is empty. */
function parseFlashDate(text: string, fallback: number): string {
  const m = text.match(/(\d{1,2})\s+(\S+)\s+(\d{2,4})(?:[^\d]+(\d{1,2}):(\d{2}))?/);
  if (!m) return new Date(fallback).toISOString();
  const month = TH_MONTH.indexOf(m[2]);
  if (month < 0) return new Date(fallback).toISOString();
  const yy = Number(m[3]);
  const year = (yy < 100 ? 2500 + yy : yy) - 543; // Buddhist → Gregorian
  return new Date(year, month, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0)).toISOString();
}
import type { RootStackParamList } from "../navigation/RootStack";
import { BRAND_GREEN, TEXT_PRIMARY, TEXT_MUTED, TEXT_DISABLED, DIVIDER_GRAY, SURFACE_GRAY, GLASS_BAR_TINT } from "../theme/tokens";

const DEFAULT_STOCK = 500;

function FSLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <View className="flex-row items-center" style={{ gap: 4 }}>
      <Text style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a" }}>{children}</Text>
      {required ? <Text style={{ fontSize: 14, color: "#ff3b30" }}>*</Text> : null}
    </View>
  );
}

// Selected-product header (image + name + flash/original price + stock).
function FSProductHeader({ image, name, originalPrice, flashPrice, stock }: { image: number; name: string; originalPrice: number; flashPrice: number; stock: string }) {
  return (
    <View className="flex-row items-start" style={{ gap: 16 }}>
      <Image source={image} style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: "#d4d4d8" }} resizeMode="cover"
          resizeMethod="resize" />
      <View style={{ flex: 1, justifyContent: "space-between", alignSelf: "stretch", gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }} numberOfLines={1}>{name}</Text>
        <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
          <View className="flex-row items-baseline" style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#bc1b06" }}>฿ {flashPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            <Text style={{ fontSize: 12, color: "#a3a3a3", textDecorationLine: "line-through" }}>฿ {originalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Boxes size={14} color="#0a0a0a" strokeWidth={2} />
            <Text style={{ fontSize: 12, color: "#0a0a0a" }}>{stock} ชิ้น</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// 2-sided % / ฿ switch inside the discount field.
function FSDiscountType({ value, onChange }: { value: "percent" | "baht"; onChange: (t: "percent" | "baht") => void }) {
  return (
    <View className="flex-row" style={{ backgroundColor: "rgba(118,118,128,0.12)", borderRadius: 999, padding: 4, gap: 4 }}>
      {(["percent", "baht"] as const).map((t) => {
        const active = value === t;
        return (
          <Pressable
            key={t}
            onPress={() => { Haptics.selectionAsync(); onChange(t); }}
            className="items-center justify-center active:opacity-80"
            style={{ minWidth: 40, height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: active ? "white" : "transparent" }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: active ? BRAND_GREEN : "#8e8e93" }}>{t === "percent" ? "%" : "฿"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Inline +/- stepper (92×32 pill, divider).
function FSInlineStepper({ value, onChange, min = 1, max, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  const atMin = value <= min;
  const atMax = max != null && value >= max;
  return (
    <View className="flex-row items-center" style={{ height: 32, width: 92, borderRadius: 999, backgroundColor: "rgba(116,116,128,0.08)", overflow: "hidden" }}>
      <Pressable disabled={atMin} onPress={() => { Haptics.selectionAsync(); onChange(Math.max(min, value - step)); }} className="items-center justify-center active:opacity-60" style={{ flex: 1, height: "100%" }}>
        <Text style={{ fontSize: 18, fontWeight: "600", color: atMin ? "#d4d4d4" : "#0a0a0a" }}>−</Text>
      </Pressable>
      <View style={{ width: 1, height: 14, backgroundColor: "rgba(0,0,0,0.15)" }} />
      <Pressable disabled={atMax} onPress={() => { Haptics.selectionAsync(); onChange(max != null ? Math.min(max, value + step) : value + step); }} className="items-center justify-center active:opacity-60" style={{ flex: 1, height: "100%" }}>
        <Text style={{ fontSize: 18, fontWeight: "600", color: atMax ? "#d4d4d4" : "#0a0a0a" }}>+</Text>
      </Pressable>
    </View>
  );
}

export function FlashAddProductScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, "FlashAddProduct">>();
  const insets = useSafeAreaInsets();
  // Edit mode — opened from a card's ⋯ sheet: skip step 1, prefill everything.
  const edit = params?.edit;
  // Preselect — "เพิ่มเข้า Flash Sale" from a specific product's ⋯: the product
  // is already known, so skip the picker and go straight to discount setup.
  const preselect = params?.preselect;
  const editIsBaht = !!edit?.discountText?.startsWith("-฿");
  const [step, setStep] = useState<1 | 2>(edit || preselect ? 2 : 1);
  const [picked, setPicked] = useState<(typeof SHOP_PRODUCTS)[number] | null>(() => {
    const src = edit ?? preselect;
    return src ? ({ id: src.id, name: src.name, price: src.normalPrice, image: src.image, category: "" } as unknown as (typeof SHOP_PRODUCTS)[number]) : null;
  });
  const [query, setQuery] = useState("");
  const [discType, setDiscType] = useState<"percent" | "baht">(editIsBaht ? "baht" : "percent");
  const [discVal, setDiscVal] = useState(edit ? (editIsBaht ? parseInt(edit.discountText!.replace(/[^0-9]/g, "")) || 0 : edit.discount) : 20);
  const [qty, setQty] = useState(edit?.total ?? 100);
  // Opened from an event → prefill both dates with the event period (still editable).
  const [startDate, setStartDate] = useState(edit?.startText ?? params?.eventDate ?? "");
  const [endDate, setEndDate] = useState(edit?.endText ?? params?.eventDate ?? "");

  const q = query.trim().toLowerCase();
  // Pickable pool = products not already in Flash Sale and not in a running
  // promotion (a product is never in both at once).
  const promotions = useAllPromotions();
  const inActivePromo = (id: string) =>
    promotions.some(
      (pr) => pr.enabled && computedStatus(pr) === "active" && pr.scope === "products" && pr.products.some((x) => x.productId === id),
    );
  const list = SHOP_PRODUCTS.filter(
    (p) => !p.isFlashSale && !inActivePromo(p.id) && (!q || p.name.toLowerCase().includes(q)),
  );

  const flashPrice = picked ? (discType === "percent" ? Math.round(picked.price * (1 - discVal / 100)) : Math.max(0, picked.price - discVal)) : 0;
  const maxStock = DEFAULT_STOCK;

  const goBack = () => {
    if (step === 2 && !edit && !preselect) setStep(1); // edit/preselect have no step 1
    else if (nav.canGoBack()) nav.goBack();
  };

  const confirm = () => {
    if (!picked) return;
    const pct = picked.price > 0 ? Math.round((1 - flashPrice / picked.price) * 100) : 0;
    const sold = edit?.sold ?? 0;
    const product: FlashProduct = {
      id: edit ? edit.id : `${picked.id}-fs`,
      name: picked.name,
      image: picked.image as number,
      normalPrice: picked.price,
      flashPrice,
      discount: pct,
      // ฿ discount shows as "-฿N" on the card; percent uses the default "-N%".
      discountText: discType === "baht" ? `-฿${discVal.toLocaleString()}` : undefined,
      total: qty,
      sold,
      remaining: Math.max(0, qty - sold),
      revenue: edit?.revenue ?? 0,
      status: edit ? (qty - sold <= 0 ? "soldout" : edit.status === "soldout" ? "active" : edit.status) : "active",
      timeRange: startDate && endDate ? `${startDate} – ${endDate}` : "—",
      startText: startDate,
      endText: endDate,
    };
    // Write the round to the shared store, so the product's price drops on the
    // customer's storefront and it joins the Home flash rail. (This used to hand
    // the product to a navigation callback and die in the caller's useState.)
    upsertFlash({
      productId: picked.id,
      flashPrice,
      total: qty,
      sold,
      startsAt: parseFlashDate(startDate, Date.now()),
      endsAt: parseFlashDate(endDate, Date.now() + 7 * 86_400_000),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    params?.onDone?.(product);
    showToast(edit ? `แก้ไข "${picked.name}" เรียบร้อย` : `เพิ่ม "${picked.name}" เข้า Flash Sale เรียบร้อย`);
    nav.goBack();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={edit ? "แก้ไขสินค้า Flash Sale" : "เพิ่มสินค้า Flash Sale"}
        subtitle={edit ? "แก้ไขส่วนลด / จำนวน" : `ขั้นที่ ${step} / 2 · ${step === 1 ? "เลือกสินค้า" : "กำหนดส่วนลด"}`}
        onBack={goBack}
        showSearch={false}
      />

      {step === 1 ? (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
          {/* Search — same as the Flash Sale store search (white pill + green button) */}
          <View className="flex-row items-center" style={{ backgroundColor: "white", borderWidth: 1, borderColor: DIVIDER_GRAY, borderRadius: 999, height: 44, paddingLeft: 16, paddingRight: 8, gap: 8, marginBottom: 12 }}>
            <TextInput style={{ flex: 1, fontSize: 13, color: TEXT_PRIMARY, padding: 0 }} placeholder="ค้นหาสินค้า Flash Sale" placeholderTextColor={TEXT_DISABLED} value={query} onChangeText={setQuery} />
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
              <Search size={16} color="white" />
            </View>
          </View>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 + insets.bottom }}>
            {list.map((prod) => (
              <Pressable key={prod.id} onPress={() => { Haptics.selectionAsync(); setPicked(prod); setStep(2); }} className="flex-row items-center active:bg-neutral-50" style={{ backgroundColor: "white", borderWidth: 1, borderColor: "#ececed", borderRadius: 16, padding: 12, gap: 12 }}>
                <Image source={prod.image as number} style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: SURFACE_GRAY }} resizeMode="cover"
          resizeMethod="resize" />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY }} numberOfLines={1}>{prod.name}</Text>
                  <Text style={{ fontSize: 12.5, color: TEXT_MUTED }} numberOfLines={1}>{prod.category}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: BRAND_GREEN }}>฿{prod.price.toLocaleString()}</Text>
                </View>
                <ChevronRight size={20} color={TEXT_DISABLED} />
              </Pressable>
            ))}
            {list.length === 0 ? <Text style={{ textAlign: "center", color: TEXT_DISABLED, paddingVertical: 24 }}>ไม่พบสินค้า</Text> : null}
          </ScrollView>
        </View>
      ) : picked ? (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: insets.bottom + 110 }}>
            {/* Selected product header */}
            <FSProductHeader image={picked.image as number} name={picked.name} originalPrice={picked.price} flashPrice={flashPrice} stock={maxStock.toLocaleString()} />

            {/* Date row — เริ่มต้น / สิ้นสุด (prefilled with the event period when opened from an event) */}
            <GlassDateRangePicker
              start={startDate}
              end={endDate}
              onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
              // Opened from a flash round → the round's window is fixed; the
              // dates are shown for reference but locked.
              disabled={!!params?.eventDate}
            />

            {/* Discount */}
            <View style={{ gap: 8 }}>
              <FSLabel required>ส่วนลด ({discType === "percent" ? "%" : "฿"})</FSLabel>
              <View className="flex-row items-center" style={{ backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#ececed", borderRadius: 999, height: 48, paddingLeft: 20, paddingRight: 8, gap: 8 }}>
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: "#0a0a0a", padding: 0 }}
                  keyboardType="number-pad"
                  value={String(discVal)}
                  onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, "")) || 0; setDiscVal(discType === "percent" ? Math.min(100, n) : n); }}
                />
                <FSDiscountType value={discType} onChange={setDiscType} />
              </View>
            </View>

            {/* Quantity */}
            <View style={{ gap: 8 }}>
              <FSLabel>จำนวน Flash Sale</FSLabel>
              <View className="flex-row items-center" style={{ backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#ececed", borderRadius: 999, height: 48, paddingLeft: 20, paddingRight: 8, gap: 8 }}>
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: "#0a0a0a", padding: 0 }}
                  keyboardType="number-pad"
                  value={String(qty)}
                  onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, "")) || 0; setQty(Math.max(1, Math.min(maxStock, n))); }}
                />
                <FSInlineStepper value={qty} onChange={setQty} min={1} max={maxStock} />
              </View>
            </View>
          </ScrollView>

          {/* Footer — floating Liquid Glass bar (same style as AddProductScreen) */}
          <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 130 }} />
          <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: insets.bottom + 10 }}>
            <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
              <GlassView glassEffectStyle="regular" colorScheme="light" tintColor={GLASS_BAR_TINT} style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
                {/* Confirm — primary pill (back = header back button) */}
                <Pressable onPress={confirm} className="flex-row items-center justify-center active:opacity-90" style={{ flex: 1, height: 50, borderRadius: 999, backgroundColor: BRAND_GREEN, gap: 8 }}>
                  <Check size={20} color="#fff" strokeWidth={2.6} />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{edit ? "บันทึกการแก้ไข" : "เพิ่มสินค้า Flash Sale"}</Text>
                </Pressable>
              </GlassView>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
