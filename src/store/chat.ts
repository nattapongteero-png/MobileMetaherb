/**
 * Customer ⇄ shop chat — one thread, two readers.
 *
 * ChatScreen held its messages in component state and answered every message
 * with `SHOP_REPLIES[Math.floor(Math.random() * 5)]` after a 1.5 s timer. The
 * shop side had no customer inbox at all (ShopManagerChatScreen is an AI
 * copilot, not a conversation). Nothing a buyer typed reached anyone.
 *
 * Pure TS; messages are text (plus an optional image uri), so the log is
 * JSON-safe and persists.
 */
import { createStore } from "./db";
import { emit } from "./events";

export type Sender = "user" | "shop";

export type ChatMessage = {
  id: string;
  threadId: string;
  sender: Sender;
  text: string;
  at: number;
  image?: string;
};

export type ChatThread = {
  id: string;
  userId: string;
  shopName: string;
  online: boolean;
  /** Unread counts are per-side: the same message is unread for exactly one of them. */
  unreadCustomer: number;
  unreadShop: number;
};

export type ChatState = {
  threads: ChatThread[];
  messages: ChatMessage[];
};

export const chatStore = createStore<ChatState>({ threads: [], messages: [] }, { persistKey: "mh.chat" });

export function seedChat(threads: ChatThread[], messages: ChatMessage[]): void {
  chatStore.reset({ threads, messages });
}

// ── reads ──────────────────────────────────────────────────────
export const threadById = (id: string): ChatThread | undefined =>
  chatStore.get().threads.find((t) => t.id === id);

/** Oldest first — the order a conversation renders in. */
export const messagesOf = (threadId: string): ChatMessage[] =>
  chatStore.get().messages.filter((m) => m.threadId === threadId).sort((a, b) => a.at - b.at);

export const lastMessageOf = (threadId: string): ChatMessage | undefined => {
  const all = messagesOf(threadId);
  return all[all.length - 1];
};

/** The buyer's conversation list. */
export const threadsForUser = (userId: string): ChatThread[] =>
  chatStore.get().threads.filter((t) => t.userId === userId);

/** The shop's inbox. */
export const threadsForShop = (shopName: string): ChatThread[] =>
  chatStore.get().threads.filter((t) => t.shopName === shopName);

export const unreadTotalForUser = (userId: string): number =>
  threadsForUser(userId).reduce((s, t) => s + t.unreadCustomer, 0);

export const unreadTotalForShop = (shopName: string): number =>
  threadsForShop(shopName).reduce((s, t) => s + t.unreadShop, 0);

// ── writes ─────────────────────────────────────────────────────
let seq = 0;
export function nextMessageId(now = Date.now()): string {
  seq += 1;
  return `msg-${now.toString(36)}-${seq}`;
}

/**
 * The id of the thread between a buyer and a shop. It carries the buyer: keying
 * it on the shop alone let a second buyer messaging the same shop land inside
 * the first buyer's conversation.
 */
export const threadIdFor = (userId: string, shopName: string): string => `t-${userId}-${shopName}`;

/** The buyer's thread with a given shop, if they have one. */
export const findThread = (userId: string, shopName: string): ChatThread | undefined =>
  chatStore.get().threads.find((t) => t.userId === userId && t.shopName === shopName);

/**
 * The thread for this buyer + shop, created on first contact.
 *
 * Screens that open a chat from a product or a document know the shop's NAME,
 * not a thread id — and used to fall through to a hardcoded "metaherb" default,
 * which quietly pointed a conversation about another shop's product at the
 * wrong thread.
 */
export function openThread(userId: string, shopName: string): ChatThread {
  const existing = findThread(userId, shopName);
  if (existing) return existing;
  return ensureThread(threadIdFor(userId, shopName), userId, shopName);
}

/** Open (or find) the thread between this buyer and this shop. */
export function ensureThread(id: string, userId: string, shopName: string): ChatThread {
  const existing = threadById(id);
  if (existing) return existing;
  const thread: ChatThread = { id, userId, shopName, online: true, unreadCustomer: 0, unreadShop: 0 };
  chatStore.set((prev) => ({ ...prev, threads: [thread, ...prev.threads] }));
  return thread;
}

/**
 * Post a message. The unread badge lands on whoever did NOT write it, and the
 * other side gets a notification.
 */
export function sendMessage(
  threadId: string,
  sender: Sender,
  text: string,
  opts: { image?: string; now?: number } = {},
): ChatMessage | undefined {
  const body = text.trim();
  if (!body && !opts.image) return undefined;
  const thread = threadById(threadId);
  if (!thread) return undefined;

  const at = opts.now ?? Date.now();
  const message: ChatMessage = { id: nextMessageId(at), threadId, sender, text: body, at, image: opts.image };

  chatStore.set((prev) => ({
    threads: prev.threads.map((t) =>
      t.id !== threadId
        ? t
        : sender === "user"
          ? { ...t, unreadShop: t.unreadShop + 1 }
          : { ...t, unreadCustomer: t.unreadCustomer + 1 },
    ),
    messages: [...prev.messages, message],
  }));

  emit({
    type: "chat_message",
    audience: sender === "user" ? ["shop"] : ["customer"],
    at,
    userId: thread.userId,
    shopName: thread.shopName,
    title: sender === "user" ? "ข้อความจากลูกค้า" : `ข้อความจาก ${thread.shopName}`,
    body: body || "ส่งรูปภาพ",
  });
  return message;
}

/** Opening a conversation clears that side's badge. */
export function markThreadRead(threadId: string, side: Sender): void {
  chatStore.set((prev) => ({
    ...prev,
    threads: prev.threads.map((t) =>
      t.id !== threadId ? t : side === "user" ? { ...t, unreadCustomer: 0 } : { ...t, unreadShop: 0 },
    ),
  }));
}

/** Test helper. */
export function __resetChat(): void {
  chatStore.reset({ threads: [], messages: [] });
  seq = 0;
}
