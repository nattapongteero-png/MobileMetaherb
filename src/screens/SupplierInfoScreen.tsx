import { View, Text, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SubPageHeader } from "../components/SubPageHeader";
import { InfoCard, ApprovedBanner } from "../components/ShopInfoCard";
import { useSeller } from "../context/SellerContext";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CERTS = ["อย. (FDA)", "GMP", "HACCP", "ISO 22000", "GAP"];

// Read-only view of the Supplier (Herbal Market) application (SupplierRegisterScreen fields).
export function SupplierInfoScreen() {
  const nav = useNavigation<Nav>();
  const { shopProfile } = useSeller();
  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="ผู้จำหน่ายวัตถุดิบ" subtitle="ข้อมูลที่ยื่นสมัคร Supplier" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <ApprovedBanner when="ม.ค. 2569" />

        <InfoCard
          title="ข้อมูลกิจการ"
          rows={[
            { label: "ประเภทธุรกิจ", value: "ผู้ผลิต / แปรรูป" },
            { label: "ชื่อกิจการ / นิติบุคคล", value: shopProfile?.shopName || "—" },
            { label: "เลขผู้เสียภาษี", value: shopProfile?.taxId || "—" },
            { label: "ปีที่ก่อตั้ง", value: "2562" },
          ]}
        />

        <InfoCard
          title="ผู้ติดต่อ"
          rows={[
            { label: "ชื่อผู้ติดต่อ", value: shopProfile?.ownerName || "—" },
            { label: "ตำแหน่ง", value: "เจ้าของกิจการ" },
            { label: "เบอร์โทร", value: shopProfile?.phone || "—" },
            { label: "อีเมล", value: shopProfile?.email || "—" },
          ]}
        />

        <InfoCard
          title="ที่อยู่"
          rows={[{ label: "ที่อยู่จดทะเบียน", value: shopProfile?.address || "กรุงเทพมหานคร" }]}
        />

        {/* Certifications — chips (read-only) */}
        <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", marginBottom: 12 }}>ใบรับรองมาตรฐาน</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CERTS.map((c) => (
              <View key={c} style={{ backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12.5, fontWeight: "600", color: BRAND_GREEN }}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        <InfoCard
          title="บัญชีรับเงิน"
          rows={[
            { label: "ธนาคาร", value: "ธนาคารกรุงไทย (KTB)" },
            { label: "ชื่อบัญชี", value: "บริษัท เมต้าเฮิร์บ จำกัด" },
            { label: "เลขที่บัญชี", value: "173-074649-7" },
          ]}
        />

        <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 14, marginHorizontal: 16, lineHeight: 17 }}>
          ข้อมูลที่ยื่นตอนสมัครเป็นผู้จำหน่ายวัตถุดิบ · แก้ไขไม่ได้ หากต้องการเปลี่ยนแปลงกรุณาติดต่อทีมงาน
        </Text>
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>
    </View>
  );
}
