import { View, Text, Pressable, ScrollView, StyleSheet, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { X, Zap, Store } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { usePayment } from "../context/PaymentContext";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";
import { SHIPPING_METHODS } from "../data/shippingMethods";
import type { RootStackParamList } from "../navigation/RootStack";

const GROUPED_BG = "#f2f2f7";
const LABEL = "#1c1c1e";
const VALUE = "#8a8f8a";
const SEP = "rgba(60,60,67,0.12)";
const EXPRESS_AMBER = "#f59e0b";

/** Shipping-carrier picker — iOS grouped sheet (same shape as the payment picker). */
export function ShippingMethodScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { selectedShipping, setSelectedShipping } = usePayment();

  const choose = (id: string) => {
    setSelectedShipping(id);
    nav.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: LABEL }}>วิธีจัดส่ง</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {SHIPPING_METHODS.map((s, i) => {
            const active = selectedShipping === s.id;
            const divider =
              i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP } : null;
            return (
              <Pressable
                key={s.id}
                onPress={() => choose(s.id)}
                className="flex-row items-center active:opacity-70"
                style={[styles.row, divider]}
              >
                {/* Carrier badge — lightning for express, brand code otherwise. */}
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    backgroundColor: "white",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {s.image ? (
                    <Image source={s.image} style={{ width: 28, height: 28 }} resizeMode="contain" />
                  ) : s.express ? (
                    <Zap size={20} color={EXPRESS_AMBER} fill={EXPRESS_AMBER} />
                  ) : s.pickup ? (
                    <Store size={20} color={BRAND_GREEN} />
                  ) : (
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#0a0a0a" }}>{s.code}</Text>
                  )}
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text style={{ fontSize: 16, color: LABEL, fontWeight: active ? "600" : "400" }}>
                      {s.name}
                    </Text>
                    {s.express ? (
                      <View style={{ backgroundColor: "rgba(245,158,11,0.14)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: EXPRESS_AMBER }}>ด่วน</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 12, color: VALUE, marginTop: 1 }}>{s.desc}</Text>
                </View>

                <View className="flex-row items-center" style={{ gap: 10, marginLeft: 8 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: s.price === 0 ? BRAND_GREEN_DARK : "#0a0a0a",
                    }}
                  >
                    {s.price === 0 ? "ฟรี" : `฿${s.price}`}
                  </Text>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: active ? BRAND_GREEN : "#cbd0cb",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {active ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: BRAND_GREEN }} /> : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  card: { backgroundColor: "#fff", borderRadius: 20, marginHorizontal: 16, overflow: "hidden" },
  row: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 12 },
});
