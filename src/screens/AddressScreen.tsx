import { useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, TextInput, Alert } from "react-native";
import { Plus, Pencil, Trash2, MapPin, Phone } from "lucide-react-native";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

type Address = {
  id: string;
  name: string;
  phone: string;
  area: string;
  detail: string;
  isDefault: boolean;
};

const INITIAL: Address[] = [
  { id: "1", name: "username01", phone: "090-000-0000", area: "ราษฎร์บูรณะ, ราษฎร์บูรณะ, กรุงเทพมหานคร 10140", detail: "เลขที่ 2 ชั้น 2 ซอยสุขสวัสดิ์ 33", isDefault: true },
  { id: "2", name: "คุณแม่", phone: "081-234-5678", area: "ปากเกร็ด, นนทบุรี 11120", detail: "99/5 หมู่บ้านเมืองทอง ถ.แจ้งวัฒนะ", isDefault: false },
  { id: "3", name: "ที่ทำงาน", phone: "02-111-2222", area: "ลาดพร้าว, กรุงเทพมหานคร 10230", detail: "45/12 ซอยลาดพร้าว 71", isDefault: false },
];

const emptyForm = { name: "", phone: "", area: "", detail: "", isDefault: false };

// Module-scope so the TextInput isn't remounted (and refocused) on every render.
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#0a0a0a" }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#a3a3a3"
        keyboardType={keyboardType ?? "default"}
        style={{ backgroundColor: "#f5f5f5", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#0a0a0a" }}
      />
    </View>
  );
}

export function AddressScreen() {
  const [addresses, setAddresses] = useState<Address[]>(INITIAL);
  const [editing, setEditing] = useState<Address | null>(null); // address being edited
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (a: Address) => { setEditing(a); setForm({ name: a.name, phone: a.phone, area: a.area, detail: a.detail, isDefault: a.isDefault }); setShowForm(true); };

  const setDefault = (id: string) => setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));

  const remove = (a: Address) =>
    Alert.alert("ลบที่อยู่", `ลบที่อยู่ของ "${a.name}"?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => setAddresses((prev) => prev.filter((x) => x.id !== a.id)) },
    ]);

  const save = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.detail.trim()) {
      Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอก ชื่อ เบอร์โทร และที่อยู่");
      return;
    }
    setAddresses((prev) => {
      let next: Address[];
      if (editing) {
        next = prev.map((a) => (a.id === editing.id ? { ...a, ...form } : a));
      } else {
        next = [...prev, { ...form, id: String(Date.now() % 100000) }];
      }
      // enforce single default
      if (form.isDefault) {
        const targetId = editing ? editing.id : next[next.length - 1].id;
        next = next.map((a) => ({ ...a, isDefault: a.id === targetId }));
      }
      return next;
    });
    setShowForm(false);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
          {addresses.map((a) => (
            <View key={a.id} style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: a.isDefault ? "rgba(49,151,84,0.4)" : "#ececed", padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
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

              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                {!a.isDefault ? (
                  <Pressable onPress={() => setDefault(a.id)} hitSlop={6} className="active:opacity-60">
                    <Text style={{ fontSize: 12.5, color: BRAND_GREEN, fontWeight: "600" }}>ตั้งเป็นค่าเริ่มต้น</Text>
                  </Pressable>
                ) : null}
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => openEdit(a)} hitSlop={6} className="flex-row items-center active:opacity-60" style={{ gap: 4 }}>
                  <Pencil size={14} color={TEXT_SECONDARY} strokeWidth={2.2} />
                  <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY }}>แก้ไข</Text>
                </Pressable>
                <Pressable onPress={() => remove(a)} hitSlop={6} className="flex-row items-center active:opacity-60" style={{ gap: 4 }}>
                  <Trash2 size={14} color="#ef4444" strokeWidth={2.2} />
                  <Text style={{ fontSize: 12.5, color: "#ef4444" }}>ลบ</Text>
                </Pressable>
              </View>
            </View>
          ))}

          {/* Add address */}
          <Pressable
            onPress={openAdd}
            className="flex-row items-center justify-center active:opacity-70"
            style={{ borderWidth: 1.5, borderColor: BRAND_GREEN, borderStyle: "dashed", borderRadius: 16, paddingVertical: 14, gap: 6 }}
          >
            <Plus size={18} color={BRAND_GREEN} strokeWidth={2.4} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: BRAND_GREEN }}>เพิ่มที่อยู่ใหม่</Text>
          </Pressable>
        </ScrollView>

      {/* Add / edit modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowForm(false)} />
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, gap: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#0a0a0a", textAlign: "center" }}>{editing ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่ใหม่"}</Text>
            <Field label="ชื่อผู้รับ" value={form.name} onChangeText={(s) => setForm((f) => ({ ...f, name: s }))} placeholder="ชื่อ-นามสกุล" />
            <Field label="เบอร์โทร" value={form.phone} onChangeText={(s) => setForm((f) => ({ ...f, phone: s }))} placeholder="08x-xxx-xxxx" keyboardType="phone-pad" />
            <Field label="ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์" value={form.area} onChangeText={(s) => setForm((f) => ({ ...f, area: s }))} placeholder="เช่น ลาดพร้าว, กรุงเทพมหานคร 10230" />
            <Field label="รายละเอียดที่อยู่" value={form.detail} onChangeText={(s) => setForm((f) => ({ ...f, detail: s }))} placeholder="บ้านเลขที่ ซอย ถนน" />

            <Pressable onPress={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))} className="flex-row items-center justify-between active:opacity-70" style={{ paddingVertical: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>ตั้งเป็นที่อยู่เริ่มต้น</Text>
              <View style={{ width: 50, height: 30, borderRadius: 15, padding: 2, backgroundColor: form.isDefault ? "#34c759" : "#e5e5ea" }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff", transform: [{ translateX: form.isDefault ? 20 : 0 }] }} />
              </View>
            </Pressable>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable onPress={() => setShowForm(false)} className="flex-1 items-center justify-center active:opacity-70" style={{ height: 48, borderRadius: 999, borderWidth: 1, borderColor: "#e5e5e5" }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: TEXT_SECONDARY }}>ยกเลิก</Text>
              </Pressable>
              <Pressable onPress={save} className="flex-1 items-center justify-center active:opacity-80" style={{ height: 48, borderRadius: 999, backgroundColor: BRAND_GREEN }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>บันทึก</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
