import { useState } from "react";
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassActionBar, PrimaryAction } from "../components/GlassActionBar";
import { showToast } from "../components/Toast";
import { FieldLabel, PAYOUT_INPUT } from "./ShopPayoutScreen";
import { addCafeMember, memberByPhone } from "../store/cafeMembers";
import { fmtMemberPhone } from "./CafeMembersScreen";

/**
 * เพิ่มสมาชิก — a pushed page, like every other form in the back office, with
 * the action on the floating bar instead of a tick in the header.
 */
export function CafeMemberAddScreen() {
  const nav = useNavigation();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const digits = phone.replace(/\D/g, "");

  const save = () => {
    const existing = memberByPhone(digits);
    const m = addCafeMember({ phone: digits, name });
    nav.goBack();
    showToast(existing ? `เบอร์นี้เป็นสมาชิกอยู่แล้ว · ${m.name}` : `เพิ่มสมาชิก ${m.name || fmtMemberPhone(m.phone)} แล้ว`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="เพิ่มสมาชิก"
        subtitle="สมาชิกร้าน Meta Cafe"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <FieldLabel>เบอร์โทรศัพท์</FieldLabel>
            <TextInput
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ""))}
              placeholder="08xxxxxxxx"
              placeholderTextColor="#a3a3a3"
              keyboardType="number-pad"
              maxLength={10}
              autoFocus
              style={PAYOUT_INPUT}
            />
            {digits.length === 10 && memberByPhone(digits) ? (
              <Text style={{ fontSize: 12, color: "#b45309" }}>เบอร์นี้เป็นสมาชิกอยู่แล้ว — บันทึกแล้วจะใช้คนเดิม</Text>
            ) : null}
          </View>
          <View style={{ gap: 6 }}>
            <FieldLabel>ชื่อลูกค้า</FieldLabel>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="ชื่อเล่นที่ใช้เรียกหน้าร้าน"
              placeholderTextColor="#a3a3a3"
              style={PAYOUT_INPUT}
            />
          </View>
        </ScrollView>

        <GlassActionBar>
          <PrimaryAction label="เพิ่มสมาชิก" onPress={save} disabled={digits.length !== 10} />
        </GlassActionBar>
      </KeyboardAvoidingView>
    </View>
  );
}
