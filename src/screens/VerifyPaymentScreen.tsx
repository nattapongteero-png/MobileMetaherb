import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { QrCode, Upload, AlertTriangle } from "lucide-react-native";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Mock order — same shape/values as the web VerifyPaymentPage flow.
const ORDER = {
  id: "ORD-20260615-0012",
  date: "15 มิ.ย. 2569 14:32",
  total: 487.0,
  paymentMethod: "พร้อมเพย์ PromptPay",
};

const CARD = {
  backgroundColor: "#fff",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#ececed",
  padding: 16,
} as const;

export function VerifyPaymentScreen() {
  const nav = useNavigation<Nav>();

  const handleUpload = () => {
    Alert.alert(
      "ขอบคุณสำหรับการสั่งซื้อ! 🎉",
      "ระบบได้รับคำสั่งซื้อของคุณแล้ว ทีมงานจะตรวจสอบและจัดส่งให้เร็วที่สุด",
      [{ text: "ตกลง", onPress: () => nav.navigate("Orders" as never) }]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
      >
        {/* Payment info card */}
        <View style={CARD}>
          <Text style={{ fontSize: 20, fontWeight: "600", color: BRAND_GREEN, lineHeight: 26 }}>
            รอชำระเงิน
          </Text>
          <Text style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 4, lineHeight: 18 }}>
            กรุณาชำระเงินภายใน 24 ชม. เพื่อไม่ให้คำสั่งซื้อของคุณถูกยกเลิก
          </Text>

          {/* Amount banner */}
          <View
            className="flex-row items-center justify-between"
            style={{
              backgroundColor: BRAND_GREEN,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginTop: 16,
            }}
          >
            <Text style={{ fontSize: 14, color: "#fff", lineHeight: 18 }}>ยอดที่ต้องชำระ</Text>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#fff", lineHeight: 28 }}>
              ฿{ORDER.total.toFixed(2)}
            </Text>
          </View>

          {/* QR placeholder */}
          <View className="items-center" style={{ marginTop: 24 }}>
            <View
              className="items-center justify-center"
              style={{
                width: 200,
                height: 200,
                backgroundColor: "#f5f5f5",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#ececed",
              }}
            >
              <QrCode size={96} color="#d4d4d8" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: TEXT_SECONDARY, marginTop: 12, lineHeight: 18 }}>
              ชำระด้วยพร้อมเพย์ PromptPay
            </Text>
            <Text style={{ fontSize: 13, color: "#a3a3a3", marginTop: 2, lineHeight: 18 }}>
              เหลือเวลาชำระเงิน 24:00:00 ชั่วโมง
            </Text>
          </View>

          {/* Receiver details */}
          <View style={{ marginTop: 16, gap: 8 }}>
            <View className="flex-row items-center justify-between">
              <Text style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 18 }}>ชื่อผู้รับเงิน:</Text>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#0a0a0a", lineHeight: 18 }}>
                ทดสอบ ระบบ
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 18 }}>หมายเลขพร้อมเพย์:</Text>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#0a0a0a", lineHeight: 18 }}>
                080-000-0000
              </Text>
            </View>
          </View>

          {/* Warning */}
          <View
            className="flex-row"
            style={{
              backgroundColor: "#fef2f2",
              borderWidth: 1,
              borderColor: "#fecaca",
              borderRadius: 12,
              padding: 12,
              marginTop: 16,
              gap: 8,
            }}
          >
            <AlertTriangle size={16} color="#ef4444" style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 12, color: "#dc2626", lineHeight: 18 }}>
              สำคัญ: กรุณาอย่าชำระ QR Code นี้กับผู้อื่น และตรวจสอบจำนวนเงินให้ถูกต้องก่อนชำระเงิน
            </Text>
          </View>

          {/* Action buttons */}
          <View style={{ marginTop: 20, gap: 12 }}>
            <Pressable
              onPress={() => nav.navigate("Orders" as never)}
              className="active:opacity-80 items-center justify-center"
              style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, height: 48 }}
            >
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700", lineHeight: 18 }}>
                ดูรายละเอียดคำสั่งซื้อ
              </Text>
            </Pressable>
            <Pressable
              onPress={() => nav.navigate("Orders" as never)}
              className="active:opacity-70 items-center justify-center"
              style={{ borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 999, height: 48 }}
            >
              <Text style={{ color: TEXT_SECONDARY, fontSize: 14, fontWeight: "500", lineHeight: 18 }}>
                คำสั่งซื้อทั้งหมด
              </Text>
            </Pressable>
            <Pressable
              onPress={() => nav.navigate("Products" as never)}
              className="active:opacity-70 items-center justify-center"
              style={{ borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 999, height: 48 }}
            >
              <Text style={{ color: TEXT_SECONDARY, fontSize: 14, fontWeight: "500", lineHeight: 18 }}>
                ช้อปปิ้งต่อ
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Order summary card */}
        <View style={CARD}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a", lineHeight: 21 }}>
            {ORDER.id}
          </Text>
          <Text style={{ fontSize: 12, color: "#a3a3a3", marginTop: 4, lineHeight: 16 }}>
            {ORDER.date}
          </Text>

          <View
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18 }}>username01</Text>
            <Text style={{ fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18 }}>090-000-000</Text>
            <Text style={{ fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18 }}>
              เลขที่ 2 ชั้นที่ 2 ซอยสุขสวัสดิ์33 แขวงราษฎร์บูรณะ, เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140
            </Text>
          </View>

          <View style={{ marginTop: 12, gap: 8 }}>
            <View className="flex-row items-center justify-between">
              <Text style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 18 }}>วิธีชำระเงิน:</Text>
              <Text style={{ fontSize: 13, color: "#0a0a0a", lineHeight: 18 }}>{ORDER.paymentMethod}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 18 }}>จำนวนเงิน:</Text>
              <Text style={{ fontSize: 13, color: "#0a0a0a", lineHeight: 18 }}>
                ฿{ORDER.total.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 18 }}>สถานะการชำระเงิน:</Text>
              <View
                style={{
                  backgroundColor: "#ee4d2d",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#fff", lineHeight: 15 }}>
                  รอชำระเงิน
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Upload proof card */}
        <View style={CARD}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: BRAND_GREEN, lineHeight: 23 }}>
            อัพโหลดหลักฐานการชำระเงิน
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: TEXT_SECONDARY,
              lineHeight: 18,
              backgroundColor: "rgba(49,151,84,0.1)",
              borderRadius: 12,
              padding: 12,
              marginTop: 8,
            }}
          >
            กรุณาอัพโหลดสลิปหรือหลักฐานการโอนเงินเพื่อให้เราตรวจสอบและดำเนินการจัดส่งสินค้า
          </Text>

          <Pressable
            onPress={handleUpload}
            className="active:opacity-70 items-center justify-center"
            style={{
              marginTop: 16,
              borderWidth: 2,
              borderColor: "#d4d4d8",
              borderStyle: "dashed",
              borderRadius: 16,
              paddingVertical: 32,
            }}
          >
            <Upload size={48} color="#d4d4d8" />
            <Text style={{ fontSize: 14, color: BRAND_GREEN, fontWeight: "500", marginTop: 8, lineHeight: 18 }}>
              เลือกไฟล์รูปภาพ (JPG, PNG)
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky bottom — confirm upload CTA */}
      <SafeAreaView edges={["bottom"]} className="bg-white border-t border-gray-200">
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <Pressable
            onPress={handleUpload}
            className="active:opacity-80 items-center justify-center"
            style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, height: 48 }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700", lineHeight: 18 }}>
              ยืนยันการอัพโหลดสลิป
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
