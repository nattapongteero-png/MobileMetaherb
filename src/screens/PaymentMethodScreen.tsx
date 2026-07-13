import { modalTopPad } from "../theme/layout";
import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronDown, ChevronUp, PlusCircle, X, Landmark } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { CardBrandIcon } from "../components/CardBrandIcon";
import { BRAND_GREEN } from "../theme/tokens";
import { PAYMENT_METHODS, BANK_APPS, type PaymentMethod } from "../data/paymentMethods";
import { SAVED_CARDS } from "../data/savedCards";
import { bankByCode, bankLogo, maskAccountNo } from "../data/bankAccounts";
import { maskPhone } from "./TrueMoneyLinkScreen";
import { usePayment } from "../context/PaymentContext";
import { useRefund } from "../context/RefundContext";
import type { RootStackParamList } from "../navigation/RootStack";

const GROUPED_BG = "#f2f2f7"; // iOS systemGroupedBackground
const LABEL = "#1c1c1e";
const VALUE = "#8a8f8a";
const SEP = "rgba(60,60,67,0.12)";

/**
 * Payment-method picker — same shape as the product filter modal: iOS grouped
 * background, white cards of radio rows. Tapping a method commits it and closes
 * (no separate confirm button); the X just dismisses.
 */
export function PaymentMethodScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { selectedPayment: selected, setSelectedPayment, trueMoneyPhone } = usePayment();
  // The user's OWN linked bank accounts (shared with refunds / PaymentAccounts).
  const { accounts } = useRefund();

  // Open each accordion by default when one of its children is the current choice.
  const [creditOpen, setCreditOpen] = useState(SAVED_CARDS.some((c) => c.id === selected));
  const [bankOpen, setBankOpen] = useState(BANK_APPS.some((a) => a.id === selected));
  const [bankTxOpen, setBankTxOpen] = useState(accounts.some((a) => a.id === selected));

  const choose = (id: string) => {
    setSelectedPayment(id);
    nav.goBack();
  };

  // Group consecutive methods by their `group` field into iOS grouped cards.
  const groups: { group?: string; items: PaymentMethod[] }[] = [];
  PAYMENT_METHODS.forEach((m) => {
    const last = groups[groups.length - 1];
    if (last && last.group === m.group) last.items.push(m);
    else groups.push({ group: m.group, items: [m] });
  });

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      {/* Header — close / title / done (iOS sheet style) */}
      <View style={[styles.header, { paddingTop: 16 + modalTopPad(insets.top) }]}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: LABEL }}>ช่องทางชำระเงิน</Text>
        {/* Spacer — balances the close button so the title stays centered. */}
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((g, gi) => (
          <View key={gi}>
            {g.group ? <Text style={styles.group}>{g.group}</Text> : null}
            <View style={[styles.card, gi > 0 && !g.group ? { marginTop: 18 } : null]}>
              {g.items.map((m, i) => {
                const divider =
                  i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP } : null;

                // Bank transfer expands inline to the user's OWN linked bank
                // accounts (from RefundContext) + "ผูกบัญชีธนาคาร" — money is sent
                // from the account the user linked, NOT into the shop's account.
                if (m.id === "bank") {
                  return (
                    <View key={m.id}>
                      <Pressable
                        onPress={() => setBankTxOpen((o) => !o)}
                        className="flex-row items-center active:opacity-70"
                        style={[styles.row, divider]}
                      >
                        <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                          {m.Icon ? <m.Icon size={22} color="#9ca3af" /> : null}
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontSize: 16, color: LABEL }}>{m.label}</Text>
                          <Text style={{ fontSize: 12, color: VALUE, marginTop: 1 }}>{m.desc}</Text>
                        </View>
                        {bankTxOpen ? (
                          <ChevronUp size={20} color="#9ca3af" />
                        ) : (
                          <ChevronDown size={20} color="#9ca3af" />
                        )}
                      </Pressable>
                      {bankTxOpen ? (
                        <>
                          {accounts.map((acc) => {
                            const aActive = selected === acc.id;
                            const bank = bankByCode(acc.bankCode);
                            const logo = bankLogo(acc.bankCode);
                            return (
                              <Pressable
                                key={acc.id}
                                onPress={() => choose(acc.id)}
                                className="flex-row items-center active:opacity-70"
                                style={[styles.row, { paddingLeft: 56, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP }]}
                              >
                                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: logo ? "#fff" : bank.color + "1a", borderWidth: logo ? 1 : 0, borderColor: "#eee", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                  {logo ? (
                                    <Image source={logo} style={{ width: 24, height: 24 }} resizeMode="contain" />
                                  ) : (
                                    <Landmark size={17} color={bank.color} strokeWidth={2.2} />
                                  )}
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                  <Text style={{ fontSize: 16, color: LABEL, fontWeight: aActive ? "600" : "400" }}>{bank.name}</Text>
                                  <Text style={{ fontSize: 12, color: VALUE, marginTop: 1 }}>บัญชี {maskAccountNo(acc.accountNo)}</Text>
                                </View>
                                <View
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 11,
                                    borderWidth: 2,
                                    borderColor: aActive ? BRAND_GREEN : "#cbd0cb",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {aActive ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: BRAND_GREEN }} /> : null}
                                </View>
                              </Pressable>
                            );
                          })}
                          <Pressable
                            onPress={() => nav.navigate("AddBankAccount", { selectForPayment: true })}
                            className="flex-row items-center active:opacity-70"
                            style={[styles.row, { paddingLeft: 56, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP }]}
                          >
                            <PlusCircle size={26} color={BRAND_GREEN} strokeWidth={1.8} />
                            <Text style={{ marginLeft: 12, fontSize: 16, color: BRAND_GREEN, fontWeight: "500" }}>
                              ผูกบัญชีธนาคาร
                            </Text>
                          </Pressable>
                        </>
                      ) : null}
                    </View>
                  );
                }

                // Credit / debit expands inline to the linked cards + "เพิ่มบัตร".
                if (m.id === "credit") {
                  return (
                    <View key={m.id}>
                      <Pressable
                        onPress={() => setCreditOpen((o) => !o)}
                        className="flex-row items-center active:opacity-70"
                        style={[styles.row, divider]}
                      >
                        <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                          {m.Icon ? <m.Icon size={22} color="#9ca3af" /> : null}
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontSize: 16, color: LABEL }}>{m.label}</Text>
                          <Text style={{ fontSize: 12, color: VALUE, marginTop: 1 }}>{m.desc}</Text>
                        </View>
                        {creditOpen ? (
                          <ChevronUp size={20} color="#9ca3af" />
                        ) : (
                          <ChevronDown size={20} color="#9ca3af" />
                        )}
                      </Pressable>
                      {creditOpen ? (
                        <>
                          {SAVED_CARDS.map((card) => {
                            const cActive = selected === card.id;
                            return (
                              <Pressable
                                key={card.id}
                                onPress={() => choose(card.id)}
                                className="flex-row items-center active:opacity-70"
                                style={[styles.row, { paddingLeft: 56, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP }]}
                              >
                                <CardBrandIcon brand={card.brand} size={24} />
                                <Text style={{ flex: 1, marginLeft: 12, fontSize: 16, color: LABEL, fontWeight: cActive ? "600" : "400" }}>
                                  {card.name}
                                </Text>
                                <View
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 11,
                                    borderWidth: 2,
                                    borderColor: cActive ? BRAND_GREEN : "#cbd0cb",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {cActive ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: BRAND_GREEN }} /> : null}
                                </View>
                              </Pressable>
                            );
                          })}
                          <Pressable
                            onPress={() => nav.navigate("AddCard")}
                            className="flex-row items-center active:opacity-70"
                            style={[styles.row, { paddingLeft: 56, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP }]}
                          >
                            <PlusCircle size={26} color={BRAND_GREEN} strokeWidth={1.8} />
                            <Text style={{ marginLeft: 12, fontSize: 16, color: BRAND_GREEN, fontWeight: "500" }}>
                              เพิ่มบัตร
                            </Text>
                          </Pressable>
                        </>
                      ) : null}
                    </View>
                  );
                }

                // Bank apps expand inline to the individual apps (K PLUS, SCB, …).
                if (m.id === "bankapp") {
                  return (
                    <View key={m.id}>
                      <Pressable
                        onPress={() => setBankOpen((o) => !o)}
                        className="flex-row items-center active:opacity-70"
                        style={[styles.row, divider]}
                      >
                        <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                          {m.Icon ? <m.Icon size={22} color="#9ca3af" /> : null}
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontSize: 16, color: LABEL }}>{m.label}</Text>
                          <Text style={{ fontSize: 12, color: VALUE, marginTop: 1 }}>{m.desc}</Text>
                        </View>
                        {bankOpen ? (
                          <ChevronUp size={20} color="#9ca3af" />
                        ) : (
                          <ChevronDown size={20} color="#9ca3af" />
                        )}
                      </Pressable>
                      {bankOpen
                        ? BANK_APPS.map((app) => {
                            const aActive = selected === app.id;
                            return (
                              <Pressable
                                key={app.id}
                                onPress={() => choose(app.id)}
                                className="flex-row items-center active:opacity-70"
                                style={[styles.row, { paddingLeft: 56, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SEP }]}
                              >
                                {app.image ? (
                                  <Image source={app.image} style={{ width: 28, height: 28, borderRadius: 7 }} resizeMode="cover"
          resizeMethod="resize" />
                                ) : null}
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                  <Text style={{ fontSize: 16, color: LABEL, fontWeight: aActive ? "600" : "400" }}>{app.label}</Text>
                                  <Text style={{ fontSize: 12, color: VALUE, marginTop: 1 }}>{app.desc}</Text>
                                </View>
                                <View
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 11,
                                    borderWidth: 2,
                                    borderColor: aActive ? BRAND_GREEN : "#cbd0cb",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {aActive ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: BRAND_GREEN }} /> : null}
                                </View>
                              </Pressable>
                            );
                          })
                        : null}
                    </View>
                  );
                }

                const active = selected === m.id;
                // TrueMoney must be linked (phone + OTP) before it's selectable.
                const needsTrueMoneyLink = m.id === "truemoney" && !trueMoneyPhone;
                const rowPress = needsTrueMoneyLink
                  ? () => nav.navigate("TrueMoneyLink")
                  : () => choose(m.id);
                const rowDesc =
                  m.id === "truemoney" && trueMoneyPhone
                    ? `ผูกบัญชีแล้ว • ${maskPhone(trueMoneyPhone)}`
                    : m.id === "truemoney"
                    ? "ต้องผูกบัญชีก่อนใช้งาน"
                    : m.desc;
                return (
                  <Pressable
                    key={m.id}
                    onPress={rowPress}
                    className="flex-row items-center active:opacity-70"
                    style={[styles.row, divider]}
                  >
                    <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                      {m.image ? (
                        <Image source={m.image} style={{ width: 30, height: 30, borderRadius: 7 }} resizeMode="cover"
          resizeMethod="resize" />
                      ) : m.Icon ? (
                        <m.Icon size={22} color={active ? BRAND_GREEN : "#9ca3af"} />
                      ) : null}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 16, color: LABEL, fontWeight: active ? "600" : "400" }}>
                        {m.label}
                      </Text>
                      <Text style={{ fontSize: 12, color: VALUE, marginTop: 1 }}>{rowDesc}</Text>
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: active ? BRAND_GREEN : "#cbd0cb",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {active ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: BRAND_GREEN }} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  group: { fontSize: 13, color: "#6b6b70", marginTop: 18, marginBottom: 7, marginLeft: 32 },
  card: { backgroundColor: "#fff", borderRadius: 20, marginHorizontal: 16, overflow: "hidden" },
  row: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 12 },
});
