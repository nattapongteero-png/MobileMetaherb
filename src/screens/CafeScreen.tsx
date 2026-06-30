/**
 * META Caffe (GREEN BREW COFFEE) — in-app café home page.
 * Green premium hero + category chips + per-category menu sections with a
 * quantity stepper, and a floating cart bar. Ordering itself is a mockup
 * (the cart bar shows a "coming soon" alert).
 */
import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Minus, Flame } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import type { RootStackParamList } from "../navigation/RootStack";
import { CAFE_CATEGORIES, CAFE_MENU, type CafeItem } from "../data/cafeMenu";
import { BRAND_GREEN, TEXT_PRIMARY, TEXT_MUTED } from "../theme/tokens";

const CAFE_IMG = require("../../assets/caffe.png");
type Nav = NativeStackNavigationProp<RootStackParamList>;
const baht = (n: number) => "฿" + n.toLocaleString();

const ALL = { id: "all" as const, label: "ทั้งหมด", emoji: "🍽️" };

export function CafeScreen() {
  const nav = useNavigation<Nav>();
  const [cat, setCat] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, number>>({});

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const remove = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const totalQty = Object.values(cart).reduce((s, n) => s + n, 0);
  const totalPrice = useMemo(() => CAFE_MENU.reduce((s, it) => s + (cart[it.id] ?? 0) * it.price, 0), [cart]);
  const cats = cat === "all" ? CAFE_CATEGORIES : CAFE_CATEGORIES.filter((c) => c.id === cat);

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="META Caffe"
        subtitle="GREEN BREW COFFEE"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: totalQty > 0 ? 120 : 28 }}>
        {/* Hero */}
        <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 }}>
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

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 14 }}>
          {[ALL, ...CAFE_CATEGORIES].map((c) => {
            const active = cat === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCat(c.id)}
                className="active:opacity-80"
                style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: active ? BRAND_GREEN : "#fff", borderWidth: active ? 0 : 1, borderColor: "#e5e7eb" }}
              >
                <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
                <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "#fff" : "#374151" }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Menu sections */}
        {cats.map((c) => {
          const items = CAFE_MENU.filter((it) => it.category === c.id);
          if (!items.length) return null;
          return (
            <View key={c.id} style={{ paddingHorizontal: 16, marginBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_PRIMARY, marginBottom: 10 }}>
                {c.emoji}  {c.label}
              </Text>
              <View style={{ gap: 10 }}>
                {items.map((it) => (
                  <CafeRow key={it.id} it={it} accent={c.accent} qty={cart[it.id] ?? 0} onAdd={() => add(it.id)} onRemove={() => remove(it.id)} />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Floating cart bar */}
      {totalQty > 0 ? (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 24 }}>
          <Pressable
            onPress={() => Alert.alert("META Caffe", "ระบบสั่งซื้อคาเฟ่กำลังพัฒนา เปิดให้บริการเร็ว ๆ นี้ครับ")}
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

function CafeRow({ it, accent, qty, onAdd, onRemove }: { it: CafeItem; accent: string; qty: number; onAdd: () => void; onRemove: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f0f0f0", padding: 12 }}>
      <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: accent + "1a", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 26 }}>{it.emoji}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY, flexShrink: 1 }}>{it.name}</Text>
          {it.popular ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#fff7ed", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Flame size={10} color="#ea580c" strokeWidth={2.4} />
              <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#ea580c" }}>ฮิต</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>{it.desc}</Text>
        <Text style={{ fontSize: 13.5, fontWeight: "800", color: BRAND_GREEN, marginTop: 3 }}>{baht(it.price)}</Text>
      </View>
      {qty > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={onRemove} hitSlop={6} className="active:opacity-70" style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
            <Minus size={16} color={BRAND_GREEN} strokeWidth={2.6} />
          </Pressable>
          <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_PRIMARY, minWidth: 16, textAlign: "center" }}>{qty}</Text>
          <Pressable onPress={onAdd} hitSlop={6} className="active:opacity-80" style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
            <Plus size={16} color="#fff" strokeWidth={2.6} />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={onAdd} hitSlop={6} className="active:opacity-80" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
          <Plus size={18} color="#fff" strokeWidth={2.6} />
        </Pressable>
      )}
    </View>
  );
}
