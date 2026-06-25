import { useEffect, useState, type ReactNode } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Truck, Megaphone, Sparkles, MessageCircle, Wallet,
  ShoppingBag, MessageSquare, Boxes, AlertTriangle, Coins, TrendingUp,
  ShieldCheck, Trash2, Send, type LucideIcon,
} from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { getNotifications } from "../utils/notifications";
import { BRAND_GREEN, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Perm = "granted" | "denied" | "undetermined" | "unavailable";
type Topic = { type: string; Icon: LucideIcon; color: string; label: string; title: string; body: string };

const PERM_LABEL: Record<Perm, { text: string; color: string; bg: string }> = {
  granted: { text: "อนุญาตแล้ว", color: "#15803d", bg: "#dcfce7" },
  denied: { text: "ถูกปฏิเสธ", color: "#b91c1c", bg: "#fee2e2" },
  undetermined: { text: "ยังไม่ได้ขอสิทธิ์", color: "#a16207", bg: "#fef9c3" },
  unavailable: { text: "ไม่พร้อมใช้งาน", color: "#6b7280", bg: "#f3f4f6" },
};

// 1) Customer-facing notifications.
const CUSTOMER_TOPICS: Topic[] = [
  { type: "order", Icon: Truck, color: "#2563eb", label: "อัพเดทสถานะคำสั่งซื้อ", title: "คำสั่งซื้อจัดส่งแล้ว 📦", body: "ORD-20260218-03573 ถูกจัดส่งแล้ว เลขพัสดุ TH123456789" },
  { type: "promo", Icon: Megaphone, color: "#ea580c", label: "โปรโมชั่น", title: "🔥 Flash Sale เริ่มแล้ว!", body: "ลดสูงสุด 50% เฉพาะวันนี้ รีบช้อปก่อนของหมด" },
  { type: "system", Icon: Sparkles, color: "#9333ea", label: "อัพเดทจากเมต้า", title: "มีการลงชื่อเข้าใช้ใหม่ 🔐", body: "ตรวจพบการเข้าสู่ระบบจากอุปกรณ์ใหม่ · หรืออัปเดตเวอร์ชัน/ฟีเจอร์ใหม่" },
  { type: "chat", Icon: MessageCircle, color: "#059669", label: "ข้อความจากร้าน / ซัปพอต", title: "ข้อความจาก METAHERB Store", body: "สินค้าจัดเตรียมเรียบร้อยแล้วค่ะ จะจัดส่งภายในวันนี้" },
  { type: "payment", Icon: Wallet, color: "#0d9488", label: "การเงิน", title: "ชำระเงินสำเร็จ ✅", body: "ชำระเงินสำเร็จ · คืนเงิน ฿250 จากการขอคืนสินค้าเข้าบัญชีแล้ว" },
];

// 2) Seller / shop-facing notifications.
const SELLER_TOPICS: Topic[] = [
  { type: "shop_order", Icon: ShoppingBag, color: "#2563eb", label: "คำสั่งซื้อเข้ามาใหม่", title: "🛒 มีคำสั่งซื้อใหม่!", body: "ลูกค้าสั่งซื้อ 2 รายการ · ยอด ฿1,480 · กดเพื่อเตรียมจัดส่ง" },
  { type: "shop_chat", Icon: MessageSquare, color: "#059669", label: "ข้อความจากลูกค้า / ซัปพอต", title: "ลูกค้าส่งข้อความถึงร้าน", body: "“สินค้ามีสต็อกพร้อมส่งไหมคะ?” — กดเพื่อตอบกลับ" },
  { type: "shop_stock", Icon: Boxes, color: "#d97706", label: "รายงานคลังสินค้า", title: "⚠️ สินค้าใกล้หมด", body: "ขมิ้นชันผง เหลือ 3 ชิ้น · แตะเพื่อเติมสต็อก" },
  { type: "shop_complaint", Icon: AlertTriangle, color: "#dc2626", label: "แจ้งเตือนการร้องเรียน", title: "มีคำร้องเรียนใหม่", body: "ลูกค้าเปิดคำร้องเรียนคำสั่งซื้อ ORD-20260218-03570" },
  { type: "shop_finance", Icon: Coins, color: "#0f766e", label: "การเงิน (เงินเข้า-ออก)", title: "💰 ยอดขายเข้าบัญชี", body: "รับเงิน ฿1,332 จากคำสั่งซื้อที่จัดส่งสำเร็จ" },
  { type: "shop_marketing", Icon: TrendingUp, color: "#db2777", label: "การตลาด & โปรโมชัน", title: "📈 แคมเปญใหม่พร้อมเริ่ม", body: "เข้าร่วม Flash Sale เดือนนี้ เพิ่มโอกาสขายให้ร้านคุณ" },
];

export function NotificationTestScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [perm, setPerm] = useState<Perm>("undetermined");
  const [log, setLog] = useState<string[]>([]);

  const N = getNotifications();
  const available = !!N;
  const addLog = (m: string) => setLog((l) => [m, ...l].slice(0, 6));

  useEffect(() => {
    if (!N) {
      setPerm("unavailable");
      return;
    }
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    N.getPermissionsAsync()
      .then((s) => setPerm(s.granted ? "granted" : (s.status as Perm)))
      .catch(() => {});
  }, [N]);

  const ensure = async (): Promise<boolean> => {
    if (!N) return false;
    const s = await N.getPermissionsAsync();
    if (s.granted) return true;
    const r = await N.requestPermissionsAsync();
    setPerm(r.granted ? "granted" : "denied");
    return r.granted;
  };

  const requestPerm = async () => {
    const ok = await ensure();
    addLog(ok ? "ได้รับสิทธิ์การแจ้งเตือนแล้ว" : "สิทธิ์ถูกปฏิเสธ");
  };

  const sendTopic = async (t: Topic) => {
    if (!N) return;
    if (!(await ensure())) { addLog("ยังไม่มีสิทธิ์ — กดขอสิทธิ์ก่อน"); return; }
    await N.scheduleNotificationAsync({
      content: { title: t.title, body: t.body, sound: true, data: { type: t.type } },
      trigger: null,
    });
    addLog(`ส่งแล้ว: ${t.label}`);
  };

  const clearAll = async () => {
    if (!N) return;
    await N.cancelAllScheduledNotificationsAsync();
    await N.dismissAllNotificationsAsync();
    addLog("ล้างการแจ้งเตือนทั้งหมดแล้ว");
  };

  const badge = PERM_LABEL[perm];

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="ทดสอบการแจ้งเตือน" subtitle="กดหัวข้อเพื่อส่งการแจ้งเตือนตัวอย่าง" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom, gap: 14 }}>
          {/* Permission status */}
          <Card style={{ padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 13, color: TEXT_MUTED }}>สถานะสิทธิ์</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", marginTop: 2 }}>การแจ้งเตือน</Text>
            </View>
            <View style={{ backgroundColor: badge.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: badge.color }}>{badge.text}</Text>
            </View>
          </Card>

          {!available ? (
            <View style={{ backgroundColor: "#fffbeb", borderRadius: 16, borderWidth: 1, borderColor: "#fde68a", padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400e" }}>โมดูลการแจ้งเตือนยังไม่พร้อม</Text>
              <Text style={{ fontSize: 12.5, color: "#a16207", marginTop: 4, lineHeight: 19 }}>
                ต้อง rebuild แอป (dev build) หลังติดตั้ง expo-notifications — ใน Expo Go เวอร์ชันใหม่รองรับเฉพาะการแจ้งเตือนในเครื่อง (local)
              </Text>
            </View>
          ) : null}

          <TopicGroup title="1. การแจ้งเตือนลูกค้า" topics={CUSTOMER_TOPICS} onSend={sendTopic} disabled={!available} />
          <TopicGroup title="2. การแจ้งเตือนของร้านค้า" topics={SELLER_TOPICS} onSend={sendTopic} disabled={!available} />

          {/* Tools */}
          <View>
            <Text style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 8, marginLeft: 4 }}>เครื่องมือ</Text>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <ToolRow Icon={ShieldCheck} label="ขอสิทธิ์การแจ้งเตือน" onPress={requestPerm} disabled={!available} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0", marginLeft: 52 }} />
              <ToolRow Icon={Trash2} label="ล้างการแจ้งเตือนที่ตั้งไว้" onPress={clearAll} disabled={!available} danger />
            </Card>
          </View>

          {/* Log */}
          {log.length ? (
            <Card style={{ padding: 14, gap: 6 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: TEXT_MUTED, marginBottom: 2 }}>บันทึกล่าสุด</Text>
              {log.map((l, i) => (
                <Text key={i} style={{ fontSize: 12.5, color: i === 0 ? "#0a0a0a" : TEXT_SECONDARY }}>• {l}</Text>
              ))}
            </Card>
          ) : null}

          <Text style={{ fontSize: 11.5, color: TEXT_MUTED, textAlign: "center", lineHeight: 17, marginTop: 2 }}>
            แตะหัวข้อเพื่อส่งทันที · ลองสลับไปแอปอื่น/ล็อกสกรีนเพื่อดูการแจ้งเตือน
          </Text>
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>
    </View>
  );
}

function TopicGroup({ title, topics, onSend, disabled }: { title: string; topics: Topic[]; onSend: (t: Topic) => void; disabled?: boolean }) {
  return (
    <View>
      <Text style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 8, marginLeft: 4 }}>{title}</Text>
      <Card style={{ padding: 0, overflow: "hidden", opacity: disabled ? 0.5 : 1 }}>
        {topics.map((t, i) => (
          <View key={t.type}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0", marginLeft: 64 }} /> : null}
            <Pressable onPress={() => onSend(t)} disabled={disabled} className="flex-row items-center active:opacity-60" style={{ minHeight: 60, paddingHorizontal: 14, paddingVertical: 10, gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.color + "1a", alignItems: "center", justifyContent: "center" }}>
                <t.Icon size={20} color={t.color} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#0a0a0a" }}>{t.label}</Text>
                <Text numberOfLines={1} style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }}>{t.title}</Text>
              </View>
              <Send size={17} color={BRAND_GREEN} strokeWidth={2.2} />
            </Pressable>
          </View>
        ))}
      </Card>
    </View>
  );
}

function ToolRow({ Icon, label, onPress, disabled, danger }: { Icon: LucideIcon; label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  const tint = danger ? "#b91c1c" : BRAND_GREEN;
  return (
    <Pressable onPress={onPress} disabled={disabled} className="flex-row items-center active:opacity-60" style={{ height: 54, paddingHorizontal: 16, gap: 12, opacity: disabled ? 0.5 : 1 }}>
      <Icon size={20} color={tint} strokeWidth={2.2} />
      <Text style={{ flex: 1, fontSize: 15, color: danger ? "#b91c1c" : "#0a0a0a" }}>{label}</Text>
    </Pressable>
  );
}

function Card({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View style={[{ backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16 }, style]}>
      {children}
    </View>
  );
}
