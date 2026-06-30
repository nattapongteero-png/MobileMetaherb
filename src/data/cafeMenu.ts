/**
 * META Caffe (GREEN BREW COFFEE) — café menu data for the in-app café page.
 * Mockup data: real Thai café items grouped into 5 categories. Emoji stand in
 * for product photos so no extra image assets are needed.
 */

export type CafeCategoryId = "coffee" | "tea" | "drink" | "bakery" | "food";

export type CafeCategory = { id: CafeCategoryId; label: string; emoji: string; accent: string };

export const CAFE_CATEGORIES: CafeCategory[] = [
  { id: "coffee", label: "กาแฟ", emoji: "☕", accent: "#8b5e3c" },
  { id: "tea", label: "ชา & สมุนไพร", emoji: "🍵", accent: "#2f9e6f" },
  { id: "drink", label: "เครื่องดื่ม", emoji: "🥤", accent: "#3b82f6" },
  { id: "bakery", label: "ขนม & เบเกอรี่", emoji: "🥐", accent: "#d97706" },
  { id: "food", label: "อาหารคาว", emoji: "🥪", accent: "#0d9488" },
];

export type CafeItem = {
  id: string;
  name: string;
  desc: string;
  price: number;
  emoji: string;
  category: CafeCategoryId;
  popular?: boolean;
};

export const CAFE_MENU: CafeItem[] = [
  // ── กาแฟ ──
  { id: "cf-espresso", name: "เอสเพรสโซ่", desc: "ช็อตเข้มกลมกล่อม", price: 55, emoji: "☕", category: "coffee", popular: true },
  { id: "cf-americano", name: "อเมริกาโน่เย็น", desc: "กาแฟดำสดชื่น", price: 65, emoji: "🧊", category: "coffee" },
  { id: "cf-latte", name: "ลาเต้ร้อน", desc: "นมสดละมุน", price: 70, emoji: "☕", category: "coffee", popular: true },
  { id: "cf-cappuccino", name: "คาปูชิโน่", desc: "ฟองนมหนานุ่ม", price: 70, emoji: "☕", category: "coffee" },
  { id: "cf-mocha", name: "มอคค่าเย็น", desc: "กาแฟ + ช็อกโกแลต", price: 80, emoji: "🍫", category: "coffee" },

  // ── ชา & สมุนไพร ──
  { id: "te-matcha", name: "มัทฉะลาเต้", desc: "ชาเขียวญี่ปุ่นแท้", price: 75, emoji: "🍵", category: "tea", popular: true },
  { id: "te-thaitea", name: "ชาไทยเย็น", desc: "หอมเข้มต้นตำรับ", price: 60, emoji: "🧋", category: "tea" },
  { id: "te-chamomile", name: "ชาคาโมมายล์ร้อน", desc: "ผ่อนคลายก่อนนอน", price: 55, emoji: "🌼", category: "tea" },
  { id: "te-butterfly", name: "อัญชันน้ำผึ้งมะนาว", desc: "สมุนไพรสดชื่น", price: 65, emoji: "💜", category: "tea" },

  // ── เครื่องดื่ม ──
  { id: "dr-cocoa", name: "โกโก้เย็น", desc: "เข้มข้นทุกอึก", price: 70, emoji: "🥤", category: "drink" },
  { id: "dr-milkhoney", name: "นมสดน้ำผึ้ง", desc: "นมสดแท้ + น้ำผึ้งดอกลำไย", price: 60, emoji: "🍯", category: "drink" },
  { id: "dr-berrysoda", name: "โซดาเบอร์รี่", desc: "ซ่าสดชื่น", price: 65, emoji: "🫐", category: "drink" },
  { id: "dr-honeylemon", name: "น้ำผึ้งมะนาวโซดา", desc: "เปรี้ยวหวานกำลังดี", price: 60, emoji: "🍋", category: "drink" },

  // ── ขนม & เบเกอรี่ ──
  { id: "bk-croissant", name: "ครัวซองต์เนยสด", desc: "อบใหม่ทุกเช้า", price: 65, emoji: "🥐", category: "bakery", popular: true },
  { id: "bk-brownie", name: "บราวนี่ช็อกโกแลต", desc: "หนึบเข้มข้น", price: 75, emoji: "🍫", category: "bakery" },
  { id: "bk-cheesecake", name: "ชีสเค้ก", desc: "เนื้อเนียนนุ่ม", price: 85, emoji: "🍰", category: "bakery" },
  { id: "bk-cookie", name: "คุกกี้สมุนไพร", desc: "สูตรเฉพาะ METAHERB", price: 45, emoji: "🍪", category: "bakery" },

  // ── อาหารคาว ──
  { id: "fd-sandwich", name: "แซนด์วิชอกไก่", desc: "อกไก่ + ผักสด", price: 95, emoji: "🥪", category: "food" },
  { id: "fd-salad", name: "สลัดอกไก่สมุนไพร", desc: "น้ำสลัดงาสมุนไพร", price: 110, emoji: "🥗", category: "food", popular: true },
  { id: "fd-grainbowl", name: "ข้าวอบธัญพืช", desc: "อิ่มดีมีประโยชน์", price: 99, emoji: "🍚", category: "food" },
];
