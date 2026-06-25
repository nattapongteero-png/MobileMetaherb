import { createContext, useContext, useState, type ReactNode } from "react";

export type Conversation = {
  id: string;
  shopName: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
};

// Shop names match SHOPS in data/shops.ts so the real shop logos resolve.
const SEED: Conversation[] = [
  { id: "metaherb", shopName: "METAHERB Store", lastMessage: "มี ดอกคำฝอย, ตะไคร้, ขิง, มะตูม และใบเตยค่ะ 😊", time: "10:04", unread: 2, online: true },
  { id: "green", shopName: "กรีนลีฟ ออร์แกนิก", lastMessage: "สินค้าพร้อมส่งพรุ่งนี้เช้าค่ะ", time: "เมื่อวาน", unread: 1, online: true },
  { id: "baan", shopName: "บ้านสมุนไพรไทย", lastMessage: "ขอบคุณที่อุดหนุนนะคะ 🙏", time: "เมื่อวาน", unread: 0, online: false },
];

type ChatContextValue = {
  conversations: Conversation[];
  unreadTotal: number;
  markRead: (id: string) => void;
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(SEED);

  const markRead = (id: string) =>
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));

  const unreadTotal = conversations.reduce((s, c) => s + c.unread, 0);

  return <ChatContext.Provider value={{ conversations, unreadTotal, markRead }}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
