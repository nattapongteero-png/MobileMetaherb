import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Check } from "lucide-react-native";
import { usePayment } from "../context/PaymentContext";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function DetailRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ fontSize: 12, color: "#8a8f8a" }}>{label}</Text>
      <Text style={{ fontSize: 15, color: "#0a0a0a", fontWeight: "600" }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 13, color: "#737373", lineHeight: 19 }}>{sub}</Text> : null}
    </View>
  );
}

export function TrialSuccessScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { productName, rewardPoints } =
    useRoute<RouteProp<RootStackParamList, "TrialSuccess">>().params;
  const { addresses, selectedAddressId } = usePayment();
  const address = addresses.find((a) => a.id === selectedAddressId) ?? addresses[0];

  const goHome = () => nav.reset({ index: 0, routes: [{ name: "Main" }] });
  const goMyTrials = () =>
    nav.reset({ index: 1, routes: [{ name: "Main" }, { name: "MyTrials" }] });

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* Success mark */}
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
              <Check size={46} color="#fff" strokeWidth={3} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#0a0a0a", marginTop: 16 }}>ส่งใบสมัครสำเร็จ</Text>
            <Text style={{ fontSize: 14, color: "#737373", marginTop: 6, textAlign: "center", lineHeight: 20 }}>
              ขอบคุณที่สนใจร่วมทดสอบกับ METAHERB{"\n"}เราจะคัดเลือกและติดต่อกลับภายใน 2 วันทำการ
            </Text>
            <Text style={{ fontSize: 34, fontWeight: "800", color: BRAND_GREEN_DARK, marginTop: 14 }}>
              +{rewardPoints.toLocaleString()} คะแนน
            </Text>
            <Text style={{ fontSize: 12, color: "#8a8f8a", marginTop: 2 }}>รับเมื่อส่งแบบประเมินครบ</Text>
          </View>

          {/* Application details */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#ececed", padding: 18, marginTop: 24, gap: 14 }}>
            <DetailRow label="สินค้าที่ขอทดสอบ" value={productName} />
            <DetailRow label="สถานะ" value="รอการคัดเลือก" sub="ทีมงานจะแจ้งผลทาง SMS / อีเมล" />
            <DetailRow label="คะแนนสะสมที่จะได้รับ" value={`+${rewardPoints.toLocaleString()} คะแนน`} />
            {address ? (
              <DetailRow label="จัดส่งถึง" value={address.name} sub={`${address.detail}\n${address.area}`} />
            ) : null}
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12, gap: 8 }}>
          <Pressable onPress={goMyTrials} className="active:opacity-80 items-center justify-center" style={{ height: 52, borderRadius: 999, backgroundColor: BRAND_GREEN }}>
            <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>ดูการทดลองของฉัน</Text>
          </Pressable>
          <Pressable onPress={goHome} className="active:opacity-70 items-center justify-center" style={{ height: 48 }}>
            <Text style={{ fontSize: 15, color: "#319754", fontWeight: "600" }}>กลับหน้าแรก</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
