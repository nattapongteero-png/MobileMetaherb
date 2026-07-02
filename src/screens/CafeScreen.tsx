/**
 * META Caffe (GREEN BREW COFFEE) — in-app café landing page.
 * One long scroll: green premium hero + every category shown as its own section
 * (main category → sub category), built from the real menu photos in
 * assets/menu caffe/. Search filters across all items; a floating cart bar +
 * appbar cart/history/search buttons. Ordering itself is a mockup.
 */
import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable, Image, Dimensions, TextInput, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Minus, Flame, ShoppingBag, Receipt, Search, X, Clock, ListOrdered, Check, Star } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { GlassView } from "expo-glass-effect";
import type { RootStackParamList } from "../navigation/RootStack";
import { CAFE_SUBS, CAFE_MENU, type CafeItem, type CafeSub } from "../data/cafeMenu";
import { useCafeCart } from "../context/CafeCartContext";
import type { CafeOrder } from "../data/cafePayment";
import { CountdownRing } from "../components/CountdownRing";
import { BRAND_GREEN, TEXT_PRIMARY, TEXT_MUTED } from "../theme/tokens";

const CAFE_IMG = require("../../assets/caffe.png");
const DRIP_GIF = require("../../assets/drepcoffee.gif"); // animated "brewing" indicator
const READY_IMG = require("../../assets/herocafe.png"); // finished cup — shown when the order is ready
type Nav = NativeStackNavigationProp<RootStackParamList>;
const baht = (n: number) => "฿" + n.toLocaleString();
const fmtTime = (d: Date) =>
  `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_W = Math.floor((SCREEN_WIDTH - 16 * 2 - 12) / 2);

/** Replaces the café hero while an order is being prepared — same size as the
 *  banner, with a live countdown ring on the left. When the countdown completes
 *  the background crossfades from dark green to the home appbar green (#319754). */
function QueueBanner({ order, onPress, onDismiss, width }: { order: CafeOrder; onPress: () => void; onDismiss: () => void; width?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const totalMs = Math.max(1, order.waitMinutes * 60000);
  const remainMs = Math.max(0, order.readyAt - now);
  const frac = Math.min(1, remainMs / totalMs); // 1 → full ring, 0 → empty
  const totalSec = Math.ceil(remainMs / 1000);
  const clock = `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, "0")}`;
  const done = remainMs <= 0;
  const ready = fmtTime(new Date(order.readyAt));

  // Animate the background colour from dark green to the appbar green when done.
  const anim = useRef(new Animated.Value(done ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: done ? 1 : 0, duration: 650, useNativeDriver: true }).start();
  }, [done, anim]);
  const prepOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <View style={width != null ? { width, paddingTop: 16, paddingBottom: 28 } : { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 }}>
      <View style={{ borderRadius: 20, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.26, shadowRadius: 16, elevation: 7 }}>
        <Pressable onPress={onPress} className="active:opacity-90" style={{ borderRadius: 20, overflow: "hidden" }}>
          {/* background: dark "preparing" green crossfades to the appbar green */}
          <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: prepOpacity }}>
            <LinearGradient colors={["#0b3d2e", "#125239", "#1a7a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
          </Animated.View>
          <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: anim }}>
            <LinearGradient colors={["#37a35f", "#319754", "#2c8a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
          </Animated.View>

          {/* corner art — brewing drip while preparing, finished cup when ready */}
          <Animated.View pointerEvents="none" style={{ position: "absolute", right: -6, bottom: -12, opacity: prepOpacity }}>
            <Image source={DRIP_GIF} style={{ width: 136, height: 136 }} resizeMode="contain" />
          </Animated.View>
          <Animated.View pointerEvents="none" style={{ position: "absolute", right: -4, bottom: -8, opacity: anim }}>
            <Image source={READY_IMG} style={{ width: 122, height: 122 }} resizeMode="contain" />
          </Animated.View>

          {/* content (in flow — sets the card height); ring stays on the left */}
          <View style={{ padding: 18, minHeight: 128, justifyContent: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <CountdownRing frac={frac} clock={clock} done={done} />
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>{done ? "ออเดอร์พร้อมแล้ว! ☕" : "กำลังเตรียมออเดอร์ ☕"}</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 7 }}>
                  <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: "700" }}>คิว</Text>
                  <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900", lineHeight: 28 }}>#{order.queueNo}</Text>
                </View>
                {done ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Check size={14} color="#eafff2" strokeWidth={2.6} />
                    <Text style={{ color: "rgba(255,255,255,0.95)", fontSize: 12.5 }}>รับได้ที่เคาน์เตอร์</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <ListOrdered size={14} color="#c8f0d6" strokeWidth={2.4} />
                      <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 12.5 }}>รออีก {order.queueAhead} คิว</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Clock size={14} color="#c8f0d6" strokeWidth={2.4} />
                      <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 12.5 }}>~{ready} น.</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* dismiss — only once the order is ready to be picked up */}
          {done ? (
            <Pressable
              onPress={onDismiss}
              hitSlop={10}
              className="active:opacity-70"
              style={{ position: "absolute", top: 12, right: 12, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.22)", alignItems: "center", justifyContent: "center" }}
            >
              <X size={15} color="#fff" strokeWidth={2.6} />
            </Pressable>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

/** Renders the active order banner(s). One order fills the width; multiple orders
 *  become a free horizontal side-scroll (cards sit next to each other, the next
 *  one peeks) — not a paged carousel. */
function QueueBannerArea({ orders, onOpen, onDismiss }: { orders: CafeOrder[]; onOpen: (o: CafeOrder) => void; onDismiss: (o: CafeOrder) => void }) {
  if (orders.length === 1) {
    const o = orders[0];
    return <QueueBanner order={o} onPress={() => onOpen(o)} onDismiss={() => onDismiss(o)} />;
  }
  const cardW = SCREEN_WIDTH - 64; // leaves the next card peeking on the right
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      {orders.map((o) => (
        <QueueBanner key={o.orderId} order={o} width={cardW} onPress={() => onOpen(o)} onDismiss={() => onDismiss(o)} />
      ))}
    </ScrollView>
  );
}

export function CafeScreen() {
  const nav = useNavigation<Nav>();
  const [q, setQ] = useState("");
  const { add, decItem, qtyOfItem, totalQty, totalPrice, activeOrders, completeOrder } = useCafeCart();

  const openDetail = (item: CafeItem) => nav.navigate("CafeItemDetail", { item });
  const openCart = () => nav.navigate("CafeCart");
  const quickAdd = (item: CafeItem) =>
    add({ key: `${item.id}|base`, itemId: item.id, name: item.name, image: item.image, unitPrice: item.price, qty: 1, summary: "", opts: { sweet: 2, milk: 0, shot: 0, note: "" } });
  const showHistory = () => nav.navigate("CafeHistory");
  const openFavorites = () => nav.navigate("CafeFavorites");

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
            <GlassIconButton onPress={openFavorites} accessibilityLabel="เมนูโปรด">
              <Star size={19} color="#1a1a1a" strokeWidth={2.2} />
            </GlassIconButton>
            <GlassIconButton onPress={showHistory} accessibilityLabel="ประวัติคำสั่งซื้อ">
              <Receipt size={19} color="#1a1a1a" strokeWidth={2.2} />
            </GlassIconButton>
            <View>
              <GlassIconButton onPress={openCart} accessibilityLabel="ตะกร้า">
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

      <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: totalQty > 0 ? 120 : 28 }}>
        {/* Hero — swaps to the queue banner(s) while orders are being prepared */}
        {activeOrders.length > 0 ? (
          <QueueBannerArea
            orders={activeOrders}
            onOpen={(o) => nav.navigate("CafeOrderDetail", { orderId: o.orderId })}
            onDismiss={(o) => completeOrder(o.orderId)}
          />
        ) : (
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
        )}

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

        {/* Edge fades — content dissolves at the top/bottom while scrolling */}
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 }} />
        <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 36 }} />
      </View>

      {/* Floating cart bar — glass, matching the cart/checkout screens */}
      {totalQty > 0 ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 18 }}>
          <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
            <GlassView glassEffectStyle="regular" colorScheme="light" style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
              <Pressable onPress={openCart} className="active:opacity-80" style={{ flex: 1, height: 50, borderRadius: 999, overflow: "hidden" }}>
                <LinearGradient colors={["#0b3d2e", "#1a7a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 }}>
                  <View style={{ minWidth: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{totalQty}</Text>
                  </View>
                  <Text style={{ flex: 1, color: "#fff", fontWeight: "800", fontSize: 15 }}>ดูตะกร้า</Text>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{baht(totalPrice)}</Text>
                </LinearGradient>
              </Pressable>
            </GlassView>
          </View>
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
