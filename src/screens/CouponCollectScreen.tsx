import { useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Animated, Easing } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Clock, CheckCircle2 } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { PressableScale } from "../components/PressableScale";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CouponType = "all" | "discount" | "free_shipping";

interface Coupon {
  id: string;
  type: "MH" | "FREE" | "VIP";
  label: string;
  sublabel: string;
  title: string;
  minSpend: string;
  tag?: string;
  tagColor?: string;
  expiry: string;
  collected: boolean;
  bgColor: string;
}

const mockCoupons: Coupon[] = [
  { id: "1", type: "MH", label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด ฿30", minSpend: "ขั้นต่ำ ฿150", tag: "ทุกร้านค้า", tagColor: "#319754", expiry: "ใช้ได้ถึง: 25.03.2026", collected: true, bgColor: "#319754" },
  { id: "2", type: "FREE", label: "FREE", sublabel: "โค้ดส่งฟรี", title: "ส่งฟรี", minSpend: "ขั้นต่ำ ฿0", tag: "ส่งด่วน", tagColor: "#00bfa5", expiry: "ใช้ได้ในอีก: 1 วัน", collected: true, bgColor: "#00bfa5" },
  { id: "3", type: "FREE", label: "FREE", sublabel: "โค้ดส่งฟรี", title: "ส่งฟรี", minSpend: "ขั้นต่ำ ฿0", tag: "ส่งด่วน", tagColor: "#00bfa5", expiry: "ใช้ได้ในอีก: 1 วัน", collected: true, bgColor: "#00bfa5" },
  { id: "4", type: "FREE", label: "FREE", sublabel: "โค้ดส่งฟรี", title: "ส่งฟรี", minSpend: "ขั้นต่ำ ฿0", tag: "ส่งด่วน", tagColor: "#00bfa5", expiry: "ใช้ได้ในอีก: 1 วัน", collected: true, bgColor: "#00bfa5" },
  { id: "5", type: "MH", label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด 27% ลดสูงสุด ฿1,000", minSpend: "ขั้นต่ำ ฿500", expiry: "ใช้ได้ตั้งแต่: 24.03.2026", collected: false, bgColor: "#319754" },
  { id: "6", type: "MH", label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด 27% ลดสูงสุด ฿1,000", minSpend: "ขั้นต่ำ ฿500", expiry: "ใช้ได้ตั้งแต่: 24.03.2026", collected: false, bgColor: "#319754" },
  { id: "7", type: "FREE", label: "FREE", sublabel: "โค้ดส่งฟรี", title: "ส่งฟรี", minSpend: "ขั้นต่ำ ฿0", tag: "ส่งด่วน", tagColor: "#00bfa5", expiry: "ใช้ได้ในอีก: 12 ชั่วโมง", collected: true, bgColor: "#00bfa5" },
  { id: "8", type: "VIP", label: "VIP", sublabel: "โค้ดส่วนลด", title: "ส่วนลด 50% ลดสูงสุด ฿100", minSpend: "ขั้นต่ำ ฿199", expiry: "ใช้ได้ในอีก: 1 วัน", collected: false, bgColor: "#9c27b0" },
  { id: "9", type: "MH", label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด 23% ลดสูงสุด ฿1,000", minSpend: "ขั้นต่ำ ฿500", expiry: "ใช้ได้ตั้งแต่: 24.03.2026", collected: false, bgColor: "#319754" },
  { id: "10", type: "MH", label: "MH", sublabel: "โค้ดส่วนลด", title: "ส่วนลด 17% ลดสูงสุด ฿3,000", minSpend: "ขั้นต่ำ ฿200", expiry: "ใช้ได้ตั้งแต่: 24.03.2026", collected: false, bgColor: "#319754" },
];

const matches = (c: Coupon, tab: CouponType) =>
  tab === "all" ? true : tab === "discount" ? c.type === "MH" || c.type === "VIP" : c.type === "FREE";

function FilterChips({ coupons, tab, setTab }: { coupons: Coupon[]; tab: CouponType; setTab: (t: CouponType) => void }) {
  const items: { key: CouponType; label: string }[] = [
    { key: "all", label: "ทั้งหมด" },
    { key: "discount", label: "ส่วนลด" },
    { key: "free_shipping", label: "ส่งฟรี" },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
      {items.map((it) => {
        const active = tab === it.key;
        const count = coupons.filter((c) => matches(c, it.key)).length;
        return (
          <PressableScale key={it.key} onPress={() => setTab(it.key)} scaleTo={0.92}>
            <GlassView
              glassEffectStyle="regular"
              colorScheme="light"
              tintColor={active ? "rgba(49,151,84,0.22)" : "rgba(255,255,255,0.5)"}
              isInteractive
              style={{ height: 34, paddingHorizontal: 16, borderRadius: 999, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: active ? "rgba(49,151,84,0.45)" : "rgba(0,0,0,0.06)" }}
            >
              <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? BRAND_GREEN_DARK : "#374151" }}>{it.label}</Text>
              {count > 0 ? (
                <View style={{ minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: active ? "rgba(38,122,67,0.16)" : "rgba(0,0,0,0.07)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: active ? BRAND_GREEN_DARK : "#374151", lineHeight: 13 }}>{count}</Text>
                </View>
              ) : null}
            </GlassView>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

function CouponCard({ coupon, onCollect }: { coupon: Coupon; onCollect: (id: string) => void }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", overflow: "hidden" }}>
      <View style={{ width: 84, backgroundColor: coupon.bgColor, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff" }}>{coupon.label}</Text>
        <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.95)", marginTop: 2 }}>{coupon.sublabel}</Text>
        <View style={{ position: "absolute", right: -6, top: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: "#fafafa" }} />
        <View style={{ position: "absolute", right: -6, bottom: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: "#fafafa" }} />
      </View>

      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, gap: 10 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#222" }} numberOfLines={2}>{coupon.title}</Text>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>{coupon.minSpend}</Text>
          {coupon.tag ? (
            <View style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: coupon.tagColor, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 1.5 }}>
              <Text style={{ fontSize: 10, color: coupon.tagColor }}>{coupon.tag}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Clock size={11} color="#999" strokeWidth={2.2} />
            <Text style={{ fontSize: 11, color: "#999" }}>{coupon.expiry}</Text>
          </View>
        </View>

        {coupon.collected ? (
          <View style={{ backgroundColor: "#f0f0f0", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
            <Text style={{ fontSize: 12, color: "#999" }}>เก็บแล้ว</Text>
          </View>
        ) : (
          <Pressable onPress={() => onCollect(coupon.id)} className="active:opacity-80" style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>เก็บ</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function CouponCollectScreen() {
  const nav = useNavigation<Nav>();
  const [coupons, setCoupons] = useState(mockCoupons);
  const [tab, setTab] = useState<CouponType>("all");

  const [showToast, setShowToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const handleCollect = (id: string) => {
    setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, collected: true } : c)));
    setShowToast(true);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setShowToast(false);
    });
  };

  const available = coupons.filter((c) => !c.collected).length;
  const filtered = coupons.filter((c) => matches(c, tab));

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader
        title="เก็บคูปอง"
        subtitle={`${available} คูปองให้เก็บ`}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        bottomSlot={<FilterChips coupons={coupons} tab={tab} setTab={setTab} />}
      />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}>
          {filtered.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} onCollect={handleCollect} />
          ))}
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 24 }} />
      </View>

      {/* Floating confirmation toast */}
      {showToast ? (
        <Animated.View pointerEvents="none" style={{ position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center", zIndex: 20, opacity: toastOpacity }}>
          <View className="flex-row items-center" style={{ paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999, backgroundColor: "rgba(10,10,10,0.85)", gap: 8, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}>
            <CheckCircle2 size={15} color="#fff" strokeWidth={2.2} />
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>เก็บคูปองสำเร็จ</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
