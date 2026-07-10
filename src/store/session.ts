/**
 * The signed-in customer. Before this the app had *two* hardcoded identities —
 * "Ethan Walker" on AccountScreen and "ณัฐพงษ์ ธีโรภาส" on AccountInfoScreen —
 * and nothing tied an order, complaint or trial to a person.
 *
 * Login/register are still mock (no server), but they now produce a real user
 * object that every buyer-side surface reads, and that orders hang off of.
 */
import { createStore } from "./db";
import type { User } from "./types";

/** The demo buyer. Matches the default recipient baked into the seeded orders. */
export const DEMO_USER: User = {
  id: "u-1",
  name: "ณัฐพงษ์ ธีโรภาส",
  email: "nattapong.t@gmail.com",
  phone: "061-421-3111",
};

export type Session = {
  user: User | null;
  /** The shop this account owns, when they've registered as a seller. */
  shopName: string | null;
};

export const sessionStore = createStore<Session>(
  { user: null, shopName: null },
  { persistKey: "mh.session" },
);

export function currentUser(): User | null {
  return sessionStore.get().user;
}

/** The buyer id used to scope orders. Falls back to the demo user pre-login. */
export function currentUserId(): string {
  return sessionStore.get().user?.id ?? DEMO_USER.id;
}

export function currentShopName(): string | null {
  return sessionStore.get().shopName;
}

/** Mock sign-in: any non-empty credentials resolve to the demo buyer. */
export function signIn(email?: string): User {
  const user: User = email && email !== DEMO_USER.email ? { ...DEMO_USER, email } : DEMO_USER;
  sessionStore.set({ ...sessionStore.get(), user });
  return user;
}

export function signOut(): void {
  sessionStore.set({ user: null, shopName: null });
}

export function updateProfile(patch: Partial<Omit<User, "id">>): void {
  const s = sessionStore.get();
  if (!s.user) return;
  sessionStore.set({ ...s, user: { ...s.user, ...patch } });
}

/** Called when the seller registration completes. */
export function setShopName(shopName: string | null): void {
  sessionStore.set({ ...sessionStore.get(), shopName });
}

/** Test helper. */
export function __resetSession(user: User | null = DEMO_USER, shopName: string | null = null): void {
  sessionStore.reset({ user, shopName });
}
