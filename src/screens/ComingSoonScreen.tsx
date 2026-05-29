import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Hammer } from "lucide-react-native";
import { BRAND_GREEN, STAR_YELLOW, TEXT_SECONDARY } from "../theme/tokens";

/** Placeholder for tabs that aren't built yet (Products / Knowledge / Account). */
export function ComingSoonScreen({ label }: { label: string }) {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#fafafa",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: "rgba(49,151,84,0.1)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <Hammer size={34} color={BRAND_GREEN} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: "700", color: "#0a0a0a", marginBottom: 6 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, color: STAR_YELLOW, fontWeight: "600" }}>
        กำลังพัฒนา
      </Text>
      <Text style={{ fontSize: 13, color: TEXT_SECONDARY, marginTop: 8, textAlign: "center" }}>
        ฟีเจอร์นี้กำลังจัดเตรียม เปิดให้ใช้งานเร็วๆ นี้
      </Text>
    </SafeAreaView>
  );
}
