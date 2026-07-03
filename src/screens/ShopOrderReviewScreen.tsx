import { Image, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Star, Store, User, X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { EmptyState } from "../components/EmptyState";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";
import { ORDERS } from "./MyShopScreen";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LABEL = "#6b7280";
const AMBER = "#f59e0b";

// 5-star row — filled amber up to `rating`, gray outline after (web StarRow).
function StarRow({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} color={s <= rating ? AMBER : "#d1d5db"} fill={s <= rating ? AMBER : "transparent"} strokeWidth={1.8} />
      ))}
    </View>
  );
}

/**
 * รีวิวคำสั่งซื้อ (ฝั่งร้านค้า) — slide-up modal in the AddCard shell, porting
 * the web ReviewModal: reviewer row → shop-rating card → per-item reviews.
 */
export function ShopOrderReviewScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, "ShopOrderReview">>();
  const order = ORDERS.find((o) => o.id === route.params?.orderId);
  const review = order?.review;

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header — same style as AddCard (circular close / centered title / spacer) */}
      <View
        className="flex-row items-center justify-between"
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}
      >
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>รีวิวคำสั่งซื้อ</Text>
          {order ? <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{order.id}</Text> : null}
        </View>
        {/* Spacer — balances the close button so the title stays centered. */}
        <View style={{ width: 44 }} />
      </View>

      {!order || !review ? (
        <EmptyState
          icon={<Star size={34} color="#d4d4d4" />}
          title="ยังไม่มีรีวิว"
          subtitle="คำสั่งซื้อนี้ยังไม่ได้รับการรีวิวจากลูกค้า"
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Reviewer — gray recap row (web: avatar + name + reviewed date) */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f5f5f5", borderRadius: 20, padding: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
              <User size={22} color={BRAND_GREEN} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>{review.reviewerName}</Text>
              <Text style={{ fontSize: 11, color: LABEL, marginTop: 2 }}>รีวิวเมื่อ {review.reviewedAt}</Text>
            </View>
          </View>

          {/* Shop rating — amber card (web: Store icon + StarRow + score) */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: "#fff7ed",
              borderWidth: 1,
              borderColor: "#fed7aa",
              borderRadius: 20,
              padding: 16,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Store size={20} color={BRAND_GREEN} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#0a0a0a" }}>คะแนนร้านค้า</Text>
              <Text style={{ fontSize: 11, color: LABEL, marginTop: 2 }}>โดยรวมจากออเดอร์นี้</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <StarRow rating={review.shopRating} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: AMBER }}>{review.shopRating}.0</Text>
            </View>
          </View>

          {/* Per-item reviews */}
          <Text style={{ fontSize: 13, fontWeight: "500", color: LABEL, marginTop: 4 }}>
            รีวิวสินค้า ({review.items.length} รายการ)
          </Text>
          {review.items.map((r) => {
            const item = order.items[r.itemIndex];
            if (!item) return null;
            return (
              <View key={r.itemIndex} style={{ borderWidth: 1, borderColor: "#f0f0f0", borderRadius: 20, padding: 14, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Image source={item.image} style={{ width: 60, height: 60, borderRadius: 12, backgroundColor: "#f0f0f0" }} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a" }}>{item.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: "#525252" }}>{item.option}</Text>
                      <View style={{ backgroundColor: "#f5f5f5", paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 }}>
                        <Text style={{ fontSize: 10, fontWeight: "500", color: "#262626" }}>จำนวน {item.qty} ชิ้น</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <StarRow rating={r.rating} size={14} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: AMBER }}>{r.rating}.0</Text>
                </View>
                <Text style={{ fontSize: 13, color: "#374151", lineHeight: 19 }}>{r.comment}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
