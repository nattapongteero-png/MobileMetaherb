/**
 * META Caffe — cart / order review.
 * Lists customised café cart lines (image · name · options summary · price),
 * with per-line quantity stepper + remove, a clear-all header action, and a
 * sticky total + checkout bar. Checkout is a mockup (confirms then clears).
 */
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Minus, Trash2, ShoppingBag } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import type { RootStackParamList } from "../navigation/RootStack";
import { useCafeCart } from "../context/CafeCartContext";
import { CAFE_MENU } from "../data/cafeMenu";
import { BRAND_GREEN, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const baht = (n: number) => "฿" + n.toLocaleString();

export function CafeCartScreen() {
  const nav = useNavigation<Nav>();
  const { lines, incKey, decKey, removeKey, totalQty, totalPrice } = useCafeCart();
  const empty = lines.length === 0;

  const editLine = (l: (typeof lines)[number]) => {
    const item = CAFE_MENU.find((m) => m.id === l.itemId);
    if (!item) return;
    nav.navigate("CafeItemDetail", {
      item,
      editKey: l.key,
      initial: { sweet: l.opts?.sweet ?? 2, milk: l.opts?.milk ?? 0, shot: l.opts?.shot ?? 0, note: l.opts?.note ?? "", qty: l.qty },
    });
  };

  const checkout = () => nav.navigate("CafeCheckout");

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="ตะกร้า"
        subtitle="META Caffe"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      {empty ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
            <ShoppingBag size={36} color={BRAND_GREEN} strokeWidth={1.8} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_PRIMARY }}>ตะกร้ายังว่างอยู่</Text>
          <Text style={{ fontSize: 13, color: TEXT_SECONDARY, textAlign: "center", lineHeight: 19 }}>เลือกเมนูกาแฟ ชา ขนม ที่ชอบ แล้วกลับมาสั่งได้เลยครับ</Text>
          <Pressable onPress={() => nav.canGoBack() && nav.goBack()} className="active:opacity-90" style={{ marginTop: 4, borderRadius: 999, overflow: "hidden" }}>
            <LinearGradient colors={["#0b3d2e", "#1a7a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 50, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>เลือกเมนู</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
          {lines.map((l) => (
            <Pressable key={l.key} onPress={() => editLine(l)} className="active:opacity-80" style={{ flexDirection: "row", gap: 12, backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
              <Image source={l.image} style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: "#f5f5f5" }} resizeMode="cover" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY }}>{l.name}</Text>
                  <Pressable onPress={() => removeKey(l.key)} hitSlop={8} className="active:opacity-60">
                    <Trash2 size={16} color="#9ca3af" strokeWidth={2.2} />
                  </Pressable>
                </View>
                {l.summary ? <Text numberOfLines={2} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2, lineHeight: 16 }}>{l.summary}</Text> : null}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: BRAND_GREEN }}>{baht(l.unitPrice * l.qty)}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                    <Pressable onPress={() => decKey(l.key)} hitSlop={6} className="active:opacity-70" style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                      <Minus size={15} color={BRAND_GREEN} strokeWidth={2.6} />
                    </Pressable>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: TEXT_PRIMARY, minWidth: 16, textAlign: "center" }}>{l.qty}</Text>
                    <Pressable onPress={() => incKey(l.key)} hitSlop={6} className="active:opacity-80" style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                      <Plus size={15} color="#fff" strokeWidth={2.6} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        {/* Fade — list dissolves under the header while scrolling up */}
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 }} />
        </View>
      )}

      {/* Floating total + checkout bar */}
      {!empty ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 18 }}>
          <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
            <GlassView glassEffectStyle="regular" colorScheme="light" style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
              <Pressable onPress={checkout} className="active:opacity-80" style={{ flex: 1, height: 50, borderRadius: 999, overflow: "hidden" }}>
                <LinearGradient colors={["#0b3d2e", "#1a7a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 }}>
                  <View style={{ minWidth: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{totalQty}</Text>
                  </View>
                  <Text style={{ flex: 1, color: "#fff", fontWeight: "800", fontSize: 15 }}>สั่งซื้อ</Text>
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
