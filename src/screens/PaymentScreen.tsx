import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { PAYMENT_METHODS, BANK_APPS } from "../data/paymentMethods";
import { SAVED_CARDS } from "../data/savedCards";
import { bankByCode, bankLogo, maskAccountNo } from "../data/bankAccounts";
import { CardBrandIcon } from "../components/CardBrandIcon";
import { maskPhone } from "./TrueMoneyLinkScreen";
import { usePayment } from "../context/PaymentContext";
import { useRefund } from "../context/RefundContext";
import { useSecurity } from "../context/SecurityContext";
import { SHIPPING_METHODS } from "../data/shippingMethods";
import { useCheckoutCoupons, couponDiscount } from "../data/checkoutCoupons";
import { useCart, type CartItem } from "../context/CartContext";
import { createOrder, markPaid } from "../store/orders";
import { currentUserId } from "../store/session";
import { redeemCoupon } from "../store/coupons";
import { SubPageHeader } from "../components/SubPageHeader";
import { BottomFade } from "../components/BottomFade";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Coins,
  CreditCard,
  Landmark,
  MapPin,
  ShieldCheck,
  Store,
  Tag,
  Truck,
  Zap,
} from "lucide-react-native";
import type { RootStackParamList } from "../navigation/RootStack";
import { appWidth } from "../theme/layout";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH =
  appWidth();

// Mock order data — same shape as the web PaymentPage flow.
// MetaHerb Coin — mock wallet balance + conversion (1,000 coins = ฿1).
const COIN_BALANCE = 12500;
const COINS_PER_BAHT = 1000;
const COIN_AMBER = "#f59e0b";

/** Group digits with commas, e.g. 12500 → "12,500". */
const groupNum = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function PaymentScreen() {
  const nav = useNavigation<Nav>();
  const { requirePin } = useSecurity();
  const insets = useSafeAreaInsets();
  // Payment selection lives in context so it survives the picker + TrueMoney
  // link modals without passing callbacks/params across the stack.
  const {
    selectedPayment,
    trueMoneyPhone,
    selectedShipping,
    selectedCouponId,
    coinsUsed,
    setCoinsUsed,
    addresses,
    selectedAddressId,
  } = usePayment();
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? addresses[0];
  const { accounts } = useRefund();

  // The lines the buyer ticked in the cart. Falls back to the whole in-stock
  // cart when Payment is opened directly (deep link / back-navigation).
  const { items: cartItems, checkoutItems, finishCheckout } = useCart();
  const ITEMS: CartItem[] = checkoutItems.length ? checkoutItems : cartItems.filter((i) => i.inStock);

  const selectedShippingMethod =
    SHIPPING_METHODS.find((s) => s.id === selectedShipping) ?? SHIPPING_METHODS[0];

  // Pricing math
  const walletCoupons = useCheckoutCoupons();
  const selectedCoupon = walletCoupons.find((c) => c.id === selectedCouponId) ?? null;
  const subtotal = ITEMS.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = couponDiscount(selectedCoupon, subtotal);
  const vat = Math.round((subtotal - discount) * 0.07);
  // A free-shipping coupon waives the carrier fee.
  const freeShip = selectedCoupon?.type === "freeship";
  const shipping = freeShip ? 0 : selectedShippingMethod.price;
  // MetaHerb Coin discount (1,000 coins = ฿1).
  const coinDiscount = Math.floor(coinsUsed / COINS_PER_BAHT);
  const grandTotal = subtotal - discount + vat + shipping - coinDiscount;
  const selectedMethod =
    PAYMENT_METHODS.find((m) => m.id === selectedPayment) ??
    BANK_APPS.find((a) => a.id === selectedPayment);
  const selectedCard = SAVED_CARDS.find((c) => c.id === selectedPayment);
  // A bank-transfer selection is one of the user's OWN linked bank accounts.
  const selectedBankAcc = accounts.find((a) => a.id === selectedPayment);
  const selLabel = selectedBankAcc
    ? bankByCode(selectedBankAcc.bankCode).name
    : selectedCard
    ? selectedCard.name
    : selectedMethod?.label;
  const selDesc = selectedBankAcc
    ? `โอนผ่านธนาคาร • บัญชี ${maskAccountNo(selectedBankAcc.accountNo)}`
    : selectedCard
    ? `บัตรเครดิต/เดบิต •••• ${selectedCard.last4}`
    : selectedPayment === "truemoney" && trueMoneyPhone
    ? `ผูกบัญชีแล้ว • ${maskPhone(trueMoneyPhone)}`
    : selectedMethod?.desc;
  const openAddressSheet = () => nav.navigate("AddressSelect");
  const openPaymentSheet = () => nav.navigate("PaymentMethod");
  const openShippingSheet = () => nav.navigate("ShippingMethod");
  const openCouponSheet = () => nav.navigate("CouponSelect");

  // Card / bank payments must be confirmed with the security PIN (if set) —
  // including transfers from a linked bank account.
  const needsPin =
    !!selectedCard || !!selectedBankAcc || !!BANK_APPS.find((a) => a.id === selectedPayment);

  const placeOrder = async () => {
    if (ITEMS.length === 0) {
      Alert.alert("ตะกร้าว่าง", "กรุณาเลือกสินค้าก่อนชำระเงิน");
      return;
    }
    if (needsPin) {
      const ok = await requirePin("ยืนยันรหัส PIN เพื่อชำระเงิน");
      if (!ok) return;
    }

    // One order per shop — the cart is supplier-grouped, and each seller sees
    // only their own order. Shipping/VAT/discount are split across shops in
    // proportion to each one's subtotal so the order totals still sum to grandTotal.
    const byShop = new Map<string, CartItem[]>();
    for (const it of ITEMS) byShop.set(it.shop, [...(byShop.get(it.shop) ?? []), it]);
    const lineTotal = (ls: CartItem[]) => ls.reduce((s, i) => s + i.price * i.quantity, 0);

    const groups = [...byShop.entries()];
    const created: string[] = [];
    let allocated = 0;
    for (let g = 0; g < groups.length; g++) {
      const [shopName, lines] = groups[g];
      // Last group absorbs the rounding remainder.
      const share =
        g === groups.length - 1
          ? grandTotal - allocated
          : Math.round((lineTotal(lines) / subtotal) * grandTotal);
      allocated += share;

      const res = createOrder({
        userId: currentUserId(),
        shopName,
        items: lines.map((i) => ({
          productId: i.productId,
          name: i.name,
          option: i.option,
          quantity: i.quantity,
          price: i.price,
          image: i.image,
        })),
        recipient: {
          name: selectedAddress.name,
          phone: selectedAddress.phone,
          address: `${selectedAddress.detail} ${selectedAddress.area}`.trim(),
        },
        total: share,
        shippingMethod: selectedShippingMethod.name,
        paymentMethod: selLabel ?? "",
      });

      if (!res.ok) {
        const names = res.shortfall
          .map((sf) => lines.find((l) => l.productId === sf.productId)?.name ?? sf.productId)
          .join(", ");
        Alert.alert("สินค้าไม่พอ", `${names} มีไม่พอในสต็อก กรุณาลดจำนวนแล้วลองใหม่`);
        return;
      }
      created.push(res.order.id);
    }

    // Spend the coupon: bumps its usage counter (visible in the shop console)
    // and marks it used in the buyer's wallet.
    if (selectedCoupon) redeemCoupon(currentUserId(), selectedCoupon.id);
    finishCheckout(); // the ordered lines leave the cart
    const orderId = created[0];

    // PromptPay → show a QR; the order stays "รอชำระเงิน" until the buyer confirms.
    if (selectedPayment === "promptpay") {
      nav.navigate("PromptPayQR", { total: grandTotal, orderId, orderIds: created });
    } else {
      // Card / wallet / bank-app: the charge went through, so the shop must verify.
      created.forEach((id) => markPaid(id));
      nav.navigate("PaymentSuccess", {
        orderId,
        total: grandTotal,
        methodLabel: selLabel ?? "",
        methodDesc: selDesc ?? "",
      });
    }
  };
  // Coupon badge icon + colour follow the coupon type.
  const CouponTypeIcon = selectedCoupon
    ? selectedCoupon.type === "freeship"
      ? Truck
      : selectedCoupon.shop
      ? Store
      : Tag
    : Tag;
  const couponIconColor = selectedCoupon?.type === "freeship" ? "#00bfa5" : "#319754";

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader
        title="ชำระเงิน"
        subtitle="ตรวจสอบและยืนยันคำสั่งซื้อ"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        {/* Address section — whole card tappable to change (Jakob's Law) */}
        <Section title="ที่อยู่จัดส่ง" Icon={MapPin} rightLabel="เปลี่ยน" onRightPress={openAddressSheet}>
          <Pressable
            onPress={openAddressSheet}
            className="active:opacity-90"
            style={{
              backgroundColor: "rgba(242,242,247,0.6)",
              borderRadius: 24,
              padding: 14,
              gap: 10,
            }}
          >
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#0a0a0a",
                  lineHeight: 20,
                  flexShrink: 1,
                }}
              >
                {selectedAddress.name}
              </Text>
              {selectedAddress.isDefault ? (
                <View
                  style={{
                    backgroundColor: "#08f",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 10,
                      fontWeight: "700",
                      lineHeight: 13,
                    }}
                  >
                    ค่าเริ่มต้น
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={{ height: 1, backgroundColor: "#d4d4d8" }} />
            <View>
              <Text style={{ fontSize: 14, color: "#0a0a0a", lineHeight: 19 }}>
                {selectedAddress.phone}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#525252",
                  lineHeight: 19,
                  marginTop: 4,
                }}
              >
                {selectedAddress.detail}
                {"\n"}
                {selectedAddress.area}
              </Text>
            </View>
          </Pressable>
        </Section>

        {/* Items list */}
        <Section title="รายการสินค้า">
          <View style={{ gap: 14 }}>
            {ITEMS.map((item) => (
              <View key={item.id} className="flex-row" style={{ gap: 12 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 10,
                    overflow: "hidden",
                    backgroundColor: "#f5f5f5",
                  }}
                >
                  <Image
                    source={item.image}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={2}
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: "#0a0a0a",
                      lineHeight: 18,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: TEXT_MUTED,
                      marginTop: 2,
                      lineHeight: 14,
                    }}
                  >
                    {item.option}
                  </Text>
                  <View
                    className="flex-row items-center justify-between"
                    style={{ marginTop: 6 }}
                  >
                    <View
                      style={{
                        backgroundColor: "#f2f2f7",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 9999,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: "#525252", lineHeight: 14 }}>
                        จำนวน {item.quantity} ชิ้น
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      {item.originalPrice ? (
                        <Text
                          style={{
                            fontSize: 11,
                            color: TEXT_MUTED,
                            textDecorationLine: "line-through",
                            lineHeight: 14,
                          }}
                        >
                          ฿{(item.originalPrice * item.quantity).toFixed(0)}
                        </Text>
                      ) : null}
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: "#0a0a0a",
                          lineHeight: 20,
                        }}
                      >
                        ฿{(item.price * item.quantity).toFixed(0)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Section>

        {/* Shipping method */}
        <Section title="วิธีจัดส่ง" Icon={Truck} rightLabel="เปลี่ยน" onRightPress={openShippingSheet}>
          <Pressable
            onPress={openShippingSheet}
            className="flex-row items-center justify-between active:opacity-70"
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 24,
              paddingHorizontal: 14,
              paddingVertical: 12,
              gap: 12,
            }}
          >
            <View className="flex-row items-center" style={{ gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  backgroundColor: "white",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selectedShippingMethod.image ? (
                  <Image source={selectedShippingMethod.image} style={{ width: 28, height: 28 }} resizeMode="contain" />
                ) : selectedShippingMethod.express ? (
                  <Zap size={20} color="#f59e0b" fill="#f59e0b" />
                ) : selectedShippingMethod.pickup ? (
                  <Store size={20} color="#319754" />
                ) : (
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#0a0a0a", lineHeight: 13 }}>
                    {selectedShippingMethod.code}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: "#0a0a0a", lineHeight: 18 }}>
                    {selectedShippingMethod.name}
                  </Text>
                  {selectedShippingMethod.express ? (
                    <View style={{ backgroundColor: "rgba(245,158,11,0.14)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#f59e0b" }}>ด่วน</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 14 }}>
                  {selectedShippingMethod.desc}
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: shipping === 0 ? BRAND_GREEN_DARK : "#0a0a0a",
                lineHeight: 18,
              }}
            >
              {shipping === 0 ? "ฟรี" : `฿${shipping}`}
            </Text>
          </Pressable>
        </Section>

        {/* Payment method — radio cards */}
        <Section
          title="ช่องทางชำระเงิน"
          Icon={CreditCard}
          rightLabel="เปลี่ยน"
          onRightPress={openPaymentSheet}
        >
          <Pressable
            onPress={openPaymentSheet}
            className="flex-row items-center active:opacity-90"
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 24,
              paddingHorizontal: 14,
              paddingVertical: 12,
              gap: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                backgroundColor: "white",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {selectedBankAcc ? (
                bankLogo(selectedBankAcc.bankCode) ? (
                  <Image source={bankLogo(selectedBankAcc.bankCode)!} style={{ width: 30, height: 30 }} resizeMode="contain" />
                ) : (
                  <Landmark size={22} color={bankByCode(selectedBankAcc.bankCode).color} />
                )
              ) : selectedCard ? (
                <CardBrandIcon brand={selectedCard.brand} size={30} />
              ) : selectedMethod?.image ? (
                <Image source={selectedMethod.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : selectedMethod?.Icon ? (
                <selectedMethod.Icon size={22} color="#319754" />
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#0a0a0a", lineHeight: 18 }}>
                {selLabel}
              </Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 14 }}>
                {selDesc}
              </Text>
            </View>
          </Pressable>
        </Section>

        {/* Coupon — opens bottom sheet on tap */}
        <Section
          title="คูปอง"
          Icon={Tag}
          rightLabel={selectedCoupon ? "เปลี่ยน" : "เลือก"}
          onRightPress={openCouponSheet}
        >
          <Pressable
            onPress={openCouponSheet}
            hitSlop={4}
            className="flex-row items-center active:opacity-80"
            style={{
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 24,
              backgroundColor: "#f9fafb",
              gap: 12,
            }}
          >
            {selectedCoupon ? (
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    backgroundColor: "white",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CouponTypeIcon size={22} color={couponIconColor} />
                </View>
                <Text style={{ fontSize: 14, color: "#0a0a0a" }}>{selectedCoupon.sublabel}</Text>
                {/* Spacer pushes the discount tag to the far right (like the shipping price). */}
                <View style={{ flex: 1 }} />
                <View
                  style={{
                    flexShrink: 1,
                    backgroundColor: "rgba(49,151,84,0.12)",
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 12, color: BRAND_GREEN_DARK, fontWeight: "600" }} numberOfLines={1}>
                    {selectedCoupon.title}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={{ flex: 1, fontSize: 14, color: "#525252", lineHeight: 18 }}>
                เลือกคูปองส่วนลด / ส่งฟรี ({walletCoupons.length} คูปองพร้อมใช้)
              </Text>
            )}
          </Pressable>
        </Section>

        {/* MetaHerb Coin — redeem coins as a discount */}
        <Section
          title="ใช้ MetaHerb Coin"
          Icon={Coins}
          rightSlot={
            <Text style={{ fontSize: 13, color: COIN_AMBER, fontWeight: "700", lineHeight: 18 }}>
              มีอยู่ {groupNum(COIN_BALANCE)} เหรียญ
            </Text>
          }
        >
          <View
            className="flex-row items-center"
            style={{ backgroundColor: "#f9fafb", borderRadius: 24, paddingLeft: 16, padding: 8, gap: 10 }}
          >
            <TextInput
              value={coinsUsed > 0 ? String(coinsUsed) : ""}
              onChangeText={(t) => {
                const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
                setCoinsUsed(Number.isNaN(n) ? 0 : Math.min(n, COIN_BALANCE));
              }}
              placeholder={`${groupNum(COINS_PER_BAHT)} เหรียญ = ฿1`}
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              style={{ flex: 1, fontSize: 14, color: "#0a0a0a", paddingVertical: 8 }}
            />
            <Pressable
              onPress={() => setCoinsUsed(coinsUsed >= COIN_BALANCE ? 0 : COIN_BALANCE)}
              className="active:opacity-80 items-center justify-center"
              style={{ backgroundColor: COIN_AMBER, borderRadius: 999, paddingHorizontal: 16, height: 36 }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "white" }}>
                {coinsUsed >= COIN_BALANCE ? "ยกเลิก" : "ใช้ทั้งหมด"}
              </Text>
            </Pressable>
          </View>
          {coinDiscount > 0 ? (
            <Text style={{ fontSize: 12, color: COIN_AMBER, marginTop: 8, marginLeft: 4 }}>
              ใช้ {groupNum(coinsUsed)} เหรียญ = ส่วนลด ฿{coinDiscount}
            </Text>
          ) : null}
        </Section>

        {/* Summary breakdown */}
        <Section title="สรุปคำสั่งซื้อ">
          {[
            [`ยอดสินค้า (${ITEMS.reduce((s, i) => s + i.quantity, 0)} ชิ้น)`, `฿${subtotal.toFixed(0)}`, "#0a0a0a"],
            ...(discount > 0 ? [["ส่วนลดคูปอง", `-฿${discount.toFixed(0)}`, "#319754"] as [string, string, string]] : []),
            ...(coinDiscount > 0 ? [["ใช้ MetaHerb Coin", `-฿${coinDiscount}`, "#319754"] as [string, string, string]] : []),
            ["VAT 7%", `฿${vat.toFixed(0)}`, "#0a0a0a"],
            ["ค่าจัดส่ง", shipping === 0 ? "ฟรี" : `฿${shipping.toFixed(0)}`, shipping === 0 ? "#319754" : "#0a0a0a"],
          ].map(([label, val, color]) => (
            <View
              key={label}
              className="flex-row items-center justify-between"
              style={{ marginBottom: 8 }}
            >
              <Text style={{ fontSize: 13, color: "#525252", lineHeight: 18 }}>
                {label}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color,
                  fontWeight: "500",
                  lineHeight: 18,
                }}
              >
                {val}
              </Text>
            </View>
          ))}
          <View
            className="flex-row items-center justify-between"
            style={{
              borderTopWidth: 1,
              borderTopColor: "#f0f0f0",
              marginTop: 4,
              paddingTop: 12,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a", lineHeight: 18 }}>
              รวมทั้งสิ้น
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: "#ee4d2d",
                lineHeight: 26,
              }}
            >
              ฿{grandTotal.toFixed(0)}
            </Text>
          </View>
          <View className="flex-row items-center" style={{ marginTop: 10, gap: 6 }}>
            <ShieldCheck size={14} color="#319754" />
            <Text style={{ fontSize: 11, color: "#525252", lineHeight: 14 }}>
              คุ้มครองการสั่งซื้อโดย METAHERB
            </Text>
          </View>
        </Section>
      </ScrollView>
        {/* Top fade — rows dissolve into the header as they scroll up. */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
      </View>

      {/* Black scroll-edge shade at the very bottom of the screen. */}
      <BottomFade />

      {/* Floating Liquid Glass confirm bar — same language as the cart /
          product-detail action sheets (hovers above the bottom). */}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 18 }}
      >
        <View
          style={{
            borderRadius: 34,
            shadowColor: "#0a3d22",
            shadowOffset: { width: 0, height: 9 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 14,
          }}
        >
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            style={{
              height: 68,
              borderRadius: 34,
              overflow: "hidden",
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              gap: 12,
            }}
          >
            {/* Price inset = 28px from the glass edge (paddingHorizontal 16 + 12),
                matching the cart's collapsed total (glassPadX 12 + block 16) so
                the two floating bars read identically — Jakob's Law. */}
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>ยอดชำระทั้งสิ้น</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={{ fontSize: 20, fontWeight: "700", color: "#ee4d2d", lineHeight: 24 }}
              >
                ฿{grandTotal.toFixed(0)}
              </Text>
            </View>
            <Pressable
              onPress={placeOrder}
              className="flex-row items-center justify-center active:opacity-80"
              style={{
                height: 50,
                borderRadius: 9999,
                backgroundColor: "#319754",
                paddingHorizontal: 24,
              }}
            >
              <Text style={{ color: "white", fontSize: 13, fontWeight: "600", lineHeight: 18 }}>
                ยืนยันคำสั่งซื้อ
              </Text>
            </Pressable>
          </GlassView>
        </View>
      </View>

    </View>
  );
}

function Section({
  title,
  Icon,
  rightLabel,
  onRightPress,
  rightSlot,
  children,
}: {
  title: string;
  Icon?: React.ComponentType<{ size?: number; color?: string }>;
  rightLabel?: string;
  onRightPress?: () => void;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View
      className="bg-white"
      style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}
    >
      <View
        className="flex-row items-center justify-between"
        style={{ marginBottom: 12 }}
      >
        <View className="flex-row items-center" style={{ gap: 6 }}>
          {Icon ? <Icon size={18} color="#319754" /> : null}
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: "#0a0a0a",
              lineHeight: 20,
            }}
          >
            {title}
          </Text>
        </View>
        {rightSlot ? (
          rightSlot
        ) : rightLabel ? (
          <Pressable hitSlop={6} onPress={onRightPress} className="active:opacity-60">
            <Text style={{ fontSize: 13, color: BRAND_GREEN_DARK, lineHeight: 18 }}>
              {rightLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
