import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Inbox, Search, X } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { EmptyState } from "../components/EmptyState";
import { BottomFade } from "../components/BottomFade";
import type { RootStackParamList } from "../navigation/RootStack";
import { ComplaintRow } from "./ShopComplaintsView";
import { useComplaints } from "../context/ComplaintContext";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Complaint search — pushed from เรื่องร้องเรียน's app-bar search button.
// Matches complaint id, order id, customer name, or product name.
export function ShopComplaintSearchScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { complaints } = useComplaints();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      q
        ? complaints.filter(
            (c) =>
              c.id.toLowerCase().includes(q) ||
              c.orderId.toLowerCase().includes(q) ||
              c.customer.toLowerCase().includes(q) ||
              c.product.toLowerCase().includes(q),
          )
        : complaints,
    [complaints, q],
  );

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
              placeholder="ค้นหาเลขคำร้อง เลขออเดอร์ ลูกค้า หรือสินค้า"
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
          {q ? `พบ ${results.length} เรื่องร้องเรียน` : `เรื่องร้องเรียนทั้งหมด ${complaints.length} รายการ`}
        </Text>

        {results.length === 0 ? (
          <EmptyState
            icon={<Inbox size={36} color="#d4d4d4" />}
            title="ไม่พบเรื่องร้องเรียน"
            subtitle="ลองค้นด้วยเลขคำร้อง เลขออเดอร์ หรือชื่อลูกค้า"
          />
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {results.map((c) => (
              <ComplaintRow key={c.id} c={c} onPress={() => nav.navigate("ShopComplaintDetail", { id: c.id })} />
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
