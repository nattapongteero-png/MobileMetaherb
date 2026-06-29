import { useState } from "react";
import { View, Text, ScrollView, Switch, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ShoppingCart,
  Wallet,
  Package,
  MessageCircle,
  Megaphone,
  ShieldCheck,
  Bell,
  Mail,
  Smartphone,
  type LucideIcon,
} from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/* ========== Types ========== */
type NotifChannel = "inApp" | "email" | "sms";
interface NotifItem {
  key: string;
  label: string;
  desc: string;
  enabled: boolean;
  channels: Record<NotifChannel, boolean>;
}
interface NotifCategory {
  id: string;
  label: string;
  desc: string;
  Icon: LucideIcon;
  color: string;
  items: NotifItem[];
}

const CHANNELS: { key: NotifChannel; label: string; Icon: LucideIcon }[] = [
  { key: "inApp", label: "ในแอป", Icon: Bell },
  { key: "email", label: "อีเมล", Icon: Mail },
  { key: "sms", label: "SMS", Icon: Smartphone },
];

/* Ported from the web SettingsPage shop notification categories. */
const INITIAL_CATEGORIES: NotifCategory[] = [
  {
    id: "orders", label: "คำสั่งซื้อ", desc: "การแจ้งเตือนที่เกี่ยวกับออเดอร์ของลูกค้า",
    Icon: ShoppingCart, color: "#319754",
    items: [
      { key: "order_new", label: "คำสั่งซื้อใหม่", desc: "เมื่อมีลูกค้าสั่งซื้อสินค้าใหม่", enabled: true, channels: { inApp: true, email: true, sms: true } },
      { key: "order_status", label: "สถานะคำสั่งซื้อเปลี่ยน", desc: "เมื่อสถานะออเดอร์มีการเปลี่ยนแปลง", enabled: true, channels: { inApp: true, email: false, sms: false } },
      { key: "order_cancel", label: "ออเดอร์ยกเลิก", desc: "เมื่อลูกค้าหรือร้านยกเลิกออเดอร์", enabled: true, channels: { inApp: true, email: true, sms: false } },
      { key: "order_complete", label: "ออเดอร์สำเร็จ", desc: "เมื่อลูกค้าได้รับสินค้าและปิดออเดอร์", enabled: false, channels: { inApp: true, email: false, sms: false } },
    ],
  },
  {
    id: "finance", label: "การเงิน", desc: "การแจ้งเตือนที่เกี่ยวกับยอดเงินในบัญชี",
    Icon: Wallet, color: "#0088ff",
    items: [
      { key: "fin_release", label: "ปล่อยยอดเข้าบัญชี", desc: "เมื่อยอด Escrow ถูกปล่อยเข้ายอดพร้อมถอน", enabled: true, channels: { inApp: true, email: true, sms: false } },
      { key: "fin_withdraw", label: "ถอนเงินสำเร็จ", desc: "เมื่อการถอนเงินเข้าบัญชีธนาคารเสร็จสมบูรณ์", enabled: true, channels: { inApp: true, email: true, sms: true } },
      { key: "fin_fee", label: "ค่าธรรมเนียม GP", desc: "เมื่อมีการเรียกเก็บค่าธรรมเนียม", enabled: false, channels: { inApp: true, email: false, sms: false } },
    ],
  },
  {
    id: "inventory", label: "สต็อกสินค้า", desc: "การแจ้งเตือนเกี่ยวกับสต็อกและสินค้า",
    Icon: Package, color: "#9747ff",
    items: [
      { key: "inv_low", label: "สินค้าใกล้หมด", desc: "เมื่อสินค้าเหลือต่ำกว่าจำนวนที่กำหนด (10 ชิ้น)", enabled: true, channels: { inApp: true, email: true, sms: false } },
      { key: "inv_out", label: "สินค้าหมดสต็อก", desc: "เมื่อสินค้าหมดสต็อกอย่างสมบูรณ์", enabled: true, channels: { inApp: true, email: true, sms: true } },
      { key: "inv_flash_end", label: "Flash Sale สิ้นสุด", desc: "เมื่อแคมเปญ Flash Sale ใกล้/สิ้นสุด", enabled: true, channels: { inApp: true, email: false, sms: false } },
    ],
  },
  {
    id: "customer", label: "ลูกค้า", desc: "การโต้ตอบกับลูกค้า — ข้อความ รีวิว ร้องเรียน",
    Icon: MessageCircle, color: "#ff9500",
    items: [
      { key: "cus_message", label: "ข้อความแชทใหม่", desc: "เมื่อลูกค้าส่งข้อความเข้ามาในแชท", enabled: true, channels: { inApp: true, email: false, sms: false } },
      { key: "cus_review", label: "รีวิวสินค้าใหม่", desc: "เมื่อลูกค้ารีวิวสินค้าหลังได้รับ", enabled: true, channels: { inApp: true, email: true, sms: false } },
      { key: "cus_complaint", label: "การร้องเรียนใหม่", desc: "เมื่อลูกค้าส่งคำร้องเรียน (refund/damaged)", enabled: true, channels: { inApp: true, email: true, sms: true } },
    ],
  },
  {
    id: "marketing", label: "การตลาด & โปรโมชัน", desc: "การแจ้งเตือนแคมเปญและคูปอง",
    Icon: Megaphone, color: "#e62e05",
    items: [
      { key: "mkt_promo_end", label: "โปรโมชันสิ้นสุด", desc: "เมื่อโปรโมชันใกล้/สิ้นสุดเวลา", enabled: false, channels: { inApp: true, email: false, sms: false } },
      { key: "mkt_coupon_end", label: "คูปองหมดอายุ", desc: "เมื่อคูปองในระบบใกล้หมดอายุ (3 วัน)", enabled: false, channels: { inApp: true, email: false, sms: false } },
      { key: "mkt_top_product", label: "สินค้าขายดี", desc: "เมื่อสินค้าของคุณติด Top 10 ในหมวด", enabled: true, channels: { inApp: true, email: true, sms: false } },
    ],
  },
  {
    id: "system", label: "ระบบ & ความปลอดภัย", desc: "การแจ้งเตือนเกี่ยวกับระบบและบัญชี",
    Icon: ShieldCheck, color: "#737373",
    items: [
      { key: "sys_update", label: "อัปเดตระบบ", desc: "เมื่อมีการอัปเดตหรือฟีเจอร์ใหม่", enabled: true, channels: { inApp: true, email: false, sms: false } },
      { key: "sys_maint", label: "การบำรุงรักษาระบบ", desc: "แจ้งล่วงหน้าก่อนปิดปรับปรุงระบบ", enabled: true, channels: { inApp: true, email: true, sms: false } },
      { key: "sys_security", label: "ความปลอดภัยบัญชี", desc: "เข้าสู่ระบบจากอุปกรณ์ใหม่ / เปลี่ยนรหัสผ่าน", enabled: true, channels: { inApp: true, email: true, sms: true } },
    ],
  },
];

/* A toggleable channel pill — solid green when on, grey outline when off. */
function ChannelChip({ label, Icon, on, onPress }: { label: string; Icon: LucideIcon; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:opacity-70"
      style={{ gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: on ? BRAND_GREEN : "#f5f5f5", borderWidth: on ? 0 : 1, borderColor: "#e5e7eb" }}
    >
      <Icon size={12} color={on ? "#fff" : "#9ca3af"} strokeWidth={2.4} />
      <Text style={{ fontSize: 11.5, fontWeight: "600", color: on ? "#fff" : "#9ca3af" }}>{label}</Text>
    </Pressable>
  );
}

/** ตั้งค่าการแจ้งเตือนของร้านค้า — หมวด → รายการ → ช่องทาง (ในแอป/อีเมล/SMS), web-faithful. */
export function ShopNotificationsScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [cats, setCats] = useState<NotifCategory[]>(INITIAL_CATEGORIES);

  const toggleItem = (catId: string, key: string) =>
    setCats((prev) => prev.map((c) => (c.id === catId ? { ...c, items: c.items.map((it) => (it.key === key ? { ...it, enabled: !it.enabled } : it)) } : c)));
  const toggleChannel = (catId: string, key: string, ch: NotifChannel) =>
    setCats((prev) => prev.map((c) => (c.id === catId ? { ...c, items: c.items.map((it) => (it.key === key ? { ...it, channels: { ...it.channels, [ch]: !it.channels[ch] } } : it)) } : c)));

  const allItems = cats.flatMap((c) => c.items);
  const enabledCount = allItems.filter((i) => i.enabled).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="การแจ้งเตือน" subtitle="เลือกเรื่องและช่องทางที่จะรับแจ้งเตือน" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {/* Summary */}
          <View className="bg-white" style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Bell size={20} color={BRAND_GREEN} strokeWidth={2.1} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>{`เปิดอยู่ ${enabledCount} จาก ${allItems.length} รายการ`}</Text>
              <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }}>แตะชิปเพื่อเลือกช่องทาง: ในแอป · อีเมล · SMS</Text>
            </View>
          </View>

          {cats.map((cat) => (
            <View key={cat.id} className="bg-white" style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
              {/* Category header */}
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${cat.color}1a`, alignItems: "center", justifyContent: "center" }}>
                  <cat.Icon size={20} color={cat.color} strokeWidth={2.1} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{cat.label}</Text>
                  <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>{cat.desc}</Text>
                </View>
              </View>

              {/* Items */}
              {cat.items.map((item) => (
                <View key={item.key}>
                  <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />
                  <View className="flex-row items-start justify-between" style={{ gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#0a0a0a" }}>{item.label}</Text>
                      <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2, lineHeight: 17 }}>{item.desc}</Text>
                    </View>
                    <Switch
                      value={item.enabled}
                      onValueChange={() => toggleItem(cat.id, item.key)}
                      trackColor={{ false: "#d1d5db", true: BRAND_GREEN }}
                      thumbColor="#fff"
                    />
                  </View>
                  {item.enabled ? (
                    <View className="flex-row" style={{ gap: 8, marginTop: 10 }}>
                      {CHANNELS.map((ch) => (
                        <ChannelChip
                          key={ch.key}
                          label={ch.label}
                          Icon={ch.Icon}
                          on={item.channels[ch.key]}
                          onPress={() => toggleChannel(cat.id, item.key, ch.key)}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>
    </View>
  );
}
