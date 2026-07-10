// Seed threads + messages for the shared chat table (src/store/chat.ts).
// Shop names match SHOPS in data/shops.ts so the real shop logos resolve.
import type { ChatMessage, ChatThread } from "../store/chat";
import { DEMO_USER } from "../store/session";

const MIN = 60_000;
const base = Date.now() - 40 * MIN;

export const SEED_THREADS: ChatThread[] = [
  { id: "metaherb", userId: DEMO_USER.id, shopName: "METAHERB Store", online: true, unreadCustomer: 0, unreadShop: 0 },
  { id: "green", userId: DEMO_USER.id, shopName: "กรีนลีฟ ออร์แกนิก", online: true, unreadCustomer: 1, unreadShop: 0 },
  { id: "baan", userId: DEMO_USER.id, shopName: "บ้านสมุนไพรไทย", online: false, unreadCustomer: 0, unreadShop: 0 },
];

const m = (threadId: string, sender: "user" | "shop", text: string, minsAgo: number): ChatMessage => ({
  id: `seed-${threadId}-${minsAgo}`,
  threadId,
  sender,
  text,
  at: base + (40 - minsAgo) * MIN,
});

export const SEED_MESSAGES: ChatMessage[] = [
  m("metaherb", "shop", "สวัสดีค่ะ ยินดีให้บริการ 🌿", 40),
  m("metaherb", "user", "สอบถามเรื่องชาออร์แกนิกครับ", 39),
  m("metaherb", "shop", "ชาออร์แกนิกของเราเป็นชาสมุนไพร 100% จากดอยเชียงใหม่ค่ะ ปลูกแบบไม่ใช้สารเคมี มี 5 รสชาติให้เลือก", 38),
  m("metaherb", "user", "มีรสชาติไหนบ้างครับ?", 37),
  m("metaherb", "shop", "มี ดอกคำฝอย, ตะไคร้, ขิง, มะตูม, และใบเตยค่ะ แนะนำรสตะไคร้นะคะ ขายดีที่สุดเลย 😊", 36),
  m("green", "shop", "สินค้าพร้อมส่งพรุ่งนี้เช้าค่ะ", 20),
  m("baan", "shop", "ขอบคุณที่อุดหนุนนะคะ 🙏", 10),
];
