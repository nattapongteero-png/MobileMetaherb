/**
 * METAHERB Café — checkout / payment page.
 * Order summary (lines + total) + stamp card + payment method,
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
import { CreditCard, Gift } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { OfferRow, SummaryRow } from "../components/CheckoutRows";
import { MemberCard } from "./CafeMembersScreen";
import type { RootStackParamList } from "../navigation/RootStack";
import { useCafeCart } from "../context/CafeCartContext";
import { cafePayMethod, buildCafeOrder } from "../data/cafePayment";
import { orderPrepMinutes } from "../data/cafeAdminMenu";
import { useStore } from "../store/db";
import { sessionStore } from "../store/session";
import { cafeMemberStore, cafePointRule, memberForUser, usablePoints } from "../store/cafeMembers";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, GLASS_BAR_TINT } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const baht = (n: number) => "฿" + n.toLocaleString();

/**
 * The café takes orders only from inside the shop's radius, so every order is
 * collected at the counter — there is nothing to choose. It is still stated on
 * the bill, because the customer has to know where the cup is waiting.
 */
const RECEIVE_LABEL = "รับที่ร้าน";

export function CafeCheckoutScreen() {
  const nav = useNavigation<Nav>();
  const { lines, totalQty, totalPrice, payMethod, placeOrder } = useCafeCart();
  // Café accepts only PromptPay + cash (its own state / picker sheet), unlike the
  // product checkout. Same UX shape though — a selected-method card + "เปลี่ยน".
  const method = cafePayMethod(payMethod);
  const openPaymentSheet = () => nav.navigate("CafePaymentMethod");

  const placing = useRef(false); // guards against a double-tap placing two orders

  // The stamp card, read the same way the card screen reads it: by the phone on
  // the session. The counter has had this on every bill; the app earned points
  // silently and could not spend them at all, so a customer with a full card had
  // to pay in the app and then walk in to claim the cup separately.
  const memberState = useStore(cafeMemberStore);
  const pointRule = cafePointRule(memberState);
  const member = memberForUser(useStore(sessionStore).user, memberState);
  const memberPoints = member ? usablePoints(member, pointRule) : 0;
  const canUsePoints = member != null && pointRule.enabled && memberPoints >= pointRule.redeemAt;
  const [redeeming, setRedeeming] = useState(false);
  /** The dearest cup within the cap — the same rule the POS applies. */
  const redeemValue = lines.reduce(
    (best, l) => (l.unitPrice > 0 && l.unitPrice <= pointRule.maxRedeemPrice ? Math.max(best, l.unitPrice) : best),
    0,
  );
  const discount = redeeming && canUsePoints && redeemValue > 0 ? redeemValue : 0;

  const grand = Math.max(0, totalPrice - discount);

  const pay = () => {
    const orderId = `CAFE${Date.now().toString().slice(-8)}`;
    // Snapshot the lines now — the cart is cleared before the success screen shows.
    const items = lines.map((l) => ({ name: l.name, qty: l.qty, summary: l.summary, total: l.unitPrice * l.qty }));
    // What the bar has to make, from the menu's เวลาทำต่อแก้ว — the pickup time
    // the customer is about to be told is computed from this.
    const prepMinutes = orderPrepMinutes(lines);
    // PromptPay confirms payment on the QR screen (which then places the order);
    // cash is settled at the counter, so place it straight away.
    // The redemption rides with the bill, exactly as the POS records it: the
    // lines stay at full price and the card's contribution is its own figure.
    const redeem = discount > 0 ? { redeemDiscount: discount, redeemPoints: pointRule.redeemAt } : undefined;
    if (payMethod === "promptpay") {
      nav.navigate("PromptPayQR", { total: grand, orderId, cafe: true, receiveLabel: RECEIVE_LABEL, cafeItems: items, cafePrep: prepMinutes, cafeRedeem: redeem });
      return;
    }
    if (placing.current) return;
    placing.current = true;
    placeOrder({ ...buildCafeOrder({ orderId, total: grand, payLabel: method.label, receiveLabel: RECEIVE_LABEL, items, prepMinutes }), ...redeem });
    nav.reset({ index: 2, routes: [{ name: "Main" }, { name: "Cafe" }, { name: "CafeSuccess", params: { orderId } }] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="ชำระเงิน" subtitle="METAHERB Café" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

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

        {/* สมาชิก & แต้ม — the same block the POS bill carries. A member sees
            where this order leaves the card; someone who has not joined gets one
            line offering it, because signing up is now a thing they can do
            themselves and this order would otherwise earn nothing. */}
        {member ? (
          <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Gift size={18} color={BRAND_GREEN} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY, lineHeight: 20 }}>บัตรสะสมแต้ม</Text>
            </View>
            {/* The same card the till shows, so the customer and the cashier
                are looking at one thing: the ring lands where this order leaves
                it, the grey pill is what it started from, the green one is what
                the order adds. */}
            <View style={{ marginTop: 6 }}>
              <MemberCard
                member={member}
                points={memberPoints}
                redeemAt={pointRule.redeemAt}
                pending={discount > 0 || !pointRule.enabled ? 0 : pointRule.earnPerVisit}
                freeCup={discount > 0}
                filled
                onPress={() => nav.navigate("CafeStampCard")}
              />
            </View>
            {canUsePoints && redeemValue > 0 ? (
              <OfferRow
                label="ใช้แต้มแลกฟรี 1 แก้ว"
                desc={`ตัด ${pointRule.redeemAt} แต้ม · ลดให้ ${baht(redeemValue)}`}
                active={redeeming}
                onPress={() => setRedeeming((v) => !v)}
              />
            ) : canUsePoints ? (
              <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 8 }}>
                แต้มครบแลกได้แล้ว — แลกได้กับเมนูราคาไม่เกิน {baht(pointRule.maxRedeemPrice)}
              </Text>
            ) : null}
          </View>
        ) : (
          <Pressable
            onPress={() => nav.navigate("CafeStampCard")}
            className="bg-white flex-row items-center active:opacity-90"
            style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8, gap: 10 }}
          >
            <Gift size={18} color={BRAND_GREEN} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY, lineHeight: 20 }}>สมัครสมาชิกสะสมแต้ม</Text>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>
                ซื้อครบ {pointRule.redeemAt} ครั้ง แลกเครื่องดื่มฟรี 1 แก้ว
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: BRAND_GREEN_DARK }}>สมัคร</Text>
          </Pressable>
        )}

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
                <Image source={method.image} style={{ width: "100%", height: "100%" }} resizeMode="cover"
          resizeMethod="resize" />
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
          <SummaryRow label={`ยอดสินค้า (${totalQty} รายการ)`} value={baht(totalPrice)} />
          <SummaryRow label="รับสินค้า" value={RECEIVE_LABEL} />
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


