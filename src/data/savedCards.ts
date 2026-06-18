import type { CardBrand } from "../components/CardBrandIcon";

export type SavedCard = {
  /** Doubles as the selected-payment id when this card is chosen. */
  id: string;
  brand: CardBrand;
  name: string;
  last4: string;
};

// Mock list of linked cards. An empty array → the picker shows only "เพิ่มบัตร".
export const SAVED_CARDS: SavedCard[] = [
  { id: "card-1", brand: "mastercard", name: "บัตรหลัก", last4: "4821" },
  { id: "card-2", brand: "visa", name: "บัตรท่องเที่ยว", last4: "7193" },
  { id: "card-3", brand: "mastercard", name: "บัตรช้อปปิ้ง", last4: "0064" },
];
