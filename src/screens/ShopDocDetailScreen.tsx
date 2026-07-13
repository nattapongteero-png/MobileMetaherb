import { View, Text, Image, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronRight, ClipboardList, Download, FileCheck2, FileText, MessageCircle, User, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { BottomFade } from "../components/BottomFade";
import { showToast } from "../components/Toast";
import { sendQuote } from "../store/quotes";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";
import {
  DOC_STATUS,
  docLineTotal,
  docSubtotal,
  findPoDoc,
  matImg,
  type DocKind,
  type MarketDoc,
} from "./MyShopScreen";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const KIND_ICON: Record<DocKind, LucideIcon> = { qt: FileText, pr: ClipboardList, po: FileCheck2 };
const KIND_STATUS_TITLE: Record<DocKind, string> = {
  qt: "สถานะใบเสนอราคา",
  pr: "สถานะใบขอสั่งซื้อ",
  po: "สถานะใบสั่งซื้อ",
};

// Same section / row language as the customer B2BDocDetailScreen.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", marginBottom: 12 }}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 13.5, color: "#0a0a0a", fontWeight: "500", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

/**
 * Full PR / PO / Quotation detail (seller side) — same page structure as the
 * customer B2BDocDetailScreen: SubPageHeader (id + date + download), status
 * banner, ข้อมูลบริษัท → รายการสินค้า → ผู้ติดต่อ → ข้อมูลเอกสาร sections.
 */
export function ShopDocDetailScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { doc, kind } = useRoute<RouteProp<RootStackParamList, "ShopDocDetail">>().params;

  const Icon = KIND_ICON[kind];
  const badge = DOC_STATUS[kind][doc.status] ?? { label: doc.status, color: BRAND_GREEN };
  const total = docSubtotal(doc);
  const days = doc.daysRemaining ?? 0;
  const poDoc = findPoDoc(kind === "qt" ? doc.poNumber : kind === "pr" ? doc.refId : undefined);

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={doc.id}
        subtitle={doc.date}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={
          <GlassIconButton onPress={() => showToast("กำลังเตรียมเอกสาร...")} accessibilityLabel="โหลดเอกสาร">
            <Download size={20} color={BRAND_GREEN} strokeWidth={2.2} />
          </GlassIconButton>
        }
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {/* Status banner — same language as the customer doc detail */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: badge.color + "1a", alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} color={badge.color} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>{KIND_STATUS_TITLE[kind]}</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: badge.color, marginTop: 1 }}>{badge.label}</Text>
              </View>
            </View>
          </View>

          {/* Company info — before the item list */}
          <Section title="ข้อมูลบริษัท">
            <InfoRow label="ชื่อบริษัท / นิติบุคคล" value={doc.company} />
            {doc.taxId ? <InfoRow label="เลขประจำตัวผู้เสียภาษี" value={doc.taxId} /> : null}
            <View style={{ paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>ที่อยู่บริษัท</Text>
              <Text style={{ fontSize: 13.5, color: "#0a0a0a", lineHeight: 20 }}>{doc.address}</Text>
            </View>
          </Section>

          {/* PR request info */}
          {kind === "pr" ? (
            <Section title="ข้อมูลใบขอสั่งซื้อ">
              {doc.priority ? <InfoRow label="ความเร่งด่วน" value={doc.priority} /> : null}
              {doc.needBy ? <InfoRow label="วันที่ต้องการ" value={doc.needBy} /> : null}
              {doc.validityDays ? <InfoRow label="ระยะเวลาใบ PR" value={`${doc.validityDays} วัน`} /> : null}
              {doc.approver ? <InfoRow label="ผู้อนุมัติ" value={doc.approver} /> : null}
              {doc.description ? (
                <View style={{ paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>รายละเอียด (Description)</Text>
                  <Text style={{ fontSize: 13.5, color: "#0a0a0a", lineHeight: 20 }}>{doc.description}</Text>
                </View>
              ) : null}
              {doc.justification ? (
                <View style={{ paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>เหตุผลในการขออนุมัติ (Justification)</Text>
                  <Text style={{ fontSize: 13.5, color: "#0a0a0a", lineHeight: 20 }}>{doc.justification}</Text>
                </View>
              ) : null}
            </Section>
          ) : null}

          {/* Items */}
          <Section title={`รายการสินค้า (${doc.items.length})`}>
            <View style={{ gap: 14 }}>
              {doc.items.map((item, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", backgroundColor: "#f0f0f0" }}>
                    <Image source={matImg(item.name)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }} numberOfLines={2}>{item.name}</Text>
                    <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>เกรด: {item.grade}</Text>
                    <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>
                      {item.qty.toLocaleString()} {item.unit} × ฿{item.pricePerUnit.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>฿{docLineTotal(item).toLocaleString()}</Text>
                </View>
              ))}
            </View>
            <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 14 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>ยอดรวมทั้งสิ้น</Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: BRAND_GREEN }}>฿{total.toLocaleString()}</Text>
            </View>
          </Section>

          {/* Contact — after the item list, like the customer detail */}
          <Section title="ผู้ติดต่อ">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(49,151,84,0.10)", alignItems: "center", justifyContent: "center" }}>
                <User size={18} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: TEXT_MUTED }}>ผู้ขอ</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a", marginTop: 1 }}>{doc.contact}</Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: "#f0f0f0", marginBottom: 6 }} />
            <InfoRow label="เบอร์โทร" value={doc.phone} />
            {doc.email ? <InfoRow label="Email" value={doc.email} /> : null}
          </Section>

          {/* Document info */}
          <Section title="ข้อมูลเอกสาร">
            {kind === "qt" ? (
              <>
                <InfoRow label="วันที่เสนอ" value={doc.date} />
                {doc.validUntil ? <InfoRow label="มีผลถึง" value={doc.validUntil} /> : null}
                <InfoRow label="คงเหลือ" value={days <= 0 ? "หมดอายุแล้ว" : `${days} วัน`} />
              </>
            ) : null}
            {kind === "po" ? (
              <>
                <InfoRow label="วันที่สั่งซื้อ" value={doc.date} />
                {doc.needBy ? <InfoRow label="กำหนดส่ง" value={doc.needBy} /> : null}
                {doc.shippingMethod ? <InfoRow label="วิธีจัดส่ง" value={doc.shippingMethod} /> : null}
                {doc.trackingNumber ? <InfoRow label="เลขพัสดุ" value={doc.trackingNumber} /> : null}
              </>
            ) : null}
            <InfoRow label="เงื่อนไขชำระเงิน" value={doc.paymentTerms} />

            {/* Linked PO — tappable, pushes the PO detail (customer pattern) */}
            {poDoc ? (
              <Pressable
                onPress={() => nav.push("ShopDocDetail", { doc: poDoc, kind: "po" })}
                className="active:opacity-70"
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}
              >
                <Text style={{ fontSize: 13, color: TEXT_MUTED }}>{kind === "qt" ? "แปลงเป็นใบสั่งซื้อ" : "ออกเป็นใบสั่งซื้อ"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN }}>{poDoc.id}</Text>
                  <ChevronRight size={16} color={BRAND_GREEN} strokeWidth={2.4} />
                </View>
              </Pressable>
            ) : null}

            {doc.note ? (
              <View style={{ paddingVertical: 6 }}>
                <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>หมายเหตุ</Text>
                <Text style={{ fontSize: 13.5, color: "#0a0a0a", lineHeight: 20 }}>{doc.note}</Text>
              </View>
            ) : null}
          </Section>

          {/* Actions — price the RFQ, then contact the requester */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16, gap: 10 }}>
            {kind === "qt" && doc.status === "requested" ? (
              <Pressable
                onPress={() => {
                  // Prices stand as requested; validity 14 days. The buyer's
                  // B2BDocs page flips from "รอร้านเสนอราคา" to "ได้รับใบเสนอราคา".
                  if (sendQuote(doc.id, { validDays: 14 })) {
                    showToast("ส่งใบเสนอราคาให้ลูกค้าแล้ว");
                    nav.goBack();
                  }
                }}
                className="flex-row items-center justify-center active:opacity-80"
                style={{ height: 50, borderRadius: 999, backgroundColor: BRAND_GREEN, gap: 6 }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>ส่งใบเสนอราคา (มีผล 14 วัน)</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => showToast(`เปิดแชทกับ ${doc.contact} (${doc.phone})`)}
              className="flex-row items-center justify-center active:opacity-80"
              style={{ height: 50, borderRadius: 999, borderWidth: 1, borderColor: BRAND_GREEN, gap: 6 }}
            >
              <MessageCircle size={16} color={BRAND_GREEN} strokeWidth={2.2} />
              <Text style={{ fontSize: 14, fontWeight: "500", color: BRAND_GREEN }}>ติดต่อลูกค้า</Text>
            </Pressable>
          </View>
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <BottomFade />
      </View>
    </View>
  );
}
