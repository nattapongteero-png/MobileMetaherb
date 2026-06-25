import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { COMPLAINT_TYPES, COMPLAINT_TYPE_ORDER } from "../data/complaintTypes";
import { BRAND_GREEN } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

const GROUPED_BG = "#f2f2f7";
const LABEL = "#1c1c1e";
const VALUE = "#8a8f8a";
const SEP = "rgba(60,60,67,0.12)";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SelectRoute = RouteProp<RootStackParamList, "ComplaintTypeSelect">;

/** Complaint-type picker — iOS grouped sheet (same shape as the payment / shipping picker). */
export function ComplaintTypeSelectScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { orderId, current } = useRoute<SelectRoute>().params ?? {};

  // Pop back to the existing ComplaintForm (dismisses this sheet) and hand it the
  // chosen type — popTo never pushes a duplicate, so sheets can't stack.
  const choose = (type: keyof typeof COMPLAINT_TYPES) =>
    nav.popTo("ComplaintForm", { orderId, type });

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: LABEL }}>เลือกประเภทปัญหา</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {COMPLAINT_TYPE_ORDER.map((key, i) => {
            const info = COMPLAINT_TYPES[key];
            const active = current === key;
            const divider = i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP } : null;
            return (
              <Pressable
                key={key}
                onPress={() => choose(key)}
                className="flex-row items-center active:opacity-70"
                style={[styles.row, divider]}
              >
                <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: info.color + "1a", alignItems: "center", justifyContent: "center" }}>
                  <info.Icon size={22} color={info.color} strokeWidth={2.2} />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 16, color: LABEL, fontWeight: active ? "600" : "500" }}>{info.title}</Text>
                  <Text style={{ fontSize: 12, color: VALUE, marginTop: 1, lineHeight: 16 }}>{info.desc}</Text>
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
                    marginLeft: 8,
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
  row: { minHeight: 64, paddingHorizontal: 16, paddingVertical: 12 },
});
