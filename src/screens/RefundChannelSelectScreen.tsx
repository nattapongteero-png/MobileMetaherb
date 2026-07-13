import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { X, Landmark, Wallet, Plus } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { useRefund, TRUEWALLET_ID } from "../context/RefundContext";
import { bankByCode } from "../data/bankAccounts";
import { maskPhone } from "./TrueMoneyLinkScreen";
import { BRAND_GREEN } from "../theme/tokens";
import { modalTopPad } from "../theme/layout";
import type { RootStackParamList } from "../navigation/RootStack";

const GROUPED_BG = "#f2f2f7";
const LABEL = "#1c1c1e";
const VALUE = "#8a8f8a";
const SEP = "rgba(60,60,67,0.12)";
const TRUEMONEY = "#f37021";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function Radio({ active }: { active: boolean }) {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: active ? BRAND_GREEN : "#cbd0cb", alignItems: "center", justifyContent: "center", marginLeft: 8 }}>
      {active ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: BRAND_GREEN }} /> : null}
    </View>
  );
}

/** Refund-channel picker — iOS grouped sheet (same shape as the payment / shipping picker). */
export function RefundChannelSelectScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { accounts, trueWallet, selectedId, setSelectedId } = useRefund();

  const choose = (id: string) => {
    setSelectedId(id);
    nav.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      {/* Android: clear the status bar (iOS modal card already starts below it) */}
      <View style={[styles.header, { paddingTop: 16 + modalTopPad(insets.top) }]}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: LABEL }}>ช่องทางรับเงินคืน</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* Bank accounts */}
        <Text style={styles.groupLabel}>บัญชีธนาคาร</Text>
        <View style={styles.card}>
          {accounts.map((a, i) => {
            const active = selectedId === a.id;
            const bank = bankByCode(a.bankCode);
            const divider = i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP } : null;
            return (
              <Pressable key={a.id} onPress={() => choose(a.id)} className="flex-row items-center active:opacity-70" style={[styles.row, divider]}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bank.color + "1a", alignItems: "center", justifyContent: "center" }}>
                  <Landmark size={20} color={bank.color} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text style={{ fontSize: 15.5, color: LABEL, fontWeight: active ? "600" : "500" }}>{bank.name} ({bank.code})</Text>
                    {a.isDefault ? (
                      <View style={{ backgroundColor: "rgba(49,151,84,0.12)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: BRAND_GREEN }}>ค่าเริ่มต้น</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 12.5, color: VALUE, marginTop: 1 }}>บัญชี •••• {a.accountNo ? a.accountNo.slice(-4) : "----"} · {a.accountName}</Text>
                </View>
                <Radio active={active} />
              </Pressable>
            );
          })}

          {/* Add bank account */}
          <Pressable onPress={() => nav.navigate("AddBankAccount")} className="flex-row items-center active:opacity-70" style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP }]}>
            <View style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: BRAND_GREEN, borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}>
              <Plus size={20} color={BRAND_GREEN} strokeWidth={2.4} />
            </View>
            <Text style={{ flex: 1, marginLeft: 12, fontSize: 15, color: BRAND_GREEN, fontWeight: "600" }}>เพิ่มบัญชีธนาคาร</Text>
          </Pressable>
        </View>

        {/* TrueMoney Wallet */}
        <Text style={styles.groupLabel}>TrueMoney Wallet</Text>
        <View style={styles.card}>
          {trueWallet ? (
            <Pressable onPress={() => choose(TRUEWALLET_ID)} className="flex-row items-center active:opacity-70" style={styles.row}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: TRUEMONEY + "1a", alignItems: "center", justifyContent: "center" }}>
                <Wallet size={20} color={TRUEMONEY} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 15.5, color: LABEL, fontWeight: selectedId === TRUEWALLET_ID ? "600" : "500" }}>TrueMoney Wallet</Text>
                <Text style={{ fontSize: 12.5, color: VALUE, marginTop: 1 }}>ผูกไว้ · {maskPhone(trueWallet)}</Text>
              </View>
              <Radio active={selectedId === TRUEWALLET_ID} />
            </Pressable>
          ) : (
            <Pressable onPress={() => nav.navigate("TrueMoneyLink")} className="flex-row items-center active:opacity-70" style={styles.row}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: TRUEMONEY + "1a", alignItems: "center", justifyContent: "center" }}>
                <Wallet size={20} color={TRUEMONEY} strokeWidth={2.2} />
              </View>
              <Text style={{ flex: 1, marginLeft: 12, fontSize: 15, color: TRUEMONEY, fontWeight: "600" }}>ผูก TrueMoney Wallet</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  groupLabel: { fontSize: 12.5, color: "#6e6e73", fontWeight: "600", marginLeft: 32, marginTop: 14, marginBottom: 6 },
  card: { backgroundColor: "#fff", borderRadius: 20, marginHorizontal: 16, overflow: "hidden" },
  row: { minHeight: 60, paddingHorizontal: 16, paddingVertical: 12 },
});
