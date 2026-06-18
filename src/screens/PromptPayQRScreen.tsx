import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system/legacy";
import { Clock, Download } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";
import { promptPayPayload, MERCHANT_PROMPTPAY, MERCHANT_NAME } from "../utils/promptpay";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const PROMPTPAY_BLUE = "#003d7a";
const EXPIRE_SECONDS = 15 * 60;

const fmtClock = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const fmtPhone = (p: string) => p.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");

export function PromptPayQRScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { total, orderId } = useRoute<RouteProp<RootStackParamList, "PromptPayQR">>().params;

  const payload = useMemo(() => promptPayPayload(MERCHANT_PROMPTPAY, total), [total]);
  const [left, setLeft] = useState(EXPIRE_SECONDS);

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  const saveQR = () => {
    const ref = qrRef.current;
    if (!ref || saving) return;
    // QRCode renders a base64 PNG via its ref; write it to a file then open the
    // share sheet (where "Save Image" stores it to Photos) — no native module
    // beyond expo-file-system, so it works in Expo Go.
    ref.toDataURL(async (base64: string) => {
      try {
        setSaving(true);
        const uri = `${FileSystem.cacheDirectory}promptpay-${orderId}.png`;
        await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
        await Share.share({ url: uri, message: `QR พร้อมเพย์ • คำสั่งซื้อ ${orderId}` });
      } catch {
        Alert.alert("บันทึกไม่สำเร็จ", "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <SubPageHeader
        title="ชำระเงินพร้อมเพย์"
        subtitle="สแกน QR ด้วยแอปธนาคาร"
        onBack={() => nav.goBack()}
        showSearch={false}
      />

      <ScrollView contentContainerStyle={{ padding: 20, alignItems: "center", paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* QR card */}
        <View
          style={{
            width: "100%",
            backgroundColor: "#fff",
            borderRadius: 24,
            alignItems: "center",
            paddingBottom: 22,
            overflow: "hidden",
            shadowColor: "#0a3d22",
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          {/* PromptPay brand strip */}
          <View style={{ width: "100%", backgroundColor: PROMPTPAY_BLUE, paddingVertical: 12, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 }}>
              พร้อมเพย์ <Text style={{ color: "#9fd3ff" }}>PromptPay</Text>
            </Text>
          </View>

          <View style={{ padding: 22, alignItems: "center" }}>
            <View style={{ padding: 12, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#eee" }}>
              <QRCode value={payload} size={216} getRef={(c) => (qrRef.current = c)} />
            </View>

            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a", marginTop: 18 }}>{MERCHANT_NAME}</Text>
            <Text style={{ fontSize: 13, color: "#737373", marginTop: 2 }}>{fmtPhone(MERCHANT_PROMPTPAY)}</Text>

            <View style={{ height: 1, backgroundColor: "#f0f0f0", alignSelf: "stretch", marginVertical: 16 }} />

            <Text style={{ fontSize: 13, color: "#737373" }}>ยอดที่ต้องชำระ</Text>
            <Text style={{ fontSize: 34, fontWeight: "800", color: BRAND_GREEN_DARK, marginTop: 2 }}>
              ฿{total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Save QR */}
        <Pressable
          onPress={saveQR}
          disabled={saving}
          className="flex-row items-center justify-center active:opacity-70"
          style={{ marginTop: 16, height: 46, borderRadius: 999, borderWidth: 1.5, borderColor: BRAND_GREEN, paddingHorizontal: 22, gap: 8 }}
        >
          <Download size={18} color={BRAND_GREEN} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: BRAND_GREEN }}>
            {saving ? "กำลังบันทึก…" : "บันทึก QR code"}
          </Text>
        </Pressable>

        {/* Countdown */}
        <View className="flex-row items-center" style={{ gap: 6, marginTop: 16 }}>
          <Clock size={15} color="#ee4d2d" strokeWidth={2.4} />
          <Text style={{ fontSize: 13, color: "#ee4d2d", fontWeight: "600" }}>
            QR หมดอายุใน {fmtClock(left)}
          </Text>
        </View>

        {/* How-to */}
        <View style={{ marginTop: 18, alignSelf: "stretch", gap: 8, backgroundColor: "rgba(49,151,84,0.06)", borderRadius: 16, padding: 16 }}>
          {[
            "เปิดแอปธนาคารหรือแอปพร้อมเพย์",
            "สแกน QR Code นี้",
            "ตรวจสอบชื่อผู้รับและยอดเงินให้ถูกต้อง",
            "ยืนยันการชำระเงิน",
          ].map((step, i) => (
            <View key={i} className="flex-row items-center" style={{ gap: 10 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: "#404040" }}>{step}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 14 }}>หมายเลขคำสั่งซื้อ {orderId}</Text>
      </ScrollView>

      {/* Bottom actions */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12, gap: 6, backgroundColor: "#fafafa" }}>
        <Pressable
          onPress={() =>
            nav.navigate("PaymentSuccess", {
              orderId,
              total,
              methodLabel: "พร้อมเพย์ PromptPay",
              methodDesc: "ชำระผ่าน QR Code",
            })
          }
          className="active:opacity-80 items-center justify-center"
          style={{ height: 52, borderRadius: 999, backgroundColor: BRAND_GREEN }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>ฉันชำระเงินแล้ว</Text>
        </Pressable>
        <Pressable onPress={() => nav.goBack()} className="active:opacity-60 items-center justify-center" style={{ height: 44 }}>
          <Text style={{ fontSize: 14, color: "#737373" }}>ยกเลิก</Text>
        </Pressable>
      </View>
    </View>
  );
}
