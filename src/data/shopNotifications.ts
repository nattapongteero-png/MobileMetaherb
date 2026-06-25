import { ShoppingBag, MessageSquare, Boxes, AlertTriangle, Coins, TrendingUp, type LucideIcon } from "lucide-react-native";

export type ShopNotifType = "order" | "chat" | "stock" | "complaint" | "finance" | "marketing";

export type ShopNotif = {
  id: string;
  type: ShopNotifType;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

/** Shared visual meta for a notification row (icon circle + chip). */
export type NotifMeta = { Icon: LucideIcon; solid: string; chipBg: string; chipFg: string; label: string };

export const SHOP_TYPE_META: Record<ShopNotifType, NotifMeta> = {
  order: { Icon: ShoppingBag, solid: "#2563eb", chipBg: "#eff6ff", chipFg: "#1d4ed8", label: "คำสั่งซื้อ" },
  chat: { Icon: MessageSquare, solid: "#059669", chipBg: "#ecfdf5", chipFg: "#15803d", label: "ข้อความ" },
  stock: { Icon: Boxes, solid: "#d97706", chipBg: "#fffbeb", chipFg: "#b45309", label: "คลังสินค้า" },
  complaint: { Icon: AlertTriangle, solid: "#dc2626", chipBg: "#fef2f2", chipFg: "#b91c1c", label: "ร้องเรียน" },
  finance: { Icon: Coins, solid: "#0f766e", chipBg: "#f0fdfa", chipFg: "#0f766e", label: "การเงิน" },
  marketing: { Icon: TrendingUp, solid: "#db2777", chipBg: "#fdf2f8", chipFg: "#be185d", label: "การตลาด" },
};

export const SHOP_FILTER_TABS: { key: "all" | ShopNotifType; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "order", label: "คำสั่งซื้อ" },
  { key: "chat", label: "ข้อความ" },
  { key: "stock", label: "คลังสินค้า" },
  { key: "complaint", label: "ร้องเรียน" },
  { key: "finance", label: "การเงิน" },
  { key: "marketing", label: "การตลาด" },
];

export const SHOP_NOTIF_SEED: ShopNotif[] = [
  { id: "s1", type: "order", title: "🛒 มีคำสั่งซื้อใหม่!", message: "ลูกค้าสั่งซื้อ 2 รายการ ยอดรวม ฿1,480 — กดเพื่อเตรียมจัดส่ง", time: "2 นาทีที่แล้ว", read: false },
  { id: "s2", type: "stock", title: "⚠️ สินค้าใกล้หมด", message: "ขมิ้นชันผง เหลือ 3 ชิ้น — แตะเพื่อเติมสต็อก", time: "30 นาทีที่แล้ว", read: false },
  { id: "s3", type: "chat", title: "ข้อความจากลูกค้า", message: "“สินค้ามีสต็อกพร้อมส่งไหมคะ?” — กดเพื่อตอบกลับ", time: "1 ชม. ที่แล้ว", read: false },
  { id: "s4", type: "complaint", title: "มีคำร้องเรียนใหม่", message: "ลูกค้าเปิดคำร้องเรียนคำสั่งซื้อ ORD-20260218-03570", time: "3 ชม. ที่แล้ว", read: false },
  { id: "s5", type: "finance", title: "💰 ยอดขายเข้าบัญชี", message: "รับเงิน ฿1,332 จากคำสั่งซื้อที่จัดส่งสำเร็จ", time: "เมื่อวานนี้", read: true },
  { id: "s6", type: "marketing", title: "📈 แคมเปญใหม่พร้อมเริ่ม", message: "เข้าร่วม Flash Sale เดือนนี้ เพิ่มโอกาสขายให้ร้านคุณ", time: "2 วันที่แล้ว", read: true },
];
