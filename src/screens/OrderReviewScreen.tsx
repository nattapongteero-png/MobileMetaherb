import { useState } from "react";
import { View, Text, Image, ScrollView, Pressable, TextInput, Switch, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Star, Camera, X, Store, User, PackageX, CheckCircle2 } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { EmptyState } from "../components/EmptyState";
import { useOrders } from "../context/OrderContext";
import { getImagePicker } from "../utils/imagePicker";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ReviewRoute = RouteProp<RootStackParamList, "OrderReview">;

const MAX_PHOTOS = 5;
const RATING_WORD = ["", "แย่มาก", "พอใช้", "ดี", "ดีมาก", "ยอดเยี่ยม"];


type ItemReview = { rating: number; comment: string; photos: string[] };

// Full-bleed white section (matches the order detail / checkout language).
function Section({ children }: { children: React.ReactNode }) {
  return <View className="bg-white" style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>{children}</View>;
}

function StarRow({ value, onChange, size = 32 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Pressable key={s} onPress={() => onChange(s)} hitSlop={4} className="active:opacity-70">
          <Star size={size} color="#f7931d" fill={s <= value ? "#f7931d" : "transparent"} strokeWidth={1.8} />
        </Pressable>
      ))}
    </View>
  );
}

export function OrderReviewScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const orderId = useRoute<ReviewRoute>().params.orderId;
  const { getOrder, submitReview } = useOrders();
  const order = getOrder(orderId);

  const [items, setItems] = useState<ItemReview[]>(
    () => (order?.items ?? []).map(() => ({ rating: 5, comment: "", photos: [] })),
  );
  const [shopRating, setShopRating] = useState(5);
  const [showName, setShowName] = useState(true);

  if (!order) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
        <StatusBar style="dark" />
        <SubPageHeader title="ให้คะแนนและรีวิว" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
        <EmptyState icon={<PackageX size={34} color={TEXT_MUTED} />} title="ไม่พบคำสั่งซื้อ" subtitle="คำสั่งซื้อนี้อาจถูกลบหรือไม่มีอยู่" />
      </View>
    );
  }

  const reviewerName = order.recipient?.name ?? "ผู้ใช้ MetaHerb";

  const patch = (i: number, p: Partial<ItemReview>) =>
    setItems((prev) => prev.map((rv, idx) => (idx === i ? { ...rv, ...p } : rv)));

  const addUris = (i: number, uris: string[]) =>
    setItems((prev) =>
      prev.map((rv, idx) => (idx === i ? { ...rv, photos: [...rv.photos, ...uris].slice(0, MAX_PHOTOS) } : rv)),
    );

  const removePhoto = (i: number, photo: string) =>
    setItems((prev) => prev.map((rv, idx) => (idx === i ? { ...rv, photos: rv.photos.filter((p) => p !== photo) } : rv)));

  const pickFrom = async (i: number, source: "camera" | "library") => {
    const ImagePicker = getImagePicker();
    if (!ImagePicker) return;
    try {
      const remaining = MAX_PHOTOS - items[i].photos.length;
      if (remaining <= 0) return;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("ต้องอนุญาตใช้กล้อง", "เปิดสิทธิ์กล้องในการตั้งค่าเพื่อถ่ายรูปรีวิว");
          return;
        }
        const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
        if (!res.canceled) addUris(i, res.assets.map((a) => a.uri));
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("ต้องอนุญาตเข้าถึงรูปภาพ", "เปิดสิทธิ์คลังรูปในการตั้งค่าเพื่อแนบรูปรีวิว");
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.7,
          allowsMultipleSelection: true,
          selectionLimit: remaining,
        });
        if (!res.canceled) addUris(i, res.assets.map((a) => a.uri));
      }
    } catch {
      Alert.alert("เพิ่มรูปไม่สำเร็จ", "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  };

  const choosePhoto = (i: number) => {
    if (!getImagePicker()) {
      Alert.alert("ยังเพิ่มรูปไม่ได้", "ตัวรันนี้ยังไม่มีโมดูลกล้อง/คลัง — ต้อง build แอปใหม่จึงจะถ่าย/เลือกรูปได้");
      return;
    }
    Alert.alert("เพิ่มรูปภาพรีวิว", "เลือกแหล่งรูปภาพ", [
      { text: "ถ่ายภาพ", onPress: () => pickFrom(i, "camera") },
      { text: "เลือกจากคลังภาพ", onPress: () => pickFrom(i, "library") },
      { text: "ยกเลิก", style: "cancel" },
    ]);
  };

  const submit = () => {
    const avg = Math.round(items.reduce((s, r) => s + r.rating, 0) / Math.max(1, items.length));
    const firstComment = items.find((r) => r.comment.trim())?.comment.trim() ?? "";
    submitReview(order.id, {
      rating: avg,
      comment: firstComment,
      shopRating,
      anonymous: !showName,
      products: order.items.map((it, i) => ({
        name: it.name,
        rating: items[i].rating,
        comment: items[i].comment.trim(),
        photos: items[i].photos,
      })),
    });
    Alert.alert("ขอบคุณสำหรับรีวิว! 🌿", "รีวิวของคุณถูกบันทึกแล้ว", [
      { text: "ตกลง", onPress: () => nav.goBack() },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader
        title="ให้คะแนนและรีวิว"
        subtitle={order.id}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        {/* Per-product reviews */}
        {order.items.map((item, i) => (
          <Section key={i}>
            {/* Product header */}
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Image source={item.image} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#0a0a0a" }} numberOfLines={2}>{item.name}</Text>
                <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 3 }} numberOfLines={1}>{item.option}</Text>
              </View>
            </View>

            {/* Stars */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 }}>
              <StarRow value={items[i].rating} onChange={(n) => patch(i, { rating: n })} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#f7931d" }}>{RATING_WORD[items[i].rating]}</Text>
            </View>

            {/* Comment */}
            <TextInput
              value={items[i].comment}
              onChangeText={(t) => patch(i, { comment: t })}
              placeholder="เขียนรีวิวสินค้าชิ้นนี้..."
              placeholderTextColor="#a3a3a3"
              multiline
              style={{ minHeight: 90, backgroundColor: "#f5f5f5", borderRadius: 14, padding: 14, marginTop: 14, fontSize: 14, color: "#0a0a0a", textAlignVertical: "top" }}
            />

            {/* Photo attach */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {items[i].photos.map((p) => (
                <View key={p}>
                  <Image source={{ uri: p }} style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
                  <Pressable
                    onPress={() => removePhoto(i, p)}
                    hitSlop={6}
                    style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}
                  >
                    <X size={12} color="#fff" strokeWidth={2.6} />
                  </Pressable>
                </View>
              ))}
              {items[i].photos.length < MAX_PHOTOS ? (
                <Pressable
                  onPress={() => choosePhoto(i)}
                  className="active:opacity-70 items-center justify-center"
                  style={{ width: 64, height: 64, borderRadius: 10, borderWidth: 1.5, borderColor: "#d4d4d8", borderStyle: "dashed", gap: 2 }}
                >
                  <Camera size={18} color="#a3a3a3" />
                  <Text style={{ fontSize: 9.5, color: "#a3a3a3" }}>เพิ่มรูป</Text>
                </Pressable>
              ) : null}
            </View>
          </Section>
        ))}

        {/* Shop rating — stars only */}
        <Section>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Store size={16} color={BRAND_GREEN} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>ให้คะแนนร้านค้า</Text>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>{order.shopName}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <StarRow value={shopRating} onChange={setShopRating} size={28} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#f7931d" }}>{RATING_WORD[shopRating]}</Text>
          </View>
        </Section>

        {/* Reviewer name visibility */}
        <Section>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
              <User size={16} color={BRAND_GREEN} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>แสดงชื่อผู้รีวิว</Text>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>
                {showName ? `แสดงเป็น "${reviewerName}"` : "รีวิวแบบไม่ระบุชื่อ"}
              </Text>
            </View>
            <Switch
              value={showName}
              onValueChange={setShowName}
              trackColor={{ false: "#d4d4d8", true: BRAND_GREEN }}
              thumbColor="#fff"
            />
          </View>
        </Section>
        </ScrollView>

        {/* Scroll-edge fades — content dissolves into the header / bottom bar. */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(250,250,250,0)", "#fafafa"]}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 24 }}
        />
      </View>

      {/* Floating Liquid-Glass action bar — same CTA pattern as the PR / Payment
          / Cart bars (Jakob's Law: one floating-button pattern app-wide). */}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 18 }}
      >
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
            style={{ borderRadius: 34, overflow: "hidden", flexDirection: "row", padding: 8 }}
          >
            <Pressable
              onPress={submit}
              className="flex-row items-center justify-center active:opacity-80"
              style={{ flex: 1, backgroundColor: BRAND_GREEN, borderRadius: 999, height: 48, gap: 6 }}
            >
              <CheckCircle2 size={18} color="#fff" />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>ส่งรีวิว</Text>
            </Pressable>
          </GlassView>
        </View>
      </View>
    </View>
  );
}
