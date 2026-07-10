import { useState, type ComponentProps, type ReactNode } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert, Image, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { User, Pencil, Eye, EyeOff, Camera, ShieldCheck, Check, X } from "lucide-react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { getImagePicker } from "../utils/imagePicker";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import { useStore } from "../store/db";
import { sessionStore, updateProfile } from "../store/session";

// Pill input on a gray fill — same as the add-address / add-bank forms.
const INPUT = { minHeight: 50, backgroundColor: "#f5f5f5", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: "#374151" } as const;

// Same member portrait the Account tab shows, so the profile photo matches.
const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1633332755192-727a05c4013d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400";

// Keep digits only, cap at 10, and format as 0XX-XXX-XXXX.
const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
};

type FAName = ComponentProps<typeof FontAwesome5>["name"];
const PROVIDERS: { id: string; name: string; icon: FAName; color: string; detail: string }[] = [
  { id: "google", name: "Google", icon: "google", color: "#ea4335", detail: "nattapong.t@gmail.com" },
  { id: "facebook", name: "Facebook", icon: "facebook", color: "#1877f2", detail: "ณัฐพงษ์ ธีโรภาส" },
  { id: "line", name: "LINE", icon: "line", color: "#06c755", detail: "ณัฐพงษ์" },
];

// Full-bleed white section (matches the order detail / complaint pages).
function Section({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View className="bg-white" style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      {title ? (
        <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{title}</Text>
          {right}
        </View>
      ) : null}
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

function FieldLabel({ children }: { children: string }) {
  return <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>{children}</Text>;
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 3 }}>
      <FieldLabel>{label}</FieldLabel>
      <Text style={{ fontSize: 14.5, fontWeight: "500", color: "#0a0a0a" }}>{value}</Text>
    </View>
  );
}

// Reusable header for the edit sheets — X close + title + green save text.
function SheetHeader({ title, onClose, onSave, canSave }: { title: string; onClose: () => void; onSave: () => void; canSave: boolean }) {
  return (
    <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
      <GlassIconButton onPress={onClose} size={44} accessibilityLabel="ปิด">
        <X size={22} color="#1a1a1a" strokeWidth={2.6} />
      </GlassIconButton>
      <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>{title}</Text>
      <GlassIconButton onPress={onSave} disabled={!canSave} size={44} accessibilityLabel="บันทึก" tintColor="rgba(49,151,84,0.22)">
        <Check size={22} color={BRAND_GREEN_DARK} strokeWidth={3} />
      </GlassIconButton>
    </View>
  );
}

export function AccountInfoScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const [avatar, setAvatar] = useState<string | null>(DEFAULT_AVATAR);

  // Committed profile values — the single session user, not a private copy.
  const { user } = useStore(sessionStore);
  const username = user?.name ?? "";
  const email = user?.email ?? "";
  const phone = user?.phone ?? "";

  // Profile edit sheet (drafts so Cancel/close reverts).
  const [profileSheet, setProfileSheet] = useState(false);
  const [dName, setDName] = useState("");
  const [dEmail, setDEmail] = useState("");
  const [dPhone, setDPhone] = useState("");
  const openProfile = () => { setDName(username); setDEmail(email); setDPhone(phone); setProfileSheet(true); };
  // Save only when something changed AND no field was cleared.
  const profileDirty = dName.trim() !== username || dEmail.trim() !== email || dPhone.trim() !== phone;
  const profileValid = dName.trim() !== "" && dEmail.trim() !== "" && dPhone.trim() !== "";
  const canSaveProfile = profileDirty && profileValid;
  const saveProfile = () => {
    if (!canSaveProfile) return;
    updateProfile({ name: dName.trim(), email: dEmail.trim(), phone: dPhone.trim() });
    setProfileSheet(false);
  };

  // Password edit sheet.
  const [pwSheet, setPwSheet] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const openPw = () => { setCurPw(""); setNewPw(""); setConfirmPw(""); setShowCur(false); setShowNew(false); setShowConfirm(false); setPwSheet(true); };
  // Enabled once all three fields have something typed.
  const canSavePassword = curPw !== "" && newPw !== "" && confirmPw !== "";
  const savePassword = () => {
    if (!canSavePassword) return;
    if (newPw !== confirmPw) { Alert.alert("รหัสผ่านไม่ตรงกัน", "รหัสผ่านใหม่และการยืนยันไม่ตรงกัน"); return; }
    setPwSheet(false);
    Alert.alert("สำเร็จ", "เปลี่ยนรหัสผ่านเรียบร้อย");
  };

  // Linked social accounts.
  const [linked, setLinked] = useState<Record<string, boolean>>({ google: true, facebook: true, line: false });
  const linkAccount = (p: (typeof PROVIDERS)[number]) => {
    setLinked((s) => ({ ...s, [p.id]: true }));
    Alert.alert("เชื่อมต่อสำเร็จ", `เชื่อมต่อบัญชี ${p.name} เรียบร้อย`);
  };
  const unlinkAccount = (p: (typeof PROVIDERS)[number]) =>
    Alert.alert("ยกเลิกการเชื่อมต่อ", `ต้องการยกเลิกการเชื่อมต่อ ${p.name}?`, [
      { text: "ไม่", style: "cancel" },
      { text: "ยกเลิกการเชื่อมต่อ", style: "destructive", onPress: () => setLinked((s) => ({ ...s, [p.id]: false })) },
    ]);

  const pickAvatar = async (source: "camera" | "library") => {
    const ImagePicker = getImagePicker();
    if (!ImagePicker) return;
    try {
      const opts = { mediaTypes: ["images"] as ["images"], quality: 0.8, allowsEditing: true, aspect: [1, 1] as [number, number] };
      const res = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res.canceled && res.assets[0]) setAvatar(res.assets[0].uri);
    } catch {
      Alert.alert("เปลี่ยนรูปไม่สำเร็จ", "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  };
  const changePhoto = () => {
    if (!getImagePicker()) {
      Alert.alert("ยังเปลี่ยนรูปไม่ได้", "ตัวรันนี้ยังไม่มีโมดูลกล้อง/คลัง — ต้อง build แอปใหม่จึงจะเปลี่ยนรูปได้");
      return;
    }
    Alert.alert("เปลี่ยนรูปโปรไฟล์", "เลือกแหล่งรูปภาพ", [
      { text: "ถ่ายภาพ", onPress: () => pickAvatar("camera") },
      { text: "เลือกจากคลังภาพ", onPress: () => pickAvatar("library") },
      { text: "ยกเลิก", style: "cancel" },
    ]);
  };

  const pwFields = [
    { label: "รหัสผ่านปัจจุบัน", value: curPw, set: setCurPw, show: showCur, toggle: () => setShowCur((s) => !s) },
    { label: "รหัสผ่านใหม่", value: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew((s) => !s) },
    { label: "ยืนยันรหัสผ่านใหม่", value: confirmPw, set: setConfirmPw, show: showConfirm, toggle: () => setShowConfirm((s) => !s) },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader title="บัญชีของฉัน" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Profile hero */}
          <Section>
            <View style={{ alignItems: "center", gap: 12 }}>
              <Pressable onPress={changePhoto} className="active:opacity-80">
                <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(49,151,84,0.1)", borderWidth: 2, borderColor: "rgba(49,151,84,0.3)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {avatar ? <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <User size={46} color={BRAND_GREEN} strokeWidth={1.8} />}
                </View>
                <View style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: BRAND_GREEN, borderWidth: 2.5, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={14} color="#fff" strokeWidth={2.2} />
                </View>
              </Pressable>
              <View style={{ alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#0a0a0a" }}>{username}</Text>
                <View className="flex-row items-center" style={{ backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, gap: 5 }}>
                  <ShieldCheck size={13} color={BRAND_GREEN} strokeWidth={2.2} />
                  <Text style={{ fontSize: 12.5, fontWeight: "600", color: BRAND_GREEN }}>ผู้ใช้งานทั่วไป</Text>
                </View>
              </View>
            </View>
          </Section>

          {/* User info — display only; edit opens the sheet */}
          <Section title="ข้อมูลผู้ใช้" right={<EditIconButton onPress={openProfile} />}>
            <View style={{ gap: 14 }}>
              <ViewRow label="ชื่อผู้ใช้" value={username} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
              <ViewRow label="อีเมล" value={email} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
              <ViewRow label="เบอร์โทร" value={phone} />
            </View>
          </Section>

          {/* Password — display only; edit opens the sheet */}
          <Section title="รหัสผ่าน" right={<EditIconButton onPress={openPw} />}>
            <Text style={{ fontSize: 16, color: TEXT_SECONDARY, letterSpacing: 3 }}>••••••••</Text>
          </Section>

          {/* Linked social accounts */}
          <Section title="การผูกบัญชี">
            {PROVIDERS.map((p, i) => {
              const isLinked = linked[p.id];
              return (
                <View key={p.id}>
                  {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} /> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.color, alignItems: "center", justifyContent: "center" }}>
                      <FontAwesome5 name={p.icon} size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#0a0a0a" }}>{p.name}</Text>
                      <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }} numberOfLines={1}>{isLinked ? p.detail || "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"}</Text>
                    </View>
                    {isLinked ? (
                      <Pressable onPress={() => unlinkAccount(p)} hitSlop={6} className="flex-row items-center active:opacity-70" style={{ backgroundColor: "rgba(49,151,84,0.12)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, gap: 4 }}>
                        <Check size={13} color={BRAND_GREEN} strokeWidth={2.6} />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: BRAND_GREEN }}>เชื่อมต่อแล้ว</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => linkAccount(p)} hitSlop={6} className="active:opacity-70" style={{ borderWidth: 1, borderColor: BRAND_GREEN, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: BRAND_GREEN }}>เชื่อมต่อ</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </Section>
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>

      {/* Edit user info — native page-sheet */}
      <Modal visible={profileSheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setProfileSheet(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="แก้ไขข้อมูลผู้ใช้" onClose={() => setProfileSheet(false)} onSave={saveProfile} canSave={canSaveProfile} />
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 8 }}>
              <FieldLabel>ชื่อผู้ใช้</FieldLabel>
              <TextInput value={dName} onChangeText={setDName} placeholder="ชื่อผู้ใช้" placeholderTextColor="#a3a3a3" style={INPUT} />
            </View>
            <View style={{ gap: 8 }}>
              <FieldLabel>อีเมล</FieldLabel>
              <TextInput value={dEmail} onChangeText={setDEmail} placeholder="อีเมล" placeholderTextColor="#a3a3a3" autoCapitalize="none" keyboardType="email-address" style={INPUT} />
            </View>
            <View style={{ gap: 8 }}>
              <FieldLabel>เบอร์โทร</FieldLabel>
              <TextInput value={dPhone} onChangeText={(t) => setDPhone(formatPhone(t))} placeholder="เบอร์โทร" placeholderTextColor="#a3a3a3" keyboardType="phone-pad" maxLength={12} style={INPUT} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change password — native page-sheet */}
      <Modal visible={pwSheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPwSheet(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="เปลี่ยนรหัสผ่าน" onClose={() => setPwSheet(false)} onSave={savePassword} canSave={canSavePassword} />
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
            {pwFields.map((f) => (
              <View key={f.label} style={{ gap: 8 }}>
                <FieldLabel>{f.label}</FieldLabel>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 999, paddingRight: 16, minHeight: 50 }}>
                  <TextInput value={f.value} onChangeText={f.set} secureTextEntry={!f.show} autoCapitalize="none" placeholder={f.label} placeholderTextColor="#a3a3a3" style={{ flex: 1, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: "#374151" }} />
                  <Pressable onPress={f.toggle} hitSlop={8} className="active:opacity-60">
                    {f.show ? <EyeOff size={18} color={TEXT_MUTED} /> : <Eye size={18} color={TEXT_MUTED} />}
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
