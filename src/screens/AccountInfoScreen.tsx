import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, User, Pencil, Eye, EyeOff, Camera } from "lucide-react-native";
import { IconButton } from "../components/IconButton";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const INPUT = { backgroundColor: "#f5f5f5", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#0a0a0a" } as const;

function Card({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16 }}>{children}</View>;
}

function CardHeader({ title, editing, onEdit, onCancel, onSave }: { title: string; editing: boolean; onEdit: () => void; onCancel: () => void; onSave: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a" }}>{title}</Text>
      {!editing ? (
        <Pressable onPress={onEdit} hitSlop={6} className="flex-row items-center active:opacity-60" style={{ backgroundColor: "#f3f3f3", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, gap: 5 }}>
          <Pencil size={13} color={TEXT_SECONDARY} strokeWidth={2.2} />
          <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY, fontWeight: "500" }}>แก้ไข</Text>
        </Pressable>
      ) : (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={onCancel} hitSlop={6} className="active:opacity-60" style={{ backgroundColor: "#f3f3f3", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY, fontWeight: "500" }}>ยกเลิก</Text>
          </Pressable>
          <Pressable onPress={onSave} hitSlop={6} className="active:opacity-80" style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ fontSize: 12.5, color: "#fff", fontWeight: "600" }}>บันทึก</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function AccountInfoScreen() {
  const nav = useNavigation<Nav>();

  const [editingProfile, setEditingProfile] = useState(false);
  const [username, setUsername] = useState("user01");
  const [email, setEmail] = useState("user@test.com");
  const [phone, setPhone] = useState("090-000-0000");

  const [editingPassword, setEditingPassword] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const saveProfile = () => { setEditingProfile(false); Alert.alert("บันทึกแล้ว", "อัปเดตข้อมูลผู้ใช้เรียบร้อย"); };

  const savePassword = () => {
    if (!curPw || !newPw || !confirmPw) { Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกรหัสผ่านให้ครบ"); return; }
    if (newPw !== confirmPw) { Alert.alert("รหัสผ่านไม่ตรงกัน", "รหัสผ่านใหม่และการยืนยันไม่ตรงกัน"); return; }
    setEditingPassword(false); setCurPw(""); setNewPw(""); setConfirmPw("");
    Alert.alert("สำเร็จ", "เปลี่ยนรหัสผ่านเรียบร้อย");
  };

  const ViewRow = ({ label, value }: { label: string; value: string }) => (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 14.5, fontWeight: "500", color: "#0a0a0a" }}>{value}</Text>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND_GREEN }}>
      <StatusBar style="light" />

      <SafeAreaView edges={["top"]} style={{ backgroundColor: BRAND_GREEN }}>
        <View className="flex-row items-center" style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10, gap: 8 }}>
          <IconButton onPress={() => nav.canGoBack() && nav.goBack()} variant="translucentDark" accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={22} color="white" />
          </IconButton>
          <Text style={{ fontSize: 19, fontWeight: "700", color: "#fff" }}>บัญชีของฉัน</Text>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1, backgroundColor: "#fafafa", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 130, gap: 14 }}>
          {/* Profile photo */}
          <Card>
            <View style={{ alignItems: "center", gap: 12 }}>
              <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: "rgba(49,151,84,0.1)", borderWidth: 2, borderColor: "rgba(49,151,84,0.3)", alignItems: "center", justifyContent: "center" }}>
                <User size={46} color={BRAND_GREEN} strokeWidth={1.8} />
              </View>
              <Pressable onPress={() => Alert.alert("เปลี่ยนรูปโปรไฟล์", "เลือกรูปจากคลัง (อยู่ระหว่างพัฒนา)")} className="flex-row items-center active:opacity-80" style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9, gap: 6 }}>
                <Camera size={15} color="#fff" strokeWidth={2.2} />
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#fff" }}>เปลี่ยนรูปโปรไฟล์</Text>
              </Pressable>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, textAlign: "center" }}>รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB</Text>
            </View>
          </Card>

          {/* Role */}
          <Card>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a", marginBottom: 12 }}>บทบาท</Text>
            <View style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>ผู้ใช้งานทั่วไป</Text>
            </View>
          </Card>

          {/* User info */}
          <Card>
            <CardHeader title="ข้อมูลผู้ใช้" editing={editingProfile} onEdit={() => setEditingProfile(true)} onCancel={() => setEditingProfile(false)} onSave={saveProfile} />
            <View style={{ height: 1, backgroundColor: "#f0f0f0", marginBottom: 14 }} />
            <View style={{ gap: 14 }}>
              {editingProfile ? (
                <>
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ชื่อผู้ใช้</Text>
                    <TextInput value={username} onChangeText={setUsername} style={INPUT} placeholderTextColor="#a3a3a3" />
                  </View>
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>อีเมล</Text>
                    <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={INPUT} placeholderTextColor="#a3a3a3" />
                  </View>
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>เบอร์โทร</Text>
                    <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={INPUT} placeholderTextColor="#a3a3a3" />
                  </View>
                </>
              ) : (
                <>
                  <ViewRow label="ชื่อผู้ใช้" value={username} />
                  <ViewRow label="อีเมล" value={email} />
                  <ViewRow label="เบอร์โทร" value={phone} />
                </>
              )}
            </View>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader title="รหัสผ่าน" editing={editingPassword} onEdit={() => setEditingPassword(true)} onCancel={() => { setEditingPassword(false); setCurPw(""); setNewPw(""); setConfirmPw(""); }} onSave={savePassword} />
            <View style={{ height: 1, backgroundColor: "#f0f0f0", marginBottom: 14 }} />
            {editingPassword ? (
              <View style={{ gap: 14 }}>
                {[
                  { label: "รหัสผ่านปัจจุบัน", value: curPw, set: setCurPw, show: showCur, toggle: () => setShowCur((s) => !s) },
                  { label: "รหัสผ่านใหม่", value: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew((s) => !s) },
                  { label: "ยืนยันรหัสผ่านใหม่", value: confirmPw, set: setConfirmPw, show: showConfirm, toggle: () => setShowConfirm((s) => !s) },
                ].map((f) => (
                  <View key={f.label} style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>{f.label}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 12, paddingRight: 12 }}>
                      <TextInput value={f.value} onChangeText={f.set} secureTextEntry={!f.show} autoCapitalize="none" style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#0a0a0a" }} placeholderTextColor="#a3a3a3" />
                      <Pressable onPress={f.toggle} hitSlop={8} className="active:opacity-60">
                        {f.show ? <EyeOff size={18} color={TEXT_MUTED} /> : <Eye size={18} color={TEXT_MUTED} />}
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 14, color: TEXT_SECONDARY, letterSpacing: 2 }}>••••••••</Text>
            )}
          </Card>
        </ScrollView>
      </View>
    </View>
  );
}
