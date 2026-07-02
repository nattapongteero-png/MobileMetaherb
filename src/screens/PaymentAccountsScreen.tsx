import { View, Text, Pressable, ScrollView, Alert, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Trash2, Plus, Landmark, CreditCard } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { PressableScale } from "../components/PressableScale";
import { useRefund, TRUEWALLET_ID } from "../context/RefundContext";
import { usePayment } from "../context/PaymentContext";
import { SvgXml } from "react-native-svg";
import { bankByCode, bankLogo, CARD_BRAND } from "../data/bankAccounts";
import { CARD_SVG, CARD_PNG } from "../data/cardLogos";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const TRUE_ORANGE = "#f37021";
const TRUEMONEY_LOGO = require("../../assets/payment/truemoney.png");
const mask = (no: string) => `•••• ${no.slice(-4)}`;

const card = { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", overflow: "hidden" } as const;
const sectionLabel = { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 8, marginLeft: 4 } as const;

export function PaymentAccountsScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { accounts, removeAccount, cards, removeCard, trueWallet, unlinkTrueWallet, defaultId, setDefault } = useRefund();
  const { selectedPayment, setSelectedPayment } = usePayment();

  // Removing the bank account that's the active checkout payment would leave
  // PaymentContext.selectedPayment dangling (blank method + skipped PIN), so
  // reset it to the default — mirrors PaymentContext.removeAddress reconciliation.
  const removeBankAccount = (id: string) => {
    if (selectedPayment === id) setSelectedPayment("promptpay");
    removeAccount(id);
  };

  const DefaultTag = () => (
    <View style={{ backgroundColor: "rgba(49,151,84,0.12)", paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999 }}>
      <Text style={{ fontSize: 10, fontWeight: "600", color: BRAND_GREEN_DARK }}>ค่าเริ่มต้น</Text>
    </View>
  );

  const confirmRemove = (label: string, fn: () => void) =>
    Alert.alert("ลบบัญชี", `ต้องการลบ ${label} ออกจากระบบใช่ไหม?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: fn },
    ]);

  const AddRow = ({ label, color, onPress }: { label: string; color: string; onPress: () => void }) => (
    <PressableScale onPress={onPress}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, height: 46, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: "#dcdcdc", borderStyle: "dashed", backgroundColor: "#fff" }}>
        <Plus size={17} color={color} strokeWidth={2.6} />
        <Text style={{ fontSize: 13.5, fontWeight: "600", color }}>{label}</Text>
      </View>
    </PressableScale>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="การชำระเงิน"
        subtitle="บัญชีที่ผูกไว้กับระบบ"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 20 }}>
        {/* Bank accounts */}
        <View>
          <Text style={sectionLabel}>บัญชีธนาคาร</Text>
          {accounts.length === 0 ? (
            <View style={[card, { padding: 20, alignItems: "center", gap: 8 }]}>
              <Landmark size={28} color="#d4d4d4" strokeWidth={1.6} />
              <Text style={{ fontSize: 13, color: TEXT_MUTED }}>ยังไม่มีบัญชีธนาคารที่ผูกไว้</Text>
            </View>
          ) : (
            <View style={card}>
              {accounts.map((a, i) => {
                const bank = bankByCode(a.bankCode);
                const logo = bankLogo(a.bankCode);
                return (
                  <View key={a.id}>
                    {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0", marginLeft: 64 }} /> : null}
                    <Pressable onPress={() => setDefault(a.id)} className="active:opacity-70" style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: logo ? "#fff" : bank.color, borderWidth: logo ? 1 : 0, borderColor: "#eee", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {logo ? <Image source={logo} style={{ width: 32, height: 32 }} resizeMode="contain" /> : <Landmark size={20} color="#fff" strokeWidth={2.2} />}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#0a0a0a" }} numberOfLines={1}>{bank.name}</Text>
                          {a.id === defaultId ? <DefaultTag /> : null}
                        </View>
                        <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }} numberOfLines={1}>{a.accountName} · {mask(a.accountNo)}</Text>
                      </View>
                      <Pressable onPress={() => confirmRemove(`${bank.name} ${mask(a.accountNo)}`, () => removeBankAccount(a.id))} hitSlop={10} className="active:opacity-60" style={{ padding: 4 }}>
                        <Trash2 size={18} color="#c0392b" strokeWidth={2} />
                      </Pressable>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
          <AddRow label="เพิ่มบัญชีธนาคาร" color={BRAND_GREEN} onPress={() => nav.navigate("AddBankAccount")} />
        </View>

        {/* Credit / debit cards */}
        <View>
          <Text style={sectionLabel}>บัตรเครดิต/เดบิต</Text>
          {cards.length === 0 ? (
            <View style={[card, { padding: 20, alignItems: "center", gap: 8 }]}>
              <CreditCard size={28} color="#d4d4d4" strokeWidth={1.6} />
              <Text style={{ fontSize: 13, color: TEXT_MUTED }}>ยังไม่มีบัตรที่ผูกไว้</Text>
            </View>
          ) : (
            <View style={card}>
              {cards.map((c, i) => {
                const brand = CARD_BRAND[c.brand];
                return (
                  <View key={c.id}>
                    {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0", marginLeft: 64 }} /> : null}
                    <Pressable onPress={() => setDefault(c.id)} className="active:opacity-70" style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
                      <View style={{ width: 48, height: 30, borderRadius: 6, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {CARD_PNG[c.brand] ? (
                          <Image source={CARD_PNG[c.brand]!} style={{ width: 48, height: 30 }} resizeMode="contain" />
                        ) : CARD_SVG[c.brand] ? (
                          <SvgXml xml={CARD_SVG[c.brand]} width={48} height={30} />
                        ) : (
                          <CreditCard size={18} color={brand.color} strokeWidth={2.2} />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#0a0a0a" }} numberOfLines={1}>{brand.name}</Text>
                          {c.id === defaultId ? <DefaultTag /> : null}
                        </View>
                        <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }} numberOfLines={1}>
                          {mask(c.last4)} · หมดอายุ {String(c.expMonth).padStart(2, "0")}/{c.expYear}
                        </Text>
                      </View>
                      <Pressable onPress={() => confirmRemove(`${brand.name} ${mask(c.last4)}`, () => removeCard(c.id))} hitSlop={10} className="active:opacity-60" style={{ padding: 4 }}>
                        <Trash2 size={18} color="#c0392b" strokeWidth={2} />
                      </Pressable>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
          <AddRow label="เพิ่มบัตรเครดิต/เดบิต" color={BRAND_GREEN} onPress={() => nav.navigate("AddCard")} />
        </View>

        {/* TrueMoney Wallet */}
        <View>
          <Text style={sectionLabel}>TrueMoney Wallet</Text>
          {trueWallet ? (
            <View style={card}>
              <Pressable onPress={() => setDefault(TRUEWALLET_ID)} className="active:opacity-70" style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <Image source={TRUEMONEY_LOGO} style={{ width: 34, height: 34 }} resizeMode="contain" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#0a0a0a" }}>TrueMoney Wallet</Text>
                    {defaultId === TRUEWALLET_ID ? <DefaultTag /> : null}
                  </View>
                  <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{mask(trueWallet)}</Text>
                </View>
                <Pressable onPress={() => confirmRemove("TrueMoney Wallet", unlinkTrueWallet)} hitSlop={10} className="active:opacity-60" style={{ padding: 4 }}>
                  <Trash2 size={18} color="#c0392b" strokeWidth={2} />
                </Pressable>
              </Pressable>
            </View>
          ) : (
            <AddRow label="ผูก TrueMoney Wallet" color={TRUE_ORANGE} onPress={() => nav.navigate("TrueMoneyLink")} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
