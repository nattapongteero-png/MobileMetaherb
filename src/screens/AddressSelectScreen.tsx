import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { X, PlusCircle } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { usePayment } from "../context/PaymentContext";
import { BRAND_GREEN } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

const GROUPED_BG = "#f2f2f7";
const LABEL = "#1c1c1e";
const VALUE = "#8a8f8a";
const SEP = "rgba(60,60,67,0.12)";

/** Shipping-address picker — iOS grouped sheet (same shape as the payment picker). */
export function AddressSelectScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { addresses, selectedAddressId, setSelectedAddressId } = usePayment();

  const choose = (id: string) => {
    setSelectedAddressId(id);
    nav.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: LABEL }}>ที่อยู่จัดส่ง</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {addresses.map((a, i) => {
            const active = selectedAddressId === a.id;
            const divider = i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP } : null;
            return (
              <Pressable
                key={a.id}
                onPress={() => choose(a.id)}
                className="flex-row items-center active:opacity-70"
                style={[styles.row, divider]}
              >
                <View style={{ flex: 1, marginRight: 12, gap: 3 }}>
                  <View className="flex-row items-center" style={{ gap: 7 }}>
                    <Text style={{ fontSize: 16, color: LABEL, fontWeight: active ? "700" : "600" }}>{a.name}</Text>
                    {a.isDefault ? (
                      <View style={{ backgroundColor: "#0088ff", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                        <Text style={{ color: "white", fontSize: 10, fontWeight: "700", lineHeight: 13 }}>ค่าเริ่มต้น</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 13, color: VALUE }}>{a.phone}</Text>
                  <Text style={{ fontSize: 13, color: VALUE, lineHeight: 18 }}>
                    {a.detail}
                    {"\n"}
                    {a.area}
                  </Text>
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

          <Pressable
            onPress={() => nav.navigate("AddAddress")}
            className="flex-row items-center active:opacity-70"
            style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP }]}
          >
            <PlusCircle size={26} color={BRAND_GREEN} strokeWidth={1.8} />
            <Text style={{ marginLeft: 12, fontSize: 16, color: BRAND_GREEN, fontWeight: "500" }}>
              เพิ่มที่อยู่ใหม่
            </Text>
          </Pressable>
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
  row: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 14 },
});
