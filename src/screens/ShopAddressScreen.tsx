import { glassTint } from "../theme/tokens";
import { useState, type ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Linking,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Check, MapPin, Pencil, Search, Store, X } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import { useSeller } from "../context/SellerContext";
import { POSTAL_CODES, type PostalEntry } from "../data/thaiPostalCodes";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Same field look as the customer "เพิ่มที่อยู่" screen (AddAddressScreen).
const inputStyle = { minHeight: 50, backgroundColor: "#f5f5f5", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: "#374151" } as const;
const hintStyle = { fontSize: 12, color: "#9ca3af", marginTop: 2, marginLeft: 6 } as const;

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 14, color: "#1a1a1a", fontWeight: "600" }}>
        {label}
        {required ? <Text style={{ color: "#e11d48" }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function EditIconButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel="แก้ไข" className="items-center justify-center active:opacity-60" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#f3f3f3" }}>
      <Pencil size={16} color={TEXT_SECONDARY} strokeWidth={2.2} />
    </Pressable>
  );
}

export function ShopAddressScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { shopProfile, setShopProfile } = useSeller();

  // Committed (same model as AddAddressScreen: one address line + zip + tambon/amphoe/province).
  const [line, setLine] = useState("459/153 หมู่บ้านนิวไฮบ์ ถ.สุขสวัสดิ์");
  const [zip, setZip] = useState("10140");
  const [subdistrict, setSubdistrict] = useState("ราษฎร์บูรณะ");
  const [district, setDistrict] = useState("ราษฎร์บูรณะ");
  const [province, setProvince] = useState("กรุงเทพมหานคร");

  const format = (a = line, b = subdistrict, c = district, d = province, e = zip) =>
    [a, b, c, d, e].filter(Boolean).join(" ");
  const displayAddress = shopProfile?.address?.trim() || format();

  const copyAddr = () => Alert.alert("คัดลอกแล้ว", "คัดลอกที่อยู่ร้านค้าเรียบร้อย");
  const openMap = () => Linking.openURL("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(displayAddress)).catch(() => {});

  // Edit sheet + drafts (revert on cancel).
  const [sheet, setSheet] = useState(false);
  const [dLine, setDLine] = useState(line);
  const [dZip, setDZip] = useState(zip);
  const [dSub, setDSub] = useState(subdistrict);
  const [dDist, setDDist] = useState(district);
  const [dProv, setDProv] = useState(province);

  const openEdit = () => {
    setDLine(line); setDZip(zip); setDSub(subdistrict); setDDist(district); setDProv(province);
    setSheet(true);
  };

  // Postal-code search (auto-fills tambon/amphoe/province) — same as AddAddressScreen.
  const [postalOpen, setPostalOpen] = useState(false);
  const [postalQuery, setPostalQuery] = useState("");
  const pq = postalQuery.trim();
  const postalResults =
    pq === ""
      ? POSTAL_CODES
      : POSTAL_CODES.filter((p) => p.zip.includes(pq) || p.subdistrict.includes(pq) || p.district.includes(pq) || p.province.includes(pq));
  const pickPostal = (p: PostalEntry) => {
    setDZip(p.zip); setDSub(p.subdistrict); setDDist(p.district); setDProv(p.province);
    setPostalOpen(false); setPostalQuery("");
  };

  const canSave = dLine.trim() !== "" && dProv.trim() !== "" && dZip.trim() !== "";

  const saveAddress = () => {
    setLine(dLine); setZip(dZip); setSubdistrict(dSub); setDistrict(dDist); setProvince(dProv);
    setShopProfile({
      shopName: shopProfile?.shopName ?? "",
      ownerName: shopProfile?.ownerName ?? "",
      taxId: shopProfile?.taxId ?? "",
      address: format(dLine, dSub, dDist, dProv, dZip),
      email: shopProfile?.email ?? "",
      phone: shopProfile?.phone ?? "",
      description: shopProfile?.description,
    });
    setSheet(false);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="ที่อยู่ร้านค้า" subtitle="ที่อยู่สำหรับออกบิล/ใบเสร็จ" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Location preview — stylized map + address + quick actions (ported from web) */}
          <View style={{ marginTop: 8, marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
            <View style={{ height: 210 }}>
              <LinearGradient colors={["#e8f5ec", "#f0faf3", "#e8f5ec"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Svg width="100%" height="100%" viewBox="0 0 400 210" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
                <Path d="M 0 70 Q 100 50, 200 90 T 400 115" stroke="rgba(49,151,84,0.25)" strokeWidth={14} fill="none" strokeLinecap="round" />
                <Path d="M 0 70 Q 100 50, 200 90 T 400 115" stroke="#ffffff" strokeWidth={2} strokeDasharray="6 6" fill="none" strokeLinecap="round" />
                <Path d="M 80 0 Q 100 90, 180 150 T 220 210" stroke="rgba(49,151,84,0.2)" strokeWidth={10} fill="none" strokeLinecap="round" />
                <Path d="M 320 0 Q 280 70, 340 140 T 360 210" stroke="rgba(49,151,84,0.15)" strokeWidth={8} fill="none" strokeLinecap="round" />
              </Svg>
              <View style={{ position: "absolute", top: 40, left: 28, width: 38, height: 38, borderRadius: 8, backgroundColor: "rgba(49,151,84,0.10)", transform: [{ rotate: "3deg" }] }} />
              <View style={{ position: "absolute", top: 108, right: 36, width: 50, height: 50, borderRadius: 8, backgroundColor: "rgba(49,151,84,0.08)", transform: [{ rotate: "-6deg" }] }} />
              <View style={{ position: "absolute", bottom: 44, left: 52, width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(49,151,84,0.12)", transform: [{ rotate: "12deg" }] }} />
              <View style={{ position: "absolute", bottom: 20, right: 60, width: 44, height: 44, borderRadius: 8, backgroundColor: "rgba(49,151,84,0.08)", transform: [{ rotate: "-3deg" }] }} />
              <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
                  <View style={{ position: "absolute", width: 74, height: 74, borderRadius: 37, backgroundColor: "rgba(49,151,84,0.15)" }} />
                  <View style={{ position: "absolute", width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(49,151,84,0.22)" }} />
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: BRAND_GREEN, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: BRAND_GREEN, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
                    <Store size={20} color="#fff" strokeWidth={2.4} />
                  </View>
                </View>
              </View>
              <View style={{ position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
                <MapPin size={12} color={BRAND_GREEN} strokeWidth={2.4} />
                <Text style={{ fontSize: 11, color: "#374151", fontWeight: "500" }}>พิกัดร้าน</Text>
              </View>
              <View style={{ position: "absolute", top: 10, right: 10 }}>
                <EditIconButton onPress={openEdit} />
              </View>
            </View>

            <View style={{ padding: 16, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={20} color={BRAND_GREEN} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ที่อยู่ร้านค้า</Text>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a", lineHeight: 22, marginTop: 2 }}>{displayAddress}</Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={copyAddr} className="active:opacity-80" style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: 999, backgroundColor: "#f5f5f5" }}>
                  <Check size={14} color={TEXT_SECONDARY} strokeWidth={2.4} />
                  <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#374151" }}>คัดลอก</Text>
                </Pressable>
                <Pressable onPress={openMap} className="active:opacity-80" style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: 999, backgroundColor: "rgba(49,151,84,0.1)" }}>
                  <MapPin size={14} color={BRAND_GREEN} strokeWidth={2.4} />
                  <Text style={{ fontSize: 12.5, fontWeight: "600", color: BRAND_GREEN }}>เปิดแผนที่</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 14, marginHorizontal: 16, lineHeight: 17 }}>
            ที่อยู่นี้ใช้แสดงในหน้าโปรไฟล์ร้าน และออกใบเสร็จ/ใบกำกับภาษีให้ลูกค้า
          </Text>
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>

      {/* Edit address — same UX as the customer "เพิ่มที่อยู่" (address part only) */}
      <Modal visible={sheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSheet(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
            <GlassIconButton onPress={() => setSheet(false)} size={44} accessibilityLabel="ปิด">
              <X size={22} color="#1a1a1a" strokeWidth={2.6} />
            </GlassIconButton>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>แก้ไขที่อยู่ร้านค้า</Text>
            <GlassIconButton onPress={saveAddress} disabled={!canSave} size={44} accessibilityLabel="บันทึก" tintColor={glassTint("rgba(49,151,84,0.22)", "#d2e8d9")}>
              <Check size={22} color={BRAND_GREEN_DARK} strokeWidth={3} />
            </GlassIconButton>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 0 }}>
              <Field label="ที่อยู่" required>
                <TextInput value={dLine} onChangeText={setDLine} placeholder="บ้านเลขที่, หมู่ที่, ชื่ออาคาร, ซอย ถนน" placeholderTextColor="#9ca3af" style={inputStyle} />
              </Field>
              <Text style={hintStyle}>เช่น 123/4 หมู่ 5 ซ.รามคำแหง 24 ถ.รามคำแหง</Text>
            </View>

            <View style={{ gap: 0 }}>
              <Field label="รหัสไปรษณีย์" required>
                <Pressable onPress={() => setPostalOpen(true)} className="flex-row items-center justify-between active:opacity-80" style={inputStyle}>
                  <Text style={{ fontSize: 15, color: dZip ? "#374151" : "#9ca3af" }}>{dZip || "ระบุรหัสไปรษณีย์ 5 หลัก"}</Text>
                  <Search size={18} color="#9ca3af" />
                </Pressable>
              </Field>
              <Text style={hintStyle}>แตะเพื่อค้นหารหัสไปรษณีย์</Text>
            </View>

            <Field label="ตำบล/แขวง" required>
              <TextInput value={dSub} onChangeText={setDSub} placeholder="ตำบล/แขวง" placeholderTextColor="#9ca3af" style={inputStyle} />
            </Field>
            <Field label="อำเภอ/เขต" required>
              <TextInput value={dDist} onChangeText={setDDist} placeholder="อำเภอ/เขต" placeholderTextColor="#9ca3af" style={inputStyle} />
            </Field>
            <Field label="จังหวัด" required>
              <TextInput value={dProv} onChangeText={setDProv} placeholder="จังหวัด" placeholderTextColor="#9ca3af" style={inputStyle} />
            </Field>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Postal-code search — page-sheet (same as AddAddressScreen) */}
      <Modal visible={postalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setPostalOpen(false); setPostalQuery(""); }}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
            <GlassIconButton onPress={() => { setPostalOpen(false); setPostalQuery(""); }} size={44} accessibilityLabel="ปิด">
              <X size={22} color="#1a1a1a" strokeWidth={2.6} />
            </GlassIconButton>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>ค้นหาที่อยู่</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View className="flex-row items-center" style={{ backgroundColor: "#f0f0f0", borderRadius: 999, paddingHorizontal: 14, height: 46, gap: 8 }}>
              <Search size={18} color="#8a8f8a" />
              <TextInput value={postalQuery} onChangeText={setPostalQuery} placeholder="ค้นหาด้วยรหัสไปรษณีย์ หรือ ตำบล/อำเภอ" placeholderTextColor="#9ca3af" autoFocus returnKeyType="search" style={{ flex: 1, fontSize: 15, color: "#1a1a1a", paddingVertical: 0 }} />
              {postalQuery ? (
                <Pressable onPress={() => setPostalQuery("")} hitSlop={8} className="active:opacity-60">
                  <X size={16} color="#8a8f8a" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <Text style={{ fontSize: 12, color: "#8a8f8a", paddingHorizontal: 18, paddingTop: 2, paddingBottom: 8 }}>
            {pq === "" ? `ทั้งหมด ${postalResults.length} รายการ` : `พบ ${postalResults.length} รายการ`}
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {postalResults.length > 0 ? (
              postalResults.map((p) => (
                <Pressable key={`${p.zip}-${p.subdistrict}`} onPress={() => pickPostal(p)} className="flex-row items-center active:opacity-60" style={{ paddingHorizontal: 16, paddingVertical: 11, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#f3f4f6" }}>
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
    </View>
  );
}
