/**
 * META Caffe (GREEN BREW COFFEE) — in-app café landing page.
 * One long scroll: green premium hero + every category shown as its own section
 * (main category → sub category), built from the real menu photos in
 * assets/menu caffe/. Search filters across all items; a floating cart bar +
 * appbar cart/history/search buttons. Ordering itself is a mockup.
 */
import { useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert, Dimensions, TextInput } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Minus, Flame, ShoppingBag, Receipt, Search, X } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import type { RootStackParamList } from "../navigation/RootStack";
import { CAFE_SUBS, CAFE_MENU, type CafeItem, type CafeSub } from "../data/cafeMenu";
import type { CafeCartLine } from "../data/cafeCart";
import { BRAND_GREEN, TEXT_PRIMARY, TEXT_MUTED } from "../theme/tokens";

const CAFE_IMG = require("../../assets/caffe.png");
type Nav = NativeStackNavigationProp<RootStackParamList>;
const baht = (n: number) => "฿" + n.toLocaleString();
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_W = Math.floor((SCREEN_WIDTH - 16 * 2 - 12) / 2);

export function CafeScreen() {
  const nav = useNavigation<Nav>();
  const [cart, setCart] = useState<CafeCartLine[]>([]);
  const [q, setQ] = useState("");

  // Add a customised line from the detail screen (identical lines merge).
  const addLine = (line: CafeCartLine) =>
    setCart((prev) => {
      const i = prev.findIndex((l) => l.key === line.key);
      if (i >= 0) { const next = [...prev]; next[i] = { ...next[i], qty: next[i].qty + line.qty }; return next; }
      return [...prev, line];
    });
  const openDetail = (item: CafeItem) => nav.navigate("CafeItemDetail", { item, onAdd: addLine });

  // Per-card quick controls: total qty of an item across its option variants.
  const qtyOfItem = (id: string) => cart.reduce((s, l) => (l.itemId === id ? s + l.qty : s), 0);
  const quickAdd = (item: CafeItem) =>
    addLine({ key: `${item.id}|base`, itemId: item.id, name: item.name, image: item.image, unitPrice: item.price, qty: 1, summary: "" });
  const decItem = (id: string) =>
    setCart((prev) => {
      let i = -1;
      for (let k = prev.length - 1; k >= 0; k--) { if (prev[k].itemId === id) { i = k; break; } }
      if (i < 0) return prev;
      const next = [...prev];
      if (next[i].qty <= 1) next.splice(i, 1);
      else next[i] = { ...next[i], qty: next[i].qty - 1 };
      return next;
    });

  const totalQty = cart.reduce((s, l) => s + l.qty, 0);
  const totalPrice = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  const showCheckout = () => Alert.alert("META Caffe", "ระบบตะกร้า/สั่งซื้อคาเฟ่กำลังพัฒนา เปิดให้บริการเร็ว ๆ นี้ครับ");
  const showHistory = () => Alert.alert("ประวัติคำสั่งซื้อ", "ประวัติการสั่งซื้อคาเฟ่กำลังพัฒนา เปิดให้บริการเร็ว ๆ นี้ครับ");

  const query = q.trim().toLowerCase();
  const searching = query.length > 0;
  const results = searching ? CAFE_MENU.filter((it) => it.name.toLowerCase().includes(query)) : [];
  const hits = CAFE_MENU.filter((it) => it.popular).slice(0, 6); // top-6 best sellers
  const hitRank: Record<string, number> = {};
  hits.forEach((it, i) => { hitRank[it.id] = i + 1; });

  const renderSub = (s: CafeSub) => {
    const items = CAFE_MENU.filter((it) => it.subId === s.id);
    if (!items.length) return null;
    return (
      <View key={s.id} style={{ paddingHorizontal: 16, marginBottom: 22 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: s.accent }} />
          <Text style={{ fontSize: 15.5, fontWeight: "800", color: TEXT_PRIMARY }}>{s.label}</Text>
          <Text style={{ fontSize: 12, color: TEXT_MUTED }}>{items.length} เมนู</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {items.map((it) => (
            <CafeCard key={it.id} it={it} rank={hitRank[it.id]} qty={qtyOfItem(it.id)} onOpen={() => openDetail(it)} onInc={() => quickAdd(it)} onDec={() => decItem(it.id)} />
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="META Caffe"
        subtitle="GREEN BREW COFFEE"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <GlassIconButton onPress={showHistory} accessibilityLabel="ประวัติคำสั่งซื้อ">
              <Receipt size={19} color="#1a1a1a" strokeWidth={2.2} />
            </GlassIconButton>
            <View>
              <GlassIconButton onPress={showCheckout} accessibilityLabel="ตะกร้า">
                <ShoppingBag size={19} color="#1a1a1a" strokeWidth={2.2} />
              </GlassIconButton>
              {totalQty > 0 ? (
                <View pointerEvents="none" style={{ position: "absolute", top: -3, right: -3, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: "#e62e05", alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 1.5, borderColor: "#fafafa" }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#fff" }}>{totalQty > 99 ? "99+" : totalQty}</Text>
                </View>
              ) : null}
            </View>
          </View>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: totalQty > 0 ? 120 : 28 }}>
        {/* Hero */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 }}>
          <View style={{ borderRadius: 20, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.26, shadowRadius: 16, elevation: 7 }}>
            <View style={{ borderRadius: 20, overflow: "hidden" }}>
              <LinearGradient colors={["#0b3d2e", "#125239", "#1a7a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, minHeight: 128, justifyContent: "center" }}>
                <Image source={CAFE_IMG} style={{ position: "absolute", right: -6, bottom: -12, width: 136, height: 136 }} resizeMode="contain" />
                <View style={{ width: 196, gap: 5 }}>
                  <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: 0.2 }}>คาเฟ่ของ METAHERB</Text>
                  <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12.5, lineHeight: 18 }}>กาแฟ ชา ขนม และอาหารสดใหม่ ส่งตรงจากครัวเรา</Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Search bar — below the hero banner */}
        <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", height: 46, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 14, borderWidth: 1, borderColor: "#ececec", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
            <Search size={18} color={BRAND_GREEN} strokeWidth={2.2} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="ค้นหาเมนูคาเฟ่..."
              placeholderTextColor="#a3a3a3"
              returnKeyType="search"
              style={{ flex: 1, marginLeft: 10, fontSize: 14, color: "#374151", paddingVertical: 0 }}
            />
            {q.length > 0 ? (
              <Pressable onPress={() => setQ("")} hitSlop={8} className="active:opacity-60">
                <X size={17} color="#9ca3af" strokeWidth={2.4} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {searching ? (
          /* Search results — flat grid across every category */
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_PRIMARY, marginBottom: 12 }}>
              {results.length ? `ผลการค้นหา ${results.length} เมนู` : "ไม่พบเมนูที่ค้นหา"}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {results.map((it) => (
                <CafeCard key={it.id} it={it} rank={hitRank[it.id]} qty={qtyOfItem(it.id)} onOpen={() => openDetail(it)} onInc={() => quickAdd(it)} onDec={() => decItem(it.id)} />
              ))}
            </View>
          </View>
        ) : (
          /* Landing — top-6 hit menu on top, then every sub category */
          <>
            {hits.length ? (
              <View style={{ marginBottom: 22 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10, paddingHorizontal: 16 }}>
                  <Flame size={17} color="#ea580c" strokeWidth={2.6} />
                  <Text style={{ fontSize: 15.5, fontWeight: "800", color: TEXT_PRIMARY }}>เมนูฮิต คนสั่งเยอะ</Text>
                  <Text style={{ fontSize: 12, color: TEXT_MUTED }}>6 อันดับ</Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16 }}>
                  {hits.map((it, i) => (
                    <CafeCard key={`hit-${it.id}`} it={it} rank={i + 1} qty={qtyOfItem(it.id)} onOpen={() => openDetail(it)} onInc={() => quickAdd(it)} onDec={() => decItem(it.id)} />
                  ))}
                </View>
              </View>
            ) : null}
            {CAFE_SUBS.map(renderSub)}
          </>
        )}
      </ScrollView>

      {/* Floating cart bar */}
      {totalQty > 0 ? (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 24 }}>
          <Pressable
            onPress={showCheckout}
            className="active:opacity-90"
            style={{ borderRadius: 999, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}
          >
            <View style={{ borderRadius: 999, overflow: "hidden" }}>
              <LinearGradient colors={["#0b3d2e", "#1a7a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 16, height: 54, gap: 11 }}>
                <View style={{ minWidth: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{totalQty}</Text>
                </View>
                <Text style={{ flex: 1, color: "#fff", fontWeight: "700", fontSize: 14 }}>ดูตะกร้า · สั่งซื้อ</Text>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{baht(totalPrice)}</Text>
              </LinearGradient>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function CafeCard({ it, rank, qty, onOpen, onInc, onDec }: { it: CafeItem; rank?: number; qty: number; onOpen: () => void; onInc: () => void; onDec: () => void }) {
  return (
    <Pressable onPress={onOpen} className="active:opacity-90" style={{ width: CARD_W, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f0f0f0", overflow: "hidden" }}>
      <View style={{ width: "100%", height: CARD_W, backgroundColor: "#f5f5f5" }}>
        <Image source={it.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        {rank ? (
          <View style={{ position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(234,88,12,0.95)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Flame size={10} color="#fff" strokeWidth={2.6} />
            <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#fff" }}>อันดับ {rank}</Text>
          </View>
        ) : it.popular ? (
          <View style={{ position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(234,88,12,0.92)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Flame size={10} color="#fff" strokeWidth={2.6} />
            <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#fff" }}>ฮิต</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 10, gap: 6 }}>
        <View style={{ gap: 2 }}>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: TEXT_PRIMARY, lineHeight: 17 }}>{it.name}</Text>
          <Text numberOfLines={1} style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 15 }}>{it.desc}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: "800", color: BRAND_GREEN }}>{baht(it.price)}</Text>
          {qty > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable onPress={onDec} hitSlop={6} className="active:opacity-70" style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                <Minus size={15} color={BRAND_GREEN} strokeWidth={2.6} />
              </Pressable>
              <Text style={{ fontSize: 14, fontWeight: "800", color: TEXT_PRIMARY, minWidth: 14, textAlign: "center" }}>{qty}</Text>
              <Pressable onPress={onInc} hitSlop={6} className="active:opacity-80" style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                <Plus size={15} color="#fff" strokeWidth={2.6} />
              </Pressable>
            </View>
          ) : (
            // First add must go through the detail page to pick options.
            <Pressable onPress={onOpen} hitSlop={6} className="active:opacity-80" style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
              <Plus size={17} color="#fff" strokeWidth={2.6} />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}
