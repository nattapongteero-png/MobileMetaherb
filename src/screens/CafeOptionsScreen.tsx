import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ListPlus, Trash2 } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { EmptyState } from "../components/EmptyState";
import { PMAddFab } from "./MyShopScreen";
import { BRAND_GREEN, DIVIDER_GRAY, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";
import { useStore } from "../store/db";
import { cafeAdminStore, cafeOptionLibrary, deleteCafeOptionGroup, type CafeOptionLibraryGroup } from "../store/cafeAdmin";
import { adminCafeMenu, itemOptionRefs } from "../data/cafeAdminMenu";
import type { RootStackParamList } from "../navigation/RootStack";

/**
 * One library group — PMCard's layout language (จัดการสินค้า / จัดการเมนู):
 * flat white card, header row (icon tile + name + status chip), divider,
 * footer meta left + count right. Tap = แก้ไข.
 */
function GroupCard({ group, usedBy, onEdit }: { group: CafeOptionLibraryGroup; usedBy: number; onEdit: () => void }) {
  const remove = () =>
    Alert.alert(
      "ลบกลุ่มตัวเลือก",
      `"${group.name}" ถูกใช้อยู่ ${usedBy} เมนู — ลบแล้วจะหายจากทุกเมนูที่เปิดใช้อยู่`,
      [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ลบ", style: "destructive", onPress: () => deleteCafeOptionGroup(group.id) },
      ],
    );

  return (
    <Pressable onPress={onEdit} className="active:opacity-90" style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}>
      {/* Header — icon tile + name / status chip + delete */}
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "rgba(20,184,166,0.1)", alignItems: "center", justifyContent: "center" }}>
          <ListPlus size={22} color="#0d9488" strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{group.name}</Text>
          <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>{group.choices.length} ตัวเลือก</Text>
          <View className="flex-row items-center" style={{ gap: 6, marginTop: 6 }}>
            <View style={{ backgroundColor: (usedBy > 0 ? BRAND_GREEN : "#6b7280") + "1a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: usedBy > 0 ? BRAND_GREEN : "#6b7280" }}>
                {usedBy > 0 ? `ใช้อยู่ ${usedBy} เมนู` : "ยังไม่มีเมนูใช้"}
              </Text>
            </View>
          </View>
        </View>
        <Pressable onPress={remove} hitSlop={8} className="active:opacity-60" accessibilityLabel={`ลบ ${group.name}`}>
          <Trash2 size={16} color="#9ca3af" strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={{ height: 1, backgroundColor: DIVIDER_GRAY, marginVertical: 12 }} />

      {/* Footer — the choices themselves, price-add in brand green */}
      <View className="flex-row" style={{ gap: 6, flexWrap: "wrap" }}>
        {group.choices.map((c, i) => (
          <View key={i} style={{ backgroundColor: "#fafafa", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ fontSize: 11.5, color: TEXT_SECONDARY }}>
              {c.name}
              {c.price > 0 ? <Text style={{ color: BRAND_GREEN, fontWeight: "700" }}>{`  +฿${c.price}`}</Text> : null}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

/**
 * คลังตัวเลือกเพิ่มเติม (17.1) — the shared source for ความหวาน / เพิ่มช็อต /
 * นม / ท็อปปิ้ง. Set a group up once here and every menu can switch it on;
 * editing it later updates all of them at once, so adding a new menu never
 * means retyping the same choices. Per-menu tweaks live in CafeMenuEdit.
 */
export function CafeOptionsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const state = useStore(cafeAdminStore);
  const library = cafeOptionLibrary(state);
  const menu = adminCafeMenu(state);

  // How many menus currently have each group switched on.
  const usage = new Map<string, number>();
  for (const item of menu) {
    for (const ref of itemOptionRefs(item, library)) {
      if (ref.on) usage.set(ref.groupId, (usage.get(ref.groupId) ?? 0) + 1);
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="คลังตัวเลือกเพิ่มเติม"
        subtitle={library.length === 0 ? "ยังไม่มีกลุ่มตัวเลือก" : `ทั้งหมด ${library.length} กลุ่ม`}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {library.length === 0 ? (
            <EmptyState
              icon={<ListPlus size={36} color="#9ca3af" />}
              title="ยังไม่มีกลุ่มตัวเลือก"
              subtitle="เช่น ความหวาน · เพิ่มช็อตกาแฟ · นม · ท็อปปิ้ง"
              iconBgSize={64}
            />
          ) : (
            library.map((g) => (
              <GroupCard key={g.id} group={g} usedBy={usage.get(g.id) ?? 0} onEdit={() => nav.navigate("CafeOptionEdit", { groupId: g.id })} />
            ))
          )}
        </ScrollView>
        <HeaderFade />
      </View>

      <PMAddFab bottom={18} onPress={() => nav.navigate("CafeOptionEdit", {})} />
    </View>
  );
}
