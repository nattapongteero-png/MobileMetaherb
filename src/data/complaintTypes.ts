import { PackageX, RefreshCw, Undo2, Wallet, type LucideIcon } from "lucide-react-native";

export type ComplaintType = "damaged" | "wrong_item" | "return" | "refund";

export const COMPLAINT_TYPES: Record<
  ComplaintType,
  { title: string; desc: string; color: string; Icon: LucideIcon }
> = {
  damaged: { title: "สินค้าชำรุด/เสียหาย", desc: "สินค้าที่ได้รับชำรุด แตกหัก หรือเสียหาย", color: "#ef4444", Icon: PackageX },
  wrong_item: { title: "ได้รับสินค้าผิด", desc: "ได้รับสินค้าไม่ตรงกับที่สั่งซื้อ", color: "#f59e0b", Icon: RefreshCw },
  return: { title: "ขอคืนสินค้า", desc: "ต้องการส่งคืนสินค้าและขอเงินคืน", color: "#9333ea", Icon: Undo2 },
  refund: { title: "ขอเงินคืน", desc: "ต้องการขอเงินคืนโดยไม่ส่งคืนสินค้า", color: "#0ea5e9", Icon: Wallet },
};

export const COMPLAINT_TYPE_ORDER: ComplaintType[] = ["damaged", "wrong_item", "return", "refund"];
