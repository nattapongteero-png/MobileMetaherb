import { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { makeQuotePdf } from "../utils/quotePdf";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FileText, ClipboardList, FileCheck2, Package, ChevronRight, Store, Download, MessageCircle, Wallet, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { BottomFade } from "../components/BottomFade";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import {
  DOC_TITLE, getDoc, statusBadge,
  type DocKind, type PRRecord, type QuoteRecord, type PORecord, type DocItem,
} from "../data/b2bDocs";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, "B2BDocDetail">;

const KIND_ICON: Record<DocKind, LucideIcon> = { rfq: FileText, pr: ClipboardList, po: FileCheck2 };
const KIND_STATUS_TITLE: Record<DocKind, string> = {
  rfq: "สถานะใบเสนอราคา",
  pr: "สถานะใบขอสั่งซื้อ",
  po: "สถานะใบสั่งซื้อ",
};

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

export function B2BDocDetailScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { kind, id } = useRoute<DetailRoute>().params;
  const doc = getDoc(kind, id);

  if (!doc) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <StatusBar style="dark" />
        <SubPageHeader title={DOC_TITLE[kind]} onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: TEXT_MUTED }}>ไม่พบเอกสารนี้</Text>
        </View>
      </View>
    );
  }

  const Icon = KIND_ICON[kind];
  const badge = statusBadge(kind, (doc as any).status);
  const pr = kind === "pr" ? (doc as PRRecord) : null;
  const qt = kind === "rfq" ? (doc as QuoteRecord) : null;
  const po = kind === "po" ? (doc as PORecord) : null;
  const items = doc.items as DocItem[];

  const goDoc = (k: DocKind, docId: string) => nav.push("B2BDocDetail", { kind: k, id: docId });
  const supplierName = qt ? qt.supplier : po ? po.supplier : pr?.items[0]?.supplier ?? "METAHERB Store";
  const canDownload = !["expired", "rejected"].includes((doc as any).status);
  // PO awaiting payment → chat + pay actions in a floating bar.
  const showPayBar = !!po && po.status === "pending";
  const onChat = () => nav.navigate("Chat", { shopName: supplierName });
  const onPay = () => po && nav.navigate("PromptPayQR", { total: po.totalAmount, orderId: po.id });
  // The doc-info section is empty for a rejected/expired PR (no supplier, no PO link)
  // — hide it entirely in that case. The download button is now a floating bar.
  const hasDocInfo = kind !== "pr" || !!pr?.poNumber;
  const [generating, setGenerating] = useState(false);

  // Generate a real PDF with the SAME quotation template used in the request flow
  // (HerbalMarketQuoteScreen → makeQuotePdf), filled from this document's data.
  const onDownload = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      await makeQuotePdf({
        docs: [{
          supplier: supplierName,
          rfqNumber: doc.id,
          rows: items.map((it) => ({ name: it.name, qty: it.qty, unit: it.unit, price: it.price })),
        }],
        isBulk: false,
        companyName: qt?.company?.name ?? "",
        taxId: qt?.company?.taxId ?? "",
        companyAddress: qt?.company?.address ?? "",
        contactName: qt?.contact?.name ?? "",
        position: qt?.contact?.position ?? "",
        email: qt?.contact?.email ?? "",
        phone: qt?.contact?.phone ?? "",
        poReference: qt?.contact?.poRef ?? "",
        todayStr: doc.date.split(" · ")[0],
        note: (doc as any).note ?? "",
        certPref: qt?.certificate ?? "ทั่วไป",
        requiredBy: qt?.neededBy ?? "",
      });
    } catch (e) {
      Alert.alert("สร้างเอกสารไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง (ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อโหลดฟอนต์)");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={doc.id}
        subtitle={doc.date}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        rightSlot={
          canDownload ? (
            <GlassIconButton onPress={onDownload} disabled={generating} accessibilityLabel="โหลดเอกสาร">
              {generating ? <ActivityIndicator size="small" color={BRAND_GREEN} /> : <Download size={20} color={BRAND_GREEN} strokeWidth={2.2} />}
            </GlassIconButton>
          ) : undefined
        }
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: showPayBar ? 120 + insets.bottom : 40 }}>
          {/* Status banner — same language as the order detail page */}
          <View style={{ backgroundColor: "#fff", marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: (badge?.color ?? BRAND_GREEN) + "1a", alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} color={badge?.color ?? BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>{KIND_STATUS_TITLE[kind]}</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: badge?.color ?? BRAND_GREEN, marginTop: 1 }}>{badge?.label ?? "-"}</Text>
              </View>
            </View>
          </View>

          {/* Company info (RFQ) — before the item list */}
          {qt && qt.company ? (
            <Section title="ข้อมูลบริษัท">
              <InfoRow label="ชื่อบริษัท / นิติบุคคล" value={qt.company.name} />
              <InfoRow label="เลขประจำตัวผู้เสียภาษี" value={qt.company.taxId} />
              <View style={{ paddingVertical: 6 }}>
                <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>ที่อยู่บริษัท</Text>
                <Text style={{ fontSize: 13.5, color: "#0a0a0a", lineHeight: 20 }}>{qt.company.address}</Text>
              </View>
            </Section>
          ) : null}

          {/* PR request info — before the item list (shown combined, not split by shop) */}
          {pr ? (
            <Section title="ข้อมูลใบขอสั่งซื้อ">
              <InfoRow label="ความเร่งด่วน" value={pr.priority} />
              {pr.requiredDate ? <InfoRow label="วันที่ต้องการ" value={pr.requiredDate} /> : null}
              <InfoRow label="ระยะเวลาใบ PR" value={`${pr.validityDays} วัน`} />
              {pr.approver ? <InfoRow label="ผู้อนุมัติ" value={pr.approver} /> : null}
              {pr.description ? (
                <View style={{ paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>รายละเอียด (Description)</Text>
                  <Text style={{ fontSize: 13.5, color: "#0a0a0a", lineHeight: 20 }}>{pr.description}</Text>
                </View>
              ) : null}
              {pr.justification ? (
                <View style={{ paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>เหตุผลในการขออนุมัติ (Justification)</Text>
                  <Text style={{ fontSize: 13.5, color: "#0a0a0a", lineHeight: 20 }}>{pr.justification}</Text>
                </View>
              ) : null}
              {pr.rejectReason ? (
                <View style={{ paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, color: "#dc2626", marginBottom: 4 }}>เหตุผลที่ปฏิเสธ</Text>
                  <Text style={{ fontSize: 13.5, color: "#dc2626", lineHeight: 20 }}>{pr.rejectReason}</Text>
                </View>
              ) : null}
            </Section>
          ) : null}

          {/* Items */}
          <Section title={`รายการสินค้า (${items.length})`}>
            <View style={{ gap: 14 }}>
              {items.map((item, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" }}>
                    {item.image ? <Image source={typeof item.image === "string" ? { uri: item.image } : item.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <Package size={22} color="#d4d4d4" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }} numberOfLines={2}>{item.name}</Text>
                    {item.erpCode ? <Text style={{ fontSize: 11, color: BRAND_GREEN, fontWeight: "700", marginTop: 2 }}>ERP: {item.erpCode}</Text> : null}
                    <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: item.erpCode ? 1 : 2 }}>ผู้ขาย: {item.supplier}</Text>
                    <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>{item.qty.toLocaleString()} {item.unit} × ฿{item.price.toLocaleString()}</Text>
                    {item.note ? <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>หมายเหตุ: {item.note}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>฿{(item.price * item.qty).toLocaleString()}</Text>
                </View>
              ))}
            </View>
            <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 14 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>ยอดรวมทั้งสิ้น</Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: BRAND_GREEN }}>฿{doc.totalAmount.toLocaleString()}</Text>
            </View>
          </Section>

          {/* Contact + requirements (RFQ) — after the item list */}
          {qt ? (
            <>
              {qt.contact ? (
                <Section title="ผู้ติดต่อ">
                  <InfoRow label="ชื่อ-นามสกุล" value={qt.contact.name} />
                  {qt.contact.position ? <InfoRow label="ตำแหน่ง" value={qt.contact.position} /> : null}
                  <InfoRow label="เบอร์โทร" value={qt.contact.phone} />
                  <InfoRow label="Email" value={qt.contact.email} />
                  {qt.contact.poRef ? <InfoRow label="เลขที่อ้างอิง / PO Ref" value={qt.contact.poRef} /> : null}
                </Section>
              ) : null}

              <Section title="เงื่อนไขที่ต้องการ">
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, color: TEXT_MUTED }}>เกรด / Certificate</Text>
                  <View style={{ backgroundColor: "rgba(49,151,84,0.10)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: "700", color: BRAND_GREEN }}>{qt.certificate ?? "ทั่วไป"}</Text>
                  </View>
                </View>
                {qt.neededBy ? <InfoRow label="ต้องการภายใน" value={qt.neededBy} /> : null}
                {qt.note ? (
                  <View style={{ paddingVertical: 6 }}>
                    <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>หมายเหตุ</Text>
                    <Text style={{ fontSize: 13.5, color: "#0a0a0a", lineHeight: 20 }}>{qt.note}</Text>
                  </View>
                ) : null}
              </Section>
            </>
          ) : null}

          {/* Document info — hidden when empty (e.g. rejected / expired PR) */}
          {hasDocInfo ? (
          <Section title="ข้อมูลเอกสาร">
            {/* Supplier — PR is internal / combined, so it has no single shop */}
            {kind !== "pr" ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(49,151,84,0.10)", alignItems: "center", justifyContent: "center" }}>
                    <Store size={18} color={BRAND_GREEN} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: TEXT_MUTED }}>Supplier</Text>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a", marginTop: 1 }}>{supplierName}</Text>
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: "#f0f0f0", marginBottom: 6 }} />
              </>
            ) : null}

            {qt ? (
              <>
                <InfoRow label="วันที่เสนอ" value={qt.date} />
                <InfoRow label="มีผลถึง" value={qt.validUntil} />
                <InfoRow label="คงเหลือ" value={qt.daysRemaining < 0 ? "หมดอายุแล้ว" : `${qt.daysRemaining} วัน`} />
              </>
            ) : null}

            {pr && pr.poNumber ? (
              <Pressable onPress={() => goDoc("po", pr.poNumber!)} className="active:opacity-70"
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, color: TEXT_MUTED }}>แปลงเป็นใบสั่งซื้อ</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN }}>{pr.poNumber}</Text>
                  <ChevronRight size={16} color={BRAND_GREEN} strokeWidth={2.4} />
                </View>
              </Pressable>
            ) : null}

            {po ? (
              <>
                <InfoRow label="วันที่สั่งซื้อ" value={po.date} />
                <InfoRow label="กำหนดส่ง" value={po.deliveryDate} />
                <InfoRow label="เงื่อนไขชำระเงิน" value={po.paymentTerms} />
                {po.trackingNumber ? <InfoRow label="เลขพัสดุ" value={po.trackingNumber} /> : null}
                {po.note ? <InfoRow label="หมายเหตุ" value={po.note} /> : null}
                {po.refPrId ? (
                  <Pressable onPress={() => goDoc("pr", po.refPrId!)} className="active:opacity-70"
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: "#f0f0f0" }}>
                    <Text style={{ fontSize: 13, color: TEXT_MUTED }}>อ้างอิงใบขอสั่งซื้อ</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN }}>{po.refPrId}</Text>
                      <ChevronRight size={16} color={BRAND_GREEN} strokeWidth={2.4} />
                    </View>
                  </Pressable>
                ) : null}
                {po.refQuoteId ? (
                  <Pressable onPress={() => goDoc("rfq", po.refQuoteId!)} className="active:opacity-70"
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
                    <Text style={{ fontSize: 13, color: TEXT_MUTED }}>อ้างอิงใบเสนอราคา</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN }}>{po.refQuoteId}</Text>
                      <ChevronRight size={16} color={BRAND_GREEN} strokeWidth={2.4} />
                    </View>
                  </Pressable>
                ) : null}
              </>
            ) : null}

          </Section>
          ) : null}
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <BottomFade />

        {/* PO awaiting payment — chat icon + pay, inside one floating glass bar */}
        {showPayBar ? (
          <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 }}>
            <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
              <GlassView glassEffectStyle="regular" colorScheme="light" style={{ borderRadius: 34, overflow: "hidden", padding: 9, flexDirection: "row", alignItems: "center", gap: 8 }}>
                {/* Chat — circular icon button inside the bar */}
                <Pressable onPress={onChat} hitSlop={6} className="active:opacity-70" style={{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(49,151,84,0.1)" }}>
                  <MessageCircle size={22} color={BRAND_GREEN} />
                </Pressable>
                {/* Pay */}
                <Pressable
                  onPress={onPay}
                  className="active:opacity-90"
                  style={{ flex: 1, height: 50, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, backgroundColor: BRAND_GREEN }}
                >
                  <Wallet size={17} color="#fff" strokeWidth={2.3} />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>ชำระเงิน</Text>
                </Pressable>
              </GlassView>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
