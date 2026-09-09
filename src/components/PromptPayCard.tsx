/**
 * The พร้อมเพย์ slip — the QR, who is being paid, and how much.
 *
 * The customer's payment screen and the POS's QR stage both show a customer a
 * code to scan, built from the same payload, and had drawn it two different
 * ways: one a branded card, the other a plain box. Lifted from the customer's
 * screen unchanged, because that is the one a customer already recognises, and
 * the till is simply turning the same slip around to face them.
 */
import { View, Text } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { BRAND_GREEN_DARK } from "../theme/tokens";

export const PROMPTPAY_BLUE = "#003d7a";

/** 095-889-6299 — a phone reads back in threes; a tax id is left as typed. */
const fmtPromptPayId = (p: string) =>
  p.length === 10 ? p.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3") : p;

export function PromptPayCard({ payload, merchantName, promptPayId, amount, size = 216, getRef }: {
  payload: string;
  merchantName: string;
  promptPayId: string;
  amount: number;
  size?: number;
  /** The QR's own ref, for the customer screen's save-to-photos. */
  getRef?: (c: unknown) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 24,
        alignItems: "center",
        paddingBottom: 22,
        overflow: "hidden",
        shadowColor: "#0a3d22",
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      }}
    >
      {/* PromptPay brand strip */}
      <View style={{ width: "100%", backgroundColor: PROMPTPAY_BLUE, paddingVertical: 12, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 }}>
          พร้อมเพย์ <Text style={{ color: "#9fd3ff" }}>PromptPay</Text>
        </Text>
      </View>

      <View style={{ padding: 22, alignItems: "center" }}>
        <View style={{ padding: 12, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#eee" }}>
          <QRCode value={payload} size={size} getRef={getRef} />
        </View>

        <Text style={{ fontSize: 16, fontWeight: "700", color: "#0a0a0a", marginTop: 18 }}>{merchantName}</Text>
        <Text style={{ fontSize: 13, color: "#737373", marginTop: 2 }}>{fmtPromptPayId(promptPayId)}</Text>

        <View style={{ height: 1, backgroundColor: "#f0f0f0", alignSelf: "stretch", marginVertical: 16 }} />

        <Text style={{ fontSize: 13, color: "#737373" }}>ยอดที่ต้องชำระ</Text>
        <Text style={{ fontSize: 34, fontWeight: "800", color: BRAND_GREEN_DARK, marginTop: 2 }}>
          ฿{amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </Text>
      </View>
    </View>
  );
}
