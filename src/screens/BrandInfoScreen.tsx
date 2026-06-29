import { View, Text, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SubPageHeader } from "../components/SubPageHeader";
import { InfoCard, ApprovedBanner } from "../components/ShopInfoCard";
import { useSeller } from "../context/SellerContext";
import { TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Read-only view of the Trial-Brand application (BrandRegisterScreen fields).
export function BrandInfoScreen() {
  const nav = useNavigation<Nav>();
  const { shopProfile } = useSeller();
  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="แบรนด์ทดสอบ" subtitle="ข้อมูลที่ยื่นสมัคร" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <ApprovedBanner when="ก.พ. 2569" />
        <InfoCard
          title="ข้อมูลแบรนด์"
          rows={[
            { label: "ชื่อแบรนด์ / บริษัท", value: shopProfile?.shopName || "—" },
            { label: "เลขทะเบียนการค้า", value: shopProfile?.taxId || "—" },
            { label: "ชื่อ-นามสกุลผู้ติดต่อหลัก", value: shopProfile?.ownerName || "—" },
            { label: "อีเมล", value: shopProfile?.email || "—" },
            { label: "เบอร์โทร", value: shopProfile?.phone || "—" },
            { label: "เว็บไซต์แบรนด์", value: "https://metaherb.co" },
          ]}
        />
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 14, marginHorizontal: 16, lineHeight: 17 }}>
          ข้อมูลที่ยื่นตอนสมัครเป็นแบรนด์ทดสอบ · แก้ไขไม่ได้ หากต้องการเปลี่ยนแปลงกรุณาติดต่อทีมงาน
        </Text>
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>
    </View>
  );
}
