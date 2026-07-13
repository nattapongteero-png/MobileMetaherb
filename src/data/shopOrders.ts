// Seller-side seed rows for the shared orders table (src/store/orders.ts).
//
// These used to live as `export const ORDERS: ShopOrder[]` inside MyShopScreen —
// a *different* array, with a different type and a different id namespace from
// the buyer's orders, which is why a shop could never see a real purchase.
// They are now plain `Order` rows in the same table; the console renders them
// through the `toShopOrder` view adapter.

import { REAL_PRODUCTS, getRealProductImage } from "./realProducts";
import { formatThaiDateTime } from "../store/orders";
import { daysAgo, seedOrderId } from "./seedClock";
import type { Order, OrderItem, OrderReview } from "../store/types";

export const METAHERB_SHOP = "METAHERB Store";

/** Same list, same order as MyShopScreen's TOP_PRODUCTS — `oi()` indexes into it. */
const SHOP_CATALOG = REAL_PRODUCTS.filter((p) => p.shop === METAHERB_SHOP);

/** Order line from the shop's own catalog. Index wraps, as the original did. */
const oi = (i: number, option: string, quantity: number): OrderItem => {
  const p = SHOP_CATALOG[i % SHOP_CATALOG.length];
  return { productId: p.id, name: p.name, option, quantity, price: p.price, image: getRealProductImage(p.id) };
};

/**
 * Per-item ratings, aligned index-for-index with `items` so the console can
 * rebuild its `{ itemIndex }` shape. `rating` is the headline score.
 */
const review = (
  reviewerName: string,
  reviewedAt: string,
  shopRating: number,
  perItem: { rating: number; comment: string }[],
): OrderReview => ({
  rating: shopRating,
  comment: perItem[0]?.comment ?? "",
  shopRating,
  reviewerName,
  reviewedAt,
  products: perItem.map((r) => ({ name: "", rating: r.rating, comment: r.comment, photos: [] })),
});

/** Rows carry a relative timestamp; the id and the display date derive from it. */
type RawShopOrder = Omit<Order, "id" | "date" | "total" | "createdAt" | "shopName"> & { tail: string; at: number };

const RAW: RawShopOrder[] = [
  {
    tail: "03521", userId: "u-somchai", status: "pending_payment", at: daysAgo(15, 8, 12),
    recipient: { name: "คุณสมชาย ใจดี", phone: "081-234-5678", address: "88/12 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110" },
    shippingMethod: "จัดส่งปกติ", paymentMethod: "พร้อมเพย์ PromptPay",
    items: [oi(0, "150 g", 2)],
  },
  {
    tail: "03520", userId: "u-somying", status: "pending_verify", at: daysAgo(15, 11, 8),
    recipient: { name: "คุณสมหญิง รักสุขภาพ", phone: "089-876-5432", address: "120 หมู่ 5 ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200" },
    shippingMethod: "จัดส่งด่วน", paymentMethod: "บัญชีธนาคาร",
    note: "ฝากแพ็คกันกระแทกด้วยนะคะ สั่งไปเป็นของฝากค่ะ",
    items: [oi(1, "1 หลอด", 1), oi(2, "20 ซอง", 2)],
  },
  {
    // was shop-status "ready_ship"
    tail: "03517", userId: "u-tantawan", status: "preparing", at: daysAgo(16, 16, 45),
    recipient: { name: "คุณทานตะวัน งามดี", phone: "086-111-2233", address: "55/3 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200" },
    shippingMethod: "จัดส่งปกติ", paymentMethod: "บัตรเครดิต/บัตรเดบิต",
    items: [oi(3, "200 g", 1)],
  },
  {
    tail: "03512", userId: "u-saifon", status: "shipping", at: daysAgo(17, 9, 20),
    recipient: { name: "คุณสายฝน พรหมมา", phone: "082-555-7788", address: "9 ซ.ลาดพร้าว 71 แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230" },
    shippingMethod: "จัดส่งด่วน", trackingNumber: "TH6829-4471-220K", paymentMethod: "พร้อมเพย์ PromptPay",
    items: [oi(4, "30 แคปซูล", 1), oi(5, "1 ชุด", 1)],
  },
  {
    // was shop-status "shipped" + reviewed → the unified terminal state is "completed"
    tail: "03505", userId: "u-fahsai", status: "completed", at: daysAgo(19, 13, 5),
    recipient: { name: "คุณฟ้าใส แจ่มจันทร์", phone: "087-222-9090", address: "203/7 ถ.เพชรเกษม ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110" },
    shippingMethod: "จัดส่งปกติ", trackingNumber: "TH1180-5523-901P", paymentMethod: "ชำระเงินปลายทาง",
    review: review("คุณฟ้าใส แจ่มจันทร์", "2 ก.พ. 2569", 5, [
      { rating: 5, comment: "หอมอร่อยมากค่ะ ชงง่าย แพ็คมาดีมาก ส่งไวกว่าที่คิด จะกลับมาซื้อซ้ำแน่นอนค่ะ" },
    ]),
    items: [oi(6, "150 g", 3)],
  },
  {
    // Delivered-but-not-yet-reviewed — the detail page shows no review section.
    tail: "03501", userId: "u-pimjai", status: "delivered", at: daysAgo(20, 9, 18),
    recipient: { name: "คุณพิมพ์ใจ บุญมา", phone: "085-666-2211", address: "99/1 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000" },
    shippingMethod: "จัดส่งด่วน", trackingNumber: "TH2244-8810-455M", paymentMethod: "บัตรเครดิต/บัตรเดบิต",
    items: [oi(9, "1 ชุด", 1), oi(10, "1 ขวด", 2)],
  },
  {
    // A live cancellation *request* — the order is still pending_verify until the
    // shop decides. (It used to be seeded as already-cancelled, which made the
    // approve/deny buttons a no-op.) The console still shows it under "ยกเลิก".
    tail: "03498", userId: "u-manop", status: "pending_verify", at: daysAgo(21, 10, 41),
    recipient: { name: "คุณมานพ ตั้งใจ", phone: "081-444-1212", address: "17 หมู่ 2 ต.บางพระ อ.ศรีราชา จ.ชลบุรี 20110" },
    shippingMethod: "รับที่ร้าน", paymentMethod: "พร้อมเพย์ PromptPay",
    cancelledBy: "customer", cancelReason: "ลูกค้าเปลี่ยนใจ", cancelNote: "เปลี่ยนใจ ขอยกเลิกค่ะ",
    cancellationStatus: "pending", previousStatus: "pending_verify",
    items: [oi(7, "1 หลอด", 1)],
  },
  {
    // Reviewed multi-item example — exercises "ดูอีก N รายการ" + the multi-item review page.
    tail: "03495", userId: "u-chonticha", status: "completed", at: daysAgo(22, 14, 2),
    recipient: { name: "คุณชลธิชา แก้วใส", phone: "089-333-8877", address: "8/15 ถ.ศรีจันทร์ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000" },
    shippingMethod: "จัดส่งปกติ", trackingNumber: "TH7731-0092-114D", paymentMethod: "พร้อมเพย์ PromptPay",
    review: review("คุณชลธิชา แก้วใส", "31 ม.ค. 2569", 4, [
      { rating: 5, comment: "กลิ่นหอมมาก ใช้แล้วผ่อนคลายสุด ๆ ซื้อซ้ำแน่นอนค่ะ" },
      { rating: 4, comment: "คุณภาพดี รสชาติเข้มข้น แต่ซองเล็กกว่าที่คิดนิดหน่อย" },
      { rating: 3, comment: "สินค้าโอเคค่ะ แต่กล่องมาถึงบุบมุมนึง อยากให้แพ็คแน่นกว่านี้" },
    ]),
    items: [oi(11, "1 กล่อง", 1), oi(12, "2 ซอง", 2), oi(13, "1 ชุด", 1)],
  },
  {
    // Shop-cancelled — the red "ยกเลิกแล้ว" variant with full details.
    tail: "03484", userId: "u-wanna", status: "cancelled", at: daysAgo(24, 15, 22),
    recipient: { name: "คุณวรรณา สายทอง", phone: "084-777-3344", address: "42/8 ถ.รัถการ ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110" },
    shippingMethod: "จัดส่งปกติ", paymentMethod: "บัญชีธนาคาร",
    cancelledBy: "shop", cancelReason: "สินค้าหมดสต็อก",
    cancelNote: "วัตถุดิบล็อตล่าสุดหมด ทางร้านคืนเงินเต็มจำนวนให้แล้ว ขออภัยในความไม่สะดวกค่ะ",
    cancellationStatus: "approved",
    items: [oi(8, "250 g", 1)],
  },
];

/** Other buyers' orders at METAHERB Store — seeded into the shared table. */
export const SHOP_SEED_ORDERS: Order[] = RAW.map(({ tail, at, ...o }) => ({
  ...o,
  id: seedOrderId(at, tail),
  date: formatThaiDateTime(at),
  shopName: METAHERB_SHOP,
  createdAt: at,
  total: o.items.reduce((s, it) => s + it.price * it.quantity, 0),
}));
