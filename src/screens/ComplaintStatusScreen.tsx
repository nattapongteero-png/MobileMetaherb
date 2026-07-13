import { View, Text, Image, Pressable, ScrollView, Alert } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CheckCircle, Clock, Phone, Mail } from "lucide-react-native";
import { BRAND_GREEN } from "../theme/tokens";
import { EmptyState } from "../components/EmptyState";
import { useStore } from "../store/db";
import { complaintById, complaintsStore, isDecided, COMPLAINT_STATUS_LABEL, type Complaint } from "../store/complaints";
import { TYPE_LABEL } from "../data/shopComplaints";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Step = { title: string; desc: string; date: string; done: boolean; current?: boolean };

const fmtStamp = (at: number): string => {
  const d = new Date(at);
  const M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear() + 543} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * The buyer's timeline, built from the case's own status history rather than a
 * fixed five-step story. Each stage is "done" once the shop has reached it.
 */
function buildTimeline(c: Complaint): Step[] {
  const at = (s: Complaint["status"]) => c.history.find((h) => h.status === s)?.at;
  const filed = c.history[0]?.at;
  const ack = at("acknowledged");
  const decidedEntry = c.history.find((h) => isDecided(h.status));
  const done = isDecided(c.status);

  return [
    { title: "ส่งคำร้องเรียน", desc: "ระบบได้รับคำร้องเรียนของคุณแล้ว", date: filed ? fmtStamp(filed) : "", done: true },
    {
      title: "ร้านค้ารับเรื่อง",
      desc: "ร้านกำลังตรวจสอบหลักฐานและข้อมูล",
      date: ack ? fmtStamp(ack) : "",
      done: Boolean(ack) || done,
      current: !ack && !done,
    },
    {
      title: "ผลการพิจารณา",
      desc: done ? COMPLAINT_STATUS_LABEL[c.status] : "รอร้านค้าตัดสินใจ",
      date: decidedEntry ? fmtStamp(decidedEntry.at) : "",
      done,
      current: Boolean(ack) && !done,
    },
    {
      title: "เสร็จสิ้น",
      desc: c.status === "rejected" ? "ปิดคำร้อง (ปฏิเสธ)" : "คืนเงินเรียบร้อย ปิดคำร้อง",
      date: done && decidedEntry ? fmtStamp(decidedEntry.at) : "",
      done,
    },
  ];
}

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
  const { complaintId } = useRoute<RouteProp<RootStackParamList, "ComplaintStatus">>().params;
  useStore(complaintsStore); // re-render the moment the shop decides
  const complaint = complaintById(complaintId);

  const contactShop = () => Alert.alert("กำลังพัฒนา", "ฟีเจอร์ติดต่อร้านค้าอยู่ระหว่างพัฒนา");

  if (!complaint) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <EmptyState icon={<Clock size={36} color="#9ca3af" />} title="ไม่พบคำร้องเรียน" subtitle="คำร้องนี้อาจถูกลบไปแล้ว" />
      </View>
    );
  }

  const TIMELINE = buildTimeline(complaint);
  const decided = isDecided(complaint.status);
  const refund = complaint.refundAmount ?? complaint.amount;

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
            <InfoRow label="เลขที่คำสั่งซื้อ" value={complaint.orderId} />
            <InfoRow label="สินค้า" value={complaint.product} />
            <InfoRow label="ยอดเงินคืน" value={`฿ ${refund.toLocaleString()}`} />
            <InfoRow label="ช่องทางคืนเงิน" value={complaint.refundChannel} />
            <InfoRow label="วันที่แจ้ง" value={complaint.createdAt} />
            <InfoRow label="ประเภท" value={TYPE_LABEL[complaint.type]} valueColor="#ef4444" />
            <InfoRow label="อีเมล" value={complaint.customerEmail} />
          </View>

          {/* Details */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>รายละเอียด</Text>
            <View style={{ borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
              <Text style={{ fontSize: 14, color: "#0a0a0a", lineHeight: 21 }}>{complaint.description}</Text>
            </View>
          </View>

          {/* Evidence */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {complaint.evidence.map((ev, i) => (
              <Image key={i} source={ev.source} style={{ width: 96, height: 96, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
            ))}
          </View>
        </Card>

        {/* Shop message — only once the shop has actually said something */}
        {complaint.note || decided ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", borderLeftWidth: 4, borderLeftColor: BRAND_GREEN, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", gap: 12 }}>
            <View style={{ marginTop: 1 }}>
              <CheckCircle size={22} color={BRAND_GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: BRAND_GREEN }}>ข้อความจากร้านค้า</Text>
              <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.8)", marginTop: 4, lineHeight: 21 }}>
                {complaint.note ??
                  (complaint.status === "rejected"
                    ? "ทางร้านตรวจสอบแล้วไม่สามารถคืนเงินให้ได้ ขออภัยในความไม่สะดวก"
                    : `ทางร้านได้โอนเงินคืนจำนวน ฿${refund.toLocaleString()} ไปยัง ${complaint.refundChannel} แล้ว`)}
              </Text>
            </View>
          </View>
        ) : null}

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
