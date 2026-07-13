import { GLASS_BAR_TINT } from "../theme/tokens";
import { useState, type ReactNode } from "react";
import { View, Text, Image, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Camera, X, CheckCircle2, Landmark, Wallet, ChevronRight } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { useOrders } from "../context/OrderContext";
import { useRefund, TRUEWALLET_ID } from "../context/RefundContext";
import { useComplaints } from "../context/ComplaintContext";
import { getImagePicker } from "../utils/imagePicker";
import { maskPhone } from "./TrueMoneyLinkScreen";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import { MOCK_ORDERS } from "../data/orders";
import { COMPLAINT_TYPES, type ComplaintType } from "../data/complaintTypes";
import { bankByCode } from "../data/bankAccounts";
import type { RootStackParamList } from "../navigation/RootStack";

const TRUEMONEY = "#f37021";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FormRoute = RouteProp<RootStackParamList, "ComplaintForm">;

const MAX_IMAGES = 5;
const DEFAULT_ADDRESS = "เลขที่ 2 ชั้นที่ 2 ซอยสุขสวัสดิ์33 แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140";
const DEFAULT_ORDER = MOCK_ORDERS.find((o) => o.status === "delivered") ?? MOCK_ORDERS[0];

// Full-bleed white section (matches the order detail / review language).
function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="bg-white" style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      {title ? <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a", marginBottom: 12 }}>{title}</Text> : null}
      {children}
    </View>
  );
}

function TypeBadge({ type, size }: { type: ComplaintType; size: number }) {
  const info = COMPLAINT_TYPES[type];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: info.color + "1a", alignItems: "center", justifyContent: "center" }}>
      <info.Icon size={size * 0.5} color={info.color} strokeWidth={2.2} />
    </View>
  );
}

export function ComplaintFormScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const params = useRoute<FormRoute>().params;
  const { getOrder } = useOrders();
  const order = (params?.orderId ? getOrder(params.orderId) : undefined) ?? DEFAULT_ORDER;

  // Refund channel (bank account / TrueWallet) lives in context, picked via a sheet.
  const { accounts, trueWallet, selectedId } = useRefund();
  const { addComplaint } = useComplaints();
  const isWallet = selectedId === TRUEWALLET_ID;
  const selBank = accounts.find((a) => a.id === selectedId);
  const selBankInfo = selBank ? bankByCode(selBank.bankCode) : undefined;
  const channelColor = isWallet ? TRUEMONEY : selBankInfo?.color ?? BRAND_GREEN;
  const channelTitle = isWallet ? "TrueMoney Wallet" : selBankInfo ? `${selBankInfo.name} (${selBankInfo.code})` : "เลือกบัญชีธนาคาร";
  const channelDetail = isWallet
    ? trueWallet ? `ผูกไว้ · ${maskPhone(trueWallet)}` : ""
    : selBank?.accountNo ? `บัญชี •••• ${selBank.accountNo.slice(-4)}` : "แตะเพื่อเลือก";
  const ChannelIcon = isWallet ? Wallet : Landmark;

  // Type is driven by the route param — the native picker navigates back with the
  // chosen type (merge), so this screen's other state (detail/photos/email) is kept.
  const type: ComplaintType = params?.type ?? "damaged";
  const [detail, setDetail] = useState("");
  const [email, setEmail] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const typeInfo = COMPLAINT_TYPES[type];
  const showAddress = type === "return" || type === "damaged";
  const totalRefund = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const address = order.recipient?.address ?? DEFAULT_ADDRESS;

  const addImages = (uris: string[]) => setImages((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));

  const pickFrom = async (source: "camera" | "library") => {
    const ImagePicker = getImagePicker();
    if (!ImagePicker) return;
    try {
      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) return;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert("ต้องอนุญาตใช้กล้อง", "เปิดสิทธิ์กล้องในการตั้งค่าเพื่อถ่ายรูป");
        const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
        if (!res.canceled) addImages(res.assets.map((a) => a.uri));
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return Alert.alert("ต้องอนุญาตเข้าถึงรูปภาพ", "เปิดสิทธิ์คลังรูปในการตั้งค่าเพื่อแนบรูป");
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsMultipleSelection: true, selectionLimit: remaining });
        if (!res.canceled) addImages(res.assets.map((a) => a.uri));
      }
    } catch {
      Alert.alert("เพิ่มรูปไม่สำเร็จ", "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  };

  const choosePhoto = () => {
    if (images.length >= MAX_IMAGES) return Alert.alert("แนบรูปได้สูงสุด 5 รูป");
    if (!getImagePicker()) {
      Alert.alert("ยังเพิ่มรูปไม่ได้", "ตัวรันนี้ยังไม่มีโมดูลกล้อง/คลัง — ต้อง build แอปใหม่จึงจะถ่าย/เลือกรูปได้");
      return;
    }
    Alert.alert("แนบหลักฐาน", "เลือกแหล่งรูปภาพ", [
      { text: "ถ่ายภาพ", onPress: () => pickFrom("camera") },
      { text: "เลือกจากคลังภาพ", onPress: () => pickFrom("library") },
      { text: "ยกเลิก", style: "cancel" },
    ]);
  };

  const handleSubmit = () => {
    if (!detail.trim()) {
      Alert.alert("กรุณากรอกรายละเอียด", "โปรดอธิบายปัญหาที่พบก่อนส่งเรื่องร้องเรียน");
      return;
    }
    if (images.length === 0) {
      Alert.alert("กรุณาแนบหลักฐาน", "โปรดแนบรูปถ่ายหรือคลิปวิดีโอประกอบอย่างน้อย 1 รายการ");
      return;
    }
    const last4 = isWallet ? trueWallet?.slice(-4) : selBank?.accountNo?.slice(-4);
    const refundChannel = `${channelTitle}${last4 ? ` [*${last4}]` : ""}`;
    const M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const now = new Date();
    const createdAt = `${now.getDate()} ${M[now.getMonth()]} ${now.getFullYear() + 543}`;
    // Push the case into the shared store so it appears in the owner's เรื่องร้องเรียน list.
    const complaintId = addComplaint({
      // The case belongs to a buyer and a shop — that is how the console filters
      // it, and how the buyer's status screen finds it again.
      userId: order.userId,
      shopName: order.shopName,
      orderId: order.id,
      customer: order.recipient?.name ?? "ลูกค้า",
      customerEmail: email.trim() || "-",
      customerPhone: order.recipient?.phone ?? "-",
      type,
      product: order.items[0]?.name ?? "-",
      description: detail.trim(),
      amount: totalRefund,
      refundChannel,
      createdAt,
      items: order.items.map((it) => ({ productId: it.productId, name: it.name, option: it.option, qty: it.quantity, price: it.price, image: it.image! })),
      evidence: images.map((uri) => ({ source: { uri } })),
    });
    Alert.alert(
      "ส่งเรื่องร้องเรียนแล้ว",
      `รหัสคำร้อง ${complaintId}\nยอดเงินคืน ฿${totalRefund.toLocaleString()}\nเราจะติดต่อกลับทางอีเมลของคุณ`,
      // Take them to the live status page rather than dropping them back on the
      // order — the screen existed but nothing ever navigated to it.
      [{ text: "ดูสถานะ", onPress: () => nav.replace("ComplaintStatus", { complaintId }) }],
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader
        title="แจ้งปัญหาคำสั่งซื้อ"
        subtitle={order.id}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
          {/* Reason */}
          <Section title="ประเภทปัญหา">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f9fafb", borderRadius: 14, padding: 12 }}>
              <TypeBadge type={type} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{typeInfo.title}</Text>
                <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginTop: 2, lineHeight: 17 }}>{typeInfo.desc}</Text>
              </View>
              <Pressable
                onPress={() => nav.navigate("ComplaintTypeSelect", { orderId: order.id, current: type })}
                hitSlop={8}
                className="active:opacity-60"
              >
                <Text style={{ fontSize: 13, color: BRAND_GREEN, fontWeight: "600" }}>เปลี่ยน</Text>
              </Pressable>
            </View>
          </Section>

          {/* Return address (return / damaged) */}
          {showAddress ? (
            <Section title="ที่อยู่สำหรับรับสินค้าคืน">
              <View style={{ backgroundColor: "#f9fafb", borderRadius: 14, padding: 14 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>{order.recipient?.name ?? "ผู้รับ"}</Text>
                {order.recipient?.phone ? <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>{order.recipient.phone}</Text> : null}
                <Text style={{ fontSize: 13, color: "#404040", lineHeight: 19, marginTop: 6 }}>{address}</Text>
              </View>
            </Section>
          ) : null}

          {/* Evidence photos */}
          <Section title="หลักฐานประกอบ">
            <Text style={{ fontSize: 12.5, color: TEXT_MUTED, marginBottom: 12 }}>แนบรูปภาพสินค้าที่มีปัญหา (สูงสุด {MAX_IMAGES} รูป)</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {images.map((img, i) => (
                <View key={i}>
                  <Image source={{ uri: img }} style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover"
          resizeMethod="resize" />
                  <Pressable
                    onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    hitSlop={6}
                    style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}
                  >
                    <X size={13} color="#fff" strokeWidth={2.6} />
                  </Pressable>
                </View>
              ))}
              {images.length < MAX_IMAGES ? (
                <Pressable
                  onPress={choosePhoto}
                  className="active:opacity-70 items-center justify-center"
                  style={{ width: 80, height: 80, borderRadius: 12, borderWidth: 1.5, borderColor: "#d4d4d8", borderStyle: "dashed", gap: 3 }}
                >
                  <Camera size={22} color="#a3a3a3" />
                  <Text style={{ fontSize: 10, color: "#a3a3a3" }}>เพิ่มรูป</Text>
                </Pressable>
              ) : null}
            </View>
          </Section>

          {/* Detail */}
          <Section title="รายละเอียดเพิ่มเติม">
            <TextInput
              value={detail}
              onChangeText={setDetail}
              placeholder="อธิบายปัญหาที่พบเพิ่มเติม เพื่อให้เราตรวจสอบได้รวดเร็วขึ้น"
              placeholderTextColor="#a3a3a3"
              multiline
              style={{ minHeight: 100, backgroundColor: "#f5f5f5", borderRadius: 14, padding: 14, fontSize: 14, color: "#0a0a0a", textAlignVertical: "top" }}
            />
          </Section>

          {/* Refund items + summary */}
          <Section title="รายการที่ขอคืน">
            <View style={{ gap: 12 }}>
              {order.items.map((item, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", backgroundColor: "#f0f0f0" }}>
                    <Image source={item.image} style={{ width: "100%", height: "100%" }} resizeMode="cover"
          resizeMethod="resize" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }} numberOfLines={2}>{item.name}</Text>
                    <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>จำนวน {item.quantity} ชิ้น</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>฿{(item.price * item.quantity).toLocaleString()}</Text>
                </View>
              ))}

              <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 2 }} />

              {/* Refund channel — tappable, opens the native picker sheet */}
              <Text style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 6 }}>ช่องทางรับเงินคืน</Text>
              <Pressable
                onPress={() => nav.navigate("RefundChannelSelect")}
                className="active:opacity-80 flex-row items-center"
                style={{ backgroundColor: "#f9fafb", borderRadius: 14, padding: 12, gap: 12 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: channelColor + "1a", alignItems: "center", justifyContent: "center" }}>
                  <ChannelIcon size={20} color={channelColor} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{channelTitle}</Text>
                  {channelDetail ? <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginTop: 1 }}>{channelDetail}</Text> : null}
                </View>
                <ChevronRight size={18} color={TEXT_MUTED} />
              </Pressable>

              <View>
                <Text style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 6 }}>อีเมลสำหรับรับเงินคืน</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  placeholderTextColor="#a3a3a3"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ backgroundColor: "#f5f5f5", height: 46, borderRadius: 999, paddingHorizontal: 16, fontSize: 14, color: "#0a0a0a" }}
                />
              </View>

              <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 2 }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>ยอดเงินที่จะได้รับคืน</Text>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#ef4444" }}>฿{totalRefund.toLocaleString()}</Text>
              </View>
            </View>
          </Section>
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 24 }} />
      </View>

      {/* Floating Liquid-Glass submit */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 18 }}>
        <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
          <GlassView glassEffectStyle="regular" colorScheme="light"
              tintColor={GLASS_BAR_TINT} style={{ borderRadius: 34, overflow: "hidden", flexDirection: "row", padding: 8 }}>
            <Pressable
              onPress={handleSubmit}
              className="flex-row items-center justify-center active:opacity-80"
              style={{ flex: 1, backgroundColor: BRAND_GREEN, borderRadius: 999, height: 50, gap: 6 }}
            >
              <CheckCircle2 size={18} color="#fff" />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>ยืนยันการร้องเรียน</Text>
            </Pressable>
          </GlassView>
        </View>
      </View>
    </View>
  );
}
