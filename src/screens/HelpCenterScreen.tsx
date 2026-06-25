import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { ChevronDown, ChevronUp, LifeBuoy } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";

// FAQ — predefined questions & answers about using the app (no free-text input).
const FAQ: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: "การสั่งซื้อและชำระเงิน",
    items: [
      { q: "สั่งซื้อสินค้าอย่างไร?", a: "เลือกสินค้าที่ต้องการ → กดเพิ่มลงตะกร้า → ไปที่ตะกร้า → ตรวจสอบรายการและที่อยู่จัดส่ง → กดสั่งซื้อและชำระเงิน" },
      { q: "มีช่องทางชำระเงินอะไรบ้าง?", a: "รองรับ PromptPay (สแกน QR), โอนผ่านธนาคาร, บัตรเครดิต/เดบิต และเก็บเงินปลายทางในบางพื้นที่" },
      { q: "ใช้คูปองส่วนลดอย่างไร?", a: "ในหน้าชำระเงิน กดเลือก “ใช้คูปอง” แล้วเลือกคูปองที่ต้องการ ระบบจะคำนวณส่วนลดให้อัตโนมัติ" },
    ],
  },
  {
    category: "การจัดส่งและติดตามพัสดุ",
    items: [
      { q: "ใช้เวลาจัดส่งกี่วัน?", a: "โดยทั่วไป 1–3 วันทำการ ขึ้นอยู่กับพื้นที่และผู้ให้บริการขนส่งที่เลือก" },
      { q: "ติดตามพัสดุได้ที่ไหน?", a: "ไปที่ ฉัน → คำสั่งซื้อของฉัน → เลือกออเดอร์ จะเห็นเลขพัสดุและสถานะการจัดส่ง" },
    ],
  },
  {
    category: "คืนสินค้าและคืนเงิน",
    items: [
      { q: "ขอคืนสินค้าได้ไหม?", a: "ได้ภายใน 7 วันหลังได้รับสินค้า หากสินค้าชำรุดหรือได้รับผิดรายการ ผ่านเมนู “แจ้งปัญหา” ในรายละเอียดออเดอร์" },
      { q: "เงินคืนเข้าทางไหน?", a: "เลือกช่องทางคืนเงินได้ทั้งบัญชีธนาคารที่เพิ่มไว้ หรือ TrueMoney Wallet ที่ผูกบัญชีไว้" },
    ],
  },
  {
    category: "สินค้าทดลองใช้",
    items: [
      { q: "สมัครทดลองใช้สินค้าอย่างไร?", a: "เลือกสินค้าทดลอง → กดสมัครทดลองใช้ → กรอกเหตุผลและยืนยัน รอร้านค้าอนุมัติและจัดส่ง" },
      { q: "ได้รับคะแนนเมื่อไหร่?", a: "เมื่อทำแบบประเมินหลังใช้ครบถ้วน คะแนนจะเข้าบัญชีสะสมของคุณโดยอัตโนมัติ" },
    ],
  },
  {
    category: "เอกสารธุรกิจ (RFQ / PR / PO)",
    items: [
      { q: "ดูเอกสารได้ที่ไหน?", a: "ไปที่ ฉัน → บริการเพิ่มเติม แล้วเลือก ใบเสนอราคา (RFQ), ใบขอสั่งซื้อ (PR) หรือ ใบสั่งซื้อ (PO)" },
      { q: "ดาวน์โหลดเป็น PDF ได้ไหม?", a: "ได้ ในหน้ารายละเอียดเอกสาร กดปุ่มดาวน์โหลด (ยกเว้นเอกสารที่หมดอายุหรือถูกปฏิเสธ)" },
    ],
  },
  {
    category: "บัญชีและการตั้งค่า",
    items: [
      { q: "แก้ไขข้อมูลส่วนตัวอย่างไร?", a: "ไปที่ ฉัน → บัญชีของฉัน แล้วกดปุ่มแก้ไขเพื่อปรับชื่อ เบอร์โทร อีเมล และรูปโปรไฟล์" },
      { q: "จัดการการแจ้งเตือนอย่างไร?", a: "ไปที่ ฉัน → ตั้งค่า → การแจ้งเตือน เปิด/ปิดการแจ้งเตือนแต่ละหมวดได้ตามต้องการ" },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen((v) => !v)} className="active:opacity-70" style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 }}>
        <Text style={{ flex: 1, fontSize: 14.5, color: "#0a0a0a", fontWeight: open ? "700" : "500", lineHeight: 21 }}>{q}</Text>
        {open ? <ChevronUp size={18} color={BRAND_GREEN} strokeWidth={2.4} /> : <ChevronDown size={18} color="#c4c4c6" strokeWidth={2.4} />}
      </Pressable>
      {open ? <Text style={{ fontSize: 13.5, color: "#525252", lineHeight: 22, paddingBottom: 14 }}>{a}</Text> : null}
    </View>
  );
}

export function HelpCenterScreen() {
  const nav = useNavigation();
  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="ศูนย์ช่วยเหลือ" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Intro */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
              <LifeBuoy size={20} color={BRAND_GREEN} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>คำถามที่พบบ่อย</Text>
              <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 1 }}>แตะคำถามเพื่อดูคำตอบ</Text>
            </View>
          </View>

          {/* FAQ groups */}
          {FAQ.map((group) => (
            <View key={group.category} style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: BRAND_GREEN, marginTop: 10, marginBottom: 2 }}>{group.category}</Text>
              {group.items.map((it, i) => (
                <View key={it.q}>
                  {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0" }} /> : null}
                  <FaqItem q={it.q} a={it.a} />
                </View>
              ))}
            </View>
          ))}

          <Text style={{ fontSize: 12, color: TEXT_MUTED, textAlign: "center", marginTop: 18, paddingHorizontal: 24, lineHeight: 18 }}>
            ไม่พบคำตอบที่ต้องการ? ติดต่อเราที่ ฉัน → ตั้งค่า → เกี่ยวกับเรา
          </Text>
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>
    </View>
  );
}
