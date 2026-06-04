// Ported from the MetaHerb website (src/app/store/OrderContext.tsx).

export type OrderStatus =
  | "pending_payment"
  | "pending_verify"
  | "preparing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled";

export type OrderItem = {
  name: string;
  image: string;
  option: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string;
  shopName: string;
  status: OrderStatus;
  date: string;
  total: number;
  trackingNumber?: string;
  items: OrderItem[];
  review?: { rating: number; comment: string };
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "รอชำระเงิน",
  pending_verify: "รอตรวจสอบการชำระเงิน",
  preparing: "กำลังเตรียมสินค้า",
  shipped: "จัดส่งแล้ว",
  delivered: "ส่งถึงปลายทาง",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก",
};

// Per-status accent — used for the badge tint.
export const STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment: "#f97316",
  pending_verify: "#0ea5e9",
  preparing: "#a855f7",
  shipped: "#319754",
  delivered: "#0d9488",
  completed: "#16a34a",
  cancelled: "#9ca3af",
};

const img = (id: string) => `https://images.unsplash.com/${id}?w=200&q=80`;

export const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-20260218-03571",
    shopName: "METAHERB Store",
    status: "pending_payment",
    date: "18 ก.พ. 2569 · 15:00 น.",
    total: 856,
    items: [
      { name: "ชาสมุนไพรดีท็อกซ์", image: img("photo-1576092759770-14d9e692eb45"), option: "แพ็ค 30 ซอง", quantity: 2, price: 259 },
      { name: "น้ำมันมะพร้าวสกัดเย็น", image: img("photo-1662058595162-10e024b1a907"), option: "ขนาด 500ml", quantity: 1, price: 189 },
      { name: "ขมิ้นชันแคปซูล", image: img("photo-1740592754365-2117f5977528"), option: "60 แคปซูล", quantity: 1, price: 149 },
    ],
  },
  {
    id: "ORD-20260218-03572",
    shopName: "METAHERB Store",
    status: "pending_verify",
    date: "18 ก.พ. 2569 · 13:30 น.",
    total: 820,
    items: [
      { name: "กาแฟดริปสมุนไพร", image: img("photo-1631149206144-4549c0468787"), option: "แพ็ค 10 ซอง", quantity: 2, price: 250 },
      { name: "ชาเขียวมัทฉะ", image: img("photo-1708573106044-2bbefb3d9fc3"), option: "กระป๋อง 200g", quantity: 1, price: 320 },
    ],
  },
  {
    id: "ORD-20260217-04821",
    shopName: "ร้านป่าหมอก",
    status: "preparing",
    date: "17 ก.พ. 2569 · 09:15 น.",
    total: 857,
    items: [
      { name: "น้ำผึ้งป่าแท้ 100%", image: img("photo-1691480208637-6ed63aac6694"), option: "ขวด 750ml", quantity: 1, price: 459 },
      { name: "ผงโกโก้ออร์แกนิก", image: img("photo-1676870799186-7d55b7bfa84e"), option: "ถุง 250g", quantity: 2, price: 199 },
    ],
  },
  {
    id: "ORD-20260216-05133",
    shopName: "Organic Thai Farm",
    status: "shipped",
    date: "16 ก.พ. 2569 · 10:00 น.",
    total: 289,
    trackingNumber: "TH123456789",
    items: [
      { name: "น้ำมันงาดำสกัดเย็น", image: img("photo-1474979266404-7d1296e76fa2"), option: "ขวด 250ml", quantity: 1, price: 289 },
    ],
  },
  {
    id: "ORD-20260215-06244",
    shopName: "ธรรมชาติพรีเมียม",
    status: "delivered",
    date: "15 ก.พ. 2569 · 14:20 น.",
    total: 446,
    trackingNumber: "TH987654321",
    items: [
      { name: "แชมพูสมุนไพรอัญชัน", image: img("photo-1721680378230-78104b762f36"), option: "ขวด 300ml", quantity: 1, price: 179 },
      { name: "สบู่สมุนไพรขมิ้น", image: img("photo-1604565750665-3501b2c00194"), option: "ก้อน 100g", quantity: 3, price: 89 },
    ],
  },
  {
    id: "ORD-20260210-07355",
    shopName: "METAHERB Store",
    status: "completed",
    date: "10 ก.พ. 2569 · 11:45 น.",
    total: 460,
    trackingNumber: "TH555666777",
    review: { rating: 5, comment: "สินค้าดี ส่งเร็ว แพ็คเกจสวย" },
    items: [
      { name: "ชาดอกไม้รวม", image: img("photo-1720082301739-5d250b4a5551"), option: "กล่อง 20 ซอง", quantity: 1, price: 220 },
      { name: "น้ำตาลมะพร้าว", image: img("photo-1772064901439-15c233a18665"), option: "ถุง 500g", quantity: 2, price: 120 },
    ],
  },
  {
    id: "ORD-20260208-08466",
    shopName: "สมุนไพรบ้านสวน",
    status: "cancelled",
    date: "8 ก.พ. 2569 · 16:30 น.",
    total: 350,
    items: [
      { name: "วิตามินซีจากธรรมชาติ", image: img("photo-1648139347040-857f024f8da4"), option: "60 เม็ด", quantity: 1, price: 350 },
    ],
  },
];
