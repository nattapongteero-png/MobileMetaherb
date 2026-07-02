import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Pencil, Trash2, MapPin, Phone } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { usePayment } from "../context/PaymentContext";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { Address } from "../data/addresses";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function IconBtn({ onPress, children, label }: { onPress: () => void; children: React.ReactNode; label: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityLabel={label} className="items-center justify-center active:opacity-60" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f3f3" }}>
      {children}
    </Pressable>
  );
}

export function AddressScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { addresses, setDefaultAddress, removeAddress } = usePayment();

  const remove = (a: Address) =>
    Alert.alert("ลบที่อยู่", `ลบที่อยู่ของ "${a.name}"?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => removeAddress(a.id) },
    ]);

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader title="ที่อยู่ของฉัน" subtitle={`${addresses.length} ที่อยู่`} onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 110 + insets.bottom, gap: 12 }}>
          {addresses.map((a) => (
            <View key={a.id} style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: a.isDefault ? "rgba(49,151,84,0.4)" : "#ececed", padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>{a.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Phone size={11} color={TEXT_MUTED} strokeWidth={2.2} />
                    <Text style={{ fontSize: 12, color: TEXT_MUTED }}>{a.phone}</Text>
                  </View>
                </View>
                {a.isDefault ? (
                  <View style={{ backgroundColor: "rgba(49,151,84,0.12)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: BRAND_GREEN }}>ค่าเริ่มต้น</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ flexDirection: "row", gap: 7 }}>
                <MapPin size={14} color={BRAND_GREEN} strokeWidth={2} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, color: "#0a0a0a", lineHeight: 20 }}>{a.detail}</Text>
                  <Text style={{ fontSize: 12.5, color: TEXT_MUTED, lineHeight: 19, marginTop: 1 }}>{a.area}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: "#f0f0f0", marginTop: 12, marginBottom: 10 }} />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {!a.isDefault ? (
                  <Pressable onPress={() => setDefaultAddress(a.id)} hitSlop={6} className="active:opacity-60">
                    <Text style={{ fontSize: 12.5, color: BRAND_GREEN, fontWeight: "600" }}>ตั้งเป็นค่าเริ่มต้น</Text>
                  </Pressable>
                ) : null}
                <View style={{ flex: 1 }} />
                <IconBtn onPress={() => nav.navigate("AddAddress", { id: a.id })} label="แก้ไข"><Pencil size={15} color={TEXT_SECONDARY} strokeWidth={2.2} /></IconBtn>
                <IconBtn onPress={() => remove(a)} label="ลบ"><Trash2 size={15} color="#ef4444" strokeWidth={2.2} /></IconBtn>
              </View>
            </View>
          ))}
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 24 }} />
      </View>

      {/* Floating add button → opens the shared add-address sheet */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 18 }}>
        <View style={{ borderRadius: 34, shadowColor: "#0a3d22", shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 14 }}>
          <GlassView glassEffectStyle="regular" colorScheme="light" style={{ borderRadius: 34, overflow: "hidden", flexDirection: "row", padding: 8 }}>
            <Pressable onPress={() => nav.navigate("AddAddress")} className="flex-row items-center justify-center active:opacity-80" style={{ flex: 1, backgroundColor: BRAND_GREEN, borderRadius: 999, height: 50, gap: 6 }}>
              <Plus size={18} color="#fff" strokeWidth={2.6} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>เพิ่มที่อยู่ใหม่</Text>
            </Pressable>
          </GlassView>
        </View>
      </View>
    </View>
  );
}
