import { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Modal, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapPin, Search, X } from "lucide-react-native";
import { GlassIconButton } from "./GlassIconButton";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";
import { modalTopPad } from "../theme/layout";
import { POSTAL_CODES, type PostalEntry } from "../data/thaiPostalCodes";

/**
 * ค้นหาที่อยู่ด้วยรหัสไปรษณีย์ / ตำบล / อำเภอ — the same page-sheet the
 * customer's เพิ่มที่อยู่ใหม่ form uses, lifted out so the café's พื้นที่ขาย
 * can fill ตำบล/อำเภอ/จังหวัด/ไปรษณีย์ from one tap too.
 */
export function PostalPicker({ visible, onClose, onPick }: {
  visible: boolean;
  onClose: () => void;
  onPick: (entry: PostalEntry) => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results =
    q === ""
      ? POSTAL_CODES
      : POSTAL_CODES.filter(
          (p) =>
            p.zip.includes(q) ||
            p.subdistrict.toLowerCase().includes(q) ||
            p.district.toLowerCase().includes(q) ||
            p.province.toLowerCase().includes(q),
        );

  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16 + modalTopPad(insets.top), paddingBottom: 12 }}>
          <GlassIconButton onPress={close} size={44} accessibilityLabel="ปิด">
            <X size={22} color="#1a1a1a" strokeWidth={2.6} />
          </GlassIconButton>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>ค้นหาที่อยู่</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View className="flex-row items-center" style={{ backgroundColor: "#f0f0f0", borderRadius: 999, paddingHorizontal: 14, height: 46, gap: 8 }}>
            <Search size={18} color="#8a8f8a" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ค้นหาด้วยรหัสไปรษณีย์ หรือ ตำบล/อำเภอ"
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="search"
              style={{ flex: 1, fontSize: 15, color: "#1a1a1a", paddingVertical: 0 }}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8} className="active:opacity-60">
                <X size={16} color="#8a8f8a" />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={{ fontSize: 12, color: "#8a8f8a", paddingHorizontal: 18, paddingTop: 2, paddingBottom: 8 }}>
          {q === "" ? `ทั้งหมด ${results.length} รายการ` : `พบ ${results.length} รายการ`}
        </Text>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
          {results.length > 0 ? (
            results.map((p) => (
              <Pressable
                key={`${p.zip}-${p.subdistrict}`}
                onPress={() => { onPick(p); close(); }}
                className="flex-row items-center active:opacity-60"
                style={{ paddingHorizontal: 16, paddingVertical: 11, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#f3f4f6" }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={18} color={BRAND_GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#1a1a1a" }} numberOfLines={1}>
                    <Text style={{ color: BRAND_GREEN_DARK, fontWeight: "700" }}>{p.zip}</Text>
                    {"   "}
                    {p.province}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: "#8a8f8a", marginTop: 1 }} numberOfLines={1}>
                    {p.subdistrict}
                    <Text style={{ color: "#c4c4c8" }}>{"  ›  "}</Text>
                    {p.district}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Text style={{ fontSize: 14, color: "#9ca3af" }}>ไม่พบรหัสไปรษณีย์ที่ค้นหา</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
