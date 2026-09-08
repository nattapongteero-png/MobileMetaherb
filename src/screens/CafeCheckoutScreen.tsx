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
import { CreditCard, Gift, Store, Bike } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { ChoiceRow, OfferRow, SummaryRow } from "../components/CheckoutRows";
import type { RootStackParamList } from "../navigation/RootStack";
import { useCafeCart } from "../context/CafeCartContext";
import { cafePayMethod, buildCafeOrder, CAFE_PAY_METHODS } from "../data/cafePayment";
import { useStore } from "../store/db";
import { sessionStore } from "../store/session";
import { cafeMemberStore, cafePointRule, memberByPhone, usablePoints } from "../store/cafeMembers";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, GLASS_BAR_TINT } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const baht = (n: number) => "฿" + n.toLocaleString();

const RECEIVE = [
  { id: "pickup", label: "รับที่ร้าน", desc: "รับเองที่เคาน์เตอร์", Icon: Store, fee: 0 },
  { id: "delivery", label: "จัดส่ง", desc: "ส่งถึงที่ · ค่าส่ง ฿20", Icon: Bike, fee: 20 },
];

export function CafeCheckoutScreen() {
  const nav = useNavigation<Nav>();
  const { lines, totalQty, totalPrice, payMethod, setPayMethod, placeOrder } = useCafeCart();
  // Café accepts only PromptPay + cash (its own state / picker sheet), unlike the
  // product checkout. Same UX shape though — a selected-method card + "เปลี่ยน".
  const method = cafePayMethod(payMethod);

  const [receive, setReceive] = useState(0);
  const placing = useRef(false); // guards against a double-tap placing two orders

  // The stamp card, read the same way the card screen reads it: by the phone on
  // the session. The counter has had this on every bill; the app earned points
  // silently and could not spend them at all, so a customer with a full card had
  // to pay in the app and then walk in to claim the cup separately.
  const memberState = useStore(cafeMemberStore);
  const pointRule = cafePointRule(memberState);
  const phone = useStore(sessionStore).user?.phone ?? "";
  const member = phone ? memberByPhone(phone, memberState) : undefined;
  const memberPoints = member ? usablePoints(member, pointRule) : 0;
  const canUsePoints = member != null && pointRule.enabled && memberPoints >= pointRule.redeemAt;
  const [redeeming, setRedeeming] = useState(false);
  /** The dearest cup within the cap — the same rule the POS applies. */
  const redeemValue = lines.reduce(
    (best, l) => (l.unitPrice > 0 && l.unitPrice <= pointRule.maxRedeemPrice ? Math.max(best, l.unitPrice) : best),
    0,
  );
  const discount = redeeming && canUsePoints && redeemValue > 0 ? redeemValue : 0;

  const shipping = RECEIVE[receive].fee;
  const grand = Math.max(0, totalPrice + shipping - discount);

  const pay = () => {
    const orderId = `CAFE${Date.now().toString().slice(-8)}`;
    const receiveLabel = RECEIVE[receive].label;
    // Snapshot the lines now — the cart is cleared before the success screen shows.
    const items = lines.map((l) => ({ name: l.name, qty: l.qty, summary: l.summary, total: l.unitPrice * l.qty }));
    // PromptPay confirms payment on the QR screen (which then places the order);
    // cash is settled at the counter, so place it straight away.
    // The redemption rides with the bill, exactly as the POS records it: the
    // lines stay at full price and the card's contribution is its own figure.
    const redeem = discount > 0 ? { redeemDiscount: discount, redeemPoints: pointRule.redeemAt } : undefined;
    if (payMethod === "promptpay") {
      nav.navigate("PromptPayQR", { total: grand, orderId, cafe: true, receiveLabel, cafeItems: items, cafeRedeem: redeem });
      return;
    }
    if (placing.current) return;
    placing.current = true;
    placeOrder({ ...buildCafeOrder({ orderId, total: grand, payLabel: method.label, receiveLabel, items }), ...redeem });
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
                <Image source={l.image} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#f5f5f5" }} resizeMode="cover"
          resizeMethod="resize" />
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
            <ChoiceRow key={r.id} Icon={r.Icon} label={r.label} desc={r.desc} active={receive === i} divider={i > 0} onPress={() => setReceive(i)} />
          ))}
        </View>

        {/* สมาชิก & แต้ม — the same block the POS bill carries. Shown only to a
            member: a stamp card is not something to advertise mid-checkout to
            someone who has not joined, and joining still happens at the counter. */}
        {member ? (
          <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Gift size={18} color={BRAND_GREEN} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY, lineHeight: 20 }}>บัตรสะสมแต้ม</Text>
            </View>
            <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>
              มี {memberPoints} แต้ม · บิลนี้ได้อีก {pointRule.earnPerVisit} แต้ม
            </Text>
            {canUsePoints && redeemValue > 0 ? (
              <OfferRow
                Icon={Gift}
                label="ใช้แต้มแลกฟรี 1 แก้ว"
                desc={`ตัด ${pointRule.redeemAt} แต้ม · ลดให้ ${baht(redeemValue)}`}
                active={redeeming}
                divider
                onPress={() => setRedeeming((v) => !v)}
              />
            ) : canUsePoints ? (
              <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 8 }}>
                แต้มครบแลกได้แล้ว — แลกได้กับเมนูราคาไม่เกิน {baht(pointRule.maxRedeemPrice)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* วิธีชำระเงิน — the choices themselves, as the POS shows them. It used
            to be a card plus a "เปลี่ยน" that opened a screen of its own, which
            is a whole extra step for a list of two. */}
        <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <CreditCard size={18} color={BRAND_GREEN} />
            <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY, lineHeight: 20 }}>วิธีชำระเงิน</Text>
          </View>
          {CAFE_PAY_METHODS.map((m, i) => (
            <ChoiceRow
              key={m.id}
              Icon={m.Icon}
              image={m.image}
              label={m.label}
              desc={m.desc}
              active={payMethod === m.id}
              divider={i > 0}
              onPress={() => setPayMethod(m.id)}
            />
          ))}
        </View>

        {/* Totals */}
        <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8, gap: 8 }}>
          <SummaryRow label={`ยอดสินค้า (${totalQty} รายการ)`} value={baht(totalPrice)} />
          <SummaryRow label="ค่าจัดส่ง" value={shipping ? baht(shipping) : "ฟรี"} />
          {discount > 0 ? (
            <SummaryRow label={`แลกฟรี 1 แก้ว · ใช้ ${pointRule.redeemAt} แต้ม`} value={`−${baht(discount)}`} tint={BRAND_GREEN} />
          ) : null}
          <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 2 }} />
          <SummaryRow label="ยอดชำระทั้งหมด" value={baht(grand)} strong />
        </View>
      </ScrollView>
        {/* Edge fades while scrolling */}
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 }} />
        <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 36 }} />
      </View>

      {/* Floating pay bar */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 18 }}>
        <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
          <GlassView glassEffectStyle="regular" colorScheme="light" tintColor={GLASS_BAR_TINT} style={{ height: 68, borderRadius: 34, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
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


