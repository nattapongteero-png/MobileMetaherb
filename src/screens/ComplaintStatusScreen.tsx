import { View, Text, Image, Pressable, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CheckCircle, Clock, Phone, Mail } from "lucide-react-native";
import { BRAND_GREEN } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ---- Mock data (ported verbatim from web ComplaintStatusPage) ----------------

const COMPLAINT = {
  orderId: "ORD-2569-0312",
  product: "METAHERB น้ำมันสกัดเย็น 500ml",
  amount: "1,290.00",
  date: "15 มี.ค. 2569",
  type: "สินค้าเสียหาย", // complaint_type_damaged
  email: "metaherb@gmai.com",
  detail:
    "กล่องสินค้าบุบเสียหายอย่างหนัก ผลิตภัณฑ์ด้านในแตกออกและหกเลอะ ไม่สามารถใช้งานได้", // cs_sample_detail
};

const EVIDENCE_IMAGES = [
  "https://images.unsplash.com/photo-1586769852044-692d6e3703f2?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop",
];

type Step = { title: string; desc: string; date: string; done: boolean; current?: boolean };

const TIMELINE: Step[] = [
  { title: "ส่งคำร้องเรียน", desc: "ระบบได้รับคำร้องเรียนของคุณแล้ว", date: "15 มี.ค. 2569 09:15", done: true },
  { title: "ตรวจสอบข้อมูล", desc: "ทีมงานกำลังตรวจสอบหลักฐานและข้อมูล", date: "15 มี.ค. 2569 11:30", done: true },
  { title: "อนุมัติและดำเนินการ", desc: "อยู่ระหว่างจัดส่งสินค้าทดแทน", date: "16 มี.ค. 2569 14:00", done: true },
  { title: "จัดส่งสินค้าทดแทน", desc: "ส่งสินค้าทดแทนให้ลูกค้า", date: "", done: false, current: true },
  { title: "เสร็จสิ้น", desc: "ปิดคำร้องเรียน", date: "", done: false },
];

// ---- Small presentational pieces --------------------------------------------

function Card({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16 }}>{children}</View>;
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ fontSize: 12, color: "#999" }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "500", color: valueColor ?? "#0a0a0a" }}>{value}</Text>
    </View>
  );
}

// ---- Screen ------------------------------------------------------------------

export function ComplaintStatusScreen() {
  const nav = useNavigation<Nav>();

  const contactShop = () => Alert.alert("กำลังพัฒนา", "ฟีเจอร์ติดต่อร้านค้าอยู่ระหว่างพัฒนา");

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
      >
        {/* Complaint info */}
        <Card>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a", paddingBottom: 12, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#d4d4d8" }}>
            ข้อมูลการร้องเรียน
          </Text>

          <View style={{ gap: 16, marginBottom: 18 }}>
            <InfoRow label="เลขที่คำสั่งซื้อ" value={COMPLAINT.orderId} />
            <InfoRow label="สินค้า" value={COMPLAINT.product} />
            <InfoRow label="ยอดเงินคืน" value={`฿ ${COMPLAINT.amount}`} />
            <InfoRow label="ช่องทางคืนเงิน" value="ธนาคารทหารไทยธนชาต [*1234]" />
            <InfoRow label="วันที่แจ้ง" value={COMPLAINT.date} />
            <InfoRow label="ประเภท" value={COMPLAINT.type} valueColor="#ef4444" />
            <InfoRow label="อีเมล" value={COMPLAINT.email} />
          </View>

          {/* Details */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>รายละเอียด</Text>
            <View style={{ borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
              <Text style={{ fontSize: 14, color: "#0a0a0a", lineHeight: 21 }}>{COMPLAINT.detail}</Text>
            </View>
          </View>

          {/* Evidence */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {EVIDENCE_IMAGES.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={{ width: 96, height: 96, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
            ))}
          </View>
        </Card>

        {/* Shop message */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", borderLeftWidth: 4, borderLeftColor: BRAND_GREEN, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", gap: 12 }}>
          <View style={{ marginTop: 1 }}>
            <CheckCircle size={22} color={BRAND_GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: BRAND_GREEN }}>ข้อความจากร้านค้า</Text>
            <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.8)", marginTop: 4, lineHeight: 21 }}>
              ขออภัยในความไม่สะดวก ทางร้านได้ทำการโอนเงินคืนเป็นจำนวน xx.xx บาท ไปยังบัญชี x123 Visa แล้ว
            </Text>
          </View>
        </View>

        {/* Progress */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a", marginTop: 2 }}>ความคืบหน้า</Text>
        <Card>
          {TIMELINE.map((step, i) => {
            const isLast = i === TIMELINE.length - 1;
            const active = step.done || step.current;
            return (
              <View key={i} style={{ flexDirection: "row", gap: 14 }}>
                {/* Indicator + connector line */}
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? BRAND_GREEN : "#e5e7eb",
                    }}
                  >
                    {step.done ? (
                      <CheckCircle size={15} color="#fff" />
                    ) : step.current ? (
                      <Clock size={14} color="#fff" />
                    ) : null}
                  </View>
                  {!isLast ? (
                    <View style={{ width: 2, flex: 1, minHeight: 40, backgroundColor: step.done ? BRAND_GREEN : "#e5e7eb" }} />
                  ) : null}
                </View>

                {/* Content */}
                <View style={{ paddingBottom: isLast ? 0 : 22, flex: 1, marginTop: -1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: active ? "#0a0a0a" : "#999" }}>{step.title}</Text>
                  <Text style={{ fontSize: 12, color: "#666", marginTop: 2, lineHeight: 18 }}>{step.desc}</Text>
                  {step.date ? (
                    <Text style={{ fontSize: 12, color: BRAND_GREEN, marginTop: 2 }}>{step.date}</Text>
                  ) : (
                    <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>รอดำเนินการ</Text>
                  )}
                </View>
              </View>
            );
          })}
        </Card>

        {/* Need help */}
        <Card>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a", marginBottom: 6 }}>ต้องการความช่วยเหลือ?</Text>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 14 }}>หากมีคำถามเพิ่มเติม ติดต่อเราได้ที่:</Text>

          <View style={{ gap: 12 }}>
            <Pressable onPress={contactShop} className="flex-row items-center active:opacity-60" style={{ gap: 12 }} hitSlop={6}>
              <Phone size={20} color={BRAND_GREEN} />
              <Text style={{ fontSize: 14, color: "#0a0a0a" }}>061-421-3111</Text>
            </Pressable>
            <Pressable onPress={contactShop} className="flex-row items-center active:opacity-60" style={{ gap: 12 }} hitSlop={6}>
              <Mail size={20} color={BRAND_GREEN} />
              <Text style={{ fontSize: 14, color: "#0a0a0a" }}>Metaherb@gmail.com</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 12, color: "#999" }}>จันทร์ – ศุกร์ 08:30 – 17:30 น.</Text>
          </View>
        </Card>

        {/* Back to orders */}
        <Pressable
          onPress={() => nav.navigate("Orders")}
          className="items-center justify-center active:opacity-80"
          style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, height: 50, marginTop: 2 }}
        >
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>กลับไปหน้าคำสั่งซื้อ</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
