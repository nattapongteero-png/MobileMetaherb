import { type ReactNode } from "react";
import { useStore } from "../store/db";
import {
  chatStore,
  lastMessageOf,
  markThreadRead,
  threadsForUser,
  unreadTotalForUser,
} from "../store/chat";
import { currentUserId } from "../store/session";
import { timeAgo } from "../store/events";

export type Conversation = {
  id: string;
  shopName: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
};

/**
 * The buyer's conversation list, derived from the shared chat table
 * (src/store/chat.ts). The last message and the unread badge are now real:
 * they move when the shop actually replies from its inbox.
 */
type ChatContextValue = {
  conversations: Conversation[];
  unreadTotal: number;
  markRead: (id: string) => void;
};

export function ChatProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useChat(): ChatContextValue {
  useStore(chatStore); // subscribe
  const userId = currentUserId();

  const conversations: Conversation[] = threadsForUser(userId).map((t) => {
    const last = lastMessageOf(t.id);
    return {
      id: t.id,
      shopName: t.shopName,
      lastMessage: last?.text ?? "เริ่มต้นการสนทนา",
      time: last ? timeAgo(last.at) : "",
      unread: t.unreadCustomer,
      online: t.online,
    };
  });

  return {
    conversations,
    unreadTotal: unreadTotalForUser(userId),
    markRead: (id) => markThreadRead(id, "user"),
  };
}
