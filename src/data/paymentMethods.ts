import type { ComponentType } from "react";
import type { ImageSourcePropType } from "react-native";
import { Banknote, CreditCard, Landmark, Smartphone } from "lucide-react-native";

export type PaymentMethod = {
  id: string;
  label: string;
  desc: string;
  /** Logo image (real bank/wallet logos) — shown instead of `Icon` when set. */
  image?: ImageSourcePropType;
  /** Fallback lucide icon for methods without a logo. */
  Icon?: ComponentType<{ size?: number; color?: string }>;
  /** Optional group header shown above this method in the picker. */
  group?: string;
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "promptpay", label: "PromptPay", desc: "สแกน QR ผ่านแอปธนาคาร", image: require("../../assets/payment/promptpay.png") },
  { id: "bank", label: "โอนผ่านธนาคาร", desc: "จากบัญชีธนาคารที่ผูกไว้", Icon: Landmark },
  { id: "credit", label: "บัตรเครดิต / เดบิต", desc: "Visa, Mastercard, JCB", Icon: CreditCard },
  { id: "bankapp", label: "แอปธนาคาร", desc: "K PLUS, SCB EASY, Krungthai NEXT, KMA", Icon: Smartphone },
  { id: "truemoney", label: "TrueMoney Wallet", desc: "ชำระผ่าน e-Wallet", image: require("../../assets/payment/truemoney.jpg") },
  { id: "cod", label: "เก็บเงินปลายทาง", desc: "ชำระเมื่อรับสินค้า", Icon: Banknote },
];

// Bank apps revealed when the "แอปธนาคาร" row is expanded — mirrors SAVED_CARDS
// under the credit-card row.
export const BANK_APPS: PaymentMethod[] = [
  { id: "kplus", label: "K PLUS", desc: "ธนาคารกสิกรไทย", image: require("../../assets/payment/kplus.png") },
  { id: "scbeasy", label: "SCB EASY", desc: "ไทยพาณิชย์", image: require("../../assets/payment/scb.png") },
  { id: "ktbnext", label: "Krungthai NEXT", desc: "กรุงไทย", image: require("../../assets/payment/ktb.png") },
  { id: "kma", label: "KMA krungsri", desc: "กรุงศรีอยุธยา", image: require("../../assets/payment/kma.png") },
];
