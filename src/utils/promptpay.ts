// Build a PromptPay EMVCo QR payload (Thai standard). Public spec — encodes a
// destination (mobile / national-id) + amount into the string a banking app
// reads when scanning. Not a real payment; the destination here is a mock.

function tlv(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE over the payload (poly 0x1021, init 0xFFFF). */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * @param target  mobile number (e.g. "0812345678") or 13-digit national id
 * @param amount  THB amount; when given the QR is a one-time (dynamic) code
 */
export function promptPayPayload(target: string, amount?: number): string {
  const digits = target.replace(/[^0-9]/g, "");

  // Merchant account info (tag 29): AID + proxy (mobile=01 / national-id=02)
  const proxy =
    digits.length >= 13
      ? tlv("02", digits)
      : tlv("01", ("0066" + digits.replace(/^0/, "")).padStart(13, "0"));
  const merchantAccount = tlv("29", tlv("00", "A000000677010111") + proxy);

  let payload =
    tlv("00", "01") + // payload format indicator
    tlv("01", amount != null ? "12" : "11") + // 12 = dynamic (amount), 11 = static
    merchantAccount +
    tlv("53", "764") + // currency THB
    (amount != null ? tlv("54", amount.toFixed(2)) : "") +
    tlv("58", "TH"); // country

  payload += "6304"; // CRC tag + length, value appended next
  return payload + crc16(payload);
}

/** Mock merchant PromptPay number for the demo checkout. */
export const MERCHANT_PROMPTPAY = "0958896299";
export const MERCHANT_NAME = "METAHERB STORE";
