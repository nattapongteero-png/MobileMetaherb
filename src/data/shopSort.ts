// Sort options for the shop product list — shared between ShopScreen and the
// native ShopSort picker route so both stay in sync.
export type SortKey = "popular" | "price-asc" | "price-desc" | "rating";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "ยอดนิยม" },
  { key: "price-asc", label: "ราคา: ต่ำไปสูง" },
  { key: "price-desc", label: "ราคา: สูงไปต่ำ" },
  { key: "rating", label: "คะแนนสูงสุด" },
];
