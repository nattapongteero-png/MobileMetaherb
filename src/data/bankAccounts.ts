export type Bank = { code: string; name: string; color: string };

// Thai banks shown in the "เลือกธนาคาร" picker. Color = brand color for the badge.
export const THAI_BANKS: Bank[] = [
  { code: "SCB", name: "ไทยพาณิชย์", color: "#4e2a84" },
  { code: "KBANK", name: "กสิกรไทย", color: "#138f2d" },
  { code: "KTB", name: "กรุงไทย", color: "#01a4e9" },
  { code: "BBL", name: "กรุงเทพ", color: "#1e4598" },
  { code: "BAY", name: "กรุงศรี", color: "#a9851f" },
  { code: "ttb", name: "ทีเอ็มบีธนชาต", color: "#1279be" },
  { code: "KKP", name: "เกียรตินาคิน", color: "#6c4e9b" },
  { code: "SCBT", name: "แสตนดาร์ดชาร์เตอร์ด", color: "#0473ea" },
  { code: "UOB", name: "ยูโอบี", color: "#0b3b7a" },
  { code: "TISCO", name: "ทิสโก้", color: "#12549f" },
  { code: "CIMB", name: "ซีไอเอ็มบี", color: "#7e1916" },
  { code: "ICBC", name: "ไอซีบีซี", color: "#c00000" },
  { code: "GSB", name: "ออมสิน", color: "#eb198d" },
  { code: "BAAC", name: "ธ.ก.ส.", color: "#1a7a3f" },
  { code: "LHBANK", name: "แลนด์ แอนด์ เฮ้าส์", color: "#6b6f72" },
];

export const bankByCode = (code: string): Bank =>
  THAI_BANKS.find((b) => b.code === code) ?? THAI_BANKS[0];

// Real bank logos (sourced from DPA — dpa.or.th). GSB / BAAC are SFIs not on the
// DPA list, so they fall back to the colored badge.
export const BANK_LOGOS: Record<string, number> = {
  SCB: require("../../assets/banks/scb.png"),
  KBANK: require("../../assets/banks/kbank.png"),
  KTB: require("../../assets/banks/ktb.png"),
  BBL: require("../../assets/banks/bbl.png"),
  BAY: require("../../assets/banks/bay.png"),
  ttb: require("../../assets/banks/ttb.png"),
  KKP: require("../../assets/banks/kkp.png"),
  SCBT: require("../../assets/banks/scbt.png"),
  UOB: require("../../assets/banks/uob.png"),
  TISCO: require("../../assets/banks/tisco.png"),
  CIMB: require("../../assets/banks/cimb.png"),
  ICBC: require("../../assets/banks/icbc.png"),
  LHBANK: require("../../assets/banks/lhbank.png"),
};

/** Real bank logo for a code, or undefined to fall back to the colored badge. */
export const bankLogo = (code: string): number | undefined => BANK_LOGOS[code];

/** Display label e.g. "กรุงไทย (KTB)". */
export const bankLabel = (code: string): string => {
  const b = bankByCode(code);
  return `${b.name} (${b.code})`;
};

/** "•••• 4821" — masks all but the last 4 digits of an account number. */
export const maskAccountNo = (no: string): string => `•••• ${no.slice(-4)}`;

export type BankAccount = {
  id: string;
  bankCode: string;
  accountName: string;
  /** Full account number (display masks all but the last 4). */
  accountNo: string;
  isDefault?: boolean;
};

export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  { id: "acc-kbank", bankCode: "KBANK", accountName: "ณัฐพงษ์ ธีโรภาส", accountNo: "1234564821", isDefault: true },
  { id: "acc-scb", bankCode: "SCB", accountName: "ณัฐพงษ์ ธีโรภาส", accountNo: "9876547193" },
];

// ===== Linked credit / debit cards =====
export type CardBrand = "visa" | "mastercard" | "jcb" | "amex";
export type CreditCard = {
  id: string;
  brand: CardBrand;
  /** Last 4 digits (the rest is masked). */
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
};

export const CARD_BRAND: Record<CardBrand, { name: string; color: string }> = {
  visa: { name: "Visa", color: "#1a1f71" },
  mastercard: { name: "Mastercard", color: "#f79e1b" },
  jcb: { name: "JCB", color: "#0b4ea2" },
  amex: { name: "American Express", color: "#2e77bb" },
};

export const INITIAL_CARDS: CreditCard[] = [
  { id: "card-visa-4242", brand: "visa", last4: "4242", expMonth: 8, expYear: 27, isDefault: true },
  { id: "card-mc-5555", brand: "mastercard", last4: "5555", expMonth: 11, expYear: 26 },
];
