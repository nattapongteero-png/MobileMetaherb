import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Eye, FlaskConical, Pencil, Search, Trash2, X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { EmptyState } from "../components/EmptyState";
import { BottomFade } from "../components/BottomFade";
import { BottomSheet } from "../components/BottomSheet";
import { TRIAL_PRODUCTS, type TrialProduct } from "./TrialProductsScreen";
import { useAddedTrials } from "../data/trialDrafts";
import { TrialRegistryCard, TrialSheetAction, trialClosedAuto } from "./TrialRegistryView";
import { BRAND_GREEN, DIVIDER_GRAY, TEXT_PRIMARY } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Trial-product search — pushed from สินค้าทดลอง's app-bar search button.
// Same shell as the other owner search pages (glass back + autofocus pill +
// count line + fades); matches on product name or category.
export function ShopTrialSearchScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  // Local mutable state so toggle/delete persist within this screen's session
  // (same approach as the จัดการสินค้า search page).
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [manualClosed, setManualClosed] = useState<Record<string, boolean>>({});
  const [sheetFor, setSheetFor] = useState<TrialProduct | null>(null);

  const added = useAddedTrials();
  const list = useMemo(
    () => [...added, ...TRIAL_PRODUCTS.filter((p) => !added.some((a) => a.id === p.id))].filter((p) => !removed.has(p.id)),
    [added, removed],
  );
  const isClosed = (p: TrialProduct) => manualClosed[p.id] ?? trialClosedAuto(p);

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () => list.filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)),
    [list, q],
  );

  const removeProduct = (p: TrialProduct) => {
    setSheetFor(null);
    Alert.alert("ลบสินค้าทดลอง", `ลบ "${p.name}" ออกจากทะเบียน?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => setRemoved((s) => new Set(s).add(p.id)) },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={["top"]}>
        {/* App bar — back button + search pill */}
        <View className="flex-row items-center" style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}>
          <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
          </GlassIconButton>
          <View
            className="flex-row items-center rounded-full px-4"
            style={{
              flex: 1,
              height: 46,
              backgroundColor: "#ffffff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Search size={18} color="#319754" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ค้นหาชื่อสินค้า หรือหมวดหมู่"
              placeholderTextColor="#a3a3a3"
              returnKeyType="search"
              autoFocus
              style={{ flex: 1, marginLeft: 10, fontSize: 13.5, color: "#374151" }}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8} className="active:opacity-60">
                <X size={16} color="#a3a3a3" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 24 }}
        >
          <Text style={{ paddingHorizontal: 16, marginBottom: 10, fontSize: 12, color: "#737373" }}>
            {q ? `พบ ${results.length} รายการ` : `สินค้าทดลองทั้งหมด ${list.length} รายการ`}
          </Text>

          {results.length === 0 ? (
            <EmptyState
              icon={<FlaskConical size={36} color="#d4d4d4" />}
              title="ไม่พบสินค้าทดลอง"
              subtitle="ลองค้นด้วยชื่อสินค้าหรือหมวดหมู่"
            />
          ) : (
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {results.map((p) => (
                <TrialRegistryCard
                  key={p.id}
                  p={p}
                  closed={isClosed(p)}
                  onMenu={() => setSheetFor(p)}
                  onOpen={() => nav.navigate("TrialRegistryDetail", { id: p.id })}
                />
              ))}
            </View>
          )}
        </ScrollView>
        {/* Scroll fades — content dissolves into the app bar / bottom edge */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
        <BottomFade />
      </View>

      {/* Per-product action sheet — same rows as the registry list */}
      <BottomSheet visible={!!sheetFor} onClose={() => setSheetFor(null)} centerTitle title={sheetFor?.name ?? ""} minHeightRatio={0.1} maxHeightRatio={0.6}>
        {sheetFor ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 4 }}>
            <View className="flex-row items-center justify-between" style={{ paddingVertical: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: TEXT_PRIMARY }}>เปิดรับสมัคร</Text>
              <Switch
                value={!isClosed(sheetFor)}
                onValueChange={(on) => setManualClosed((m) => ({ ...m, [sheetFor.id]: !on }))}
                trackColor={{ false: "#e9e9ea", true: BRAND_GREEN }}
                thumbColor="#fff"
                ios_backgroundColor="#e9e9ea"
              />
            </View>
            <View style={{ height: 1, backgroundColor: DIVIDER_GRAY }} />
            <TrialSheetAction Icon={Pencil} label="แก้ไข" onPress={() => { const id = sheetFor.id; setSheetFor(null); nav.navigate("TrialAddProduct", { editId: id }); }} />
            <TrialSheetAction Icon={Eye} label="ดูรายละเอียด" onPress={() => { const id = sheetFor.id; setSheetFor(null); nav.navigate("TrialRegistryDetail", { id }); }} />
            <View style={{ height: 1, backgroundColor: DIVIDER_GRAY }} />
            <TrialSheetAction Icon={Trash2} label="ลบ" danger onPress={() => removeProduct(sheetFor)} />
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}
