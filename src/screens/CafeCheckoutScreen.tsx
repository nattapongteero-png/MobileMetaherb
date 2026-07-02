/**
 * META Caffe — checkout / payment page.
 * Order summary (lines + total) + pickup vs delivery + payment method radios,
 * with a floating glass "ยืนยันชำระเงิน" bar. Payment is a mockup (confirms,
 * clears the cart, returns to the café).
 */
import { useState, useRef } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CreditCard, Store, Bike, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import type { RootStackParamList } from "../navigation/RootStack";
import { useCafeCart } from "../context/CafeCartContext";
import { cafePayMethod, buildCafeOrder } from "../data/cafePayment";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const baht = (n: number) => "฿" + n.toLocaleString();

const RECEIVE = [
  { id: "pickup", label: "รับที่ร้าน", desc: "รับเองที่เคาน์เตอร์", Icon: Store, fee: 0 },
  { id: "delivery", label: "จัดส่ง", desc: "ส่งถึงที่ · ค่าส่ง ฿20", Icon: Bike, fee: 20 },
];

export function CafeCheckoutScreen() {
  const nav = useNavigation<Nav>();
  const { lines, totalQty, totalPrice, payMethod, placeOrder } = useCafeCart();
  // Café accepts only PromptPay + cash (its own state / picker sheet), unlike the
  // product checkout. Same UX shape though — a selected-method card + "เปลี่ยน".
  const method = cafePayMethod(payMethod);
  const openPaymentSheet = () => nav.navigate("CafePaymentMethod");

  const [receive, setReceive] = useState(0);
  const placing = useRef(false); // guards against a double-tap placing two orders

  const shipping = RECEIVE[receive].fee;
  const grand = totalPrice + shipping;

  const pay = () => {
    const orderId = `CAFE${Date.now().toString().slice(-8)}`;
    const receiveLabel = RECEIVE[receive].label;
    // Snapshot the lines now — the cart is cleared before the success screen shows.
    const items = lines.map((l) => ({ name: l.name, qty: l.qty, summary: l.summary, total: l.unitPrice * l.qty }));
    // PromptPay confirms payment on the QR screen (which then places the order);
    // cash is settled at the counter, so place it straight away.
    if (payMethod === "promptpay") {
      nav.navigate("PromptPayQR", { total: grand, orderId, cafe: true, receiveLabel, cafeItems: items });
      return;
    }
    if (placing.current) return;
    placing.current = true;
    placeOrder(buildCafeOrder({ orderId, total: grand, payLabel: method.label, receiveLabel, items }));
    nav.reset({ index: 2, routes: [{ name: "Main" }, { name: "Cafe" }, { name: "CafeSuccess", params: { orderId } }] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="ชำระเงิน" subtitle="META Caffe" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: 130 }}>
        {/* Order summary */}
        <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_PRIMARY, marginBottom: 12 }}>สรุปคำสั่งซื้อ</Text>
          <View style={{ gap: 12 }}>
            {lines.map((l) => (
              <View key={l.key} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Image source={l.image} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#f5f5f5" }} resizeMode="cover" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "600", color: TEXT_PRIMARY }}>{l.name} ×{l.qty}</Text>
                  {l.summary ? <Text numberOfLines={1} style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{l.summary}</Text> : null}
                </View>
                <Text style={{ fontSize: 13.5, fontWeight: "700", color: TEXT_PRIMARY }}>{baht(l.unitPrice * l.qty)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Receive method */}
        <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_PRIMARY, marginBottom: 6 }}>รับสินค้า</Text>
          {RECEIVE.map((r, i) => (
            <Row key={r.id} Icon={r.Icon} label={r.label} desc={r.desc} active={receive === i} onPress={() => setReceive(i)} />
          ))}
        </View>

        {/* Payment method — selected card + "เปลี่ยน" → shared PaymentMethod sheet (matches product) */}
        <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <CreditCard size={18} color={BRAND_GREEN} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY, lineHeight: 20 }}>วิธีชำระเงิน</Text>
            </View>
            <Pressable hitSlop={6} onPress={openPaymentSheet} className="active:opacity-60">
              <Text style={{ fontSize: 13, color: BRAND_GREEN_DARK, lineHeight: 18 }}>เปลี่ยน</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={openPaymentSheet}
            className="flex-row items-center active:opacity-90"
            style={{ backgroundColor: "#f9fafb", borderRadius: 24, paddingHorizontal: 14, paddingVertical: 12, gap: 12 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {method.image ? (
                <Image source={method.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : method.Icon ? (
                <method.Icon size={22} color={BRAND_GREEN} />
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: TEXT_PRIMARY, lineHeight: 18 }}>{method.label}</Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 14 }}>{method.desc}</Text>
            </View>
          </Pressable>
        </View>

        {/* Totals */}
        <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8, gap: 8 }}>
          <KV label={`ยอดสินค้า (${totalQty} รายการ)`} value={baht(totalPrice)} />
          <KV label="ค่าจัดส่ง" value={shipping ? baht(shipping) : "ฟรี"} />
          <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 2 }} />
          <KV label="ยอดชำระทั้งหมด" value={baht(grand)} strong />
        </View>
      </ScrollView>
        {/* Edge fades while scrolling */}
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 }} />
        <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 36 }} />
      </View>

      {/* Floating pay bar */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 18 }}>
        <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
          <GlassView glassEffectStyle="regular" colorScheme="light" style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
            <Pressable onPress={pay} className="active:opacity-80" style={{ flex: 1, height: 50, borderRadius: 999, overflow: "hidden" }}>
              <LinearGradient colors={["#0b3d2e", "#1a7a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 }}>
                <View style={{ minWidth: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{totalQty}</Text>
                </View>
                <Text style={{ flex: 1, color: "#fff", fontWeight: "800", fontSize: 15 }}>ยืนยันชำระเงิน</Text>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{baht(grand)}</Text>
              </LinearGradient>
            </Pressable>
          </GlassView>
        </View>
      </View>
    </View>
  );
}

function Row({ Icon, label, desc, active, onPress }: { Icon: LucideIcon; label: string; desc: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-90"
      style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10, backgroundColor: active ? "rgba(49,151,84,0.06)" : "#f9fafb", borderRadius: 16, borderWidth: 1, borderColor: active ? BRAND_GREEN : "#f0f0f0", paddingHorizontal: 14, paddingVertical: 12 }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
        <Icon size={22} color={BRAND_GREEN} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#0a0a0a" }}>{label}</Text>
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>{desc}</Text>
      </View>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: active ? BRAND_GREEN : "#cbd5d1", alignItems: "center", justifyContent: "center" }}>
        {active ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND_GREEN }} /> : null}
      </View>
    </Pressable>
  );
}

function KV({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ fontSize: strong ? 14.5 : 13, color: strong ? TEXT_PRIMARY : TEXT_SECONDARY, fontWeight: strong ? "800" : "400" }}>{label}</Text>
      <Text style={{ fontSize: strong ? 18 : 13.5, fontWeight: strong ? "800" : "600", color: strong ? BRAND_GREEN : TEXT_PRIMARY }}>{value}</Text>
    </View>
  );
}
