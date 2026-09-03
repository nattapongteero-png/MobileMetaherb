/**
 * สมาชิก & แต้ม Meta Cafe (17.7) — a stamp card, kept deliberately simple.
 *
 * The rule is one point per cup, not per baht: a café's cups cost roughly the
 * same, and "ครบ 10 แก้ว ฟรี 1" is a promise a customer can hold in their head.
 * Points-per-baht would force everyone to do arithmetic at the counter and
 * would need re-tuning every time a price moves.
 *
 * Members are identified by phone number — it works for a walk-in who has never
 * installed the app, which a QR in the customer app cannot.
 *
 * This is the CAFÉ's own membership. It has no link to a Metaherb account; the
 * phone number is the only key, so a customer who happens to use both is
 * matched by phone if the app ever wants to.
 *
 * Pure TS — no react-native — so it stays Vitest-runnable.
 */
import { createStore } from "./db";

export type CafeMember = {
  id: string;
  /** เบอร์โทร (ตัวเลขล้วน) — the key a cashier types at the counter. */
  phone: string;
  name: string;
  points: number;
  joinedAt: number;
  /** Last time they bought something — points expire from here, not from join. */
  lastVisitAt: number;
};

/** One movement of points, always tied to why it happened. */
export type CafePointTxn = {
  id: string;
  memberId: string;
  /** + earned, − redeemed. */
  delta: number;
  reason: "earn" | "redeem" | "adjust";
  /** The café order it came from, so a dispute can be traced back. */
  orderId?: string;
  at: number;
};

export type CafePointRule = {
  /** แต้มที่ได้ต่อ 1 แก้ว. */
  earnPerCup: number;
  /** ครบกี่แต้มถึงแลกได้. */
  redeemAt: number;
  /** แลกได้เมนูราคาไม่เกินกี่บาท. */
  maxRedeemPrice: number;
  /** แต้มหมดอายุถ้าไม่มาใช้บริการกี่เดือน — without this the shop carries an
   *  unbounded liability forever. */
  expiryMonths: number;
  enabled: boolean;
};

export const DEFAULT_CAFE_POINT_RULE: CafePointRule = {
  earnPerCup: 1,
  redeemAt: 10,
  maxRedeemPrice: 80,
  expiryMonths: 12,
  enabled: true,
};

export type CafeMemberState = {
  members: CafeMember[];
  txns: CafePointTxn[];
  rule: CafePointRule;
};

const INITIAL: CafeMemberState = { members: [], txns: [], rule: DEFAULT_CAFE_POINT_RULE };

export const cafeMemberStore = createStore<CafeMemberState>(INITIAL, { persistKey: "mh.cafeMembers" });

export function seedCafeMembers(members: CafeMember[], txns: CafePointTxn[] = []): void {
  cafeMemberStore.reset({ ...cafeMemberStore.get(), members, txns });
}

// ── reads ──────────────────────────────────────────────────────
const digits = (s: string) => s.replace(/\D/g, "");

export const cafeMembers = (s: CafeMemberState = cafeMemberStore.get()): CafeMember[] => s.members ?? [];
export const cafePointRule = (s: CafeMemberState = cafeMemberStore.get()): CafePointRule =>
  s.rule ?? DEFAULT_CAFE_POINT_RULE;

/** Cashiers type the phone with or without dashes; both must find the member. */
export const memberByPhone = (phone: string, s: CafeMemberState = cafeMemberStore.get()): CafeMember | undefined =>
  cafeMembers(s).find((m) => digits(m.phone) === digits(phone));

export const memberById = (id: string, s: CafeMemberState = cafeMemberStore.get()): CafeMember | undefined =>
  cafeMembers(s).find((m) => m.id === id);

/** Newest first — the member detail view reads top-down. */
export const memberTxns = (memberId: string, s: CafeMemberState = cafeMemberStore.get()): CafePointTxn[] =>
  (s.txns ?? []).filter((t) => t.memberId === memberId).sort((a, b) => b.at - a.at);

/**
 * Points the member can actually spend right now: everything expires at once
 * after `expiryMonths` of no visits, which is the rule shops actually print on
 * the card ("แต้มหมดอายุเมื่อไม่ใช้บริการ 12 เดือน").
 */
export function usablePoints(
  m: CafeMember,
  rule: CafePointRule = cafePointRule(),
  now = Date.now(),
): number {
  if (rule.expiryMonths <= 0) return m.points;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - rule.expiryMonths);
  return m.lastVisitAt >= cutoff.getTime() ? m.points : 0;
}

export const canRedeem = (m: CafeMember, rule: CafePointRule = cafePointRule(), now = Date.now()): boolean =>
  rule.enabled && usablePoints(m, rule, now) >= rule.redeemAt;

// ── writes ─────────────────────────────────────────────────────
let seq = 0;
const nextId = (p: string) => `${p}-${Date.now()}-${++seq}`;

export function addCafeMember(input: { phone: string; name: string }, now = Date.now()): CafeMember {
  const existing = memberByPhone(input.phone);
  if (existing) return existing; // one member per phone; re-registering is a no-op
  const member: CafeMember = {
    id: nextId("mem"),
    phone: digits(input.phone),
    name: input.name.trim(),
    points: 0,
    joinedAt: now,
    lastVisitAt: now,
  };
  cafeMemberStore.set((s) => ({ ...s, members: [member, ...cafeMembers(s)] }));
  return member;
}

export function editCafeMember(id: string, patch: Partial<Pick<CafeMember, "name" | "phone">>): void {
  cafeMemberStore.set((s) => ({
    ...s,
    members: cafeMembers(s).map((m) =>
      m.id === id ? { ...m, ...patch, phone: patch.phone ? digits(patch.phone) : m.phone } : m,
    ),
  }));
}

export function setCafePointRule(patch: Partial<CafePointRule>): void {
  cafeMemberStore.set((s) => ({ ...s, rule: { ...cafePointRule(s), ...patch } }));
}

/** Add the points a purchase earned. `cups` = how many drinks were on the bill. */
export function earnPoints(memberId: string, cups: number, orderId?: string, now = Date.now()): number {
  const rule = cafePointRule();
  if (!rule.enabled || cups <= 0) return 0;
  const gained = cups * rule.earnPerCup;
  cafeMemberStore.set((s) => {
    const m = memberById(memberId, s);
    if (!m) return s;
    // Points that had already expired don't come back to life on the next visit.
    const base = usablePoints(m, cafePointRule(s), now);
    return {
      ...s,
      members: cafeMembers(s).map((x) =>
        x.id === memberId ? { ...x, points: base + gained, lastVisitAt: now } : x,
      ),
      txns: [{ id: nextId("txn"), memberId, delta: gained, reason: "earn", orderId, at: now }, ...(s.txns ?? [])],
    };
  });
  return gained;
}

/** Spend a full card. Returns false (and changes nothing) when short. */
export function redeemPoints(memberId: string, orderId?: string, now = Date.now()): boolean {
  const rule = cafePointRule();
  const m = memberById(memberId);
  if (!m || !canRedeem(m, rule, now)) return false;
  cafeMemberStore.set((s) => ({
    ...s,
    members: cafeMembers(s).map((x) =>
      x.id === memberId ? { ...x, points: usablePoints(x, cafePointRule(s), now) - rule.redeemAt, lastVisitAt: now } : x,
    ),
    txns: [{ id: nextId("txn"), memberId, delta: -rule.redeemAt, reason: "redeem", orderId, at: now }, ...(s.txns ?? [])],
  }));
  return true;
}

/** Test helper. */
export function __resetCafeMembers(): void {
  cafeMemberStore.reset(INITIAL);
}
