// Sort options for the shop's Herbal Market (raw-material) list — shared between
// ShopScreen and the native ShopHerbalFilter picker so both stay in sync.
// Mirrors the sort logic in HerbalMarketScreen.
export type HerbalSortKey = "popular" | "price_asc" | "price_desc" | "moq_asc";

export const HERBAL_SORT_OPTIONS: { key: HerbalSortKey; label: string }[] = [
  { key: "popular", label: "ยอดนิยม" },
  { key: "price_asc", label: "ราคา/กก.: ต่ำไปสูง" },
  { key: "price_desc", label: "ราคา/กก.: สูงไปต่ำ" },
  { key: "moq_asc", label: "ยอดสั่งขั้นต่ำน้อยสุด" },
];
