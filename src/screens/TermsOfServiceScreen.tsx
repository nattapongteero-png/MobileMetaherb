import { View, Text, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { SubPageHeader } from "../components/SubPageHeader";
import { TEXT_MUTED } from "../theme/tokens";

const SECTIONS: { title: string; body: string }[] = [
  { title: "1. การยอมรับเงื่อนไข", body: "การเข้าใช้งานแอปพลิเคชัน METAHERB ถือว่าคุณได้อ่าน เข้าใจ และตกลงยอมรับเงื่อนไขการใช้งานนี้ทั้งหมด หากไม่ยอมรับ กรุณางดใช้บริการ" },
  { title: "2. บัญชีผู้ใช้", body: "คุณต้องให้ข้อมูลที่ถูกต้องเป็นจริงในการสมัคร และมีหน้าที่รักษารหัสผ่าน/รหัส PIN ของบัญชีไว้เป็นความลับ กิจกรรมทั้งหมดที่เกิดขึ้นภายใต้บัญชีของคุณถือเป็นความรับผิดชอบของคุณ" },
  { title: "3. การสั่งซื้อและชำระเงิน", body: "ราคาสินค้าและโปรโมชันเป็นไปตามที่แสดงในแอป ณ ขณะสั่งซื้อ คำสั่งซื้อจะสมบูรณ์เมื่อชำระเงินสำเร็จ ทางร้านขอสงวนสิทธิ์ยกเลิกคำสั่งซื้อในกรณีสินค้าหมดหรือราคาผิดพลาด" },
  { title: "4. การจัดส่ง การคืนสินค้า และคืนเงิน", body: "ระยะเวลาจัดส่งเป็นค่าโดยประมาณ การคืนสินค้า/คืนเงินเป็นไปตามนโยบายที่ระบุในแอป โดยสินค้าต้องอยู่ในสภาพสมบูรณ์ภายในระยะเวลาที่กำหนด" },
  { title: "5. การใช้งานที่เหมาะสม", body: "ห้ามใช้แอปเพื่อการผิดกฎหมาย ละเมิดสิทธิผู้อื่น ส่งข้อมูลเท็จ รบกวนระบบ หรือพยายามเข้าถึงข้อมูลโดยไม่ได้รับอนุญาต ทางเราขอสงวนสิทธิ์ระงับบัญชีที่ฝ่าฝืน" },
  { title: "6. สินค้าสมุนไพรและข้อมูลสุขภาพ", body: "ข้อมูลสินค้าและคำแนะนำในแอปมีไว้เพื่อการศึกษาเบื้องต้น ไม่ใช่คำวินิจฉัยทางการแพทย์ ควรปรึกษาแพทย์หรือเภสัชกรก่อนใช้ โดยเฉพาะผู้มีโรคประจำตัว สตรีมีครรภ์ หรือเด็ก" },
  { title: "7. ทรัพย์สินทางปัญญา", body: "เนื้อหา โลโก้ รูปภาพ และซอฟต์แวร์ทั้งหมดในแอปเป็นกรรมสิทธิ์ของ METAHERB ห้ามทำซ้ำ ดัดแปลง หรือนำไปใช้เชิงพาณิชย์โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร" },
  { title: "8. ข้อจำกัดความรับผิด", body: "เราพยายามให้บริการอย่างต่อเนื่องและถูกต้อง แต่ไม่รับประกันว่าบริการจะปราศจากข้อผิดพลาดหรือหยุดชะงัก และไม่รับผิดต่อความเสียหายทางอ้อมที่เกิดจากการใช้งานแอป" },
  { title: "9. การเปลี่ยนแปลงเงื่อนไข", body: "เราอาจปรับปรุงเงื่อนไขนี้เป็นครั้งคราว การใช้งานต่อหลังการเปลี่ยนแปลงถือว่าคุณยอมรับเงื่อนไขฉบับใหม่ โดยจะแจ้งให้ทราบผ่านแอปเมื่อมีการเปลี่ยนแปลงสำคัญ" },
  { title: "10. การติดต่อ", body: "หากมีคำถามเกี่ยวกับเงื่อนไขการใช้งาน ติดต่อเราได้ที่ mataherb.herb@gmail.com" },
];

export function TermsOfServiceScreen() {
  const nav = useNavigation();
  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="เงื่อนไขการใช้งาน" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16, gap: 18 }}>
            <Text style={{ fontSize: 12.5, color: TEXT_MUTED, lineHeight: 19 }}>
              เงื่อนไขการใช้งานนี้กำหนดข้อตกลงระหว่างคุณกับ METAHERB ในการใช้แอปพลิเคชันและบริการ กรุณาอ่านโดยละเอียด · อัปเดตล่าสุด 1 มิ.ย. 2569
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
