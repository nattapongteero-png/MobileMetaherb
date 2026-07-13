import { GLASS_BAR_TINT } from "../theme/tokens";
import { useState, type ReactNode } from "react";
import { View, Text, Pressable, Image, ScrollView, Linking, Modal, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import {
  FileText,
  Package,
  ClipboardList,
  Camera,
  Mail,
  Phone,
  Play,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { GlassView } from "expo-glass-effect";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { BottomFade } from "../components/BottomFade";
import { StatusPill } from "./ShopComplaintsView";
import { COMPLAINT_TYPES } from "../data/complaintTypes";
import { STATUS_LABEL, STATUS_COLOR, TYPE_LABEL, TYPE_COLOR } from "../data/shopComplaints";
import { useComplaints } from "../context/ComplaintContext";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";
import { appWidth } from "../theme/layout";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, "ShopComplaintDetail">;

// Full-bleed white section (mirrors the order-detail page).
function Section({ title, Icon, children }: { title?: string; Icon?: LucideIcon; children: ReactNode }) {
  return (
    <View className="bg-white" style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      {title ? (
        <View className="flex-row items-center" style={{ gap: 6, marginBottom: 12 }}>
          {Icon ? <Icon size={18} color={BRAND_GREEN} /> : null}
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a", lineHeight: 20 }}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

function Field({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ fontSize: 12, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "500", color: valueColor ?? "#0a0a0a", lineHeight: 20 }}>{value}</Text>
    </View>
  );
}

/** เรื่องร้องเรียน — owner detail subpage (decision + reply). */
export function ShopComplaintDetailScreen() {
  const nav = useNavigation<Nav>();
  const { id } = useRoute<DetailRoute>().params;
  const insets = useSafeAreaInsets();
  const { complaints } = useComplaints();
  const c = complaints.find((x) => x.id === id);

  // Hooks must run on every render — declare before any early return.
  const [viewer, setViewer] = useState<number | null>(null);
  const screenW = appWidth();

  if (!c) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
        <StatusBar style="dark" />
        <SubPageHeader title="เรื่องร้องเรียน" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
        <View style={{ alignItems: "center", paddingTop: 80 }}>
          <Text style={{ fontSize: 14, color: TEXT_MUTED }}>ไม่พบคำร้องเรียนนี้</Text>
        </View>
      </View>
    );
  }

  const TypeIcon = COMPLAINT_TYPES[c.type].Icon;
  const tc = TYPE_COLOR[c.type];

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={c.id}
        subtitle={`ส่งคำร้องเมื่อ ${c.createdAt}`}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <GlassIconButton onPress={() => Linking.openURL(`mailto:${c.customerEmail}`)} accessibilityLabel="ส่งอีเมลหาลูกค้า">
              <Mail size={19} color="#0088ff" strokeWidth={2.2} />
            </GlassIconButton>
            <GlassIconButton onPress={() => Linking.openURL(`tel:${c.customerPhone}`)} accessibilityLabel="โทรหาลูกค้า">
              <Phone size={19} color={BRAND_GREEN} strokeWidth={2.2} />
            </GlassIconButton>
          </View>
        }
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
          {/* Status summary */}
          <Section>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: tc + "1a", alignItems: "center", justifyContent: "center" }}>
                <TypeIcon size={19} color={tc} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{TYPE_LABEL[c.type]}</Text>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>{c.orderId}</Text>
              </View>
              <StatusPill status={c.status} />
            </View>
          </Section>

          {/* Decision result — appears once the shop has decided */}
          {c.status !== "pending" ? (
            <Section title="ผลการตัดสิน" Icon={ClipboardList}>
              <View style={{ gap: 12 }}>
                <View
                  className="flex-row items-center"
                  style={{ gap: 10, backgroundColor: STATUS_COLOR[c.status] + "14", borderRadius: 14, padding: 12 }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: STATUS_COLOR[c.status] + "22", alignItems: "center", justifyContent: "center" }}>
                    <ClipboardList size={17} color={STATUS_COLOR[c.status]} strokeWidth={2.2} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "700", color: STATUS_COLOR[c.status] }}>
                    {STATUS_LABEL[c.status]}
                  </Text>
                </View>
                {c.status === "refund_full" || c.status === "refund_partial" ? (
                  <View className="flex-row items-center justify-between">
                    <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ยอดคืนเงิน</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: BRAND_GREEN_DARK }}>
                      ฿{(c.refundAmount ?? c.amount).toLocaleString()}
                    </Text>
                  </View>
                ) : null}
                {c.note ? (
                  <View>
                    <Text style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 6 }}>หมายเหตุถึงลูกค้า</Text>
                    <View style={{ backgroundColor: "#f7f7f7", borderRadius: 12, padding: 12 }}>
                      <Text style={{ fontSize: 13, color: "#333", lineHeight: 20 }}>{c.note}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </Section>
          ) : null}

          {/* Complaint info */}
          <Section title="รายละเอียดคำร้องเรียน" Icon={FileText}>
            <View style={{ gap: 14 }}>
              <Field label="เลขที่คำสั่งซื้อ" value={c.orderId} />
              <Field label="ลูกค้า" value={c.customer} />
              <Field label="อีเมล" value={c.customerEmail} />
              <Field label="เบอร์ติดต่อ" value={c.customerPhone} />
              <View>
                <Text style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 6 }}>รายละเอียดปัญหา</Text>
                <View style={{ backgroundColor: "#f7f7f7", borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 13, color: "#333", lineHeight: 20 }}>{c.description}</Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between" style={{ borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 14 }}>
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ยอดขอคืนเงิน</Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: BRAND_GREEN_DARK }}>฿{(c.refundAmount ?? c.amount).toLocaleString()}</Text>
              </View>
              <Field label="ช่องทางคืนเงิน" value={c.refundChannel} />
            </View>
          </Section>

          {/* Evidence */}
          <Section title={`หลักฐานประกอบ (${c.evidence.length})`} Icon={Camera}>
            <View className="flex-row" style={{ flexWrap: "wrap", gap: 8 }}>
              {c.evidence.map((e, i) => (
                <Pressable key={i} onPress={() => setViewer(i)} className="active:opacity-80" style={{ width: 96, height: 96, borderRadius: 10, overflow: "hidden", backgroundColor: "#f3f3f3" }}>
                  <Image source={e.source} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  {e.video ? (
                    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.22)" }}>
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
                        <Play size={15} color="#fff" fill="#fff" />
                      </View>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </Section>

          {/* Items */}
          <Section title={`สินค้าที่เกี่ยวข้อง (${c.items.length})`} Icon={Package}>
            <View style={{ gap: 14 }}>
              {c.items.map((it, i) => (
                <View key={i} className="flex-row items-center" style={{ gap: 12 }}>
                  <Image source={it.image} style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13.5, color: "#0a0a0a", fontWeight: "500" }}>{it.name}</Text>
                    {it.option ? <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 3 }}>{it.option}</Text> : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>฿{(it.price * it.qty).toLocaleString()}</Text>
                    <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>x{it.qty}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Section>

        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16 }} />
        <BottomFade />
      </View>

      {/* Floating Liquid Glass bar — decide CTA; gone once a decision is made */}
      {c.status === "pending" ? (
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
        <View
          style={{
            borderRadius: 34,
            shadowColor: "#0a3d22",
            shadowOffset: { width: 0, height: 9 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 14,
          }}
        >
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            tintColor={GLASS_BAR_TINT}
            style={{ borderRadius: 34, overflow: "hidden", height: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}
          >
            <Pressable
              onPress={() => nav.navigate("ComplaintDecide", { complaintId: c.id })}
              className="flex-row items-center justify-center active:opacity-90"
              style={{ flex: 1, height: 50, borderRadius: 999, backgroundColor: BRAND_GREEN, gap: 8 }}
            >
              <ClipboardList size={18} color="#fff" strokeWidth={2.4} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>ตัดสินคำร้องเรียน</Text>
            </Pressable>
          </GlassView>
        </View>
      </View>
      ) : null}

      {/* Full-screen evidence viewer — swipe through, tap ✕ to close */}
      <Modal visible={viewer !== null} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.96)" }}>
          <Pressable onPress={() => setViewer(null)} hitSlop={10} style={{ position: "absolute", top: insets.top + 8, right: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
            <X size={22} color="#fff" strokeWidth={2.4} />
          </Pressable>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: (viewer ?? 0) * screenW, y: 0 }}>
            {c.evidence.map((e, i) => (
              <View key={i} style={{ width: screenW, height: "100%", alignItems: "center", justifyContent: "center" }}>
                <Image source={e.source} style={{ width: screenW, height: screenW }} resizeMode="contain" />
                {e.video ? (
                  <View style={{ position: "absolute", width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
                    <Play size={26} color="#fff" fill="#fff" />
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
          {c.evidence.length > 1 ? (
            <View style={{ position: "absolute", bottom: insets.bottom + 20, left: 0, right: 0, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>เลื่อนเพื่อดูภาพถัดไป ({c.evidence.length} ภาพ)</Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
