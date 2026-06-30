/**
 * META Caffe — menu item detail / customisation page.
 * Laid out like ProductDetailScreen: full-bleed square hero with a floating glass
 * back button, stacked white sections on a grey backdrop, option pills + quantity
 * stepper, and a floating Liquid-Glass action bar. Adds the customised line to the
 * café cart via the onAdd route callback.
 */
import { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Image, TextInput, Dimensions, Animated, Modal, Share } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Plus, Minus, Flame, X, Share2 } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import type { RootStackParamList } from "../navigation/RootStack";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, "CafeItemDetail">;
const baht = (n: number) => "฿" + n.toLocaleString();
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const SWEET = ["ไม่หวาน", "หวานน้อย", "หวานปกติ", "หวานมาก"];
const SWEET_DEFAULT = 2;
const MILK = [
  { label: "ปกติ", price: 0 },
  { label: "นมโอ๊ต", price: 0 },
  { label: "นมอัลมอนด์", price: 20 },
  { label: "นมหมี", price: 15 },
];
const SHOT = [
  { label: "ไม่เพิ่ม", price: 0 },
  { label: "เพิ่ม 1 ช็อต", price: 20 },
  { label: "เพิ่ม 2 ช็อต", price: 40 },
];

export function CafeItemDetailScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { item, onAdd } = useRoute<Rt>().params;
  const isDrink = item.mainId === "drink";

  const [sweet, setSweet] = useState(SWEET_DEFAULT);
  const [milk, setMilk] = useState(0);
  const [shot, setShot] = useState(0);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Stretchy hero — zooms in on pull-down instead of leaving a gap.
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroScale = scrollY.interpolate({ inputRange: [-SCREEN_WIDTH, 0], outputRange: [2, 1], extrapolateLeft: "extend", extrapolateRight: "clamp" });
  const heroTranslateY = scrollY.interpolate({ inputRange: [-SCREEN_WIDTH, 0], outputRange: [-SCREEN_WIDTH / 2, 0], extrapolateLeft: "extend", extrapolateRight: "clamp" });

  const unitPrice = item.price + (item.hasMilk ? MILK[milk].price : 0) + (item.hasShot ? SHOT[shot].price : 0);
  const total = unitPrice * qty;

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (isDrink) parts.push(SWEET[sweet]);
    if (item.hasMilk) parts.push(MILK[milk].label);
    if (item.hasShot && shot > 0) parts.push(SHOT[shot].label);
    const n = note.trim();
    return parts.join(" · ") + (n ? `${parts.length ? " · " : ""}โน้ต: ${n}` : "");
  }, [isDrink, sweet, milk, shot, note, item.hasMilk, item.hasShot]);

  const addToCart = () => {
    const n = note.trim();
    const key = [item.id, isDrink ? sweet : "", item.hasMilk ? milk : "", item.hasShot ? shot : "", n].join("|");
    onAdd?.({ key, itemId: item.id, name: item.name, image: item.image, unitPrice, qty, summary });
    if (nav.canGoBack()) nav.goBack();
  };

  const onShare = () => {
    void Share.share({ message: `${item.name} · ${baht(item.price)} — META Caffe ☕` }).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="light" />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Full-bleed square hero — zooms on pull-down */}
        <Animated.View style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: "#f0f0f0", transform: [{ translateY: heroTranslateY }, { scale: heroScale }] }}>
          <Pressable onPress={() => setViewerOpen(true)} style={{ width: "100%", height: "100%" }}>
            <Image source={item.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          </Pressable>
          {item.popular ? (
            <View style={{ position: "absolute", bottom: 12, left: 16, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(234,88,12,0.95)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Flame size={12} color="#fff" strokeWidth={2.6} />
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>เมนูฮิต</Text>
            </View>
          ) : null}
        </Animated.View>

        <View style={{ backgroundColor: "#fafafa" }}>
          {/* Price + name + desc */}
          <View className="bg-white" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
            <Text style={{ fontSize: 26, fontWeight: "700", color: BRAND_GREEN, lineHeight: 30, marginBottom: 10 }}>{baht(item.price)}</Text>
            <Text style={{ fontSize: 18, fontWeight: "500", color: "#0a0a0a", lineHeight: 24, marginBottom: 8 }}>{item.name}</Text>
            <Text style={{ fontSize: 13.5, color: TEXT_SECONDARY, lineHeight: 19 }}>{item.desc}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}>
              <Flame size={13} color="#ea580c" strokeWidth={2.4} />
              <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ขายแล้ว {item.sold} {item.mainId === "drink" ? "แก้ว" : "ชิ้น"}</Text>
            </View>
          </View>

          {/* Options — each group is its own section */}
          {isDrink ? (
              <OptionGroup title="ระดับความหวาน" required>
                {SWEET.map((label, i) => (
                  <RadioRow key={label} label={label} active={sweet === i} divider={i > 0} onPress={() => setSweet(i)} />
                ))}
              </OptionGroup>
            ) : null}

            {item.hasMilk ? (
              <OptionGroup title="ชนิดนม" required>
                {MILK.map((m, i) => (
                  <RadioRow key={m.label} label={m.label} addon={m.price} active={milk === i} divider={i > 0} onPress={() => setMilk(i)} />
                ))}
              </OptionGroup>
            ) : null}

            {item.hasShot ? (
              <OptionGroup title="เพิ่มช็อต">
                {SHOT.map((s, i) => (
                  <RadioRow key={s.label} label={s.label} addon={s.price} active={shot === i} divider={i > 0} onPress={() => setShot(i)} />
                ))}
              </OptionGroup>
            ) : null}

          {/* Note */}
          <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}>
            <Text style={{ fontSize: 14, color: "#525252", marginBottom: 10, lineHeight: 18 }}>โน้ตถึงร้าน</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="เช่น หวานน้อยมาก ไม่ใส่น้ำแข็ง…"
              placeholderTextColor="#a3a3a3"
              multiline
              style={{ minHeight: 100, backgroundColor: "#f5f5f5", borderRadius: 14, padding: 14, fontSize: 14, color: "#0a0a0a", textAlignVertical: "top" }}
            />
          </View>
        </View>
      </Animated.ScrollView>

      {/* Dark scrim over the hero so the glass back button stays legible */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 60 }}>
        <LinearGradient colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0)"]} style={{ flex: 1 }} />
      </View>

      {/* Floating glass back button */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 12, paddingTop: 6 }} pointerEvents="box-none">
          <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
          </GlassIconButton>
          <GlassIconButton onPress={onShare} accessibilityLabel="แชร์">
            <Share2 size={20} color="#1a1a1a" strokeWidth={2.2} />
          </GlassIconButton>
        </View>
      </SafeAreaView>

      {/* Floating Liquid-Glass action bar */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 24 }}>
        <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
          <GlassView glassEffectStyle="regular" colorScheme="light" style={{ borderRadius: 30, overflow: "hidden", padding: 9, gap: 9 }}>
            {/* Quantity row — above the button */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingTop: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>จำนวน</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 999, backgroundColor: "#fff", overflow: "hidden" }}>
                <Pressable onPress={() => setQty((n) => Math.max(1, n - 1))} disabled={qty <= 1} hitSlop={4} className="active:opacity-60" style={{ width: 40, height: 36, alignItems: "center", justifyContent: "center", opacity: qty <= 1 ? 0.4 : 1 }}>
                  <Minus size={16} color="#0a0a0a" strokeWidth={2.4} />
                </Pressable>
                <Text style={{ minWidth: 26, textAlign: "center", fontSize: 15, fontWeight: "800", color: "#0a0a0a" }}>{qty}</Text>
                <Pressable onPress={() => setQty((n) => n + 1)} hitSlop={4} className="active:opacity-60" style={{ width: 40, height: 36, alignItems: "center", justifyContent: "center" }}>
                  <Plus size={16} color="#0a0a0a" strokeWidth={2.4} />
                </Pressable>
              </View>
            </View>
            {/* Add to cart */}
            <Pressable onPress={addToCart} className="active:opacity-90" style={{ borderRadius: 999, overflow: "hidden" }}>
              <LinearGradient colors={["#0b3d2e", "#1a7a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>เพิ่มลงตะกร้า</Text>
                <Text style={{ color: "rgba(255,255,255,0.95)", fontWeight: "800", fontSize: 15 }}>· {baht(total)}</Text>
              </LinearGradient>
            </Pressable>
          </GlassView>
        </View>
      </View>

      {/* Full-screen image viewer — tap the hero to open, tap anywhere to close */}
      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)} statusBarTranslucent>
        <Pressable onPress={() => setViewerOpen(false)} style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
          <Image source={item.image} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} resizeMode="contain" />
        </Pressable>
        <View style={{ position: "absolute", top: insets.top + 8, right: 16 }}>
          <GlassIconButton onPress={() => setViewerOpen(false)} accessibilityLabel="ปิด">
            <X size={20} color="#ffffff" strokeWidth={2.6} />
          </GlassIconButton>
        </View>
      </Modal>
    </View>
  );
}

function OptionGroup({ title, required, children }: { title: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View className="bg-white" style={{ paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <Text style={{ fontSize: 14, color: "#525252", lineHeight: 18 }}>{title}</Text>
        {required ? (
          <View style={{ backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
            <Text style={{ fontSize: 9.5, fontWeight: "700", color: BRAND_GREEN }}>เลือก 1</Text>
          </View>
        ) : null}
      </View>
      <View>{children}</View>
    </View>
  );
}

function RadioRow({ label, addon, active, divider, onPress }: { label: string; addon?: number; active: boolean; divider?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="active:opacity-70" style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11, borderTopWidth: divider ? 1 : 0, borderTopColor: "#f3f4f6" }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: active ? BRAND_GREEN : "#cbd5d1", alignItems: "center", justifyContent: "center" }}>
        {active ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND_GREEN }} /> : null}
      </View>
      <Text style={{ flex: 1, fontSize: 14, color: active ? "#0a0a0a" : "#374151", fontWeight: active ? "600" : "400" }}>{label}</Text>
      {addon ? <Text style={{ fontSize: 13, fontWeight: "600", color: active ? BRAND_GREEN : TEXT_MUTED }}>+{addon}</Text> : null}
    </Pressable>
  );
}
