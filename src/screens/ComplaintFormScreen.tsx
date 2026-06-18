import { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Modal, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Camera,
  Upload,
  X,
  Package,
  PackageX,
  RefreshCw,
  Undo2,
  Wallet,
  Check,
  type LucideIcon,
} from "lucide-react-native";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { MOCK_ORDERS } from "../data/orders";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Complaint reason types — ported verbatim from the web ComplaintFormPage.
// The web mock used figma:asset PNGs per type; here we use a tinted lucide icon
// in the same brand-color slot (icons carry meaning + color, so it isn't
// color-alone — WCAG 1.4.1 still satisfied).
type ComplaintType = "damaged" | "wrong_item" | "return" | "refund";

const TYPE_LABELS: Record<
  ComplaintType,
  { title: string; desc: string; color: string; Icon: LucideIcon }
> = {
  damaged: { title: "สินค้าชำรุด/เสียหาย", desc: "สินค้าที่ได้รับชำรุด แตกหัก หรือเสียหาย", color: "#FF383C", Icon: PackageX },
  wrong_item: { title: "ได้รับสินค้าผิด", desc: "ได้รับสินค้าไม่ตรงกับที่สั่งซื้อ", color: "#DF9723", Icon: RefreshCw },
  return: { title: "ขอคืนสินค้า", desc: "ต้องการส่งคืนสินค้าและขอเงินคืน", color: "#9747FF", Icon: Undo2 },
  refund: { title: "ขอเงินคืน", desc: "ต้องการขอเงินคืนโดยไม่ส่งคืนสินค้า", color: "#0088FF", Icon: Wallet },
};

const TYPE_ORDER: ComplaintType[] = ["damaged", "wrong_item", "return", "refund"];

// Mock evidence images uploaded on tap — verbatim from web.
const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1586769852044-692d6e3703f2?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop",
];

const DEFAULT_ADDRESS =
  "เลขที่ 2 ชั้นที่ 2 ซอยสุขสวัสดิ์33 แขวงราษฎร์บูรณะ, เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140";

// Use a delivered order as the default subject (matches the entry point: the
// "ร้องเรียน" action on a delivered order).
const DEFAULT_ORDER = MOCK_ORDERS.find((o) => o.status === "delivered") ?? MOCK_ORDERS[0];

// Module-scope so the TextInput isn't remounted (and refocused) on every render.
function DetailField({ value, onChangeText }: { value: string; onChangeText: (s: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="อธิบายปัญหาที่พบเพิ่มเติม เพื่อให้เราตรวจสอบได้รวดเร็วขึ้น"
      placeholderTextColor="#a3a3a3"
      multiline
      style={{
        minHeight: 120,
        borderWidth: 1,
        borderColor: "#d4d4d8",
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        color: "#0a0a0a",
        textAlignVertical: "top",
      }}
    />
  );
}

function EmailField({ value, onChangeText }: { value: string; onChangeText: (s: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="อีเมลสำหรับรับเงินคืน"
      placeholderTextColor="#a3a3a3"
      keyboardType="email-address"
      autoCapitalize="none"
      style={{
        flex: 1,
        backgroundColor: "#f5f5f5",
        height: 48,
        borderRadius: 999,
        paddingHorizontal: 18,
        fontSize: 14,
        color: "#374151",
      }}
    />
  );
}

// Reusable section card header (title + bottom divider) like the web cards.
function SectionTitle({ children }: { children: string }) {
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: "#ececed", paddingBottom: 10, marginBottom: 14 }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a" }}>{children}</Text>
    </View>
  );
}

function TypeBadge({ type, size }: { type: ComplaintType; size: number }) {
  const info = TYPE_LABELS[type];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        backgroundColor: info.color + "1a",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <info.Icon size={size * 0.5} color={info.color} strokeWidth={2.2} />
    </View>
  );
}

export function ComplaintFormScreen() {
  const nav = useNavigation<Nav>();

  const order = DEFAULT_ORDER;
  const [type, setType] = useState<ComplaintType>("damaged");
  const [detail, setDetail] = useState("");
  const [email, setEmail] = useState("metaherb@gmail.com");
  const [images, setImages] = useState<string[]>([]);
  const [showChangePopup, setShowChangePopup] = useState(false);

  const typeInfo = TYPE_LABELS[type];
  const showAddress = type === "return" || type === "damaged";

  const totalRefund = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleImageUpload = () => {
    if (images.length >= 5) {
      Alert.alert("อัปโหลดได้สูงสุด 5 รูป");
      return;
    }
    setImages((prev) => [...prev, MOCK_IMAGES[prev.length % MOCK_IMAGES.length]]);
  };

  const handleSubmit = () => {
    if (!detail.trim()) {
      Alert.alert("กรุณากรอกรายละเอียด", "โปรดอธิบายปัญหาที่พบก่อนส่งเรื่องร้องเรียน");
      return;
    }
    const complaintId = `CMP-${Date.now().toString(36).toUpperCase()}`;
    Alert.alert(
      "ส่งเรื่องร้องเรียนแล้ว",
      `รหัสคำร้อง ${complaintId}\nยอดเงินคืน ฿${totalRefund.toLocaleString()}\nเราจะติดต่อกลับทางอีเมลของคุณ`,
      [{ text: "ตกลง", onPress: () => nav.canGoBack() && nav.goBack() }],
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
      >
        {/* Reason */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16 }}>
          <SectionTitle>เหตุผลในการร้องเรียน</SectionTitle>
          <View style={{ borderWidth: 1, borderColor: "#d9d9d9", borderRadius: 14, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TypeBadge type={type} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{typeInfo.title}</Text>
                <Text style={{ fontSize: 13, color: "rgba(0,0,0,0.6)", marginTop: 2 }}>{typeInfo.desc}</Text>
              </View>
              <Pressable onPress={() => setShowChangePopup(true)} hitSlop={8} className="active:opacity-60">
                <Text style={{ fontSize: 14, color: "#0088FF", fontWeight: "600" }}>เปลี่ยน</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Return address (only for return / damaged) */}
        {showAddress ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16 }}>
            <SectionTitle>ที่อยู่สำหรับรับสินค้าคืน</SectionTitle>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>ที่อยู่จัดส่ง</Text>
              <View style={{ backgroundColor: "#0088FF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#fff" }}>ค่าเริ่มต้น</Text>
              </View>
            </View>
            <View style={{ borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
              <Text style={{ fontSize: 14, color: "#0a0a0a", lineHeight: 21 }}>{DEFAULT_ADDRESS}</Text>
            </View>
          </View>
        ) : null}

        {/* Evidence */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16 }}>
          <SectionTitle>หลักฐานประกอบ</SectionTitle>
          <Text style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 12 }}>
            อัปโหลดรูปภาพสินค้าที่มีปัญหา (สูงสุด 5 รูป)
          </Text>

          {/* Upload area */}
          <Pressable
            onPress={handleImageUpload}
            className="active:opacity-80"
            style={{
              borderWidth: 2,
              borderColor: "#d4d4d8",
              borderStyle: "dashed",
              borderRadius: 14,
              paddingVertical: 26,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#f0fdf4",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Camera size={28} color={BRAND_GREEN} strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>แตะเพื่ออัปโหลดรูปภาพ</Text>
            <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>รองรับไฟล์ JPG, PNG</Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 12,
                backgroundColor: BRAND_GREEN,
                borderRadius: 999,
                paddingHorizontal: 18,
                paddingVertical: 9,
              }}
            >
              <Upload size={16} color="#fff" strokeWidth={2.2} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>เลือกรูปภาพ</Text>
            </View>
          </Pressable>

          {/* Uploaded thumbnails */}
          {images.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
              {images.map((img, i) => (
                <View
                  key={i}
                  style={{ width: 96, height: 96, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#d4d4d8" }}
                >
                  <Image source={{ uri: img }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  <Pressable
                    onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    hitSlop={6}
                    className="active:opacity-70"
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={13} color="#fff" strokeWidth={2.4} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* More detail */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16 }}>
          <SectionTitle>รายละเอียดเพิ่มเติม</SectionTitle>
          <DetailField value={detail} onChangeText={setDetail} />
        </View>

        {/* Refund items + details */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16, gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#0a0a0a" }}>รายการที่ขอคืน</Text>
          <View style={{ height: 1, backgroundColor: "#ececed" }} />

          {order.items.map((item, i) => (
            <View key={i} style={{ borderWidth: 1, borderColor: "#d9d9d9", borderRadius: 12, padding: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", backgroundColor: "#e7e7e7" }}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Package size={20} color="#d4d4d4" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }} numberOfLines={2}>
                    {item.name}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>
                    ฿ {(item.price * item.quantity).toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>จำนวน {item.quantity} ชิ้น</Text>
                </View>
              </View>
            </View>
          ))}

          <Text style={{ fontSize: 18, fontWeight: "600", color: "#0a0a0a", marginTop: 2 }}>รายละเอียดการคืนเงิน</Text>

          {/* Refund amount */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
            <Text style={{ width: 96, fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>ยอดเงินคืน</Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>฿ {totalRefund.toLocaleString()}</Text>
          </View>

          {/* Refund channel */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
            <Text style={{ width: 96, fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>ช่องทางคืนเงิน</Text>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>คืนเข้าบัญชีธนาคาร</Text>
          </View>

          {/* Email */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Text style={{ width: 96, fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>อีเมล</Text>
            <EmailField value={email} onChangeText={setEmail} />
          </View>

          <View style={{ height: 1, backgroundColor: "#ececed" }} />

          {/* Actual refund */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a" }}>ยอดเงินที่จะได้รับคืน</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: BRAND_GREEN }}>฿ {totalRefund.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom confirm — primary action, full-width pill (Fitts's Law). */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fafafa", borderTopWidth: 1, borderTopColor: "#ececed" }}>
        <View style={{ padding: 16 }}>
          <Pressable
            onPress={handleSubmit}
            className="items-center justify-center active:opacity-80"
            style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, height: 48 }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>ยืนยันการร้องเรียน</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Change type popup — mirrors the web's 2x2 grid (single column on mobile). */}
      <Modal visible={showChangePopup} transparent animationType="slide" onRequestClose={() => setShowChangePopup(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowChangePopup(false)} />
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ fontSize: 19, fontWeight: "700", color: "#0a0a0a", flex: 1 }}>เลือกประเภทการร้องเรียน</Text>
              <Pressable
                onPress={() => setShowChangePopup(false)}
                hitSlop={8}
                className="active:opacity-70"
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#f4f4f4", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} color="#1C1B1F" strokeWidth={2.2} />
              </Pressable>
            </View>

            {TYPE_ORDER.map((key) => {
              const info = TYPE_LABELS[key];
              const active = key === type;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    setType(key);
                    setShowChangePopup(false);
                  }}
                  className="active:opacity-80"
                  style={{
                    borderWidth: 1,
                    borderColor: active ? BRAND_GREEN : "#d9d9d9",
                    backgroundColor: active ? "#f0fdf4" : "#fff",
                    borderRadius: 14,
                    padding: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <TypeBadge type={key} size={48} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{info.title}</Text>
                      <Text style={{ fontSize: 13, color: "rgba(0,0,0,0.6)", marginTop: 2 }}>{info.desc}</Text>
                    </View>
                    {active ? (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                        <Check size={14} color="#fff" strokeWidth={2.6} />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}
