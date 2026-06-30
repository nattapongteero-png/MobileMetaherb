/** A café cart line — one customised menu item (sweetness / milk / shot / note). */
export type CafeCartLine = {
  key: string;        // item id + options signature (identical lines merge)
  itemId: string;     // base menu id (to total an item's qty across option variants)
  name: string;
  image: number;
  unitPrice: number;  // base price + add-ons
  qty: number;
  summary: string;    // "หวานปกติ · นมโอ๊ต · เพิ่ม 1 ช็อต"
};
