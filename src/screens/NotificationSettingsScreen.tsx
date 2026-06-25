import { useState } from "react";
import { View, Text, ScrollView, Switch } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";

type Key = "push" | "order" | "promo" | "chat" | "news";

function ToggleRow({ label, desc, value, onValueChange, disabled }: {
  label: string; desc: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: disabled ? 0.45 : 1 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14.5, color: "#0a0a0a", fontWeight: "500" }}>{label}</Text>
        <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2, lineHeight: 17 }}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: BRAND_GREEN, false: "#e5e7eb" }}
        thumbColor="#fff"
        ios_backgroundColor="#e5e7eb"
      />
    </View>
  );
}

export function NotificationSettingsScreen() {
  const nav = useNavigation();
  const [s, setS] = useState<Record<Key, boolean>>({ push: true, order: true, promo: true, chat: true, news: false });
  const set = (k: Key) => (v: boolean) => setS((prev) => ({ ...prev, [k]: v }));
  const off = !s.push; // master off disables the categories

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="การแจ้งเตือน" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* Master */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16 }}>
            <ToggleRow label="การแจ้งเตือนแบบ Push" desc="รับการแจ้งเตือนบนอุปกรณ์นี้" value={s.push} onValueChange={set("push")} />
          </View>

          {/* Categories */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingTop: 6 }}>
            <Text style={{ fontSize: 12.5, color: TEXT_MUTED, fontWeight: "600", marginTop: 8 }}>หมวดหมู่การแจ้งเตือน</Text>
            <ToggleRow label="คำสั่งซื้อและการจัดส่ง" desc="อัปเดตสถานะออเดอร์ การชำระเงิน และการจัดส่ง" value={s.order} onValueChange={set("order")} disabled={off} />
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
            <ToggleRow label="โปรโมชันและส่วนลด" desc="ดีล Flash Sale คูปอง และข้อเสนอพิเศษ" value={s.promo} onValueChange={set("promo")} disabled={off} />
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
            <ToggleRow label="ข้อความแชท" desc="เมื่อร้านค้าตอบกลับข้อความ" value={s.chat} onValueChange={set("chat")} disabled={off} />
            <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
            <ToggleRow label="ข่าวสารและอัปเดต" desc="สาระน่ารู้ สินค้าใหม่ และข่าวจาก METAHERB" value={s.news} onValueChange={set("news")} disabled={off} />
          </View>

          <Text style={{ fontSize: 11.5, color: TEXT_MUTED, paddingHorizontal: 16, marginTop: 14, lineHeight: 17 }}>
            การตั้งค่านี้ใช้กับอุปกรณ์เครื่องนี้ คุณสามารถเปลี่ยนแปลงได้ตลอดเวลา
          </Text>
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>
    </View>
  );
}
