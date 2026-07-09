import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, ScanSearch, Search, X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { EmptyState } from "../components/EmptyState";
import { BottomFade } from "../components/BottomFade";
import { showToast } from "../components/Toast";
import {
  RegistrationCard,
  type ApplicantsProduct,
} from "./trialDetail/TrialDetailApplicants";
import {
  MOCK_REGISTRATIONS,
  getRegistrationStatus,
  type Registration,
} from "../data/ownerTrialRegistrations";
import { TRIAL_PRODUCTS, type TrialProduct } from "./TrialProductsScreen";
import { useAddedTrials } from "../data/trialDrafts";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Minimal product the card falls back to when a registration's trial isn't in the catalog. */
function fallbackProduct(trialId: string): ApplicantsProduct {
  return { id: trialId, name: trialId, tagline: "", category: "", image: "", rewardPoints: 0 };
}

// Tracking search — pushed from ติดตามสินค้าทดลอง's app-bar search button.
// Same shell as the other owner search pages; matches on ชื่อ / เบอร์ / สินค้า.
export function ShopTrialTrackingSearchScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const added = useAddedTrials();
  const catalog = useMemo<TrialProduct[]>(
    () => [...added, ...TRIAL_PRODUCTS.filter((p) => !added.some((a) => a.id === p.id))],
    [added],
  );
  const productFor = (trialId: string): ApplicantsProduct =>
    catalog.find((p) => p.id === trialId) ?? fallbackProduct(trialId);

  // Local mutable roster copy so approve / reject works within this session.
  const [regs, setRegs] = useState<Registration[]>(() =>
    MOCK_REGISTRATIONS.slice().sort((a, b) => b.submittedAt - a.submittedAt),
  );

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      regs.filter(
        (r) =>
          !q ||
          (r.name || "").toLowerCase().includes(q) ||
          (r.phone || "").includes(q) ||
          productFor(r.trialId).name.toLowerCase().includes(q),
      ),
    [regs, q, catalog],
  );

  const matchReg = (target: Registration) => (r: Registration) =>
    r.trialId === target.trialId && r.name === target.name && r.submittedAt === target.submittedAt;

  const approve = (reg: Registration) => {
    setRegs((prev) => prev.map((r) => (matchReg(reg)(r) ? { ...r, approvedAt: Date.now() } : r)));
    showToast(`อนุมัติคำขอของ "${reg.name || "ผู้สมัคร"}" เรียบร้อย`);
  };
  // Silent state update — the caller (list Alert / detail page) confirms first.
  const doReject = (reg: Registration) =>
    setRegs((prev) => prev.map((r) => (matchReg(reg)(r) ? { ...r, rejectedAt: Date.now() } : r)));

  const reject = (reg: Registration) => {
    Alert.alert("ปฏิเสธคำขอ", `ปฏิเสธคำขอของ "${reg.name || "ผู้สมัคร"}"?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ปฏิเสธ",
        style: "destructive",
        onPress: () => {
          doReject(reg);
          showToast("ปฏิเสธคำขอเรียบร้อย", "info");
        },
      },
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
              placeholder="ค้นหาชื่อ, เบอร์, สินค้า..."
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
            {q ? `พบ ${results.length} รายการ` : `คำขอทดลองทั้งหมด ${regs.length} รายการ`}
          </Text>

          {results.length === 0 ? (
            <EmptyState
              icon={<ScanSearch size={36} color="#d4d4d4" />}
              title="ไม่พบรายการ"
              subtitle="ลองค้นด้วยชื่อผู้สมัคร เบอร์โทร หรือชื่อสินค้า"
            />
          ) : (
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {results.map((r, i) => (
                <RegistrationCard
                  key={`${r.trialId}-${r.name}-${r.submittedAt}-${i}`}
                  reg={r}
                  product={productFor(r.trialId)}
                  onApprove={() => approve(r)}
                  onReject={() => reject(r)}
                  onViewEval={() => nav.navigate("OwnerTrialEvalAnswers", { reg: r, product: productFor(r.trialId) })}
                  onPress={() =>
                    nav.navigate("OwnerTrialRequestDetail", {
                      reg: r,
                      product: productFor(r.trialId),
                      onApprove: () => approve(r),
                      onReject: () => doReject(r),
                    })
                  }
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
    </View>
  );
}
