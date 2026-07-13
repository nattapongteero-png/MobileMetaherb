import { glassTint } from "../theme/tokens";
import { useState, type ReactNode } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { X, Search, MapPin, Check } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { usePayment } from "../context/PaymentContext";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "../theme/tokens";
import { modalTopPad } from "../theme/layout";
import { POSTAL_CODES, type PostalEntry } from "../data/thaiPostalCodes";
import type { RootStackParamList } from "../navigation/RootStack";

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
};

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <View style={{ gap: 8, flex: 1 }}>
      <Text style={{ fontSize: 14, color: "#1a1a1a", fontWeight: "600" }}>
        {label}
        {required ? <Text style={{ color: "#e11d48" }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

// Pill field on a gray fill — matches the app theme.
const inputStyle = {
  minHeight: 50,
  backgroundColor: "#f5f5f5",
  borderRadius: 999,
  paddingHorizontal: 18,
  paddingVertical: 12,
  fontSize: 15,
  color: "#374151",
} as const;

const hintStyle = { fontSize: 12, color: "#9ca3af", marginTop: 2, marginLeft: 6 } as const;

/** Add a shipping address — modal form. Typing a postal code suggests the
 *  matching subdistrict/district/province; saving appends to the shared list. */
export function AddAddressScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { addAddress, updateAddress, addresses } = usePayment();

  // Edit mode when an id is passed (from "ที่อยู่ของฉัน"); otherwise add.
  const editId = useRoute<RouteProp<RootStackParamList, "AddAddress">>().params?.id;
  const editing = editId ? addresses.find((a) => a.id === editId) : undefined;

  const [firstName, setFirstName] = useState(editing?.name ?? "");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [line, setLine] = useState(editing?.detail ?? "");
  const [zip, setZip] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? false);
  const [postalOpen, setPostalOpen] = useState(false);
  const [postalQuery, setPostalQuery] = useState("");

  // Search across zip / province / district / subdistrict.
  const q = postalQuery.trim();
  const postalResults =
    q === ""
      ? POSTAL_CODES
      : POSTAL_CODES.filter(
          (p) =>
            p.zip.includes(q) ||
            p.subdistrict.includes(q) ||
            p.district.includes(q) ||
            p.province.includes(q),
        );

  const pickPostal = (p: PostalEntry) => {
    setZip(p.zip);
    setSubdistrict(p.subdistrict);
    setDistrict(p.district);
    setProvince(p.province);
    setPostalOpen(false);
    setPostalQuery("");
  };

  // New address needs a full postal selection; editing can keep its existing area.
  const canSave =
    firstName.trim() !== "" && phone.trim() !== "" && line.trim() !== "" &&
    (editing ? true : zip.trim() !== "" && province !== "");

  const save = () => {
    if (!canSave) return;
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    const area = [subdistrict, district, province, zip].filter(Boolean).join(" ") || editing?.area || "";
    const payload = { name, phone: phone.trim(), detail: line.trim(), area, isDefault };
    if (editing) updateAddress(editing.id, payload);
    else addAddress(payload);
    nav.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "white" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Android: clear the status bar (iOS modal card already starts below it) */}
      <View
        className="flex-row items-center justify-between"
        style={{ paddingHorizontal: 16, paddingTop: 16 + modalTopPad(insets.top), paddingBottom: 12 }}
      >
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>{editing ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่ใหม่"}</Text>
        <GlassIconButton onPress={save} disabled={!canSave} size={44} accessibilityLabel="บันทึก" tintColor={glassTint("rgba(49,151,84,0.22)", "#d2e8d9")}>
          <Check size={22} color={BRAND_GREEN_DARK} strokeWidth={3} />
        </GlassIconButton>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ชื่อ + นามสกุล */}
        <View className="flex-row" style={{ gap: 12 }}>
          <Field label="ชื่อ" required>
            <TextInput value={firstName} onChangeText={setFirstName} placeholder="ระบุชื่อผู้รับ" placeholderTextColor="#9ca3af" style={inputStyle} />
          </Field>
          <Field label="นามสกุล" required>
            <TextInput value={lastName} onChangeText={setLastName} placeholder="นามสกุล" placeholderTextColor="#9ca3af" style={inputStyle} />
          </Field>
        </View>

        <Field label="เบอร์โทรศัพท์" required>
          <TextInput value={phone} onChangeText={(t) => setPhone(formatPhone(t))} placeholder="เบอร์โทรศัพท์" placeholderTextColor="#9ca3af" keyboardType="phone-pad" maxLength={12} style={inputStyle} />
        </Field>

        <View style={{ gap: 0 }}>
          <Field label="ที่อยู่" required>
            <TextInput value={line} onChangeText={setLine} placeholder="บ้านเลขที่, หมู่ที่, ชื่ออาคาร, ซอย ถนน" placeholderTextColor="#9ca3af" style={inputStyle} />
          </Field>
          <Text style={hintStyle}>เช่น 123/4 หมู่ 5 ซ.รามคำแหง 24 ถ.รามคำแหง</Text>
        </View>

        {/* รหัสไปรษณีย์ — opens a search sheet */}
        <View style={{ gap: 0 }}>
          <Field label="รหัสไปรษณีย์" required>
            <Pressable
              onPress={() => setPostalOpen(true)}
              className="flex-row items-center justify-between active:opacity-80"
              style={inputStyle}
            >
              <Text style={{ fontSize: 15, color: zip ? "#374151" : "#9ca3af" }}>
                {zip || "ระบุรหัสไปรษณีย์ 5 หลัก"}
              </Text>
              <Search size={18} color="#9ca3af" />
            </Pressable>
          </Field>
          <Text style={hintStyle}>แตะเพื่อค้นหารหัสไปรษณีย์</Text>
        </View>

        <Field label="ตำบล/แขวง" required>
          <TextInput value={subdistrict} onChangeText={setSubdistrict} placeholder="ตำบล/แขวง" placeholderTextColor="#9ca3af" style={inputStyle} />
        </Field>

        <Field label="อำเภอ/เขต" required>
          <TextInput value={district} onChangeText={setDistrict} placeholder="อำเภอ/เขต" placeholderTextColor="#9ca3af" style={inputStyle} />
        </Field>

        <Field label="จังหวัด" required>
          <TextInput value={province} onChangeText={setProvince} placeholder="จังหวัด" placeholderTextColor="#9ca3af" style={inputStyle} />
        </Field>

        <View className="flex-row items-center justify-between" style={{ paddingTop: 4 }}>
          <Text style={{ fontSize: 16, color: "#0a0a0a" }}>ตั้งเป็นที่อยู่หลัก</Text>
          <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ false: "#d1d5db", true: BRAND_GREEN }} thumbColor="#fff" />
        </View>
      </ScrollView>

      {/* Postal-code search — page-sheet modal (same style as เพิ่มที่อยู่ใหม่) */}
      <Modal
        visible={postalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          setPostalOpen(false);
          setPostalQuery("");
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: "white" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16 + modalTopPad(insets.top), paddingBottom: 12 }}>
            <GlassIconButton
              onPress={() => {
                setPostalOpen(false);
                setPostalQuery("");
              }}
              size={44}
              accessibilityLabel="ปิด"
            >
              <X size={22} color="#1a1a1a" strokeWidth={2.6} />
            </GlassIconButton>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>ค้นหาที่อยู่</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Search bar */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View
              className="flex-row items-center"
              style={{ backgroundColor: "#f0f0f0", borderRadius: 999, paddingHorizontal: 14, height: 46, gap: 8 }}
            >
              <Search size={18} color="#8a8f8a" />
              <TextInput
                value={postalQuery}
                onChangeText={setPostalQuery}
                placeholder="ค้นหาด้วยรหัสไปรษณีย์ หรือ ตำบล/อำเภอ"
                placeholderTextColor="#9ca3af"
                autoFocus
                returnKeyType="search"
                style={{ flex: 1, fontSize: 15, color: "#1a1a1a", paddingVertical: 0 }}
              />
              {postalQuery ? (
                <Pressable onPress={() => setPostalQuery("")} hitSlop={8} className="active:opacity-60">
                  <X size={16} color="#8a8f8a" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <Text style={{ fontSize: 12, color: "#8a8f8a", paddingHorizontal: 18, paddingTop: 2, paddingBottom: 8 }}>
            {q === "" ? `ทั้งหมด ${postalResults.length} รายการ` : `พบ ${postalResults.length} รายการ`}
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {postalResults.length > 0 ? (
              postalResults.map((p) => (
                <Pressable
                  key={`${p.zip}-${p.subdistrict}`}
                  onPress={() => pickPostal(p)}
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
    </KeyboardAvoidingView>
  );
}
