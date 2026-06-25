import { View, Text, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { SubPageHeader } from "../components/SubPageHeader";
import { TEXT_MUTED } from "../theme/tokens";

const SECTIONS: { title: string; body: string }[] = [
  { title: "1. ข้อมูลที่เราเก็บรวบรวม", body: "เราเก็บข้อมูลที่จำเป็นต่อการให้บริการ เช่น ชื่อ เบอร์โทรศัพท์ อีเมล ที่อยู่จัดส่ง ประวัติการสั่งซื้อ และข้อมูลการใช้งานแอป เพื่อประมวลผลคำสั่งซื้อและพัฒนาบริการให้ดียิ่งขึ้น" },
  { title: "2. การใช้ข้อมูล", body: "ข้อมูลของคุณถูกใช้เพื่อดำเนินการสั่งซื้อ จัดส่งสินค้า ติดต่อสื่อสาร แจ้งโปรโมชัน (เมื่อคุณยินยอม) และปรับปรุงประสบการณ์การใช้งานเท่านั้น" },
  { title: "3. การเปิดเผยข้อมูล", body: "เราไม่ขายข้อมูลส่วนบุคคลของคุณ จะเปิดเผยเฉพาะแก่ผู้ให้บริการที่จำเป็น (เช่น ขนส่งและระบบชำระเงิน) หรือเมื่อกฎหมายกำหนด ภายใต้มาตรการรักษาความปลอดภัยที่เหมาะสม" },
  { title: "4. ความปลอดภัยของข้อมูล", body: "เราใช้มาตรการทางเทคนิคและการเข้ารหัสเพื่อปกป้องข้อมูลของคุณจากการเข้าถึงโดยไม่ได้รับอนุญาต การสูญหาย หรือการเปลี่ยนแปลง" },
  { title: "5. สิทธิของเจ้าของข้อมูล", body: "คุณมีสิทธิเข้าถึง แก้ไข ลบ หรือขอระงับการใช้ข้อมูลส่วนบุคคลของคุณ รวมถึงถอนความยินยอมได้ตลอดเวลา ผ่านการตั้งค่าในแอปหรือติดต่อทีมงาน" },
  { title: "6. คุกกี้และการติดตาม", body: "แอปอาจใช้เทคโนโลยีติดตามการใช้งานแบบไม่ระบุตัวตน เพื่อวิเคราะห์และปรับปรุงบริการ โดยไม่กระทบต่อความเป็นส่วนตัวของคุณ" },
  { title: "7. การติดต่อ", body: "หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว ติดต่อเราได้ที่ mataherb.herb@gmail.com" },
];

export function PrivacyPolicyScreen() {
  const nav = useNavigation();
  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="นโยบายความเป็นส่วนตัว" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16, gap: 18 }}>
            <Text style={{ fontSize: 12.5, color: TEXT_MUTED, lineHeight: 19 }}>
              METAHERB ให้ความสำคัญกับความเป็นส่วนตัวของคุณ เอกสารนี้อธิบายวิธีที่เราเก็บรวบรวม ใช้ และปกป้องข้อมูลส่วนบุคคลของคุณ · อัปเดตล่าสุด 1 มิ.ย. 2569
            </Text>
            {SECTIONS.map((s) => (
              <View key={s.title} style={{ gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{s.title}</Text>
                <Text style={{ fontSize: 13.5, color: "#374151", lineHeight: 22 }}>{s.body}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>
    </View>
  );
}
