/**
 * METAHERB Café — payment-method picker sheet.
 * Same iOS-grouped look as the product PaymentMethodScreen, but café accepts
 * only PromptPay + cash (no COD / cards / wallets / bank transfer). Tapping a
 * method commits it to CafeCartContext and closes; the X just dismisses.
 */
import { useEffect } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { Banknote, QrCode, X } from "lucide-react-native";

/** The till channels wear the same marks the POS grid uses. */
const PAY_ICON: Record<string, typeof Banknote> = { cash: Banknote, promptpay: QrCode };

/**
 * The channels the shop has turned on, wearing the marks the customer sees —
 * PromptPay is a logo, not an icon. Exported so the till's own sheet lists
 * exactly what this screen would.
 */
export function posPayOptions(adminState: { pay: Record<string, boolean> }): PayMethodOption[] {
  return CAFE_PAY_CHANNELS.filter((c) => adminState.pay[c.id]).map((c) => {
    const mark = CAFE_PAY_METHODS.find((m) => m.id === c.id);
    return { id: c.id, label: c.label, desc: c.sub, image: mark?.image, Icon: mark?.Icon ?? PAY_ICON[c.id] };
  });
}
import { GlassIconButton } from "../components/GlassIconButton";
import { BRAND_GREEN } from "../theme/tokens";
import { modalTopPad } from "../theme/layout";
import { CAFE_PAY_METHODS } from "../data/cafePayment";
import { CAFE_PAY_CHANNELS, cafeAdminStore, type CafePayChannelId } from "../store/cafeAdmin";
import { posPayStore, setPosPay, setPosPayPicker } from "../store/posPay";
import { useStore } from "../store/db";
import type { RootStackParamList } from "../navigation/RootStack";
import { PayMethodList, type PayMethodOption } from "../components/PayMethodList";
import { useCafeCart } from "../context/CafeCartContext";

const GROUPED_BG = "#f2f2f7"; // iOS systemGroupedBackground

export function CafePayPickerBody({ pos, onClose }: { pos?: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { payMethod, setPayMethod } = useCafeCart();
  // The till opens this very screen. It offers the channels the shop has turned
  // on and writes the answer to its own store; everything else — the header,
  // the card, the rows, the way it slides up — is shared by construction.
  const adminState = useStore(cafeAdminStore);
  const posPay = useStore(posPayStore);
  // Tell the till the picker is up, and tell it the moment this screen goes —
  // by any route, including the ✕ and the back gesture.
  useEffect(() => {
    if (!pos) return;
    setPosPayPicker(true);
    return () => setPosPayPicker(false);
  }, [pos]);

  const options = pos ? posPayOptions(adminState) : CAFE_PAY_METHODS;

  const choose = (id: string) => {
    if (pos) setPosPay(id as CafePayChannelId);
    else setPayMethod(id as (typeof CAFE_PAY_METHODS)[number]["id"]);
    onClose();
  };

  return (
    <View style={{ flex: 1, backgroundColor: GROUPED_BG }}>
      {/* Header — close / title (iOS sheet style) */}
      <View style={[styles.header, { paddingTop: 16 + modalTopPad(insets.top) }]}>
        <GlassIconButton onPress={onClose} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1c1c1e" }}>ช่องทางชำระเงิน</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <PayMethodList options={options} selected={pos ? posPay : payMethod} onSelect={choose} />
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
});

/**
 * The screen the customer reaches from ชำระเงิน. The POS renders the same body
 * inside its own bill instead of navigating: the bill is a fullScreen Modal,
 * and a modal presented over a modal fights it — the sheet came back to the
 * wrong screen and left the header stranded. One body, two hosts.
 */
export function CafePaymentMethodScreen() {
  const nav = useNavigation();
  return <CafePayPickerBody onClose={() => nav.goBack()} />;
}
