import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { BottomSheet } from "../components/BottomSheet";
import { PageHeader } from "../components/PageHeader";
import { BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Banknote,
  Check,
  ChevronRight,
  CreditCard,
  Landmark,
  MapPin,
  Plus,
  QrCode,
  ShieldCheck,
  Tag,
  Truck,
} from "lucide-react-native";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH =
  Platform.OS === "web"
    ? Math.min(Dimensions.get("window").width, 430)
    : Dimensions.get("window").width;

// Mock order data — same shape as the web PaymentPage flow.
const ITEMS = [
  {
    id: "p1",
    name: "อบเชยเทศ Cinnamon Varum 150g",
    option: "ขนาด 150g",
    price: 199,
    quantity: 2,
    image: require("../../assets/products/cinnamon.png"),
  },
  {
    id: "p2",
    name: "เมต้าเฮิร์บ ยาดมสมุนไพร แดง+น้ำเงิน",
    option: "เซต 2 ขวด",
    price: 89,
    quantity: 1,
    image: require("../../assets/products/herb-jar.png"),
  },
];

const PAYMENT_METHODS = [
  { id: "promptpay", label: "PromptPay", desc: "สแกน QR ผ่านแอปธนาคาร", Icon: QrCode },
  { id: "bank", label: "โอนผ่านธนาคาร", desc: "โอนเข้าบัญชีร้านค้า", Icon: Landmark },
  { id: "credit", label: "บัตรเครดิต / เดบิต", desc: "Visa, Mastercard, JCB", Icon: CreditCard },
  { id: "cod", label: "เก็บเงินปลายทาง", desc: "ชำระเมื่อรับสินค้า", Icon: Banknote },
] as const;

const COUPONS = [
  { code: "NEWMEMBER", title: "ลด 50฿ สำหรับสมาชิกใหม่", discount: 50 },
  { code: "SAVE100", title: "ลด 100฿ ขั้นต่ำ 400฿", discount: 100 },
  { code: "HERB10", title: "ลด 10% สูงสุด 80฿", discount: 80 },
];

export function PaymentScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [selectedPayment, setSelectedPayment] = useState<string>("promptpay");
  const [selectedCouponIdx, setSelectedCouponIdx] = useState<number | null>(null);
  const [showCouponSheet, setShowCouponSheet] = useState(false);

  // Pricing math
  const subtotal = ITEMS.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount =
    selectedCouponIdx !== null ? COUPONS[selectedCouponIdx].discount : 0;
  const vat = Math.round((subtotal - discount) * 0.07);
  const shipping: number = 0;
  const grandTotal = subtotal - discount + vat + shipping;

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <PageHeader title="ชำระเงิน" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Address section — whole card tappable to change (Jakob's Law) */}
        <Section title="ที่อยู่จัดส่ง" Icon={MapPin}>
          <Pressable
            className="active:opacity-90"
            style={{
              backgroundColor: "rgba(242,242,247,0.6)",
              borderRadius: 12,
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
                ณัฐพงษ์ ธีโรภาส
              </Text>
              <View
                style={{
                  backgroundColor: "#08f",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
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
              <View style={{ flex: 1 }} />
              <View className="flex-row items-center" style={{ gap: 2 }}>
                <Text style={{ fontSize: 12, color: BRAND_GREEN_DARK, lineHeight: 16, fontWeight: "500" }}>
                  เปลี่ยน
                </Text>
                <ChevronRight size={14} color="#319754" />
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: "#d4d4d8" }} />
            <View>
              <Text style={{ fontSize: 14, color: "#0a0a0a", lineHeight: 19 }}>
                061-421-3111
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#525252",
                  lineHeight: 19,
                  marginTop: 4,
                }}
              >
                เลขที่ 2 ชั้น 2 ซอยสุขสวัสดิ์ 33{"\n"}แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140
              </Text>
            </View>
          </Pressable>

          {/* Add new address — proper outline button (Fitts: 44dp tap area) */}
          <Pressable
            className="flex-row items-center justify-center active:opacity-70"
            style={{
              marginTop: 12,
              height: 44,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#319754",
              borderStyle: "dashed",
              backgroundColor: "rgba(49,151,84,0.04)",
              gap: 6,
            }}
          >
            <Plus size={16} color="#319754" strokeWidth={2.4} />
            <Text style={{ fontSize: 13, fontWeight: "500", color: BRAND_GREEN_DARK, lineHeight: 18 }}>
              เพิ่มที่อยู่ใหม่
            </Text>
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
            ))}
          </View>
        </Section>

        {/* Shipping method */}
        <Section title="วิธีจัดส่ง" Icon={Truck}>
          <View
            className="flex-row items-center justify-between"
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 10,
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
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  backgroundColor: "white",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: "#0a0a0a",
                    lineHeight: 13,
                  }}
                >
                  J&T
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: "#0a0a0a",
                    lineHeight: 18,
                  }}
                >
                  J&T Express
                </Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 14 }}>
                  ได้รับภายใน 2-3 วันทำการ
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: BRAND_GREEN_DARK, lineHeight: 18 }}>
              ฟรี
            </Text>
          </View>
        </Section>

        {/* Payment method — radio cards */}
        <Section title="ช่องทางชำระเงิน" Icon={CreditCard}>
          <View style={{ gap: 10 }}>
            {PAYMENT_METHODS.map((m) => {
              const active = selectedPayment === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setSelectedPayment(m.id)}
                  hitSlop={4}
                  className="flex-row items-center active:opacity-80"
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: active ? "#319754" : "#e5e7eb",
                    backgroundColor: active ? "rgba(49,151,84,0.06)" : "white",
                    gap: 12,
                  }}
                >
                  <m.Icon size={22} color={active ? "#319754" : "#9ca3af"} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: active ? "600" : "500",
                        color: "#0a0a0a",
                        lineHeight: 18,
                      }}
                    >
                      {m.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 14, marginTop: 2 }}>
                      {m.desc}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: active ? "#319754" : "#a3a3a3",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {active ? (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: "#319754",
                        }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Coupon — opens bottom sheet on tap */}
        <Section title="คูปองส่วนลด" Icon={Tag}>
          <Pressable
            onPress={() => setShowCouponSheet(true)}
            hitSlop={4}
            className="flex-row items-center active:opacity-80"
            style={{
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              backgroundColor: "white",
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              {selectedCouponIdx !== null ? (
                <>
                  <View
                    style={{
                      alignSelf: "flex-start",
                      backgroundColor: "rgba(49,151,84,0.1)",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 4,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: BRAND_GREEN_DARK,
                        fontWeight: "700",
                        lineHeight: 13,
                      }}
                    >
                      {COUPONS[selectedCouponIdx].code}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: "#0a0a0a", lineHeight: 18 }}>
                    {COUPONS[selectedCouponIdx].title}
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: 14, color: "#525252", lineHeight: 18 }}>
                  เลือกคูปองส่วนลด ({COUPONS.length} คูปองพร้อมใช้)
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 13, color: "#0088ff", lineHeight: 18 }}>
              {selectedCouponIdx !== null ? "เปลี่ยน" : "เลือก"}
            </Text>
            <ChevronRight size={16} color="#737373" />
          </Pressable>
        </Section>

        {/* Summary breakdown */}
        <Section title="สรุปคำสั่งซื้อ">
          {[
            [`ยอดสินค้า (${ITEMS.reduce((s, i) => s + i.quantity, 0)} ชิ้น)`, `฿${subtotal.toFixed(0)}`, "#0a0a0a"],
            ...(discount > 0 ? [["ส่วนลดคูปอง", `-฿${discount.toFixed(0)}`, "#319754"] as [string, string, string]] : []),
            ["VAT 7%", `฿${vat.toFixed(0)}`, "#0a0a0a"],
            ["ค่าจัดส่ง", shipping === 0 ? "ฟรี" : `฿${shipping.toFixed(0)}`, "#319754"],
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

      {/* Sticky bottom — confirm CTA */}
      <SafeAreaView edges={["bottom"]} className="bg-white border-t border-gray-200">
        <View
          className="flex-row items-center"
          style={{ paddingHorizontal: 16, paddingVertical: 10, gap: 12 }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>
              ยอดชำระทั้งสิ้น
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: "#ee4d2d",
                lineHeight: 28,
                marginTop: 4,
              }}
            >
              ฿{grandTotal.toFixed(0)}
            </Text>
          </View>
          <Pressable
            className="active:opacity-80"
            style={{
              backgroundColor: "#319754",
              paddingHorizontal: 24,
              height: 48,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 14,
                fontWeight: "600",
                lineHeight: 18,
              }}
            >
              ยืนยันคำสั่งซื้อ
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Coupon picker — uses shared BottomSheet */}
      <BottomSheet
        visible={showCouponSheet}
        onClose={() => setShowCouponSheet(false)}
        title="เลือกคูปองส่วนลด"
      >
        <View style={{ padding: 16, gap: 10 }}>
          {COUPONS.map((c, idx) => {
            const active = selectedCouponIdx === idx;
            return (
              <Pressable
                key={c.code}
                onPress={() => {
                  setSelectedCouponIdx(active ? null : idx);
                  setShowCouponSheet(false);
                }}
                className="flex-row items-center active:opacity-80"
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: active ? "#319754" : "#e5e7eb",
                  backgroundColor: active ? "rgba(49,151,84,0.06)" : "white",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: "#319754",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Tag size={20} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: BRAND_GREEN_DARK,
                      lineHeight: 17,
                    }}
                  >
                    {c.code}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#0a0a0a",
                      marginTop: 2,
                      lineHeight: 18,
                    }}
                  >
                    {c.title}
                  </Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 1.5,
                    borderColor: active ? "#319754" : "#a3a3a3",
                    backgroundColor: active ? "#319754" : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {active ? <Check size={14} color="white" strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

function Section({
  title,
  Icon,
  rightLabel,
  children,
}: {
  title: string;
  Icon?: React.ComponentType<{ size?: number; color?: string }>;
  rightLabel?: string;
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
        {rightLabel ? (
          <Pressable hitSlop={6} className="active:opacity-60">
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
