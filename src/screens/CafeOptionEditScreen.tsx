import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Coffee, FileText, ListPlus, Save } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { BottomFade } from "../components/BottomFade";
import { GlassActionBar, PrimaryAction } from "../components/GlassActionBar";
import { showToast } from "../components/Toast";
import { Section, FieldLabel, GroupEditor, toDraft, fromDraft, type DraftGroup } from "./CafeMenuEditScreen";
import { BRAND_GREEN, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";
import { useStore } from "../store/db";
import { cafeAdminStore, cafeOptionLibrary, addCafeOptionGroup, editCafeOptionGroup } from "../store/cafeAdmin";
import { CAFE_SUBS } from "../data/cafeMenu";
import type { RootStackParamList } from "../navigation/RootStack";

const INPUT = { backgroundColor: "#fafafa", borderRadius: 999, paddingHorizontal: 20, height: 48, fontSize: 14, color: "#0a0a0a" } as const;

/**
 * เพิ่ม/แก้ไขกลุ่มตัวเลือก (คลังตัวเลือกเพิ่มเติม) — a full page, same shape as
 * CafeMenuEdit: white Sections, pill inputs, chips, floating Liquid Glass save
 * bar. Route: CafeOptionEdit ({ groupId } = edit, absent = create).
 */
export function CafeOptionEditScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { groupId } = useRoute<RouteProp<RootStackParamList, "CafeOptionEdit">>().params ?? {};
  const library = cafeOptionLibrary(useStore(cafeAdminStore));
  const group = useMemo(() => library.find((g) => g.id === groupId), [library, groupId]);
  const editing = !!group;
  const title = editing ? "แก้ไขกลุ่มตัวเลือก" : "เพิ่มกลุ่มตัวเลือก";
  const saveLabel = "บันทึก";

  const [name, setName] = useState(group?.name ?? "");
  const [draft, setDraft] = useState<DraftGroup>(() =>
    group ? toDraft(group) : { name: "", choices: [{ name: "", price: "" }] },
  );
  const [autoFor, setAutoFor] = useState<string[]>(group?.autoFor ?? []);
  const toggleAuto = (id: string) =>
    setAutoFor((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const onSave = () => {
    const n = name.trim();
    if (!n) return Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกชื่อกลุ่มตัวเลือก");
    const { choices } = fromDraft(draft);
    if (choices.length === 0) return Alert.alert("กรอกข้อมูลไม่ครบ", "ต้องมีอย่างน้อย 1 ตัวเลือก");

    if (editing && group) editCafeOptionGroup(group.id, { name: n, choices, autoFor });
    else addCafeOptionGroup({ name: n, choices, autoFor });
    showToast(`${title} "${n}" เรียบร้อย`);
    if (nav.canGoBack()) nav.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title={title} onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 110, gap: 8 }}
          // iOS insets the scroll view for the keyboard and scrolls the focused
          // field into view; without it a field below the fold sits behind the keys.
          // "interactive" lets a downward swipe dismiss it, and persistTaps means the
          // first tap on another field focuses it instead of only closing the keyboard.
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          {/* ข้อมูลกลุ่ม */}
          <Section Icon={FileText} tint="#3b82f6" title="ข้อมูลกลุ่ม">
            <View>
              <FieldLabel required>ชื่อกลุ่มตัวเลือก</FieldLabel>
              <TextInput value={name} onChangeText={setName} placeholder="เช่น ความหวาน" placeholderTextColor="#a3a3a3" style={INPUT} />
            </View>
          </Section>

          {/* ตัวเลือกในกลุ่ม — same rows as the per-menu editor */}
          <Section Icon={ListPlus} tint="#14b8a6" title="ตัวเลือกในกลุ่ม" subtitle="ตัวเลือกที่ลูกค้าเลือกได้ตอนสั่ง พร้อมราคาเพิ่มต่อตัวเลือก">
            <View style={{ backgroundColor: "#fafafa", borderRadius: 16, padding: 12 }}>
              <GroupEditor value={draft} onChange={setDraft} nameEditable={false} />
            </View>
          </Section>

          {/* เปิดใช้อัตโนมัติ — the rule that saves retyping on every new menu */}
          <Section Icon={Coffee} tint="#DF9723" title="เปิดใช้อัตโนมัติกับหมวด" subtitle="เมนูใหม่ในหมวดที่เลือกจะติดกลุ่มนี้มาให้เลย">
            <View className="flex-row" style={{ gap: 8, flexWrap: "wrap" }}>
              {CAFE_SUBS.map((s) => {
                const active = autoFor.includes(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => toggleAuto(s.id)}
                    className="active:opacity-80"
                    style={{ paddingHorizontal: 14, height: 38, justifyContent: "center", borderRadius: 999, backgroundColor: active ? BRAND_GREEN : "#fafafa", borderWidth: 1, borderColor: active ? BRAND_GREEN : "#ececec" }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {autoFor.length === 0 ? (
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>ไม่เลือกก็ได้ — เปิดใช้เองรายเมนูในหน้าแก้ไขเมนู</Text>
            ) : null}
          </Section>
        </ScrollView>
        <HeaderFade />
        <BottomFade />
      </View>

      {/* Shared floating action bar — see components/GlassActionBar */}
      <GlassActionBar>
        <PrimaryAction label={saveLabel} onPress={onSave} icon={<Save size={17} color="#fff" strokeWidth={2.6} />} />
      </GlassActionBar>
    </View>
  );
}
