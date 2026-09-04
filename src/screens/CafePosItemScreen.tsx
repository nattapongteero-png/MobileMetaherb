/**
 * POS — หน้าเลือกตัวเลือกก่อนลงบิล (17.2).
 *
 * Deliberately the same page as the customer's CafeItemDetail: full-bleed hero,
 * stacked white option sections with radio rows, โน้ตถึงร้าน, and the floating
 * Liquid-Glass bar carrying จำนวน + the running total. The cashier and the
 * customer are configuring the same cup, so they should be reading the same
 * screen. Only the source of the options differs — here they come from the
 * shared คลังตัวเลือก (per-menu switches included), not hard-coded lists.
 */
import { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Image, TextInput, Dimensions, Animated, Modal } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { ChevronLeft, Coffee, Flame, Minus, Plus, X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { BRAND_GREEN, GLASS_BAR_TINT, LIQUID_GLASS, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";
import { useStore } from "../store/db";
import { cafeAdminStore, cafeOptionLibrary, type CafeOptionGroup } from "../store/cafeAdmin";
import { activeCafeMenu, resolveOptionGroups } from "../data/cafeAdminMenu";
import { CAFE_SUBS } from "../data/cafeMenu";
import { setPosDraft, type PosChoice } from "../store/posDraft";
import { appWidth, isTablet } from "../theme/layout";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, "CafePosItem">;

const baht = (n: number) => "฿" + n.toLocaleString();
const SCREEN_WIDTH = appWidth();
const SCREEN_HEIGHT = Dimensions.get("window").height;
const HERO_H = isTablet() ? Math.round(SCREEN_WIDTH * 0.75) : SCREEN_WIDTH;

/**
 * A group whose choices are all free is a variant the cashier must settle
 * (ความหวาน — a cup with no sweetness picked doesn't exist); one with a paid
 * choice is an add-on, so it leads with ไม่เพิ่ม and can be left alone.
 */
const isRequiredGroup = (g: CafeOptionGroup): boolean => g.choices.every((c) => c.price === 0);

export function CafePosItemScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { itemId } = useRoute<Rt>().params;
  const adminState = useStore(cafeAdminStore);
  const item = useMemo(() => activeCafeMenu(adminState).find((i) => i.id === itemId), [adminState, itemId]);
  const groups = useMemo(
    () => (item ? resolveOptionGroups(item, cafeOptionLibrary(adminState)) : []),
    [item, adminState],
  );

  // ชื่อกลุ่ม → ชื่อตัวเลือก. Add-on groups start empty (= ไม่เพิ่ม); required
  // ones stay empty until the cashier has asked, which gates the action button.
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Stretchy hero — zooms in on pull-down instead of leaving a gap.
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroScale = scrollY.interpolate({ inputRange: [-HERO_H, 0], outputRange: [2, 1], extrapolateLeft: "extend", extrapolateRight: "clamp" });
  const heroTranslateY = scrollY.interpolate({ inputRange: [-HERO_H, 0], outputRange: [-HERO_H / 2, 0], extrapolateLeft: "extend", extrapolateRight: "clamp" });

  if (!item) {
    // The menu changed under the page (ปิดขาย / ลบเมนู) — nothing to configure.
    return (
      <View style={{ flex: 1, backgroundColor: "#fafafa", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <StatusBar style="dark" />
        <Text style={{ fontSize: 14, color: TEXT_MUTED }}>ไม่พบเมนูนี้แล้ว</Text>
        <Pressable onPress={() => nav.canGoBack() && nav.goBack()} style={{ height: 44, paddingHorizontal: 20, borderRadius: 999, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>กลับไปหน้า POS</Text>
        </Pressable>
      </View>
    );
  }

  const accent = CAFE_SUBS.find((s) => s.id === item.subId)?.accent ?? BRAND_GREEN;
  const image = item.imageUri ? { uri: item.imageUri } : item.image != null ? item.image : null;

  const chosen: PosChoice[] = groups
    .map((g) => {
      const c = g.choices.find((x) => x.name === picked[g.name]);
      return c ? { group: g.name, choice: c.name, price: c.price } : null;
    })
    .filter((c): c is PosChoice => !!c);
  const unitPrice = item.price + chosen.reduce((s, c) => s + c.price, 0);
  const total = unitPrice * qty;
  const missing = groups.filter((g) => isRequiredGroup(g) && !picked[g.name]);

  const addToBill = () => {
    const n = note.trim();
    setPosDraft({
      key: [item.id, ...chosen.map((c) => `${c.group}=${c.choice}`), n].join("|"),
      itemId: item.id,
      qty,
      opts: chosen,
      note: n || undefined,
    });
    Haptics.selectionAsync().catch(() => {});
    if (nav.canGoBack()) nav.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style={image ? "light" : "dark"} />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 150 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Full-bleed square hero — zooms on pull-down */}
        <Animated.View style={{ width: SCREEN_WIDTH, height: HERO_H, backgroundColor: "#f0f0f0", transform: [{ translateY: heroTranslateY }, { scale: heroScale }] }}>
          {image ? (
            <Pressable onPress={() => setViewerOpen(true)} style={{ width: "100%", height: "100%" }}>
              <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" resizeMethod="resize" />
            </Pressable>
          ) : (
            <View style={{ width: "100%", height: "100%", backgroundColor: `${accent}1a`, alignItems: "center", justifyContent: "center" }}>
              <Coffee size={64} color={accent} strokeWidth={1.6} />
            </View>
          )}
        </Animated.View>

        <View style={{ backgroundColor: "#fafafa" }}>
          {/* Price + name + desc */}
          <View className="bg-white" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
            <Text style={{ fontSize: 26, fontWeight: "700", color: BRAND_GREEN, lineHeight: 30, marginBottom: 10 }}>{baht(item.price)}</Text>
            <Text style={{ fontSize: 18, fontWeight: "500", color: "#0a0a0a", lineHeight: 24, marginBottom: 8 }}>{item.name}</Text>
            {item.desc ? <Text style={{ fontSize: 13.5, color: TEXT_SECONDARY, lineHeight: 19 }}>{item.desc}</Text> : null}
            {item.sold ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}>
                <Flame size={13} color="#ea580c" strokeWidth={2.4} />
                <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ขายแล้ว {item.sold} {item.mainId === "drink" ? "แก้ว" : "ชิ้น"}</Text>
              </View>
            ) : null}
          </View>

          {/* ตัวเลือกเพิ่มเติม — one white section per group, straight from the
              shared คลังตัวเลือก, so the POS always matches the storefront */}
          {groups.map((g) => {
            const required = isRequiredGroup(g);
            const chosenName = picked[g.name];
            return (
              <OptionGroup key={g.name} title={g.name} required={required}>
                {!required ? (
                  <RadioRow
                    label="ไม่เพิ่ม"
                    active={!chosenName}
                    onPress={() => { Haptics.selectionAsync().catch(() => {}); setPicked((p) => { const n = { ...p }; delete n[g.name]; return n; }); }}
                  />
                ) : null}
                {g.choices.map((c, i) => (
                  <RadioRow
                    key={c.name}
                    label={c.name}
                    addon={c.price}
                    active={chosenName === c.name}
                    divider={!required ? true : i > 0}
                    onPress={() => { Haptics.selectionAsync().catch(() => {}); setPicked((p) => ({ ...p, [g.name]: c.name })); }}
                  />
                ))}
              </OptionGroup>
            );
          })}

          {/* โน้ตถึงร้าน — the cashier types what the customer says out loud */}
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
      {image ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 60 }}>
          <LinearGradient colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0)"]} style={{ flex: 1 }} />
        </View>
      ) : null}

      {/* Floating glass back button */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <View className="flex-row items-center" style={{ paddingHorizontal: 12, paddingTop: 6 }} pointerEvents="box-none">
          <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
          </GlassIconButton>
        </View>
      </SafeAreaView>

      {/* Floating Liquid-Glass action bar — จำนวน above, add below */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 24 }}>
        <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
          <GlassView glassEffectStyle="regular" colorScheme="light" tintColor={GLASS_BAR_TINT} style={{ borderRadius: 34, overflow: "hidden", padding: 9, gap: 9 }}>
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
            <Pressable onPress={addToBill} disabled={missing.length > 0} className="active:opacity-90" style={{ borderRadius: 999, overflow: "hidden", opacity: missing.length > 0 ? 0.45 : 1 }}>
              <LinearGradient colors={["#0b3d2e", "#1a7a4c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {missing.length > 0 ? (
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>เลือก{missing[0].name}ก่อน</Text>
                ) : (
                  <>
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>เพิ่มลงบิล</Text>
                    <Text style={{ color: "rgba(255,255,255,0.95)", fontWeight: "800", fontSize: 15 }}>· {baht(total)}</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </GlassView>
        </View>
      </View>

      {/* Full-screen image viewer — tap the hero to open, tap anywhere to close */}
      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)} statusBarTranslucent>
        <Pressable onPress={() => setViewerOpen(false)} style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
          {image ? <Image source={image} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} resizeMode="contain" /> : null}
        </Pressable>
        <View style={{ position: "absolute", top: insets.top + 8, right: 16 }}>
          <GlassIconButton onPress={() => setViewerOpen(false)} accessibilityLabel="ปิด">
            {/* Android glass shim = white circle → X must be dark there. */}
            <X size={20} color={!LIQUID_GLASS ? "#1a1a1a" : "#ffffff"} strokeWidth={2.6} />
          </GlassIconButton>
        </View>
      </Modal>
    </View>
  );
}

// Same two primitives as CafeItemDetail, so both pages read identically.
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
