import { RAW_PRODUCT_BY_ID } from "./realProducts";
import { GALLERY_OVERRIDE } from "./productVariants";

/**
 * Shop-owner side of complaints ("เรื่องร้องเรียน"). The seed mirrors the web
 * OwnerDashboard but uses REAL shop products; new entries arrive live when a
 * customer submits the "แจ้งปัญหาสินค้า" flow (ComplaintContext.addComplaint).
 * Every case carries เหลักฐานประกอบ (evidence) because the submit form requires it.
 */

import {
  COMPLAINT_STATUS_LABEL,
  type Complaint,
  type ComplaintItem,
  type ComplaintStatus,
  type Evidence,
} from "../store/complaints";
import type { ComplaintType } from "./complaintTypes";
import { METAHERB_SHOP } from "./shopOrders";
import { DEMO_USER } from "../store/session";

export type { Complaint, ComplaintItem, ComplaintStatus, Evidence };
export const STATUS_LABEL = COMPLAINT_STATUS_LABEL;

export const STATUS_COLOR: Record<ComplaintStatus, string> = {
  pending: "#f59e0b",
  acknowledged: "#0088ff",
  refund_full: "#319754",
  refund_partial: "#f7c42b",
  rejected: "#ff383c",
};

// Owner-facing type labels/colors (web uses shorter wording than the customer flow).
export const TYPE_LABEL: Record<ComplaintType, string> = {
  damaged: "สินค้าเสียหาย",
  wrong_item: "สินค้าไม่ตรงตามสั่ง",
  return: "ต้องการคืนสินค้า",
  refund: "ต้องการขอเงินคืน",
};

export const TYPE_COLOR: Record<ComplaintType, string> = {
  damaged: "#ff383c",
  wrong_item: "#df9723",
  return: "#9747ff",
  refund: "#0088ff",
};


/** Item built from a real shop product id (name/price/photo come from the catalog). */
function ci(id: string, qty: number, option = ""): ComplaintItem {
  const p = RAW_PRODUCT_BY_ID[id];
  return { productId: id, name: p.name, option, qty, price: p.price, image: p.image as number };
}

// Evidence = real photos of the complaint's own product (its gallery if it has
// extra shots, otherwise its single catalog photo) so the proof relates to the item.
function evidenceFor(items: ComplaintItem[]): Evidence[] {
  return items.flatMap((it) => {
    const g = it.productId ? GALLERY_OVERRIDE[it.productId] : undefined;
    const shots = g && g.length ? g : [it.image];
    return shots.map((source) => ({ source: source as number }));
  });
}

type SeedRow = Omit<Complaint, "amount" | "product" | "evidence" | "userId" | "shopName" | "history">;

const BASE: SeedRow[] = [
  { id: "DSP-20260313-001", orderId: "ORD-20260318-4421", customer: "มาลี สวยงาม", customerEmail: "malee@email.com", customerPhone: "091-555-6666", type: "damaged", status: "pending", description: "ซองชาฉีกขาดหลายซอง ใบชาหกเลอะทั้งกล่อง สภาพไม่สมบูรณ์ ใช้ไม่ได้", refundChannel: "ธนาคารไทยพาณิชย์ (SCB) [*4321]", createdAt: "13 มี.ค. 2569", items: [ci("44", 1, "ชาอูหลงผสมดอกหอมหมื่นลี้")] },
  { id: "DSP-20260313-002", orderId: "ORD-20260318-4422", customer: "สมชาย ใจดี", customerEmail: "somchai@email.com", customerPhone: "061-421-3111", type: "wrong_item", status: "acknowledged", description: "สั่งกาแฟดริป Medium Roast แต่ได้รับเป็น Dark Roast", refundChannel: "ธนาคารกสิกรไทย [*8821]", createdAt: "14 มี.ค. 2569", items: [ci("3", 1, "Medium Roast · 9 ซอง")] },
  { id: "DSP-20260313-003", orderId: "ORD-20260318-4423", customer: "วรรณา สุขสบาย", customerEmail: "wanna@email.com", customerPhone: "089-876-5432", type: "return", status: "refund_full", description: "สินค้าที่ได้รับไม่ตรงกับรูปและรายละเอียดบนเว็บไซต์ ขอคืนสินค้าและเงิน", refundChannel: "ธนาคารกรุงเทพ [*3333]", createdAt: "15 มี.ค. 2569", items: [ci("43", 1, "Duo Set")] },
  { id: "DSP-20260313-004", orderId: "ORD-20260318-4424", customer: "ปราณี รักสมุนไพร", customerEmail: "pranee@email.com", customerPhone: "062-111-2222", type: "refund", status: "refund_partial", refundAmount: 140, description: "เปิดมาแล้วรสชาติเปลี้ยวผิดปกติ สงสัยใกล้หมดอายุ ขอเงินคืนบางส่วน", refundChannel: "ธนาคารกรุงเทพ [*4444]", createdAt: "16 มี.ค. 2569", items: [ci("9", 1, "ขวด 250 ml")] },
  { id: "DSP-20260313-005", orderId: "ORD-20260318-4425", customer: "อนุชา ต้นไม้", customerEmail: "anucha@email.com", customerPhone: "095-333-4444", type: "wrong_item", status: "refund_partial", refundAmount: 80, description: "สั่งผงอบเชย 2 กล่อง แต่ได้รับขนาดเล็กกว่าที่ระบุไว้", refundChannel: "ธนาคารกสิกรไทย [*5555]", createdAt: "17 มี.ค. 2569", items: [ci("8", 2, "กล่อง 50 g")] },
  { id: "DSP-20260313-006", orderId: "ORD-20260318-4426", customer: "มานะ ขยันดี", customerEmail: "mana@email.com", customerPhone: "087-555-6666", type: "damaged", status: "rejected", description: "ฝาขวดพิมเสนน้ำปิดไม่สนิท น้ำมันไหลซึมออกมา (ขอคืนเงิน)", refundChannel: "ธนาคารกรุงไทย [*6666]", createdAt: "18 มี.ค. 2569", items: [ci("5", 1, "ขวด พิมเสนน้ำ")] },
  { id: "DSP-20260313-007", orderId: "ORD-20260319-4427", customer: "ธนพล ทองคำ", customerEmail: "thanapol@email.com", customerPhone: "081-234-5678", type: "return", status: "pending", description: "สั่งเป็นของขวัญแต่ผู้รับไม่ชอบ ต้องการคืนสินค้าและขอเงินคืนเต็มจำนวน", refundChannel: "ธนาคารกรุงไทย [*7777]", createdAt: "19 มี.ค. 2569", items: [ci("18", 1, "โถใหญ่ 550 ml")] },
  { id: "DSP-20260313-008", orderId: "ORD-20260319-4428", customer: "นภัสสร อ่อนนุช", customerEmail: "napatsorn@email.com", customerPhone: "094-887-1234", type: "refund", status: "pending", refundAmount: 199, description: "สั่งซื้อ 2 ขวด แต่ได้รับขวดเดียว ขอเงินคืนเฉพาะส่วนที่ขาด", refundChannel: "ธนาคารกสิกรไทย [*9001]", createdAt: "19 มี.ค. 2569", items: [ci("1", 2, "ขวด 250 ml")] },
  { id: "DSP-20260313-009", orderId: "ORD-20260320-4429", customer: "พิมพ์ชนก สีแดง", customerEmail: "pimchanok@email.com", customerPhone: "098-771-5566", type: "damaged", status: "acknowledged", description: "ขวดแตกตอนรับพัสดุ มีรอยแตกชัดเจน เนื้อในไหลออก", refundChannel: "ธนาคารไทยพาณิชย์ (SCB) [*1212]", createdAt: "20 มี.ค. 2569", items: [ci("10", 1, "เซ็ต Aromatic คละกลิ่น")] },
  { id: "DSP-20260313-010", orderId: "ORD-20260320-4430", customer: "เกียรติศักดิ์ ภักดี", customerEmail: "kiat@email.com", customerPhone: "086-543-2100", type: "wrong_item", status: "acknowledged", description: "สั่งอบเชยแท่ง แต่ได้รับเป็นอบเชยผง", refundChannel: "ธนาคารกรุงเทพ [*8080]", createdAt: "20 มี.ค. 2569", items: [ci("7", 1, "แท่ง 100 g")] },
  { id: "DSP-20260313-011", orderId: "ORD-20260321-4431", customer: "สุนันทา จิตรกุล", customerEmail: "sunanta@email.com", customerPhone: "092-101-2020", type: "return", status: "refund_full", description: "เปิดมาแล้วชาขึ้นรา กลิ่นเหม็น ต้องการคืนสินค้าและเงินทั้งหมด", refundChannel: "ธนาคารกรุงไทย [*4711]", createdAt: "21 มี.ค. 2569", items: [ci("44", 3, "ชาอูหลงผสมดอกหอมหมื่นลี้")] },
  { id: "DSP-20260313-012", orderId: "ORD-20260321-4432", customer: "อมรเทพ รัตนพล", customerEmail: "amorn@email.com", customerPhone: "099-887-3344", type: "refund", status: "refund_full", description: "สินค้าหมดอายุแล้ว แสดงเดือน 11/2568 ขอเงินคืนเต็มจำนวน", refundChannel: "ธนาคารกสิกรไทย [*5577]", createdAt: "22 มี.ค. 2569", items: [ci("31", 1, "เซต 2 กล่อง")] },
  { id: "DSP-20260313-013", orderId: "ORD-20260322-4433", customer: "ชมพูนุช พิมพา", customerEmail: "chompoo@email.com", customerPhone: "083-444-5566", type: "damaged", status: "refund_full", description: "ขวดแตกระหว่างขนส่ง น้ำผึ้งหกเลอะกล่องทั้งใบ", refundChannel: "ธนาคารไทยพาณิชย์ (SCB) [*9919]", createdAt: "22 มี.ค. 2569", items: [ci("18", 1, "โถใหญ่ 550 ml")] },
  { id: "DSP-20260313-014", orderId: "ORD-20260323-4434", customer: "ภานุวัฒน์ พรมมา", customerEmail: "panuwat@email.com", customerPhone: "088-901-2233", type: "wrong_item", status: "refund_partial", refundAmount: 75, description: "ได้รับคนละสูตรกับที่สั่ง ต้องการขอเงินคืนบางส่วนเพราะยังพอใช้ได้", refundChannel: "ธนาคารกรุงเทพ [*6622]", createdAt: "23 มี.ค. 2569", items: [ci("45", 1, "อเมริกาโนเย็น")] },
  { id: "DSP-20260313-015", orderId: "ORD-20260323-4435", customer: "กมลทิพย์ คงสุข", customerEmail: "kamonthip@email.com", customerPhone: "082-333-7788", type: "return", status: "refund_partial", refundAmount: 499, description: "ได้รับ 2 เซต ใช้แล้วกลิ่นไม่ถูกใจ ขอคืน 1 เซต เก็บไว้ใช้ 1 เซต", refundChannel: "ธนาคารกรุงไทย [*4422]", createdAt: "23 มี.ค. 2569", items: [ci("43", 2, "Duo Set")] },
  { id: "DSP-20260313-016", orderId: "ORD-20260324-4436", customer: "เด่นชัย ศรีสวัสดิ์", customerEmail: "denchai@email.com", customerPhone: "097-654-7890", type: "refund", status: "refund_partial", refundAmount: 120, description: "บรรจุภัณฑ์ภายในชำรุด แต่ตัวสินค้ายังใช้ได้ ขอคืนเงินบางส่วน", refundChannel: "ธนาคารกสิกรไทย [*7733]", createdAt: "24 มี.ค. 2569", items: [ci("42", 1, "ก้านไม้กระจายกลิ่น")] },
  { id: "DSP-20260313-017", orderId: "ORD-20260324-4437", customer: "ภูริชญา จันทร์เพ็ญ", customerEmail: "purichaya@email.com", customerPhone: "084-222-9911", type: "damaged", status: "rejected", description: "อ้างว่าสินค้าไม่มีกลิ่น แต่ทดสอบในร้านพบว่ายังหอมปกติ", refundChannel: "ธนาคารกรุงเทพ [*8801]", createdAt: "24 มี.ค. 2569", items: [ci("11", 1, "กลิ่น Orange")] },
  { id: "DSP-20260313-018", orderId: "ORD-20260325-4438", customer: "นิติพล วัฒนะ", customerEmail: "nitipol@email.com", customerPhone: "095-101-3344", type: "return", status: "rejected", description: "ขอคืนสินค้าที่เปิดใช้แล้วเกิน 7 วัน ไม่ตรงตามนโยบายการคืนสินค้า", refundChannel: "ธนาคารไทยพาณิชย์ (SCB) [*5050]", createdAt: "25 มี.ค. 2569", items: [ci("35", 1, "เม็ดแห้ง 100 g")] },
  { id: "DSP-20260313-019", orderId: "ORD-20260325-4439", customer: "พัชรียา เนตรประไพ", customerEmail: "patchareeya@email.com", customerPhone: "086-998-2233", type: "refund", status: "pending", description: "ระบบหักเงินซ้ำสองรอบ ต้องการขอเงินคืนรอบที่เกินมา", refundChannel: "ธนาคารกรุงไทย [*1166]", createdAt: "25 มี.ค. 2569", items: [ci("5", 3, "ขวด พิมเสนน้ำ")] },
  { id: "DSP-20260313-020", orderId: "ORD-20260326-4440", customer: "ศิริรัตน์ ทองดี", customerEmail: "siriwat@email.com", customerPhone: "081-665-9090", type: "wrong_item", status: "rejected", description: "อ้างว่าได้สินค้าไม่ตรง แต่ตรวจสอบใบสั่งซื้อพบว่าตรงตามที่สั่ง", refundChannel: "ธนาคารกสิกรไทย [*3344]", createdAt: "26 มี.ค. 2569", items: [ci("34", 1, "ถุง 50 g")] },
];

export const SHOP_COMPLAINTS: Complaint[] = BASE.map((c, i) => {
  const amount = c.items.reduce((s, it) => s + it.price * it.qty, 0);
  return {
    ...c,
    // The demo buyer owns the second case ("สมชาย ใจดี" shares their phone) so
    // the customer status screen has something real to open. The rest belong to
    // other buyers and only show up in the console.
    userId: i === 1 ? DEMO_USER.id : `u-c${i}`,
    shopName: METAHERB_SHOP,
    product: c.items[0]?.name ?? "-",
    amount,
    refundAmount: c.status === "refund_full" ? amount : c.refundAmount,
    evidence: evidenceFor(c.items),
    history: [{ status: c.status, at: Date.now() }],
  };
});
