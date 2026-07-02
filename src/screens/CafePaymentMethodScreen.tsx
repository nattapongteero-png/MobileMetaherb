/**
 * META Caffe — payment-method picker sheet.
 * Same iOS-grouped look as the product PaymentMethodScreen, but café accepts
 * only PromptPay + cash (no COD / cards / wallets / bank transfer). Tapping a
 * method commits it to CafeCartContext and closes; the X just dismisses.
 */
import { View, Text, Pressable, ScrollView, StyleSheet, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { BRAND_GREEN } from "../theme/tokens";
import { CAFE_PAY_METHODS } from "../data/cafePayment";
import { useCafeCart } from "../context/CafeCartContext";

const GROUPED_BG = "#f2f2f7"; // iOS systemGroupedBackground
const LABEL = "#1c1c1e";
const VALUE = "#8a8f8a";
const SEP = "rgba(60,60,67,0.12)";

export function CafePaymentMethodScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { payMethod, setPayMethod } = useCafeCart();

  const choose = (id: (typeof CAFE_PAY_METHODS)[number]["id"]) => {
    setPayMethod(id);
    nav.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      {/* Header — close / title (iOS sheet style) */}
      <View style={styles.header}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: LABEL }}>ช่องทางชำระเงิน</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {CAFE_PAY_METHODS.map((m, i) => {
            const active = payMethod === m.id;
            const divider = i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP } : null;
            return (
              <Pressable
                key={m.id}
                onPress={() => choose(m.id)}
                className="flex-row items-center active:opacity-70"
                style={[styles.row, divider]}
              >
                <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                  {m.image ? (
                    <Image source={m.image} style={{ width: 30, height: 30, borderRadius: 7 }} resizeMode="cover" />
                  ) : m.Icon ? (
                    <m.Icon size={22} color={active ? BRAND_GREEN : "#9ca3af"} />
                  ) : null}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 16, color: LABEL, fontWeight: active ? "600" : "400" }}>{m.label}</Text>
                  <Text style={{ fontSize: 12, color: VALUE, marginTop: 1 }}>{m.desc}</Text>
                </View>
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
  row: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 12 },
});
