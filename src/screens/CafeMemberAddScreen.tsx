import { useState } from "react";
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassActionBar, PrimaryAction } from "../components/GlassActionBar";
import { showToast } from "../components/Toast";
import { FieldLabel, PAYOUT_INPUT } from "./ShopPayoutScreen";
import { addCafeMember, memberByPhone } from "../store/cafeMembers";
import { appAccountByPhone } from "../store/session";
import { fmtMemberPhone } from "./CafeMembersScreen";
import { BRAND_GREEN_DARK } from "../theme/tokens";

/**
 * เพิ่มสมาชิก — a pushed page, like every other form in the back office, with
 * the action on the floating bar instead of a tick in the header.
 */
export function CafeMemberAddScreen() {
  const nav = useNavigation();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  // Once the cashier has typed a name of their own, a later phone match must not
  // overwrite it — the name they chose is the one called out at the counter.
  const [nameTouched, setNameTouched] = useState(false);
  const digits = phone.replace(/\D/g, "");
  const account = digits.length === 10 ? appAccountByPhone(digits) : undefined;

  const onPhone = (t: string) => {
    const d = t.replace(/[^0-9]/g, "");
    setPhone(d);
    // The app already knows this person's name; asking for it again is a second
    // chance to get it wrong (Postel's Law — take what we have).
    const acc = d.length === 10 ? appAccountByPhone(d) : undefined;
    if (acc && !nameTouched) setName(acc.name);
  };

  const save = () => {
    const existing = memberByPhone(digits);
    // The account behind the number, when there is one: the card is linked to
    // it now, so it survives the customer changing that number later.
    const m = addCafeMember({ phone: digits, name, userId: account?.id });
    nav.goBack();
    showToast(existing ? `เบอร์นี้เป็นสมาชิกอยู่แล้ว · ${m.name}` : `เพิ่มสมาชิก ${m.name || fmtMemberPhone(m.phone)} แล้ว`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="เพิ่มสมาชิก"
        subtitle="สมาชิกร้าน METAHERB Café"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <FieldLabel>เบอร์โทรศัพท์</FieldLabel>
            <TextInput
              value={phone}
              onChangeText={onPhone}
              placeholder="08xxxxxxxx"
              placeholderTextColor="#a3a3a3"
              keyboardType="number-pad"
              maxLength={10}
              autoFocus
              style={PAYOUT_INPUT}
            />
            {digits.length === 10 && memberByPhone(digits) ? (
              <Text style={{ fontSize: 12, color: "#b45309" }}>เบอร์นี้เป็นสมาชิกอยู่แล้ว — บันทึกแล้วจะใช้คนเดิม</Text>
            ) : account ? (
              /* Says the card will not stay behind the counter: this customer
                 opens the app and sees the same card, stamped by this bill. */
              <Text style={{ fontSize: 12, color: BRAND_GREEN_DARK }}>
                เบอร์นี้มีบัญชีในแอป · {account.name} — บัตรสะสมจะขึ้นในแอปของลูกค้าเลย
              </Text>
            ) : null}
          </View>
          <View style={{ gap: 6 }}>
            <FieldLabel>ชื่อลูกค้า</FieldLabel>
            <TextInput
              value={name}
              onChangeText={(t) => { setNameTouched(true); setName(t); }}
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
